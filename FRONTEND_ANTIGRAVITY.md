# Prompt para o Antigravity — Frontend da Plataforma de E-mail Marketing

Crie o frontend completo de uma plataforma SaaS de e-mail marketing. O projeto deve ser criado em `ms-frontend` e consumir exclusivamente o backend FastAPI existente.

## 1. Stack obrigatória

- Next.js 14+ com App Router
- TypeScript em modo estrito
- React
- Tailwind CSS
- shadcn/ui
- React Hook Form + Zod
- TanStack Query para estado assíncrono
- Monaco Editor para edição de HTML
- Recharts para gráficos
- Ícones Lucide

Não implemente backend, banco de dados ou mocks permanentes. O backend real já existe.

## 2. Identidade visual

Crie uma interface SaaS moderna, limpa e profissional, em português do Brasil.

- Layout desktop com sidebar recolhível e header
- Responsivo para tablet e celular
- Tema claro e escuro
- Cores sóbrias com cor primária violeta ou índigo
- Cards com bordas discretas, pouco sombreado e boa hierarquia
- Estados completos: carregando, vazio, erro, sucesso e confirmação
- Toasts para feedback
- Acessibilidade: labels, foco visível, contraste e navegação por teclado
- Não use emojis na interface

## 3. Configuração da API

Use:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Crie um cliente HTTP centralizado que:

- envie `Authorization: Bearer <access_token>` nas rotas autenticadas;
- armazene access e refresh tokens de forma centralizada;
- ao receber 401, tente uma única renovação em `POST /auth/refresh`;
- repita a requisição original após renovar;
- encerre a sessão se a renovação falhar;
- normalize erros FastAPI, incluindo `detail` textual e erros 422;
- não envie `INTERNAL_API_KEY` pelo navegador.

## 4. Rotas da aplicação

### Públicas

- `/login`
- `/cadastro`

### Protegidas

- `/dashboard`
- `/contatos`
- `/listas`
- `/templates`
- `/templates/novo`
- `/campanhas`
- `/campanhas/nova`
- `/webhooks`
- `/configuracoes`

Redirecione usuários não autenticados para `/login`.

## 5. Autenticação

### Cadastro

`POST /auth/register`

```json
{
  "name": "Maria Silva",
  "email": "maria@empresa.com",
  "password": "senha-com-10-caracteres"
}
```

Resposta:

```json
{
  "id": "uuid",
  "name": "Maria Silva",
  "email": "maria@empresa.com"
}
```

Após cadastrar, direcione para login.

### Login

`POST /auth/login`

```json
{
  "email": "maria@empresa.com",
  "password": "senha"
}
```

Resposta:

```json
{
  "access_token": "jwt",
  "refresh_token": "jwt",
  "token_type": "bearer"
}
```

### Renovação

`POST /auth/refresh`

```json
{
  "refresh_token": "jwt"
}
```

## 6. Dashboard

Crie:

- cards: campanhas, contatos, enviados, aberturas, cliques e falhas;
- gráfico de desempenho;
- tabela de campanhas recentes;
- atalhos para nova campanha, novo contato e novo template;
- período selecionável: 7, 30 e 90 dias.

O backend ainda não possui um endpoint agregado de dashboard. Calcule os dados disponíveis usando campanhas e métricas. Exiba `—` quando um valor ainda não estiver disponível; não invente números.

## 7. Contatos

Endpoints:

- `GET /contacts`
- `POST /contacts`
- `PATCH /contacts/{contact_id}`
- `DELETE /contacts/{contact_id}`

Contato:

```ts
type Contact = {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  source: string | null;
  status: "active" | "unsubscribed" | "bounced";
  custom_fields: Record<string, unknown>;
  created_at: string;
};
```

Implemente:

- tabela com busca local, filtro por status e paginação local;
- modal para criar contato;
- edição de nome, telefone, status e campos personalizados;
- confirmação antes de excluir;
- badges de status;
- visualizador/editor JSON amigável para `custom_fields`.

Payload de criação:

```json
{
  "name": "João Silva",
  "email": "joao@empresa.com",
  "phone": "+5511999998888",
  "source": "manual",
  "custom_fields": { "cargo": "CTO" }
}
```

## 8. Listas

Endpoints:

- `GET /lists`
- `POST /lists`
- `POST /lists/{list_id}/contacts`
- `DELETE /lists/{list_id}`

Lista:

```ts
type ContactList = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
};
```

Implemente:

- grid de listas;
- criação de lista;
- associação de contato selecionando `contact_id`;
- exclusão com confirmação;
- busca e estados vazios.

Payload para associar contato:

```json
{ "contact_id": "uuid" }
```

O backend ainda não fornece contagem nem listagem dos membros por lista. Não invente essas informações; sinalize como indisponível ou omita.

## 9. Templates

Endpoints:

- `GET /templates`
- `POST /templates`
- `POST /templates/ai-generate`

Template:

```ts
type EmailTemplate = {
  id: string;
  name: string;
  subject: string | null;
  preview_text: string | null;
  html_content: string;
  source: "manual" | "ai";
  ai_briefing: string | null;
  created_at: string;
};
```

A tela `/templates/novo` deve ter duas abas.

### Aba HTML

- nome, assunto e preview text;
- Monaco Editor para HTML;
- preview ao lado em iframe com `sandbox`;
- alternância desktop/mobile;
- nunca renderizar HTML diretamente no DOM principal;
- salvar via `POST /templates`.

```json
{
  "name": "Black Friday",
  "subject": "Oferta especial",
  "preview_text": "Confira os descontos",
  "html_content": "<html>...</html>"
}
```

