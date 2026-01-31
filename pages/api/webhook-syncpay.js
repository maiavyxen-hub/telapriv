// Webhook para receber notificações do SyncPay
// Este endpoint é chamado automaticamente pelo SyncPay quando o status do pagamento muda

import { Redis } from '@upstash/redis';

// Inicializar Redis usando variáveis de ambiente com prefixo privpayment_
const redis = new Redis({
  url: process.env['privpayment_KV_REST_API_URL'] || process.env.KV_REST_API_URL,
  token: process.env['privpayment_KV_REST_API_TOKEN'] || process.env.KV_REST_API_TOKEN,
});

export default async function handler(req, res) {
  // Apenas permitir POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  // Validar token de segurança do webhook (se configurado)
  // O SyncPay pode enviar um token no header, verificar documentação
  const webhookToken = req.headers['x-syncpay-token'] || req.headers['authorization'];
  const expectedToken = process.env.SYNCPAY_WEBHOOK_TOKEN;

  if (expectedToken && webhookToken && webhookToken !== expectedToken && !webhookToken.includes(expectedToken)) {
    console.warn('⚠️ Token de webhook inválido ou ausente');
    console.warn('Token recebido:', webhookToken ? '***' : 'ausente');
    console.warn('Token esperado:', expectedToken ? '***' : 'não configurado');
    return res.status(401).json({ error: 'Token inválido' });
  }

  // Se o token não estiver configurado, apenas logar um aviso mas continuar
  if (!expectedToken) {
    console.warn('⚠️ SYNCPAY_WEBHOOK_TOKEN não configurado - webhook aceito sem validação');
  } else {
    console.log('✅ Token de webhook validado com sucesso');
  }

  try {
    const payload = req.body;
    
    console.log('📥 Webhook SyncPay recebido:', JSON.stringify(payload, null, 2));

    // SyncPay pode enviar diferentes formatos de webhook
    // Verificar estrutura baseada na documentação
    let transactionId = null;
    let status = null;
    let value = null;
    let amount = null;

    // Tentar extrair dados de diferentes formatos possíveis
    if (payload.identifier) {
      transactionId = payload.identifier;
    } else if (payload.reference_id) {
      transactionId = payload.reference_id;
    } else if (payload.id) {
      transactionId = payload.id;
    } else if (payload.data?.identifier) {
      transactionId = payload.data.identifier;
    } else if (payload.data?.reference_id) {
      transactionId = payload.data.reference_id;
    }

    // Extrair status
    if (payload.status) {
      status = payload.status.toLowerCase();
    } else if (payload.data?.status) {
      status = payload.data.status.toLowerCase();
    }

    // Extrair valor
    if (payload.amount) {
      amount = payload.amount;
      value = typeof amount === 'number' ? amount : parseFloat(amount);
    } else if (payload.data?.amount) {
      amount = payload.data.amount;
      value = typeof amount === 'number' ? amount : parseFloat(amount);
    } else if (payload.value) {
      value = typeof payload.value === 'number' ? payload.value : parseFloat(payload.value);
    }

    // Validar se o payload contém dados da transação
    if (!transactionId) {
      console.warn('⚠️ Webhook recebido sem ID de transação');
      console.warn('Payload completo:', JSON.stringify(payload, null, 2));
      return res.status(400).json({ error: 'Payload inválido - ID de transação não encontrado' });
    }

    console.log(`📊 Webhook - Transação ${transactionId}: Status = ${status || 'unknown'}, Valor = ${value || amount || 'unknown'}`);

    // Verificar se o pagamento foi confirmado
    // SyncPay usa 'completed' como status de pagamento confirmado
    const isPagamentoConfirmado = 
      status === 'completed' || 
      status === 'paid' || 
      status === 'approved' || 
      status === 'confirmed';

    if (isPagamentoConfirmado) {
      console.log('✅✅✅ PAGAMENTO CONFIRMADO VIA WEBHOOK!');
      console.log(`💰 Transação: ${transactionId}, Valor: ${value || amount}`);

      // Enviar notificação via Telegram (se configurado)
      try {
        const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
        const telegramChatId = process.env.TELEGRAM_CHAT_ID;

        if (telegramToken && telegramChatId) {
          const valorEmReais = value ? value.toFixed(2) : (amount ? amount.toFixed(2) : '0.00');
          const mensagem = `🎉 *Pagamento Confirmado!*\n\n` +
            `💰 Valor: R$ ${valorEmReais}\n` +
            `🆔 ID: ${transactionId}\n` +
            `✅ Status: ${status}\n` +
            `⏰ ${new Date().toLocaleString('pt-BR')}`;

          await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              chat_id: telegramChatId,
              text: mensagem,
              parse_mode: 'Markdown'
            })
          });

          console.log('✅ Notificação enviada para Telegram');
        }
      } catch (telegramError) {
        console.warn('⚠️ Erro ao enviar notificação Telegram:', telegramError);
        // Não falhar o webhook se o Telegram falhar
      }

      // Salvar pagamento confirmado no Upstash Redis
      try {
        const valorEmReais = value || (amount ? parseFloat(amount) : 0);
        
        const paymentData = {
          transactionId: transactionId,
          status: status,
          value: valorEmReais,
          timestamp: new Date().toISOString(),
          plano: payload.description || payload.data?.description || 'Não especificado',
          createdAt: new Date().toISOString()
        };
        
        await redis.set(`payment:${transactionId}`, JSON.stringify(paymentData));
        await redis.sadd('payments:list', transactionId);
        
        console.log('✅ Pagamento salvo no Upstash Redis com sucesso');
      } catch (saveError) {
        console.warn('⚠️ Erro ao salvar pagamento no Upstash Redis:', saveError);
        // Não falhar o webhook se o salvamento falhar
      }

      // Aqui você pode adicionar outras ações:
      // - Enviar email
      // - Atualizar status no sistema
      // - etc.
    } else if (status === 'canceled' || status === 'cancelled' || status === 'failed') {
      console.log(`❌ Pagamento cancelado/falhou: ${transactionId}`);
    } else {
      console.log(`⏳ Status intermediário: ${status} para transação ${transactionId}`);
    }

    // Sempre retornar 200 para o SyncPay
    // Isso confirma que recebemos a notificação
    return res.status(200).json({ 
      success: true,
      message: 'Webhook recebido com sucesso',
      transactionId: transactionId,
      status: status
    });

  } catch (error) {
    console.error('❌ Erro ao processar webhook SyncPay:', error);
    
    // Mesmo em caso de erro, retornar 200 para o SyncPay
    // para evitar que ele tente reenviar múltiplas vezes
    return res.status(200).json({ 
      success: false,
      error: 'Erro ao processar webhook',
      message: error.message 
    });
  }
}
