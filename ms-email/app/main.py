import uuid

import httpx
from fastapi import FastAPI, HTTPException, Query, status
from fastapi.responses import RedirectResponse, Response

from app.config import get_settings
from app.security import verify_tracking_token

app = FastAPI(title="Email Marketing Sender", version="0.1.0")
PIXEL = bytes.fromhex("47494638396101000100800000ffffff00000021f90401000000002c00000000010001000002024401003b")


async def report_event(send_id: uuid.UUID, event_type: str, url: str | None = None) -> None:
    settings = get_settings()
    payload = {
        "provider_event_id": f"track:{event_type}:{send_id}:{uuid.uuid4()}",
        "send_id": str(send_id),
        "event_type": event_type,
        "url": url,
    }
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.post(
            f"{settings.backend_url}/events",
            json=payload,
            headers={"X-Internal-API-Key": settings.internal_api_key},
        )
        response.raise_for_status()


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/track/open/{token}.gif")
async def track_open(token: str) -> Response:
    try:
        send_id = verify_tracking_token(token)
    except ValueError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "not found") from None
    try:
        await report_event(send_id, "open")
    except httpx.HTTPError:
        pass
    return Response(PIXEL, media_type="image/gif", headers={"Cache-Control": "no-store"})


@app.get("/track/click/{token}")
async def track_click(token: str, url: str = Query()) -> RedirectResponse:
    try:
        send_id = verify_tracking_token(token)
    except ValueError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "not found") from None
    if not url.startswith(("https://", "http://")):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "invalid redirect URL")
    try:
        await report_event(send_id, "click", url)
    except httpx.HTTPError:
        pass
    return RedirectResponse(url, status_code=status.HTTP_302_FOUND)


@app.get("/unsubscribe/{token}")
async def unsubscribe(token: str) -> dict[str, str]:
    try:
        send_id = verify_tracking_token(token)
    except ValueError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "not found") from None
    settings = get_settings()
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.post(
            f"{settings.backend_url}/internal/sends/{send_id}/unsubscribe",
            headers={"X-Internal-API-Key": settings.internal_api_key},
        )
        if response.status_code == 404:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "send not found")
        response.raise_for_status()
        await report_event(send_id, "unsub")
    return {"status": "unsubscribed"}
