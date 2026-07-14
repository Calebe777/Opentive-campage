from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import current_user
from app.models import List, User, Webhook
from app.schemas import WebhookCreate, WebhookOut

router = APIRouter(prefix="/webhooks", tags=["webhooks"])


@router.get("", response_model=list[WebhookOut])
async def list_webhooks(user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    return (await db.scalars(select(Webhook).where(Webhook.user_id == user.id))).all()


@router.post("", response_model=WebhookOut, status_code=status.HTTP_201_CREATED)
async def create_webhook(payload: WebhookCreate, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    if payload.target_list:
        target = await db.scalar(select(List).where(List.id == payload.target_list, List.user_id == user.id))
        if target is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "target list not found")
    import secrets
    item = Webhook(user_id=user.id, token=f"wh_{secrets.token_urlsafe(30)}", **payload.model_dump())
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item
