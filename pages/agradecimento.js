import Head from 'next/head';
import Script from 'next/script';
import { useRouter } from 'next/router';

export default function Agradecimento() {
  const router = useRouter();
  const { id, valor, status } = router.query;
  
  // Valores dinâmicos da URL ou padrões
  const transactionId = id || 'N/A';
  const valorExibido = valor || '9,90';
  const statusPagamento = status || 'paid';

  return (
    <>
      <Head>
        <title>Pagamento Confirmado - Luna Alves</title>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="description" content="Pagamento confirmado! Acesse seu conteúdo exclusivo da Luna Alves." />
        <meta name="robots" content="noindex, nofollow" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap" rel="stylesheet" />
      </Head>

      <Script src="https://cdn.tailwindcss.com" strategy="beforeInteractive" />

      <style jsx global>{`
        body { font-family: "Inter", sans-serif; }
        .gradient-bg {
            background: linear-gradient(135deg, #ff6b35 0%, #f7931e 50%, #ff1744 100%);
        }
        .pulse-animation {
            animation: pulse 2s infinite;
        }
        @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
        }
        .success-checkmark {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            display: block;
            stroke-width: 2;
            stroke: #4ade80;
            stroke-miterlimit: 10;
            margin: 0 auto;
            box-shadow: inset 0px 0px 0px #4ade80;
            animation: fill 0.4s ease-in-out 0.4s forwards, scale 0.3s ease-in-out 0.9s both;
        }
        .success-checkmark circle {
            stroke-dasharray: 166;
            stroke-dashoffset: 166;
            stroke-width: 2;
            stroke-miterlimit: 10;
            stroke: #4ade80;
            fill: none;
            animation: stroke 0.6s cubic-bezier(0.65, 0, 0.45, 1) forwards;
        }
        .success-checkmark path {
            transform-origin: 50% 50%;
            stroke-dasharray: 48;
            stroke-dashoffset: 48;
            animation: stroke 0.3s cubic-bezier(0.65, 0, 0.45, 1) 0.8s forwards;
        }
        @keyframes stroke {
            100% { stroke-dashoffset: 0; }
        }
        @keyframes scale {
            0%, 100% { transform: none; }
            50% { transform: scale3d(1.1, 1.1, 1); }
        }
        @keyframes fill {
            100% { box-shadow: inset 0px 0px 0px 30px #4ade80; }
        }
      `}</style>

      <div className="gradient-bg min-h-screen flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden">
          {/* Header de Sucesso */}
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-8 text-center">
            <div className="success-checkmark">
              <svg width="80" height="80" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="38" fill="none"/>
                <path d="M20 40l12 12 28-28" fill="none"/>
              </svg>
            </div>
            <h1 className="text-3xl font-bold mt-4 mb-2">Pagamento Confirmado!</h1>
            <p className="text-green-100">Obrigado por assinar o conteúdo da Luna Alves</p>
          </div>
          
          {/* Conteúdo Principal */}
          <div className="p-8">
            {/* Detalhes do Pagamento */}
            <div className="bg-gray-50 rounded-xl p-6 mb-6">
              <h3 className="font-bold text-gray-800 mb-4 text-center">Detalhes da Compra</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Produto:</span>
                  <span className="font-semibold">Acesso Vitalício</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Valor:</span>
                  <span className="font-semibold text-green-600">R$ {valorExibido}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className="font-semibold text-green-600">✓ Pago</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">ID da Transação:</span>
                  <span className="font-mono text-xs text-gray-500" id="transactionId">{transactionId}</span>
                </div>
              </div>
            </div>
            
            {/* Acesso ao Conteúdo */}
            <div className="mb-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">
                🎁 Seu conteúdo está pronto!
              </h3>
              <p className="text-gray-600 text-center mb-6">
                Clique no botão abaixo para acessar todo o conteúdo exclusivo
              </p>
              
              {/* Botão Principal - Conteúdo Exclusivo */}
              <a 
                href="https://www.luninhalves.shop/*"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full bg-gradient-to-r from-orange-500 to-pink-500 text-white font-bold py-5 px-6 rounded-lg hover:from-orange-600 hover:to-pink-600 transition-all transform hover:scale-105 pulse-animation text-center focus:outline-none focus:ring-4 focus:ring-orange-300"
                aria-label="Acessar conteúdo exclusivo no Google Drive"
              >
                <div className="flex items-center justify-center space-x-3">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 11h-6V5h-2v6H5v2h6v6h2v-6h6z"/>
                  </svg>
                  <span>🔓 ACESSAR CONTEÚDO EXCLUSIVO</span>
                </div>
              </a>
            </div>
            
            {/* O que você tem acesso */}
            <div className="bg-orange-50 rounded-xl p-6 mb-6">
              <h4 className="font-bold text-orange-800 mb-3 text-center">O que você tem acesso:</h4>
              <ul className="space-y-2 text-sm text-orange-700">
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  Acesso completo e vitalício
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  Todos os conteúdos exclusivos
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  Atualizações gratuitas
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  Suporte via WhatsApp
                </li>
              </ul>
            </div>
            
            {/* Botões Secundários */}
            <div className="grid grid-cols-2 gap-3 mt-6">
              <button 
                onClick={() => router.push('/')} 
                className="bg-gray-100 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                ← Voltar ao Site
              </button>
              <button 
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    const mensagem = `Olá! Acabei de fazer o pagamento.\\n\\nID da Transação: ${transactionId}\\n\\nPreciso de ajuda para acessar o conteúdo.`;
                    window.open(`https://wa.me/5511945843169?text=${encodeURIComponent(mensagem)}`, '_blank');
                  }
                }}
                className="bg-green-500 text-white py-3 px-4 rounded-lg hover:bg-green-600 transition-colors font-medium focus:outline-none focus:ring-2 focus:ring-green-300"
                aria-label="Abrir WhatsApp para pedir ajuda"
              >
                💬 Ajuda
              </button>
            </div>
            
            {/* Nota de Ajuda */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500">
                Problemas para acessar? <span className="text-green-600 font-medium">Clique em "Ajuda"</span> para falar no WhatsApp
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Scripts do Formulário */}
      <Script src="/js/database.js" strategy="afterInteractive" />
      <Script src="/js/lead-tracking.js" strategy="afterInteractive" />
      <Script src="/js/agradecimento.js" strategy="afterInteractive" />
    </>
  );
}