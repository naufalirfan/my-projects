import json
import time
import logging
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger("ai-router")


def setup_logging(level: str = "info") -> None:
    logging.basicConfig(
        level=getattr(logging, level.upper(), logging.INFO),
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%H:%M:%S",
    )


def extract_model_from_request(request: Dict[str, Any]) -> str:
    return request.get("model", "")


def extract_messages_from_request(request: Dict[str, Any]) -> List[Dict[str, Any]]:
    return request.get("messages", [])


def count_tokens(text: str) -> int:
    return len(text) // 4


def estimate_request_tokens(request: Dict[str, Any]) -> int:
    total = 0
    for msg in request.get("messages", []):
        content = msg.get("content", "")
        if isinstance(content, list):
            for part in content:
                if isinstance(part, dict):
                    total += count_tokens(part.get("text", ""))
        elif isinstance(content, str):
            total += count_tokens(content)
    return total


def make_openai_chunk(
    model: str, content: str, provider: str, finish_reason: Optional[str] = None
) -> str:
    chunk = {
        "id": f"chatcmpl-{int(time.time()*1000)}",
        "object": "chat.completion.chunk",
        "created": int(time.time()),
        "model": model,
        "choices": [
            {
                "index": 0,
                "delta": {"content": content} if content else {},
                "finish_reason": finish_reason,
            }
        ],
        "x_provider": provider,
    }
    return f"data: {json.dumps(chunk)}\n\n"


def make_openai_response(
    model: str,
    content: str,
    provider: str,
    usage: Optional[Dict[str, int]] = None,
) -> Dict[str, Any]:
    return {
        "id": f"chatcmpl-{int(time.time()*1000)}",
        "object": "chat.completion",
        "created": int(time.time()),
        "model": model,
        "choices": [
            {
                "index": 0,
                "message": {"role": "assistant", "content": content},
                "finish_reason": "stop",
            }
        ],
        "usage": usage or {
            "prompt_tokens": 0,
            "completion_tokens": 0,
            "total_tokens": 0,
        },
        "x_provider": provider,
    }


def make_openai_models_response(models: List[Dict[str, Any]]) -> Dict[str, Any]:
    return {
        "object": "list",
        "data": [
            {
                "id": m["id"],
                "object": "model",
                "created": m.get("created", int(time.time())),
                "owned_by": m.get("owned_by", "ai-router"),
            }
            for m in models
        ],
    }


def find_provider_for_model(
    cfg: Dict[str, Any], model: str
) -> Optional[Tuple[str, Dict[str, Any]]]:
    if "/" in model:
        prefix = model.split("/")[0]
        for pname, pcfg in cfg["providers"].items():
            if pcfg.get("enabled") and pname == prefix:
                return pname, pcfg

    for pname, pcfg in cfg["providers"].items():
        if not pcfg.get("enabled"):
            continue
        for m in pcfg.get("models", []):
            if m == model or model.endswith(f"/{m}"):
                return pname, pcfg

    return None
