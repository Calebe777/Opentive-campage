from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    ai_provider: str = "openai"
    openai_api_key: str = Field(min_length=1)
    openai_model: str = "gpt-4o-mini"
    internal_api_key: str = Field(min_length=16)
    max_briefing_length: int = 5000


@lru_cache
def get_settings() -> Settings:
    return Settings()
