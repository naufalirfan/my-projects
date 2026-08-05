import json
from typing import Any, AsyncGenerator, Dict, List, Optional, Tuple

import httpx

from .base import BaseProvider
from ..proxy import make_httpx_client


class AnthropicProvider(BaseProvider):
    @property
    def type(self) -> str:
        return "anthropic"

    def _headers(self, api_key: Optional[str] = None) -> Dict[str, str]:
        key = api_key or self.get_api_key()
        return {
            "Content-Type": "application/json",
            "x-api-key": key or "",
            "anthropic-version": "2023-06-01",
        }

    def _convert_messages(self, request: Dict[str, Any]) -> Dict[str, Any]:
        system = None
        messages = []
        for msg in request.get("messages", []):
            role = msg.get("role", "user")
            content = msg.get("content", "")
            if role == "system":
                system = content
                continue
            messages.append({"role": role, "content": content})
        result = {
            "model": self.get_provider_model_id(request.get("model", "")),
            "messages": messages,
            "max_tokens": request.get("max_tokens", 4096),
        }
        if system:
            result["system"] = system
        if "temperature" in request:
            result["temperature"] = request["temperature"]
        return result

    async def _post(self, url: str, json_body: dict, headers: dict, timeout: float = 120.0) -> httpx.Response:
        client = make_httpx_client(self.config.get("_root_config", {}), self.name, timeout)
        async with client as c:
            return await c.post(url, json=json_body, headers=headers)

    async def chat_completion(
        self, request: Dict[str, Any], api_key: Optional[str] = None
    ) -> Tuple[Dict[str, Any], Optional[str]]:
        url = self.config.get("base_url", "https://api.anthropic.com").rstrip("/") + "/v1/messages"
        payload = self._convert_messages(request)
        try:
            resp = await self._post(url, payload, self._headers(api_key))
            if resp.status_code != 200:
                return None, f"HTTP {resp.status_code}: {resp.text}"
            data = resp.json()
            content = "".join(b.get("text", "") for b in data.get("content", []))
            return {
                "id": data.get("id", ""),
                "object": "chat.completion",
                "created": 0,
                "model": request.get("model", ""),
                "choices": [{"index": 0, "message": {"role": "assistant", "content": content}, "finish_reason": "stop"}],
                "usage": {
                    "prompt_tokens": data.get("usage", {}).get("input_tokens", 0),
                    "completion_tokens": data.get("usage", {}).get("output_tokens", 0),
                },
            }, None
        except Exception as e:
            return None, str(e)

    async def chat_completion_stream(
        self, request: Dict[str, Any], api_key: Optional[str] = None
    ) -> AsyncGenerator[bytes, None]:
        url = self.config.get("base_url", "https://api.anthropic.com").rstrip("/") + "/v1/messages"
        payload = self._convert_messages(request)
        payload["stream"] = True
        client = make_httpx_client(self.config.get("_root_config", {}), self.name, 300.0)
        async with client as c:
            async with c.stream("POST", url, json=payload, headers=self._headers(api_key)) as resp:
                if resp.status_code != 200:
                    err = await resp.aread()
                    yield f"data: {json.dumps({'error': err.decode()})}\n\n".encode()
                    yield b"data: [DONE]\n\n"
                    return
                async for line in resp.aiter_lines():
                    if line.startswith("data: "):
                        yield (line + "\n").encode()
                yield b"data: [DONE]\n\n"

    async def list_models(self) -> List[Dict[str, Any]]:
        return [{"id": m, "provider": self.name, "owned_by": "anthropic"} for m in self.get_models()]
