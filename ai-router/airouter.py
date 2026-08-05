#!/usr/bin/env python3
"""
AI Router - Single file version. Lightweight AI Gateway (9Router/OmniRoute alternative)
Usage:
  python airouter.py                    # start server
  python airouter.py --minimal          # start without dashboard
  python airouter.py --setup            # interactive setup
  python airouter.py --list-providers   # list providers
  python airouter.py --tui              # terminal UI dashboard
  python airouter.py --export-usage     # export quota to JSON
"""
import argparse, asyncio, json, logging, os, re, time, webbrowser, sys, textwrap
from abc import ABC, abstractmethod
from pathlib import Path
from threading import Lock
from typing import Any, AsyncGenerator, Dict, List, Optional, Tuple
from urllib.parse import parse_qs, urlencode

try: import httpx
except ImportError: print("Install: pip install httpx"); sys.exit(1)
try: import yaml
except ImportError: print("Install: pip install pyyaml"); sys.exit(1)

# ---- Config ----
DEFAULT_CONFIG = {
    "server": {"host": "127.0.0.1", "port": 20128, "dashboard": True, "log_level": "info"},
    "routing": {"strategy": "fallback", "combos": {"auto": {"description": "Smart auto-select"}, "cheap": {"description": "Lowest cost"}, "fast": {"description": "Low latency"}}},
    "token_saver": {"enabled": True, "mode": "standard", "max_lines": 500, "max_chars": 10000, "strip_blanks": True},
    "proxy": None,
}

DEFAULT_PROVIDERS = {
    "groq": {"enabled": False, "tier": 3, "api_key": "", "base_url": "https://api.groq.com/openai/v1", "models": ["llama-3.3-70b-versatile","llama-3.1-8b-instant","mixtral-8x7b-32768","gemma2-9b-it"], "api_keys": []},
    "openrouter": {"enabled": False, "tier": 3, "api_key": "", "base_url": "https://openrouter.ai/api/v1", "models": ["openai/gpt-4o-mini","anthropic/claude-3-haiku","google/gemini-2.0-flash-001","meta-llama/llama-3.3-70b-instruct","mistralai/mistral-7b-instruct"], "api_keys": [], "extra_headers": {}},
    "gemini": {"enabled": False, "tier": 3, "api_key": "", "base_url": "https://generativelanguage.googleapis.com/v1beta", "models": ["gemini-2.0-flash","gemini-1.5-flash","gemini-1.5-pro"], "api_keys": []},
    "openai": {"enabled": False, "tier": 1, "api_key": "", "base_url": "https://api.openai.com/v1", "models": [], "api_keys": []},
    "anthropic": {"enabled": False, "tier": 1, "api_key": "", "base_url": "https://api.anthropic.com", "models": [], "api_keys": []},
    "kiro": {"enabled": False, "tier": 3, "api_key": "", "base_url": "https://api.kiro.ai/v1", "models": ["claude-sonnet-4.5","glm-5"], "oauth": {"auth_url":"https://kiro.ai/oauth/authorize","token_url":"https://api.kiro.ai/oauth/token","client_id":"","client_secret":""}},
}

def deep_copy(d):
    r = {}
    for k, v in d.items():
        if isinstance(v, dict): r[k] = deep_copy(v)
        elif isinstance(v, list): r[k] = list(v)
        else: r[k] = v
    return r

def deep_merge(base, override):
    for k, v in override.items():
        if k in base and isinstance(base[k], dict) and isinstance(v, dict): deep_merge(base[k], v)
        else: base[k] = v

def load_config(config_path=None):
    cfg = deep_copy(DEFAULT_CONFIG)
    cfg["providers"] = {k: deep_copy(v) for k, v in DEFAULT_PROVIDERS.items()}
    paths = [Path(config_path)] if config_path else []
    paths += [Path("airouter.yaml"), Path("config.yaml"), Path.home() / ".ai-router" / "config.yaml"]
    loaded = {}
    for p in paths:
        if p.exists():
            with open(p) as f: loaded = yaml.safe_load(f) or {}
            break
    if loaded: deep_merge(cfg, loaded)
    for pn, pc in cfg["providers"].items():
        if pc.get("api_key") or pc.get("api_keys") or pc.get("oauth", {}).get("client_id"): pc["enabled"] = True
    return cfg

def save_config(cfg, path=None):
    p = Path(path or cfg.get("_path", "config.yaml"))
    p.parent.mkdir(parents=True, exist_ok=True)
    clean = {k: v for k, v in cfg.items() if not k.startswith("_")}
    # remove _root from providers
    for pn in clean.get("providers", {}):
        clean["providers"][pn] = {k: v for k, v in clean["providers"][pn].items() if not k.startswith("_")}
    with open(p, "w") as f: yaml.dump(clean, f, default_flow_style=False, allow_unicode=True)

# ---- Logging ----
log = logging.getLogger("airouter")
def setup_log(level="info"):
    logging.basicConfig(level=getattr(logging, level.upper(), logging.INFO), format="%(asctime)s [%(levelname)s] %(message)s", datefmt="%H:%M:%S")

# ---- Helpers ----
def count_tokens(t): return len(t) // 4
def est_tokens(req):
    t = 0
    for m in req.get("messages", []):
        c = m.get("content", "")
        if isinstance(c, str): t += count_tokens(c)
        elif isinstance(c, list):
            for p in c:
                if isinstance(p, dict): t += count_tokens(p.get("text", ""))
    return t

def find_provider(cfg, model):
    if "/" in model:
        prefix = model.split("/")[0]
        for pn, pc in cfg["providers"].items():
            if pc.get("enabled") and pn == prefix: return pn, pc
    for pn, pc in cfg["providers"].items():
        if not pc.get("enabled"): continue
        for m in pc.get("models", []):
            if m == model or model.endswith(f"/{m}"): return pn, pc
    return None

