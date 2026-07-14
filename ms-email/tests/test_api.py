import os

os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://user:pass@localhost/test")
os.environ.setdefault("INTERNAL_API_KEY", "test-internal-key")
os.environ.setdefault("SMTP_HOST", "localhost")

from fastapi.testclient import TestClient

from app.main import app


def test_health() -> None:
    response = TestClient(app).get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_invalid_tracking_token_is_hidden() -> None:
    assert TestClient(app).get("/track/open/invalid.gif").status_code == 404


def test_click_rejects_unsafe_scheme() -> None:
    assert TestClient(app).get(
        "/track/click/invalid", params={"url": "javascript:alert(1)"}
    ).status_code == 404
