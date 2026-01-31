import { useEffect } from 'react';

export default function ModalPagamento({ aberto, fechar, valor, plano }) {
  // Bloquear scroll do body quando o modal estiver aberto
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    if (aberto) {
      // Salvar o scroll atual
      const scrollY = window.scrollY;
      const body = document.body;
      const html = document.documentElement;
      
      // Salvar estilos originais
      const originalBodyOverflow = body.style.overflow;
      const originalBodyPosition = body.style.position;
      const originalBodyTop = body.style.top;
      const originalBodyWidth = body.style.width;
      const originalHtmlOverflow = html.style.overflow;
      
      // Bloquear scroll de forma mais segura
      body.style.overflow = 'hidden';
      body.style.position = 'fixed';
      body.style.top = `-${scrollY}px`;
      body.style.width = '100%';
      html.style.overflow = 'hidden';
      
      // Salvar valores para restaurar depois
      body.setAttribute('data-scroll-y', scrollY.toString());
      body.setAttribute('data-original-overflow', originalBodyOverflow);
      body.setAttribute('data-original-position', originalBodyPosition);
      body.setAttribute('data-original-top', originalBodyTop);
      body.setAttribute('data-original-width', originalBodyWidth);
      html.setAttribute('data-original-overflow', originalHtmlOverflow);
    } else {
      // Restaurar scroll
      const body = document.body;
      const html = document.documentElement;
      const scrollY = body.getAttribute('data-scroll-y');
      
      // Restaurar estilos originais
      body.style.overflow = body.getAttribute('data-original-overflow') || '';
      body.style.position = body.getAttribute('data-original-position') || '';
      body.style.top = body.getAttribute('data-original-top') || '';
      body.style.width = body.getAttribute('data-original-width') || '';
      html.style.overflow = html.getAttribute('data-original-overflow') || '';
      
      // Remover atributos
      body.removeAttribute('data-scroll-y');
      body.removeAttribute('data-original-overflow');
      body.removeAttribute('data-original-position');
      body.removeAttribute('data-original-top');
      body.removeAttribute('data-original-width');
      html.removeAttribute('data-original-overflow');
      
      // Restaurar posição do scroll
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY));
      }
    }
    
    // Cleanup
    return () => {
      if (aberto) {
        const body = document.body;
        const html = document.documentElement;
        const scrollY = body.getAttribute('data-scroll-y');
        
        body.style.overflow = body.getAttribute('data-original-overflow') || '';
        body.style.position = body.getAttribute('data-original-position') || '';
        body.style.top = body.getAttribute('data-original-top') || '';
        body.style.width = body.getAttribute('data-original-width') || '';
        html.style.overflow = html.getAttribute('data-original-overflow') || '';
        
        body.removeAttribute('data-scroll-y');
        body.removeAttribute('data-original-overflow');
        body.removeAttribute('data-original-position');
        body.removeAttribute('data-original-top');
        body.removeAttribute('data-original-width');
        html.removeAttribute('data-original-overflow');
        
        if (scrollY) {
          window.scrollTo(0, parseInt(scrollY));
        }
      }
    };
  }, [aberto]);

  if (!aberto) return null;

  return (
    <div 
      id="paymentModal" 
      className="fixed inset-0 bg-black bg-opacity-50 z-[9999] overflow-y-auto"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
      onClick={(e) => {
        // Fechar modal ao clicar fora dele
        if (e.target.id === 'paymentModal') {
          fechar();
        }
      }}
    >
      <div className="flex items-center justify-center min-h-screen p-4 py-8" onClick={(e) => e.stopPropagation()}>
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto relative z-[10000]">
          {/* Header */}
          <div className="bg-gradient-to-r from-orange-500 to-pink-500 text-white p-6 rounded-t-2xl">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold">Pagamento PIX</h3>
              <button 
                onClick={fechar} 
                className="text-white hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-white rounded"
                aria-label="Fechar modal de pagamento"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
          </div>
          
          {/* Conteúdo */}
          <div className="p-6 flex-1 overflow-y-auto">
            {/* Status do Pagamento */}
            <div id="paymentStatus" className="mb-6">
              <div className="flex items-center justify-center space-x-2 text-orange-600">
                <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                </svg>
                <span>Gerando pagamento...</span>
              </div>
            </div>
            
            {/* QR Code */}
            <div className="text-center mb-6">
              <h4 className="text-lg font-semibold text-gray-800 mb-3">Escaneie o QR Code</h4>
              <div id="qrCode" className="flex justify-center">
                {/* QR Code será inserido aqui */}
              </div>
            </div>
            
            {/* Código PIX */}
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-gray-800 mb-3">Ou copie o código PIX</h4>
              <div className="bg-gray-100 rounded-lg p-3">
                <input 
                  type="text" 
                  id="pixCodeInput" 
                  readOnly 
                  className="w-full bg-transparent text-sm text-gray-700 border-none outline-none"
                  placeholder="Código PIX será gerado..."
                />
              </div>
              <button 
                onClick={async (e) => {
                  const input = document.getElementById('pixCodeInput');
                  const button = e.target;
                  if (input && input.value) {
                    try {
                      input.select();
                      await navigator.clipboard.writeText(input.value);
                      
                      // Feedback visual
                      const textoOriginal = button.textContent;
                      button.textContent = '✓ Copiado!';
                      button.classList.add('bg-green-500');
                      button.classList.remove('bg-blue-500');
                      
                      setTimeout(() => {
                        button.textContent = textoOriginal;
                        button.classList.remove('bg-green-500');
                        button.classList.add('bg-blue-500');
                      }, 2000);
                    } catch (err) {
                      // Fallback para navegadores antigos
                      input.select();
                      document.execCommand('copy');
                      const textoOriginal = button.textContent;
                      button.textContent = '✓ Copiado!';
                      setTimeout(() => {
                        button.textContent = textoOriginal;
                      }, 2000);
                    }
                  }
                }} 
                className="mt-2 w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-300"
                aria-label="Copiar código PIX"
              >
                Copiar Código PIX
              </button>
            </div>
            
            {/* Informações */}
            <div className="bg-orange-50 rounded-lg p-4 mb-6">
              <div className="flex items-center space-x-2 text-orange-800 mb-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"></path>
                </svg>
                <span className="font-semibold">Instruções</span>
              </div>
              <ul className="text-sm text-orange-700 space-y-1">
                <li>• Escaneie o QR Code com seu app bancário</li>
                <li>• Ou copie e cole o código PIX</li>
                <li>• O pagamento será confirmado automaticamente</li>
              </ul>
            </div>
            
            {/* Valor */}
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-800">R$ {valor.toFixed(2).replace('.', ',')}</div>
              <div className="text-sm text-gray-600">{plano}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