# ---- OAuth ----
class OAuthHandler:
    def __init__(self):
        self._tokens: Dict[str, dict] = {}
    async def get_token(self, provider, config):
        oauth = config.get("oauth", {})
        if not oauth: return None
        td = self._tokens.get(provider)
        if td and td.get("expires_at", 0) > time.time() + 60: return td.get("access_token")
        rt = oauth.get("refresh_token") or (td or {}).get("refresh_token")
        cid, cs = oauth.get("client_id", ""), oauth.get("client_secret", "")
        tu = oauth.get("token_url", "https://oauth2.googleapis.com/token")
        if rt:
            try:
                async with httpx.AsyncClient(timeout=30) as c:
                    r = await c.post(tu, data={"grant_type":"refresh_token","refresh_token":rt,"client_id":cid,"client_secret":cs})
                    if r.status_code == 200:
                        d = r.json()
                        self._tokens[provider] = {"access_token":d["access_token"],"refresh_token":d.get("refresh_token",rt),"expires_at":time.time()+d.get("expires_in",3600)}
                        return d["access_token"]
            except: pass
        ac = oauth.get("auth_code")
        if ac:
            try:
                async with httpx.AsyncClient(timeout=30) as c:
                    r = await c.post(tu, data={"grant_type":"authorization_code","code":ac,"client_id":cid,"client_secret":cs,"redirect_uri":oauth.get("redirect_uri","http://localhost:20128/callback")})
                    if r.status_code == 200:
                        d = r.json()
                        self._tokens[provider] = {"access_token":d["access_token"],"refresh_token":d.get("refresh_token"),"expires_at":time.time()+d.get("expires_in",3600)}
                        return d["access_token"]
            except: pass
        return None
    def status(self, provider):
        td = self._tokens.get(provider)
        if not td: return {"status":"no_token"}
        return {"status":"ok","expires_in":max(0,int(td.get("expires_at",0)-time.time())),"has_refresh":bool(td.get("refresh_token"))}

oauth_handler = OAuthHandler()

# ---- Proxy ----
def make_client(cfg, provider, timeout=120.0):
    pc = cfg.get("providers", {}).get(provider, {})
    proxy = pc.get("proxy") or cfg.get("proxy")
    kwargs = {"timeout": timeout}
    if isinstance(proxy, str): kwargs["proxies"] = proxy
    elif isinstance(proxy, dict) and proxy.get("url"): kwargs["proxies"] = proxy["url"]
    return httpx.AsyncClient(**kwargs)

# ---- Quota ----
class QuotaTracker:
    def __init__(self):
        self._usage: Dict[str, dict] = {}
        self._lock = Lock()
    def track(self, provider, model="", pt=0, ct=0):
        with self._lock:
            k = f"{provider}:{model or '*'}"
            u = self._usage.setdefault(k, {"provider":provider,"model":model,"pt":0,"ct":0,"total":0,"reqs":0,"errors":0,"last":0,"first":time.time()})
            u["pt"] += pt; u["ct"] += ct; u["total"] += pt+ct; u["reqs"] += 1; u["last"] = time.time()
    def error(self, provider, model=""):
        with self._lock:
            k = f"{provider}:{model or '*'}"
            u = self._usage.setdefault(k, {"provider":provider,"model":model,"errors":0})
            u["errors"] = u.get("errors",0)+1
    def summary(self, provider=None):
        with self._lock:
            if provider:
                uu = {k:v for k,v in self._usage.items() if v["provider"]==provider}
            else: uu = dict(self._usage)
            # keep as is for export
            return {k: dict(v) for k,v in uu.items()}
    def total(self):
        with self._lock:
            tok = sum(u.get("total",0) for u in self._usage.values())
            req = sum(u.get("reqs",0) for u in self._usage.values())
            err = sum(u.get("errors",0) for u in self._usage.values())
            return {"total_tokens":tok,"total_requests":req,"total_errors":err,"providers":len(set(u["provider"] for u in self._usage.values()))}

qtracker = QuotaTracker()

# ---- Token Saver ----
CAVEMAN = {r"does not":"doesn't",r"cannot":"can't",r"will not":"won't",r"it is":"it's",r"I am":"I'm",r"you are":"you're",r"there is":"there's",r"that is":"that's",r"\.\.\.":"…"}

def compress_text(text, cfg):
    if not cfg.get("enabled", True): return text
    mode = cfg.get("mode", "standard")
    max_lines = cfg.get("max_lines", 500)
    max_chars = cfg.get("max_chars", 10000)
    lines = text.split("\n")
    if cfg.get("strip_blanks", True):
        cl, bc = [], 0
        for l in lines:
            if l.strip() == "":
                bc += 1
                if bc <= 1: cl.append("")
            else: bc = 0; cl.append(l)
        lines = cl
    comp = []
    for l in lines:
        s = l.strip()
        if len(s) > 2 and s.startswith("{") and s.endswith("}"):
            try:
                obj = json.loads(s); short = {}
                for k, v in list(obj.items())[:5]:
                    if isinstance(v, str) and len(v) > 80: v = v[:40]+"..."
                    short[k] = v
                if len(obj) > 5: short[f"...+{len(obj)-5}"] = ""
                comp.append(json.dumps(short, ensure_ascii=False)); continue
            except: pass
        if len(s) > 2 and s.startswith("[") and s.endswith("]"):
            try:
                obj = json.loads(s)
                if isinstance(obj, list) and len(obj) > 5: comp.append(f"[{len(obj)} items]"); continue
            except: pass
        comp.append(l)
    lines = comp
    if len(lines) > max_lines:
        k = max_lines // 2; lines = lines[:k] + [f"\n[~{len(lines)-2*k} lines cut~]\n"] + lines[-k:]
    result = "\n".join(lines)
    if len(result) > max_chars:
        h = max_chars // 2; result = result[:h] + f"\n[~{len(result)-2*h} chars cut~]\n" + result[-h:]
    if mode in ("aggressive","ultra"):
        for pat, repl in CAVEMAN.items(): result = re.sub(pat, repl, result, flags=re.IGNORECASE)
    if mode == "ultra":
        result = re.sub(r"\b(a|an|the|this|that|these|those|is|are|was|were|has|have|had)\b", "", result, flags=re.IGNORECASE)
        result = re.sub(r" {2,}", " ", result)
    return result

def has_media(msg):
    c = msg.get("content","")
    if isinstance(c, list):
        for p in c:
            if isinstance(p, dict) and p.get("type") in ("image_url","audio_url","video_url"):
                return True
    return False

def has_vision(req):
    for m in req.get("messages",[]):
        if has_media(m): return True
    return False

VISION_MODELS = {"gpt-4o","gpt-4o-mini","gpt-4-vision","claude-3","claude-4","gemini-1.5","gemini-2.0","llama-3.2-11b","llama-3.2-90b","qwen-vl","internlm","glm-4v","minicpm"}

