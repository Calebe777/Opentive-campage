from fastapi import FastAPI

from app.api.routes import auth, campaigns, contacts, events, lead_webhook, lists, templates, webhooks
from app.config import get_settings

settings = get_settings()
app = FastAPI(title=settings.app_name, version="0.1.0")

for router in (
    auth.router,
    contacts.router,
    lists.router,
    templates.router,
    campaigns.router,
    webhooks.router,
    lead_webhook.router,
    events.router,
):
    app.include_router(router)


@app.get("/health", tags=["health"])
async def health() -> dict[str, str]:
    return {"status": "ok"}
