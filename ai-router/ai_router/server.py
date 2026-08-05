import json
import logging
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse, JSONResponse, StreamingResponse

from .config import load_config, save_config
from .router_engine import RouterEngine
from .quota import quota_tracker
from .oauth import oauth_handler
from . import utils

logger = logging.getLogger("ai-router")

app = FastAPI(title="AI Router", version="1.0.0")
engine: Optional[RouterEngine] = None
cfg: Dict[str, Any] = {}


@app.on_event("startup")
async def startup():
    global engine, cfg
    cfg = load_config()
    utils.setup_logging(cfg.get("server", {}).get("log_level", "info"))
    engine = RouterEngine(cfg)
    engine.discover_models()
    logger.info(f"Started on {cfg['server']['host']}:{cfg['server']['port']}")
    logger.info(f"Providers: {', '.join(engine.providers.keys())}")
    logger.info(f"Models: {len(engine.get_all_models())}")


# ---- OpenAI-compatible endpoints ----

@app.get("/v1/models")
async def list_models():
    if not engine:
        raise HTTPException(503, "Engine not ready")
    return utils.make_openai_models_response(engine.get_all_models())


@app.post("/v1/chat/completions")
async def chat_completions(request: Request):
    if not engine:
        raise HTTPException(503, "Engine not ready")
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(400, "Invalid JSON")

    if body.get("stream", False):
        return StreamingResponse(
            _stream_chat(body),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no"},
        )

    data, provider, error = await engine.chat_completion(body)
    if error or data is None:
        raise HTTPException(502, f"Provider error: {error}")
    return JSONResponse(content=data)


@app.post("/v1/embeddings")
async def embeddings(request: Request):
    if not engine:
        raise HTTPException(503, "Engine not ready")
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(400, "Invalid JSON")

    model = body.get("model", "")
    provider_info = engine._find_provider(model)
    if not provider_info:
        raise HTTPException(502, "No provider for embeddings")

    pname, provider = provider_info
    data, error = await provider.chat_completion_embeddings(body)
    if error or data is None:
        raise HTTPException(502, f"Embeddings error: {error}")
    data["x_provider"] = pname
    return JSONResponse(content=data)


@app.post("/v1/images/generations")
async def images(request: Request):
    if not engine:
        raise HTTPException(503, "Engine not ready")
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(400, "Invalid JSON")

    model = body.get("model", "")
    provider_info = engine._find_provider(model)
    if not provider_info:
        raise HTTPException(502, "No provider for image gen")

    pname, provider = provider_info
    data, error = await provider.chat_completion_image(body)
    if error or data is None:
        raise HTTPException(502, f"Image error: {error}")
    data["x_provider"] = pname
    return JSONResponse(content=data)


async def _stream_chat(body: Dict[str, Any]):
    if not engine:
        return
    async for chunk in engine.chat_completion_stream(body):
        yield chunk


# ---- Dashboard & Management ----

@app.get("/dashboard", response_class=HTMLResponse)
async def dashboard():
    if not engine:
        raise HTTPException(503, "Engine not ready")
    if not cfg.get("server", {}).get("dashboard", True):
        return HTMLResponse("<h2>Minimal Mode</h2><p>Dashboard disabled. Use <a href='/api/status'>/api/status</a> or <code>python -m ai_router --tui</code></p>")
    status = engine.get_provider_status()
    models = engine.get_all_models()
    quota = quota_tracker.get_all_summaries()
    stats = quota_tracker.get_total_stats()
    combos = engine.get_combo_list()
    return HTMLResponse(content=_render_dashboard(cfg, status, models, quota, stats, combos))


@app.get("/api/status")
async def api_status():
    if not engine:
        raise HTTPException(503, "Engine not ready")
    return {
        "providers": engine.get_provider_status(),
        "models_count": len(engine.get_all_models()),
        "combos": engine.get_combo_list(),
        "quota": quota_tracker.get_total_stats(),
        "config": {
            "server": {k: v for k, v in cfg.get("server", {}).items() if k != "_config_path"},
            "routing": cfg.get("routing", {}),
            "token_saver": cfg.get("token_saver", {}),
        },
    }


@app.get("/api/quota")
async def get_quota():
    return quota_tracker.get_all_summaries()


@app.get("/api/quota/total")
async def get_quota_total():
    return quota_tracker.get_total_stats()


@app.post("/api/config/reload")
async def reload_config():
    global engine, cfg
    cfg = load_config()
    engine = RouterEngine(cfg)
    engine.discover_models()
    return {"status": "ok", "providers": list(engine.providers.keys()), "models": len(engine.get_all_models())}


