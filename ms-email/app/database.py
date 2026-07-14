import uuid
from datetime import datetime

from sqlalchemy import DateTime, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

from app.config import get_settings


class Base(DeclarativeBase):
    pass


class OutboxJob(Base):
    __tablename__ = "outbox_jobs"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    topic: Mapped[str] = mapped_column(String(100))
    payload: Mapped[dict] = mapped_column(JSONB)
    attempts: Mapped[int] = mapped_column(Integer)
    processed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


engine = create_async_engine(get_settings().database_url, pool_pre_ping=True)
SessionFactory = async_sessionmaker(engine, expire_on_commit=False)
