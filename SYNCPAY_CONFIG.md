# Configuração SyncPay

## Credenciais SyncPay

- **Client ID (Público):** `5fd31153-0e52-4b27-bd02-4a4f760f76ce`
- **Client Secret (Privado):** `57ef1bcb-13e4-481a-889f-dc631fda68e9`

## Variáveis de Ambiente Necessárias

Crie um arquivo `.env.local` na raiz do projeto com as seguintes variáveis:

```env
# SyncPay - Credenciais
SYNCPAY_CLIENT_ID=5fd31153-0e52-4b27-bd02-4a4f760f76ce
SYNCPAY_CLIENT_SECRET=57ef1bcb-13e4-481a-889f-dc631fda68e9
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
