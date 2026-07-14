import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import verify_internal_key
from app.models import Campaign, CampaignSend, Contact, Template

router = APIRouter(
    prefix="/internal",
    tags=["internal"],
    dependencies=[Depends(verify_internal_key)],
)


@router.post("/sends/{send_id}/claim")
async def claim_send(send_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    claimed = await db.scalar(
        update(CampaignSend)
        .where(CampaignSend.id == send_id, CampaignSend.status == "queued")
        .values(status="processing")
        .returning(CampaignSend.id)
    )
    if claimed is None:
        exists = await db.scalar(select(CampaignSend.id).where(CampaignSend.id == send_id))
        if exists is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "send not found")
        raise HTTPException(status.HTTP_409_CONFLICT, "send already claimed")
    await db.commit()

    row = (
        await db.execute(
            select(CampaignSend, Campaign, Contact, Template)
            .join(Campaign, Campaign.id == CampaignSend.campaign_id)
            .join(Contact, Contact.id == CampaignSend.contact_id)
            .join(Template, Template.id == Campaign.template_id)
            .where(CampaignSend.id == send_id)
        )
    ).one_or_none()
    if row is None:
        await db.execute(
            update(CampaignSend)
            .where(CampaignSend.id == send_id)
            .values(status="failed", error="send data no longer exists")
        )
        await db.commit()
        raise HTTPException(status.HTTP_409_CONFLICT, "send data no longer exists")
    send, campaign, contact, template = row
    return {
        "send_id": send.id,
        "campaign_id": campaign.id,
        "contact_id": contact.id,
        "to_email": contact.email,
        "subject": campaign.subject,
        "from_name": campaign.from_name,
        "from_email": campaign.from_email,
        "html": template.html_content,
        "variables": {
            "nome": contact.name or "",
            "name": contact.name or "",
            "email": contact.email,
            **contact.custom_fields,
        },
    }


@router.post("/sends/{send_id}/unsubscribe")
async def unsubscribe(send_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    contact = await db.scalar(
        select(Contact)
        .join(CampaignSend, CampaignSend.contact_id == Contact.id)
        .where(CampaignSend.id == send_id)
    )
    if contact is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "send not found")
    contact.status = "unsubscribed"
    await db.commit()
    return {"status": "unsubscribed"}
