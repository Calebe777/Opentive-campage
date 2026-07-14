from pydantic import BaseModel, Field, field_validator

from app.config import get_settings


class GenerateRequest(BaseModel):
    briefing: str
    tone: str | None = Field(None, max_length=100)
    audience: str | None = Field(None, max_length=300)
    cta: str | None = Field(None, max_length=150)

    @field_validator("briefing", "tone", "audience", "cta")
    @classmethod
    def strip_fields(cls, value: str | None, info) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        if not stripped:
            raise ValueError(f"{info.field_name} cannot be blank")
        if info.field_name == "briefing" and len(stripped) > get_settings().max_briefing_length:
            raise ValueError("briefing exceeds configured maximum length")
        return stripped


class CopyDraft(BaseModel):
    subject: str = Field(min_length=1, max_length=255)
    preview_text: str = Field(min_length=1, max_length=255)
    headline: str = Field(min_length=1, max_length=200)
    body: str = Field(min_length=1, max_length=4000)
    cta_text: str = Field(min_length=1, max_length=100)


class DesignDraft(BaseModel):
    subject: str = Field(min_length=1, max_length=255)
    preview_text: str = Field(min_length=1, max_length=255)
    html: str = Field(min_length=100, max_length=100_000)


class GenerateResponse(DesignDraft):
    warnings: list[str] = Field(default_factory=list)
