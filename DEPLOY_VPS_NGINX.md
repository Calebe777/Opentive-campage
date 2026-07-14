# Deploy em VPS com Docker Compose e Nginx

Este guia considera que a VPS já executa outros projetos e usa Nginx como proxy reverso. Os exemplos usam:

- `email.seudominio.com` para o frontend;
- `api.email.seudominio.com` para o backend;
- `track.email.seudominio.com` para abertura, clique e descadastro.

Substitua esses domínios pelos seus antes de executar.

## 1. Requisitos da VPS

- Linux com Docker Engine e Docker Compose Plugin;
- Nginx instalado no host;
- domínio apontando para o IP da VPS;
- portas 80 e 443 liberadas;
- portas internas escolhidas sem conflito com seus outros processos.

Confirme as portas ocupadas:

```bash
sudo ss -lntp
```

Não exponha PostgreSQL, Redis, `ms-ai` ou SMTP publicamente.

## 2. DNS

Crie registros `A` apontando para o IP da VPS:

```text
email.seudominio.com
api.email.seudominio.com
track.email.seudominio.com
```

## 3. Transferência do projeto

Exemplo de destino:

```bash
sudo mkdir -p /opt/email-marketing
sudo chown "$USER":"$USER" /opt/email-marketing
cd /opt/email-marketing
```

Envie ou clone o projeto nessa pasta. Não envie os diretórios locais:

```text
node_modules/
.venv/
.env
.next/
__pycache__/
```

## 4. Variáveis de ambiente

Gere segredos diferentes e fortes:

```bash
openssl rand -hex 48
openssl rand -hex 32
openssl rand -base64 32
```

O mesmo `INTERNAL_API_KEY` deve ser usado em `ms-backend`, `ms-ai` e `ms-email`.

### `ms-backend/.env`

```env
APP_NAME=Email Marketing API
ENVIRONMENT=production
DATABASE_URL=postgresql+asyncpg://emailmkt:SENHA_POSTGRES_FORTE@postgres:5432/emailmkt
REDIS_URL=redis://redis:6379/0
JWT_SECRET=SEGREDO_JWT_COM_PELO_MENOS_32_CARACTERES
INTERNAL_API_KEY=CHAVE_INTERNA_COMPARTILHADA
AI_SERVICE_URL=http://ms-ai:8002
ACCESS_TOKEN_MINUTES=15
REFRESH_TOKEN_DAYS=7
WEBHOOK_RATE_LIMIT_PER_MINUTE=60
```

### `ms-ai/.env`

```env
AI_PROVIDER=openai
OPENAI_API_KEY=SUA_CHAVE_OPENAI
OPENAI_MODEL=gpt-4o-mini
INTERNAL_API_KEY=CHAVE_INTERNA_COMPARTILHADA
MAX_BRIEFING_LENGTH=5000
```

### `ms-email/.env`

```env
DATABASE_URL=postgresql+asyncpg://emailmkt:SENHA_POSTGRES_FORTE@postgres:5432/emailmkt
REDIS_URL=redis://redis:6379/0
BACKEND_URL=http://ms-backend:8000
INTERNAL_API_KEY=CHAVE_INTERNA_COMPARTILHADA
PUBLIC_BASE_URL=https://track.email.seudominio.com
SMTP_HOST=SEU_SMTP
SMTP_PORT=587
SMTP_USERNAME=SEU_USUARIO
SMTP_PASSWORD=SUA_SENHA
SMTP_USE_TLS=true
WORKER_POLL_SECONDS=1
MAX_ATTEMPTS=5
```

### `ms-frontend/.env`

```env
NEXT_PUBLIC_API_URL=https://api.email.seudominio.com
```

> `NEXT_PUBLIC_API_URL` é incorporada no bundle durante o build. Alterar apenas o `.env` depois do build não basta: reconstrua a imagem do frontend.

## 5. Compose recomendado para produção

O `docker-compose.yml` atual publica todas as portas e contém credenciais de desenvolvimento. Na VPS, crie `docker-compose.prod.yml` com overrides:

```yaml
services:
  postgres:
    environment:
      POSTGRES_DB: emailmkt
      POSTGRES_USER: emailmkt
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    ports: []
    restart: unless-stopped

  redis:
    ports: []
    restart: unless-stopped

  ms-backend:
    ports:
      - "127.0.0.1:18000:8000"
    restart: unless-stopped

  ms-ai:
    ports: []
    restart: unless-stopped

  ms-email:
    ports:
      - "127.0.0.1:18001:8001"
    restart: unless-stopped

  ms-frontend:
    ports:
      - "127.0.0.1:13000:3000"
    build:
      context: ./ms-frontend
      args:
        NEXT_PUBLIC_API_URL: https://api.email.seudominio.com
    environment:
      NEXT_PUBLIC_API_URL: https://api.email.seudominio.com
    restart: unless-stopped
```

Crie um `.env` somente para interpolação do Compose na raiz:

```env
POSTGRES_PASSWORD=SENHA_POSTGRES_FORTE
```

Proteja todos os arquivos de segredo:

```bash
chmod 600 .env ms-backend/.env ms-ai/.env ms-email/.env ms-frontend/.env
```

### Ajuste necessário no Dockerfile do frontend

O Dockerfile atual fixa `NEXT_PUBLIC_API_URL=http://ms-backend:8000` no build. Isso não funciona no navegador do usuário. Substitua essa linha no estágio `builder` por:

