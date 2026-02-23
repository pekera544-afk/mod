import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import CreateRoomModal from '../components/CreateRoomModal';
import PasswordPrompt from '../components/PasswordPrompt';

function BackButton() {
  const navigate = useNavigate();
  return (
    <button onClick={() => navigate(-1)}
      className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors text-sm">
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <polyline points="15 18 9 12 15 6" />
      </svg>
      Geri
    </button>
  );
}

function RoomCard({ room, onJoinLocked }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isOwned = user && room.ownerId === user.id;
  const liveCount = room.liveCount || 0;

  const handleClick = () => {
    if (room.isLocked) { onJoinLocked(room); return; }
    navigate(`/rooms/${room.id}`);
  };

  return (
    <div onClick={handleClick}
      className="p-4 rounded-2xl cursor-pointer transition-all hover:scale-[1.01] hover:border-gold-DEFAULT/30"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(212,175,55,0.12)' }}>
      <div className="flex gap-3">
        {room.posterUrl ? (
          <img src={room.posterUrl} alt={room.title} className="w-16 h-20 object-cover rounded-xl flex-shrink-0" />
        ) : (
          <div className="w-16 h-20 rounded-xl flex items-center justify-center flex-shrink-0 text-3xl"
            style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.15)' }}>
            {room.providerType === 'youtube' ? '▶️' : '🔗'}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-white font-bold text-sm leading-tight">{room.title}</h3>
            <div className="flex items-center gap-1 flex-shrink-0">
              {room.isLocked && <span className="text-xs text-gray-400">🔒</span>}
              {room.isTrending && <span className="text-xs" style={{ color: '#ff6400' }}>🔥</span>}
            </div>
          </div>
          {room.movieTitle && (
            <p className="text-xs text-gold-DEFAULT mt-0.5 truncate">{room.movieTitle}</p>
          )}
          {room.description && (
            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{room.description}</p>
          )}
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-1.5">
              {liveCount > 0 ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                  <span className="text-xs text-green-400 font-semibold">{liveCount} izleyici</span>
                </>
              ) : (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-600"></span>
                  <span className="text-xs text-gray-500">Boş</span>
                </>
              )}
            </div>
            {isOwned && (
              <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                style={{ background: 'rgba(212,175,55,0.15)', color: '#d4af37', border: '1px solid rgba(212,175,55,0.3)' }}>
                👑 Sahibi
              </span>
            )}
            <span className="text-xs text-gray-600 capitalize">{room.providerType}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RoomsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [lockedRoom, setLockedRoom] = useState(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const fetchRooms = () => {
    setLoading(true);
    axios.get('/api/rooms')
      .then(r => setRooms(r.data.filter(rm => rm.isActive && !rm.deletedAt)))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchRooms(); }, []);

  const filtered = rooms.filter(r => {
    const matchSearch = !search || r.title.toLowerCase().includes(search.toLowerCase()) || r.movieTitle?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || (filter === 'youtube' && r.providerType === 'youtube') || (filter === 'external' && r.providerType === 'external') || (filter === 'open' && !r.isLocked) || (filter === 'live' && (r.liveCount || 0) > 0);
    return matchSearch && matchFilter;
  });

  return (
    <div className="min-h-screen pb-24" style={{ background: '#0a0a0f' }}>
      <div className="max-w-lg mx-auto px-4 pt-4">
        <div className="flex items-center gap-3 mb-4">
          <BackButton />
          <h1 className="cinzel font-bold text-lg gold-text flex-1">🎬 Sinema Odaları</h1>
          {user && (
            <button onClick={() => setShowCreate(true)}
              className="text-xs px-3 py-1.5 rounded-full font-bold flex items-center gap-1"
              style={{ background: 'linear-gradient(135deg,rgba(212,175,55,0.25),rgba(212,175,55,0.1))', color: '#d4af37', border: '1px solid rgba(212,175,55,0.5)' }}>
              + Oda Kur
            </button>
          )}
        </div>

        <input
          type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Oda veya film ara..."
          className="w-full px-4 py-2.5 rounded-xl text-white text-sm outline-none mb-3"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,175,55,0.2)' }}
        />

        <div className="flex gap-2 overflow-x-auto pb-2 mb-3 scrollbar-hide">
          {[
            { key: 'all', label: '🎭 Tümü' },
            { key: 'live', label: '🟢 Canlı' },
            { key: 'youtube', label: '▶️ YouTube' },
            { key: 'external', label: '🔗 Harici' },
            { key: 'open', label: '🔓 Açık' },
          ].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold flex-shrink-0 transition-all"
              style={{
                background: filter === f.key ? 'rgba(212,175,55,0.2)' : 'rgba(255,255,255,0.04)',
                color: filter === f.key ? '#d4af37' : '#6b7280',
                border: `1px solid ${filter === f.key ? 'rgba(212,175,55,0.4)' : 'rgba(255,255,255,0.06)'}`,
              }}>
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500 text-sm animate-pulse">Odalar yükleniyor...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <div className="text-4xl">🎬</div>
            <p className="text-gray-500 text-sm">{search ? 'Arama sonucu bulunamadı' : 'Henüz aktif oda yok'}</p>
            {user && !search && (
              <button onClick={() => setShowCreate(true)}
                className="text-sm px-6 py-2.5 rounded-xl font-bold mt-2"
                style={{ background: 'rgba(212,175,55,0.15)', color: '#d4af37', border: '1px solid rgba(212,175,55,0.3)' }}>
                🎬 İlk Odayı Kur
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(r => (
              <RoomCard key={r.id} room={r} onJoinLocked={setLockedRoom} />
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateRoomModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); fetchRooms(); }}
        />
      )}

      {lockedRoom && (
        <PasswordPrompt
          roomId={lockedRoom.id}
          roomTitle={lockedRoom.title}
          onSuccess={() => { navigate(`/rooms/${lockedRoom.id}`); setLockedRoom(null); }}
          onClose={() => setLockedRoom(null)}
        />
      )}
    </div>
  );
}
