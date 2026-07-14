import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import current_user
from app.models import (
    Campaign,
    CampaignSend,
    CampaignStatus,
    Contact,
    Event,
    List,
    ListContact,
    OutboxJob,
    Template,
    User,
)
from app.schemas import CampaignCreate, CampaignOut

router = APIRouter(prefix="/campaigns", tags=["campaigns"])


async def owned_campaign(campaign_id: uuid.UUID, user: User, db: AsyncSession) -> Campaign:
    campaign = await db.scalar(
        select(Campaign).where(Campaign.id == campaign_id, Campaign.user_id == user.id)
    )
    if campaign is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "campaign not found")
    return campaign


@router.get("", response_model=list[CampaignOut])
async def list_campaigns(
    user: User = Depends(current_user), db: AsyncSession = Depends(get_db)
):
    return (
        await db.scalars(select(Campaign).where(Campaign.user_id == user.id))
    ).all()


@router.post("", response_model=CampaignOut, status_code=status.HTTP_201_CREATED)
async def create_campaign(
    payload: CampaignCreate,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    template = await db.scalar(
        select(Template).where(Template.id == payload.template_id, Template.user_id == user.id)
    )
    target_list = await db.scalar(
        select(List).where(List.id == payload.list_id, List.user_id == user.id)
    )
    if template is None or target_list is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "template or list not found")
    campaign = Campaign(user_id=user.id, **payload.model_dump())
    if payload.scheduled_at and payload.scheduled_at > datetime.now(UTC):
        campaign.status = CampaignStatus.scheduled
    db.add(campaign)
    await db.commit()
    await db.refresh(campaign)
    return campaign


@router.post("/{campaign_id}/send", status_code=status.HTTP_202_ACCEPTED)
async def send_campaign(
    campaign_id: uuid.UUID,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    claimed_id = await db.scalar(
        update(Campaign)
        .where(
            Campaign.id == campaign_id,
            Campaign.user_id == user.id,
            Campaign.status.in_([CampaignStatus.draft, CampaignStatus.scheduled]),
        )
        .values(status=CampaignStatus.sending)
        .returning(Campaign.id)
    )
    if claimed_id is None:
        exists = await db.scalar(
            select(Campaign.id).where(Campaign.id == campaign_id, Campaign.user_id == user.id)
        )
        if exists is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "campaign not found")
        raise HTTPException(status.HTTP_409_CONFLICT, "campaign is already being processed")

    campaign = await db.get(Campaign, campaign_id)
    contacts = (
        await db.scalars(
            select(Contact)
            .join(ListContact, ListContact.contact_id == Contact.id)
            .where(
                ListContact.list_id == campaign.list_id,
                Contact.user_id == user.id,
                Contact.status == "active",
            )
        )
    ).all()
    if not contacts:
        campaign.status = CampaignStatus.sent
        campaign.sent_at = datetime.now(UTC)
        await db.commit()
        return {"queued": 0}

    for contact in contacts:
        send = CampaignSend(campaign_id=campaign.id, contact_id=contact.id)
        db.add(send)
        await db.flush()
        db.add(
            OutboxJob(
                topic="email:send",
                payload={
                    "send_id": str(send.id),
                    "campaign_id": str(campaign.id),
                    "contact_id": str(contact.id),
                },
            )
        )
    await db.commit()
    return {"queued": len(contacts)}


@router.get("/{campaign_id}/metrics")
async def metrics(
    campaign_id: uuid.UUID,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    await owned_campaign(campaign_id, user, db)
    sends = dict(
        (
            await db.execute(
                select(CampaignSend.status, func.count())
                .where(CampaignSend.campaign_id == campaign_id)
                .group_by(CampaignSend.status)
            )
        ).all()
    )
    events = dict(
        (
            await db.execute(
                select(Event.event_type, func.count())
                .where(Event.campaign_id == campaign_id)
                .group_by(Event.event_type)
            )
        ).all()
    )
    return {"sends": sends, "events": events}
