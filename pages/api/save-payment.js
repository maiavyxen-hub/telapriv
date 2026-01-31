// API Route para salvar pagamentos confirmados usando Upstash Redis
import { Redis } from '@upstash/redis';

// Inicializar Redis usando variáveis de ambiente com prefixo privpayment_
const redis = new Redis({
  url: process.env['privpayment_KV_REST_API_URL'] || process.env.KV_REST_API_URL,
  token: process.env['privpayment_KV_REST_API_TOKEN'] || process.env.KV_REST_API_TOKEN,
});

export default async function handler(req, res) {
  if (req.method === 'POST') {
    // Salvar novo pagamento
    const { transactionId, status, value, timestamp, plano } = req.body;
    
    if (!transactionId) {
      return res.status(400).json({ error: 'transactionId é obrigatório' });
    }
    
    try {
      // Verificar se Redis está configurado
      const redisUrl = process.env['privpayment_KV_REST_API_URL'] || process.env.KV_REST_API_URL;
      const redisToken = process.env['privpayment_KV_REST_API_TOKEN'] || process.env.KV_REST_API_TOKEN;
      
      if (!redisUrl || !redisToken) {
        // Redis não configurado - retornar sucesso mesmo assim (não é crítico)
        console.log('⚠️ Redis não configurado - pagamento não será salvo no banco');
        return res.status(200).json({ 
          success: true, 
          message: 'Pagamento processado (Redis não configurado)',
          transactionId 
        });
      }
      
      const paymentData = {
        transactionId,
        status: status || 'paid',
        value: value || 0,
        timestamp: timestamp || new Date().toISOString(),
        plano: plano || 'Não especificado',
        createdAt: new Date().toISOString()
      };
      
      // Salvar no Redis usando transactionId como chave
      await redis.set(`payment:${transactionId}`, JSON.stringify(paymentData));
      
      // Também adicionar à lista de todos os pagamentos (opcional)
      await redis.sadd('payments:list', transactionId);
      
      console.log('✅ Pagamento salvo no Upstash Redis:', transactionId);
      return res.status(200).json({ 
        success: true, 
        message: 'Pagamento salvo com sucesso',
        transactionId 
      });
    } catch (error) {
      console.error('❌ Erro ao salvar no Redis:', error);
      // Não quebrar o fluxo - retornar sucesso mesmo com erro
      return res.status(200).json({ 
        success: true,
        message: 'Pagamento processado (erro ao salvar no Redis)',
        transactionId 
      });
    }
  } else if (req.method === 'GET') {
    // Verificar se um transactionId tem acesso
    const { transactionId } = req.query;
    
    if (!transactionId) {
      return res.status(400).json({ error: 'transactionId é obrigatório' });
    }
    
    try {
      // Verificar se Redis está configurado
      const redisUrl = process.env['privpayment_KV_REST_API_URL'] || process.env.KV_REST_API_URL;
      const redisToken = process.env['privpayment_KV_REST_API_TOKEN'] || process.env.KV_REST_API_TOKEN;
      
      if (!redisUrl || !redisToken) {
        // Redis não configurado - retornar false (o sistema vai verificar na API SyncPay)
        console.log('⚠️ Redis não configurado - verificando acesso via API SyncPay');
        return res.status(200).json({ 
          hasAccess: false 
        });
      }
      
      const paymentStr = await redis.get(`payment:${transactionId}`);
      
      if (paymentStr) {
        const payment = typeof paymentStr === 'string' ? JSON.parse(paymentStr) : paymentStr;
        
        if (payment && (payment.status === 'paid' || payment.status === 'approved' || payment.status === 'confirmed')) {
          return res.status(200).json({ 
            hasAccess: true, 
            payment 
          });
        }
      }
      
      return res.status(200).json({ 
        hasAccess: false 
      });
    } catch (error) {
      console.error('❌ Erro ao ler do Redis:', error);
      // Em caso de erro, retornar false (não quebrar o fluxo)
      return res.status(200).json({ 
        hasAccess: false 
      });
    }
  } else {
    return res.status(405).json({ error: 'Método não permitido' });
  }
}
