from functools import lru_cache
from typing import Literal

from pydantic import AnyHttpUrl, Field, PostgresDsn, RedisDsn, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "Kemplu"
    app_version: str = "1.0.0"
    environment: Literal["local", "development", "staging", "production"] = "local"
    secret_key: SecretStr = Field(default=SecretStr("change-me"))
    frontend_url: AnyHttpUrl = "http://localhost:5173"
    timezone: str = "Asia/Jakarta"
    access_token_expire_minutes: int = 60 * 24
    oauth_state_cookie_name: str = "huawei_oauth_state"
    oauth_state_cookie_max_age_seconds: int = 600
    oauth_state_cookie_secure: bool | None = None
    oauth_state_cookie_samesite: Literal["lax", "strict", "none"] = "lax"

    database_url: PostgresDsn = "postgresql+asyncpg://kemplu:password@postgres:5432/kemplu"
    redis_url: RedisDsn = "redis://redis:6379/0"

    huawei_client_id: str = ""
    huawei_client_secret: SecretStr = Field(default=SecretStr(""))
    huawei_redirect_uri: AnyHttpUrl = "http://localhost:8000/api/auth/huawei/callback"
    huawei_auth_url: AnyHttpUrl = "https://oauth-login.cloud.huawei.com/oauth2/v3/authorize"
    huawei_token_url: AnyHttpUrl = "https://oauth-login.cloud.huawei.com/oauth2/v3/token"
    huawei_health_base_url: AnyHttpUrl = "https://health-api.cloud.huawei.com/healthkit/v2"

    cors_origins: list[str] = Field(default_factory=lambda: ["http://localhost:5173"])


@lru_cache
def get_settings() -> Settings:
    return Settings()
