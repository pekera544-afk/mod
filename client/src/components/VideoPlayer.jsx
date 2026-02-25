import { useEffect, useRef, useState, useCallback } from 'react';
import { brand } from '../config/brand';

/* ─── URL helpers ─────────────────────────────────────────────────────────── */
function getYTVideoId(url) {
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

function isDirectVideoUrl(url) {
  if (!url) return false;
  return /\.(mp4|webm|ogg|mov|mkv|m3u8|ts)(\?|#|$)/i.test(url) ||
    url.includes('/hls/') || url.includes('/dash/') || url.includes('manifest') ||
    url.includes('.m3u8') || url.includes('/stream');
}

function resolveProvider(url, hintType) {
  if (!url) return hintType || 'youtube';
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (isDirectVideoUrl(url)) return 'video';
  if (hintType === 'youtube') return 'youtube';
  if (hintType === 'video') return 'video';
  return 'external';
}

/* ─── YouTube IFrame API loader ──────────────────────────────────────────── */
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

/* ─── HLS.js dynamic loader ──────────────────────────────────────────────── */
let hlsPromise = null;
function loadHls() {
  if (hlsPromise) return hlsPromise;
  hlsPromise = new Promise((resolve) => {
    if (window.Hls) { resolve(window.Hls); return; }
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/hls.js@latest/dist/hls.min.js';
    s.onload = () => resolve(window.Hls);
    s.onerror = () => resolve(null);
    document.head.appendChild(s);
  });
  return hlsPromise;
}

/* ─── Media session helper ───────────────────────────────────────────────── */
function setupMediaSession(title) {
  if (!('mediaSession' in navigator)) return;
  try {
    navigator.mediaSession.metadata = new MediaMetadata({ title: title || 'Sinema Odası', artist: brand.name });
  } catch {}
}

/* ─── Smooth drift correction ────────────────────────────────────────────── */
function applyDrift(getTime, setTime, setRate, targetTime, isPlaying) {
  if (!isPlaying) return;
  const cur = getTime();
  if (cur === null) return;
  const drift = targetTime - cur;
  const absDrift = Math.abs(drift);
  if (absDrift < 0.2) return;
  if (absDrift > 3) {
    setTime(targetTime);
  } else {
    const rate = drift > 0 ? 1.08 : 0.92;
    setRate(rate);
    setTimeout(() => setRate(1.0), Math.min(absDrift * 1200, 3000));
  }
}

/* ─── Shared format helper ───────────────────────────────────────────────── */
function fmt(s) {
  if (!s || isNaN(s) || s < 0) return '0:00';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

/* ═══════════════════════════════════════════════════════════════════════════
   ENABLE SOUND OVERLAY  (autoplay policy compliance)
   Browsers block unmuted autoplay. We start muted and show this prominent
   overlay so the user can tap/click to enable audio with a real interaction.
   ═══════════════════════════════════════════════════════════════════════════ */
function EnableSoundOverlay({ onEnable }) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(3px)' }}>
      <button
        onClick={onEnable}
        className="flex flex-col items-center gap-3 px-8 py-6 rounded-2xl transition-all hover:scale-105 active:scale-95"
        style={{
          background: 'linear-gradient(135deg,rgba(212,175,55,0.25),rgba(212,175,55,0.1))',
          border: '2px solid rgba(212,175,55,0.7)',
          boxShadow: '0 0 40px rgba(212,175,55,0.3)',
          backdropFilter: 'blur(12px)',
        }}>
        <div className="text-5xl animate-bounce">🔊</div>
        <div className="text-center">
          <div className="text-white font-black text-base tracking-wide">Sesi Etkinleştir</div>
          <div className="text-gray-300 text-xs mt-1">Sesi açmak için buraya dokun</div>
        </div>
        <div className="px-6 py-2 rounded-xl text-sm font-bold"
          style={{ background: 'rgba(212,175,55,0.3)', color: '#d4af37', border: '1px solid rgba(212,175,55,0.5)' }}>
          ▶ Sesi Aç &amp; İzle
        </div>
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   YOUTUBE PLAYER
   ═══════════════════════════════════════════════════════════════════════════ */
function YouTubePlayer({ videoId, isHost, roomState, onStateChange, onSeek, onUrlChange, movieTitle }) {
  const mountRef = useRef(null);
  const playerRef = useRef(null);
  const destroyedRef = useRef(false);
  const lastPlayingRef = useRef(null);
  const syncIntervalRef = useRef(null);
  const sliderDraggingRef = useRef(false);
  const hiddenAtRef = useRef(null);
  const hiddenPosRef = useRef(null);
  const initialSyncRef = useRef(false);

  const roomStateRef = useRef(roomState);
  const isHostRef = useRef(isHost);
  const onStateChangeRef = useRef(onStateChange);
  const onSeekRef = useRef(onSeek);
  const onUrlChangeRef = useRef(onUrlChange);

  useEffect(() => { roomStateRef.current = roomState; }, [roomState]);
  useEffect(() => { isHostRef.current = isHost; }, [isHost]);
  useEffect(() => { onStateChangeRef.current = onStateChange; }, [onStateChange]);
  useEffect(() => { onSeekRef.current = onSeek; }, [onSeek]);

  const [playerReady, setPlayerReady] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [volume, setVolume] = useState(80);
  const [duration, setDuration] = useState(0);
  const [seekPos, setSeekPos] = useState(0);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [newUrl, setNewUrl] = useState('');

  const applyQuality = useCallback(() => {
    const p = playerRef.current;
    if (!p) return;
    try { p.setPlaybackQuality('hd1080'); } catch {}
    try { p.setPlaybackQualityRange?.('hd720', 'hd1080'); } catch {}
  }, []);

  /* ── build player ── */
  useEffect(() => {
    if (!videoId) return;
    destroyedRef.current = false;
    setPlayerReady(false);
    setSoundEnabled(false);
    setDuration(0);
    setSeekPos(0);
    lastPlayingRef.current = null;
    initialSyncRef.current = false;

    loadYTApi(() => {
      if (destroyedRef.current || !mountRef.current) return;
      try { playerRef.current?.destroy(); } catch {}
      playerRef.current = null;

      const div = document.createElement('div');
      div.style.cssText = 'width:100%;height:100%';
      mountRef.current.innerHTML = '';
      mountRef.current.appendChild(div);

      playerRef.current = new window.YT.Player(div, {
        width: '100%', height: '100%', videoId,
        playerVars: { autoplay: 1, mute: 1, controls: 0, rel: 0, playsinline: 1, modestbranding: 1, enablejsapi: 1, origin: window.location.origin, host: 'https://www.youtube-nocookie.com' },
        events: {
          onReady(e) {
            if (destroyedRef.current) return;
            const p = e.target;
            const s = roomStateRef.current;
            const t = s?.currentTimeSeconds || 0;
            const dur = p.getDuration?.() || 0;
            if (dur > 0) setDuration(dur);
            setSeekPos(t);
            applyQuality();
            p.seekTo(t, true);
            if (s?.isPlaying || !s?.hostConnected) p.playVideo(); else p.pauseVideo();
            lastPlayingRef.current = s?.isPlaying ?? false;
            setupMediaSession(movieTitle);
            setPlayerReady(true);
          },
          onStateChange(e) {
            if (destroyedRef.current) return;
            const S = window.YT.PlayerState;
            const p = playerRef.current;
            if (!p) return;
            const dur = p.getDuration?.() || 0;
            if (dur > 0) setDuration(dur);
            if (e.data === S.ENDED) {
              if (isHostRef.current) {
                p.seekTo(0, true); p.playVideo();
                onStateChangeRef.current?.({ isPlaying: true, currentTimeSeconds: 0 });
              }
              return;
            }
            if (!isHostRef.current) return;
            const t = p.getCurrentTime?.() || 0;
            if (e.data === S.PLAYING) {
              lastPlayingRef.current = true;
              onStateChangeRef.current?.({ isPlaying: true, currentTimeSeconds: t });
            } else if (e.data === S.PAUSED) {
              lastPlayingRef.current = false;
              onStateChangeRef.current?.({ isPlaying: false, currentTimeSeconds: t });
            }
          },
          onPlaybackQualityChange() { if (!destroyedRef.current && !document.hidden) applyQuality(); },
          onError(e) {
            // 101/150 = video not allowed to play in embedded players
            if (e.data === 101 || e.data === 150) {
              console.warn('[YT] Video embed engellendi (hata ' + e.data + '). Invidious proxy deneniyor...');
              if (!destroyedRef.current && onUrlChangeRef && typeof onUrlChangeRef.current === 'function') {
                const invUrl = 'https://inv.tux.pizza/watch?v=' + videoId;
                // Try opening in new tab as fallback
                const notice = document.createElement('div');
                notice.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;flex-direction:column;background:rgba(0,0,0,0.85);z-index:99;color:white;text-align:center;padding:20px;gap:12px;';
                notice.innerHTML = '<div style="font-size:2rem">⚠️</div><div style="font-size:14px;max-width:280px">Bu video yerlesik oynatmaya izin vermiyor. YouTube uygulamasinda izleyebilirsiniz.</div><a href="https://www.youtube.com/watch?v=' + videoId + '" target="_blank" style="background:#d4af37;color:#0f0f14;padding:8px 20px;border-radius:8px;font-weight:600;text-decoration:none;font-size:13px">YouTube&apos;da Ac</a>';
                if (mountRef.current) mountRef.current.appendChild(notice);
              }
            }
          },
        },
      });
    });

    return () => {
      destroyedRef.current = true;
      clearInterval(syncIntervalRef.current);
      try { playerRef.current?.destroy(); } catch {}
      playerRef.current = null;
      setPlayerReady(false);
    };
  }, [videoId]);

  /* ── periodic sync loop ── */
  useEffect(() => {
    if (!playerReady) return;
    clearInterval(syncIntervalRef.current);
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
        const s = roomStateRef.current;
        if (!s || document.hidden) return;
        applyDrift(
          () => t,
          (target) => { p.seekTo(target, true); setSeekPos(target); },
          (rate) => { try { p.setPlaybackRate(rate); } catch {} },
          s.currentTimeSeconds || 0,
          s.isPlaying
        );
      }
    }, 3000);
    return () => clearInterval(syncIntervalRef.current);
  }, [playerReady]);

  /* ── respond to roomState isPlaying changes ── */
  useEffect(() => {
    if (!playerReady || !playerRef.current || isHost) return;
    const p = playerRef.current;
    const s = roomState;
    if (!s) return;

    if (!initialSyncRef.current && s.currentTimeSeconds > 0) {
      initialSyncRef.current = true;
      const cur = p.getCurrentTime?.() || 0;
      if (Math.abs(cur - s.currentTimeSeconds) > 1) {
        p.seekTo(s.currentTimeSeconds, true);
        setSeekPos(s.currentTimeSeconds);
      }
    }

    const hostIsOffline = !s.hostConnected;
    if (hostIsOffline) {
      if (lastPlayingRef.current !== true) { p.playVideo?.(); lastPlayingRef.current = true; }
    } else if (s.isPlaying !== lastPlayingRef.current) {
      if (s.isPlaying) p.playVideo?.();
      else p.pauseVideo?.();
      lastPlayingRef.current = s.isPlaying;
    }
  }, [roomState?.isPlaying, roomState?.currentTimeSeconds, playerReady, isHost]);

  /* ── respond to host seek ── */
  useEffect(() => {
    if (!playerReady || !playerRef.current || isHost || !roomState?._seekedAt) return;
    const t = roomState.currentTimeSeconds || 0;
    playerRef.current.seekTo(t, true);
    setSeekPos(t);
    if (roomState.isPlaying) playerRef.current.playVideo?.();
    lastPlayingRef.current = roomState.isPlaying;
  }, [roomState?._seekedAt, playerReady, isHost]);

  /* ── visibility change ── */
  useEffect(() => {
    const handle = () => {
      const p = playerRef.current;
      if (!p || destroyedRef.current) return;
      if (document.hidden) {
        hiddenAtRef.current = Date.now();
        hiddenPosRef.current = p.getCurrentTime?.() || 0;
        try { p.setPlaybackQuality('small'); } catch {}
      } else {
        applyQuality();
        if (hiddenAtRef.current !== null) {
          const elapsed = (Date.now() - hiddenAtRef.current) / 1000;
          const s = roomStateRef.current;
          if ((s?.isPlaying ?? lastPlayingRef.current) && elapsed > 2) {
            const exp = (hiddenPosRef.current || 0) + elapsed;
            const cur = p.getCurrentTime?.() || 0;
            if (Math.abs(cur - exp) > 2) { p.seekTo(exp, true); setSeekPos(exp); }
          }
          hiddenAtRef.current = null;
        }
        const s = roomStateRef.current;
        if (s?.isPlaying && lastPlayingRef.current !== true) { p.playVideo?.(); lastPlayingRef.current = true; }
      }
    };
    document.addEventListener('visibilitychange', handle);
    return () => document.removeEventListener('visibilitychange', handle);
  }, [applyQuality]);

  /* reset initialSync on videoId change */
  useEffect(() => { initialSyncRef.current = false; }, [videoId]);

  const enableSound = () => {
    const p = playerRef.current;
    if (!p) return;
    p.unMute(); p.setVolume(volume);
    setSoundEnabled(true);
    if (roomState?.isPlaying) { try { p.playVideo(); } catch {} }
  };

  const handleVolumeChange = (val) => {
    const p = playerRef.current;
    if (!p) return;
    setVolume(val);
    if (!soundEnabled) { p.unMute(); setSoundEnabled(true); }
    p.setVolume(val);
  };

  const handlePlayPause = () => {
    const p = playerRef.current;
    if (!p || !playerReady) return;
    const S = window.YT?.PlayerState;
    if (p.getPlayerState?.() === S?.PLAYING) p.pauseVideo();
    else p.playVideo();
  };

  const handleSeekStart = () => { sliderDraggingRef.current = true; };
  const handleSeekChange = (e) => setSeekPos(Number(e.target.value));
  const handleSeekEnd = (e) => {
    sliderDraggingRef.current = false;
    const t = Number(e.target.value);
    setSeekPos(t);
    if (playerRef.current && playerReady) {
      playerRef.current.seekTo(t, true);
      onSeekRef.current?.(t);
      onStateChangeRef.current?.({ currentTimeSeconds: t, isPlaying: lastPlayingRef.current });
    }
  };

  const applyUrl = () => {
    if (!newUrl.trim()) return;
    onUrlChange?.(newUrl.trim());
    setShowUrlInput(false); setNewUrl('');
  };

  const isMuted = !soundEnabled;

  return (
    <div className="w-full h-full flex flex-col bg-black">
      <div className="relative flex-1 overflow-hidden min-h-0">
        <div ref={mountRef} className="w-full h-full" style={{ pointerEvents: isHost ? 'auto' : 'none' }} />

        {!videoId && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center"><div className="text-5xl mb-3 opacity-40">🎬</div><p className="text-gray-500 text-sm">YouTube URL girilmedi</p></div>
          </div>
        )}

        {/* Enable Sound overlay — shown until user interacts */}
        {videoId && playerReady && !soundEnabled && (
          <EnableSoundOverlay onEnable={enableSound} />
        )}

        {/* Viewer volume controls (after sound enabled) */}
        {!isHost && videoId && playerReady && soundEnabled && (
          <div className="absolute bottom-3 right-3 z-20 flex items-center gap-2 px-2 py-1 rounded-xl"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <button onClick={() => handleVolumeChange(volume === 0 ? 80 : 0)} className="text-white text-base px-0.5">
              {isMuted || volume === 0 ? '🔇' : volume < 40 ? '🔉' : '🔊'}
            </button>
            <input type="range" min={0} max={100} value={volume}
              onChange={e => handleVolumeChange(Number(e.target.value))}
              className="w-20 cursor-pointer accent-yellow-500" style={{ height: '4px' }} />
          </div>
        )}
      </div>

      {/* Host controls bar */}
      {isHost && (
        <div className="flex-shrink-0 px-3 pt-2 pb-2 flex flex-col gap-2"
          style={{ background: 'rgba(12,12,18,0.98)', borderTop: '1px solid rgba(212,175,55,0.15)' }}>
          {duration > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 flex-shrink-0 tabular-nums w-10">{fmt(seekPos)}</span>
              <input type="range" min={0} max={Math.floor(duration)} value={Math.floor(seekPos)}
                onMouseDown={handleSeekStart} onTouchStart={handleSeekStart}
                onChange={handleSeekChange} onMouseUp={handleSeekEnd} onTouchEnd={handleSeekEnd}
                className="flex-1 cursor-pointer accent-yellow-500" style={{ height: '4px' }} />
              <span className="text-xs text-gray-400 flex-shrink-0 tabular-nums w-10 text-right">{fmt(duration)}</span>
            </div>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={handlePlayPause} disabled={!playerReady}
              className="btn-gold px-3 py-1.5 text-xs flex items-center gap-1 disabled:opacity-40 flex-shrink-0">
              {roomState?.isPlaying ? '⏸ Duraklat' : '▶ Oynat'}
            </button>
            <button onClick={() => { if (!soundEnabled) enableSound(); else handleVolumeChange(volume === 0 ? 80 : 0); }}
              className="text-white text-base px-1 flex-shrink-0">
              {isMuted || volume === 0 ? '🔇' : volume < 40 ? '🔉' : '🔊'}
            </button>
            <input type="range" min={0} max={100} value={soundEnabled ? volume : 0}
              onChange={e => handleVolumeChange(Number(e.target.value))}
              className="w-16 cursor-pointer accent-yellow-500" style={{ height: '4px' }} />
            <div className="flex-1" />
            <button onClick={() => setShowUrlInput(v => !v)} className="btn-outline-gold text-xs px-2 py-1 flex-shrink-0">Link URL</button>
          </div>
          {showUrlInput && (
            <div className="flex gap-2 items-center">
              <input
                value={newUrl}
                onChange={e => setNewUrl(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') applyUrl(); if (e.key === 'Escape') setShowUrlInput(false); }}
                placeholder="YouTube, MP4 veya stream URL yapistirin..."
                autoFocus
                className="flex-1 px-3 py-2 rounded-xl text-white text-sm outline-none"
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(212,175,55,0.4)' }}
              />
              <button onClick={applyUrl} className="btn-gold px-4 py-2 text-sm flex-shrink-0">Uygula</button>
              <button onClick={() => setShowUrlInput(false)} className="text-gray-400 hover:text-white px-2 text-sm flex-shrink-0">x</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   HTML5 VIDEO PLAYER  (MP4 / WebM / HLS .m3u8 direct links)
   ═══════════════════════════════════════════════════════════════════════════ */
function Html5Player({ streamUrl, isHost, roomState, onStateChange, onSeek, onUrlChange }) {
  const videoRef = useRef(null);
  const hlsInstanceRef = useRef(null);
  const destroyedRef = useRef(false);
  const lastPlayingRef = useRef(null);
  const syncIntervalRef = useRef(null);
  const sliderDraggingRef = useRef(false);
  const initialSyncRef = useRef(false);

  const roomStateRef = useRef(roomState);
  const isHostRef = useRef(isHost);
  const onStateChangeRef = useRef(onStateChange);
  const onSeekRef = useRef(onSeek);

  useEffect(() => { roomStateRef.current = roomState; }, [roomState]);
  useEffect(() => { isHostRef.current = isHost; }, [isHost]);
  useEffect(() => { onStateChangeRef.current = onStateChange; }, [onStateChange]);
  useEffect(() => { onSeekRef.current = onSeek; }, [onSeek]);

  const [videoReady, setVideoReady] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [duration, setDuration] = useState(0);
  const [seekPos, setSeekPos] = useState(0);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [loadError, setLoadError] = useState('');

  /* ── attach HLS or direct src ── */
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !streamUrl) return;
    destroyedRef.current = false;
    setVideoReady(false);
    setSoundEnabled(false);
    setLoadError('');
    initialSyncRef.current = false;

    const isHls = /\.m3u8(\?|#|$)/i.test(streamUrl) || streamUrl.includes('.m3u8');

    const cleanup = () => {
      if (hlsInstanceRef.current) {
        hlsInstanceRef.current.destroy();
        hlsInstanceRef.current = null;
      }
    };

    const attachDirect = () => {
      cleanup();
      video.src = streamUrl;
      video.muted = true;
      video.load();
    };

    if (isHls) {
      loadHls().then(Hls => {
        if (destroyedRef.current || !videoRef.current) return;
        if (Hls && Hls.isSupported()) {
          cleanup();
          const hls = new Hls({ startLevel: -1, capLevelToPlayerSize: true });
          hlsInstanceRef.current = hls;
          hls.loadSource(streamUrl);
          hls.attachMedia(video);
          hls.on(Hls.Events.ERROR, (_, data) => {
            if (data.fatal) setLoadError('HLS yüklenemedi. URL geçerli mi?');
          });
          video.muted = true;
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          attachDirect();
        } else {
          setLoadError('Bu tarayıcı HLS desteklemiyor.');
        }
      });
    } else {
      attachDirect();
    }

    return () => {
      destroyedRef.current = true;
      cleanup();
      video.src = '';
    };
  }, [streamUrl]);

  /* ── native video events ── */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onCanPlay = () => {
      setVideoReady(true);
      const s = roomStateRef.current;
      const t = s?.currentTimeSeconds || 0;
      video.currentTime = t;
      setSeekPos(t);
      if (s?.isPlaying) video.play().catch(() => {});
      else video.pause();
      lastPlayingRef.current = s?.isPlaying ?? false;
    };

    const onDurationChange = () => {
      if (video.duration && isFinite(video.duration)) setDuration(video.duration);
    };

    const onTimeUpdate = () => {
      if (!sliderDraggingRef.current) setSeekPos(video.currentTime);
    };

    const onPlay = () => {
      lastPlayingRef.current = true;
      if (isHostRef.current) onStateChangeRef.current?.({ isPlaying: true, currentTimeSeconds: video.currentTime });
    };

    const onPause = () => {
      lastPlayingRef.current = false;
      if (isHostRef.current) onStateChangeRef.current?.({ isPlaying: false, currentTimeSeconds: video.currentTime });
    };

    const onError = () => setLoadError('Video yüklenemedi. URL ve format kontrol edin.');

    video.addEventListener('canplay', onCanPlay);
    video.addEventListener('durationchange', onDurationChange);
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('error', onError);
    return () => {
      video.removeEventListener('canplay', onCanPlay);
      video.removeEventListener('durationchange', onDurationChange);
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('error', onError);
    };
  }, [streamUrl]);

  /* ── periodic sync ── */
  useEffect(() => {
    if (!videoReady) return;
    clearInterval(syncIntervalRef.current);
    syncIntervalRef.current = setInterval(() => {
      const video = videoRef.current;
      if (!video || destroyedRef.current || document.hidden) return;
      if (isHostRef.current) {
        onStateChangeRef.current?.({ currentTimeSeconds: video.currentTime });
      } else {
        const s = roomStateRef.current;
        if (!s) return;
        applyDrift(
          () => video.currentTime,
          (t) => { video.currentTime = t; setSeekPos(t); },
          (r) => { video.playbackRate = r; },
          s.currentTimeSeconds || 0,
          s.isPlaying
        );
      }
    }, 3000);
    return () => clearInterval(syncIntervalRef.current);
  }, [videoReady]);

  /* ── roomState isPlaying ── */
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoReady || isHost) return;
    const s = roomState;
    if (!s) return;

    if (!initialSyncRef.current && s.currentTimeSeconds > 0) {
      initialSyncRef.current = true;
      if (Math.abs(video.currentTime - s.currentTimeSeconds) > 1) {
        video.currentTime = s.currentTimeSeconds;
        setSeekPos(s.currentTimeSeconds);
      }
    }

    if (s.isPlaying !== lastPlayingRef.current) {
      if (s.isPlaying) video.play().catch(() => {});
      else video.pause();
      lastPlayingRef.current = s.isPlaying;
    }
  }, [roomState?.isPlaying, roomState?.currentTimeSeconds, videoReady, isHost]);

  /* ── host seek ── */
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoReady || isHost || !roomState?._seekedAt) return;
    const t = roomState.currentTimeSeconds || 0;
    video.currentTime = t; setSeekPos(t);
    if (roomState.isPlaying) video.play().catch(() => {});
    lastPlayingRef.current = roomState.isPlaying;
  }, [roomState?._seekedAt, videoReady, isHost]);

  useEffect(() => { initialSyncRef.current = false; }, [streamUrl]);

  const enableSound = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = false;
    video.volume = volume;
    setSoundEnabled(true);
    if (roomState?.isPlaying) video.play().catch(() => {});
  };

  const handleVolumeChange = (val) => {
    const video = videoRef.current;
    if (!video) return;
    const v = val / 100;
    setVolume(v);
    video.muted = false;
    video.volume = v;
    setSoundEnabled(true);
  };

  const handlePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play().catch(() => {}); else video.pause();
  };

  const handleSeekStart = () => { sliderDraggingRef.current = true; };
  const handleSeekChange = (e) => setSeekPos(Number(e.target.value));
  const handleSeekEnd = (e) => {
    sliderDraggingRef.current = false;
    const t = Number(e.target.value);
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = t; setSeekPos(t);
    onSeekRef.current?.(t);
    onStateChangeRef.current?.({ currentTimeSeconds: t, isPlaying: lastPlayingRef.current });
  };

  const applyUrl = () => {
    if (!newUrl.trim()) return;
    onUrlChange?.(newUrl.trim());
    setShowUrlInput(false); setNewUrl('');
  };

  const volPct = Math.round(volume * 100);

  return (
    <div className="w-full h-full flex flex-col bg-black">
      <div className="relative flex-1 overflow-hidden min-h-0">
        <video
          ref={videoRef}
          className="w-full h-full object-contain"
          playsInline
          style={{ pointerEvents: isHost ? 'auto' : 'none' }}
        />

        {!streamUrl && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center"><div className="text-5xl mb-3 opacity-40">🎬</div><p className="text-gray-500 text-sm">Video URL girilmedi</p></div>
          </div>
        )}

        {loadError && (
          <div className="absolute inset-0 flex items-center justify-center p-6">
            <div className="text-center">
              <div className="text-3xl mb-2">⚠️</div>
              <p className="text-red-400 text-sm">{loadError}</p>
              {isHost && <p className="text-gray-500 text-xs mt-1">URL'yi değiştirmeyi deneyin</p>}
            </div>
          </div>
        )}

        {/* Enable Sound overlay */}
        {streamUrl && !loadError && videoReady && !soundEnabled && (
          <EnableSoundOverlay onEnable={enableSound} />
        )}

        {/* Viewer volume */}
        {!isHost && videoReady && soundEnabled && (
          <div className="absolute bottom-3 right-3 z-20 flex items-center gap-2 px-2 py-1 rounded-xl"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <button onClick={() => handleVolumeChange(volPct === 0 ? 80 : 0)} className="text-white text-base px-0.5">
              {volPct === 0 ? '🔇' : volPct < 40 ? '🔉' : '🔊'}
            </button>
            <input type="range" min={0} max={100} value={volPct}
              onChange={e => handleVolumeChange(Number(e.target.value))}
              className="w-20 cursor-pointer accent-yellow-500" style={{ height: '4px' }} />
          </div>
        )}
      </div>

      {/* Host controls */}
      {isHost && (
        <div className="flex-shrink-0 px-3 pt-2 pb-2 flex flex-col gap-2"
          style={{ background: 'rgba(12,12,18,0.98)', borderTop: '1px solid rgba(212,175,55,0.15)' }}>
          {duration > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 flex-shrink-0 tabular-nums w-10">{fmt(seekPos)}</span>
              <input type="range" min={0} max={Math.floor(duration)} value={Math.floor(seekPos)}
                onMouseDown={handleSeekStart} onTouchStart={handleSeekStart}
                onChange={handleSeekChange} onMouseUp={handleSeekEnd} onTouchEnd={handleSeekEnd}
                className="flex-1 cursor-pointer accent-yellow-500" style={{ height: '4px' }} />
              <span className="text-xs text-gray-400 flex-shrink-0 tabular-nums w-10 text-right">{fmt(duration)}</span>
            </div>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={handlePlayPause}
              className="btn-gold px-3 py-1.5 text-xs flex items-center gap-1 flex-shrink-0">
              {roomState?.isPlaying ? '⏸ Duraklat' : '▶ Oynat'}
            </button>
            <button onClick={() => { if (!soundEnabled) enableSound(); else handleVolumeChange(volPct === 0 ? 80 : 0); }}
              className="text-white text-base px-1 flex-shrink-0">
              {!soundEnabled || volPct === 0 ? '🔇' : volPct < 40 ? '🔉' : '🔊'}
            </button>
            <input type="range" min={0} max={100} value={soundEnabled ? volPct : 0}
              onChange={e => handleVolumeChange(Number(e.target.value))}
              className="w-16 cursor-pointer accent-yellow-500" style={{ height: '4px' }} />
            <div className="flex-1" />
            {!showUrlInput
              ? <button onClick={() => setShowUrlInput(true)} className="btn-outline-gold text-xs px-2 py-1 flex-shrink-0">🔗 URL</button>
              : <div className="flex gap-1 flex-1 min-w-0">
                  <input value={newUrl} onChange={e => setNewUrl(e.target.value)} placeholder="MP4 / HLS URL..."
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

/* ═══════════════════════════════════════════════════════════════════════════
   EXTERNAL LINK PANEL  (DRM sites: Netflix, Exxen, etc.)
   These cannot be embedded due to DRM. We show the URL + open button +
   a synchronized timer so users can manually match playback position.
   ═══════════════════════════════════════════════════════════════════════════ */
function ExternalPanel({ streamUrl, isHost, roomState, onUrlChange }) {
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [elapsed, setElapsed] = useState(0);

  /* show estimated position timer */
  useEffect(() => {
    if (!roomState?.isPlaying) { setElapsed(roomState?.currentTimeSeconds || 0); return; }
    const start = Date.now();
    const base = roomState.currentTimeSeconds || 0;
    setElapsed(base);
    const id = setInterval(() => {
      setElapsed(base + (Date.now() - start) / 1000);
    }, 1000);
    return () => clearInterval(id);
  }, [roomState?.isPlaying, roomState?.currentTimeSeconds]);

  const applyUrl = () => {
    if (!newUrl.trim()) return;
    onUrlChange?.(newUrl.trim());
    setShowUrlInput(false); setNewUrl('');
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center text-center p-6 gap-4"
      style={{ background: 'linear-gradient(135deg,#0a0a0f,#12001a)' }}>
      <div className="text-5xl">🔗</div>
      <div>
        <h3 className="font-bold text-white text-base">Harici Platform</h3>
        <p className="text-xs text-gray-500 mt-1 max-w-xs">
          DRM korumalı platformlar (Netflix, Exxen vb.) embed edilemez.<br/>
          Aşağıdaki bağlantıyı açın ve odanın zamanına göre ayarlayın.
        </p>
      </div>

      {/* Sync timer */}
      <div className="px-5 py-3 rounded-2xl text-center"
        style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.2)' }}>
        <div className="text-xs text-gray-500 mb-1">Oda Konumu</div>
        <div className="text-2xl font-black tabular-nums" style={{ color: '#d4af37' }}>{fmt(elapsed)}</div>
        <div className="text-xs mt-1" style={{ color: roomState?.isPlaying ? '#4ade80' : '#9ca3af' }}>
          {roomState?.isPlaying ? '▶ Oynatılıyor' : '⏸ Duraklatıldı'}
        </div>
      </div>

      {streamUrl && (
        <a href={streamUrl} target="_blank" rel="noopener noreferrer"
          className="btn-gold px-6 py-3 text-sm font-bold inline-flex items-center gap-2">
          🎬 Platformda Aç
        </a>
      )}

      {isHost && (
        <div className="w-full max-w-xs">
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

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN EXPORT — auto-routes to correct player based on URL / providerType
   ═══════════════════════════════════════════════════════════════════════════ */
export default function VideoPlayer({
  streamUrl, providerType, isHost, roomState,
  onStateChange, onSeek, onUrlChange, onResync, movieTitle
}) {
  /* Determine which player to use.
     Priority: explicit providerType hint, then URL analysis. */
  const effectiveProvider = resolveProvider(streamUrl, providerType);
  const videoId = effectiveProvider === 'youtube' ? getYTVideoId(streamUrl) : '';

  if (effectiveProvider === 'youtube') {
    return (
      <YouTubePlayer
        videoId={videoId}
        isHost={isHost}
        roomState={roomState}
        onStateChange={onStateChange}
        onSeek={onSeek}
        onUrlChange={onUrlChange}
        movieTitle={movieTitle}
      />
    );
  }

  if (effectiveProvider === 'video') {
    return (
      <Html5Player
        streamUrl={streamUrl}
        isHost={isHost}
        roomState={roomState}
        onStateChange={onStateChange}
        onSeek={onSeek}
        onUrlChange={onUrlChange}
      />
    );
  }

  return (
    <ExternalPanel
      streamUrl={streamUrl}
      isHost={isHost}
      roomState={roomState}
      onUrlChange={onUrlChange}
    />
  );
}