```dockerfile
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
```

Assim, o `build.args` do compose de produção define a URL pública correta.

## 6. Subir os contêineres

Na raiz do projeto:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml config
```

Revise a saída e confirme que PostgreSQL, Redis e `ms-ai` não possuem portas publicadas.

Depois:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

A migration é executada pelo comando de inicialização do backend.

Confira:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs --tail=100 ms-backend
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs --tail=100 ms-email
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs --tail=100 ms-frontend
```

Teste no host antes do Nginx:

```bash
curl http://127.0.0.1:18000/health
curl http://127.0.0.1:18001/health
curl -I http://127.0.0.1:13000
```

## 7. Nginx

Crie `/etc/nginx/sites-available/email-marketing`:

```nginx
map $http_upgrade $connection_upgrade {
    default upgrade;
    '' close;
}

server {
    listen 80;
    listen [::]:80;
    server_name email.seudominio.com;

    location / {
        proxy_pass http://127.0.0.1:13000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
    }
}

server {
    listen 80;
    listen [::]:80;
    server_name api.email.seudominio.com;

    client_max_body_size 5m;

    location / {
        proxy_pass http://127.0.0.1:18000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 90s;
        proxy_send_timeout 90s;
    }
}

server {
    listen 80;
    listen [::]:80;
    server_name track.email.seudominio.com;

    location / {
        proxy_pass http://127.0.0.1:18001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 30s;
    }
}
```

Ative e valide:

```bash
sudo ln -s /etc/nginx/sites-available/email-marketing /etc/nginx/sites-enabled/email-marketing
sudo nginx -t
sudo systemctl reload nginx
```

Como há outros processos na VPS, use nomes de arquivos e portas locais exclusivos. Não altere os outros blocos Nginx.

## 8. HTTPS com Certbot

Depois que o DNS estiver propagado:

```bash
sudo certbot --nginx \
  -d email.seudominio.com \
  -d api.email.seudominio.com \
  -d track.email.seudominio.com
```

Teste a renovação:

```bash
sudo certbot renew --dry-run
```

Depois do HTTPS, confirme que:

```env
NEXT_PUBLIC_API_URL=https://api.email.seudominio.com
PUBLIC_BASE_URL=https://track.email.seudominio.com
```

Reconstrua frontend e e-mail se alterou essas variáveis:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build ms-frontend ms-email
```

## 9. CORS obrigatório no backend

O frontend e a API usam domínios diferentes. O FastAPI precisa permitir somente o domínio do frontend:

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://email.seudominio.com"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)
```

Sem isso, o navegador bloqueará as chamadas mesmo que API e Nginx estejam funcionando. Não use `allow_origins=["*"]` em produção com credenciais.

## 10. Firewall

Com UFW:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

Não libere externamente:

- 5432 (PostgreSQL);
- 6379 (Redis);
- 8002 (`ms-ai`);
- 18000, 18001 e 13000, pois estão ligados a `127.0.0.1`.

## 11. Configuração de e-mail

Antes de disparos reais:

- configure SPF no domínio remetente;
- configure DKIM no provedor SMTP;
- configure DMARC inicialmente com política de monitoramento;
- use endereço de retorno/bounce aceito pelo provedor;
- valide o domínio e remetente no provedor;
- aqueça domínio/IP gradualmente;
- mantenha o link de descadastro funcionando.

Exemplos exatos de DNS dependem do provedor SMTP; siga os valores fornecidos por ele.

## 12. Atualizações

Faça backup antes de atualizar:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U emailmkt emailmkt | gzip > "backup-$(date +%F-%H%M).sql.gz"
```

Depois atualize:

```bash
cd /opt/email-marketing
git pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
docker image prune -f
```

Nunca execute `docker compose down -v` em produção: `-v` remove o volume do PostgreSQL.

## 13. Backup e restauração

Backup:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U emailmkt emailmkt | gzip > emailmkt.sql.gz
```

Restauração em banco vazio:

```bash
gunzip -c emailmkt.sql.gz | \
  docker compose -f docker-compose.yml -f docker-compose.prod.yml exec -T postgres \
  psql -U emailmkt emailmkt
```

Armazene backups fora da própria VPS e teste a restauração periodicamente.

## 14. Operação e diagnóstico

Status:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps
```

Logs em tempo real:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f ms-backend ms-email
```

Uso de recursos:

```bash
docker stats
```

Validar Nginx:

```bash
sudo nginx -t
sudo journalctl -u nginx --since "30 minutes ago"
```

Testes públicos:

```bash
curl https://api.email.seudominio.com/health
curl https://track.email.seudominio.com/health
curl -I https://email.seudominio.com
```

## 15. Observações importantes do estado atual

Antes de considerar produção concluída:

1. aplique o ajuste de build do `NEXT_PUBLIC_API_URL` no Dockerfile do frontend;
2. adicione CORS restrito no FastAPI;
3. substitua a senha `secret` do PostgreSQL no compose base ou sobrescreva-a corretamente;
4. confirme que os três serviços usam o mesmo `INTERNAL_API_KEY`;
5. confirme que `PUBLIC_BASE_URL` usa o domínio HTTPS de tracking;
6. valide SMTP, SPF, DKIM e DMARC;
7. execute os testes do projeto e um disparo controlado para uma lista pequena;
8. configure monitoramento, rotação de logs e backup automático.
