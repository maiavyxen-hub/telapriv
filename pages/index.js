import Head from 'next/head';
import { useState } from 'react';
import Script from 'next/script';
import ModalPagamento from '../components/ModalPagamento';

export default function Home() {
  const [modalAberto, setModalAberto] = useState(false);
  const [currentValue, setCurrentValue] = useState(24.90);
  const [currentPlan, setCurrentPlan] = useState('Plano Mensal');

  const handlePayment = async (valor, plano) => {
    setCurrentValue(valor);
    setCurrentPlan(plano);
    setModalAberto(true);

    // Aguardar até que o script PushinPayReal esteja disponível
    const aguardarPushinPay = () => {
      return new Promise((resolve, reject) => {
        if (typeof window !== 'undefined' && window.PushinPayReal) {
          resolve(window.PushinPayReal);
          return;
        }
        
        // Tentar aguardar até 5 segundos
        let tentativas = 0;
        const intervalo = setInterval(() => {
          tentativas++;
          if (typeof window !== 'undefined' && window.PushinPayReal) {
            clearInterval(intervalo);
            resolve(window.PushinPayReal);
          } else if (tentativas >= 50) {
            clearInterval(intervalo);
            reject(new Error('PushinPayReal não carregou a tempo'));
          }
        }, 100);
      });
    };

    try {
      const pushinPay = await aguardarPushinPay();
      pushinPay.atualizarValorPlano(valor, plano);
      await pushinPay.criarPix();
    } catch (error) {
      console.error('❌ Erro ao processar pagamento:', error);
      alert('Erro ao gerar pagamento. Por favor, recarregue a página e tente novamente.');
    }
  };

  const fecharModal = () => {
    setModalAberto(false);
    if (typeof window !== 'undefined' && window.PushinPayReal) {
      window.PushinPayReal.pararVerificacao();
    }
  };

  return (
    <>
      <Head>
        <title>Paty Sync - Pagamento</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="icon" type="image/png" href="/images/favicon.png" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div style={{ backgroundColor: '#f9f6f2' }}>
          <div className="max-w-3xl mx-auto px-4 py-4">
            <div className="flex justify-center items-center">
              <div className="flex items-center">
                <span className="text-2xl font-bold text-gray-900">privacy</span>
                <div className="w-2 h-2 bg-orange-500 rounded-full ml-0.5"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Linha separadora */}
        <div className="border-t border-gray-200"></div>

        {/* Main Card */}
        <div className="relative max-w-3xl mx-auto rounded-3xl overflow-hidden bg-white shadow-lg mt-4">
          {/* Banner Image */}
          <img 
            className="w-full h-64 object-cover" 
            src="https://i.imgur.com/2CFR2Mf.jpg" 
            alt="Banner"
            loading="eager"
          />
        </div>

        <div className="max-w-2xl mx-auto p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Sistema de Pagamento</h1>
          
          <div className="bg-white rounded-lg shadow-md p-6 mb-4">
            <h2 className="text-xl font-semibold mb-4">Escolha um Plano</h2>
            
            <button 
              onClick={() => handlePayment(24.90, 'Plano Mensal')} 
              className="w-full bg-gradient-to-r from-orange-500 to-pink-500 text-white py-4 px-6 rounded-lg font-medium transition-all mb-2 hover:from-orange-600 hover:to-pink-600"
            >
              <div className="flex justify-between items-center">
                <span>Plano Mensal</span>
                <span>R$ 24,90</span>
              </div>
            </button>
            
            <button 
              onClick={() => handlePayment(59.76, 'Plano 3 Meses (20% OFF)')} 
              className="w-full bg-gradient-to-r from-orange-500 to-pink-500 text-white py-4 px-6 rounded-lg font-medium transition-all mb-2 hover:from-orange-600 hover:to-pink-600"
            >
              <div className="flex justify-between items-center">
                <span>Plano 3 Meses (20% OFF)</span>
                <span>R$ 59,76</span>
              </div>
            </button>
            
            <button 
              onClick={() => handlePayment(74.70, 'Plano 6 Meses (50% OFF)')} 
              className="w-full bg-gradient-to-r from-orange-500 to-pink-500 text-white py-4 px-6 rounded-lg font-medium transition-all hover:from-orange-600 hover:to-pink-600"
            >
              <div className="flex justify-between items-center">
                <span>Plano 6 Meses (50% OFF)</span>
                <span>R$ 74,70</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Pagamento */}
      <ModalPagamento 
        aberto={modalAberto} 
        fechar={fecharModal}
        valor={currentValue}
        plano={currentPlan}
      />
      
      {/* Script do SyncPay */}
      <Script 
        src="/js/pushinpay-real.js" 
        strategy="afterInteractive"
        onLoad={() => {
          console.log('✅ SyncPay carregado e pronto');
        }}
        onError={(e) => {
          console.error('❌ Erro ao carregar pushinpay-real.js:', e);
        }}
      />
    </>
  );
}