### Aba IA

Campos:

- nome;
- briefing;
- tom;
- público;
- CTA.

Enviar para `POST /templates/ai-generate`:

```json
{
  "name": "Black Friday IA",
  "briefing": "Promoção de cursos de programação",
  "tone": "empolgante",
  "audience": "desenvolvedores júnior",
  "cta": "Comprar agora"
}
```

A resposta já é o template salvo. Mostre carregamento detalhado durante a geração e depois abra o preview do resultado. Trate 502/503 com mensagem clara.

## 10. Campanhas

Endpoints:

- `GET /campaigns`
- `POST /campaigns`
- `POST /campaigns/{campaign_id}/send`
- `GET /campaigns/{campaign_id}/metrics`

Campanha:

```ts
type Campaign = {
  id: string;
  template_id: string | null;
  list_id: string | null;
  name: string;
  subject: string;
  from_name: string | null;
  from_email: string | null;
  scheduled_at: string | null;
  status: "draft" | "scheduled" | "sending" | "sent" | "failed";
  sent_at: string | null;
  created_at: string;
};
```

Criação:

```json
{
  "template_id": "uuid",
  "list_id": "uuid",
  "name": "Campanha de Julho",
  "subject": "Novidades para você",
  "from_name": "Minha Empresa",
  "from_email": "contato@empresa.com",
  "scheduled_at": null
}
```

Implemente:

- tabela com filtros de status;
- wizard para criar campanha: dados → template → lista → remetente/agendamento → revisão;
- confirmação forte antes do disparo;
- botão disparar apenas para `draft` ou `scheduled`;
- resultado do disparo mostra `{ queued: number }`;
- página ou drawer de métricas.

Métricas retornadas:

```json
{
  "sends": {
    "queued": 10,
    "processing": 2,
    "sent": 80,
    "delivered": 75,
    "failed": 5
  },
  "events": {
    "open": 45,
    "click": 12,
    "bounce": 3,
    "complaint": 0,
    "unsub": 2
  }
}
```

Derive taxas no frontend usando denominadores seguros. Evite divisão por zero.

## 11. Webhooks

Endpoints:

- `GET /webhooks`
- `POST /webhooks`

Webhook:

```ts
type LeadWebhook = {
  id: string;
  name: string;
  token: string;
  target_list: string | null;
  is_active: boolean;
  total_leads: number;
  created_at: string;
};
```

Criação:

```json
{
  "name": "Landing Page",
  "target_list": "uuid-ou-null",
  "secret": "segredo-com-pelo-menos-16-caracteres"
}
```

Após criar, mostre:

- URL: `${NEXT_PUBLIC_API_URL}/webhook/leads/{token}`;
- botão copiar;
- exemplo cURL;
- instrução para enviar o header obrigatório `X-Webhook-Delivery` com identificador único;
- se houver secret, explicar assinatura `X-Webhook-Signature: sha256=<hmac>`;
- exemplo de payload.

```json
{
  "name": "João Silva",
  "email": "joao@empresa.com",
  "phone": "+5511999998888",
  "source": "landing-page",
  "custom_fields": { "cargo": "CTO" }
}
```

Não existe endpoint de excluir ou editar webhook; não exiba ações falsas.

## 12. Configurações

Crie uma tela informativa com:

- URL atual da API;
- estado da sessão;
- tema;
- informações sobre SPF, DKIM e DMARC;
- aviso de que credenciais SMTP e chaves internas são configuradas somente no servidor.

Não exponha segredos nem crie formulário que envie SMTP/API keys ao backend atual.

## 13. Arquitetura do código

Organize em módulos claros:

```text
ms-frontend/
  app/
  components/
  features/
    auth/
    contacts/
    lists/
    templates/
    campaigns/
    webhooks/
  lib/
    api/
    auth/
    validations/
  types/
```

Requisitos:

- um módulo de API por domínio;
- hooks TanStack Query por recurso;
- schemas Zod separados;
- componentes de formulário reutilizáveis apenas quando houver reutilização real;
- Error Boundary nas áreas protegidas;
- skeletons nas consultas;
- invalidação correta de queries após mutações;
- datas exibidas em `pt-BR`;
- código sem `any` desnecessário;
- não colocar dados fictícios em produção.

## 14. Segurança

- Preview de HTML somente em iframe com `sandbox`.
- Não usar `dangerouslySetInnerHTML` no DOM principal.
- Não armazenar nem solicitar `INTERNAL_API_KEY`.
- Não registrar tokens no console.
- Validar URLs antes de exibi-las como links.
- Confirmar ações destrutivas e disparos.
- Não permitir que erros da API mostrem stack traces.
- Tokens de autenticação devem ficar atrás de uma única camada de abstração, nunca espalhados em componentes.

## 15. Entrega esperada

Entregue o código funcional completo em `ms-frontend`, incluindo:

- `package.json`;
- configuração Next.js, Tailwind e TypeScript;
- `.env.example`;
- Dockerfile;
- páginas e componentes;
- cliente da API;
- autenticação e proteção de rotas;
- formulários e validações;
- estados de carregamento/erro/vazio;
- testes básicos dos fluxos críticos;
- atualização do `docker-compose.yml` para incluir o frontend na porta 3000.

Antes de finalizar:

1. execute lint;
2. execute checagem TypeScript;
3. execute testes;
4. execute build de produção;
5. corrija todos os erros encontrados.

Não altere os microsserviços existentes sem necessidade explícita. Se algum recurso não for suportado pela API atual, omita-o ou mostre claramente que está indisponível, em vez de criar comportamento falso.
