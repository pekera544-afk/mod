import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useOutletContext } from 'react-router-dom';

const TYPE_META = {
  KISI: { label: 'Kişi PK', emoji: '🧑', color: '#60a5fa' },
  AJANS: { label: 'Ajans PK', emoji: '🏢', color: '#f59e0b' },
};

const STATUS_META = {
  UPCOMING: { label: 'Yaklaşan', color: '#d4af37' },
  LIVE: { label: '🔴 CANLI', color: '#22c55e' },
  ENDED: { label: 'Bitti', color: '#6b7280' },
  CANCELED: { label: 'İptal', color: '#ef4444' },
};

function Countdown({ startTime, status }) {
  const [diff, setDiff] = useState(new Date(startTime) - new Date());
  useEffect(() => {
    if (status === 'LIVE' || status === 'ENDED' || status === 'CANCELED') return;
    const t = setInterval(() => setDiff(new Date(startTime) - new Date()), 1000);
    return () => clearInterval(t);
  }, [startTime, status]);

  if (status === 'LIVE') return <span className="text-green-400 font-bold">CANLI</span>;
  if (status === 'ENDED' || status === 'CANCELED') return null;
  if (diff <= 0) return <span className="text-green-400 font-bold">Başlıyor...</span>;

  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);

  return (
    <span className="font-mono text-yellow-400 text-sm">
      {d > 0 ? `${d}g ` : ''}{String(h).padStart(2,'0')}:{String(m).padStart(2,'0')}:{String(s).padStart(2,'0')}
    </span>
  );
}

function PkCard({ match }) {
  const { type, status, title, startTime, description, teamAName, teamBName, membersA = [], membersB = [] } = match;
  const typeMeta = TYPE_META[type] || TYPE_META.KISI;
  const statusMeta = STATUS_META[status] || STATUS_META.UPCOMING;

  return (
    <div className="rounded-2xl p-4 flex flex-col gap-3"
      style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${statusMeta.color}44` }}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 16 }}>{typeMeta.emoji}</span>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full"
            style={{ background: `${typeMeta.color}22`, color: typeMeta.color, border: `1px solid ${typeMeta.color}44` }}>
            {typeMeta.label}
          </span>
        </div>
        <span className="text-xs font-bold px-2 py-0.5 rounded-full"
          style={{ background: `${statusMeta.color}22`, color: statusMeta.color, border: `1px solid ${statusMeta.color}44` }}>
          {statusMeta.label}
        </span>
      </div>

      {/* VS Display */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 text-center">
          <div className="font-bold text-white text-base truncate">{teamAName}</div>
          <div className="text-xs text-gray-500 mt-1">{membersA.length} kişi</div>
          {membersA.slice(0,5).map((m,i) => (
            <div key={i} className="text-xs text-gray-400 truncate">• {m.name}</div>
          ))}
          {membersA.length > 5 && <div className="text-xs text-gray-500">+{membersA.length - 5} daha</div>}
        </div>
        <div className="flex flex-col items-center gap-1 flex-shrink-0">
          <span className="text-2xl font-black" style={{ color: '#d4af37' }}>⚔️ VS ⚔️</span>
          <Countdown startTime={startTime} status={status} />
        </div>
        <div className="flex-1 text-center">
          <div className="font-bold text-white text-base truncate">{teamBName}</div>
          <div className="text-xs text-gray-500 mt-1">{membersB.length} kişi</div>
          {membersB.slice(0,5).map((m,i) => (
            <div key={i} className="text-xs text-gray-400 truncate">• {m.name}</div>
          ))}
          {membersB.length > 5 && <div className="text-xs text-gray-500">+{membersB.length - 5} daha</div>}
        </div>
      </div>

      {description && (
        <p className="text-xs text-gray-500 text-center line-clamp-2">{description}</p>
      )}
      <div className="text-xs text-center text-gray-600">
        {new Date(startTime).toLocaleDateString('tr-TR', { day:'numeric', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit' })}
      </div>
    </div>
  );
}

export default function PkPage() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const { socket } = useOutletContext() || {};

  const load = useCallback(() => {
    axios.get('/api/pk').then(r => setMatches(r.data)).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!socket) return;
    const onNewPk = () => load();
    const onPkLive = () => load();
    socket.on('new_pk', onNewPk);
    socket.on('pk_live', onPkLive);
    return () => { socket.off('new_pk', onNewPk); socket.off('pk_live', onPkLive); };
  }, [socket, load]);

  const filtered = filter === 'all' ? matches : matches.filter(m => m.type === filter || m.status === filter);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold cinzel" style={{ color: '#d4af37' }}>⚔️ PK Maçları</h1>
      </div>
      <div className="flex gap-2 mb-4 flex-wrap">
        {[['all','Tümü'],['KISI','Kişi PK'],['AJANS','Ajans PK'],['LIVE','Canlı'],['UPCOMING','Yaklaşan'],['ENDED','Bitti']].map(([v,l]) => (
          <button key={v} onClick={() => setFilter(v)}
            className="text-xs px-3 py-1.5 rounded-full transition-all"
            style={{
              background: filter === v ? 'rgba(212,175,55,0.2)' : 'rgba(255,255,255,0.04)',
              color: filter === v ? '#d4af37' : '#6b7280',
              border: filter === v ? '1px solid rgba(212,175,55,0.3)' : '1px solid rgba(255,255,255,0.08)'
            }}>{l}</button>
        ))}
      </div>
      {loading ? (
        <div className="text-center py-20 text-gray-500">Yükleniyor...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-600">
          <div className="text-4xl mb-3">⚔️</div>
          <div>Henüz PK maçı yok</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filtered.map(m => <PkCard key={m.id} match={m} />)}
        </div>
      )}
    </div>
  );
}