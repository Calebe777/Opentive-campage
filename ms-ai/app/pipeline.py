from app.html_validation import review_html, sanitize_email_html
from app.llm import LLMClient, request_json
from app.schemas import CopyDraft, DesignDraft, GenerateRequest, GenerateResponse

COPYWRITER_PROMPT = """Você é um copywriter brasileiro especialista em e-mail marketing.
Crie copy clara, persuasiva e verdadeira. Não invente preço, desconto, prazo, depoimento ou
característica ausente no briefing. Evite linguagem enganosa, excesso de caixa alta e gatilhos de
spam. Preserve variáveis no formato {{nome}}. Retorne somente a estrutura solicitada."""

DESIGNER_PROMPT = """Você é um designer de e-mails transacionais e de marketing.
Converta a copy em um documento HTML completo, responsivo e compatível com Gmail, Outlook e
Apple Mail. Use tabelas para layout, largura máxima de 600px e CSS inline. Não use JavaScript,
formulários, iframe, SVG, vídeo ou recursos externos além de imagens HTTPS. Inclua preheader
oculto, CTA visível e rodapé com link {{unsubscribe_url}}. Retorne somente a estrutura solicitada."""

REVIEWER_PROMPT = """Você revisa e-mails para compatibilidade e entregabilidade.
Corrija somente problemas concretos no HTML fornecido. Mantenha o sentido da copy e as variáveis.
Exija layout em tabelas, CSS inline, URL HTTPS ou mailto, alt em imagens, CTA e o link
{{unsubscribe_url}}. Não adicione fatos comerciais. Retorne o HTML final e os mesmos assunto e
preview_text, salvo ajuste necessário de tamanho."""


class TemplatePipeline:
    def __init__(self, llm: LLMClient | None = None) -> None:
        self.llm = llm or LLMClient()

    async def generate(self, request: GenerateRequest) -> GenerateResponse:
        copy = await self.llm.structured(
            COPYWRITER_PROMPT,
            f"Briefing e preferências:\n{request_json(request)}",
            CopyDraft,
        )
        design = await self.llm.structured(
            DESIGNER_PROMPT,
            f"Copy aprovada:\n{request_json(copy)}",
            DesignDraft,
        )
        reviewed = await self.llm.structured(
            REVIEWER_PROMPT,
            f"Template para revisão:\n{request_json(design)}",
            DesignDraft,
        )
        html = sanitize_email_html(reviewed.html)
        return GenerateResponse(
            subject=reviewed.subject,
            preview_text=reviewed.preview_text,
            html=html,
            warnings=review_html(html),
        )
