import asyncio
import time
import logging
from typing import Any, AsyncGenerator, Dict, List, Optional, Tuple

from .providers.base import BaseProvider
from .providers.factory import create_providers
from .token_saver import TokenSaver
from .quota import quota_tracker
from . import utils

logger = logging.getLogger("ai-router")


class RouterEngine:
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.providers: Dict[str, BaseProvider] = create_providers(config)
        self.token_saver = TokenSaver(config)
        self.strategy = config.get("routing", {}).get("strategy", "fallback")
        self.combos = config.get("routing", {}).get("combos", {})
        self._cooldowns: Dict[str, float] = {}
        self._latency: Dict[str, List[float]] = {}

    def discover_models(self) -> None:
        logger.info("Discovering models from providers...")
        for pname, provider in self.providers.items():
            try:
                models = provider.discover_models()
                if models:
                    provider.config["models"] = models
                    logger.info(f"  {pname}: {len(models)} models discovered")
            except Exception as e:
                logger.debug(f"  {pname}: model discovery failed ({e})")

    def get_all_models(self) -> List[Dict[str, Any]]:
        models_list = []
        seen = set()
        for pname, provider in self.providers.items():
            for m in provider.get_models():
                mid = f"{pname}/{m}" if "/" not in m else m
                if mid not in seen:
                    seen.add(mid)
                    models_list.append({"id": mid, "provider": pname, "owned_by": provider.name})
        return models_list

    def get_combo_list(self) -> List[Dict[str, Any]]:
        return [
            {"name": name, **combo}
            for name, combo in self.combos.items()
        ] + [
            {"name": "auto", "description": "Smart auto-select based on scoring"}
        ]

    def _get_providers_by_tier(self, tier: int) -> List[Tuple[str, BaseProvider]]:
        return [(n, p) for n, p in self.providers.items() if p.get_tier() == tier and p.is_enabled()]

    def _get_providers_sorted_by_tier(self) -> List[Tuple[str, BaseProvider]]:
        result = []
        for t in [1, 2, 3]:
            result.extend(self._get_providers_by_tier(t))
        return result

    def _find_provider(self, model: str) -> Optional[Tuple[str, BaseProvider]]:
        result = utils.find_provider_for_model(self.config, model)
        if result:
            pname, pcfg = result
            if pname in self.providers:
                return pname, self.providers[pname]
        for pname, provider in self._get_providers_sorted_by_tier():
            pmodels = provider.get_models()
            if not pmodels:
                return pname, provider
            for pm in pmodels:
                if pm in model or model in pm:
                    return pname, provider
        return None

    def _resolve_combo(self, model: str) -> List[Tuple[str, BaseProvider]]:
        if model == "auto":
            return self._score_providers("balanced")
        if model.startswith("auto/"):
            mode = model.split("/", 1)[1]
            return self._score_providers(mode)
        if model in self.combos:
            combo = self.combos[model]
            steps = []
            for step in combo.get("steps", []):
                pname = step.get("provider", "")
                if pname in self.providers and self.providers[pname].is_enabled():
                    steps.append((pname, self.providers[pname]))
            return steps
        return []

    def _score_providers(self, mode: str = "balanced") -> List[Tuple[str, BaseProvider]]:
        scored = []
        for pname, provider in self._get_providers_sorted_by_tier():
            if self._is_on_cooldown(pname):
                continue
            score = 100
            tier = provider.get_tier()
            if tier == 3:
                score -= 10
            elif tier == 2:
                score -= 5
            avg_latency = self._get_avg_latency(pname)
            if avg_latency > 0:
                score -= min(30, avg_latency / 100)
            if mode == "fast":
                score -= avg_latency / 50 if avg_latency > 0 else 0
            elif mode == "cheap":
                score += tier * 20
            error_rate = quota_tracker.get_provider_summary(pname).get("total_errors", 0)
            score -= min(20, error_rate * 5)
            scored.append((score, pname, provider))
        scored.sort(key=lambda x: -x[0])
        return [(pname, provider) for _, pname, provider in scored]

    def _is_on_cooldown(self, provider_name: str) -> bool:
        exp = self._cooldowns.get(provider_name, 0)
        if time.time() < exp:
            return True
        self._cooldowns.pop(provider_name, None)
        return False

    def _set_cooldown(self, provider_name: str, seconds: int = 30) -> None:
        self._cooldowns[provider_name] = time.time() + seconds
        logger.info(f"Provider {provider_name} cooldown {seconds}s")

    def _record_latency(self, provider: str, elapsed: float) -> None:
        if provider not in self._latency:
            self._latency[provider] = []
        self._latency[provider].append(elapsed)
        if len(self._latency[provider]) > 20:
            self._latency[provider] = self._latency[provider][-20:]

    def _get_avg_latency(self, provider: str) -> float:
        vals = self._latency.get(provider, [])
        return sum(vals) / len(vals) if vals else 0

    async def chat_completion(
        self, request: Dict[str, Any]
    ) -> Tuple[Optional[Dict[str, Any]], Optional[str], Optional[str]]:
        model = utils.extract_model_from_request(request)
        original_tokens = utils.estimate_request_tokens(request)
        request = self.token_saver.process_request(request)
        compressed_tokens = utils.estimate_request_tokens(request)

        if self.token_saver.enabled and original_tokens > 0:
            savings = self.token_saver.estimate_savings(original_tokens, compressed_tokens)
            logger.debug(f"Token saver: saved ~{savings}%")

        # auto/combo routing
        combo_steps = self._resolve_combo(model)

        if combo_steps:
            return await self._try_combo(request, combo_steps)

        # direct provider match
        provider_info = self._find_provider(model)
        if provider_info:
            pname, provider = provider_info
            if not self._is_on_cooldown(pname):
                return await self._try_provider(request, pname, provider)

        if self.strategy == "fallback":
            return await self._fallback_all(request, model)

        return None, None, "No available provider"

    async def _try_provider(
        self, request: Dict[str, Any], pname: str, provider: BaseProvider
    ) -> Tuple[Optional[Dict[str, Any]], Optional[str], Optional[str]]:
        start = time.time()
        logger.info(f"Routing to {pname}")
        data, error = await provider.chat_completion(request)
        elapsed = time.time() - start
        self._record_latency(pname, elapsed)

        if data:
            data["x_provider"] = pname
            usage = data.get("usage", {})
            quota_tracker.track_request(
                pname,
                request.get("model", ""),
                usage.get("prompt_tokens", 0),
                usage.get("completion_tokens", 0),
            )
            return data, pname, None

        logger.warning(f"{pname} failed: {error}")
        quota_tracker.track_error(pname, request.get("model", ""))
        self._set_cooldown(pname, 15)
        return None, pname, error

    async def _try_combo(
        self, request: Dict[str, Any], steps: List[Tuple[str, BaseProvider]]
    ) -> Tuple[Optional[Dict[str, Any]], Optional[str], Optional[str]]:
        errors = []
        for pname, provider in steps:
            if self._is_on_cooldown(pname):
                errors.append(f"{pname}: cooldown")
                continue
            req = {k: v for k, v in request.items()}
            pmodels = provider.get_models()
            if pmodels:
                req["model"] = pmodels[0]
            data, ret_provider, err = await self._try_provider(req, pname, provider)
            if data:
                data["x_fallback"] = True
                return data, pname, None
            errors.append(f"{pname}: {err}")
        return None, None, f"Combo failed: {'; '.join(errors)}"

    async def _fallback_all(
        self, request: Dict[str, Any], original_model: str
    ) -> Tuple[Optional[Dict[str, Any]], Optional[str], Optional[str]]:
        errors = []
        for tier_num in [1, 2, 3]:
            for pname, provider in self._get_providers_by_tier(tier_num):
                if self._is_on_cooldown(pname):
                    continue
                req = {k: v for k, v in request.items()}
                pmodels = provider.get_models()
                if pmodels:
                    req["model"] = pmodels[0]
                logger.info(f"Fallback to {pname} (tier {tier_num})")
                data, _, err = await self._try_provider(req, pname, provider)
                if data:
                    data["x_fallback"] = True
                    return data, pname, None
                errors.append(f"{pname}: {err}")
                self._set_cooldown(pname, 30)
                await asyncio.sleep(0.3)
        return None, None, f"All failed: {'; '.join(errors)}"

    async def chat_completion_stream(
        self, request: Dict[str, Any]
    ) -> AsyncGenerator[bytes, None]:
        model = utils.extract_model_from_request(request)
        request = self.token_saver.process_request(request)

        combo_steps = self._resolve_combo(model)
        if combo_steps:
            for pname, provider in combo_steps:
                if self._is_on_cooldown(pname):
                    continue
                req = {k: v for k, v in request.items()}
                pmodels = provider.get_models()
                if pmodels:
                    req["model"] = pmodels[0]
                async for chunk in provider.chat_completion_stream(req):
                    yield chunk
                return

        provider_info = self._find_provider(model)
        if provider_info:
            pname, provider = provider_info
            if not self._is_on_cooldown(pname):
                async for chunk in provider.chat_completion_stream(request):
                    yield chunk
                return

        for tier_num in [1, 2, 3]:
            for pname, provider in self._get_providers_by_tier(tier_num):
                if self._is_on_cooldown(pname):
                    continue
                req = {k: v for k, v in request.items()}
                pmodels = provider.get_models()
                if pmodels:
                    req["model"] = pmodels[0]
                async for chunk in provider.chat_completion_stream(req):
                    yield chunk
                return
        yield b"data: [DONE]\n\n"

    def get_provider_status(self) -> List[Dict[str, Any]]:
        status = []
        for pname, provider in self.providers.items():
            info = provider.to_dict()
            info["cooldown"] = self._is_on_cooldown(pname)
            info["avg_latency_ms"] = round(self._get_avg_latency(pname) * 1000, 1)
            info["strategy_score"] = self._score_providers().index((pname, provider)) + 1 if (pname, provider) in self._score_providers() else 99
            status.append(info)
        return status
