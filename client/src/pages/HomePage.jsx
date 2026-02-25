import { useState, useEffect } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import CreateRoomModal from '../components/CreateRoomModal';
import PasswordPrompt from '../components/PasswordPrompt';
import UserProfileCard from '../components/UserProfileCard';
import UserAvatar from '../components/UserAvatar';
import LandingPage from './LandingPage';
import { brand } from '../config/brand';

function StatCard({ icon, value, label, color = '#d4af37' }) {
  return (
    <div className="flex-1 min-w-0 rounded-2xl p-3 flex flex-col items-center gap-1 text-center"
      style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${color}30`, backdropFilter: 'blur(8px)' }}>
      <span className="text-xl">{icon}</span>
      <span className="font-black text-base sm:text-lg" style={{ color }}>{value}</span>
      <span className="text-gray-400 text-xs leading-tight">{label}</span>
    </div>
  );
}

function MemberCard({ user, rank, onClick }) {
  const isFirst = rank === 1;
  const borderColor = isFirst ? '#d4af37' : rank === 2 ? '#9b59b6' : '#b8962a';
  const glowColor = isFirst ? 'rgba(212,175,55,0.4)' : rank === 2 ? 'rgba(155,89,182,0.4)' : 'rgba(184,150,42,0.3)';
  const initial = user.username?.[0]?.toUpperCase() || '?';
  return (
    <div
      onClick={onClick}
      className="flex-1 min-w-[90px] rounded-2xl p-3 sm:p-4 flex flex-col items-center gap-2 relative overflow-hidden cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98]"
      style={{
        background: `linear-gradient(160deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))`,
        border: `1.5px solid ${borderColor}`,
        boxShadow: `0 0 20px ${glowColor}`,
        touchAction: 'manipulation',
        WebkitTapHighlightColor: 'transparent',
      }}>
      <div className="absolute inset-0 opacity-10"
        style={{ background: `radial-gradient(circle at 50% 30%, ${borderColor}, transparent 70%)` }} />
      <div className="absolute top-1.5 left-1.5 text-xs font-bold px-1.5 py-0.5 rounded-full"
        style={{ background: `${borderColor}20`, color: borderColor, border: `1px solid ${borderColor}40` }}>
        {rank === 1 ? '👑 #1' : rank === 2 ? '🥈 #2' : '🥉 #3'}
      </div>
      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center font-black text-xl sm:text-2xl mt-3 relative flex-shrink-0"
        style={{ background: `linear-gradient(135deg, ${borderColor}, ${borderColor}80)`, color: '#0f0f14', boxShadow: `0 0 15px ${glowColor}` }}>
        {user.avatarUrl
          ? <img src={user.avatarUrl} alt={user.username} className="w-full h-full rounded-full object-cover" />
          : initial
        }
      </div>
      <div>
        <div className="font-black text-xs sm:text-sm text-white text-center tracking-wide uppercase truncate max-w-[80px]">{user.username}</div>
        <div className="text-xs text-center" style={{ color: borderColor }}>Lv.{user.level}</div>
      </div>
      {user.vip && (
        <span className="text-xs px-1.5 py-0.5 rounded-full font-bold"
          style={{ background: 'rgba(212,175,55,0.15)', color: '#d4af37', border: '1px solid rgba(212,175,55,0.3)' }}>
          VIP 💎
        </span>
      )}
    </div>
  );
}

function QuickAccessCard({ icon, label, to, color = '#d4af37' }) {
  return (
    <Link to={to || '/'} className="flex flex-col items-center gap-2 p-3 rounded-2xl transition-all hover:scale-105 flex-shrink-0"
      style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${color}25`, minWidth: '60px' }}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
        style={{ background: `${color}15`, border: `1px solid ${color}30`, boxShadow: `0 0 10px ${color}20` }}>
        {icon}
      </div>
      <span className="text-gray-300 text-xs text-center leading-tight font-medium">{label}</span>
    </Link>
  );
}