def process_request(req, cfg):
    if not cfg.get("enabled", True): return req
    r = dict(req)
    r["messages"] = []
    for m in req.get("messages", []):
        if has_media(m):
            r["messages"].append(m); continue
        if m.get("role") not in ("user","tool") or isinstance(m.get("content"), list):
            r["messages"].append(m); continue
        r["messages"].append({**m, "content": compress_text(m.get("content",""), cfg)})
    return r

# ---- Providers ----
class BaseProvider(ABC):
    def __init__(self, name, config):
        self.name = name; self.config = config
        keys = []
        if config.get("api_key"): keys.append(config["api_key"])
        if config.get("api_keys"): keys.extend(config["api_keys"])
        self._keys = list(dict.fromkeys(keys)); self._ki = 0
    def get_key(self):
        if not self._keys: return None
        k = self._keys[self._ki % len(self._keys)]; self._ki += 1; return k
    def get_tier(self): return self.config.get("tier", 3)
    def is_enabled(self): return self.config.get("enabled", False) and (len(self._keys) > 0 or bool(self.config.get("oauth")))
    def get_models(self): return self.config.get("models", [])
    def model_id(self, model):
        return model.split("/",1)[1] if "/" in model else model
    def to_dict(self):
        return {"name":self.name,"tier":self.get_tier(),"enabled":self.is_enabled(),"models":self.get_models(),"accounts":len(self._keys),"has_oauth":bool(self.config.get("oauth"))}
    @abstractmethod
    async def chat(self, req, key=None) -> Tuple[Optional[dict], Optional[str]]: ...
    @abstractmethod
    async def chat_stream(self, req, key=None) -> AsyncGenerator[bytes, None]: ...
    @abstractmethod
    async def list_models(self) -> List[dict]: ...

class OpenAICompatProvider(BaseProvider):
    @property
    def type(self): return "openai"
    def _h(self, key=None):
        k = key or self.get_key()
        if not k:
            oa = self.config.get("oauth", {})
            if oa: k = asyncio.run(oauth_handler.get_token(self.name, self.config))
        h = {"Content-Type": "application/json"}
        if k:
            oa = self.config.get("oauth", {})
            h["Authorization"] = f"{oa.get('token_type','Bearer') if oa and not key else 'Bearer'} {k}"
        if self.name == "openrouter": h.update({"HTTP-Referer":"http://localhost:20128","X-Title":"AI Router"})
        h.update(self.config.get("extra_headers", {}))
        return h
    def _url(self, p): return f"{self.config.get('base_url','').rstrip('/')}/{p.lstrip('/')}"
    async def chat(self, req, key=None):
        url = self._url("chat/completions"); h = self._h(key)
        p = {k:v for k,v in req.items() if k != "stream"}; p["stream"] = False
        try:
            async with make_client(self.config.get("_root",{}), self.name) as c:
                r = await c.post(url, json=p, headers=h)
                if r.status_code != 200:
                    e = r.text
                    try: e = r.json().get("error",{}).get("message",r.text)
                    except: pass
                    return None, f"HTTP {r.status_code}: {e}"
                return r.json(), None
        except Exception as e: return None, str(e)
    async def chat_stream(self, req, key=None):
        url = self._url("chat/completions"); h = self._h(key)
        p = {k:v for k,v in req.items() if k != "stream"}; p["stream"] = True
        async with make_client(self.config.get("_root",{}), self.name, 300) as c:
            async with c.stream("POST", url, json=p, headers=h) as r:
                if r.status_code != 200:
                    yield f"data: {json.dumps({'error':await r.aread()})}\n\n".encode(); yield b"data: [DONE]\n\n"; return
                async for l in r.aiter_lines():
                    if l.startswith("data: "): yield (l+"\n").encode()
    async def embeddings(self, req, key=None):
        try:
            async with make_client(self.config.get("_root",{}), self.name) as c:
                r = await c.post(self._url("embeddings"), json=req, headers=self._h(key))
                if r.status_code == 200: return r.json(), None
                return None, f"HTTP {r.status_code}: {r.text}"
        except Exception as e: return None, str(e)
    async def images(self, req, key=None):
        try:
            async with make_client(self.config.get("_root",{}), self.name) as c:
                r = await c.post(self._url("images/generations"), json=req, headers=self._h(key))
                if r.status_code == 200: return r.json(), None
                return None, f"HTTP {r.status_code}: {r.text}"
        except Exception as e: return None, str(e)
    async def audio_transcriptions(self, req, key=None):
        try:
            files = req.get("file", None)
            data = {}
            if isinstance(files, str):
                async with httpx.AsyncClient(timeout=120) as c:
                    r = await c.post(self._url("audio/transcriptions"), data=req, headers=self._h(key))
                    if r.status_code == 200: return r.json(), None
                    return None, f"HTTP {r.status_code}: {r.text}"
            async with make_client(self.config.get("_root",{}), self.name, 120) as c:
                r = await c.post(self._url("audio/transcriptions"), json=req, headers=self._h(key))
                if r.status_code == 200: return r.json(), None
                return None, f"HTTP {r.status_code}: {r.text}"
        except Exception as e: return None, str(e)
    async def audio_speech(self, req, key=None):
        try:
            async with make_client(self.config.get("_root",{}), self.name, 120) as c:
                r = await c.post(self._url("audio/speech"), json=req, headers=self._h(key))
                if r.status_code == 200: return r.content, None
                return None, f"HTTP {r.status_code}: {r.text}"
        except Exception as e: return None, str(e)
    async def list_models(self):
        try:
            async with make_client(self.config.get("_root",{}), self.name, 30) as c:
                r = await c.get(self._url("models"), headers=self._h())
                if r.status_code == 200:
                    return [{"id":m["id"],"provider":self.name,"owned_by":m.get("owned_by","")} for m in r.json().get("data",[])]
        except: pass
        return [{"id":m,"provider":self.name,"owned_by":self.name} for m in self.get_models()]

