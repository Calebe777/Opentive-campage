import hashlib
import hmac
import json
import time

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from redis.asyncio import Redis
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db
from app.models import Contact, ListContact, Webhook, WebhookLog
from app.schemas import LeadPayload

router = APIRouter(prefix="/webhook", tags=["lead webhook"])


@router.post("/leads/{token}", status_code=status.HTTP_201_CREATED)
async def capture_lead(token: str, request: Request, x_webhook_signature: str | None = Header(None), db: AsyncSession = Depends(get_db)):
    webhook = await db.scalar(select(Webhook).where(Webhook.token == token, Webhook.is_active.is_(True)))
    if webhook is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "webhook not found")
    settings = get_settings()
    redis = Redis.from_url(settings.redis_url, decode_responses=True)
    try:
        bucket = int(time.time() // 60)
        key = f"webhook-rate:{webhook.id}:{bucket}"
        count = await redis.incr(key)
        if count == 1:
            await redis.expire(key, 60)
        if count > settings.webhook_rate_limit_per_minute:
            raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "rate limit exceeded")
    finally:
        await redis.aclose()
    raw = await request.body()
    if webhook.secret:
        expected = hmac.new(webhook.secret.encode(), raw, hashlib.sha256).hexdigest()
        if not x_webhook_signature or not hmac.compare_digest(expected, x_webhook_signature.removeprefix("sha256=")):
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "invalid webhook signature")
    try:
        payload = LeadPayload.model_validate(json.loads(raw))
    except (ValueError, json.JSONDecodeError) as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "invalid lead payload") from exc
    statement = insert(Contact).values(user_id=webhook.user_id, **payload.model_dump(mode="json"))
    statement = statement.on_conflict_do_update(
        index_elements=[Contact.user_id, Contact.email],
        set_={"name": statement.excluded.name, "phone": statement.excluded.phone, "source": statement.excluded.source, "custom_fields": statement.excluded.custom_fields},
    ).returning(Contact.id)
    contact_id = await db.scalar(statement)
    if webhook.target_list:
        await db.execute(insert(ListContact).values(list_id=webhook.target_list, contact_id=contact_id).on_conflict_do_nothing())
    webhook.total_leads += 1
    db.add(WebhookLog(webhook_id=webhook.id, payload=payload.model_dump(mode="json"), status_code=201))
    await db.commit()
    return {"contact_id": contact_id, "created": True}
