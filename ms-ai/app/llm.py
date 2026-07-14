import json
from typing import TypeVar

from openai import AsyncOpenAI
from pydantic import BaseModel

from app.config import get_settings

T = TypeVar("T", bound=BaseModel)


class LLMClient:
    def __init__(self) -> None:
        settings = get_settings()
        if settings.ai_provider != "openai":
            raise ValueError(f"unsupported AI provider: {settings.ai_provider}")
        self.model = settings.openai_model
        self.client = AsyncOpenAI(api_key=settings.openai_api_key)

    async def structured(self, system: str, user: str, schema: type[T]) -> T:
        response = await self.client.responses.parse(
            model=self.model,
            input=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            text_format=schema,
        )
        if response.output_parsed is None:
            raise ValueError("model returned no structured output")
        return response.output_parsed


def request_json(payload: BaseModel) -> str:
    return json.dumps(payload.model_dump(exclude_none=True), ensure_ascii=False)
