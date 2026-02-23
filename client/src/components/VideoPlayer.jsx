import { useEffect, useRef, useState, useCallback } from 'react';

function getVideoId(url) {
  if (!url) return '';
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtube.com') && u.pathname.includes('embed')) {
      return u.pathname.split('/embed/')[1]?.split('?')[0] || '';
    }
    if (u.hostname.includes('youtube.com')) {
      return u.searchParams.get('v') || '';
    }
    if (u.hostname.includes('youtu.be')) {
      return u.pathname.slice(1);
    }
  } catch {
    const match = url.match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{11})/);
    if (match) return match[1];
  }
  return '';
}

function buildEmbedUrl(videoId, origin) {
  return `https://www.youtube.com/embed/${videoId}?enablejsapi=1&origin=${encodeURIComponent(origin)}&rel=0&playsinline=1&controls=0&modestbranding=1`;
}

let ytApiLoaded = false;
let ytApiCallbacks = [];

function loadYTApi(cb) {
  if (window.YT?.Player) { cb(); return; }
  ytApiCallbacks.push(cb);
  if (!ytApiLoaded) {
    ytApiLoaded = true;
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
    window.onYouTubeIframeAPIReady = () => {
      ytApiCallbacks.forEach(fn => fn());
      ytApiCallbacks = [];
    };
  }
}

