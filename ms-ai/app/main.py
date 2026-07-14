import hmac

from fastapi import Depends, FastAPI, Header, HTTPException, status
from openai import APIError, APITimeoutError, RateLimitError

from app.config import get_settings
from app.pipeline import TemplatePipeline
from app.schemas import GenerateRequest, GenerateResponse

app = FastAPI(title="Email Marketing AI", version="0.1.0")


def require_internal_key(x_internal_api_key: str = Header()) -> None:
    if not hmac.compare_digest(x_internal_api_key, get_settings().internal_api_key):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "invalid internal API key")


def get_pipeline() -> TemplatePipeline:
    return TemplatePipeline()


@app.get("/health", tags=["health"])
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post(
    "/generate",
    response_model=GenerateResponse,
    dependencies=[Depends(require_internal_key)],
    tags=["generation"],
)
async def generate(
    payload: GenerateRequest,
    pipeline: TemplatePipeline = Depends(get_pipeline),
) -> GenerateResponse:
    try:
        return await pipeline.generate(payload)
    except (APITimeoutError, RateLimitError) as exc:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "AI provider temporarily unavailable") from exc
    except (APIError, ValueError) as exc:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "AI generation failed") from exc