function MyRoomCard({ room, onDelete }) {
  const navigate = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleDelete = async () => {
    try {
      await axios.delete(`/api/rooms/${room.id}`);
      onDelete?.();
    } catch {}
  };

  return (
    <div className="rounded-2xl overflow-hidden relative"
      style={{
        background: 'linear-gradient(135deg, rgba(212,175,55,0.12), rgba(212,175,55,0.04))',
        border: '1.5px solid rgba(212,175,55,0.5)',
        boxShadow: '0 0 20px rgba(212,175,55,0.15)'
      }}>
      <div className="flex items-center gap-2 px-3 pt-2.5 pb-1">
        <span className="text-xs font-bold cinzel px-2 py-0.5 rounded-full"
          style={{ background: 'rgba(212,175,55,0.2)', color: '#d4af37', border: '1px solid rgba(212,175,55,0.4)' }}>
          👑 Benim Odam
        </span>
        <div className="flex items-center gap-1 ml-auto">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
          <span className="text-xs text-green-400 font-bold">{room.liveCount || 0} izleyici</span>
        </div>
      </div>

      <div className="flex items-center gap-3 p-3 pt-1">
        {room.posterUrl ? (
          <img src={room.posterUrl} alt={room.title} className="w-14 h-10 object-cover rounded-xl flex-shrink-0" />
        ) : (
          <div className="w-14 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-2xl"
            style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.2)' }}>
            {room.providerType === 'youtube' ? '▶️' : '🔗'}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="text-white font-bold text-sm truncate flex items-center gap-1.5">
            {room.title}
            {room.isLocked && <span className="text-xs">🔒</span>}
            {room.isTrending && <span className="text-xs" style={{ color: '#ff6400' }}>🔥</span>}
          </div>
          {room.movieTitle && <div className="text-gray-400 text-xs truncate">{room.movieTitle}</div>}
        </div>
      </div>

      <div className="flex gap-2 px-3 pb-3">
        <button onClick={() => navigate(`/rooms/${room.id}`)}
          className="flex-1 py-2 rounded-xl text-sm font-bold transition-all"
          style={{ background: 'rgba(212,175,55,0.2)', color: '#d4af37', border: '1px solid rgba(212,175,55,0.4)' }}>
          🎬 Odama Git
        </button>
        {!confirmDelete ? (
          <button onClick={() => setConfirmDelete(true)}
            className="px-3 py-2 rounded-xl text-sm text-red-400 transition-all"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
            🗑️
          </button>
        ) : (
          <div className="flex gap-1">
            <button onClick={handleDelete}
              className="px-2 py-2 rounded-xl text-xs text-red-400 font-bold"
              style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)' }}>
              Kapat
            </button>
            <button onClick={() => setConfirmDelete(false)}
              className="px-2 py-2 rounded-xl text-xs text-gray-400"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
              İptal
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function RoomRow({ room, onJoinLocked }) {
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
      className="flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99]"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(212,175,55,0.12)' }}>
      {room.posterUrl ? (
        <img src={room.posterUrl} alt={room.title} className="w-11 h-11 object-cover rounded-xl flex-shrink-0" />
      ) : (
        <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-xl"
          style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.2)' }}>
          {room.providerType === 'youtube' ? '▶️' : '🔗'}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-white font-bold text-sm truncate">{room.title}</span>
          {room.isLocked && <span className="text-xs">🔒</span>}
          {isOwned && <span className="text-xs px-1.5 py-0.5 rounded font-bold"
            style={{ background: 'rgba(212,175,55,0.2)', color: '#d4af37' }}>👑</span>}
          {room.isTrending && <span className="text-xs px-1.5 py-0.5 rounded font-bold"
            style={{ background: 'rgba(255,100,0,0.2)', color: '#ff6400' }}>🔥</span>}
        </div>
        {room.movieTitle && <div className="text-gray-500 text-xs truncate">{room.movieTitle}</div>}
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {liveCount > 0 ? (
          <>
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
            <span className="text-xs text-green-400 font-semibold">{liveCount}</span>
          </>
        ) : (
          <>
            <span className="w-2 h-2 rounded-full bg-gray-600"></span>
            <span className="text-xs text-gray-500">0</span>
          </>
        )}
      </div>
    </div>
  );
}

function AnnouncementCard({ ann }) {
  return (
    <div className="p-3 rounded-2xl flex items-start gap-3"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(212,175,55,0.1)' }}>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm"
        style={{ background: 'rgba(212,175,55,0.12)', color: '#d4af37' }}>
        📢
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-white text-sm font-bold leading-tight">{ann.titleTR || ann.title}</div>
        {ann.contentTR && <div className="text-gray-400 text-xs mt-0.5 line-clamp-2">{ann.contentTR}</div>}
      </div>
    </div>
  );
}

function NewsCard({ item }) {
  return (
    <Link to={`/news/${item.id}`}
      className="flex gap-3 p-3 rounded-2xl transition-all hover:scale-[1.01] active:scale-[0.99]"
      style={{ background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.15)' }}>
      {item.imageUrl ? (
        <img src={item.imageUrl} alt={item.title} className="w-14 h-14 object-cover rounded-xl flex-shrink-0" />
      ) : (
        <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 text-2xl"
          style={{ background: 'rgba(168,85,247,0.12)' }}>📰</div>
      )}
      <div className="flex-1 min-w-0">
        <div className="text-white text-sm font-bold leading-tight line-clamp-2">{item.title}</div>
        {item.description && (
          <div className="text-gray-400 text-xs mt-1 line-clamp-2">{item.description}</div>
        )}
        <div className="text-xs mt-1" style={{ color: '#c084fc' }}>
          {new Date(item.createdAt).toLocaleDateString('tr-TR')}
        </div>
      </div>
    </Link>
  );
}

export default function HomePage() {
  const { user } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const { socket } = useOutletContext() || {};
  const [rooms, setRooms] = useState([]);
  const [myRoom, setMyRoom] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [news, setNews] = useState([]);
  const [topUsers, setTopUsers] = useState([]);
  const [lockedRoom, setLockedRoom] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [totalMembers, setTotalMembers] = useState(0);
  const [vipCount, setVipCount] = useState(0);
  const [profileUserId, setProfileUserId] = useState(null);

  const fetchRooms = () => {
    axios.get('/api/rooms').then(r => setRooms(r.data.filter(rm => rm.isActive && !rm.deletedAt))).catch(() => {});
  };

  const fetchMyRoom = () => {
    if (!user) return;
    axios.get('/api/rooms/my').then(r => setMyRoom(r.data)).catch(() => setMyRoom(null));
  };

  const fetchNews = () => {
    axios.get('/api/news').then(r => setNews(r.data.slice(0, 2))).catch(() => {});
  };

  useEffect(() => {
    fetchRooms();
    fetchNews();
    axios.get('/api/announcements').then(r => setAnnouncements(r.data.slice(0, 3))).catch(() => {});
    axios.get('/api/top-users').then(r => {
      setTopUsers(r.data.slice(0, 3));
      setTotalMembers(r.data.length || 0);
      setVipCount(r.data.filter(u => u.vip).length || 0);
    }).catch(() => {});
  }, []);

  useEffect(() => { fetchMyRoom(); }, [user]);

  useEffect(() => {
    if (!socket) return;
    const handleNewRoom = () => fetchRooms();
    const handleRoomDeleted = () => fetchRooms();
    const handleNewNews = () => fetchNews();
    socket.on('new_room_opened', handleNewRoom);
    socket.on('room_deleted', handleRoomDeleted);
    socket.on('new_news_published', handleNewNews);
    return () => {
      socket.off('new_room_opened', handleNewRoom);
      socket.off('room_deleted', handleRoomDeleted);
      socket.off('new_news_published', handleNewNews);
    };
  }, [socket]);

  const handleJoinLocked = (room) => {
    if (!user) { navigate('/login'); return; }
    setLockedRoom(room);
  };

  const handlePassword = () => {
    if (lockedRoom) navigate(`/rooms/${lockedRoom.id}`);
    setLockedRoom(null);
  };

  const totalOnline = rooms.reduce((sum, r) => sum + (r.liveCount || 0), 0);
  const activeRoomCount = rooms.length;
  const otherRooms = myRoom ? rooms.filter(r => r.id !== myRoom.id) : rooms;

  if (!user) {
    return <LandingPage settings={settings} rooms={rooms} />;
  }

  return (
    <div className="min-h-screen pb-24" style={{ background: '#0a0a0f' }}>
      <div className="w-[96%] max-w-[1600px] mx-auto px-4 xl:px-6 pt-4">

        <div className="lg:grid lg:grid-cols-[1fr_380px] xl:grid-cols-[1fr_460px] 2xl:grid-cols-[1fr_520px] lg:gap-6 xl:gap-10 2xl:gap-12 lg:items-start">

          {/* ── MAIN COLUMN ── */}
          <div className="space-y-4">

            {/* Hero Banner */}
            <div className="relative rounded-3xl overflow-hidden p-4 pb-5"
              style={{
                background: 'linear-gradient(135deg, #1a0a2e 0%, #2a0a1e 40%, #1e0a0a 70%, #0f0520 100%)',
                border: '1.5px solid rgba(212,175,55,0.3)',
                boxShadow: '0 0 40px rgba(212,175,55,0.12), 0 0 80px rgba(155,89,182,0.08)',
              }}>
              <div className="absolute inset-0 opacity-20"
                style={{ background: 'radial-gradient(ellipse at 80% 50%, rgba(155,89,182,0.4), transparent 60%)' }} />
              <div className="absolute inset-0 opacity-10"
                style={{ background: 'radial-gradient(ellipse at 20% 50%, rgba(212,175,55,0.5), transparent 60%)' }} />

              <div className="relative z-10 flex items-center gap-3">
                <div className="flex-1">
                  <div className="cinzel font-black text-xl sm:text-2xl leading-tight mb-0.5"
                    style={{ color: '#d4af37', textShadow: '0 0 20px rgba(212,175,55,0.5)' }}>
                    {settings?.siteTitle || brand.name}
                  </div>
                  <div className="text-sm mb-3">
                    <span className="font-black italic" style={{ color: '#c084fc' }}>
                      {settings?.heroCardSubtitle || 'Sesin Gücü Bizde!'}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {(settings?.heroCardStat1Value || settings?.heroCardStat1Label) && (
                      <div className="flex items-center gap-2 text-xs text-gray-300">
                        <span className="w-4 h-4 rounded-full flex items-center justify-center text-xs"
                          style={{ background: 'rgba(212,175,55,0.2)' }}>
                          {settings?.heroCardStat1Icon || '🔒'}
                        </span>
                        <span>
                          {settings?.heroCardStat1Value && (
                            <span className="font-bold text-white">{settings.heroCardStat1Value} </span>
                          )}
                          {settings?.heroCardStat1Label || 'Aktif Yayıncı'}
                        </span>
                      </div>
                    )}
                    {(settings?.heroCardStat2Value || settings?.heroCardStat2Label) && (
                      <div className="flex items-center gap-2 text-xs text-gray-300">
                        <span className="w-4 h-4 rounded-full flex items-center justify-center text-xs"
                          style={{ background: 'rgba(155,89,182,0.2)' }}>
                          {settings?.heroCardStat2Icon || '🏆'}
                        </span>
                        <span>
                          {settings?.heroCardStat2Value && (
                            <span className="font-bold text-white">{settings.heroCardStat2Value} </span>
                          )}
                          {settings?.heroCardStat2Label || 'Bu Ayki Kazanç'}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-xs">
                      <span className="w-4 h-4 rounded-full flex items-center justify-center text-xs"
                        style={{ background: 'rgba(34,197,94,0.15)' }}>
                        {settings?.heroCardStat3Icon || '✨'}
                      </span>
                      <span className="text-gray-300">Şu An</span>
                      <span className="font-black px-2 py-0.5 rounded-lg text-xs"
                        style={{ background: 'rgba(212,175,55,0.2)', color: '#d4af37', border: '1px solid rgba(212,175,55,0.3)' }}>
                        {activeRoomCount}
                      </span>
                      <span className="text-gray-300">{settings?.heroCardStat3Label || 'Oda Aktif'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex-shrink-0 relative">
                  {settings?.heroCardUser ? (
                    <div className="flex flex-col items-center gap-1">
                      <UserAvatar user={settings.heroCardUser} size={80} />
                      <span className="text-xs font-bold truncate max-w-[90px] text-center"
                        style={{ color: '#d4af37' }}>
                        {settings.heroCardUser.username}
                      </span>
                    </div>
                  ) : settings?.wolfImageUrl ? (
                    <img src={settings.wolfImageUrl} alt="emblem"
                      className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover"
                      style={{ boxShadow: '0 0 30px rgba(155,89,182,0.6), 0 0 60px rgba(212,175,55,0.3)' }} />
                  ) : (
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center relative"
                      style={{ background: 'radial-gradient(circle, rgba(155,89,182,0.3), rgba(212,175,55,0.1))', boxShadow: '0 0 30px rgba(155,89,182,0.5), 0 0 60px rgba(212,175,55,0.3)' }}>
                      <div className="absolute inset-0 rounded-full"
                        style={{ border: '2px solid rgba(212,175,55,0.4)', boxShadow: 'inset 0 0 20px rgba(155,89,182,0.2)' }} />
                      <span className="text-4xl sm:text-5xl">🐺</span>
                    </div>
                  )}
                  {!settings?.heroCardUser && (
                    <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs"
                      style={{ background: 'linear-gradient(135deg, #d4af37, #b8962a)', color: '#0f0f14', fontWeight: 900 }}>
                      👑
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Active Rooms */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-bold text-white text-sm flex items-center gap-2">
                  <span style={{ color: '#d4af37' }}>🎭</span> Aktif Odalar
                </h2>
                {!myRoom ? (
                  <button onClick={() => setShowCreate(true)}
                    className="text-xs px-3 py-1.5 rounded-full flex items-center gap-1 font-bold transition-all"
                    style={{
                      background: 'linear-gradient(135deg, rgba(212,175,55,0.25), rgba(212,175,55,0.1))',
                      color: '#d4af37',
                      border: '1px solid rgba(212,175,55,0.5)',
                      boxShadow: '0 0 12px rgba(212,175,55,0.2)',
                    }}>
                    🎬 Oda Kur
                  </button>
                ) : (
                  <button onClick={() => navigate(`/rooms/${myRoom.id}`)}
                    className="text-xs px-3 py-1.5 rounded-full flex items-center gap-1 font-bold transition-all"
                    style={{ background: 'rgba(212,175,55,0.15)', color: '#d4af37', border: '1px solid rgba(212,175,55,0.3)' }}>
                    👑 Odam
                  </button>
                )}
              </div>

              {myRoom && (
                <div className="mb-3">
                  <MyRoomCard room={myRoom} onDelete={() => { setMyRoom(null); fetchRooms(); }} />
                </div>
              )}

              <div className="space-y-2">
                {otherRooms.length === 0 && !myRoom ? (
                  <div className="text-center py-8 space-y-3">
                    <div className="text-gray-600 text-sm">Henüz aktif oda yok</div>
                    <button onClick={() => setShowCreate(true)}
                      className="text-sm px-6 py-2.5 rounded-xl font-bold transition-all"
                      style={{
                        background: 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.08))',
                        color: '#d4af37', border: '1px solid rgba(212,175,55,0.4)',
                        boxShadow: '0 0 20px rgba(212,175,55,0.15)',
                      }}>
                      🎬 İlk Odayı Sen Kur
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {otherRooms.map(r => <RoomRow key={r.id} room={r} onJoinLocked={handleJoinLocked} />)}
                  </div>
                )}
              </div>
            </div>

            {/* Top Users (mobile only - shown in main col) */}
            <div className="lg:hidden">
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-bold text-white text-sm flex items-center gap-2">
                  <span style={{ color: '#d4af37' }}>🏆</span> Sıralama
                </h2>
                <Link to="/leaderboard" className="text-xs px-3 py-1 rounded-full"
                  style={{ background: 'rgba(212,175,55,0.1)', color: '#d4af37', border: '1px solid rgba(212,175,55,0.2)' }}>
                  Tümü →
                </Link>
              </div>
              {topUsers.length > 0 ? (
                <div className="flex gap-2">
                  {topUsers.map((u, i) => (
                    <MemberCard key={u.id} user={u} rank={i + 1} onClick={() => setProfileUserId(u.id)} />
                  ))}
                </div>
              ) : (
                <div className="flex gap-2">
                  {[1, 2, 3].map(rank => (
                    <div key={rank} className="flex-1 rounded-2xl p-3 flex flex-col items-center gap-2"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(212,175,55,0.1)' }}>
                      <div className="text-xs font-bold px-1.5 py-0.5 rounded-full"
                        style={{ background: 'rgba(212,175,55,0.1)', color: 'rgba(212,175,55,0.4)' }}>
                        {rank === 1 ? '👑 #1' : rank === 2 ? '🥈 #2' : '🥉 #3'}
                      </div>
                      <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>?</div>
                      <div className="text-xs text-gray-600">Boş</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* News */}
            {news.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="font-bold text-white text-sm flex items-center gap-2">
                    <span style={{ color: '#c084fc' }}>📰</span> Haberler
                  </h2>
                  <Link to="/news" className="text-xs px-3 py-1 rounded-full transition-colors"
                    style={{ background: 'rgba(168,85,247,0.1)', color: '#c084fc', border: '1px solid rgba(168,85,247,0.25)' }}>
                    Tüm Haberler →
                  </Link>
                </div>
                <div className="space-y-2">
                  {news.map(n => <NewsCard key={n.id} item={n} />)}
                </div>
              </div>
            )}

            {/* Announcements */}
            {announcements.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="font-bold text-white text-sm flex items-center gap-2">
                    <span style={{ color: '#d4af37' }}>🔔</span> Duyurular
                  </h2>
                  <Link to="/announcements" className="text-xs px-3 py-1 rounded-full transition-colors"
                    style={{ background: 'rgba(212,175,55,0.08)', color: '#d4af37', border: '1px solid rgba(212,175,55,0.2)' }}>
                    Tümünü Gör →
                  </Link>
                </div>
                <div className="space-y-2">
                  {announcements.map(a => <AnnouncementCard key={a.id} ann={a} />)}
                </div>
              </div>
            )}
          </div>

          {/* ── SIDE COLUMN (desktop only / stacked on mobile) ── */}
          <div className="space-y-4 mt-4 lg:mt-0">

            {/* Stats */}
            <div className="flex gap-2">
              <StatCard icon="👥" value={(totalMembers || 3570).toLocaleString()} label="Üye" />
              <StatCard icon="🟢" value={totalOnline || 0} label="Online" color="#22c55e" />
              <StatCard icon="💎" value={vipCount || 124} label="VIP" color="#c084fc" />
              <StatCard icon="🎬" value={activeRoomCount} label="Oda" />
            </div>

            {/* Quick Access */}
            <div>
              <h2 className="font-bold text-white text-sm mb-2 flex items-center gap-2">
                <span style={{ color: '#d4af37' }}>⚡</span> Hızlı Erişim
              </h2>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                <QuickAccessCard icon="🎪" label="Etkinlikler" to="/events" color="#f59e0b" />
                <QuickAccessCard icon="⚔️" label="PK Maçlar" to="/pk" color="#ef4444" />
                <QuickAccessCard icon="💬" label="Sohbet" color="#22c55e" />
                <QuickAccessCard icon="🎬" label="Sinema" to="/rooms" color="#c084fc" />
                <QuickAccessCard icon="👑" label="VIP" color="#d4af37" />
                <QuickAccessCard icon="🏆" label="Sıralama" to="/leaderboard" color="#60a5fa" />
              </div>
            </div>
          </div>

        </div>
      </div>

      {profileUserId && (
        <UserProfileCard userId={profileUserId} onClose={() => setProfileUserId(null)} />
      )}

      {showCreate && (
        <CreateRoomModal
          onClose={() => setShowCreate(false)}
          onCreated={(room) => {
            setShowCreate(false);
            setMyRoom(room);
            fetchRooms();
          }}
        />
      )}

      {lockedRoom && (
        <PasswordPrompt
          roomId={lockedRoom.id}
          roomTitle={lockedRoom.title}
          onSuccess={handlePassword}
          onClose={() => setLockedRoom(null)}
        />
      )}
    </div>
  );
}
