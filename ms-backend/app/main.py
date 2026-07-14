from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import (
    auth,
    campaigns,
    contacts,
    events,
    internal,
    lead_webhook,
    lists,
    templates,
    webhooks,
)
from app.config import get_settings

settings = get_settings()
app = FastAPI(title=settings.app_name, version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=".*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for router in (
    auth.router,
    contacts.router,
    lists.router,
    templates.router,
    campaigns.router,
    webhooks.router,
    lead_webhook.router,
    events.router,
    internal.router,
):
    app.include_router(router)


@app.get("/health", tags=["health"])
async def health() -> dict[str, str]:
    return {"status": "ok"}
