import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models import CampaignStatus, ContactStatus


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class UserCreate(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    email: EmailStr
    password: str = Field(min_length=10, max_length=128)


class UserOut(ORMModel):
    id: uuid.UUID
    name: str
    email: EmailStr


class Login(BaseModel):
    email: EmailStr
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class ContactCreate(BaseModel):
    name: str | None = Field(None, max_length=150)
    email: EmailStr
    phone: str | None = Field(None, max_length=30)
    source: str | None = Field(None, max_length=100)
    custom_fields: dict[str, Any] = Field(default_factory=dict)


class ContactUpdate(BaseModel):
    name: str | None = Field(None, max_length=150)
    phone: str | None = Field(None, max_length=30)
    status: ContactStatus | None = None
    custom_fields: dict[str, Any] | None = None


class ContactOut(ContactCreate, ORMModel):
    id: uuid.UUID
    status: ContactStatus
    created_at: datetime


class ListCreate(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    description: str | None = None


class ListOut(ListCreate, ORMModel):
    id: uuid.UUID
    created_at: datetime


class ListContactAdd(BaseModel):
    contact_id: uuid.UUID


class TemplateCreate(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    subject: str | None = Field(None, max_length=255)
    preview_text: str | None = Field(None, max_length=255)
    html_content: str = Field(min_length=1)


class TemplateOut(TemplateCreate, ORMModel):
    id: uuid.UUID
    source: str
    ai_briefing: str | None
    created_at: datetime


class AIGenerate(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    briefing: str = Field(min_length=1)
    tone: str | None = None
    audience: str | None = None
    cta: str | None = None


class CampaignCreate(BaseModel):
    template_id: uuid.UUID
    list_id: uuid.UUID
    name: str = Field(min_length=1, max_length=150)
    subject: str = Field(min_length=1, max_length=255)
    from_name: str | None = Field(None, max_length=150)
    from_email: EmailStr
    scheduled_at: datetime | None = None


class CampaignOut(CampaignCreate, ORMModel):
    id: uuid.UUID
    status: CampaignStatus
    created_at: datetime


class EventCreate(BaseModel):
    send_id: uuid.UUID
    event_type: str = Field(pattern="^(sent|delivered|failed|open|click|bounce|complaint|unsub)$")
    provider_id: str | None = Field(None, max_length=255)
    error: str | None = None
    url: str | None = None


class WebhookCreate(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    target_list: uuid.UUID | None = None
    secret: str | None = Field(None, min_length=16, max_length=128)


class WebhookOut(ORMModel):
    id: uuid.UUID
    name: str
    token: str
    target_list: uuid.UUID | None
    is_active: bool
    total_leads: int
    created_at: datetime


class LeadPayload(ContactCreate):
    pass
