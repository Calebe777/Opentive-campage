import uuid

from fastapi import APIRouter, Depends, HTTPException, Response, status, File, UploadFile, Form
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import csv
import io

from app.database import get_db
from app.dependencies import current_user
from app.models import Contact, User, ListContact, List
from app.schemas import ContactCreate, ContactOut, ContactUpdate, BulkAddToList, BulkDeleteContacts

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


@router.post("/import", status_code=status.HTTP_200_OK)
async def import_contacts_csv(
    file: UploadFile = File(...),
    email_column: str = Form(...),
    name_column: str | None = Form(None),
    phone_column: str | None = Form(None),
    source: str | None = Form(None),
    list_id: str | None = Form(None),
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    contents = await file.read()
    try:
        try:
            decoded = contents.decode("utf-8")
        except UnicodeDecodeError:
            decoded = contents.decode("latin-1")

        csv_file = io.StringIO(decoded)
        sample = decoded[:1024]
        delimiter = ";" if ";" in sample and (sample.count(";") > sample.count(",")) else ","

        reader = csv.DictReader(csv_file, delimiter=delimiter)

        email_col = email_column.strip()
        name_col = name_column.strip() if (name_column and name_column.strip()) else None
        phone_col = phone_column.strip() if (phone_column and phone_column.strip()) else None

        imported_count = 0
        skipped_count = 0
        errors = []

        target_source = source.strip() if (source and source.strip()) else "CSV Import"

        parsed_list_id = None
        if list_id and list_id.strip():
            try:
                parsed_list_id = uuid.UUID(list_id.strip())
            except ValueError:
                pass

        for row in reader:
            email = row.get(email_col, "").strip() if email_col and row.get(email_col) else ""
            if not email or "@" not in email:
                skipped_count += 1
                continue

            name = row.get(name_col, "").strip() if name_col and row.get(name_col) else None
            phone = row.get(phone_col, "").strip() if phone_col and row.get(phone_col) else None

            custom_fields = {}
            for k, v in row.items():
                if k and k.strip() not in (email_col, name_col, phone_col):
                    custom_fields[k.strip()] = v.strip() if v else ""

            # Check if contact already exists
            contact = await db.scalar(select(Contact).where(Contact.user_id == user.id, Contact.email == email))
            if contact:
                if name:
                    contact.name = name
                if phone:
                    contact.phone = phone
                if custom_fields:
                    contact.custom_fields = {**contact.custom_fields, **custom_fields}
                contact.source = target_source
            else:
                contact = Contact(
                    user_id=user.id,
                    email=email,
                    name=name,
                    phone=phone,
                    source=target_source,
                    custom_fields=custom_fields,
                )
                db.add(contact)
                await db.flush()

            if parsed_list_id:
                already_in_list = await db.scalar(
                    select(ListContact).where(ListContact.list_id == parsed_list_id, ListContact.contact_id == contact.id)
                )
                if not already_in_list:
                    db.add(ListContact(list_id=parsed_list_id, contact_id=contact.id))

            imported_count += 1

        await db.commit()
        return {"imported": imported_count, "skipped": skipped_count, "errors": errors}

    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Erro ao processar o arquivo CSV: {str(e)}")


@router.post("/bulk-add-to-list", status_code=status.HTTP_204_NO_CONTENT)
async def bulk_add_to_list(
    payload: BulkAddToList,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    list_exists = await db.scalar(select(List.id).where(List.id == payload.list_id, List.user_id == user.id))
    if list_exists is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Lista não encontrada.")

    # Get valid contact IDs belonging to user
    stmt = select(Contact.id).where(Contact.id.in_(payload.contact_ids), Contact.user_id == user.id)
    valid_contact_ids = (await db.scalars(stmt)).all()

    for cid in valid_contact_ids:
        already_in_list = await db.scalar(
            select(ListContact).where(ListContact.list_id == payload.list_id, ListContact.contact_id == cid)
        )
        if not already_in_list:
            db.add(ListContact(list_id=payload.list_id, contact_id=cid))
    
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/bulk-delete", status_code=status.HTTP_204_NO_CONTENT)
async def bulk_delete_contacts(
    payload: BulkDeleteContacts,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import delete
    stmt = delete(Contact).where(Contact.id.in_(payload.contact_ids), Contact.user_id == user.id)
    await db.execute(stmt)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
