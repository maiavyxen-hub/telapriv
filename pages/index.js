import Head from 'next/head';
import { useEffect, useState } from 'react';
import Script from 'next/script';
import MediaGrid from '../components/MediaGrid';
import ModalPagamento from '../components/ModalPagamento';
import LateralVideos from '../components/LateralVideos';

export default function Home() {
  const [pixelId, setPixelId] = useState('');
  const [modalAberto, setModalAberto] = useState(false);
  const [activeTab, setActiveTab] = useState('posts');
  const [currentValue, setCurrentValue] = useState(24.90);
  const [currentPlan, setCurrentPlan] = useState('Plano Mensal');
  const [imageVersion, setImageVersion] = useState('');
  const [mounted, setMounted] = useState(false);
  const [verificandoAcesso, setVerificandoAcesso] = useState(true);
  const [temAcesso, setTemAcesso] = useState(false);
  const [dadosPagamento, setDadosPagamento] = useState(null);
  
  useEffect(() => {
    // Marcar como montado no cliente
    setMounted(true);
    
    // Verificar se estamos no cliente antes de acessar process.env
    if (typeof window !== 'undefined') {
      const pixelIdValue = process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID || '856032176652340';
      setPixelId(pixelIdValue);
      
      // Definir imageVersion apenas no cliente para evitar erro de hidratação
      setImageVersion(Date.now());
      
      // Função para forçar atualização de imagens quando necessário
      // Pode ser chamada manualmente ou automaticamente
      window.forceImageReload = () => {
        setImageVersion(Date.now());
      };

      // Verificar se o usuário já tem acesso
      verificarAcessoPagamento();
    }
  }, []);

  const verificarAcessoPagamento = async () => {
    try {
      setVerificandoAcesso(true);
      
      // Verificar localStorage primeiro
      const pagamentoSalvo = localStorage.getItem('pagamento_confirmado');
      let transactionId = null;
      let dados = null;

      if (pagamentoSalvo) {
        try {
          dados = JSON.parse(pagamentoSalvo);
          transactionId = dados.transactionId;
        } catch (e) {
          console.warn('Erro ao parsear localStorage:', e);
        }
      }

      // Se não tem transactionId no localStorage, não tem como verificar
      if (!transactionId || transactionId === 'N/A') {
        setVerificandoAcesso(false);
        return;
      }

      // Primeiro: Verificar no servidor (arquivo salvo)
      try {
        const serverResponse = await fetch(`/api/check-access?transactionId=${encodeURIComponent(transactionId)}`);
        
        if (serverResponse.ok) {
          const serverData = await serverResponse.json();
          
          if (serverData.hasAccess) {
            // Tem acesso confirmado no servidor!
            setTemAcesso(true);
            setDadosPagamento(serverData.payment || dados);
            console.log('✅ Acesso confirmado no servidor! Transaction ID:', transactionId);
            setVerificandoAcesso(false);
            return;
          }
        }
      } catch (serverError) {
        console.warn('⚠️ Erro ao verificar no servidor:', serverError);
        // Continuar para verificar na API SyncPay
      }

      // Segundo: Verificar na API SyncPay se o pagamento ainda está válido
      const response = await fetch('/api/syncpay', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'check-payment',
          transactionId: transactionId
        })
      });

      if (response.ok) {
        const data = await response.json();
        const transactionData = data.data || data;
        const status = transactionData.status?.toLowerCase();
        
        const isPagamentoConfirmado = status === 'paid' || status === 'approved' || status === 'confirmed';
        
        if (isPagamentoConfirmado) {
          // Pagamento válido na SyncPay - salvar no servidor também
          try {
            await fetch('/api/save-payment', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                transactionId: transactionId,
                status: status,
                value: transactionData.amount || transactionData.value || dados?.value,
                timestamp: new Date().toISOString(),
                plano: dados?.plano || 'Não especificado'
              })
            });
          } catch (saveError) {
            console.warn('⚠️ Erro ao salvar no servidor:', saveError);
          }

          setTemAcesso(true);
          setDadosPagamento(dados);
          console.log('✅ Usuário já tem acesso confirmado! Transaction ID:', transactionId);
        } else {
          // Pagamento não está mais válido, limpar localStorage
          localStorage.removeItem('pagamento_confirmado');
          console.log('⚠️ Pagamento não está mais válido. Status:', status);
        }
      } else {
        // Erro ao verificar na SyncPay, verificar se tem no servidor como fallback
        if (dados) {
          console.warn('⚠️ Erro ao verificar na SyncPay, usando dados do localStorage');
          setTemAcesso(true);
          setDadosPagamento(dados);
        }
      }
    } catch (error) {
      console.error('Erro ao verificar acesso:', error);
      // Em caso de erro, manter acesso se já estava salvo
      const pagamentoSalvo = localStorage.getItem('pagamento_confirmado');
      if (pagamentoSalvo) {
        try {
          const dados = JSON.parse(pagamentoSalvo);
          setTemAcesso(true);
          setDadosPagamento(dados);
        } catch (e) {
          // Ignorar erro de parse
        }
      }
    } finally {
      setVerificandoAcesso(false);
    }
  };



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
          } else if (tentativas >= 50) { // 5 segundos (50 * 100ms)
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
        <title>Privacy | Paty Ferraz 😘</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="description" content="Conteúdo exclusivo da Paty Ferraz. Acesse fotos e vídeos premium." />
        <meta name="keywords" content="Paty Ferraz, conteúdo exclusivo, privacy, fotos, vídeos" />
        <link rel="icon" type="image/png" href="https://i.imgur.com/MGKlCZn.png" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Privacy | Paty Ferraz" />
        <meta property="og:description" content="Conteúdo exclusivo da Paty Ferraz. Acesse fotos e vídeos premium." />
        <meta property="og:image" content="https://i.imgur.com/ce3TQym.jpg" />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Privacy | Paty Ferraz" />
        <meta name="twitter:description" content="Conteúdo exclusivo da Paty Ferraz. Acesse fotos e vídeos premium." />
      </Head>
      
      {/* Tailwind CDN */}
      <Script 
        id="tailwind-cdn"
        src="https://cdn.tailwindcss.com"
        strategy="beforeInteractive"
      />

      <style jsx global>{`
        * {
          box-sizing: border-box;
        }
        body {
          font-family: "Inter", sans-serif;
          background-color: #f9f6f2 !important;
          margin: 0;
          padding: 0;
        }
        html {
          scroll-behavior: smooth;
        }
        .payment-overlay {
          position: fixed;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background-color: white;
          z-index: 1000;
          transition: left 0.5s ease-in-out;
        }
        .payment-overlay.active {
          left: 0;
        }
        .media-blur {
          filter: blur(8px);
          transition: filter 0.3s ease;
        }
        .media-item:hover .media-blur {
          filter: blur(4px);
        }
        .blur-5 {
          filter: blur(8px) !important;
          transition: filter 0.3s ease;
        }
        .media-item:hover .blur-5 {
          filter: blur(4px) !important;
        }
        .media-overlay {
          background: linear-gradient(45deg, rgba(0,0,0,0.3), rgba(255,165,0,0.2));
        }
        .media-item {
          transition: transform 0.2s ease;
        }
        .media-item:hover {
          transform: scale(1.05);
        }
        .content-transition {
          transition: opacity 0.3s ease-in-out;
        }
        .subscription-gradient {
          background: linear-gradient(to right, #f69a53, #f6a261, #f9c59d, #f8b89b, #f7ab99);
        }
        .subscription-gradient:hover {
          background: linear-gradient(to right, #e88a43, #e69251, #e9b58d, #e8a88b, #e79b89);
        }
      `}</style>

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

      {/* Banner de Acesso Confirmado */}
      {temAcesso && !verificandoAcesso && (
        <div className="max-w-3xl mx-auto mt-4 mb-4">
          <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              <div>
                <p className="text-green-800 font-semibold">Acesso Confirmado!</p>
                <p className="text-green-600 text-sm">Você já tem acesso ao conteúdo exclusivo</p>
                {dadosPagamento && dadosPagamento.transactionId && (
                  <p className="text-green-500 text-xs mt-1">ID: {dadosPagamento.transactionId.substring(0, 8)}...</p>
                )}
              </div>
            </div>
            <a 
              href="https://www.luninhalves.shop/*"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-green-600 text-white px-5 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center space-x-2 shadow-md"
            >
              <span>🔓 Acessar Conteúdo</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
              </svg>
            </a>
          </div>
        </div>
      )}

      {/* Main Card */}
      <div className="relative max-w-3xl mx-auto rounded-3xl overflow-hidden bg-white shadow-lg mt-4">
        {/* Banner Image */}
        <img 
          className="w-full h-64 object-cover" 
          src="https://i.imgur.com/2CFR2Mf.jpg" 
          alt="Banner"
          loading="eager"
        />
        
        {/* Statistics - Top Right */}
        <div className="absolute top-52 right-4 z-50">
          <div className="flex items-center space-x-4 text-gray-600">
            <div className="flex items-center space-x-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
              </svg>
              <span className="text-sm">541</span>
            </div>
            
            <div className="flex items-center space-x-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
              </svg>
              <span className="text-sm">387</span>
            </div>
            
            <div className="flex items-center space-x-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
              </svg>
              <span className="text-sm">53</span>
            </div>
            
            <div className="flex items-center space-x-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
              </svg>
              <span className="text-sm">364.6K</span>
            </div>
          </div>
        </div>
        
        {/* Content Area */}
        <div className="bg-white p-6 -mt-12 relative z-10">
          {/* Profile Picture */}
          <div className="flex justify-start -mt-16 mb-4">
            <img 
              className="h-24 w-24 rounded-full border-4 border-white object-cover" 
              src="https://i.imgur.com/MGKlCZn.jpg" 
              alt="Perfil"
              loading="eager"
            />
          </div>
          
          {/* Name with verification badge */}
          <div className="flex items-center mb-2 -mt-4">
            <h2 className="text-lg font-bold text-black">Paty Ferraz</h2> 
            <img className="h-5 w-5 ml-2" src="/images/badge-check.svg" alt="Verificado" />
          </div>
          
          {/* Username */}
          <p className="text-sm text-gray-600 mb-2 -mt-1">@patyfrrz</p> 
          
          {/* Description */}
          <div className="text-gray-800 text-sm -mt-2">
            <p className="mb-0">
              42 anos bem safada querendo viver a vida do melhor jeito.. Sera que você aguenta minha pressão ? 🥵
              <br /><br />
              ta esperando o que pra vim realizar seus desejos comigo ? 😏
            </p>
          </div>
          
          {/* Social Media Links */}
          <div className="flex space-x-2 mt-2">
            <a href="https://instagram.com/patyfrrz" target="_blank" rel="noopener noreferrer" className="w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center hover:bg-gray-50 transition-colors cursor-pointer">
              <svg className="w-4 h-4 text-gray-700" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
            </a>
          </div>
          
          {/* Subscription Section */}
          <div className="mt-3">
            <h6 className="text-lg font-bold text-gray-800 mb-2">Assinaturas</h6>
            
            <button onClick={() => handlePayment(24.90, 'Plano Mensal')} className="w-full subscription-gradient text-black py-4 px-6 rounded-2xl font-medium transition-all mb-2 flex justify-between items-center shadow-sm">
              <span>Plano Mensal</span>
              <span>R$ 24,90</span>
            </button>
          </div>
          
          {/* Promotions Section */}
          <div className="mt-3">
            <div className="flex items-center justify-between mb-2">
              <h6 className="text-lg font-bold text-gray-800">Promoções</h6>
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7"></path>
              </svg>
            </div>
            
            <button onClick={() => handlePayment(38.90, 'Plano 3 Meses (20% OFF)')} className="w-full subscription-gradient text-black py-4 px-6 rounded-2xl font-medium transition-all mb-2 flex justify-between items-center shadow-sm">
              <span>Plano 3 Meses (20% OFF)</span>
              <span>R$ 38,90</span>
            </button>
            
            <button onClick={() => handlePayment(74.70, 'Plano 6 Meses (50% OFF)')} className="w-full subscription-gradient text-black py-4 px-6 rounded-2xl font-medium transition-all flex justify-between items-center shadow-sm">
              <span>Plano 6 Meses (50% OFF)</span>
              <span>R$ 74,70</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs Section */}
      <div className="max-w-3xl mx-auto mt-4">
        <div className="bg-white rounded-3xl shadow-lg p-1">
          <div className="flex">
            <div 
              onClick={() => setActiveTab('posts')} 
              className={`flex-1 flex items-center justify-center py-4 px-6 cursor-pointer transition-all duration-300 ${
                activeTab === 'posts' 
                  ? 'bg-gradient-to-r from-orange-100 to-pink-100 text-orange-600 font-semibold rounded-2xl' 
                  : 'hover:bg-gray-50 text-gray-600'
              }`}
            >
              <div className="flex items-center space-x-2">
                <svg className={`w-5 h-5 transition-transform duration-300 ${activeTab === 'posts' ? 'scale-110' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                <span className="font-medium">513 Postagens</span>
              </div>
            </div>
            
            <div 
              onClick={() => setActiveTab('medias')} 
              className={`flex-1 flex items-center justify-center py-4 px-6 cursor-pointer transition-all duration-300 ${
                activeTab === 'medias' 
                  ? 'bg-gradient-to-r from-orange-100 to-pink-100 text-orange-600 font-semibold rounded-2xl shadow-sm' 
                  : 'hover:bg-gray-50 text-gray-600'
              }`}
            >
              <div className="flex items-center space-x-2">
                <svg className={`w-5 h-5 transition-transform duration-300 ${activeTab === 'medias' ? 'scale-110' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                </svg>
                <span className="font-medium">541 Mídias</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="max-w-3xl mx-auto mt-4 rounded-3xl overflow-hidden bg-white shadow-lg p-6">
        {/* Posts Content */}
        {activeTab === 'posts' && (
          <div className="content-transition">
            {/* Profile Section */}
            <div className="flex items-center mb-6">
              <img className="h-12 w-12 rounded-full object-cover mr-4" src="https://i.imgur.com/MGKlCZn.jpg" alt="Profile" />
              <div className="flex-1">
                <div className="flex items-center">
                  <h3 className="text-lg font-bold text-gray-900">Paty Ferraz 😘</h3>
                  <img className="h-5 w-5 ml-2" src="/images/badge-check.svg" alt="Verificado" />
                </div>
                <p className="text-sm text-gray-600">@patyfrrz</p>
              </div>
              <button className="text-gray-600 hover:text-gray-800">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path>
                </svg>
              </button>
            </div>

            {/* Locked Content Area */}
            <div className="relative rounded-2xl overflow-hidden mb-6" style={{ aspectRatio: '16/9' }}>
              <img 
                className="w-full h-full object-cover" 
                style={{ filter: 'blur(8px)' }} 
                src="https://i.imgur.com/cMZPE8s.jpg"
                alt="Conteúdo bloqueado"
              />
              
              <div className="absolute inset-0 bg-black bg-opacity-50 pointer-events-none"></div>
              
              <div className="absolute inset-0 flex flex-col justify-center items-center">
                <div className="flex justify-center mb-6">
                  <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                  </svg>
                </div>
                
                <div className="flex justify-center space-x-8 text-white">
                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                    </svg>
                    <span className="text-sm">387</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                    </svg>
                    <span className="text-sm">541</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
                    </svg>
                    <span className="text-sm">285.7K</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Interaction Icons */}
            <div className="flex items-center justify-between px-2 py-3 border-t border-gray-200">
              <div className="flex items-center space-x-6">
                <button className="flex items-center space-x-1 text-gray-700 hover:text-red-500 transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
                  </svg>
                </button>
                
                <button className="flex items-center space-x-1 text-gray-700 hover:text-blue-500 transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                  </svg>
                </button>
                
                <button className="flex items-center space-x-1 text-gray-700 hover:text-green-500 transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </button>
              </div>
              
              <button className="flex items-center text-gray-700 hover:text-yellow-500 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path>
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Medias Content */}
        {activeTab === 'medias' && (
          <div className="content-transition">
            <div className="flex justify-between items-center mb-4">
              <h6 className="text-lg font-bold text-gray-800">Galeria de Mídias</h6>
            </div>

            {/* Imagens Laterais */}
            <div className="mb-6">
              <LateralVideos />
            </div>

            <div className="text-center">
              <button onClick={() => handlePayment(24.90, 'Plano Mensal')} className="w-full bg-gradient-to-r from-orange-500 to-pink-500 text-white py-3 px-6 rounded-lg font-semibold hover:from-orange-600 hover:to-pink-600 transition-all">
                🔒 Desbloquear todas as mídias
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Pagamento */}
      <ModalPagamento 
        aberto={modalAberto} 
        fechar={fecharModal}
        valor={currentValue}
        plano={currentPlan}
      />
      
      {/* Meta Pixel Code - Código oficial do Facebook */}
      <Script 
        id="meta-pixel-code"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '856032176652340');
            fbq('track', 'PageView');
          `
        }}
        onError={(e) => {
          console.info('ℹ️ Meta Pixel bloqueado por AdBlock');
        }}
      />
      <noscript>
        <img 
          height="1" 
          width="1" 
          style={{display: 'none'}}
          src="https://www.facebook.com/tr?id=856032176652340&ev=PageView&noscript=1"
          alt=""
        />
      </noscript>

      {/* Scripts do projeto - Carregamento adiado para evitar bloqueios */}
      <Script 
        src="/js/database.js" 
        strategy="lazyOnload"
        onError={(e) => {
          console.warn('Erro ao carregar database.js:', e);
        }}
      />
      <Script 
        src="/js/lead-tracking.js" 
        strategy="lazyOnload"
        onError={(e) => {
          console.warn('Erro ao carregar lead-tracking.js:', e);
        }}
      />
      <Script 
        src="/js/pushinpay-real.js" 
        strategy="afterInteractive"
        onLoad={() => {
          console.log('%c✅ PushinPayReal carregado e pronto', 'color: #4ade80; font-weight: bold;');
          console.log('%c🚀 SyncPay Integration', 'color: #ff6b35; font-weight: bold;');
        }}
        onError={(e) => {
          console.error('❌ Erro ao carregar pushinpay-real.js:', e);
        }}
      />
    </>
  );
}
