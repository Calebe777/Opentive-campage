from email.message import EmailMessage

import aiosmtplib

from app.config import get_settings


async def send_email(
    *,
    to_email: str,
    subject: str,
    html: str,
    from_email: str,
    from_name: str | None,
) -> str:
    settings = get_settings()
    message = EmailMessage()
    message["To"] = to_email
    message["From"] = f"{from_name} <{from_email}>" if from_name else from_email
    message["Subject"] = subject
    message.set_content("Este e-mail requer um cliente com suporte a HTML.")
    message.add_alternative(html, subtype="html")
    response = await aiosmtplib.send(
        message,
        hostname=settings.smtp_host,
        port=settings.smtp_port,
        username=settings.smtp_username if settings.smtp_username else None,
        password=settings.smtp_password if settings.smtp_password else None,
        start_tls=settings.smtp_use_tls,
        timeout=30,
    )
    return str(response[1])