class GeminiProvider(BaseProvider):
    @property
    def type(self): return "gemini"
    def _h(self): return {"Content-Type":"application/json"}
    def _url(self, model, stream=False):
        b = self.config.get("base_url","https://generativelanguage.googleapis.com/v1beta")
        k = self.get_key() or ""
        return f"{b}/models/{model}:{'streamGenerateContent' if stream else 'generateContent'}?key={k}"
    def _conv(self, req):
        si, cc = None, []
        for m in req.get("messages",[]):
            c = m.get("content","")
            if m.get("role")=="system": si = {"parts":[{"text":c}]}; continue
            gr = "model" if m.get("role") in ("assistant","model") else "user"
            if isinstance(c, str): cc.append({"role":gr,"parts":[{"text":c}]})
            elif isinstance(c, list):
                ps = []
                for p in c:
                    if isinstance(p, dict):
                        if p.get("type")=="text": ps.append({"text":p.get("text","")})
                        elif p.get("type")=="image_url": ps.append({"inline_data":{"mime_type":"image/jpeg","data":p.get("image_url",{}).get("url","")}})
                cc.append({"role":gr,"parts":ps})
        r = {"contents":cc}
        if si: r["system_instruction"] = si
        gc = {}
        for k in ("temperature","max_tokens","top_p","top_k"):
            if k in req: gc[k] = req[k]
        if "max_tokens" in req: gc["maxOutputTokens"]=req["max_tokens"]; del gc["max_tokens"]
        if gc: r["generationConfig"]=gc
        return r
    def _extract(self, data):
        try:
            ca = data.get("candidates",[])
            if not ca: return None
            ps = ca[0].get("content",{}).get("parts",[])
            ts = [p.get("text","") for p in ps if "text" in p]
            return "\n".join(ts) if ts else None
        except: return None
    async def chat(self, req, key=None):
        model = self.model_id(req.get("model",""))
        try:
            async with make_client(self.config.get("_root",{}), self.name) as c:
                r = await c.post(self._url(model), json=self._conv(req), headers=self._h())
                if r.status_code != 200: return None, f"HTTP {r.status_code}: {r.text}"
                d = r.json(); ct = self._extract(d)
                if ct is None: return None, "empty response"
                return {"id":f"cmpl-g-{id(d)}","object":"chat.completion","created":0,"model":req.get("model",""),"choices":[{"index":0,"message":{"role":"assistant","content":ct},"finish_reason":"stop"}],"usage":d.get("usageMetadata",{})}, None
        except Exception as e: return None, str(e)
    async def chat_stream(self, req, key=None):
        model = self.model_id(req.get("model",""))
        async with make_client(self.config.get("_root",{}), self.name, 300) as c:
            async with c.stream("POST", self._url(model,True), json=self._conv(req), headers=self._h()) as r:
                if r.status_code != 200:
                    yield f"data: {json.dumps({'error':await r.aread()})}\n\n".encode(); yield b"data: [DONE]\n\n"; return
                async for l in r.aiter_lines():
                    if l.startswith("data: "):
                        try:
                            d = json.loads(l[6:]); t = self._extract(d) or ""
                            yield f"data: {json.dumps({'id':f'cmpl-g-{id(d)}','object':'chat.completion.chunk','created':0,'model':req.get('model',''),'choices':[{'index':0,'delta':{'content':t},'finish_reason':None}]})}\n\n".encode()
                        except: pass
                yield b"data: [DONE]\n\n"
    async def list_models(self):
        return [{"id":m,"provider":self.name,"owned_by":"google"} for m in self.get_models()]

class AnthropicProvider(BaseProvider):
    @property
    def type(self): return "anthropic"
    def _h(self, key=None):
        k = key or self.get_key()
        return {"Content-Type":"application/json","x-api-key":k or "","anthropic-version":"2023-06-01"}
    def _conv(self, req):
        sys_, ms = None, []
        for m in req.get("messages",[]):
            c = m.get("content","")
            if m.get("role")=="system": sys_=c; continue
            ms.append({"role":m.get("role","user"),"content":c})
        r = {"model":self.model_id(req.get("model","")),"messages":ms,"max_tokens":req.get("max_tokens",4096)}
        if sys_: r["system"]=sys_
        if "temperature" in req: r["temperature"]=req["temperature"]
        return r
    async def chat(self, req, key=None):
        url = self.config.get("base_url","https://api.anthropic.com").rstrip("/")+"/v1/messages"
        try:
            async with make_client(self.config.get("_root",{}), self.name) as c:
                r = await c.post(url, json=self._conv(req), headers=self._h(key))
                if r.status_code != 200: return None, f"HTTP {r.status_code}: {r.text}"
                d = r.json()
                return {"id":d.get("id",""),"object":"chat.completion","created":0,"model":req.get("model",""),"choices":[{"index":0,"message":{"role":"assistant","content":"".join(b.get("text","") for b in d.get("content",[]))},"finish_reason":"stop"}],"usage":{"prompt_tokens":d.get("usage",{}).get("input_tokens",0),"completion_tokens":d.get("usage",{}).get("output_tokens",0)}}, None
        except Exception as e: return None, str(e)
    async def chat_stream(self, req, key=None):
        url = self.config.get("base_url","https://api.anthropic.com").rstrip("/")+"/v1/messages"
        p = self._conv(req); p["stream"]=True
        async with make_client(self.config.get("_root",{}), self.name, 300) as c:
            async with c.stream("POST", url, json=p, headers=self._h(key)) as r:
                if r.status_code != 200:
                    yield f"data: {json.dumps({'error':await r.aread()})}\n\n".encode(); yield b"data: [DONE]\n\n"; return
                async for l in r.aiter_lines():
                    if l.startswith("data: "): yield (l+"\n").encode()
                yield b"data: [DONE]\n\n"
    async def list_models(self):
        return [{"id":m,"provider":self.name,"owned_by":"anthropic"} for m in self.get_models()]

def create_provider(name, config, root=None):
    if not config.get("enabled"): return None
    if root: config["_root"] = root
    url = config.get("base_url","").lower()
    if "generativelanguage.googleapis.com" in url or name=="gemini": return GeminiProvider(name, config)
    if "anthropic.com" in url or name=="anthropic": return AnthropicProvider(name, config)
    return OpenAICompatProvider(name, config)

