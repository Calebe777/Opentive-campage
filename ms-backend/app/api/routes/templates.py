import bleach
import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db
from app.dependencies import current_user
from app.models import Template, User
from app.schemas import AIGenerate, TemplateCreate, TemplateOut

router = APIRouter(prefix="/templates", tags=["templates"])


def sanitize_html(value: str) -> str:
    return bleach.clean(value, tags=bleach.sanitizer.ALLOWED_TAGS | {"html", "body", "table", "tbody", "tr", "td", "th", "div", "span", "p", "img", "h1", "h2", "h3", "style"}, attributes={"*": ["style", "class", "id"], "a": ["href", "title"], "img": ["src", "alt", "width", "height"]}, protocols={"http", "https", "mailto", "cid"}, strip=True)


@router.get("", response_model=list[TemplateOut])
async def list_templates(user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    return (await db.scalars(select(Template).where(Template.user_id == user.id))).all()


@router.post("", response_model=TemplateOut, status_code=status.HTTP_201_CREATED)
async def create_template(payload: TemplateCreate, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    item = Template(user_id=user.id, **payload.model_dump(exclude={"html_content"}), html_content=sanitize_html(payload.html_content))
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


@router.post("/ai-generate", response_model=TemplateOut, status_code=status.HTTP_201_CREATED)
async def ai_generate(payload: AIGenerate, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    try:
        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.post(f"{get_settings().ai_service_url}/generate", json=payload.model_dump(exclude={"name"}))
            response.raise_for_status()
            generated = response.json()
        item = Template(user_id=user.id, name=payload.name, subject=generated["subject"], preview_text=generated.get("preview_text"), html_content=sanitize_html(generated["html"]), source="ai", ai_briefing=payload.briefing)
    except (httpx.HTTPError, KeyError, ValueError) as exc:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "AI service failed") from exc
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item
