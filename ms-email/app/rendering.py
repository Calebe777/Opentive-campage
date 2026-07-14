import html
import re
from urllib.parse import quote

from jinja2 import BaseLoader, Environment, StrictUndefined, select_autoescape

TRACKABLE_LINK = re.compile(r'href=["\'](https?://[^"\']+)["\']', re.IGNORECASE)


def render_email(
    template: str,
    variables: dict,
    tracking_base_url: str,
    token: str,
) -> str:
    environment = Environment(
        loader=BaseLoader(),
        autoescape=select_autoescape(default=True),
        undefined=StrictUndefined,
    )
    unsubscribe = f"{tracking_base_url}/unsubscribe/{token}"
    render_vars = {**variables, "unsubscribe_url": unsubscribe}
    rendered = environment.from_string(template).render(**render_vars)

    def tracked(match: re.Match) -> str:
        target = quote(html.unescape(match.group(1)), safe="")
        return f'href="{tracking_base_url}/track/click/{token}?url={target}"'

    rendered = TRACKABLE_LINK.sub(tracked, rendered)
    pixel = (
        f'<img src="{tracking_base_url}/track/open/{token}.gif" '
        'width="1" height="1" alt="" style="display:none">'
    )
    return rendered.replace("</body>", f"{pixel}</body>") if "</body>" in rendered else rendered + pixel
