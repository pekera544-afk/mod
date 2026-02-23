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
  const isHostRef = useRef(isHost);
  const onStateChangeRef = useRef(onStateChange);

  const [playerReady, setPlayerReady] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [volume, setVolume] = useState(80);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [duration, setDuration] = useState(0);
  const [seekPos, setSeekPos] = useState(0);

  const syncIntervalRef = useRef(null);
  const sliderDraggingRef = useRef(false);
  const destroyedRef = useRef(false);
  const lastIsPlayingRef = useRef(null);

  useEffect(() => { roomStateRef.current = roomState; }, [roomState]);
  useEffect(() => { isHostRef.current = isHost; }, [isHost]);
  useEffect(() => { onStateChangeRef.current = onStateChange; }, [onStateChange]);

  const videoId = providerType === 'youtube' ? getVideoId(streamUrl) : '';

  useEffect(() => {
    if (!videoId || providerType !== 'youtube') return;
    destroyedRef.current = false;
    setPlayerReady(false);
    setSoundEnabled(false);
    setDuration(0);
    setSeekPos(0);
    lastIsPlayingRef.current = null;

    loadYTApi(() => {
      if (destroyedRef.current || !mountRef.current) return;

      if (playerRef.current) {
        try { playerRef.current.destroy(); } catch {}
        playerRef.current = null;
      }

      const div = document.createElement('div');
      div.style.width = '100%';
      div.style.height = '100%';
      mountRef.current.innerHTML = '';
      mountRef.current.appendChild(div);

      playerRef.current = new window.YT.Player(div, {
        width: '100%',
        height: '100%',
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
            const dur = p.getDuration?.() || 0;
            if (dur > 0) setDuration(dur);
            setSeekPos(syncTime);
            p.seekTo(syncTime, true);
            if (state?.isPlaying) p.playVideo();
            else p.pauseVideo();
            lastIsPlayingRef.current = state?.isPlaying;
            setPlayerReady(true);
          },
          onStateChange(e) {
            if (destroyedRef.current) return;
            const S = window.YT.PlayerState;
            const p = playerRef.current;
            if (!p) return;
            const dur = p.getDuration?.() || 0;
            if (dur > 0 && dur !== duration) setDuration(dur);

            if (!isHostRef.current) return;
            const t = p.getCurrentTime?.() || 0;
            if (e.data === S.PLAYING) {
              lastIsPlayingRef.current = true;
              onStateChangeRef.current?.({ isPlaying: true, currentTimeSeconds: t });
            } else if (e.data === S.PAUSED) {
              lastIsPlayingRef.current = false;
              onStateChangeRef.current?.({ isPlaying: false, currentTimeSeconds: t });
            } else if (e.data === S.ENDED) {
              lastIsPlayingRef.current = false;
              onStateChangeRef.current?.({ isPlaying: false, currentTimeSeconds: t });
            }
          },
        },
      });
    });

    return () => {
      destroyedRef.current = true;
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
      if (playerRef.current) {
        try { playerRef.current.destroy(); } catch {}
        playerRef.current = null;
      }
      setPlayerReady(false);
    };
  }, [videoId, providerType]);

  useEffect(() => {
    if (!playerReady) return;
    if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);

    syncIntervalRef.current = setInterval(() => {
      const p = playerRef.current;
      if (!p || destroyedRef.current) return;

      const t = p.getCurrentTime?.() || 0;
      const dur = p.getDuration?.() || 0;
      if (dur > 0) setDuration(dur);
      if (!sliderDraggingRef.current) setSeekPos(t);

      if (isHostRef.current) {
        onStateChangeRef.current?.({ currentTimeSeconds: t });
      } else {
        const state = roomStateRef.current;
        if (!state) return;
        const drift = Math.abs(t - (state.currentTimeSeconds || 0));
        if (drift > 8) {
          p.seekTo(state.currentTimeSeconds, true);
        }
      }
    }, 3000);

    return () => clearInterval(syncIntervalRef.current);
  }, [playerReady]);

  useEffect(() => {
    if (!playerReady || !playerRef.current || isHost) return;
    const state = roomState;
    if (!state) return;

    const p = playerRef.current;
    const targetPlaying = state.isPlaying;
    const cur = p.getCurrentTime?.() || 0;
    const drift = Math.abs(cur - (state.currentTimeSeconds || 0));

    if (drift > 8) {
      p.seekTo(state.currentTimeSeconds, true);
    }

    if (targetPlaying !== lastIsPlayingRef.current) {
      if (targetPlaying) p.playVideo?.();
      else p.pauseVideo?.();
      lastIsPlayingRef.current = targetPlaying;
    }
  }, [roomState?.isPlaying, roomState?.currentTimeSeconds, playerReady, isHost]);

  const enableSound = useCallback(() => {
    const p = playerRef.current;
    if (!p) return;
    p.unMute();
    p.setVolume(volume);
    setSoundEnabled(true);
  }, [volume]);

  const toggleMute = useCallback(() => {
    const p = playerRef.current;
    if (!p) return;
    if (!soundEnabled) {
      enableSound();
      return;
    }
    const cur = p.getVolume?.() || 0;
    if (cur === 0) {
      p.setVolume(volume > 0 ? volume : 80);
      setVolume(v => v > 0 ? v : 80);
    } else {
      p.setVolume(0);
    }
  }, [soundEnabled, volume, enableSound]);

  const handleVolumeChange = useCallback((val) => {
    const p = playerRef.current;
    if (!p) return;
    setVolume(val);
    if (!soundEnabled) {
      p.unMute();
      setSoundEnabled(true);
    }
    p.setVolume(val);
  }, [soundEnabled]);

  const handlePlayPause = useCallback(() => {
    if (!playerRef.current || !playerReady) return;
    const S = window.YT?.PlayerState;
    const state = playerRef.current.getPlayerState?.();
    if (state === S?.PLAYING) playerRef.current.pauseVideo();
    else playerRef.current.playVideo();
  }, [playerReady]);

  const handleSeekStart = () => { sliderDraggingRef.current = true; };
  const handleSeekChange = (e) => { setSeekPos(Number(e.target.value)); };
  const handleSeekEnd = (e) => {
    sliderDraggingRef.current = false;
    const t = Number(e.target.value);
    setSeekPos(t);
    if (playerRef.current && playerReady) {
      playerRef.current.seekTo(t, true);
      onStateChange?.({ currentTimeSeconds: t, isPlaying: lastIsPlayingRef.current });
    }
  };

  const applyUrl = () => {
    if (!newUrl.trim()) return;
    onUrlChange?.(newUrl.trim());
    setShowUrlInput(false);
    setNewUrl('');
  };

  const formatTime = (s) => {
    if (!s || isNaN(s) || s < 0) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const currentVolume = playerRef.current?.getVolume?.() ?? volume;
  const isMuted = !soundEnabled || currentVolume === 0;

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
    <div className="w-full h-full flex flex-col bg-black">
      <div className="relative flex-1 overflow-hidden min-h-0">
        <div ref={mountRef} className="w-full h-full" style={{ pointerEvents: isHost ? 'auto' : 'none' }} />

        {!videoId && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center p-4">
              <div className="text-5xl mb-3 opacity-40">🎬</div>
              <p className="text-gray-500 text-sm">URL girilmedi</p>
            </div>
          </div>
        )}

        {videoId && !soundEnabled && playerReady && (
          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
            <button
              onClick={enableSound}
              className="pointer-events-auto flex flex-col items-center gap-2 px-6 py-4 rounded-2xl transition-all hover:scale-105 active:scale-95"
              style={{ background: 'rgba(0,0,0,0.75)', border: '1px solid rgba(212,175,55,0.4)', backdropFilter: 'blur(8px)' }}>
              <span className="text-3xl">🔊</span>
              <span className="text-sm font-bold text-white">Sesi Aç</span>
              <span className="text-xs text-gray-400">Tıkla ve izle</span>
            </button>
          </div>
        )}

        {videoId && playerReady && (
          <div className="absolute bottom-2 left-2 right-2 flex items-center gap-2 px-3 py-1.5 rounded-lg"
            style={{ background: 'rgba(0,0,0,0.8)' }}>
            <span className="text-xs flex-shrink-0 tabular-nums text-gray-400">{formatTime(seekPos)}</span>
            <div className="flex-1" />
            <button onClick={toggleMute} className="text-white text-base px-1 flex-shrink-0">
              {isMuted ? '🔇' : volume < 40 ? '🔉' : '🔊'}
            </button>
            {soundEnabled && (
              <input
                type="range" min={0} max={100} value={volume}
                onChange={e => handleVolumeChange(Number(e.target.value))}
                className="w-20 cursor-pointer accent-yellow-500"
              />
            )}
          </div>
        )}
      </div>

      {isHost && (
        <div className="flex-shrink-0 px-3 pt-2 pb-1.5 flex flex-col gap-1.5"
          style={{ background: 'rgba(15,15,20,0.98)', borderTop: '1px solid rgba(212,175,55,0.15)' }}>
          {duration > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 flex-shrink-0 tabular-nums">{formatTime(seekPos)}</span>
              <input
                type="range" min={0} max={Math.floor(duration)} value={Math.floor(seekPos)}
                onMouseDown={handleSeekStart}
                onTouchStart={handleSeekStart}
                onChange={handleSeekChange}
                onMouseUp={handleSeekEnd}
                onTouchEnd={handleSeekEnd}
                className="flex-1 cursor-pointer accent-yellow-500"
                style={{ height: '4px' }}
              />
              <span className="text-xs text-gray-400 flex-shrink-0 tabular-nums">{formatTime(duration)}</span>
            </div>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={handlePlayPause} disabled={!playerReady}
              className="btn-gold px-3 py-1 text-xs flex items-center gap-1 disabled:opacity-40 flex-shrink-0">
              {roomState?.isPlaying ? '⏸ Duraklat' : '▶ Oynat'}
            </button>

            <button onClick={toggleMute} className="text-white text-sm px-1 flex-shrink-0">
              {isMuted ? '🔇' : volume < 40 ? '🔉' : '🔊'}
            </button>
            <input type="range" min={0} max={100} value={soundEnabled ? volume : 0}
              onChange={e => handleVolumeChange(Number(e.target.value))}
              className="w-16 cursor-pointer accent-yellow-500" />

            <div className="flex-1" />

            {!showUrlInput
              ? <button onClick={() => setShowUrlInput(true)} className="btn-outline-gold text-xs px-2 py-1 flex-shrink-0">🔗 URL</button>
              : <div className="flex gap-1 flex-1 min-w-0">
                  <input value={newUrl} onChange={e => setNewUrl(e.target.value)} placeholder="YouTube URL..."
                    className="flex-1 px-2 py-1 rounded-lg text-white text-xs outline-none min-w-0"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,175,55,0.2)' }} />
                  <button onClick={applyUrl} className="btn-gold px-2 text-xs flex-shrink-0">✓</button>
                  <button onClick={() => setShowUrlInput(false)} className="text-gray-400 px-1 text-xs flex-shrink-0">✕</button>
                </div>
            }
          </div>
        </div>
      )}
    </div>
  );
}
