// API Route para verificar acesso usando Upstash Redis
import { Redis } from '@upstash/redis';

// Inicializar Redis usando variáveis de ambiente com prefixo privpayment_
const redis = new Redis({
  url: process.env['privpayment_KV_REST_API_URL'] || process.env.KV_REST_API_URL,
  token: process.env['privpayment_KV_REST_API_TOKEN'] || process.env.KV_REST_API_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { transactionId } = req.query;
  
  if (!transactionId) {
    return res.status(400).json({ error: 'transactionId é obrigatório' });
  }
  
  try {
    const paymentStr = await redis.get(`payment:${transactionId}`);
    
    if (paymentStr) {
      const payment = typeof paymentStr === 'string' ? JSON.parse(paymentStr) : paymentStr;
      
      if (payment && (payment.status === 'paid' || payment.status === 'approved' || payment.status === 'confirmed')) {
        return res.status(200).json({ 
          hasAccess: true,
          payment: {
            transactionId: payment.transactionId,
            status: payment.status,
            value: payment.value,
            timestamp: payment.timestamp,
            plano: payment.plano
          }
        });
      }
    }
    
    return res.status(200).json({ 
      hasAccess: false 
    });
  } catch (error) {
    console.error('❌ Erro ao verificar no Redis:', error);
    return res.status(500).json({ 
      error: 'Erro ao verificar acesso',
      message: error.message 
    });
  }
}
