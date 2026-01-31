// API Route para SyncPay - Protegida no servidor
// Documentação: https://syncpay.apidog.io

// Cache para o token de autenticação
let tokenCache = {
  token: null,
  expiresAt: null
};

// Função para obter token de autenticação
async function getAuthToken() {
  // Verificar se temos um token válido em cache
  if (tokenCache.token && tokenCache.expiresAt && new Date() < new Date(tokenCache.expiresAt)) {
    return tokenCache.token;
  }

  const clientId = process.env.SYNCPAY_CLIENT_ID;
  const clientSecret = process.env.SYNCPAY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('SYNCPAY_CLIENT_ID e SYNCPAY_CLIENT_SECRET devem estar configurados');
  }

  try {
    // URL base da API SyncPay
    // Se SYNCPAY_BASE_URL estiver configurado, usa ele + path
    // Senão, tenta URLs comuns
    const baseUrl = process.env.SYNCPAY_BASE_URL;
    let apiUrl;
    
    if (baseUrl) {
      // Se tiver URL base configurada, monta a URL completa
      apiUrl = baseUrl.endsWith('/') 
        ? `${baseUrl}api/partner/v1/auth-token`
        : `${baseUrl}/api/partner/v1/auth-token`;
    } else {
      // URL padrão correta
      apiUrl = 'https://api.syncpayments.com.br/api/partner/v1/auth-token';
    }
    
    console.log('🔑 Tentando obter token SyncPay de:', apiUrl);
    console.log('🔑 Client ID:', clientId ? `${clientId.substring(0, 8)}...` : 'NÃO CONFIGURADO');
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret
      })
    });

    console.log('📥 Status da resposta:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      let errorData = {};
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        errorData = { message: errorText || `Erro ${response.status}` };
      }
      console.error('❌ Erro na resposta:', errorData);
      throw new Error(errorData.message || `Erro ao obter token: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Resposta recebida (sem mostrar token completo)');
    
    // Cachear o token
    tokenCache.token = data.access_token;
    // Expirar 5 minutos antes do tempo real para garantir validade
    const expiresIn = (data.expires_in || 3600) - 300; // 300 segundos = 5 minutos
    tokenCache.expiresAt = new Date(Date.now() + expiresIn * 1000);

    console.log('✅ Token SyncPay obtido com sucesso');
    return data.access_token;
  } catch (error) {
    console.error('❌ Erro ao obter token SyncPay:', error);
    console.error('❌ Error details:', {
      name: error.name,
      message: error.message,
      cause: error.cause
    });
    
    // Se for erro de fetch, fornecer mensagem mais clara
    if (error.message && (error.message.includes('fetch') || error.message.includes('ECONNREFUSED') || error.message.includes('ENOTFOUND'))) {
      throw new Error(`Erro de conexão com SyncPay: ${error.message}. Verifique se a URL da API está correta (tente configurar SYNCPAY_API_URL no .env.local) e se você tem conexão com a internet.`);
    }
    
    throw error;
  }
}

export default async function handler(req, res) {
  // Apenas permitir POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { action } = req.body;

  try {
    if (action === 'create-pix') {
      const { valor, plano } = req.body;

      // Validar valor - SyncPay espera valor em reais (double)
      const valorEmReais = parseFloat(valor) || 9.90;

      if (!valorEmReais || valorEmReais < 0.01) {
        return res.status(400).json({
          error: 'Valor inválido. O valor mínimo é R$ 0,01',
          message: 'Valor inválido. O valor mínimo é R$ 0,01'
        });
      }

      console.log('Criando PIX via SyncPay:', { valorReais: valorEmReais, plano });

      // Obter token de autenticação
      const token = await getAuthToken();

      // Configurar URL do webhook
      const webhookUrl = process.env.NEXT_PUBLIC_SITE_URL
        ? `${process.env.NEXT_PUBLIC_SITE_URL}/api/webhook-syncpay`
        : undefined;

      try {
        // Preparar payload conforme documentação SyncPay
        const payload = {
          amount: valorEmReais, // Valor em reais (double)
          description: plano || `Pagamento - ${valorEmReais.toFixed(2)}`,
          ...(webhookUrl && { webhook_url: webhookUrl })
        };

        console.log('📤 Payload enviado para SyncPay:', JSON.stringify(payload, null, 2));
        // URL será logada abaixo
        console.log('📤 Token (primeiros 20 chars):', token ? `${token.substring(0, 20)}...` : 'NÃO DISPONÍVEL');

        // Usar a mesma base URL do token
        const baseUrl = process.env.SYNCPAY_BASE_URL || 'https://api.syncpayments.com.br';
        const cashInUrl = baseUrl.endsWith('/') 
          ? `${baseUrl}api/partner/v1/cash-in`
          : `${baseUrl}/api/partner/v1/cash-in`;
        
        console.log('📤 URL do cash-in:', cashInUrl);
        const response = await fetch(cashInUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        console.log('📥 Status da resposta HTTP:', response.status, response.statusText);

        let pixData;
        try {
          const contentType = response.headers.get('content-type') || '';
          
          if (!contentType.includes('application/json')) {
            const text = await response.text();
            console.error('❌ Resposta não é JSON. Content-Type:', contentType);
            console.error('❌ Resposta recebida (primeiros 500 caracteres):', text.substring(0, 500));
            
            return res.status(500).json({
              error: 'Resposta da API não é JSON',
              message: 'A API SyncPay retornou uma resposta que não é JSON',
              contentType: contentType,
              responsePreview: text.substring(0, 500)
            });
          }
          
          pixData = await response.json();
        } catch (parseError) {
          console.error('❌ Erro ao parsear resposta JSON:', parseError);
          const text = await response.text().catch(() => 'Não foi possível ler a resposta');
          console.error('Resposta recebida (texto):', text.substring(0, 500));
          return res.status(500).json({
            error: 'Erro ao processar resposta da API SyncPay',
            message: 'A API retornou uma resposta inválida',
            details: text.substring(0, 500)
          });
        }

        console.log('📥 Resposta completa da API SyncPay:', JSON.stringify(pixData, null, 2));

        if (!response.ok) {
          console.error('❌ Erro SyncPay API:', {
            status: response.status,
            statusText: response.statusText,
            data: pixData
          });

          return res.status(response.status).json({
            error: pixData.message || pixData.error || 'Erro ao criar PIX',
            message: pixData.message || pixData.error || 'Erro ao criar PIX',
            details: pixData
          });
        }

        // Adaptar resposta para formato compatível com frontend
        const adaptedResponse = {
          success: true,
          hash: pixData.identifier,
          identifier: pixData.identifier,
          status: 'created', // SyncPay retorna created inicialmente
          pix_code: pixData.pix_code, // Código PIX EMV completo
          qr_code: null, // SyncPay não retorna QR code base64, vamos gerar do pix_code
          amount: valorEmReais * 100, // Converter para centavos para compatibilidade
          payment_method: 'pix',
          created_at: new Date().toISOString(),
          data: pixData
        };

        console.log('✅ Transação criada com sucesso via SyncPay:', adaptedResponse);
        
        return res.status(200).json(adaptedResponse);
      } catch (error) {
        console.error('❌ Erro ao criar PIX via SyncPay:', error);
        console.error('❌ Stack trace:', error.stack);
        console.error('❌ Error name:', error.name);
        console.error('❌ Error message:', error.message);
        
        // Se for erro de fetch, pode ser problema de conexão ou URL
        if (error.message && error.message.includes('fetch')) {
          return res.status(500).json({
            error: 'Erro de conexão com a API SyncPay',
            message: 'Não foi possível conectar com a API SyncPay. Verifique sua conexão e as credenciais.',
            details: error.message
          });
        }
        
        return res.status(500).json({
          error: error.message || 'Erro ao criar PIX',
          message: error.message || 'Erro ao criar PIX',
          details: error.response?.data || error.message
        });
      }
    }

    if (action === 'check-payment') {
      const { transactionId } = req.body;

      if (!transactionId) {
        return res.status(400).json({ error: 'transactionId é obrigatório' });
      }

      try {
        // Obter token de autenticação
        const token = await getAuthToken();

        // Usar a mesma base URL do token
        const baseUrl = process.env.SYNCPAY_BASE_URL || 'https://api.syncpayments.com.br';
        const url = baseUrl.endsWith('/') 
          ? `${baseUrl}api/partner/v1/transaction/${transactionId}`
          : `${baseUrl}/api/partner/v1/transaction/${transactionId}`;

        console.log(`Consultando status do PIX no SyncPay: ${url}`);

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        });

        console.log('📥 Status da resposta HTTP:', response.status, response.statusText);

        if (response.status === 404) {
          console.log('⚠️ Transação não encontrada no SyncPay (404)');
          return res.status(404).json({
            error: 'Transação não encontrada',
            message: 'Transação não encontrada'
          });
        }

        let statusData;
        try {
          const contentType = response.headers.get('content-type') || '';
          
          if (!contentType.includes('application/json')) {
            const text = await response.text();
            console.error('❌ Resposta não é JSON. Content-Type:', contentType);
            return res.status(500).json({
              error: 'Resposta da API não é JSON',
              message: 'A API SyncPay retornou uma resposta que não é JSON',
              contentType: contentType
            });
          }
          
          statusData = await response.json();
        } catch (parseError) {
          console.error('❌ Erro ao parsear resposta JSON:', parseError);
          return res.status(500).json({
            error: 'Erro ao processar resposta da API SyncPay',
            message: 'A API retornou uma resposta inválida'
          });
        }
        
        console.log('📥 Resposta completa da consulta SyncPay:', JSON.stringify(statusData, null, 2));

        if (!response.ok) {
          console.error(`Erro ao consultar transação no SyncPay: ${response.status}`, statusData);
          return res.status(response.status).json({
            error: statusData.message || statusData.error || 'Erro ao verificar pagamento',
            details: statusData
          });
        }

        // Adaptar resposta para formato compatível com frontend
        const transactionData = statusData.data || statusData;
        const status = transactionData.status?.toLowerCase() || 'pending';
        
        // Mapear status do SyncPay para formato esperado
        let mappedStatus = status;
        if (status === 'completed') {
          mappedStatus = 'paid';
        } else if (status === 'pending' || status === 'processing') {
          mappedStatus = 'pending';
        } else if (status === 'cancelled' || status === 'canceled') {
          mappedStatus = 'canceled';
        }

        const adaptedResponse = {
          success: true,
          hash: transactionData.reference_id || transactionId,
          identifier: transactionData.reference_id || transactionId,
          status: mappedStatus,
          amount: transactionData.amount ? Math.round(transactionData.amount * 100) : null, // Converter para centavos
          payment_method: 'pix',
          paid_at: transactionData.transaction_date,
          created_at: transactionData.transaction_date,
          data: transactionData
        };
        
        return res.status(200).json(adaptedResponse);
      } catch (error) {
        console.error('Erro ao consultar transação no SyncPay:', error);
        
        return res.status(500).json({
          error: 'Erro ao verificar pagamento',
          message: error.message || 'Erro ao verificar pagamento',
          details: error.response?.data || error
        });
      }
    }

    return res.status(400).json({
      error: 'Ação inválida',
      message: 'Ação inválida'
    });
  } catch (error) {
    console.error('Erro na API SyncPay:', error);
    return res.status(500).json({
      error: error.message || 'Erro interno do servidor',
      message: error.message || 'Erro interno do servidor',
      type: error.name || 'Error'
    });
  }
}