# ---- Router ----
class Router:
    def __init__(self, cfg):
        self.cfg = cfg; self.ts_cfg = cfg.get("token_saver", {})
        self.providers: Dict[str, BaseProvider] = {}
        for pn, pc in cfg.get("providers",{}).items():
            p = create_provider(pn, pc, cfg)
            if p and p.is_enabled(): self.providers[pn] = p
        self.strategy = cfg.get("routing",{}).get("strategy","fallback")
        self.combos = cfg.get("routing",{}).get("combos",{})
        self._cd: Dict[str, float] = {}; self._lat: Dict[str, list] = {}
    def all_models(self):
        ms, seen = [], set()
        for pn, p in self.providers.items():
            for m in p.get_models():
                mid = f"{pn}/{m}" if "/" not in m else m
                if mid not in seen: seen.add(mid); ms.append({"id":mid,"provider":pn,"owned_by":p.name})
        return ms
    def combo_list(self):
        return [{"name":n,**c} for n,c in self.combos.items()] + [{"name":"auto","description":"Smart auto-select"}]
    def _prov_by_tier(self, t):
        return [(n,p) for n,p in self.providers.items() if p.get_tier()==t and p.is_enabled()]
    def _prov_sorted(self):
        r = []
        for t in [1,2,3]: r.extend(self._prov_by_tier(t))
        return r
    def _find(self, model, vision=False):
        if vision:
            for pn, p in self._prov_sorted():
                pm = p.get_models()
                for m in pm:
                    lower = m.lower()
                    if any(v in lower for v in VISION_MODELS):
                        if model in ("auto","vision") or m in model or model in m:
                            return pn, p
        r = find_provider(self.cfg, model)
        if r and r[0] in self.providers: return r[0], self.providers[r[0]]
        for pn, p in self._prov_sorted():
            pm = p.get_models()
            if not pm: return pn, p
            for m in pm:
                if m in model or model in m: return pn, p
        return None
    def _resolve_combo(self, model):
        if model == "auto": return self._score("balanced")
        if model.startswith("auto/"): return self._score(model.split("/",1)[1])
        if model in self.combos:
            return [(s.get("provider",""),self.providers[s["provider"]]) for s in self.combos[model].get("steps",[]) if s.get("provider","") in self.providers and self.providers[s["provider"]].is_enabled()]
        return []
    def _score(self, mode="balanced"):
        scored = []
        for pn, p in self._prov_sorted():
            if self._on_cd(pn): continue
            s = 100 - (10 if p.get_tier()==3 else 5 if p.get_tier()==2 else 0)
            lat = self._avg_lat(pn)
            if lat > 0: s -= min(30, lat/100)
            if mode == "fast": s -= lat/50 if lat > 0 else 0
            elif mode == "cheap": s += p.get_tier()*20
            scored.append((s, pn, p))
        scored.sort(key=lambda x: -x[0])
        return [(pn, p) for _, pn, p in scored]
    def _on_cd(self, pn):
        e = self._cd.get(pn, 0)
        if time.time() < e: return True
        self._cd.pop(pn, None); return False
    def _set_cd(self, pn, s=30): self._cd[pn] = time.time()+s; log.info(f"Cooldown {pn} {s}s")
    def _rec_lat(self, pn, el):
        self._lat.setdefault(pn, []).append(el)
        if len(self._lat[pn]) > 20: self._lat[pn] = self._lat[pn][-20:]
    def _avg_lat(self, pn):
        v = self._lat.get(pn, []); return sum(v)/len(v) if v else 0
    async def _try(self, req, pn, p):
        start = time.time()
        log.info(f"-> {pn}")
        data, err = await p.chat(req)
        self._rec_lat(pn, time.time()-start)
        if data:
            data["x_provider"] = pn
            u = data.get("usage",{}); qtracker.track(pn, req.get("model",""), u.get("prompt_tokens",0), u.get("completion_tokens",0))
            return data, None
        log.warning(f"{pn} fail: {err}"); qtracker.error(pn, req.get("model","")); self._set_cd(pn, 15); return None, err
    async def chat(self, req):
        model = req.get("model","")
        vision = has_vision(req)
        if vision and model in ("auto","vision"): model = "vision"
        orig = est_tokens(req)
        req = process_request(req, self.ts_cfg)
        comp = est_tokens(req)
        if self.ts_cfg.get("enabled") and orig > 0:
            sv = round((1-comp/orig)*100,1); log.info(f"Token saver: {orig}->{comp} ({sv}%)")
        cs = self._resolve_combo(model)
        if cs:
            return await self._run_combo(req, cs)
        fi = self._find(model, vision=vision)
        if fi and not self._on_cd(fi[0]):
            data, err = await self._try(req, fi[0], fi[1])
            if data: return data, None
        if self.strategy == "fallback": return await self._fallback(req, model)
        return {"error":"No available provider"}, "No provider"
    async def _run_combo(self, req, steps):
        for pn, p in steps:
            if self._on_cd(pn): continue
            r = dict(req); pm = p.get_models()
            if pm: r["model"] = pm[0]
            data, err = await self._try(r, pn, p)
            if data: data["x_fallback"]=True; return data, None
        return {"error":"Combo failed"}, "Combo failed"
    async def _fallback(self, req, orig_model):
        for t in [1,2,3]:
            for pn, p in self._prov_by_tier(t):
                if self._on_cd(pn): continue
                r = dict(req); pm = p.get_models()
                if pm: r["model"] = pm[0]
                log.info(f"Fallback {pn} (T{t})")
                data, err = await self._try(r, pn, p)
                if data: data["x_fallback"]=True; return data, None
                self._set_cd(pn, 30); await asyncio.sleep(0.3)
        return {"error":"All providers failed"}, "All failed"
    async def chat_stream(self, req):
        model = req.get("model","")
        vision = has_vision(req)
        if vision and model in ("auto","vision"): model = "vision"
        req = process_request(req, self.ts_cfg)
        cs = self._resolve_combo(model)
        if cs:
            for pn, p in cs:
                if self._on_cd(pn): continue
                r = dict(req); pm = p.get_models()
                if pm: r["model"] = pm[0]
                async for c in p.chat_stream(r): yield c; return
        fi = self._find(model, vision=vision)
        if fi and not self._on_cd(fi[0]):
            async for c in fi[1].chat_stream(req): yield c; return
        for t in [1,2,3]:
            for pn, p in self._prov_by_tier(t):
                if self._on_cd(pn): continue
                r = dict(req); pm = p.get_models()
                if pm: r["model"] = pm[0]
                async for c in p.chat_stream(r): yield c; return
        yield b"data: [DONE]\n\n"
    def status(self):
        st = []
        for pn, p in self.providers.items():
            d = p.to_dict(); d["cooldown"]=self._on_cd(pn); d["latency_ms"]=round(self._avg_lat(pn)*1000,1); st.append(d)
        return st

