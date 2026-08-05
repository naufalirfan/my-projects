from abc import ABC, abstractmethod
from typing import Any, AsyncGenerator, Dict, List, Optional, Tuple


class BaseProvider(ABC):
    name: str
    config: Dict[str, Any]
    _api_keys: List[str]
    _key_index: int = 0

    def __init__(self, name: str, config: Dict[str, Any]):
        self.name = name
        self.config = config
        keys = []
        if config.get("api_key"):
            keys.append(config["api_key"])
        if config.get("api_keys"):
            keys.extend(config["api_keys"])
        self._api_keys = list(dict.fromkeys(keys))
        self._key_index = 0

    @property
    @abstractmethod
    def type(self) -> str:
        ...

    @abstractmethod
    async def chat_completion(
        self, request: Dict[str, Any], api_key: Optional[str] = None
    ) -> Tuple[Dict[str, Any], Optional[str]]:
        ...

    @abstractmethod
    async def chat_completion_stream(
        self, request: Dict[str, Any], api_key: Optional[str] = None
    ) -> AsyncGenerator[bytes, None]:
        ...

    @abstractmethod
    async def list_models(self) -> List[Dict[str, Any]]:
        ...

    async def chat_completion_embeddings(
        self, request: Dict[str, Any], api_key: Optional[str] = None
    ) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
        return None, "Embeddings not supported"

    async def chat_completion_image(
        self, request: Dict[str, Any], api_key: Optional[str] = None
    ) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
        return None, "Image generation not supported"

    def discover_models(self) -> Optional[List[str]]:
        return None

    def get_api_key(self) -> Optional[str]:
        if not self._api_keys:
            return None
        key = self._api_keys[self._key_index % len(self._api_keys)]
        self._key_index += 1
        return key

    def get_tier(self) -> int:
        return self.config.get("tier", 3)

    def is_enabled(self) -> bool:
        has_key = len(self._api_keys) > 0
        has_oauth = bool(self.config.get("oauth"))
        oauth_configured = has_oauth
        return self.config.get("enabled", False) and (has_key or oauth_configured)

    def get_models(self) -> List[str]:
        return self.config.get("models", [])

    def get_provider_model_id(self, model: str) -> str:
        if "/" in model:
            return model.split("/", 1)[1]
        return model

    def get_oauth_config(self) -> Optional[Dict[str, Any]]:
        return self.config.get("oauth")

    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "type": self.type,
            "tier": self.get_tier(),
            "enabled": self.is_enabled(),
            "models": self.get_models(),
            "accounts": len(self._api_keys),
            "has_oauth": bool(self.get_oauth_config()),
        }