export default function VideoPlayer({
  streamUrl,
  providerType,
  isHost,
  roomState,
  onStateChange,
  onUrlChange
}) {
  const containerRef = useRef(null);
  const ytPlayerRef = useRef(null);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(80);
  const [newUrl, setNewUrl] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [ytReady, setYtReady] = useState(false);
  const [needsClick, setNeedsClick] = useState(!isHost);
  const syncIntervalRef = useRef(null);
  const lastSyncRef = useRef(0);

  const videoId = providerType === 'youtube' ? getVideoId(streamUrl) : '';

  useEffect(() => {
    if (providerType !== 'youtube' || !videoId) return;

    let destroyed = false;

    loadYTApi(() => {
      if (destroyed || !containerRef.current) return;

      if (ytPlayerRef.current) {
        try { ytPlayerRef.current.destroy(); } catch {}
        ytPlayerRef.current = null;
      }

      const div = document.createElement('div');
      div.style.width = '100%';
      div.style.height = '100%';
      containerRef.current.innerHTML = '';
      containerRef.current.appendChild(div);

      ytPlayerRef.current = new window.YT.Player(div, {
        videoId,
        playerVars: {
          enablejsapi: 1,
          rel: 0,
          playsinline: 1,
          controls: 0,
          modestbranding: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: (e) => {
            if (destroyed) return;
            setYtReady(true);
            e.target.setVolume(volume);

            if (isHost) {
              e.target.playVideo();
            } else {
              const syncTime = roomState?.currentTimeSeconds || 0;
              e.target.seekTo(syncTime, true);
              if (roomState?.isPlaying) {
                e.target.playVideo();
                setNeedsClick(false);
              } else {
                e.target.pauseVideo();
              }
            }
          },
          onStateChange: (e) => {
            if (!isHost || destroyed) return;
            const YT = window.YT;
            if (e.data === YT.PlayerState.PLAYING) {
              const t = ytPlayerRef.current?.getCurrentTime() || 0;
              onStateChange?.({ isPlaying: true, currentTimeSeconds: t });
            } else if (e.data === YT.PlayerState.PAUSED) {
              const t = ytPlayerRef.current?.getCurrentTime() || 0;
              onStateChange?.({ isPlaying: false, currentTimeSeconds: t });
            }
          },
          onError: (e) => {
            console.warn('YT player error:', e.data);
          }
        }
      });
    });

    return () => {
      destroyed = true;
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
      if (ytPlayerRef.current) {
        try { ytPlayerRef.current.destroy(); } catch {}
        ytPlayerRef.current = null;
      }
    };
  }, [videoId, providerType]);

  useEffect(() => {
    if (!ytReady || !ytPlayerRef.current) return;
    ytPlayerRef.current.setVolume(muted ? 0 : volume);
  }, [volume, muted, ytReady]);

  useEffect(() => {
    if (!roomState || !ytPlayerRef.current || !ytReady || isHost) return;

    const player = ytPlayerRef.current;
    const now = Date.now();
    if (now - lastSyncRef.current < 500) return;
    lastSyncRef.current = now;

    const currentTime = player.getCurrentTime?.() || 0;
    const drift = Math.abs(currentTime - (roomState.currentTimeSeconds || 0));

    if (drift > 2) {
      player.seekTo?.(roomState.currentTimeSeconds, true);
    }

    if (roomState.isPlaying) {
      player.playVideo?.();
      setNeedsClick(false);
    } else {
      player.pauseVideo?.();
    }
  }, [roomState, ytReady, isHost]);

  useEffect(() => {
    if (!isHost || !ytReady) return;
    if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
    syncIntervalRef.current = setInterval(() => {
      if (!ytPlayerRef.current) return;
      const t = ytPlayerRef.current?.getCurrentTime?.() || 0;
      onStateChange?.({ currentTimeSeconds: t });
    }, 2000);
    return () => clearInterval(syncIntervalRef.current);
  }, [isHost, ytReady, onStateChange]);

  const handlePlayPause = useCallback(() => {
    if (!isHost || !ytPlayerRef.current || !ytReady) return;
    const state = ytPlayerRef.current.getPlayerState?.();
    const YT = window.YT;
    if (state === YT?.PlayerState?.PLAYING) {
      ytPlayerRef.current.pauseVideo();
    } else {
      ytPlayerRef.current.playVideo();
    }
  }, [isHost, ytReady]);

  const handleViewerStart = useCallback(() => {
    if (!ytPlayerRef.current || !ytReady) return;
    const syncTime = roomState?.currentTimeSeconds || 0;
    ytPlayerRef.current.seekTo(syncTime, true);
    ytPlayerRef.current.playVideo();
    ytPlayerRef.current.setVolume(volume);
    setNeedsClick(false);
  }, [ytReady, roomState, volume]);

  const applyNewUrl = () => {
    if (!newUrl.trim()) return;
    onUrlChange?.(newUrl.trim());
    setShowUrlInput(false);
    setNewUrl('');
  };

  if (providerType === 'external') {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-center p-6 gap-4"
        style={{ background: 'linear-gradient(135deg, #0a0a0f, #1a0a2e)' }}>
        <div className="text-5xl mb-2">🔗</div>
        <h3 className="font-bold text-white">Harici Platform Bağlantısı</h3>
        <p className="text-sm text-gray-400 max-w-xs">
          Bu oda harici bir platform kullanıyor. Aşağıdaki butona tıklayarak kendi cihazınızda açın.
        </p>
        {streamUrl && (
          <a href={streamUrl} target="_blank" rel="noopener noreferrer"
            className="btn-gold px-6 py-3 text-sm font-bold inline-flex items-center gap-2">
            🎬 Platformda Aç
          </a>
        )}
        <p className="text-xs text-gray-600 max-w-xs">
          Senkron sohbet ve emojiler bu odada aktif kalır.
        </p>
        {isHost && (
          <div className="mt-4 w-full max-w-xs">
            {!showUrlInput ? (
              <button onClick={() => setShowUrlInput(true)} className="btn-outline-gold text-xs px-4 py-2 w-full">
                🔗 Bağlantıyı Değiştir
              </button>
            ) : (
              <div className="flex gap-2">
                <input value={newUrl} onChange={e => setNewUrl(e.target.value)}
                  placeholder="Yeni URL..." type="url"
                  className="flex-1 px-3 py-2 rounded-lg text-white text-xs outline-none"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,175,55,0.2)' }} />
                <button onClick={applyNewUrl} className="btn-gold px-3 py-2 text-xs">✓</button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col">
      <div className="relative flex-1 bg-black overflow-hidden">
        <div ref={containerRef} className="w-full h-full" />

        {!videoId && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center p-4">
              <div className="text-5xl mb-3 opacity-40">🎬</div>
              <p className="text-gray-500 text-sm">URL girilmedi</p>
            </div>
          </div>
        )}

        {!isHost && needsClick && videoId && (
          <div className="absolute inset-0 flex items-center justify-center z-10"
            style={{ background: 'rgba(0,0,0,0.75)' }}>
            <button
              onClick={handleViewerStart}
              className="flex flex-col items-center gap-3 group"
            >
              <div className="w-20 h-20 rounded-full flex items-center justify-center transition-transform group-hover:scale-110"
                style={{ background: 'rgba(212,175,55,0.9)', boxShadow: '0 0 30px rgba(212,175,55,0.5)' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="#0f0f14">
                  <polygon points="5,3 19,12 5,21" />
                </svg>
              </div>
              <span className="text-white text-sm font-bold">Yayına Başla</span>
              <span className="text-gray-400 text-xs">Host ile senkronize izle</span>
            </button>
          </div>
        )}

        {!isHost && !needsClick && (
          <div className="absolute bottom-2 left-2 right-2 flex items-center gap-2 px-3 py-2 rounded-lg"
            style={{ background: 'rgba(0,0,0,0.7)' }}>
            <span className="text-xs text-gold-DEFAULT">🎮 Host kontrolü</span>
            <div className="flex-1" />
            <button onClick={() => setMuted(!muted)} className="text-white text-sm">
              {muted ? '🔇' : '🔊'}
            </button>
            <input
              type="range" min={0} max={100} value={muted ? 0 : volume}
              onChange={e => { setVolume(Number(e.target.value)); setMuted(false); }}
              className="w-20 cursor-pointer accent-yellow-500"
            />
          </div>
        )}
      </div>

      {isHost && (
        <div className="p-3 flex flex-wrap items-center gap-2"
          style={{ background: 'rgba(15,15,20,0.98)', borderTop: '1px solid rgba(212,175,55,0.15)' }}>
          <button
            onClick={handlePlayPause}
            disabled={!ytReady}
            className="btn-gold px-3 py-1.5 text-sm flex items-center gap-1 disabled:opacity-40"
          >
            {roomState?.isPlaying ? '⏸ Duraklat' : '▶ Oynat'}
          </button>

          <button onClick={() => setMuted(!muted)} className="text-white text-sm px-1">
            {muted ? '🔇' : '🔊'}
          </button>
          <input
            type="range" min={0} max={100} value={muted ? 0 : volume}
            onChange={e => { setVolume(Number(e.target.value)); setMuted(false); }}
            className="w-20 cursor-pointer accent-yellow-500"
          />

          <div className="flex-1" />

          {!showUrlInput ? (
            <button onClick={() => setShowUrlInput(true)} className="btn-outline-gold text-xs px-3 py-1.5">
              🔗 URL Değiştir
            </button>
          ) : (
            <div className="flex gap-1.5 flex-1">
              <input
                value={newUrl} onChange={e => setNewUrl(e.target.value)}
                placeholder="Yeni YouTube URL..."
                className="flex-1 px-2 py-1.5 rounded-lg text-white text-xs outline-none"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,175,55,0.2)' }}
              />
              <button onClick={applyNewUrl} className="btn-gold px-3 text-xs">✓</button>
              <button onClick={() => setShowUrlInput(false)} className="text-gray-400 px-2 text-xs">✕</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
