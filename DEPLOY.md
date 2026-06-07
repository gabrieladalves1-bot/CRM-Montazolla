# Deploy — CRM Montazolla

## Visão geral

| Parte | Plataforma | URL final |
|---|---|---|
| Backend (PocketBase) | Railway | `https://SEU-PROJETO.up.railway.app` |
| Frontend (React) | Cloudflare Pages | `https://app.montazolla.com` |

---

## Passo 1 — Backend no Railway

### 1.1 Criar projeto no Railway

1. Acesse [railway.app](https://railway.app) e faça login
2. Clique em **New Project → Deploy from GitHub repo**
3. Conecte este repositório
4. Railway detecta o `Dockerfile` automaticamente

### 1.2 Adicionar volume persistente

**IMPORTANTE:** O PocketBase armazena o banco de dados em arquivo. Sem volume, os dados são perdidos a cada deploy.

1. No painel do projeto, clique em **Add Service → Volume**
2. Monte o volume no caminho: `/pb/pb_data`

### 1.3 Configurar variáveis de ambiente

No painel Railway → **Variables**, adicione:

```
PORT=8090
```

> As credenciais ZApi e Anthropic são configuradas como **Secrets do PocketBase** (veja abaixo).

### 1.4 Pegar a URL do Railway

Após o deploy, a URL será algo como:
`https://crm-montazolla-production.up.railway.app`

---

## Passo 2 — Configurar PocketBase Admin

1. Acesse `https://SEU-PROJETO.up.railway.app/_/`
2. Crie a conta de admin (guarde bem a senha)
3. As migrations rodam automaticamente na primeira inicialização
4. Crie sua conta de usuário em **Collections → users**

### 2.1 Configurar Secrets (para os agentes)

No admin PocketBase: **Settings → Secrets** → adicione:

| Chave | Valor |
|---|---|
| `ANTHROPIC_API_KEY` | sua chave da Anthropic API |
| `WA_INSTANCE_ID` | ID da instância ZApi |
| `WA_TOKEN` | Token da instância ZApi |
| `ZAPI_CLIENT_TOKEN` | Client Token da ZApi |

> **Sem a `ANTHROPIC_API_KEY`:** os agentes enviam uma mensagem padrão pedindo para tentar novamente. O resto do CRM funciona normalmente.

### 2.2 Configurar webhook da ZApi

No painel ZApi, configure o webhook para receber mensagens:
```
https://SEU-PROJETO.up.railway.app/backend/v1/zapi-webhook
```

---

## Passo 3 — Frontend no Cloudflare Pages

1. Acesse [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages → Create**
2. Conecte este repositório GitHub
3. Configure o build:
   - **Build command:** `npm run build`
   - **Output directory:** `dist`
4. Em **Environment Variables**, adicione:
   ```
   VITE_POCKETBASE_URL=https://SEU-PROJETO.up.railway.app
   ```
5. Conecte o domínio `app.montazolla.com` nas configurações de DNS

---

## Passo 4 — Testar

1. Acesse `https://app.montazolla.com`
2. Faça login com as credenciais criadas no PocketBase
3. Crie um lead de teste e verifique se aparece no Kanban
4. Envie uma mensagem de teste via ZApi e verifique se o agente responde

---

## Após adicionar a Anthropic API Key

Quando tiver a chave:
1. Acesse PocketBase Admin → Settings → Secrets
2. Adicione `ANTHROPIC_API_KEY` com o valor da sua chave
3. Os agentes Antônio e Alexandre passam a responder automaticamente

Você pode obter uma chave em: [console.anthropic.com](https://console.anthropic.com)
