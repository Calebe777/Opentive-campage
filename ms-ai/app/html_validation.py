import bleach
from bleach.css_sanitizer import CSSSanitizer
from bs4 import BeautifulSoup

ALLOWED_TAGS = {
    "html", "head", "meta", "title", "body", "table", "tbody", "thead", "tfoot",
    "tr", "td", "th", "div", "span", "p", "a", "img", "h1", "h2", "h3", "br",
    "strong", "em", "ul", "ol", "li", "hr",
}
ALLOWED_ATTRIBUTES = {
    "*": ["style", "class", "id", "align", "valign", "role", "aria-label"],
    "table": ["width", "height", "border", "cellpadding", "cellspacing", "bgcolor"],
    "td": ["width", "height", "colspan", "rowspan", "bgcolor"],
    "a": ["href", "title", "target"],
    "img": ["src", "alt", "width", "height", "border"],
    "meta": ["name", "content", "charset", "http-equiv"],
}
CSS_SANITIZER = CSSSanitizer(
    allowed_css_properties={
        "background-color", "border", "border-collapse", "border-radius", "color",
        "display", "font-family", "font-size", "font-style", "font-weight", "height",
        "line-height", "margin", "margin-bottom", "margin-left", "margin-right", "margin-top",
        "max-width", "padding", "padding-bottom", "padding-left", "padding-right", "padding-top",
        "text-align", "text-decoration", "vertical-align", "width",
    }
)


def sanitize_email_html(html: str) -> str:
    return bleach.clean(
        html,
        tags=ALLOWED_TAGS,
        attributes=ALLOWED_ATTRIBUTES,
        protocols={"http", "https", "mailto", "cid"},
        css_sanitizer=CSS_SANITIZER,
        strip=True,
    )


def review_html(html: str) -> list[str]:
    soup = BeautifulSoup(html, "html.parser")
    warnings: list[str] = []
    if soup.find("script"):
        warnings.append("Scripts não são permitidos em e-mails.")
    if not soup.find("table"):
        warnings.append("O layout não usa tabelas, reduzindo a compatibilidade.")
    for image in soup.find_all("img"):
        if not image.get("alt"):
            warnings.append("Há imagem sem texto alternativo.")
            break
    if not soup.find("a", href=True):
        warnings.append("O template não contém link de chamada para ação.")
    lowered = soup.get_text(" ", strip=True).lower()
    if "{{unsubscribe_url}}" not in html and "descadastr" not in lowered:
        warnings.append("Link de descadastro ausente; o backend deve inseri-lo antes do envio.")
    return warnings
