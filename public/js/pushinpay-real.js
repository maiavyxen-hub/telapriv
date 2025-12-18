// PushinPay Integration
// Versão: 1.0.0 - PushinPay Integration
console.log('%c🚀 PushinPay Integration v1.0.0', 'color: #ff6b35; font-size: 16px; font-weight: bold;');
console.log('%c✅ Sistema PushinPay carregado!', 'color: #4ade80; font-size: 12px;');
console.log('🔗 API: https://api.pushinpay.com.br');

const PushinPayReal = {
  config: {
    baseUrl: '/api', // Aponta para a API Route do Next.js
    valor: 1990, // R$ 19,90 em centavos
    webhookUrl: null,
    planoAtual: '1 Mês'
  },

  estado: {
    qrCodeAtivo: false,
    intervaloVerificacao: null,
    valorAtual: 1990,
    transactionId: null
  },

  atualizarValorPlano(valor, plano) {
    this.config.valor = Math.round(valor * 100); // Converter para centavos
    this.estado.valorAtual = this.config.valor;
    this.config.planoAtual = plano;
    console.log(`📊 Valor atualizado: R$ ${valor.toFixed(2)} - ${plano}`);
  },

  async criarPix(client = null, currency = 'BRL') {
    try {
      this.atualizarStatus('Gerando pagamento...');
      console.log('🔍 Criando transação via API Route PushinPay...', {
        valor: this.estado.valorAtual,
        moeda: currency,
        plano: this.config.planoAtual,
        client: client
      });

      // Preparar payload
      const payload = {
        action: 'create-pix',
        valor: this.estado.valorAtual / 100, // Converter de centavos para reais
        plano: this.config.planoAtual
      };

      // Adicionar dados do cliente se fornecido
      if (client && typeof client === 'object') {
        payload.client = client;
        console.log('👤 Dados do cliente incluídos:', client);
      }

      const response = await fetch(`${this.config.baseUrl}/pushinpay`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data.error || data.message || 'Erro desconhecido ao criar PIX';
        console.error('❌ Erro na API PushinPay:', {
          status: response.status,
          error: errorMsg,
          details: data
        });

        this.atualizarStatus(`Erro: ${errorMsg}`);
        throw new Error(`PushinPay API Error: ${errorMsg}`);
      }

      console.log('✅ Transação criada com sucesso via PushinPay:', data);

      // Extrair dados da resposta
      const pixCode = data.pix_code || data.data?.pix_code;
      const qrCodeBase64 = data.qr_code || data.data?.qr_code;
      const identifier = data.hash || data.identifier || data.data?.hash;
      const paymentStatus = data.status || data.data?.status;

      console.log('🔍 Debug - Extraindo dados:', {
        pixCode: pixCode ? 'Encontrado' : 'NÃO encontrado',
        qrCodeBase64: qrCodeBase64 ? 'Encontrado' : 'NÃO encontrado',
        identifier: identifier ? identifier : 'NÃO encontrado',
        paymentStatus: paymentStatus || 'NÃO encontrado'
      });

      // Verificar se o pagamento foi recusado
      if (paymentStatus === 'refused') {
        console.error('❌ ATENÇÃO: Transação foi RECUSADA pela PushinPay!');
        const errorMessage = data.message || data.error || 'Transação recusada pela PushinPay.';
        this.atualizarStatus(`Erro: ${errorMessage}`, true);
        throw new Error(errorMessage);
      }

      // Exibir QR Code
      const isBase64Image = qrCodeBase64 && (
        qrCodeBase64.startsWith('data:image') || 
        qrCodeBase64.startsWith('/9j/') || 
        qrCodeBase64.startsWith('iVBOR')
      );
      
      if (isBase64Image) {
        this.exibirQRCode(qrCodeBase64);
        console.log('✅ QR Code exibido (base64 do PushinPay)');
      } else if (pixCode) {
        console.log('🔄 Gerando QR Code a partir do código PIX...');
        this.gerarEExibirQRCode(pixCode);
      } else {
        console.warn('⚠️ QR Code e código PIX não encontrados na resposta');
      }

      // Exibir código PIX para copiar
      if (pixCode) {
        console.log('✅ Exibindo código PIX para copiar:', pixCode.substring(0, 50) + '...');
        this.exibirCodigoPix(pixCode);
      } else {
        console.warn('⚠️ Código PIX não encontrado na resposta da API');
      }

      // Salvar hash/identifier da transação
      if (identifier) {
        this.estado.transactionId = identifier;
        console.log('✅ Transaction Hash salvo:', identifier);
        // Iniciar verificação automática após criar PIX
        this.iniciarVerificacao();
      } else {
        console.warn('⚠️ Transaction Hash não encontrado na resposta da API PushinPay:', data);
      }

      this.atualizarStatus('QR Code gerado com sucesso!');

      return data;
    } catch (error) {
      console.error('❌ Erro ao criar PIX:', error);
      this.atualizarStatus(`Erro: ${error.message || 'Falha ao gerar pagamento'}`);
      throw error;
    }
  },

  // Gerar QR Code a partir do código PIX usando API online
  gerarEExibirQRCode(pixCode) {
    if (!pixCode) {
      console.warn('⚠️ Código PIX não disponível para gerar QR Code');
      return;
    }

    const qrDiv = document.getElementById('qrCode');
    if (!qrDiv) {
      console.warn('⚠️ Elemento qrCode não encontrado');
      return;
    }

    qrDiv.innerHTML = '';

    // Usar API online gratuita para gerar QR Code
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(pixCode)}`;

    const img = document.createElement('img');
    img.src = qrCodeUrl;
    img.alt = 'QR Code PIX';
    img.className = 'mx-auto max-w-xs';
    img.style.maxWidth = '256px';
    img.style.height = 'auto';

    img.onerror = () => {
      console.warn('⚠️ Erro ao carregar QR Code da API, tentando alternativa...');
      this.exibirQRCodeFallback(pixCode);
    };

    qrDiv.appendChild(img);
    console.log('✅ QR Code gerado e exibido');
  },

  // Fallback: exibir QR Code usando outra API
  exibirQRCodeFallback(pixCode) {
    const qrDiv = document.getElementById('qrCode');
    if (!qrDiv) return;

    if (typeof QRCode === 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js';
      script.onload = () => {
        this.gerarQRCodeComBiblioteca(pixCode);
      };
      script.onerror = () => {
        qrDiv.innerHTML = '<p class="text-sm text-gray-600">Escaneie o código PIX abaixo com seu app bancário</p>';
      };
      document.head.appendChild(script);
    } else {
      this.gerarQRCodeComBiblioteca(pixCode);
    }
  },

  // Gerar QR Code usando biblioteca QRCode
  gerarQRCodeComBiblioteca(pixCode) {
    if (typeof QRCode === 'undefined') {
      console.warn('⚠️ Biblioteca QRCode não disponível');
      return;
    }

    const qrDiv = document.getElementById('qrCode');
    if (!qrDiv) return;

    qrDiv.innerHTML = '';

    const canvas = document.createElement('canvas');
    qrDiv.appendChild(canvas);

    QRCode.toCanvas(canvas, pixCode, {
      width: 256,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    }, (error) => {
      if (error) {
        console.error('❌ Erro ao gerar QR Code:', error);
        qrDiv.innerHTML = '<p class="text-sm text-gray-600">Erro ao gerar QR Code. Use o código PIX abaixo.</p>';
      } else {
        console.log('✅ QR Code gerado com biblioteca');
      }
    });
  },

  exibirQRCode(qrCodeBase64) {
    const qrDiv = document.getElementById('qrCode');
    if (qrDiv && qrCodeBase64) {
      qrDiv.innerHTML = '';

      const img = document.createElement('img');
      let imageSrc = qrCodeBase64;
      if (!qrCodeBase64.startsWith('data:')) {
        imageSrc = `data:image/png;base64,${qrCodeBase64}`;
      }
      img.src = imageSrc;
      img.alt = 'QR Code PIX';
      img.className = 'mx-auto max-w-xs';
      img.style.maxWidth = '256px';
      img.style.height = 'auto';

      qrDiv.appendChild(img);
      console.log('✅ QR Code exibido (base64)');
    }
  },

  exibirCodigoPix(codigoPix) {
    const pixInput = document.getElementById('pixCodeInput');
    if (pixInput) {
      pixInput.value = codigoPix;
      console.log('✅ Código PIX exibido');
    }
  },

  atualizarStatus(mensagem, isError = false) {
    const statusDiv = document.getElementById('paymentStatus');
    if (statusDiv) {
      statusDiv.innerHTML = '';

      const container = document.createElement('div');
      container.className = `flex items-center justify-center space-x-2 ${isError ? 'text-red-600' : 'text-orange-600'}`;

      if (!isError) {
        const icon = document.createElement('svg');
        icon.className = 'w-5 h-5 animate-spin';
        icon.setAttribute('fill', 'none');
        icon.setAttribute('stroke', 'currentColor');
        icon.setAttribute('viewBox', '0 0 24 24');
        icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>';
        container.appendChild(icon);
      }

      const span = document.createElement('span');
      span.textContent = mensagem;
      container.appendChild(span);

      statusDiv.appendChild(container);
    }
  },

  async iniciarVerificacao() {
    if (!this.estado.transactionId) {
      console.warn('⚠️ Transaction ID não disponível para verificação');
      return;
    }

    if (this.estado.intervaloVerificacao) {
      console.warn('⚠️ Verificação já está em andamento');
      return;
    }

    console.log('🔄 Iniciando verificação de pagamento...', this.estado.transactionId);

    this.pararVerificacao();

    let tentativas = 0;
    const maxTentativas = 300;
    let ultimaConsulta = 0;
    const intervaloMinimo = 3000; // Reduzido para 3 segundos entre consultas

    // Função de verificação extraída para reutilização
    const fazerVerificacao = async () => {
      tentativas++;

      const agora = Date.now();
      const tempoDesdeUltimaConsulta = agora - ultimaConsulta;

      if (tempoDesdeUltimaConsulta < intervaloMinimo && ultimaConsulta > 0) {
        const tempoRestante = intervaloMinimo - tempoDesdeUltimaConsulta;
        console.log(`⏳ Aguardando ${Math.ceil(tempoRestante / 1000)}s antes da próxima consulta`);
        return;
      }

      if (tentativas > maxTentativas) {
        console.warn('⚠️ Limite de tentativas atingido. Parando verificação.');
        this.pararVerificacao();
        this.atualizarStatus('⏱️ Tempo de verificação expirado. Gere um novo QR Code.', true);
        return;
      }

      ultimaConsulta = agora;
      try {
        const response = await fetch(`${this.config.baseUrl}/pushinpay`, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'check-payment',
            transactionId: this.estado.transactionId
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('Erro ao verificar pagamento:', {
            status: response.status,
            error: errorData.error || errorData.message || 'Erro desconhecido'
          });

          if (response.status === 404) {
            console.log('⏳ Transação ainda não encontrada na API (aguardando criação)...');
          }
          return;
        }

        const data = await response.json();
        const transactionData = data.data || data;
        let status = transactionData.status?.toLowerCase();
        
        if (!status || status === 'unknown') {
          status = 'pending';
        }
        
        console.log('📊 Status do pagamento PushinPay:', status);

        const isPagamentoConfirmado = status === 'paid' || status === 'approved' || status === 'confirmed';

        if (isPagamentoConfirmado) {
          console.log('✅✅✅ PAGAMENTO CONFIRMADO! Redirecionando para agradecimento...');
          this.atualizarStatus('✅ Pagamento confirmado! Liberando acesso...');
          this.pararVerificacao();

          // Salvar pagamento confirmado no localStorage e no servidor
          const dadosPagamento = {
            transactionId: this.estado.transactionId,
            status: status,
            value: transactionData.amount || this.estado.valorAtual / 100,
            timestamp: new Date().toISOString(),
            plano: this.config.planoAtual
          };
          
          // Salvar no localStorage
          try {
            localStorage.setItem('pagamento_confirmado', JSON.stringify(dadosPagamento));
            console.log('✅ Pagamento salvo no localStorage para acesso futuro:', dadosPagamento.transactionId);
          } catch (error) {
            console.warn('⚠️ Erro ao salvar pagamento no localStorage:', error);
          }

          // Salvar no servidor
          try {
            const saveResponse = await fetch('/api/save-payment', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(dadosPagamento)
            });

            if (saveResponse.ok) {
              console.log('✅ Pagamento salvo no servidor com sucesso');
            } else {
              console.warn('⚠️ Erro ao salvar pagamento no servidor:', await saveResponse.text());
            }
          } catch (saveError) {
            console.warn('⚠️ Erro ao salvar pagamento no servidor:', saveError);
            // Não bloquear o fluxo se falhar
          }

          window.dispatchEvent(new CustomEvent('paymentConfirmed', {
            detail: dadosPagamento
          }));

          if (typeof fbq !== 'undefined') {
            try {
              fbq('track', 'Purchase', {
                value: this.estado.valorAtual / 100,
                currency: 'BRL',
                content_name: this.config.planoAtual
              });
              console.log('✅ Facebook Pixel Purchase event enviado');
            } catch (fbError) {
              console.warn('⚠️ Erro ao enviar Facebook Pixel:', fbError);
            }
          }

          const valorFormatado = (this.estado.valorAtual / 100).toFixed(2).replace('.', ',');
          const urlParams = new URLSearchParams();
          urlParams.set('id', this.estado.transactionId);
          urlParams.set('valor', valorFormatado);
          urlParams.set('status', status);

          this.atualizarStatus('🎉 Acesso liberado! Redirecionando...');

          setTimeout(() => {
            const urlAgradecimento = `/agradecimento?${urlParams.toString()}`;
            console.log('🔄 Redirecionando para:', urlAgradecimento);
            window.location.href = urlAgradecimento;
          }, 1000);

        } else if (status === 'pending') {
          console.log('⏳ Aguardando pagamento... Status: pending');
        } else if (status === 'canceled' || status === 'cancelled') {
          console.log('❌ Pagamento cancelado. Status:', status);
          this.atualizarStatus('❌ Pagamento cancelado. Gere um novo QR Code.', true);
          this.pararVerificacao();
        } else {
          console.log('⚠️ Status:', status, '- Continuando verificação...');
        }
      } catch (error) {
        console.error('Erro ao verificar pagamento:', error);
        ultimaConsulta = Date.now();
      }
    };

    // Fazer primeira verificação imediatamente
    fazerVerificacao();

    // Depois verificar a cada 3 segundos
    this.estado.intervaloVerificacao = setInterval(fazerVerificacao, 3000);

    console.log('✅ Verificação automática iniciada');
  },

  pararVerificacao() {
    if (this.estado.intervaloVerificacao) {
      clearInterval(this.estado.intervaloVerificacao);
      this.estado.intervaloVerificacao = null;
      console.log('⏸️ Verificação parada');
    }
  }
};

// Expor globalmente
if (typeof window !== 'undefined') {
  window.PushinPayReal = PushinPayReal;
}




