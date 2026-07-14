import os

os.environ.setdefault("JWT_SECRET", "test-secret-that-is-at-least-32-characters")
os.environ.setdefault("INTERNAL_API_KEY", "test-internal-key")
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://user:pass@localhost/test")

from fastapi.testclient import TestClient

from app.main import app
from app.security import create_token, decode_token, hash_password, verify_password


def test_health() -> None:
    response = TestClient(app).get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_password_hashing() -> None:
    hashed = hash_password("correct horse battery staple")
    assert hashed != "correct horse battery staple"
    assert verify_password("correct horse battery staple", hashed)
    assert not verify_password("wrong password", hashed)


def test_access_token_round_trip() -> None:
    token = create_token("5df4543d-4d78-4b44-992a-6ee807aedb4c", "access")
    assert decode_token(token, "access") == "5df4543d-4d78-4b44-992a-6ee807aedb4c"
