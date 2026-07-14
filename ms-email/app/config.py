from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str
    redis_url: str = "redis://localhost:6379/0"
    backend_url: str = "http://localhost:8000"
    internal_api_key: str = Field(min_length=16)
    public_base_url: str = "http://localhost:8001"
    smtp_host: str
    smtp_port: int = 587
    smtp_username: str | None = None
    smtp_password: str | None = None
    smtp_use_tls: bool = True
    worker_poll_seconds: float = 1
    max_attempts: int = 5


@lru_cache
def get_settings() -> Settings:
    return Settings()
