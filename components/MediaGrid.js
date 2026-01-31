import { useRef, useState, useEffect } from 'react';

export default function MediaGrid() {
  const videoRefs = useRef({});
  const [playingVideos, setPlayingVideos] = useState({});
  const [loadedVideos, setLoadedVideos] = useState({});
  
  // Media com imagens do Imgur - leves e otimizadas
  const media = [
    { src: 'https://i.imgur.com/cvtqIQ2.jpg', type: 'image' },
    { src: 'https://i.imgur.com/gJH8BVD.jpg', type: 'image' },
    { src: 'https://i.imgur.com/xhv8SIQ.jpg', type: 'image' },
    { src: 'https://i.imgur.com/X2vmwjl.jpg', type: 'image' },
    { src: 'https://i.imgur.com/tzZJeQV.jpg', type: 'image' },
    { src: 'https://i.imgur.com/m4h9xG3.jpg', type: 'image' },
    { src: 'https://i.imgur.com/f7mQ4LW.jpg', type: 'image' },
    { src: 'https://i.imgur.com/C9PBGVs.jpg', type: 'image' },
    { src: 'https://i.imgur.com/0yOdoR5.jpg', type: 'image' },
  ];

  // Lazy load vídeos apenas quando entrarem na viewport
  useEffect(() => {
    // Verificar se estamos no cliente
    if (typeof window === 'undefined') return;
    
    // Verificar se IntersectionObserver está disponível
    if (!window.IntersectionObserver) {
      console.warn('IntersectionObserver não está disponível');
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const index = parseInt(entry.target.dataset.index);
          if (!isNaN(index)) {
            setLoadedVideos(prev => ({ ...prev, [index]: true }));
            observer.unobserve(entry.target);
          }
        }
      });
    }, {
      rootMargin: '50px' // Carregar 50px antes de entrar na viewport
    });

    // Aguardar um pouco para garantir que o DOM está pronto
    const timeoutId = setTimeout(() => {
      // Observar apenas vídeos
      media.forEach((item, index) => {
        if (item.type === 'video') {
          const element = document.querySelector(`[data-media-index="${index}"]`);
          if (element) {
            observer.observe(element);
          }
        }
      });
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      observer.disconnect();
    };
  }, []);

  const handleMouseEnter = (index) => {
    const video = videoRefs.current[`video-${index}`];
    if (video && !video.dataset.keepPlaying) {
      // Só reproduzir no hover se não estiver em modo "mantido" (por clique)
      if (!loadedVideos[index] && video.readyState === 0) {
        video.load();
        setLoadedVideos(prev => ({ ...prev, [index]: true }));
      }
      
      if (video.paused && !video.dataset.isPlaying) {
        video.dataset.isPlaying = 'true'; // Marcar que está tentando reproduzir
        const playPromise = video.play();
        
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              setPlayingVideos(prev => ({ ...prev, [index]: true }));
              video.dataset.isPlaying = 'false';
            })
            .catch(err => {
              // Ignorar erros de abort (normal quando pausa enquanto está carregando)
              if (err.name !== 'AbortError' && err.name !== 'NotAllowedError') {
                console.log('Erro ao reproduzir vídeo:', err);
              }
              setPlayingVideos(prev => ({ ...prev, [index]: false }));
              video.dataset.isPlaying = 'false';
            });
        }
      }
    }
  };

  const handleMouseLeave = (index) => {
    // No mobile, não pausar ao sair do hover
    const video = videoRefs.current[`video-${index}`];
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Se for desktop e não estiver em modo "mantido" (por clique), pausar
    if (!isMobile && video && !video.paused && !video.dataset.keepPlaying && video.dataset.isPlaying !== 'true') {
      video.dataset.isPlaying = 'false';
      const pausePromise = video.pause();
      if (pausePromise && typeof pausePromise.catch === 'function') {
        pausePromise.catch(() => {}); // Ignorar erros ao pausar
      }
      video.currentTime = 0; // Resetar para o início
      setPlayingVideos(prev => ({ ...prev, [index]: false }));
    }
  };

  const handleClick = (index, itemType) => {
    const video = videoRefs.current[`video-${index}`];
    
    if (video && itemType === 'video') {
      // Cancelar qualquer hover que esteja em andamento
      video.dataset.isPlaying = 'false';
      
      // Toggle play/pause ao clicar
      if (video.paused) {
        // Carregar vídeo se ainda não foi carregado
        if (!loadedVideos[index] && video.readyState === 0) {
          video.load();
          setLoadedVideos(prev => ({ ...prev, [index]: true }));
        }
        
        // Aguardar um pouco antes de iniciar para evitar conflitos
        setTimeout(() => {
          if (video && video.paused && !video.dataset.isPlaying) {
            video.dataset.keepPlaying = 'true'; // Marcar para manter reproduzindo
            video.dataset.isPlaying = 'true';
            const playPromise = video.play();
            
            if (playPromise !== undefined) {
              playPromise
                .then(() => {
                  setPlayingVideos(prev => ({ ...prev, [index]: true }));
                  video.dataset.isPlaying = 'false';
                })
                .catch(err => {
                  // Ignorar erros de abort
                  if (err.name !== 'AbortError' && err.name !== 'NotAllowedError') {
                    console.log('Erro ao reproduzir vídeo:', err);
                  }
                  setPlayingVideos(prev => ({ ...prev, [index]: false }));
                  video.dataset.keepPlaying = 'false';
                  video.dataset.isPlaying = 'false';
                });
            }
          }
        }, 100); // Pequeno delay para evitar conflitos
      } else {
        // Pausar se já está reproduzindo
        video.dataset.keepPlaying = 'false';
        video.dataset.isPlaying = 'false';
        const pausePromise = video.pause();
        if (pausePromise && typeof pausePromise.catch === 'function') {
          pausePromise.catch(() => {}); // Ignorar erros
        }
        video.currentTime = 0;
        setPlayingVideos(prev => ({ ...prev, [index]: false }));
      }
    }
  };

  return (
    <div className="grid grid-cols-3 gap-3 mb-6">
      {media.map((item, index) => (
        <div 
          key={index} 
          className="aspect-square relative media-item" 
          data-media-index={index}
          onMouseEnter={() => handleMouseEnter(index)}
          onMouseLeave={() => handleMouseLeave(index)}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            // No mobile, permitir clique para togglear vídeo
            handleClick(index, item.type);
          }}
        >
          {item.type === 'video' ? (
            <>
              {/* Thumbnail/Preview - sempre visível com blur */}
              <img 
                src={item.poster || item.src.replace('.mp4', '.jpg')} 
                alt={`Preview ${index + 1}`}
                className={`w-full h-full object-cover rounded-lg media-blur transition-all duration-300 ${
                  playingVideos[index] ? 'opacity-0 absolute' : 'opacity-100'
                }`}
                loading="lazy"
                onError={(e) => {
                  // Se a imagem de preview não existir, tentar gerar do vídeo
                  e.target.style.display = 'none';
                }}
              />
              {/* Vídeo - só aparece quando reproduzindo, com blur reduzido */}
              <video 
                ref={(el) => {
                  if (el) {
                    videoRefs.current[`video-${index}`] = el;
                  }
                }}
                className={`w-full h-full object-cover rounded-lg transition-all duration-300 ${
                  playingVideos[index] 
                    ? 'opacity-100' 
                    : 'opacity-0 absolute top-0 left-0'
                } ${playingVideos[index] ? 'blur-0' : 'blur-5'}`}
                muted 
                loop
                playsInline
                preload="none" // Não carregar até necessário
                poster={item.poster || item.src.replace('.mp4', '.jpg')} // Fallback para poster
              >
              <source src={item.src} type="video/mp4" />
              Seu navegador não suporta vídeos HTML5.
            </video>
            </>
          ) : (
            <img 
              src={item.src} 
              alt={`Media ${index + 1}`} 
              className="w-full h-full object-cover rounded-lg media-blur transition-all duration-300" 
              loading="lazy" // Lazy loading para imagens também
            />
          )}
          {/* Overlay escuro - sempre visível, mas mais sutil quando reproduzindo */}
          <div 
            className="absolute inset-0 media-overlay rounded-lg transition-opacity duration-300 pointer-events-none" 
            style={{ 
              opacity: item.type === 'video' && playingVideos[index] ? 0.2 : 0.5 
            }}
          ></div>
          {/* Ícone de câmera - sempre visível quando é vídeo */}
          {item.type === 'video' && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <svg className={`w-8 h-8 text-white transition-opacity duration-300 ${
                playingVideos[index] ? 'opacity-50' : 'opacity-70'
              }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
            </svg>
          </div>
          )}
        </div>
      ))}
    </div>
  );
}
