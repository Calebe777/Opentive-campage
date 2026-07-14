import uuid

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import current_user
from app.models import Contact, List, ListContact, User
from app.schemas import ListContactAdd, ListCreate, ListOut

router = APIRouter(prefix="/lists", tags=["lists"])


async def owned_list(list_id: uuid.UUID, user: User, db: AsyncSession) -> List:
    item = await db.scalar(select(List).where(List.id == list_id, List.user_id == user.id))
    if item is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "list not found")
    return item


@router.get("", response_model=list[ListOut])
async def list_lists(user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    return (await db.scalars(select(List).where(List.user_id == user.id).order_by(List.created_at.desc()))).all()


@router.post("", response_model=ListOut, status_code=status.HTTP_201_CREATED)
async def create_list(payload: ListCreate, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    item = List(user_id=user.id, **payload.model_dump())
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


@router.post("/{list_id}/contacts", status_code=status.HTTP_204_NO_CONTENT)
async def add_contact(list_id: uuid.UUID, payload: ListContactAdd, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    await owned_list(list_id, user, db)
    contact = await db.scalar(select(Contact).where(Contact.id == payload.contact_id, Contact.user_id == user.id))
    if contact is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "contact not found")
    existing = await db.get(ListContact, (list_id, payload.contact_id))
    if existing is None:
        db.add(ListContact(list_id=list_id, contact_id=payload.contact_id))
        await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.delete("/{list_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_list(list_id: uuid.UUID, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    await db.delete(await owned_list(list_id, user, db))
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
