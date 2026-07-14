from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Email Marketing API"
    environment: str = "development"
    database_url: str = "postgresql+asyncpg://admin:secret@localhost:5432/emailmkt"
    redis_url: str = "redis://localhost:6379/0"
    jwt_secret: str = Field(min_length=32)
    internal_api_key: str = Field(min_length=16)
    ai_service_url: str = "http://localhost:8002"
    access_token_minutes: int = 15
    refresh_token_days: int = 7
    webhook_rate_limit_per_minute: int = 60
    media_url: str | None = None


@lru_cache
def get_settings() -> Settings:
    return Settings()