@app.get("/api/config")
async def get_config():
    safe = {}
    for k, v in cfg.items():
        if k.startswith("_"):
            continue
        if k == "providers":
            safe[k] = {}
            for pn, pv in v.items():
                safe[k][pn] = {}
                for kk, pvv in pv.items():
                    if kk.startswith("_"):
                        continue
                    if kk in ("api_key", "client_secret"):
                        safe[k][pn][kk] = "***" if pvv else ""
                    elif isinstance(pvv, (str, int, float, bool, list)):
                        safe[k][pn][kk] = pvv
                    elif isinstance(pvv, dict):
                        safe[k][pn][kk] = {sk: ("***" if sk in ("client_secret", "refresh_token", "auth_code") else sv) for sk, sv in pvv.items()}
                    else:
                        safe[k][pn][kk] = str(pvv)
        elif isinstance(v, (str, int, float, bool, list, dict)) and not k.startswith("_"):
            safe[k] = v
    return JSONResponse(content=safe)


@app.post("/api/config/provider/{name}/toggle")
async def toggle_provider(name: str):
    global engine, cfg
    if name in cfg.get("providers", {}):
        current = cfg["providers"][name].get("enabled", False)
        cfg["providers"][name]["enabled"] = not current
        save_config(cfg)
        engine = RouterEngine(cfg)
        engine.discover_models()
        return {"status": "ok", "provider": name, "enabled": not current}
    raise HTTPException(404, f"Provider {name} not found")


@app.post("/api/config/provider/{name}")
async def update_provider(name: str, request: Request):
    global engine, cfg
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(400, "Invalid JSON")

    if name not in cfg.get("providers", {}):
        raise HTTPException(404, f"Provider {name} not found")

    for k, v in body.items():
        if k in cfg["providers"][name]:
            cfg["providers"][name][k] = v

    save_config(cfg)
    engine = RouterEngine(cfg)
    engine.discover_models()
    return {"status": "ok", "provider": name}


@app.post("/api/config/proxy")
async def set_proxy(request: Request):
    global engine, cfg
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(400, "Invalid JSON")
    cfg["proxy"] = body.get("proxy")
    save_config(cfg)
    engine = RouterEngine(cfg)
    return {"status": "ok", "proxy": cfg["proxy"]}


@app.get("/api/oauth/status")
async def oauth_status():
    providers = cfg.get("providers", {})
    result = {}
    for pname in providers:
        if providers[pname].get("oauth"):
            result[pname] = oauth_handler.status(pname)
    return result


@app.post("/api/oauth/callback/{provider}")
async def oauth_callback(provider: str, request: Request):
    global engine, cfg
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(400, "Invalid JSON")

    code = body.get("code", "")
    if provider not in cfg.get("providers", {}):
        raise HTTPException(404)

    oauth_handler.set_auth_code(provider, code)
    cfg["providers"][provider].setdefault("oauth", {})["auth_code"] = code
    save_config(cfg)
    engine = RouterEngine(cfg)
    return {"status": "ok", "provider": provider}


@app.get("/health")
async def health():
    return {"status": "ok", "providers": len(engine.providers) if engine else 0}


# ---- Dashboard render ----

