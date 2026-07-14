import uuid

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import current_user
from app.models import Contact, User
from app.schemas import ContactCreate, ContactOut, ContactUpdate

router = APIRouter(prefix="/contacts", tags=["contacts"])


async def owned_contact(contact_id: uuid.UUID, user: User, db: AsyncSession) -> Contact:
    contact = await db.scalar(select(Contact).where(Contact.id == contact_id, Contact.user_id == user.id))
    if contact is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "contact not found")
    return contact


@router.get("", response_model=list[ContactOut])
async def list_contacts(user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    return (await db.scalars(select(Contact).where(Contact.user_id == user.id).order_by(Contact.created_at.desc()))).all()


@router.post("", response_model=ContactOut, status_code=status.HTTP_201_CREATED)
async def create_contact(payload: ContactCreate, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    if await db.scalar(select(Contact).where(Contact.user_id == user.id, Contact.email == payload.email)):
        raise HTTPException(status.HTTP_409_CONFLICT, "contact already exists")
    contact = Contact(user_id=user.id, **payload.model_dump())
    db.add(contact)
    await db.commit()
    await db.refresh(contact)
    return contact


@router.patch("/{contact_id}", response_model=ContactOut)
async def update_contact(contact_id: uuid.UUID, payload: ContactUpdate, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    contact = await owned_contact(contact_id, user, db)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(contact, field, value)
    await db.commit()
    await db.refresh(contact)
    return contact


@router.delete("/{contact_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_contact(contact_id: uuid.UUID, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    await db.delete(await owned_contact(contact_id, user, db))
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
