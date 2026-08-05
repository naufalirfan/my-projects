from typing import Any, Dict, Optional

from .base import BaseProvider
from .openai_compat import OpenAICompatibleProvider
from .gemini import GeminiProvider
from .anthropic import AnthropicProvider


def create_provider(name: str, config: Dict[str, Any], root_config: Optional[Dict] = None) -> Optional[BaseProvider]:
    if not config.get("enabled"):
        return None

    if root_config:
        config["_root_config"] = root_config

    base_url = config.get("base_url", "").lower()

    if "generativelanguage.googleapis.com" in base_url or name == "gemini":
        return GeminiProvider(name, config)
    if "anthropic.com" in base_url or name == "anthropic":
        return AnthropicProvider(name, config)

    return OpenAICompatibleProvider(name, config)


def create_providers(cfg: Dict[str, Any]) -> Dict[str, BaseProvider]:
    providers = {}
    for pname, pcfg in cfg.get("providers", {}).items():
        p = create_provider(pname, pcfg, cfg)
        if p and p.is_enabled():
            providers[pname] = p
    return providers
