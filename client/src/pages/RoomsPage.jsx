import { useState, useEffect } from 'react';
import { useNavigate, Link, useOutletContext } from 'react-router-dom';
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
  const isVipRoom = room.owner?.vip || room.owner?.role === 'admin';

  const handleClick = () => {
    if (room.isLocked && !isOwned) { onJoinLocked(room); return; }
    navigate(`/rooms/${room.id}`);
  };

  return (
    <div onClick={handleClick}
      className={`p-4 rounded-2xl cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] ${isVipRoom ? 'vip-room-card' : ''}`}
      style={!isVipRoom ? {
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(212,175,55,0.12)',
      } : {}}>
      {isVipRoom && (
        <div className="flex items-center gap-1.5 mb-2">
          <span className="text-xs font-bold px-2 py-0.5 rounded-full animate-pulse"
            style={{ background: 'rgba(168,85,247,0.2)', color: '#c084fc', border: '1px solid rgba(168,85,247,0.4)' }}>
            💎 VIP Oda
          </span>
          {room.isTrending && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(255,100,0,0.2)', color: '#fb923c', border: '1px solid rgba(255,100,0,0.4)' }}>
              🔥 Trend
            </span>
          )}
        </div>
      )}
      <div className="flex gap-3">
        {room.posterUrl ? (
          <img src={room.posterUrl} alt={room.title} className="w-16 h-20 object-cover rounded-xl flex-shrink-0" />
        ) : (
          <div className="w-16 h-20 rounded-xl flex items-center justify-center flex-shrink-0 text-3xl"
            style={{ background: isVipRoom ? 'rgba(168,85,247,0.12)' : 'rgba(212,175,55,0.08)', border: `1px solid ${isVipRoom ? 'rgba(168,85,247,0.25)' : 'rgba(212,175,55,0.15)'}` }}>
            {room.providerType === 'youtube' ? '▶️' : '🔗'}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold text-sm leading-tight" style={{ color: isVipRoom ? '#e9d5ff' : '#fff' }}>{room.title}</h3>
            <div className="flex items-center gap-1 flex-shrink-0">
              {room.isLocked && !isOwned && <span className="text-xs text-gray-400">🔒</span>}
              {room.isLocked && isOwned && <span className="text-xs text-gray-400">🔑</span>}
              {!isVipRoom && room.isTrending && <span className="text-xs" style={{ color: '#ff6400' }}>🔥</span>}
            </div>
          </div>
          {room.movieTitle && (
            <p className="text-xs mt-0.5 truncate" style={{ color: isVipRoom ? '#c084fc' : '#d4af37' }}>{room.movieTitle}</p>
          )}
          {room.description && (
            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{room.description}</p>
          )}
          <div className="flex items-center justify-between mt-2 flex-wrap gap-1">
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
            <div className="flex items-center gap-1.5">
              {isOwned && (
                <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                  style={{ background: 'rgba(212,175,55,0.15)', color: '#d4af37', border: '1px solid rgba(212,175,55,0.3)' }}>
                  👑 Sahibi
                </span>
              )}
              {room.owner && !isOwned && (
                <span className="text-xs" style={{ color: isVipRoom ? '#c084fc' : '#6b7280' }}>
                  {isVipRoom ? '💎' : '@'}{room.owner.username}
                </span>
              )}
              <span className="text-xs text-gray-600 capitalize">{room.providerType}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MyRoomBanner({ room, onDelete, user }) {
  const navigate = useNavigate();
  const liveCount = room.liveCount || 0;
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const isVipOwner = user?.vip || user?.role === 'admin';

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await axios.delete(`/api/rooms/${room.id}`);
      onDelete();
    } catch (err) {
      alert(err.response?.data?.error || 'Oda kapatılırken hata oluştu');
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  return (
    <div className={`rounded-2xl p-4 mb-4 ${isVipOwner ? 'owned-vip-room-card' : ''}`}
      style={!isVipOwner ? { background: 'linear-gradient(135deg,rgba(212,175,55,0.12),rgba(212,175,55,0.04))', border: '1.5px solid rgba(212,175,55,0.4)' } : {}}>
      <div className="absolute inset-0 opacity-5"
        style={{ background: 'radial-gradient(circle at 80% 50%, #d4af37, transparent 70%)' }} />
      <div className="relative">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold px-2 py-1 rounded-full"
            style={{ background: 'rgba(212,175,55,0.2)', color: '#d4af37', border: '1px solid rgba(212,175,55,0.35)' }}>
            👑 Benim Odam
          </span>
          {liveCount > 0 && (
            <span className="text-xs text-green-400 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block"></span>
              {liveCount} canlı
            </span>
          )}
        </div>
        <h3 className="text-white font-bold text-sm mb-0.5">{room.title}</h3>
        {room.movieTitle && <p className="text-xs mb-3" style={{ color: '#d4af37' }}>{room.movieTitle}</p>}
        <div className="flex gap-2">
          <button
            onClick={() => navigate(`/rooms/${room.id}`)}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all"
            style={{ background: 'rgba(212,175,55,0.2)', color: '#d4af37', border: '1px solid rgba(212,175,55,0.4)' }}>
            ▶ Odama Gir
          </button>
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="px-4 py-2.5 rounded-xl text-sm transition-all"
              style={{ background: 'rgba(239,68,68,0.08)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>
              🗑️
            </button>
          ) : (
            <div className="flex gap-1.5">
              <button onClick={handleDelete} disabled={deleting}
                className="px-3 py-2 rounded-xl text-xs font-bold"
                style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}>
                {deleting ? '...' : 'Evet'}
              </button>
              <button onClick={() => setConfirmDelete(false)}
                className="px-3 py-2 rounded-xl text-xs"
                style={{ background: 'rgba(255,255,255,0.05)', color: '#9ca3af', border: '1px solid rgba(255,255,255,0.1)' }}>
                İptal
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function RoomsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { socket } = useOutletContext() || {};
  const [rooms, setRooms] = useState([]);
  const [myRoom, setMyRoom] = useState(null);
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

  const fetchMyRoom = () => {
    if (!user) return;
    axios.get('/api/rooms/my').then(r => setMyRoom(r.data)).catch(() => setMyRoom(null));
  };

  useEffect(() => { fetchRooms(); fetchMyRoom(); }, [user]);

  useEffect(() => {
    if (!socket) return;
    const handleNewRoom = () => fetchRooms();
    const handleRoomDeleted = () => fetchRooms();
    socket.on('new_room_opened', handleNewRoom);
    socket.on('room_deleted', handleRoomDeleted);
    return () => {
      socket.off('new_room_opened', handleNewRoom);
      socket.off('room_deleted', handleRoomDeleted);
    };
  }, [socket]);

  const otherRooms = rooms.filter(r => !user || r.ownerId !== user.id);
  const filtered = otherRooms
    .filter(r => {
      const matchSearch = !search || r.title.toLowerCase().includes(search.toLowerCase()) || r.movieTitle?.toLowerCase().includes(search.toLowerCase());
      const matchFilter = filter === 'all' || (filter === 'youtube' && r.providerType === 'youtube') || (filter === 'external' && r.providerType === 'external') || (filter === 'open' && !r.isLocked) || (filter === 'live' && (r.liveCount || 0) > 0);
      return matchSearch && matchFilter;
    })
    .sort((a, b) => {
      const aVip = a.owner?.vip || a.owner?.role === 'admin' ? 1 : 0;
      const bVip = b.owner?.vip || b.owner?.role === 'admin' ? 1 : 0;
      if (bVip !== aVip) return bVip - aVip;
      if (b.isTrending !== a.isTrending) return (b.isTrending ? 1 : 0) - (a.isTrending ? 1 : 0);
      return (b.liveCount || 0) - (a.liveCount || 0);
    });

  return (
    <div className="min-h-screen pb-24" style={{ background: '#0a0a0f' }}>
      <div className="max-w-7xl mx-auto px-4 xl:px-8 pt-4">

        <div className="flex items-center gap-3 mb-4">
          <BackButton />
          <h1 className="cinzel font-bold text-lg gold-text flex-1">🎬 Sinema Odaları</h1>
          {user && !myRoom && (
            <button onClick={() => setShowCreate(true)}
              className="text-xs px-3 py-2 rounded-full font-bold flex items-center gap-1"
              style={{ background: 'linear-gradient(135deg,rgba(212,175,55,0.25),rgba(212,175,55,0.1))', color: '#d4af37', border: '1px solid rgba(212,175,55,0.5)' }}>
              + Oda Kur
            </button>
          )}
        </div>

        {myRoom && (
          <MyRoomBanner room={myRoom} user={user} onDelete={() => { setMyRoom(null); fetchRooms(); }} />
        )}

        <input
          type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Oda veya film ara..."
          className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none mb-3"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,175,55,0.2)' }}
        />

        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
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
          <div className="text-center py-16 text-gray-500 text-sm animate-pulse">Odalar yükleniyor...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <div className="text-4xl">🎬</div>
            <p className="text-gray-500 text-sm">{search ? 'Arama sonucu bulunamadı' : 'Henüz başka aktif oda yok'}</p>
            {user && !search && !myRoom && (
              <button onClick={() => setShowCreate(true)}
                className="text-sm px-6 py-2.5 rounded-xl font-bold mt-2"
                style={{ background: 'rgba(212,175,55,0.15)', color: '#d4af37', border: '1px solid rgba(212,175,55,0.3)' }}>
                🎬 İlk Odayı Kur
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
            {filtered.map(r => (
              <RoomCard key={r.id} room={r} onJoinLocked={setLockedRoom} />
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateRoomModal
          onClose={() => setShowCreate(false)}
          onCreated={(room) => { setShowCreate(false); setMyRoom(room); fetchRooms(); }}
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
