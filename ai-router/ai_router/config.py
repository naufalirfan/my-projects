import os
import yaml
from pathlib import Path
from typing import Any, Dict, List, Optional

DEFAULT_CONFIG_PATH = Path.home() / ".ai-router" / "config.yaml"

DEFAULT_CONFIG = {
    "server": {
        "host": "127.0.0.1",
        "port": 20128,
        "dashboard": True,
        "log_level": "info",
    },
    "routing": {
        "strategy": "fallback",
        "tiers": {
            "tier1": {"name": "Subscription", "providers": []},
            "tier2": {"name": "Cheap", "providers": []},
            "tier3": {"name": "Free", "providers": ["openrouter", "groq", "gemini"]},
        },
        "combos": {
            "auto": {"description": "Smart auto-select based on scoring"},
            "fast": {"description": "Optimized for low latency"},
            "cheap": {"description": "Optimized for lowest cost"},
        },
    },
    "providers": {},
    "token_saver": {
        "enabled": True,
        "mode": "standard",
        "max_tool_output_lines": 500,
        "max_tool_output_chars": 10000,
        "strip_repeated_blank_lines": True,
    },
    "proxy": None,
}

DEFAULT_PROVIDERS = {
    "openrouter": {
        "enabled": False,
        "tier": 3,
        "api_key": "",
        "base_url": "https://openrouter.ai/api/v1",
        "models": [
            "openai/gpt-4o-mini",
            "anthropic/claude-3-haiku",
            "google/gemini-2.0-flash-001",
            "meta-llama/llama-3.3-70b-instruct",
            "mistralai/mistral-7b-instruct",
        ],
        "api_keys": [],
        "extra_headers": {},
    },
    "groq": {
        "enabled": False,
        "tier": 3,
        "api_key": "",
        "base_url": "https://api.groq.com/openai/v1",
        "models": [
            "llama-3.3-70b-versatile",
            "llama-3.1-8b-instant",
            "mixtral-8x7b-32768",
            "gemma2-9b-it",
        ],
        "api_keys": [],
    },
    "gemini": {
        "enabled": False,
        "tier": 3,
        "api_key": "",
        "base_url": "https://generativelanguage.googleapis.com/v1beta",
        "models": ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro"],
        "api_keys": [],
    },
    "openai": {
        "enabled": False,
        "tier": 1,
        "api_key": "",
        "base_url": "https://api.openai.com/v1",
        "models": [],
        "api_keys": [],
    },
    "anthropic": {
        "enabled": False,
        "tier": 1,
        "api_key": "",
        "base_url": "https://api.anthropic.com",
        "models": [],
        "api_keys": [],
    },
    "kiro": {
        "enabled": False,
        "tier": 3,
        "api_key": "",
        "base_url": "https://api.kiro.ai/v1",
        "models": ["claude-sonnet-4.5", "claude-4.0", "glm-5", "minimax"],
        "oauth": {
            "auth_url": "https://kiro.ai/oauth/authorize",
            "token_url": "https://api.kiro.ai/oauth/token",
            "client_id": "",
            "client_secret": "",
            "scopes": ["openid", "profile", "offline_access"],
        },
    },
    "vertex": {
        "enabled": False,
        "tier": 3,
        "api_key": "",
        "base_url": "https://us-central1-aiplatform.googleapis.com/v1",
        "models": ["gemini-2.0-flash", "gemini-1.5-pro", "claude-3-sonnet"],
        "oauth": {
            "token_url": "https://oauth2.googleapis.com/token",
            "client_id": "",
            "client_secret": "",
            "scopes": ["https://www.googleapis.com/auth/cloud-platform"],
        },
    },
    "antigravity": {
        "enabled": False,
        "tier": 3,
        "api_key": "",
        "base_url": "https://api.antigravity.ai/v1",
        "models": ["claude-4.0", "gpt-4o", "gemini-2.0"],
        "oauth": {
            "auth_url": "https://antigravity.ai/oauth/authorize",
            "token_url": "https://api.antigravity.ai/oauth/token",
            "client_id": "",
            "client_secret": "",
        },
    },
}


def load_config(config_path: Optional[str] = None) -> Dict[str, Any]:
    cfg = {k: (dict(v) if isinstance(v, dict) else v) for k, v in DEFAULT_CONFIG.items()}
    cfg["providers"] = {k: _deep_copy_dict(v) for k, v in DEFAULT_PROVIDERS.items()}

    paths_to_try = []
    if config_path:
        paths_to_try.append(Path(config_path))
    paths_to_try.append(Path("config.yaml"))
    paths_to_try.append(DEFAULT_CONFIG_PATH)

    loaded = {}
    for p in paths_to_try:
        if p.exists():
            with open(p, encoding="utf-8") as f:
                loaded = yaml.safe_load(f) or {}
            break

    if loaded:
        _deep_merge(cfg, loaded)

    cfg["_config_path"] = str(paths_to_try[0] if config_path else paths_to_try[1])

    for pname, pcfg in cfg["providers"].items():
        if pcfg.get("api_key") or pcfg.get("api_keys") or pcfg.get("oauth", {}).get("client_id"):
            pcfg["enabled"] = True

    cfg.setdefault("token_saver", DEFAULT_CONFIG["token_saver"])
    cfg.setdefault("proxy", None)
    cfg.setdefault("routing", DEFAULT_CONFIG["routing"])

    return cfg


def save_config(cfg: Dict[str, Any], path: Optional[str] = None) -> None:
    save_path = Path(path or cfg.get("_config_path", str(DEFAULT_CONFIG_PATH)))
    save_path.parent.mkdir(parents=True, exist_ok=True)
    clean = _clean_for_save(cfg)
    with open(save_path, "w", encoding="utf-8") as f:
        yaml.dump(clean, f, default_flow_style=False, allow_unicode=True)


def _clean_for_save(cfg: Dict) -> Dict:
    return {k: v for k, v in cfg.items() if not k.startswith("_")}


def _deep_merge(base: Dict, override: Dict) -> None:
    for key, value in override.items():
        if key in base and isinstance(base[key], dict) and isinstance(value, dict):
            _deep_merge(base[key], value)
        else:
            base[key] = value


def _deep_copy_dict(d: Dict) -> Dict:
    result = {}
    for k, v in d.items():
        if isinstance(v, dict):
            result[k] = _deep_copy_dict(v)
        elif isinstance(v, list):
            result[k] = list(v)
        else:
            result[k] = v
    return result


def provider_names(cfg: Dict[str, Any]) -> List[str]:
    return [n for n, p in cfg["providers"].items() if p.get("enabled")]
