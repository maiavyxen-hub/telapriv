// API Route para PushinPay - Protegida no servidor
// Só o servidor tem acesso às variáveis de ambiente
// Documentação: https://app.theneo.io/pushinpay/pix

export default async function handler(req, res) {
  // Apenas permitir POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { action } = req.body;

  try {
    if (action === 'create-pix') {
      const { valor, plano } = req.body;

      // Validar variáveis de ambiente obrigatórias
      const apiToken = process.env.PUSHINPAY_TOKEN;

      if (!apiToken) {
        return res.status(500).json({
          error: 'PUSHINPAY_TOKEN não configurado',
          message: 'Configure PUSHINPAY_TOKEN nas variáveis de ambiente'
        });
      }

      // Validar valor - PushinPay espera valor em centavos (INT)
      // Converter valor de reais para centavos
      const valorEmReais = valor || 9.90;
      const valorFinalCentavos = Math.round(valorEmReais * 100);

      if (!valorFinalCentavos || valorFinalCentavos < 50) {
        return res.status(400).json({
          error: 'Valor inválido. O valor mínimo é R$ 0,50 (50 centavos)',
          message: 'Valor inválido. O valor mínimo é R$ 0,50 (50 centavos)'
        });
      }
      console.log('Criando PIX:', { valorReais: valorEmReais, valorCentavos: valorFinalCentavos, plano });
      // Configurar URL do webhook
      const webhookUrl = process.env.NEXT_PUBLIC_SITE_URL
        ? `${process.env.NEXT_PUBLIC_SITE_URL}/api/webhook-pushinpay`
        : undefined;

      console.log('Criando transação via PushinPay:', {
        valorCentavos: valorFinalCentavos,
        plano
      });

      try {
        // Base URL da API PushinPay conforme documentação
        const apiBaseUrl = 'https://api.pushinpay.com.br/api';
        const endpoint = '/pix/cashIn';
        const url = `${apiBaseUrl}${endpoint}`;

        // Preparar payload conforme documentação
        const payload = {
          value: valorFinalCentavos, // Valor em centavos (INT, mínimo 50)
          ...(webhookUrl && { webhook_url: webhookUrl })
        };

        console.log('📤 Payload enviado para PushinPay:', JSON.stringify(payload, null, 2));
        console.log('📤 URL da requisição:', url);

        // Fazer requisição direta à API conforme documentação
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiToken}`,
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
              message: 'A API PushinPay retornou uma resposta que não é JSON',
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
            error: 'Erro ao processar resposta da API PushinPay',
            message: 'A API retornou uma resposta inválida',
            details: text.substring(0, 500)
          });
        }

        console.log('📥 Resposta completa da API PushinPay:', JSON.stringify(pixData, null, 2));

        if (!response.ok) {
          console.error('❌ Erro PushinPay API:', {
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
        // Documentação: { id, qr_code, status, value, qr_code_base64, ... }
        const adaptedResponse = {
          success: true,
          hash: pixData.id,
          identifier: pixData.id,
          status: pixData.status || 'created', // created | paid | canceled
          pix_code: pixData.qr_code, // Código PIX EMV completo
          qr_code: pixData.qr_code_base64, // Imagem base64 do QR Code
          amount: pixData.value || valorFinalCentavos,
          payment_method: 'pix',
          expires_at: pixData.expires_at,
          created_at: pixData.created_at || new Date().toISOString(),
          data: pixData
        };

        console.log('✅ Transação criada com sucesso via PushinPay:', adaptedResponse);
        
        return res.status(200).json(adaptedResponse);
      } catch (error) {
        console.error('❌ Erro ao criar PIX via PushinPay:', error);
        
        return res.status(500).json({
          error: error.message || 'Erro ao criar PIX',
          message: error.message || 'Erro ao criar PIX',
          details: error.response?.data || error
        });
      }
    }

    if (action === 'check-payment') {
      const { transactionId } = req.body;

      if (!transactionId) {
        return res.status(400).json({ error: 'transactionId é obrigatório' });
      }

      const apiToken = process.env.PUSHINPAY_TOKEN;

      if (!apiToken) {
        return res.status(500).json({
          error: 'PUSHINPAY_TOKEN não configurado',
          message: 'Configure PUSHINPAY_TOKEN nas variáveis de ambiente'
        });
      }

      try {
        // Base URL da API PushinPay conforme documentação
        const apiBaseUrl = 'https://api.pushinpay.com.br/api';
        const endpoint = `/transactions/${transactionId}`; // ✅ CORRIGIDO: transactions (plural) conforme documentação
        const url = `${apiBaseUrl}${endpoint}`;

        console.log(`Consultando status do PIX na PushinPay: ${url}`);

        // Fazer requisição direta à API conforme documentação
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apiToken}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json' // ✅ ADICIONADO: Content-Type conforme documentação
          }
        });

        console.log('📥 Status da resposta HTTP:', response.status, response.statusText);

        if (response.status === 404) {
          console.log('⚠️ Transação não encontrada na PushinPay (404)');
          // ✅ CORRIGIDO: Retorna array vazio conforme documentação da API
          return res.status(404).json([]);
        }

        let statusData;
        try {
          const contentType = response.headers.get('content-type') || '';
          
          if (!contentType.includes('application/json')) {
            const text = await response.text();
            console.error('❌ Resposta não é JSON. Content-Type:', contentType);
            return res.status(500).json({
              error: 'Resposta da API não é JSON',
              message: 'A API PushinPay retornou uma resposta que não é JSON',
              contentType: contentType
            });
          }
          
          statusData = await response.json();
        } catch (parseError) {
          console.error('❌ Erro ao parsear resposta JSON:', parseError);
          return res.status(500).json({
            error: 'Erro ao processar resposta da API PushinPay',
            message: 'A API retornou uma resposta inválida'
          });
        }
        
        console.log('📥 Resposta completa da consulta PushinPay:', JSON.stringify(statusData, null, 2));

        if (!response.ok) {
          console.error(`Erro ao consultar transação na PushinPay: ${response.status}`, statusData);
          return res.status(response.status).json({
            error: statusData.message || statusData.error || 'Erro ao verificar pagamento',
            details: statusData
          });
        }

        const adaptedResponse = {
          success: true,
          hash: statusData.id || transactionId,
          identifier: statusData.id || transactionId,
          status: statusData.status || 'pending', // created | paid | canceled
          amount: statusData.value || statusData.amount,
          payment_method: 'pix',
          paid_at: statusData.paid_at || statusData.payment_date,
          created_at: statusData.created_at,
          data: statusData
        };
        
        return res.status(200).json(adaptedResponse);
      } catch (error) {
        console.error('Erro ao consultar transação na PushinPay:', error);
        
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
    console.error('Erro na API PushinPay:', error);
    return res.status(500).json({
      error: error.message || 'Erro interno do servidor',
      message: error.message || 'Erro interno do servidor',
      type: error.name || 'Error'
    });
  }
}


