import os

os.environ.setdefault("OPENAI_API_KEY", "test-key")
os.environ.setdefault("INTERNAL_API_KEY", "test-internal-key")

from fastapi.testclient import TestClient

from app.main import app, get_pipeline
from app.schemas import DesignDraft, GenerateRequest


class FakePipeline:
    async def generate(self, request: GenerateRequest) -> DesignDraft:
        return DesignDraft(
            subject=f"Oferta para {request.audience}",
            preview_text="Confira nossa oferta",
            html="<html><body><table><tr><td><a href='https://example.com'>Comprar</a></td></tr></table>{{unsubscribe_url}}</body></html>",
        )


def test_health() -> None:
    assert TestClient(app).get("/health").json() == {"status": "ok"}


def test_generate_requires_internal_key() -> None:
    response = TestClient(app).post("/generate", json={"briefing": "Promoção"})
    assert response.status_code == 422


def test_generate_rejects_invalid_internal_key() -> None:
    response = TestClient(app).post(
        "/generate",
        headers={"X-Internal-API-Key": "wrong-internal-key"},
        json={"briefing": "Promoção"},
    )
    assert response.status_code == 401


def test_generate_rejects_blank_briefing() -> None:
    response = TestClient(app).post(
        "/generate",
        headers={"X-Internal-API-Key": "test-internal-key"},
        json={"briefing": "   "},
    )
    assert response.status_code == 422


def test_generate_contract() -> None:
    app.dependency_overrides[get_pipeline] = lambda: FakePipeline()
    try:
        response = TestClient(app).post(
            "/generate",
            headers={"X-Internal-API-Key": "test-internal-key"},
            json={"briefing": "Promoção de cursos", "audience": "desenvolvedores"},
        )
    finally:
        app.dependency_overrides.clear()
    assert response.status_code == 200
    assert response.json()["subject"] == "Oferta para desenvolvedores"
    assert "<script" not in response.json()["html"]
