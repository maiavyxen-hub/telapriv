# 🔒 Privacy - Sistema de Pagamento PIX com Next.js

Sistema completo de pagamento PIX integrado com PushinPay para conteúdo premium, desenvolvido com Next.js para máxima segurança.

## 🚀 Tecnologias

- **Next.js 14** - Framework React com SSR
- **React 18** - Biblioteca UI
- **Tailwind CSS** - Estilização
- **PushinPay API** - Pagamentos PIX
- **Netlify** - Hospedagem

## 📋 Instalação

### 1. Clone o repositório

```bash
git clone https://github.com/idkafael/marmari.git
cd marmari
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Configure as variáveis de ambiente

Crie um arquivo `.env.local` na raiz do projeto:

```env
# PushinPay Configuration
PUSHINPAY_TOKEN=seu_token_pushinpay_aqui

# Facebook Pixel
NEXT_PUBLIC_FACEBOOK_PIXEL_ID=seu_pixel_id_aqui

# Telegram Bot
TELEGRAM_BOT_TOKEN=seu_bot_token_aqui
TELEGRAM_CHAT_ID=seu_chat_id_aqui

# WhatsApp
WHATSAPP_NUMBER=5511945843169

# Valores dos Planos (em centavos)
PLANO_VITALICIO_19_90=1990
PLANO_3_MESES=5000
PLANO_VITALICIO_100_00=10000

# URLs
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

**⚠️ IMPORTANTE:** Nunca faça commit do arquivo `.env.local`!

### 4. Execute localmente

```bash
npm run dev
```

Acesse: http://localhost:3000

## 🚀 Deploy na Netlify

**📖 Siga o guia completo:** [NETLIFY-DEPLOY.md](NETLIFY-DEPLOY.md)

### Deploy Rápido

1. **Conecte ao GitHub:**
   - Vá em [netlify.com](https://netlify.com)
   - Clique em "Add new site" → "Import an existing project"
   - Selecione o repositório **idkafael/marmari**

2. **Configure Environment Variables:**
   - Vá em "Show advanced" → "Add environment variables"
   - Adicione todas as variáveis do `.env.local`

3. **Deploy:**
   - Clique em "Deploy site"
   - Aguarde o build (~3-4 minutos)
   - Teste o site funcionando

### URLs
- **Repositório**: https://github.com/idkafael/marmari
- **Deploy**: https://marmari.netlify.app

## 🔐 Segurança

- ✅ Tokens protegidos no servidor via API Routes
- ✅ Nenhum token exposto no cliente (HTML/JS)
- ✅ Variáveis de ambiente para todas as credenciais
- ✅ `.env.local` protegido no `.gitignore`

## 📁 Estrutura do Projeto

```
/
├── .env.local              # Variáveis de ambiente (não vai para git)
├── .gitignore              # Protege arquivos sensíveis
├── next.config.js          # Configuração Next.js
├── package.json            # Dependências
├── pages/
│   ├── _app.js            # Configuração Next.js
│   ├── index.js           # Página principal (React)
│   ├── agradecimento.js   # Pós-pagamento (React)
│   └── api/
│       ├── pushinpay.js   # API protegida PushinPay
│       └── telegram.js    # API protegida Telegram
├── components/
│   ├── MediaGrid.js       # Grid de mídias
│   └── ModalPagamento.js  # Modal de pagamento PIX
├── public/
│   ├── images/            # Imagens e vídeos
│   ├── css/               # Estilos
│   └── js/                # JavaScript cliente
└── README.md              # Este arquivo
```

## 🎨 Funcionalidades

- ✅ Sistema de pagamento PIX completo
- ✅ QR Code gerado automaticamente
- ✅ Verificação de pagamento em tempo real
- ✅ Notificações via Telegram
- ✅ Rastreamento Facebook Pixel
- ✅ Interface responsiva (mobile + desktop)
- ✅ Segurança máxima (tokens no servidor)
- ✅ React components reutilizáveis
- ✅ Código HTML migrado para Next.js
- ✅ Arquivos HTML originais protegidos no GitHub

## 📝 Licença

Este projeto é privado e proprietário.

---

**Desenvolvido com ❤️ para facilitar pagamentos PIX seguros**