# ---- Server ----
def make_server(router, cfg, minimal=False):
    try:
        from fastapi import FastAPI, Request
        from fastapi.responses import HTMLResponse, JSONResponse, StreamingResponse
    except ImportError:
        print("Install: pip install fastapi uvicorn"); sys.exit(1)

    app = FastAPI(title="AI Router", version="1.0.0")

    @app.get("/v1/models")
    async def list_models():
        return {"object":"list","data":[{"id":m["id"],"object":"model","created":int(time.time()),"owned_by":m.get("owned_by","airouter")} for m in router.all_models()]}

    @app.post("/v1/chat/completions")
    async def chat_completions(req: Request):
        try: body = await req.json()
        except: return JSONResponse({"error":"Invalid JSON"}, status_code=400)
        if body.get("stream", False):
            return StreamingResponse(_stream(body), media_type="text/event-stream", headers={"Cache-Control":"no-cache","Connection":"keep-alive","X-Accel-Buffering":"no"})
        data, err = await router.chat(body)
        if err: return JSONResponse({"error":err}, status_code=502)
        return data

    async def _stream(body):
        async for c in router.chat_stream(body): yield c

    @app.post("/v1/embeddings")
    async def embeddings_endpoint(req: Request):
        try: body = await req.json()
        except: return JSONResponse({"error":"Invalid JSON"}, status_code=400)
        fi = router._find(body.get("model",""))
        if not fi: return JSONResponse({"error":"No provider"}, status_code=502)
        p = fi[1]
        if hasattr(p, 'embeddings'):
            data, err = await p.embeddings(body)
            if err: return JSONResponse({"error":err}, status_code=502)
            return data
        return JSONResponse({"error":"Not supported"}, status_code=501)

    @app.post("/v1/images/generations")
    async def images_endpoint(req: Request):
        try: body = await req.json()
        except: return JSONResponse({"error":"Invalid JSON"}, status_code=400)
        fi = router._find(body.get("model",""))
        if not fi: return JSONResponse({"error":"No provider"}, status_code=502)
        p = fi[1]
        if hasattr(p, 'images'):
            data, err = await p.images(body)
            if err: return JSONResponse({"error":err}, status_code=502)
            return data
        return JSONResponse({"error":"Not supported"}, status_code=501)

    @app.post("/v1/audio/transcriptions")
    async def audio_transcriptions(req: Request):
        try: body = await req.json()
        except:
            try:
                form = await req.form()
                body = {"file": "upload", "model": form.get("model","whisper-1")}
            except: return JSONResponse({"error":"Invalid request"}, status_code=400)
        fi = router._find(body.get("model",""))
        if not fi: return JSONResponse({"error":"No provider"}, status_code=502)
        p = fi[1]
        if hasattr(p, 'audio_transcriptions'):
            data, err = await p.audio_transcriptions(body)
            if err: return JSONResponse({"error":err}, status_code=502)
            return data
        return JSONResponse({"error":"Not supported"}, status_code=501)

    @app.post("/v1/audio/speech")
    async def audio_speech(req: Request):
        try: body = await req.json()
        except: return JSONResponse({"error":"Invalid JSON"}, status_code=400)
        fi = router._find(body.get("model",""))
        if not fi: return JSONResponse({"error":"No provider"}, status_code=502)
        p = fi[1]
        if hasattr(p, 'audio_speech'):
            data, err = await p.audio_speech(body)
            if err: return JSONResponse({"error":err}, status_code=502)
            return StreamingResponse(data, media_type="audio/mpeg")
        return JSONResponse({"error":"Not supported"}, status_code=501)

    @app.get("/api/status")
    async def api_status():
        return {"providers":router.status(),"models":len(router.all_models()),"combos":router.combo_list(),"quota":qtracker.total()}

    @app.get("/api/quota")
    async def get_quota(): return qtracker.summary()

    @app.get("/api/quota/total")
    async def get_quota_total(): return qtracker.total()

    @app.post("/api/config/reload")
    async def reload_cfg():
        nonlocal router, cfg
        cfg = load_config(); router = Router(cfg)
        return {"status":"ok","providers":list(router.providers.keys()),"models":len(router.all_models())}

    @app.get("/api/config")
    async def get_config():
        safe = {}
        for k, v in cfg.items():
            if k.startswith("_"): continue
            if k == "providers":
                safe[k] = {}
                for pn, pv in v.items():
                    safe[k][pn] = {}
                    for kk, pvv in pv.items():
                        if kk.startswith("_"): continue
                        if kk in ("api_key","client_secret"): safe[k][pn][kk] = "***" if pvv else ""
                        elif isinstance(pvv, (str,int,float,bool,list)): safe[k][pn][kk] = pvv
                        elif isinstance(pvv, dict): safe[k][pn][kk] = {sk:("***" if sk in ("client_secret","refresh_token","auth_code") else sv) for sk,sv in pvv.items()}
            elif isinstance(v, (str,int,float,bool,list,dict)) and not k.startswith("_"): safe[k] = v
        return safe

    @app.post("/api/config/provider/{name}/toggle")
    async def toggle_provider(name: str):
        nonlocal router, cfg
        if name not in cfg.get("providers",{}): return JSONResponse({"error":"Not found"}, 404)
        cfg["providers"][name]["enabled"] = not cfg["providers"][name].get("enabled", False)
        save_config(cfg)
        router = Router(cfg)
        return {"status":"ok","provider":name,"enabled":cfg["providers"][name]["enabled"]}

    @app.post("/api/config/provider/{name}")
    async def update_provider(name: str, req: Request):
        nonlocal router, cfg
        if name not in cfg.get("providers",{}): return JSONResponse({"error":"Not found"}, 404)
        try: body = await req.json()
        except: return JSONResponse({"error":"Invalid JSON"}, 400)
        for k, v in body.items():
            if k in cfg["providers"][name]: cfg["providers"][name][k] = v
        save_config(cfg); router = Router(cfg)
        return {"status":"ok","provider":name}

    @app.get("/api/oauth/status")
    async def oauth_st():
        return {pn: oauth_handler.status(pn) for pn, pc in cfg.get("providers",{}).items() if pc.get("oauth")}

    @app.get("/health")
    async def health(): return {"status":"ok","providers":len(router.providers)}

    @app.get("/dashboard")
    async def dashboard_page():
        if minimal: return HTMLResponse("<h2>Minimal mode</h2><p>Dashboard disabled. Use /api/status</p>")
        return HTMLResponse(_dashboard_html(router, cfg))

    return app

