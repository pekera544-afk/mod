import { useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';

function Countdown({ startTime }) {
  const [diff, setDiff] = useState(new Date(startTime) - new Date());
  useEffect(() => {
    const t = setInterval(() => setDiff(new Date(startTime) - new Date()), 1000);
    return () => clearInterval(t);
  }, [startTime]);

  if (diff <= 0) return <span className="text-green-400 font-bold text-sm">CANLI</span>;

  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);

  return (
    <div className="flex gap-2 justify-center">
      {d > 0 && <div className="text-center"><div className="text-lg font-bold text-yellow-400">{d}</div><div className="text-xs text-gray-500">gun</div></div>}
      <div className="text-center"><div className="text-lg font-bold text-yellow-400">{String(h).padStart(2,'0')}</div><div className="text-xs text-gray-500">saat</div></div>
      <div className="text-lg font-bold text-yellow-400 self-start mt-0.5">:</div>
      <div className="text-center"><div className="text-lg font-bold text-yellow-400">{String(m).padStart(2,'0')}</div><div className="text-xs text-gray-500">dk</div></div>
      <div className="text-lg font-bold text-yellow-400 self-start mt-0.5">:</div>
      <div className="text-center"><div className="text-lg font-bold text-yellow-400">{String(s).padStart(2,'0')}</div><div className="text-xs text-gray-500">sn</div></div>
    </div>
  );
}

function EventCard({ ev }) {
  const lang = i18n.language;
  const now = new Date();
  const start = new Date(ev.startTime);
  const isPast = start < now;
  const isLive = !isPast && (start - now < 30 * 60 * 1000);

  return (
    <div className="rounded-2xl overflow-hidden flex flex-col"
      style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${isLive ? 'rgba(34,197,94,0.4)' : isPast ? 'rgba(255,255,255,0.06)' : 'rgba(212,175,55,0.2)'}` }}>
      {ev.posterUrl ? (
        <img src={ev.posterUrl} alt={ev.titleTR} className="w-full object-cover" style={{ height: 160, opacity: isPast ? 0.5 : 1 }} />
      ) : (
        <div style={{ height: 100, background: 'rgba(212,175,55,0.05)' }} className="flex items-center justify-center text-4xl">
          {isLive ? '🔴' : isPast ? '⏰' : '🎯'}
        </div>
      )}
      <div className="p-4 flex flex-col gap-2 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          {isLive && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30 animate-pulse">🔴 CANLI</span>}
          {isPast && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-500/20 text-gray-400">Bitti</span>}
          {ev.badge && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(212,175,55,0.1)', color: '#d4af37', border: '1px solid rgba(212,175,55,0.2)' }}>{ev.badge}</span>}
        </div>
        <h3 className="font-bold text-white text-base leading-tight">
          {lang === 'en' && ev.titleEN ? ev.titleEN : ev.titleTR}
        </h3>
        {ev.descriptionTR && (
          <p className="text-xs text-gray-400 line-clamp-2">
            {lang === 'en' && ev.descriptionEN ? ev.descriptionEN : ev.descriptionTR}
          </p>
        )}
        <div className="mt-auto pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="text-xs text-gray-500 mb-1 text-center">
            {start.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </div>
          {!isPast && <Countdown startTime={ev.startTime} />}
        </div>
      </div>
    </div>
  );
}

export default function EventsPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('upcoming');

  useEffect(() => {
    axios.get('/api/events/all').then(r => setEvents(r.data)).finally(() => setLoading(false));
  }, []);

  const now = new Date();
  const filtered = events.filter(ev => {
    const isPast = new Date(ev.startTime) < now;
    if (filter === 'upcoming') return !isPast;
    if (filter === 'past') return isPast;
    return true;
  });

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold cinzel" style={{ color: '#d4af37' }}>🎯 Etkinlikler</h1>
        <div className="flex gap-2">
          {['upcoming','past','all'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className="text-xs px-3 py-1.5 rounded-full transition-all"
              style={{
                background: filter === f ? 'rgba(212,175,55,0.2)' : 'rgba(255,255,255,0.04)',
                color: filter === f ? '#d4af37' : '#6b7280',
                border: filter === f ? '1px solid rgba(212,175,55,0.3)' : '1px solid rgba(255,255,255,0.08)'
              }}>
              {f === 'upcoming' ? 'Yaklaşan' : f === 'past' ? 'Geçmiş' : 'Tümü'}
            </button>
          ))}
        </div>
      </div>
      {loading ? (
        <div className="text-center py-20 text-gray-500">Yükleniyor...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-600">
          <div className="text-4xl mb-3">🎯</div>
          <div>Henüz etkinlik yok</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(ev => <EventCard key={ev.id} ev={ev} />)}
        </div>
      )}
    </div>
  );
}