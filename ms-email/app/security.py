import hashlib
import hmac
import uuid

from app.config import get_settings


def create_tracking_token(send_id: uuid.UUID) -> str:
    value = str(send_id)
    signature = hmac.new(
        get_settings().internal_api_key.encode(), value.encode(), hashlib.sha256
    ).hexdigest()
    return f"{value}.{signature}"


def verify_tracking_token(token: str) -> uuid.UUID:
    value, separator, signature = token.partition(".")
    expected = hmac.new(
        get_settings().internal_api_key.encode(), value.encode(), hashlib.sha256
    ).hexdigest()
    if not separator or not hmac.compare_digest(signature, expected):
        raise ValueError("invalid tracking token")
    return uuid.UUID(value)