def _dashboard_html(router, cfg):
    srv, ts = cfg.get("server",{}), cfg.get("token_saver",{})
    h, p = srv.get("host","127.0.0.1"), srv.get("port",20128)
    st = router.status(); ms = router.all_models(); qt = qtracker.total(); qs = qtracker.summary()
    mid = ms[0]['id'] if ms else 'auto'
    pr = ""
    for ps in st:
        ic = "🟢" if ps["enabled"] else "🔴"
        cd = " ⏳" if ps.get("cooldown") else ""
        lat = f" | {ps.get('latency_ms',0)}ms" if ps.get("latency_ms") else ""
        ml = ", ".join(ps.get("models",[])[:3])
        if len(ps.get("models",[])) > 3: ml += "..."
        qd_tok = sum(uv.get("total",0) for tu,uv in qs.items() if uv.get("provider")==ps["name"])
        qd_req = sum(uv.get("reqs",0) for tu,uv in qs.items() if uv.get("provider")==ps["name"])
        pr += f"<tr><td>{ic} {ps['name']}{cd}</td><td>T{ps['tier']}{lat}</td><td>{ps['accounts']}</td><td>{qd_tok:,}</td><td>{qd_req}</td><td style='font-size:.85em'>{ml}</td></tr>"
    mr = "".join(f"<tr><td>{m['id']}</td><td>{m['provider']}</td></tr>" for m in ms[:60])
    cr = "".join(f"<tr><td>{c['name']}</td><td>{c.get('description','')}</td></tr>" for c in router.combo_list())
    pb = ""
    for pn, pc in cfg.get("providers",{}).items():
        en = pc.get("enabled",False)
        pb += f"<div style='display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #21262d'><span>{'🟢' if en else '🔴'} {pn}</span><button class='btn btn-sm' onclick=\"fetch('/api/config/provider/{pn}/toggle',{{method:'POST'}}).then(()=>location.reload())\">{'Disable' if en else 'Enable'}</button></div>"
    html = """<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>AI Router</title><style>
*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0d1117;color:#c9d1d9;padding:20px}
.container{max-width:1400px;margin:0 auto}h1{font-size:1.5rem;margin-bottom:20px;color:#58a6ff}h2{font-size:1.1rem;margin:20px 0 10px;color:#8b949e}
.card{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:16px;margin-bottom:16px}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:16px}
.stat{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:16px;text-align:center}
.stat-value{font-size:1.8rem;font-weight:600;color:#58a6ff}.stat-label{font-size:.8rem;color:#8b949e;margin-top:4px}
table{width:100%;border-collapse:collapse}th{text-align:left;padding:8px;border-bottom:1px solid #30363d;color:#8b949e;font-size:.75rem;text-transform:uppercase}
td{padding:8px;border-bottom:1px solid #21262d;font-size:.85rem}tr:hover td{background:#1c2128}
.btn{background:#238636;color:#fff;border:none;padding:4px 12px;border-radius:4px;cursor:pointer;font-size:.8rem}
.btn-sm{padding:2px 8px}.btn:hover{background:#2ea043}pre{background:#0d1117;padding:8px;border-radius:4px;overflow-x:auto;font-size:.8rem}
.footer{margin-top:30px;text-align:center;color:#484f58;font-size:.8rem}a{color:#58a6ff}
</style></head><body><div class="container"><h1>AI Router</h1>
<div class="stats">
<div class="stat"><div class="stat-value">""" + str(len(st)) + """</div><div class="stat-label">Providers</div></div>
<div class="stat"><div class="stat-value">""" + str(len(ms)) + """</div><div class="stat-label">Models</div></div>
<div class="stat"><div class="stat-value">""" + str(sum(1 for s in st if s['enabled'])) + """</div><div class="stat-label">Active</div></div>
<div class="stat"><div class="stat-value">""" + f"{qt.get('total_tokens',0):,}" + """</div><div class="stat-label">Tokens</div></div>
<div class="stat"><div class="stat-value">""" + str(qt.get('total_requests',0)) + """</div><div class="stat-label">Requests</div></div>
<div class="stat"><div class="stat-value">""" + str(qt.get('total_errors',0)) + """</div><div class="stat-label">Errors</div></div>
</div>
<div class="card"><h2>Server</h2><div>Endpoint: http://""" + f"{h}:{p}" + """/v1</div><div>Strategy: """ + cfg.get('routing',{}).get('strategy','fallback') + """</div><div>Token Saver: """ + ('✅ '+ts.get('mode','standard') if ts.get('enabled') else '❌') + """</div><div>Proxy: """ + str(cfg.get('proxy','None')) + """</div></div>
<div class="card"><div style="display:flex;justify-content:space-between;align-items:center"><h2 style="margin:0">Providers</h2><button class="btn" onclick="location.reload()">Refresh</button></div><table><tr><th>Provider</th><th>Tier</th><th>Keys</th><th>Tokens</th><th>Req</th><th>Models</th></tr>""" + pr + """</table></div>
<div class="card"><h2>Combos</h2><table><tr><th>Name</th><th>Description</th></tr>""" + cr + """</table></div>
<div class="card"><h2>Manage</h2>""" + pb + """</div>
<div class="card"><h2>Usage</h2><pre>curl http://""" + f"{h}:{p}" + """/v1/chat/completions -H "Content-Type: application/json" -d '{"model": \"""" + mid + """", "messages": [{"role":"user","content":"Hello"}]}'</pre></div>
<div class="card"><h2>Models (""" + str(len(ms)) + """)</h2><table><tr><th>ID</th><th>Provider</th></tr>""" + mr + """</table>""" + ('' if len(ms)<=60 else f'<p style="color:#8b949e;margin-top:8px">... +{len(ms)-60} more</p>') + """</div>
<div class="footer">AI Router Single &mdash; <a href="/api/status">Status</a> &mdash; <a href="/api/quota">Quota</a> &mdash; <a href="/api/config">Config</a></div></div></body></html>"""
    return html

