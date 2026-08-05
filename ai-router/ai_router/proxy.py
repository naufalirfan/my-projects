import logging
from typing import Any, Dict, Optional

logger = logging.getLogger("ai-router")


def resolve_proxy_for(config: Dict[str, Any], provider: str) -> Optional[Dict[str, Any]]:
    provider_cfg = config.get("providers", {}).get(provider, {})
    proxy = provider_cfg.get("proxy") or config.get("proxy") or config.get("server", {}).get("proxy")
    if isinstance(proxy, str):
        return {"url": proxy, "type": _detect_proxy_type(proxy)}
    if isinstance(proxy, dict) and proxy.get("url"):
        return proxy
    return None


def _detect_proxy_type(url: str) -> str:
    if url.startswith("socks5"):
        return "socks5"
    if url.startswith("socks4"):
        return "socks4"
    return "http"


def make_httpx_client(
    config: Dict[str, Any], provider: str, timeout: float = 120.0
) -> Any:
    import httpx

    proxy_cfg = resolve_proxy_for(config, provider)
    kwargs = {"timeout": timeout}

    if proxy_cfg:
        proxy_url = proxy_cfg["url"]
        kwargs["proxies"] = proxy_url
        logger.debug(f"Using proxy {proxy_url[:20]}... for {provider}")

    return httpx.AsyncClient(**kwargs)
