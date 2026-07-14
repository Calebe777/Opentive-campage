from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import verify_internal_key
from app.models import Campaign, CampaignSend, CampaignStatus, Event
from app.schemas import EventCreate

router = APIRouter(
    prefix="/events",
    tags=["internal events"],
    dependencies=[Depends(verify_internal_key)],
)

STATUS_RANK = {"queued": 0, "sent": 1, "delivered": 2, "failed": 3}


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_event(payload: EventCreate, db: AsyncSession = Depends(get_db)):
    existing = await db.scalar(
        select(Event).where(Event.provider_event_id == payload.provider_event_id)
    )
    if existing:
        return {"event_id": existing.id, "duplicate": True}

    send = await db.get(CampaignSend, payload.send_id)
    if send is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "send not found")
    target_status = {
        "sent": "sent",
        "delivered": "delivered",
        "failed": "failed",
        "bounce": "failed",
    }.get(payload.event_type)
    if target_status and STATUS_RANK[target_status] >= STATUS_RANK.get(send.status, 0):
        send.status = target_status
        send.provider_id = payload.provider_id or send.provider_id
        send.error = payload.error
        if target_status in {"sent", "delivered"} and send.sent_at is None:
            send.sent_at = datetime.now(UTC)

    event = Event(
        provider_event_id=payload.provider_event_id,
        send_id=send.id,
        campaign_id=send.campaign_id,
        contact_id=send.contact_id,
        event_type=payload.event_type,
        url=payload.url,
    )
    db.add(event)
    await db.flush()

    unfinished = await db.scalar(
        select(func.count())
        .select_from(CampaignSend)
        .where(
            CampaignSend.campaign_id == send.campaign_id,
            CampaignSend.status == "queued",
        )
    )
    if unfinished == 0:
        campaign = await db.get(Campaign, send.campaign_id)
        failures = await db.scalar(
            select(func.count())
            .select_from(CampaignSend)
            .where(
                CampaignSend.campaign_id == send.campaign_id,
                CampaignSend.status == "failed",
            )
        )
        campaign.status = CampaignStatus.failed if failures else CampaignStatus.sent
        campaign.sent_at = datetime.now(UTC)

    await db.commit()
    return {"event_id": event.id, "duplicate": False}
