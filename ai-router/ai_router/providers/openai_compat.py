import json
from typing import Any, AsyncGenerator, Dict, List, Optional, Tuple

import httpx

from .base import BaseProvider
from ..oauth import oauth_handler
from ..proxy import make_httpx_client


class OpenAICompatibleProvider(BaseProvider):
    @property
    def type(self) -> str:
        return "openai-compatible"

    def _headers(self, api_key: Optional[str] = None, config_override: Optional[Dict] = None) -> Dict[str, str]:
        cfg = config_override or self.config
        key = api_key or self.get_api_key()

        if not key:
            oauth_cfg = cfg.get("oauth", {})
            if oauth_cfg:
                token = self._get_oauth_token(oauth_cfg)
                if token:
                    key = token

        headers = {"Content-Type": "application/json"}
        if key:
            oauth_cfg = cfg.get("oauth", {})
            if oauth_cfg and not api_key:
                headers["Authorization"] = f"{oauth_cfg.get('token_type', 'Bearer')} {key}"
            else:
                headers["Authorization"] = f"Bearer {key}"

        if self.name == "openrouter":
            headers["HTTP-Referer"] = "http://localhost:20128"
            headers["X-Title"] = "AI Router"

        extra = cfg.get("extra_headers", {})
        headers.update(extra)
        return headers

    def _get_oauth_token(self, oauth_cfg: Dict) -> Optional[str]:
        import asyncio
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            return None
        if loop.is_running():
            return None
        return asyncio.run(oauth_handler.get_token(self.name, self.config))

    def _build_url(self, path: str) -> str:
        base = self.config.get("base_url", "").rstrip("/")
        return f"{base}/{path.lstrip('/')}"

    async def _post(self, url: str, json_body: dict, headers: dict, timeout: float = 120.0) -> httpx.Response:
        client = make_httpx_client(self.config.get("_root_config", {}), self.name, timeout)
        async with client as c:
            return await c.post(url, json=json_body, headers=headers)

    async def _get(self, url: str, headers: dict, timeout: float = 30.0) -> httpx.Response:
        client = make_httpx_client(self.config.get("_root_config", {}), self.name, timeout)
        async with client as c:
            return await c.get(url, headers=headers)

    async def chat_completion(
        self, request: Dict[str, Any], api_key: Optional[str] = None
    ) -> Tuple[Dict[str, Any], Optional[str]]:
        url = self._build_url("chat/completions")
        headers = self._headers(api_key)
        payload = {k: v for k, v in request.items() if k != "stream"}
        payload["stream"] = False

        try:
            resp = await self._post(url, payload, headers)
            if resp.status_code != 200:
                err = resp.text
                try:
                    err = resp.json().get("error", {}).get("message", resp.text)
                except Exception:
                    pass
                return None, f"HTTP {resp.status_code}: {err}"
            data = resp.json()
            return data, None
        except Exception as e:
            return None, str(e)

    async def chat_completion_stream(
        self, request: Dict[str, Any], api_key: Optional[str] = None
    ) -> AsyncGenerator[bytes, None]:
        url = self._build_url("chat/completions")
        headers = self._headers(api_key)
        payload = {k: v for k, v in request.items() if k != "stream"}
        payload["stream"] = True

        client = make_httpx_client(self.config.get("_root_config", {}), self.name, 300.0)
        async with client as c:
            async with c.stream("POST", url, json=payload, headers=headers) as resp:
                if resp.status_code != 200:
                    err = await resp.aread()
                    yield f"data: {json.dumps({'error': err.decode()})}\n\n".encode()
                    yield b"data: [DONE]\n\n"
                    return
                async for line in resp.aiter_lines():
                    if line.startswith("data: "):
                        yield (line + "\n").encode()

    async def chat_completion_embeddings(
        self, request: Dict[str, Any], api_key: Optional[str] = None
    ) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
        url = self._build_url("embeddings")
        headers = self._headers(api_key)
        try:
            resp = await self._post(url, request, headers)
            if resp.status_code == 200:
                return resp.json(), None
            return None, f"HTTP {resp.status_code}: {resp.text}"
        except Exception as e:
            return None, str(e)

    async def chat_completion_image(
        self, request: Dict[str, Any], api_key: Optional[str] = None
    ) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
        url = self._build_url("images/generations")
        headers = self._headers(api_key)
        try:
            resp = await self._post(url, request, headers)
            if resp.status_code == 200:
                return resp.json(), None
            return None, f"HTTP {resp.status_code}: {resp.text}"
        except Exception as e:
            return None, str(e)

    def discover_models(self) -> Optional[List[str]]:
        try:
            import asyncio
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            models = loop.run_until_complete(self.list_models())
            loop.close()
            return [m["id"] for m in models]
        except Exception:
            return None

    async def list_models(self) -> List[Dict[str, Any]]:
        url = self._build_url("models")
        headers = self._headers()
        try:
            resp = await self._get(url, headers)
            if resp.status_code == 200:
                data = resp.json()
                models = []
                for m in data.get("data", []):
                    mid = m["id"]
                    models.append({
                        "id": mid,
                        "provider": self.name,
                        "owned_by": m.get("owned_by", ""),
                    })
                return models
        except Exception:
            pass
        return [{"id": m, "provider": self.name, "owned_by": self.name} for m in self.get_models()]
