import asyncio
import json
import uuid
from contextlib import suppress

import httpx
from redis.asyncio import Redis
from sqlalchemy import select

from app.config import get_settings
from app.database import OutboxJob, SessionFactory
from app.mailer import send_email
from app.rendering import render_email
from app.security import create_tracking_token


async def publish_outbox(redis: Redis) -> None:
    async with SessionFactory() as db, db.begin():
        jobs = (
            await db.scalars(
                select(OutboxJob)
                .where(OutboxJob.processed_at.is_(None), OutboxJob.topic == "email:send")
                .order_by(OutboxJob.created_at)
                .with_for_update(skip_locked=True)
                .limit(100)
            )
        ).all()
        for job in jobs:
            await redis.rpush(job.topic, json.dumps(job.payload))
            job.processed_at = __import__("datetime").datetime.now(__import__("datetime").UTC)


async def callback(client: httpx.AsyncClient, payload: dict) -> None:
    settings = get_settings()
    response = await client.post(
        f"{settings.backend_url}/events",
        json=payload,
        headers={"X-Internal-API-Key": settings.internal_api_key},
    )
    response.raise_for_status()


async def process_job(client: httpx.AsyncClient, payload: dict) -> None:
    settings = get_settings()
    send_id = uuid.UUID(payload["send_id"])
    claim = await client.post(
        f"{settings.backend_url}/internal/sends/{send_id}/claim",
        headers={"X-Internal-API-Key": settings.internal_api_key},
    )
    if claim.status_code == 409:
        return
    claim.raise_for_status()
    data = claim.json()
    token = create_tracking_token(send_id)
    rendered = render_email(data["html"], data["variables"], settings.public_base_url, token)
    try:
        provider_id = await send_email(
            to_email=data["to_email"],
            subject=data["subject"],
            html=rendered,
            from_email=data["from_email"],
            from_name=data.get("from_name"),
        )
    except Exception as exc:
        print(f"!!! JOB PROCESS FAILED: {exc}", flush=True)
        import traceback
        traceback.print_exc()
        await callback(
            client,
            {
                "provider_event_id": f"worker-failed:{send_id}:{uuid.uuid4()}",
                "send_id": str(send_id),
                "event_type": "failed",
                "error": str(exc)[:2000],
            },
        )
        return
    
    print(f"✅ E-mail enviado com sucesso para: {data['to_email']}", flush=True)
    
    await callback(
        client,
        {
            "provider_event_id": f"worker-sent:{send_id}",
            "send_id": str(send_id),
            "event_type": "sent",
            "provider_id": provider_id,
        },
    )


async def run() -> None:
    settings = get_settings()
    redis = Redis.from_url(settings.redis_url, decode_responses=True)
    headers = {"X-Internal-API-Key": settings.internal_api_key}
    async with httpx.AsyncClient(timeout=30, headers=headers) as client:
        try:
            while True:
                await publish_outbox(redis)
                item = await redis.blpop("email:send", timeout=max(1, int(settings.worker_poll_seconds)))
                if item:
                    with suppress(json.JSONDecodeError, KeyError, ValueError):
                        await process_job(client, json.loads(item[1]))
        finally:
            await redis.aclose()


if __name__ == "__main__":
    asyncio.run(run())
