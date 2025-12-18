// Webhook para receber notificações da PushinPay
// Este endpoint é chamado automaticamente pela PushinPay quando o status do pagamento muda

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

  // Validar token de segurança do webhook
  // A PushinPay envia o token no header x-pushinpay-token
  const webhookToken = req.headers['x-pushinpay-token'];
  const expectedToken = process.env.PUSHINPAY_WEBHOOK_TOKEN;

  if (expectedToken && webhookToken !== expectedToken) {
    console.warn('⚠️ Token de webhook inválido ou ausente');
    console.warn('Token recebido:', webhookToken ? '***' : 'ausente');
    console.warn('Token esperado:', expectedToken ? '***' : 'não configurado');
    return res.status(401).json({ error: 'Token inválido' });
  }

  // Se o token não estiver configurado, apenas logar um aviso mas continuar
  if (!expectedToken) {
    console.warn('⚠️ PUSHINPAY_WEBHOOK_TOKEN não configurado - webhook aceito sem validação');
  } else {
    console.log('✅ Token de webhook validado com sucesso');
  }

  try {
    const payload = req.body;
    
    console.log('📥 Webhook PushinPay recebido:', JSON.stringify(payload, null, 2));

    // Validar se o payload contém dados da transação
    if (!payload || !payload.id) {
      console.warn('⚠️ Webhook recebido sem ID de transação');
      return res.status(400).json({ error: 'Payload inválido' });
    }

    const transactionId = payload.id;
    const status = payload.status?.toLowerCase() || 'unknown';
    const value = payload.value || payload.amount;

    console.log(`📊 Webhook - Transação ${transactionId}: Status = ${status}, Valor = ${value}`);

    // Verificar se o pagamento foi confirmado
    const isPagamentoConfirmado = status === 'paid' || status === 'approved' || status === 'confirmed';

    if (isPagamentoConfirmado) {
      console.log('✅✅✅ PAGAMENTO CONFIRMADO VIA WEBHOOK!');
      console.log(`💰 Transação: ${transactionId}, Valor: ${value}`);

      // Enviar notificação via Telegram (se configurado)
      try {
        const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
        const telegramChatId = process.env.TELEGRAM_CHAT_ID;

        if (telegramToken && telegramChatId) {
          const valorEmReais = (value / 100).toFixed(2);
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
        const valorEmReais = value ? (typeof value === 'number' ? value / 100 : parseFloat(value) / 100) : 0;
        
        const paymentData = {
          transactionId: transactionId,
          status: status,
          value: valorEmReais,
          timestamp: new Date().toISOString(),
          plano: payload.plano || 'Não especificado',
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
    } else if (status === 'canceled' || status === 'cancelled') {
      console.log(`❌ Pagamento cancelado: ${transactionId}`);
    } else {
      console.log(`⏳ Status intermediário: ${status} para transação ${transactionId}`);
    }

    // Sempre retornar 200 para a PushinPay
    // Isso confirma que recebemos a notificação
    return res.status(200).json({ 
      success: true,
      message: 'Webhook recebido com sucesso',
      transactionId: transactionId,
      status: status
    });

  } catch (error) {
    console.error('❌ Erro ao processar webhook PushinPay:', error);
    
    // Mesmo em caso de erro, retornar 200 para a PushinPay
    // para evitar que ela tente reenviar múltiplas vezes
    return res.status(200).json({ 
      success: false,
      error: 'Erro ao processar webhook',
      message: error.message 
    });
  }
}