# ---- CLI ----
def setup_wizard():
    print("\n=== AI Router Setup ===\n")
    cfg = load_config()
    for pn, pc in cfg.get("providers",{}).items():
        if not pc.get("models"): continue
        print(f"[{pn}]")
        print(f"  Models: {', '.join(pc.get('models',[])[:4])}")
        cur = pc.get("api_key","")
        if cur: print(f"  Current key: {cur[:8]}...")
        key = input(f"  API key (Enter skip): ").strip()
        if key:
            pc["api_key"] = key; pc["enabled"] = True
            cfg["providers"][pn] = pc
        print()
    path = input(f"Save config to [config.yaml]: ").strip() or "config.yaml"
    save_config(cfg, path)
    print(f"Saved to {path}. Run: python airouter.py")

def tui_dashboard():
    try:
        from rich.console import Console
        from rich.table import Table
        from rich.live import Live
        from rich.panel import Panel
        from rich.layout import Layout
        from rich.text import Text
    except ImportError:
        print("Install: pip install rich"); sys.exit(1)

    console = Console()
    cfg = load_config()
    router = Router(cfg)

    def make_display():
        st = router.status()
        qt = qtracker.total()
        layout = Layout()
        layout.split_column(
            Layout(name="header", size=3),
            Layout(name="body"),
            Layout(name="footer", size=3),
        )
        header = Text(f"AI Router  |  {len(st)} providers  |  {len(router.all_models())} models  |  {qt.get('total_tokens',0):,} tokens  |  {qt.get('total_requests',0)} requests", style="bold cyan")
        layout["header"].update(Panel(header))
        table = Table(title="Providers")
        table.add_column("Provider"); table.add_column("Status"); table.add_column("Tier"); table.add_column("Latency")
        table.add_column("Keys"); table.add_column("Tokens"); table.add_column("Errors")
        qs = qtracker.summary()
        for s in st:
            ic = "🟢" if s["enabled"] else "🔴"
            cd = "⏳" if s.get("cooldown") else ""
            qd = {"total": sum(uv.get("total",0) for tu,uv in qs.items() if uv.get("provider")==s["name"]), "reqs": sum(uv.get("reqs",0) for tu,uv in qs.items() if uv.get("provider")==s["name"])}
            table.add_row(f"{ic} {s['name']}", f"{'Active' if s['enabled'] else 'Off'}{cd}", str(s["tier"]), f"{s.get('latency_ms',0)}ms", str(s["accounts"]), str(qd.get("total",0)), str(qd.get("errors",0)))
        layout["body"].update(table)
        layout["footer"].update(Panel(Text(f"Press Ctrl+C to exit", style="dim")))
        return layout

    try:
        with Live(make_display(), refresh_per_second=2, screen=True) as live:
            while True:
                time.sleep(2)
                live.update(make_display())
    except KeyboardInterrupt:
        console.print("\nExited.")

def export_usage():
    data = qtracker.summary()
    path = f"airouter-usage-{int(time.time())}.json"
    with open(path, "w") as f: json.dump(data, f, indent=2)
    print(f"Exported to {path}")
    print(f"Total tokens: {qtracker.total().get('total_tokens',0):,}")
    print(f"Total requests: {qtracker.total().get('total_requests',0):,}")
    # by provider
    by_prov = {}
    for k, v in data.items():
        p = v["provider"]
        by_prov.setdefault(p, {"tokens":0,"reqs":0}).update(tokens=by_prov[p]["tokens"]+v.get("total",0), reqs=by_prov[p]["reqs"]+v.get("reqs",0))
    for p, d in sorted(by_prov.items(), key=lambda x: -x[1]["tokens"]):
        print(f"  {p:15s}: {d['tokens']:>8,} tokens, {d['reqs']:>5} requests")

# ---- Main ----
def main():
    parser = argparse.ArgumentParser(description="AI Router - Single file AI Gateway")
    parser.add_argument("--config","-c", help="Config file path")
    parser.add_argument("--host", help="Bind host")
    parser.add_argument("--port","-p", type=int, help="Bind port")
    parser.add_argument("--minimal", action="store_true", help="Minimal mode (no dashboard)")
    parser.add_argument("--no-browser", action="store_true", help="Don't open browser")
    parser.add_argument("--setup", action="store_true", help="Interactive setup wizard")
    parser.add_argument("--tui", action="store_true", help="Terminal UI dashboard")
    parser.add_argument("--list-providers", action="store_true", help="List providers and exit")
    parser.add_argument("--discover", action="store_true", help="Discover provider models")
    parser.add_argument("--export-usage", action="store_true", help="Export usage data to JSON")
    parser.add_argument("--version", action="store_true", help="Show version")
    args = parser.parse_args()

    if args.version: print("AI Router v1.0.0 (single file)"); return

    if args.setup: setup_wizard(); return
    if args.tui: tui_dashboard(); return
    if args.export_usage: export_usage(); return

    cfg = load_config(args.config)
    if args.host: cfg["server"]["host"] = args.host
    if args.port: cfg["server"]["port"] = args.port

    if args.list_providers:
        print(f"{'Provider':20s} {'Status':10s} Tier Keys Models"); print("-"*60)
        for pn, pc in cfg.get("providers",{}).items():
            st = "enabled" if pc.get("enabled") else "disabled"
            keys = len(pc.get("api_keys",[])) + (1 if pc.get("api_key") else 0)
            oa = " oauth" if pc.get("oauth") else ""
            print(f"{pn:20s} {st:10s} T{pc.get('tier','?')}   {keys}    {len(pc.get('models',[]))}{oa}")
        return

    if args.discover:
        router = Router(cfg)
        print(f"Models: {len(router.all_models())}")
        for m in router.all_models(): print(f"  {m['id']}")
        return

    import uvicorn
    minimal = args.minimal
    host, port = cfg["server"]["host"], cfg["server"]["port"]

    if not args.no_browser and not minimal and cfg["server"].get("dashboard", True):
        webbrowser.open(f"http://{host}:{port}/dashboard")

    router = Router(cfg)
    app = make_server(router, cfg, minimal=minimal)

    print(f"\n{'='*50}")
    print(f"  AI Router {'(minimal)' if minimal else ''}")
    print(f"  Endpoint  : http://{host}:{port}/v1")
    print(f"  Dashboard : http://{host}:{port}/dashboard")
    print(f"  Providers : {len(router.providers)} enabled, {len(router.all_models())} models")
    print(f"  Token sav : {cfg.get('token_saver',{}).get('mode','off')}")
    print(f"{'='*50}\n")

    uvicorn.run(app, host=host, port=port, log_level=cfg.get("server",{}).get("log_level","info").lower())

if __name__ == "__main__":
    main()
