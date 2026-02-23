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

function setupMediaSession(p, title) {
  if (!('mediaSession' in navigator)) return;
  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: title || 'Sinema Odası',
      artist: 'MOD CLUB',
    });
    navigator.mediaSession.setActionHandler('play', () => {
      try { p.playVideo?.(); } catch {}
    });
    navigator.mediaSession.setActionHandler('pause', () => {
      try { p.pauseVideo?.(); } catch {}
    });
    navigator.mediaSession.setActionHandler('stop', null);
    navigator.mediaSession.setActionHandler('seekbackward', (d) => {
      try { p.seekTo((p.getCurrentTime?.() || 0) - (d.seekOffset || 10), true); } catch {}
    });
    navigator.mediaSession.setActionHandler('seekforward', (d) => {
      try { p.seekTo((p.getCurrentTime?.() || 0) + (d.seekOffset || 10), true); } catch {}
    });
  } catch {}
}

export default function VideoPlayer({
  streamUrl, providerType, isHost, roomState,
  onStateChange, onSeek, onUrlChange, onResync, movieTitle
}) {
  const mountRef = useRef(null);
  const playerRef = useRef(null);
  const roomStateRef = useRef(roomState);
  const isHostRef = useRef(isHost);
  const onStateChangeRef = useRef(onStateChange);
  const onSeekRef = useRef(onSeek);
  const onResyncRef = useRef(onResync);

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
  const hiddenAtRef = useRef(null);
  const hiddenPosRef = useRef(null);

  useEffect(() => { roomStateRef.current = roomState; }, [roomState]);
  useEffect(() => { isHostRef.current = isHost; }, [isHost]);
  useEffect(() => { onStateChangeRef.current = onStateChange; }, [onStateChange]);
  useEffect(() => { onSeekRef.current = onSeek; }, [onSeek]);
  useEffect(() => { onResyncRef.current = onResync; }, [onResync]);

  const videoId = providerType === 'youtube' ? getVideoId(streamUrl) : '';

  const applyHDQuality = useCallback(() => {
    const p = playerRef.current;
    if (!p) return;
    try { p.setPlaybackQuality('hd1080'); } catch {}
    try { p.setPlaybackQualityRange?.('hd720', 'hd1080'); } catch {}
  }, []);

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
          vq: 'hd1080',
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
            applyHDQuality();
            p.seekTo(syncTime, true);
            if (state?.isPlaying) p.playVideo();
            else p.pauseVideo();
            lastIsPlayingRef.current = state?.isPlaying;
            setupMediaSession(p, movieTitle);
            setPlayerReady(true);
          },
          onStateChange(e) {
            if (destroyedRef.current) return;
            const S = window.YT.PlayerState;
            const p = playerRef.current;
            if (!p) return;
            const dur = p.getDuration?.() || 0;
            if (dur > 0 && dur !== duration) setDuration(dur);

            if (e.data === S.ENDED) {
              p.seekTo(0, true);
              if (isHostRef.current) {
                p.playVideo();
                onStateChangeRef.current?.({ isPlaying: true, currentTimeSeconds: 0 });
              }
              return;
            }
            if (!isHostRef.current) return;
            const t = p.getCurrentTime?.() || 0;
            if (e.data === S.PLAYING) {
              lastIsPlayingRef.current = true;
              onStateChangeRef.current?.({ isPlaying: true, currentTimeSeconds: t });
              try { if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing'; } catch {}
            } else if (e.data === S.PAUSED) {
              lastIsPlayingRef.current = false;
              onStateChangeRef.current?.({ isPlaying: false, currentTimeSeconds: t });
              try { if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused'; } catch {}
            }
          },
          onPlaybackQualityChange() {
            if (!destroyedRef.current && !document.hidden) applyHDQuality();
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
      if (!sliderDraggingRef.current && !document.hidden) setSeekPos(t);
      if (isHostRef.current) {
        onStateChangeRef.current?.({ currentTimeSeconds: t });
      } else {
        const state = roomStateRef.current;
        if (!state || document.hidden) return;
        const drift = Math.abs(t - (state.currentTimeSeconds || 0));
        if (drift > 8) p.seekTo(state.currentTimeSeconds, true);
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
    if (targetPlaying !== lastIsPlayingRef.current) {
      if (targetPlaying) p.playVideo?.();
      else p.pauseVideo?.();
      lastIsPlayingRef.current = targetPlaying;
    }
  }, [roomState?.isPlaying, playerReady, isHost]);

  useEffect(() => {
    if (!playerReady || !playerRef.current || isHost) return;
    if (!roomState?._seekedAt) return;
    const p = playerRef.current;
    const t = roomState.currentTimeSeconds || 0;
    p.seekTo(t, true);
    setSeekPos(t);
    if (roomState.isPlaying) p.playVideo?.();
    lastIsPlayingRef.current = roomState.isPlaying;
  }, [roomState?._seekedAt, playerReady, isHost]);

  useEffect(() => {
    const handleVisibility = () => {
      const p = playerRef.current;
      if (!p || destroyedRef.current) return;

      if (document.hidden) {
        hiddenAtRef.current = Date.now();
        hiddenPosRef.current = p.getCurrentTime?.() || 0;
        try { p.setPlaybackQuality('small'); } catch {}
      } else {
        applyHDQuality();
        if (hiddenAtRef.current !== null) {
          const elapsed = (Date.now() - hiddenAtRef.current) / 1000;
          const state = roomStateRef.current;
          const wasPlaying = state?.isPlaying ?? lastIsPlayingRef.current;
          if (wasPlaying && elapsed > 2) {
            const expectedPos = (hiddenPosRef.current || 0) + elapsed;
            const cur = p.getCurrentTime?.() || 0;
            const drift = Math.abs(cur - expectedPos);
            if (drift > 3) {
              p.seekTo(expectedPos, true);
              setSeekPos(expectedPos);
            }
          }
          hiddenAtRef.current = null;
          hiddenPosRef.current = null;
          onResyncRef.current?.();
        }
        const state = roomStateRef.current;
        if (state?.isPlaying && lastIsPlayingRef.current !== true) {
          p.playVideo?.();
          lastIsPlayingRef.current = true;
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [applyHDQuality]);

  const enableSound = useCallback(() => {
    const p = playerRef.current;
    if (!p) return;
    p.unMute();
    p.setVolume(volume);
    setSoundEnabled(true);
  }, [volume]);

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
      onSeekRef.current?.(t);
      onStateChangeRef.current?.({ currentTimeSeconds: t, isPlaying: lastIsPlayingRef.current });
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

  const isMuted = !soundEnabled || (playerRef.current?.getVolume?.() ?? volume) === 0;

  const volumeControls = (compact = false) => (
    <>
      <button onClick={() => {
        if (!soundEnabled) { enableSound(); return; }
        const p = playerRef.current;
        if (!p) return;
        const cur = p.getVolume?.() || 0;
        if (cur === 0) { p.setVolume(volume > 0 ? volume : 80); setVolume(v => v > 0 ? v : 80); }
        else { p.setVolume(0); }
      }} className={`text-white flex-shrink-0 ${compact ? 'text-base px-1' : 'text-base px-1'}`}>
        {isMuted ? '🔇' : volume < 40 ? '🔉' : '🔊'}
      </button>
      <input type="range" min={0} max={100} value={soundEnabled ? volume : 0}
        onChange={e => handleVolumeChange(Number(e.target.value))}
        className={`cursor-pointer accent-yellow-500 ${compact ? 'w-20' : 'w-16'}`}
        style={{ height: '4px' }} />
    </>
  );

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
          <div className="absolute bottom-3 right-3 z-20">
            <button onClick={enableSound}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all hover:scale-105 active:scale-95"
              style={{ background: 'rgba(0,0,0,0.85)', border: '1px solid rgba(212,175,55,0.55)', backdropFilter: 'blur(6px)' }}>
              <span className="text-base">🔊</span>
              <span className="text-xs font-bold text-white">Sesi Aç</span>
            </button>
          </div>
        )}

        {!isHost && videoId && playerReady && soundEnabled && (
          <div className="absolute bottom-3 right-3 z-20 flex items-center gap-2"
            style={{ background: 'rgba(0,0,0,0.7)', borderRadius: '10px', padding: '4px 8px', backdropFilter: 'blur(4px)' }}>
            {volumeControls(true)}
          </div>
        )}
      </div>

      {isHost && (
        <div className="flex-shrink-0 px-3 pt-2 pb-2 flex flex-col gap-2"
          style={{ background: 'rgba(12,12,18,0.98)', borderTop: '1px solid rgba(212,175,55,0.15)' }}>
          {duration > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 flex-shrink-0 tabular-nums w-10">{formatTime(seekPos)}</span>
              <input
                type="range" min={0} max={Math.floor(duration)} value={Math.floor(seekPos)}
                onMouseDown={handleSeekStart} onTouchStart={handleSeekStart}
                onChange={handleSeekChange}
                onMouseUp={handleSeekEnd} onTouchEnd={handleSeekEnd}
                className="flex-1 cursor-pointer accent-yellow-500"
                style={{ height: '4px' }}
              />
              <span className="text-xs text-gray-400 flex-shrink-0 tabular-nums w-10 text-right">{formatTime(duration)}</span>
            </div>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={handlePlayPause} disabled={!playerReady}
              className="btn-gold px-3 py-1.5 text-xs flex items-center gap-1 disabled:opacity-40 flex-shrink-0">
              {roomState?.isPlaying ? '⏸ Duraklat' : '▶ Oynat'}
            </button>
            {volumeControls(false)}
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
