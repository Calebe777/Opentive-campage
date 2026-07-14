import os
import uuid

os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://user:pass@localhost/test")
os.environ.setdefault("INTERNAL_API_KEY", "test-internal-key")
os.environ.setdefault("SMTP_HOST", "localhost")

from app.rendering import render_email
from app.security import create_tracking_token, verify_tracking_token


def test_tracking_token_round_trip() -> None:
    send_id = uuid.uuid4()
    assert verify_tracking_token(create_tracking_token(send_id)) == send_id


def test_render_email_injects_tracking_and_variables() -> None:
    token = create_tracking_token(uuid.uuid4())
    result = render_email(
        '<html><body>Olá {{ nome }} <a href="https://example.com/x">Ir</a> {{unsubscribe_url}}</body></html>',
        {"nome": "João"},
        "https://mail.example.com",
        token,
    )
    assert "Olá João" in result
    assert "/track/click/" in result
    assert "/track/open/" in result
    assert "/unsubscribe/" in result
