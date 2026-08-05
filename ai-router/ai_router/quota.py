import time
import logging
from typing import Any, Dict, Optional
from threading import Lock

logger = logging.getLogger("ai-router")


class QuotaTracker:
    def __init__(self):
        self._usage: Dict[str, Dict[str, Any]] = {}
        self._lock = Lock()

    def track_request(
        self, provider: str, model: str, prompt_tokens: int = 0, completion_tokens: int = 0
    ) -> None:
        with self._lock:
            now = time.time()
            key = f"{provider}:{model}"
            if key not in self._usage:
                self._usage[key] = {
                    "provider": provider,
                    "model": model,
                    "prompt_tokens": 0,
                    "completion_tokens": 0,
                    "total_tokens": 0,
                    "request_count": 0,
                    "last_used": now,
                    "first_used": now,
                    "errors": 0,
                }
            u = self._usage[key]
            u["prompt_tokens"] += prompt_tokens
            u["completion_tokens"] += completion_tokens
            u["total_tokens"] += prompt_tokens + completion_tokens
            u["request_count"] += 1
            u["last_used"] = now

    def track_error(self, provider: str, model: str = "") -> None:
        with self._lock:
            key = f"{provider}:{model or '*'}"
            if key not in self._usage:
                self._usage[key] = {"provider": provider, "model": model, "errors": 0}
            self._usage[key]["errors"] = self._usage[key].get("errors", 0) + 1

    def get_usage(self, provider: Optional[str] = None) -> Dict[str, Any]:
        with self._lock:
            if provider:
                result = {}
                for key, val in self._usage.items():
                    if val["provider"] == provider:
                        result[key] = dict(val)
                return result
            return {k: dict(v) for k, v in self._usage.items()}

    def get_provider_summary(self, provider: str) -> Dict[str, Any]:
        usage = self.get_usage(provider)
        total_tokens = sum(u["total_tokens"] for u in usage.values())
        total_requests = sum(u["request_count"] for u in usage.values())
        total_errors = sum(u["errors"] for u in usage.values())
        models = list(dict.fromkeys(u["model"] for u in usage.values() if u["model"]))

        return {
            "provider": provider,
            "total_tokens": total_tokens,
            "total_requests": total_requests,
            "total_errors": total_errors,
            "models": models,
            "usage": usage,
        }

    def get_all_summaries(self) -> Dict[str, Any]:
        providers = set(u["provider"] for u in self._usage.values())
        return {p: self.get_provider_summary(p) for p in providers}

    def get_total_stats(self) -> Dict[str, Any]:
        with self._lock:
            total_tokens = sum(u["total_tokens"] for u in self._usage.values())
            total_requests = sum(u["request_count"] for u in self._usage.values())
            total_errors = sum(u["errors"] for u in self._usage.values())
            return {
                "total_tokens": total_tokens,
                "total_requests": total_requests,
                "total_errors": total_errors,
                "providers_used": len(set(u["provider"] for u in self._usage.values())),
            }

    def reset(self) -> None:
        with self._lock:
            self._usage.clear()


quota_tracker = QuotaTracker()
