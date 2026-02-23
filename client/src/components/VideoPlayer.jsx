import { useEffect, useRef, useState, useCallback } from 'react';

function getVideoId(url) {
  if (!url) return '';
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtube.com') && u.pathname.includes('embed'))
      return u.pathname.split('/embed/')[1]?.split('?')[0] || '';
    if (u.hostname.includes('youtube.com')) return u.searchParams.get('v') || '';
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1);
  } catch {
    const m = url.match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{11})/);
    if (m) return m[1];
  }
  return '';
}

function loadYTApi(cb) {
  if (window.YT?.Player) { cb(); return; }
  const existing = window.__ytCallbacks || [];
  existing.push(cb);
  window.__ytCallbacks = existing;
  if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(s);
  }
  const prev = window.onYouTubeIframeAPIReady;
  window.onYouTubeIframeAPIReady = () => {
    if (prev) prev();
    (window.__ytCallbacks || []).forEach(fn => fn());
    window.__ytCallbacks = [];
  };
}

export default function VideoPlayer({ streamUrl, providerType, isHost, roomState, onStateChange, onUrlChange }) {
  const mountRef = useRef(null);
  const playerRef = useRef(null);
  const roomStateRef = useRef(roomState);
  const [playerReady, setPlayerReady] = useState(false);
  const [muted, setMuted] = useState(!isHost);
  const [volume, setVolume] = useState(80);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const syncRef = useRef(null);
  const destroyedRef = useRef(false);

  useEffect(() => { roomStateRef.current = roomState; }, [roomState]);

  const videoId = providerType === 'youtube' ? getVideoId(streamUrl) : '';

  useEffect(() => {
    if (!videoId || providerType !== 'youtube') return;
    destroyedRef.current = false;
    setPlayerReady(false);

    loadYTApi(() => {
      if (destroyedRef.current || !mountRef.current) return;

      if (playerRef.current) {
        try { playerRef.current.destroy(); } catch {}
        playerRef.current = null;
      }

      const div = document.createElement('div');
      mountRef.current.innerHTML = '';
      mountRef.current.appendChild(div);

      playerRef.current = new window.YT.Player(div, {
        videoId,
        playerVars: {
          autoplay: 1,
          mute: 1,
          controls: 0,
          rel: 0,
          playsinline: 1,
          modestbranding: 1,
          enablejsapi: 1,
          origin: window.location.origin,
        },
        events: {
          onReady(e) {
            if (destroyedRef.current) return;
            const p = e.target;
            const state = roomStateRef.current;
            const syncTime = state?.currentTimeSeconds || 0;
            p.seekTo(syncTime, true);
            p.playVideo();
            if (isHost) {
              p.unMute();
              p.setVolume(volume);
            } else {
              p.mute();
              p.setVolume(0);
            }
            setPlayerReady(true);
          },
          onStateChange(e) {
            if (!isHost || destroyedRef.current) return;
            const S = window.YT.PlayerState;
            const t = playerRef.current?.getCurrentTime?.() || 0;
            if (e.data === S.PLAYING) onStateChange?.({ isPlaying: true, currentTimeSeconds: t });
            else if (e.data === S.PAUSED) onStateChange?.({ isPlaying: false, currentTimeSeconds: t });
          },
        },
      });
    });

    return () => {
      destroyedRef.current = true;
      if (syncRef.current) clearInterval(syncRef.current);
      if (playerRef.current) {
        try { playerRef.current.destroy(); } catch {}
        playerRef.current = null;
      }
      setPlayerReady(false);
    };
  }, [videoId, providerType]);

  useEffect(() => {
    if (!playerReady || !playerRef.current || isHost) return;
    const p = playerRef.current;
    const cur = p.getCurrentTime?.() || 0;
    const drift = Math.abs(cur - (roomState?.currentTimeSeconds || 0));
    if (drift > 3) p.seekTo(roomState.currentTimeSeconds, true);
    if (roomState?.isPlaying) p.playVideo?.();
    else p.pauseVideo?.();
  }, [roomState?.isPlaying, roomState?.currentTimeSeconds, playerReady, isHost]);

  useEffect(() => {
    if (!playerReady || !isHost) return;
    if (syncRef.current) clearInterval(syncRef.current);
    syncRef.current = setInterval(() => {
      const t = playerRef.current?.getCurrentTime?.() || 0;
      onStateChange?.({ currentTimeSeconds: t });
    }, 2000);
    return () => clearInterval(syncRef.current);
  }, [playerReady, isHost, onStateChange]);

  useEffect(() => {
    if (!playerReady || !playerRef.current) return;
    if (muted) {
      playerRef.current.mute?.();
      playerRef.current.setVolume?.(0);
    } else {
      playerRef.current.unMute?.();
      playerRef.current.setVolume?.(volume);
    }
  }, [muted, volume, playerReady]);

  const handlePlayPause = useCallback(() => {
    if (!playerRef.current || !playerReady) return;
    const S = window.YT?.PlayerState;
    const state = playerRef.current.getPlayerState?.();
    if (state === S?.PLAYING) playerRef.current.pauseVideo();
    else playerRef.current.playVideo();
  }, [playerReady]);

  const applyUrl = () => {
    if (!newUrl.trim()) return;
    onUrlChange?.(newUrl.trim());
    setShowUrlInput(false);
    setNewUrl('');
  };

  if (providerType === 'external') {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-center p-6 gap-4"
        style={{ background: 'linear-gradient(135deg,#0a0a0f,#1a0a2e)' }}>
        <div className="text-5xl">🔗</div>
        <h3 className="font-bold text-white">Harici Platform Bağlantısı</h3>
        <p className="text-sm text-gray-400 max-w-xs">Aşağıdaki butona tıklayarak cihazınızda açın.</p>
        {streamUrl && (
          <a href={streamUrl} target="_blank" rel="noopener noreferrer"
            className="btn-gold px-6 py-3 text-sm font-bold inline-flex items-center gap-2">
            🎬 Platformda Aç
          </a>
        )}
        {isHost && (
          <div className="mt-2 w-full max-w-xs">
            {!showUrlInput
              ? <button onClick={() => setShowUrlInput(true)} className="btn-outline-gold text-xs px-4 py-2 w-full">🔗 Bağlantıyı Değiştir</button>
              : <div className="flex gap-2">
                  <input value={newUrl} onChange={e => setNewUrl(e.target.value)} placeholder="Yeni URL..." type="url"
                    className="flex-1 px-3 py-2 rounded-lg text-white text-xs outline-none"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,175,55,0.2)' }} />
                  <button onClick={applyUrl} className="btn-gold px-3 py-2 text-xs">✓</button>
                </div>
            }
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col">
      <div className="relative flex-1 bg-black overflow-hidden">
        <div ref={mountRef} className="w-full h-full" style={{ pointerEvents: isHost ? 'auto' : 'none' }} />

        {!videoId && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center p-4">
              <div className="text-5xl mb-3 opacity-40">🎬</div>
              <p className="text-gray-500 text-sm">URL girilmedi</p>
            </div>
          </div>
        )}

        {!isHost && videoId && (
          <div className="absolute bottom-2 left-2 right-2 flex items-center gap-2 px-3 py-2 rounded-lg"
            style={{ background: 'rgba(0,0,0,0.75)' }}>
            <span className="text-xs" style={{ color: '#d4af37' }}>🎮 Host kontrolü</span>
            <div className="flex-1" />
            <button onClick={() => setMuted(v => !v)} className="text-white text-lg px-2" title={muted ? 'Sesi Aç' : 'Sessize Al'}>
              {muted ? '🔇' : '🔊'}
            </button>
            {!muted && (
              <input type="range" min={0} max={100} value={volume}
                onChange={e => setVolume(Number(e.target.value))}
                className="w-20 cursor-pointer accent-yellow-500" />
            )}
          </div>
        )}
      </div>

      {isHost && (
        <div className="p-3 flex flex-wrap items-center gap-2"
          style={{ background: 'rgba(15,15,20,0.98)', borderTop: '1px solid rgba(212,175,55,0.15)' }}>
          <button onClick={handlePlayPause} disabled={!playerReady}
            className="btn-gold px-4 py-1.5 text-sm flex items-center gap-1 disabled:opacity-40">
            {roomState?.isPlaying ? '⏸ Duraklat' : '▶ Oynat'}
          </button>

          <button onClick={() => setMuted(v => !v)} className="text-white text-sm px-1">
            {muted ? '🔇' : '🔊'}
          </button>
          <input type="range" min={0} max={100} value={muted ? 0 : volume}
            onChange={e => { setVolume(Number(e.target.value)); setMuted(false); }}
            className="w-20 cursor-pointer accent-yellow-500" />

          <div className="flex-1" />

          {!showUrlInput
            ? <button onClick={() => setShowUrlInput(true)} className="btn-outline-gold text-xs px-3 py-1.5">🔗 URL Değiştir</button>
            : <div className="flex gap-1.5 flex-1">
                <input value={newUrl} onChange={e => setNewUrl(e.target.value)} placeholder="Yeni YouTube URL..."
                  className="flex-1 px-2 py-1.5 rounded-lg text-white text-xs outline-none"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,175,55,0.2)' }} />
                <button onClick={applyUrl} className="btn-gold px-3 text-xs">✓</button>
                <button onClick={() => setShowUrlInput(false)} className="text-gray-400 px-2 text-xs">✕</button>
              </div>
          }
        </div>
      )}
    </div>
  );
}
