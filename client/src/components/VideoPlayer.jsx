import { useEffect, useRef, useState, useCallback } from 'react';

function getYouTubeEmbedUrl(url) {
  if (!url) return '';
  let videoId = '';
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtube.com') && u.pathname.includes('embed')) {
      return url;
    }
    if (u.hostname.includes('youtube.com')) {
      videoId = u.searchParams.get('v') || '';
    } else if (u.hostname.includes('youtu.be')) {
      videoId = u.pathname.slice(1);
    }
  } catch {
    const match = url.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
    if (match) videoId = match[1];
  }
  return videoId ? `https://www.youtube.com/embed/${videoId}?enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}&rel=0` : url;
}

export default function VideoPlayer({
  streamUrl,
  providerType,
  isHost,
  roomState,
  onStateChange,
  onUrlChange
}) {
  const iframeRef = useRef(null);
  const ytPlayerRef = useRef(null);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(80);
  const [localTime, setLocalTime] = useState(0);
  const [seeking, setSeeking] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [ytReady, setYtReady] = useState(false);
  const syncIntervalRef = useRef(null);

  const embedUrl = providerType === 'youtube' ? getYouTubeEmbedUrl(streamUrl) : streamUrl;

  useEffect(() => {
    if (providerType !== 'youtube') return;
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    }

    const initPlayer = () => {
      if (!iframeRef.current) return;
      const videoId = embedUrl.match(/embed\/([A-Za-z0-9_-]+)/)?.[1];
      if (!videoId) return;

      if (ytPlayerRef.current) {
        ytPlayerRef.current.destroy();
        ytPlayerRef.current = null;
      }

      ytPlayerRef.current = new window.YT.Player(iframeRef.current, {
        events: {
          onReady: () => {
            setYtReady(true);
            ytPlayerRef.current?.setVolume(volume);
            if (!isHost && roomState) {
              ytPlayerRef.current?.seekTo(roomState.currentTimeSeconds, true);
              if (roomState.isPlaying) {
                ytPlayerRef.current?.playVideo();
              } else {
                ytPlayerRef.current?.pauseVideo();
              }
            }
          },
          onStateChange: (e) => {
            if (!isHost) return;
            const YT = window.YT;
            if (e.data === YT.PlayerState.PLAYING) {
              const t = ytPlayerRef.current?.getCurrentTime() || 0;
              onStateChange?.({ isPlaying: true, currentTimeSeconds: t });
            } else if (e.data === YT.PlayerState.PAUSED) {
              const t = ytPlayerRef.current?.getCurrentTime() || 0;
              onStateChange?.({ isPlaying: false, currentTimeSeconds: t });
            }
          }
        }
      });
    };

    if (window.YT?.Player) {
      initPlayer();
    } else {
      window.onYouTubeIframeAPIReady = initPlayer;
    }

    return () => {
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
    };
  }, [embedUrl, providerType]);

  useEffect(() => {
    if (!roomState || !ytPlayerRef.current || !ytReady) return;
    if (isHost) return;

    const player = ytPlayerRef.current;
    const currentTime = player.getCurrentTime?.() || 0;
    const drift = Math.abs(currentTime - roomState.currentTimeSeconds);

    if (drift > 1.5) {
      player.seekTo?.(roomState.currentTimeSeconds, true);
    }

    if (roomState.isPlaying) {
      player.playVideo?.();
    } else {
      player.pauseVideo?.();
    }
  }, [roomState, ytReady, isHost]);

  useEffect(() => {
    if (!isHost || !ytPlayerRef.current || !ytReady) return;
    if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
    syncIntervalRef.current = setInterval(() => {
      const t = ytPlayerRef.current?.getCurrentTime?.() || 0;
      if (t !== localTime) {
        setLocalTime(t);
        onStateChange?.({ currentTimeSeconds: t });
      }
    }, 3000);
    return () => clearInterval(syncIntervalRef.current);
  }, [isHost, ytReady, onStateChange]);

  useEffect(() => {
    if (ytPlayerRef.current?.setVolume) {
      ytPlayerRef.current.setVolume(muted ? 0 : volume);
    }
  }, [volume, muted]);

  const handleSeek = useCallback((e) => {
    if (!isHost) return;
    const val = Number(e.target.value);
    setLocalTime(val);
    ytPlayerRef.current?.seekTo?.(val, true);
    onStateChange?.({ currentTimeSeconds: val });
  }, [isHost, onStateChange]);

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
          <a
            href={streamUrl} target="_blank" rel="noopener noreferrer"
            className="btn-gold px-6 py-3 text-sm font-bold inline-flex items-center gap-2"
          >
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
                <input
                  value={newUrl} onChange={e => setNewUrl(e.target.value)}
                  placeholder="Yeni URL..." type="url"
                  className="flex-1 px-3 py-2 rounded-lg text-white text-xs outline-none"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,175,55,0.2)' }}
                />
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
      <div className="relative flex-1 bg-black">
        {embedUrl ? (
          <iframe
            ref={iframeRef}
            src={embedUrl}
            className="w-full h-full"
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            title="Video Player"
            id="yt-player"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center p-4">
              <div className="text-5xl mb-3 opacity-40">🎬</div>
              <p className="text-gray-500 text-sm">URL girilmedi</p>
            </div>
          </div>
        )}

        {!isHost && roomState && (
          <div className="absolute bottom-2 left-2 right-2 flex items-center gap-2"
            style={{ background: 'rgba(0,0,0,0.8)', borderRadius: '8px', padding: '6px 10px' }}>
            <span className="text-xs text-gray-400">🎮 Host kontrolü</span>
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
            {roomState?.isPlaying ? '⏸' : '▶'} {roomState?.isPlaying ? 'Duraklat' : 'Oynat'}
          </button>

          {ytReady && (
            <input
              type="range" min={0} max={600} step={1} value={Math.floor(localTime)}
              onChange={handleSeek}
              className="flex-1 min-w-[80px] cursor-pointer accent-yellow-500"
              title="Seek"
            />
          )}

          <button onClick={() => setMuted(!muted)} className="text-white text-sm px-1">
            {muted ? '🔇' : '🔊'}
          </button>
          <input
            type="range" min={0} max={100} value={muted ? 0 : volume}
            onChange={e => { setVolume(Number(e.target.value)); setMuted(false); }}
            className="w-16 cursor-pointer accent-yellow-500"
          />

          {!showUrlInput ? (
            <button onClick={() => setShowUrlInput(true)} className="btn-outline-gold text-xs px-3 py-1.5">
              🔗 URL
            </button>
          ) : (
            <div className="flex gap-1.5 flex-1">
              <input
                value={newUrl} onChange={e => setNewUrl(e.target.value)}
                placeholder="Yeni YouTube URL veya embed..."
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
