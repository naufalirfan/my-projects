import json
from typing import Any, AsyncGenerator, Dict, List, Optional, Tuple

import httpx

from .base import BaseProvider
from ..proxy import make_httpx_client


class GeminiProvider(BaseProvider):
    @property
    def type(self) -> str:
        return "gemini"

    def _headers(self, api_key: Optional[str] = None) -> Dict[str, str]:
        return {"Content-Type": "application/json"}

    def _build_url(self, model: str, stream: bool = False) -> str:
        base = self.config.get("base_url", "https://generativelanguage.googleapis.com/v1beta")
        key = self.get_api_key() or ""
        alt = "streamGenerateContent" if stream else "generateContent"
        return f"{base}/models/{model}:{alt}?key={key}"

    def _convert_messages(self, request: Dict[str, Any]) -> Dict[str, Any]:
        system_instruction = None
        contents = []
        for msg in request.get("messages", []):
            role = msg.get("role", "user")
            content = msg.get("content", "")
            if role == "system":
                system_instruction = {"parts": [{"text": content}]}
                continue
            gemini_role = "model" if role in ("assistant", "model") else "user"
            if isinstance(content, str):
                contents.append({"role": gemini_role, "parts": [{"text": content}]})
            elif isinstance(content, list):
                parts = []
                for part in content:
                    if isinstance(part, dict):
                        t = part.get("type", "")
                        if t == "text":
                            parts.append({"text": part.get("text", "")})
                        elif t == "image_url":
                            img = part.get("image_url", {}).get("url", "")
                            parts.append({"inline_data": {"mime_type": "image/jpeg", "data": img}})
                contents.append({"role": gemini_role, "parts": parts})
        result = {"contents": contents}
        if system_instruction:
            result["system_instruction"] = system_instruction
        gen_config = {}
        for k in ("temperature", "max_tokens", "top_p", "top_k"):
            if k in request:
                gen_config[k] = request[k]
        if "max_tokens" in request:
            gen_config["maxOutputTokens"] = request["max_tokens"]
            del gen_config["max_tokens"]
        if gen_config:
            result["generationConfig"] = gen_config
        return result

    def _extract_content(self, data: Dict[str, Any]) -> Optional[str]:
        try:
            candidates = data.get("candidates", [])
            if not candidates:
                block = data.get("promptFeedback", {}).get("blockReason")
                return f"[Blocked: {block}]" if block else None
            parts = candidates[0].get("content", {}).get("parts", [])
            texts = [p.get("text", "") for p in parts if "text" in p]
            return "\n".join(texts) if texts else None
        except Exception:
            return None

    async def _post(self, url: str, json_body: dict, headers: dict) -> httpx.Response:
        client = make_httpx_client(self.config.get("_root_config", {}), self.name)
        async with client as c:
            return await c.post(url, json=json_body, headers=headers)

    async def chat_completion(
        self, request: Dict[str, Any], api_key: Optional[str] = None
    ) -> Tuple[Dict[str, Any], Optional[str]]:
        model = self.get_provider_model_id(request.get("model", ""))
        url = self._build_url(model)
        payload = self._convert_messages(request)
        try:
            resp = await self._post(url, payload, self._headers(api_key))
            if resp.status_code != 200:
                return None, f"HTTP {resp.status_code}: {resp.text}"
            data = resp.json()
            content = self._extract_content(data)
            if content is None:
                return None, "empty response"
            return {
                "id": f"chatcmpl-gemini-{id(data)}",
                "object": "chat.completion",
                "created": 0,
                "model": request.get("model", ""),
                "choices": [{"index": 0, "message": {"role": "assistant", "content": content}, "finish_reason": "stop"}],
                "usage": data.get("usageMetadata", {}),
            }, None
        except Exception as e:
            return None, str(e)

    async def chat_completion_stream(
        self, request: Dict[str, Any], api_key: Optional[str] = None
    ) -> AsyncGenerator[bytes, None]:
        model = self.get_provider_model_id(request.get("model", ""))
        url = self._build_url(model, stream=True)
        payload = self._convert_messages(request)
        client = make_httpx_client(self.config.get("_root_config", {}), self.name, 300.0)
        async with client as c:
            async with c.stream("POST", url, json=payload, headers=self._headers()) as resp:
                if resp.status_code != 200:
                    err = await resp.aread()
                    yield f"data: {json.dumps({'error': err.decode()})}\n\n".encode()
                    yield b"data: [DONE]\n\n"
                    return
                async for line in resp.aiter_lines():
                    if line.startswith("data: "):
                        try:
                            d = json.loads(line[6:])
                            text = self._extract_content(d) or ""
                            chunk = {
                                "id": f"cmpl-gemini-{id(d)}",
                                "object": "chat.completion.chunk",
                                "created": 0,
                                "model": request.get("model", ""),
                                "choices": [{"index": 0, "delta": {"content": text}, "finish_reason": None}],
                            }
                            yield f"data: {json.dumps(chunk)}\n\n".encode()
                        except json.JSONDecodeError:
                            pass
                yield b"data: [DONE]\n\n"

    async def list_models(self) -> List[Dict[str, Any]]:
        return [{"id": m, "provider": self.name, "owned_by": "google"} for m in self.get_models()]

    def discover_models(self) -> Optional[List[str]]:
        try:
            base = self.config.get("base_url", "https://generativelanguage.googleapis.com/v1beta")
            key = self.get_api_key()
            if not key:
                return None
            url = f"{base}/models?key={key}"
            import asyncio
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            model_data = loop.run_until_complete(self._fetch_models(url))
            loop.close()
            models = []
            for m_data in model_data:
                mid = m_data.get("name", "").replace("models/", "")
                if "generateContent" in m_data.get("supportedGenerationMethods", []):
                    models.append(mid)
            return models if models else None
        except Exception:
            return None

    async def _fetch_models(self, url: str) -> List[Dict]:
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, headers=self._headers())
            if resp.status_code == 200:
                data = resp.json()
                return data.get("models", [])
        return []
