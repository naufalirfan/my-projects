import asyncio
import json
import time
import logging
from typing import Any, Dict, Optional
from urllib.parse import parse_qs, urlencode

import httpx

logger = logging.getLogger("ai-router")


class OAuthHandler:
    def __init__(self):
        self._tokens: Dict[str, Dict[str, Any]] = {}
        self._refresh_locks: Dict[str, asyncio.Lock] = {}

    async def get_token(self, provider: str, config: Dict[str, Any]) -> Optional[str]:
        oauth = config.get("oauth", {})
        if not oauth:
            return None

        now = time.time()
        token_data = self._tokens.get(provider)

        if token_data and token_data.get("expires_at", 0) > now + 60:
            return token_data.get("access_token")

        lock = self._refresh_locks.setdefault(provider, asyncio.Lock())
        async with lock:
            token_data = self._tokens.get(provider)
            if token_data and token_data.get("expires_at", 0) > now + 60:
                return token_data.get("access_token")

            refresh_token = oauth.get("refresh_token") or (token_data or {}).get("refresh_token")
            client_id = oauth.get("client_id", "")
            client_secret = oauth.get("client_secret", "")
            token_url = oauth.get("token_url", "https://oauth2.googleapis.com/token")

            if refresh_token:
                return await self._refresh_access_token(provider, token_url, refresh_token, client_id, client_secret)

            auth_code = oauth.get("auth_code")
            if auth_code:
                return await self._exchange_auth_code(provider, token_url, auth_code, client_id, client_secret, oauth)

        return None

    async def _refresh_access_token(
        self, provider: str, token_url: str, refresh_token: str, client_id: str, client_secret: str
    ) -> Optional[str]:
        try:
            data = {
                "grant_type": "refresh_token",
                "refresh_token": refresh_token,
                "client_id": client_id,
                "client_secret": client_secret,
            }
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.post(token_url, data=data)
                if resp.status_code == 200:
                    result = resp.json()
                    return self._store_token(provider, result)
                logger.warning(f"OAuth refresh failed for {provider}: {resp.status_code} {resp.text}")
        except Exception as e:
            logger.error(f"OAuth refresh error for {provider}: {e}")
        return None

    async def _exchange_auth_code(
        self, provider: str, token_url: str, auth_code: str, client_id: str, client_secret: str, oauth: Dict
    ) -> Optional[str]:
        try:
            redirect_uri = oauth.get("redirect_uri", "http://localhost:20128/callback")
            data = {
                "grant_type": "authorization_code",
                "code": auth_code,
                "client_id": client_id,
                "client_secret": client_secret,
                "redirect_uri": redirect_uri,
            }
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.post(token_url, data=data)
                if resp.status_code == 200:
                    result = resp.json()
                    return self._store_token(provider, result)
                logger.warning(f"OAuth exchange failed for {provider}: {resp.status_code} {resp.text}")
        except Exception as e:
            logger.error(f"OAuth exchange error for {provider}: {e}")
        return None

    def _store_token(self, provider: str, result: Dict) -> str:
        access_token = result.get("access_token", "")
        expires_in = result.get("expires_in", 3600)
        self._tokens[provider] = {
            "access_token": access_token,
            "refresh_token": result.get("refresh_token", self._tokens.get(provider, {}).get("refresh_token")),
            "expires_at": time.time() + expires_in,
            "token_type": result.get("token_type", "Bearer"),
        }
        logger.info(f"OAuth token refreshed for {provider} (expires in {expires_in}s)")
        return access_token

    def set_auth_code(self, provider: str, code: str) -> None:
        logger.info(f"Auth code set for {provider}")

    def status(self, provider: str) -> Dict[str, Any]:
        token = self._tokens.get(provider)
        if not token:
            return {"status": "no_token", "provider": provider}
        return {
            "status": "ok",
            "provider": provider,
            "expires_in": max(0, int(token.get("expires_at", 0) - time.time())),
            "has_refresh_token": bool(token.get("refresh_token")),
        }


oauth_handler = OAuthHandler()