def _render_dashboard(config, provider_status, models, quota_data, stats, combos):
    srv = config.get("server", {})
    tscfg = config.get("token_saver", {})
    host = srv.get("host", "127.0.0.1")
    port = srv.get("port", 20128)

    prov_rows = ""
    for ps in provider_status:
        icon = "🟢" if ps["enabled"] else "🔴"
        cd = " ⏳" if ps.get("cooldown") else ""
        lat = f" | {ps.get('avg_latency_ms', 0)}ms" if ps.get("avg_latency_ms") else ""
        ms = ", ".join(ps.get("models", [])[:3])
        if len(ps.get("models", [])) > 3:
            ms += "..."
        q = quota_data.get(ps["name"], {})
        qt = q.get("total_tokens", 0)
        qr = q.get("total_requests", 0)
        prov_rows += f"<tr><td>{icon} {ps['name']}{cd}</td><td>T{ps['tier']}{lat}</td><td>{ps['accounts']}</td><td>{qt:,}</td><td>{qr}</td><td style='font-size:0.85em'>{ms}</td></tr>"

    model_rows = ""
    for m in models[:50]:
        model_rows += f"<tr><td>{m['id']}</td><td>{m['provider']}</td></tr>"

    combo_rows = "".join(f"<tr><td>{c['name']}</td><td>{c.get('description','')}</td></tr>" for c in combos)

    prov_btns = ""
    for pn in config.get("providers", {}):
        pc = config["providers"][pn]
        en = pc.get("enabled", False)
        prov_btns += f"""<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #21262d">
<span>{'🟢' if en else '🔴'} {pn}</span>
<button class="btn btn-sm" onclick="toggleProvider('{pn}')">{'Disable' if en else 'Enable'}</button>
</div>"""

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>AI Router Dashboard</title>
<style>
* {{ margin:0; padding:0; box-sizing:border-box; }}
body {{ font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; background:#0d1117; color:#c9d1d9; padding:20px; }}
.container {{ max-width:1400px; margin:0 auto; }}
h1 {{ font-size:1.5rem; margin-bottom:20px; color:#58a6ff; }}
h2 {{ font-size:1.1rem; margin:20px 0 10px; color:#8b949e; }}
.card {{ background:#161b22; border:1px solid #30363d; border-radius:8px; padding:16px; margin-bottom:16px; }}
.stats {{ display:grid; grid-template-columns:repeat(auto-fit,minmax(160px,1fr)); gap:12px; margin-bottom:16px; }}
.stat {{ background:#161b22; border:1px solid #30363d; border-radius:8px; padding:16px; text-align:center; }}
.stat-value {{ font-size:1.8rem; font-weight:600; color:#58a6ff; }}
.stat-label {{ font-size:0.8rem; color:#8b949e; margin-top:4px; }}
table {{ width:100%; border-collapse:collapse; }}
th {{ text-align:left; padding:8px; border-bottom:1px solid #30363d; color:#8b949e; font-size:0.75rem; text-transform:uppercase; }}
td {{ padding:8px; border-bottom:1px solid #21262d; font-size:0.85rem; }}
tr:hover td {{ background:#1c2128; }}
.btn {{ background:#238636; color:#fff; border:none; padding:4px 12px; border-radius:4px; cursor:pointer; font-size:0.8rem; }}
.btn-sm {{ padding:2px 8px; }}
.btn:hover {{ background:#2ea043; }}
pre {{ background:#0d1117; padding:8px; border-radius:4px; overflow-x:auto; font-size:0.8rem; }}
.footer {{ margin-top:30px; text-align:center; color:#484f58; font-size:0.8rem; }}
a {{ color:#58a6ff; }}
</style>
</head>
<body>
<div class="container">
<h1>AI Router Dashboard</h1>

<div class="stats">
<div class="stat"><div class="stat-value">{len(provider_status)}</div><div class="stat-label">Providers</div></div>
<div class="stat"><div class="stat-value">{len(models)}</div><div class="stat-label">Models</div></div>
<div class="stat"><div class="stat-value">{sum(1 for p in provider_status if p['enabled'])}</div><div class="stat-label">Active</div></div>
<div class="stat"><div class="stat-value">{stats.get('total_tokens',0):,}</div><div class="stat-label">Total Tokens</div></div>
<div class="stat"><div class="stat-value">{stats.get('total_requests',0)}</div><div class="stat-label">Requests</div></div>
<div class="stat"><div class="stat-value">{stats.get('total_errors',0)}</div><div class="stat-label">Errors</div></div>
</div>

<div class="card">
<h2>Server</h2>
<div class="config-item"><span>Endpoint</span><span>http://{host}:{port}/v1</span></div>
<div class="config-item"><span>Strategy</span><span>{config.get('routing',{}).get('strategy','fallback')}</span></div>
<div class="config-item"><span>Token Saver</span><span>{'✅ '+tscfg.get('mode','standard') if tscfg.get('enabled') else '❌ Disabled'}</span></div>
<div class="config-item"><span>Proxy</span><span>{cfg.get('proxy','None')}</span></div>
</div>

<div class="card">
<div style="display:flex;justify-content:space-between;align-items:center">
<h2 style="margin:0">Providers</h2>
<button class="btn" onclick="location.reload()">Refresh</button>
</div>
<table><tr><th>Provider</th><th>Tier</th><th>Keys</th><th>Tokens</th><th>Req</th><th>Models</th></tr>
{prov_rows}
</table>
</div>

<div class="card">
<h2>Combos / Routing Strategies</h2>
<table><tr><th>Combo</th><th>Description</th></tr>{combo_rows}</table>
</div>

<div class="card">
<h2>Manage Providers</h2>
{prov_btns}
</div>

<div class="card">
<h2>Usage</h2>
<pre>
# OpenAI-compatible endpoint
curl http://{host}:{port}/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -d '{{
  "model": "{models[0]['id'] if models else 'groq/llama-3.3-70b-versatile'}",
  "messages": [{{"role":"user","content":"Hello"}}]
}}'

# Auto-routing (try cheapest available)
curl http://{host}:{port}/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -d '{{
  "model": "auto",
  "messages": [{{"role":"user","content":"Hello"}}]
}}'
</pre>
</div>

<div class="card">
<h2>Models ({len(models)})</h2>
<table><tr><th>Model ID</th><th>Provider</th></tr>{model_rows}</table>
{f'<p style="color:#8b949e;margin-top:8px">... +{len(models)-50} more</p>' if len(models) > 50 else ''}
</div>

<div class="footer">
AI Router v1.0.0 &mdash; <a href="/api/status">API Status</a> &mdash; <a href="/api/quota">Quota</a> &mdash; <a href="/api/config">Config</a>
<button class="btn btn-sm" onclick="fetch('/api/config/reload',{{method:'POST'}}).then(r=>r.json()).then(d=>alert('Reloaded: '+d.providers.join(', ')))" style="margin-left:8px">Reload Config</button>
</div>

</div>
<script>
async function toggleProvider(name) {{
  await fetch('/api/config/provider/'+name+'/toggle', {{method:'POST'}});
  location.reload();
}}
</script>
</body>
</html>"""
