import { useRef, useState } from 'react';

export default function LateralVideos() {
  const videoRefs = useRef({});
  const [playingVideos, setPlayingVideos] = useState({});
  const [loadedVideos, setLoadedVideos] = useState({});
  const [currentPlayingIndex, setCurrentPlayingIndex] = useState(null);
  
  const videos = [
    { src: 'https://i.imgur.com/cvtqIQ2.jpg', poster: 'https://i.imgur.com/cvtqIQ2.jpg', index: 0, type: 'image' },
    { src: 'https://i.imgur.com/gJH8BVD.jpg', poster: 'https://i.imgur.com/gJH8BVD.jpg', index: 1, type: 'image' },
    { src: 'https://i.imgur.com/xhv8SIQ.jpg', poster: 'https://i.imgur.com/xhv8SIQ.jpg', index: 2, type: 'image' },
    { src: 'https://i.imgur.com/X2vmwjl.jpg', poster: 'https://i.imgur.com/X2vmwjl.jpg', index: 3, type: 'image' },
    { src: 'https://i.imgur.com/tzZJeQV.jpg', poster: 'https://i.imgur.com/tzZJeQV.jpg', index: 4, type: 'image' },
    { src: 'https://i.imgur.com/m4h9xG3.jpg', poster: 'https://i.imgur.com/m4h9xG3.jpg', index: 5, type: 'image' },
    { src: 'https://i.imgur.com/f7mQ4LW.jpg', poster: 'https://i.imgur.com/f7mQ4LW.jpg', index: 6, type: 'image' },
    { src: 'https://i.imgur.com/C9PBGVs.jpg', poster: 'https://i.imgur.com/C9PBGVs.jpg', index: 7, type: 'image' },
    { src: 'https://i.imgur.com/0yOdoR5.jpg', poster: 'https://i.imgur.com/0yOdoR5.jpg', index: 8, type: 'image' }
  ];

  const handleMouseEnter = (index) => {
    const item = videos.find(v => v.index === index);
    if (item && item.type === 'image') return; // Não fazer nada para imagens
    
    const video = videoRefs.current[`video-${index}`];
    if (video && !video.dataset.keepPlaying) {
      if (!loadedVideos[index] && video.readyState === 0) {
        video.load();
        setLoadedVideos(prev => ({ ...prev, [index]: true }));
      }
      
      if (video.paused && !video.dataset.isPlaying) {
        video.dataset.isPlaying = 'true';
        const playPromise = video.play();
        
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              setPlayingVideos(prev => ({ ...prev, [index]: true }));
              video.dataset.isPlaying = 'false';
            })
            .catch(err => {
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
    const item = videos.find(v => v.index === index);
    if (item && item.type === 'image') return; // Não fazer nada para imagens
    
    const video = videoRefs.current[`video-${index}`];
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Não pausar se o vídeo está sendo reproduzido por clique (keepPlaying)
    if (!isMobile && video && !video.paused && !video.dataset.keepPlaying && video.dataset.isPlaying !== 'true' && currentPlayingIndex !== index) {
      video.dataset.isPlaying = 'false';
      const pausePromise = video.pause();
      if (pausePromise && typeof pausePromise.catch === 'function') {
        pausePromise.catch(() => {});
      }
      video.currentTime = 0;
      setPlayingVideos(prev => ({ ...prev, [index]: false }));
    }
  };

  const handleClick = (index) => {
    const item = videos.find(v => v.index === index);
    if (item && item.type === 'image') return; // Não fazer nada para imagens
    
    const video = videoRefs.current[`video-${index}`];
    
    if (video) {
      // Se o vídeo clicado já está reproduzindo, pausar
      if (!video.paused && currentPlayingIndex === index) {
        video.dataset.keepPlaying = 'false';
        video.dataset.isPlaying = 'false';
        const pausePromise = video.pause();
        if (pausePromise && typeof pausePromise.catch === 'function') {
          pausePromise.catch(() => {});
        }
        video.currentTime = 0;
        setPlayingVideos(prev => ({ ...prev, [index]: false }));
        setCurrentPlayingIndex(null);
        return;
      }
      
      // Pausar todos os outros vídeos primeiro
      videos.forEach((item) => {
        if (item.index !== index) {
          const otherVideo = videoRefs.current[`video-${item.index}`];
          if (otherVideo && !otherVideo.paused) {
            otherVideo.dataset.keepPlaying = 'false';
            otherVideo.dataset.isPlaying = 'false';
            const pausePromise = otherVideo.pause();
            if (pausePromise && typeof pausePromise.catch === 'function') {
              pausePromise.catch(() => {});
            }
            otherVideo.currentTime = 0;
            setPlayingVideos(prev => ({ ...prev, [item.index]: false }));
          }
        }
      });
      
      // Reproduzir o vídeo clicado
      if (video.paused) {
        if (!loadedVideos[index] && video.readyState === 0) {
          video.load();
          setLoadedVideos(prev => ({ ...prev, [index]: true }));
        }
        
        setTimeout(() => {
          if (video && video.paused && !video.dataset.isPlaying) {
            video.dataset.keepPlaying = 'true';
            video.dataset.isPlaying = 'true';
            const playPromise = video.play();
            
            if (playPromise !== undefined) {
              playPromise
                .then(() => {
                  setPlayingVideos(prev => ({ ...prev, [index]: true }));
                  setCurrentPlayingIndex(index);
                  video.dataset.isPlaying = 'false';
                })
                .catch(err => {
                  if (err.name !== 'AbortError' && err.name !== 'NotAllowedError') {
                    console.log('Erro ao reproduzir vídeo:', err);
                  }
                  setPlayingVideos(prev => ({ ...prev, [index]: false }));
                  setCurrentPlayingIndex(null);
                  video.dataset.keepPlaying = 'false';
                  video.dataset.isPlaying = 'false';
                });
            }
          }
        }, 100);
      }
    }
  };

  return (
    <div className="grid grid-cols-3 gap-3 mb-6">
      {videos.map((item) => (
        <div 
          key={item.index}
          className="relative rounded-2xl overflow-hidden aspect-square media-item"
          onMouseEnter={() => handleMouseEnter(item.index)}
          onMouseLeave={() => handleMouseLeave(item.index)}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleClick(item.index);
          }}
        >
          {item.type === 'image' ? (
            <img 
              src={item.src} 
              alt={`Media ${item.index + 1}`}
              className="w-full h-full object-cover rounded-lg media-blur transition-all duration-300"
              loading="lazy"
            />
          ) : (
            <>
              {/* Thumbnail/Preview */}
              <img 
                src={item.poster} 
                alt={`Preview ${item.index + 1}`}
                className={`w-full h-full object-cover rounded-lg media-blur transition-all duration-300 ${
                  playingVideos[item.index] ? 'opacity-0 absolute' : 'opacity-100'
                }`}
                loading="lazy"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
              {/* Vídeo */}
              <video 
                ref={(el) => {
                  if (el) {
                    videoRefs.current[`video-${item.index}`] = el;
                  }
                }}
                className={`w-full h-full object-cover rounded-lg transition-all duration-300 ${
                  playingVideos[item.index] 
                    ? 'opacity-100' 
                    : 'opacity-0 absolute top-0 left-0'
                } ${playingVideos[item.index] ? 'blur-0' : 'blur-5'}`}
                muted 
                loop
                playsInline
                preload="none"
                poster={item.poster}
              >
                <source src={item.src} type="video/mp4" />
                Seu navegador não suporta vídeos HTML5.
              </video>
            </>
          )}
          {/* Overlay */}
          <div 
            className="absolute inset-0 media-overlay rounded-lg transition-opacity duration-300 pointer-events-none" 
            style={{ 
              opacity: item.type === 'video' && playingVideos[item.index] ? 0.2 : 0.5 
            }}
          ></div>
          {/* Ícone de cadeado - apenas para vídeos */}
          {item.type !== 'image' && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <svg className={`w-12 h-12 transition-opacity duration-300 ${
                playingVideos[item.index] ? 'opacity-50' : 'opacity-70'
              }`} fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#6b7280' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
              </svg>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
