import { useState, useRef } from 'react';
import axios from 'axios';

function fmtDur(sec) {
  if (!sec) return '';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return h + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  return m + ':' + String(s).padStart(2, '0');
}

function fmtViews(n) {
  if (!n) return '';
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return String(n);
}

export default function YouTubeSearch({ onSelect, canControl }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  const search = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError('');
    try {
      const r = await axios.get('/api/youtube/search', { params: { q: query } });
      setResults(r.data);
    } catch {
      setError('Arama basarisiz, tekrar deneyin');
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter') search();
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-1.5 p-2 flex-shrink-0 border-b border-gold-DEFAULT/10"
        style={{ background: 'rgba(12,12,18,0.98)' }}>
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKey}
          placeholder="YouTube'da ara..."
          className="flex-1 px-3 py-2 rounded-xl text-white text-sm outline-none"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(212,175,55,0.25)' }}
        />
        <button onClick={search} disabled={loading}
          className="btn-gold px-3 py-2 text-sm flex-shrink-0 disabled:opacity-50">
          {loading ? '...' : 'Ara'}
        </button>
      </div>

      {error && (
        <div className="text-xs text-red-400 px-3 py-2 flex-shrink-0">{error}</div>
      )}

      <div className="flex-1 overflow-y-auto">
        {results.length === 0 && !loading && (
          <div className="text-center text-gray-500 text-xs py-8 px-4">
            <div className="text-2xl mb-2">🔍</div>
            <p>Bir film veya video ara</p>
            {!canControl && <p className="mt-1 text-yellow-600">Sadece oda sahibi video degistirebilir</p>}
          </div>
        )}

        {results.map(v => (
          <div key={v.videoId}
            onClick={() => canControl && onSelect('https://www.youtube.com/watch?v=' + v.videoId, v.title)}
            className="flex gap-2 p-2 border-b border-white/5 transition-colors"
            style={{ cursor: canControl ? 'pointer' : 'default', background: 'transparent' }}
            onMouseEnter={e => { if (canControl) e.currentTarget.style.background = 'rgba(212,175,55,0.06)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
            <div className="relative flex-shrink-0" style={{ width: 80, height: 45 }}>
              <img
                src={v.thumbnail}
                alt=""
                style={{ width: 80, height: 45, objectFit: 'cover', borderRadius: 4 }}
                onError={e => { e.target.src = 'https://i.ytimg.com/vi/' + v.videoId + '/default.jpg'; }}
              />
              {v.duration > 0 && (
                <span className="absolute bottom-0.5 right-0.5 text-white text-xs px-1 rounded"
                  style={{ background: 'rgba(0,0,0,0.8)', fontSize: 9 }}>
                  {fmtDur(v.duration)}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-medium leading-tight line-clamp-2 mb-0.5">{v.title}</p>
              <p className="text-gray-500 text-xs truncate">{v.author}</p>
              {v.views > 0 && (
                <p className="text-gray-600 text-xs">{fmtViews(v.views)} izlenme</p>
              )}
            </div>
            {canControl && (
              <div className="flex-shrink-0 flex items-center">
                <span className="text-gold-DEFAULT text-xs px-1.5 py-0.5 rounded"
                  style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.2)', fontSize: 9 }}>
                  Oynat
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
