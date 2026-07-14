from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import verify_internal_key
from app.models import CampaignSend, Event
from app.schemas import EventCreate

router = APIRouter(prefix="/events", tags=["internal events"], dependencies=[Depends(verify_internal_key)])


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_event(payload: EventCreate, db: AsyncSession = Depends(get_db)):
    send = await db.get(CampaignSend, payload.send_id)
    if send is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "send not found")
    if payload.event_type in {"sent", "delivered", "failed", "bounce"}:
        send.status = "failed" if payload.event_type in {"failed", "bounce"} else payload.event_type
        send.provider_id = payload.provider_id or send.provider_id
        send.error = payload.error
    event = Event(send_id=send.id, campaign_id=send.campaign_id, contact_id=send.contact_id, event_type=payload.event_type, url=payload.url)
    db.add(event)
    await db.commit()
    return {"event_id": event.id}
