# Configuração SyncPay

## Credenciais SyncPay

- **Client ID (Público):** `88567c16-f03b-482f-aa05-49198c1291f4`
- **Client Secret (Privado):** `4ea1305c-086b-4242-b676-fc3b8585`

## Variáveis de Ambiente Necessárias

Crie um arquivo `.env.local` na raiz do projeto com as seguintes variáveis:

```env
# SyncPay - Credenciais
SYNCPAY_CLIENT_ID=88567c16-f03b-482f-aa05-49198c1291f4
SYNCPAY_CLIENT_SECRET=4ea1305c-086b-4242-b676-fc3b8585
SYNCPAY_BASE_URL=https://api.syncpayments.com.br
SYNCPAY_WEBHOOK_TOKEN=seu_webhook_token_aqui

# Site URL (necessário para webhooks)
NEXT_PUBLIC_SITE_URL=https://seu-dominio.com

# Redis/Upstash (opcional)
privpayment_KV_REST_API_URL=sua_url_redis_aqui
privpayment_KV_REST_API_TOKEN=seu_token_redis_aqui

# Telegram (opcional)
TELEGRAM_BOT_TOKEN=seu_token_telegram_aqui
TELEGRAM_CHAT_ID=seu_chat_id_aqui
```
