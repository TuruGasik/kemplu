import json
import secrets
from datetime import UTC, datetime, timedelta
from typing import Any
from urllib.parse import urlencode

import httpx
from jose import jwt
from redis.asyncio import Redis

from app.config import Settings, get_settings

HUAWEI_HEALTH_SCOPES = [
    "openid",
    "profile"
    "https://www.huawei.com/healthkit/step.read",
    "https://www.huawei.com/healthkit/distance.read",
    "https://www.huawei.com/healthkit/calories.read",
    "https://www.huawei.com/healthkit/mediumhighactivity.read",
    "https://www.huawei.com/healthkit/activehours.read",
    "https://www.huawei.com/healthkit/activitysummary.read",
    "https://www.huawei.com/healthkit/exercisegoal.read",
    "https://www.huawei.com/healthkit/sportachievement.read",
    "https://www.huawei.com/healthkit/activityrecord.read",
    "https://www.huawei.com/healthkit/activity.read",
    "https://www.huawei.com/healthkit/sportability.read"
]


class HuaweiAuthService:
    def __init__(self, redis: Redis, settings: Settings | None = None) -> None:
        self.redis = redis
        self.settings = settings or get_settings()

    def build_auth_url(self, state: str | None = None) -> tuple[str, str]:
        oauth_state = state or secrets.token_urlsafe(32)
        params = {
            "response_type": "code",
            "client_id": self.settings.huawei_client_id,
            "redirect_uri": str(self.settings.huawei_redirect_uri),
            "scope": " ".join(HUAWEI_HEALTH_SCOPES),
            "state": oauth_state,
            "access_type": "offline",
        }
        return f"{self.settings.huawei_auth_url}?{urlencode(params)}", oauth_state

    async def exchange_code(self, code: str) -> dict[str, Any]:
        payload = {
            "grant_type": "authorization_code",
            "code": code,
            "client_id": self.settings.huawei_client_id,
            "client_secret": self.settings.huawei_client_secret.get_secret_value(),
            "redirect_uri": str(self.settings.huawei_redirect_uri),
        }
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(str(self.settings.huawei_token_url), data=payload)
            response.raise_for_status()
            return response.json()

    async def store_tokens(self, user_id: str, token_payload: dict[str, Any]) -> None:
        expires_in = int(token_payload.get("expires_in", 3600))
        token_data = {
            "access_token": token_payload["access_token"],
            "refresh_token": token_payload.get("refresh_token"),
            "expires_at": (datetime.now(UTC) + timedelta(seconds=expires_in)).isoformat(),
            "scope": token_payload.get("scope"),
            "token_type": token_payload.get("token_type", "Bearer"),
        }
        await self.redis.set(f"huawei:tokens:{user_id}", json.dumps(token_data), ex=expires_in)
        if token_data["refresh_token"]:
            await self.redis.set(f"huawei:refresh:{user_id}", token_data["refresh_token"])

    async def get_access_token(self, user_id: str) -> str:
        token_json = await self.redis.get(f"huawei:tokens:{user_id}")
        if token_json:
            token_data = json.loads(token_json)
            return str(token_data["access_token"])
        return await self.refresh_token(user_id)

    async def refresh_token(self, user_id: str) -> str:
        refresh_token = await self.redis.get(f"huawei:refresh:{user_id}")
        if not refresh_token:
            raise ValueError("Huawei refresh token is missing")

        payload = {
            "grant_type": "refresh_token",
            "refresh_token": refresh_token,
            "client_id": self.settings.huawei_client_id,
            "client_secret": self.settings.huawei_client_secret.get_secret_value(),
        }
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(str(self.settings.huawei_token_url), data=payload)
            response.raise_for_status()
            token_payload = response.json()

        if "refresh_token" not in token_payload:
            token_payload["refresh_token"] = refresh_token
        await self.store_tokens(user_id, token_payload)
        return str(token_payload["access_token"])

    async def revoke_token(self, user_id: str) -> None:
        await self.redis.delete(f"huawei:tokens:{user_id}", f"huawei:refresh:{user_id}")

    def create_session_token(self, user_id: str) -> str:
        expires_at = datetime.now(UTC) + timedelta(minutes=self.settings.access_token_expire_minutes)
        payload = {"sub": user_id, "exp": expires_at, "iat": datetime.now(UTC)}
        return jwt.encode(payload, self.settings.secret_key.get_secret_value(), algorithm="HS256")

    def verify_session_token(self, token: str) -> str:
        payload = jwt.decode(token, self.settings.secret_key.get_secret_value(), algorithms=["HS256"])
        return str(payload["sub"])
