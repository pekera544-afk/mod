import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import CreateRoomModal from '../components/CreateRoomModal';
import PasswordPrompt from '../components/PasswordPrompt';
import LandingPage from './LandingPage';

function StatCard({ icon, value, label, color = '#d4af37' }) {
  return (
    <div className="flex-1 min-w-[70px] rounded-2xl p-3 flex flex-col items-center gap-1 text-center"
      style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${color}30`, backdropFilter: 'blur(8px)' }}>
      <span className="text-xl">{icon}</span>
      <span className="font-black text-base" style={{ color }}>{value}</span>
      <span className="text-gray-400 text-xs leading-tight">{label}</span>
    </div>
  );
}

function MemberCard({ user, rank }) {
  const isFirst = rank === 1;
  const borderColor = isFirst ? '#d4af37' : rank === 2 ? '#9b59b6' : '#b8962a';
  const glowColor = isFirst ? 'rgba(212,175,55,0.4)' : rank === 2 ? 'rgba(155,89,182,0.4)' : 'rgba(184,150,42,0.3)';
  const initial = user.username?.[0]?.toUpperCase() || '?';
  return (
    <div className="flex-1 min-w-[100px] rounded-2xl p-4 flex flex-col items-center gap-2 relative overflow-hidden"
      style={{
        background: `linear-gradient(160deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))`,
        border: `1.5px solid ${borderColor}`,
        boxShadow: `0 0 20px ${glowColor}`,
      }}>
      <div className="absolute inset-0 opacity-10"
        style={{ background: `radial-gradient(circle at 50% 30%, ${borderColor}, transparent 70%)` }} />
      <div className="absolute top-2 left-2 text-xs font-bold px-2 py-0.5 rounded-full"
        style={{ background: `${borderColor}20`, color: borderColor, border: `1px solid ${borderColor}40` }}>
        {rank === 1 ? '👑 #1' : rank === 2 ? '🥈 #2' : '🥉 #3'}
      </div>
      <div className="w-16 h-16 rounded-full flex items-center justify-center font-black text-2xl mt-3 relative"
        style={{ background: `linear-gradient(135deg, ${borderColor}, ${borderColor}80)`, color: '#0f0f14', boxShadow: `0 0 15px ${glowColor}` }}>
        {initial}
      </div>
      <div>
        <div className="font-black text-sm text-white text-center tracking-wide uppercase">{user.username}</div>
        <div className="text-xs text-center" style={{ color: borderColor }}>@{user.username?.toLowerCase()}</div>
      </div>
      {user.vip && (
        <span className="text-xs px-2 py-0.5 rounded-full font-bold"
          style={{ background: 'rgba(212,175,55,0.15)', color: '#d4af37', border: '1px solid rgba(212,175,55,0.3)' }}>
          VIP 💎
        </span>
      )}
    </div>
  );
}

function QuickAccessCard({ icon, label, to, color = '#d4af37' }) {
  return (
    <Link to={to || '/'} className="flex flex-col items-center gap-2 p-3 rounded-2xl transition-all hover:scale-105"
      style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${color}25`, minWidth: '64px' }}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
        style={{ background: `${color}15`, border: `1px solid ${color}30`, boxShadow: `0 0 10px ${color}20` }}>
        {icon}
      </div>
      <span className="text-gray-300 text-xs text-center leading-tight font-medium">{label}</span>
    </Link>
  );
}

function RoomRow({ room, onJoinLocked }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fakeCount = Math.floor(Math.random() * 40) + 5;
  const isOwned = user && room.ownerId === user.id;

  const handleClick = () => {
    if (room.isLocked) { onJoinLocked(room); return; }
    navigate(`/rooms/${room.id}`);
  };

  return (
    <div onClick={handleClick}
      className="flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all hover:scale-[1.01]"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(212,175,55,0.12)' }}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.2)' }}>
        {room.providerType === 'youtube' ? '▶️' : '🔗'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-white font-bold text-sm truncate">{room.title}</span>
          {room.isLocked && <span className="text-xs">🔒</span>}
          {isOwned && <span className="text-xs px-1.5 py-0.5 rounded font-bold"
            style={{ background: 'rgba(212,175,55,0.2)', color: '#d4af37' }}>Sahibi</span>}
          {room.isTrending && <span className="text-xs px-1.5 py-0.5 rounded font-bold"
            style={{ background: 'rgba(255,100,0,0.2)', color: '#ff6400' }}>🔥 Trend</span>}
        </div>
        {room.movieTitle && <div className="text-gray-500 text-xs truncate">{room.movieTitle}</div>}
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <span className="text-xs text-gray-400">👥 {fakeCount}</span>
        <div className="flex -space-x-1">
          {[...Array(Math.min(3, fakeCount))].map((_, i) => (
            <div key={i} className="w-5 h-5 rounded-full border border-gray-800 flex items-center justify-center text-xs"
              style={{ background: `hsl(${i * 60 + 200}, 50%, 40%)` }}>
              {String.fromCharCode(65 + i)}
            </div>
          ))}
        </div>
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
        {ann.contentTR && <div className="text-gray-400 text-xs mt-0.5 line-clamp-1">{ann.contentTR}</div>}
      </div>
    </div>
  );
}

export default function HomePage() {
  const { user } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [topUsers, setTopUsers] = useState([]);
  const [lockedRoom, setLockedRoom] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [totalMembers, setTotalMembers] = useState(0);
  const [vipCount, setVipCount] = useState(0);

  useEffect(() => {
    axios.get('/api/rooms').then(r => setRooms(r.data.filter(rm => rm.isActive && !rm.deletedAt))).catch(() => {});
    axios.get('/api/announcements').then(r => setAnnouncements(r.data.slice(0, 3))).catch(() => {});
    axios.get('/api/top-users').then(r => {
      setTopUsers(r.data.slice(0, 3));
      setTotalMembers(r.data.length || 0);
      setVipCount(r.data.filter(u => u.vip).length || 0);
    }).catch(() => {});
  }, []);

  const handleJoinLocked = (room) => {
    if (!user) { navigate('/login'); return; }
    setLockedRoom(room);
  };

  const handlePassword = () => {
    if (lockedRoom) navigate(`/rooms/${lockedRoom.id}`);
    setLockedRoom(null);
  };

  const onlineCount = Math.floor(Math.random() * 50) + 60;
  const activeRoomCount = rooms.length;

  if (!user) {
    return <LandingPage settings={settings} rooms={rooms} />;
  }

  return (
    <div className="min-h-screen pb-24" style={{ background: '#0a0a0f' }}>
      <div className="max-w-lg mx-auto px-4 pt-4 space-y-4">

        {/* HERO BANNER */}
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
              <div className="cinzel font-black text-2xl leading-tight mb-0.5"
                style={{ color: '#d4af37', textShadow: '0 0 20px rgba(212,175,55,0.5)' }}>
                {settings?.siteTitle || 'YOKO AJANS'}
              </div>
              <div className="text-sm mb-3">
                <span className="text-gray-300">Sesin Gücü </span>
                <span className="font-black italic" style={{ color: '#c084fc' }}>Bizde!</span>
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2 text-xs text-gray-300">
                  <span className="w-4 h-4 rounded-full flex items-center justify-center text-xs"
                    style={{ background: 'rgba(212,175,55,0.2)' }}>🔒</span>
                  <span><span className="font-bold text-white">145</span> Aktif Yayıncı</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-300">
                  <span className="w-4 h-4 rounded-full flex items-center justify-center text-xs"
                    style={{ background: 'rgba(155,89,182,0.2)' }}>🏆</span>
                  <span><span className="font-bold text-white">98,750 ₺</span> Bu Ayki Kazanç</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-4 h-4 rounded-full flex items-center justify-center text-xs"
                    style={{ background: 'rgba(212,175,55,0.2)' }}>✨</span>
                  <span className="text-gray-300">Şu An</span>
                  <span className="font-black px-2 py-0.5 rounded-lg text-xs"
                    style={{ background: 'rgba(212,175,55,0.2)', color: '#d4af37', border: '1px solid rgba(212,175,55,0.3)' }}>
                    {activeRoomCount}
                  </span>
                  <span className="text-gray-300">Oda Aktif</span>
                </div>
              </div>
            </div>

            <div className="flex-shrink-0 relative">
              {settings?.wolfImageUrl ? (
                <img src={settings.wolfImageUrl} alt="emblem"
                  className="w-24 h-24 rounded-full object-cover"
                  style={{ boxShadow: '0 0 30px rgba(155,89,182,0.6), 0 0 60px rgba(212,175,55,0.3)' }} />
              ) : (
                <div className="w-24 h-24 rounded-full flex items-center justify-center relative"
                  style={{ background: 'radial-gradient(circle, rgba(155,89,182,0.3), rgba(212,175,55,0.1))', boxShadow: '0 0 30px rgba(155,89,182,0.5), 0 0 60px rgba(212,175,55,0.3)' }}>
                  <div className="absolute inset-0 rounded-full"
                    style={{ border: '2px solid rgba(212,175,55,0.4)', boxShadow: 'inset 0 0 20px rgba(155,89,182,0.2)' }} />
                  <span className="text-5xl">🐺</span>
                </div>
              )}
              <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs"
                style={{ background: 'linear-gradient(135deg, #d4af37, #b8962a)', color: '#0f0f14', fontWeight: 900 }}>
                👑
              </div>
            </div>
          </div>
        </div>

        {/* STATS ROW */}
        <div className="flex gap-2">
          <StatCard icon="👥" value={(totalMembers || 3570).toLocaleString()} label="Toplam Üye" />
          <StatCard icon="🟢" value={onlineCount} label="Online" color="#22c55e" />
          <StatCard icon="💎" value={vipCount || 124} label="VIP Üye" color="#c084fc" />
          <StatCard icon="🎬" value={activeRoomCount} label="Aktif Oda" />
        </div>

        {/* FEATURED MEMBERS */}
        {topUsers.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-bold text-white text-sm flex items-center gap-2">
                <span style={{ color: '#d4af37' }}>⚡</span> Ajansta Öne Çıkanlar
              </h2>
              <button className="text-xs px-3 py-1 rounded-full"
                style={{ background: 'rgba(212,175,55,0.1)', color: '#d4af37', border: '1px solid rgba(212,175,55,0.2)' }}>
                Tümü →
              </button>
            </div>
            <div className="flex gap-2">
              {topUsers.map((u, i) => <MemberCard key={u.id} user={u} rank={i + 1} />)}
            </div>
          </div>
        )}

        {/* QUICK ACCESS */}
        <div>
          <h2 className="font-bold text-white text-sm mb-2 flex items-center gap-2">
            <span style={{ color: '#d4af37' }}>⚡</span> Hızlı Erişim
          </h2>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <QuickAccessCard icon="⚔️" label="PK / Etkinlikler" color="#d4af37" />
            <QuickAccessCard icon="💬" label="Sohbet" color="#22c55e" />
            <QuickAccessCard icon="🎬" label="Film & Sinema" to="/#rooms" color="#c084fc" />
            <QuickAccessCard icon="👑" label="VIP" color="#d4af37" />
            <QuickAccessCard icon="📱" label="Uygulamalar" color="#60a5fa" />
          </div>
        </div>

        {/* ACTIVE ROOMS */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold text-white text-sm flex items-center gap-2">
              <span style={{ color: '#d4af37' }}>🎭</span> Aktif Odalar
            </h2>
            <button onClick={() => setShowCreate(true)}
              className="text-xs px-3 py-1.5 rounded-full flex items-center gap-1 font-bold transition-all"
              style={{
                background: 'rgba(155,89,182,0.2)',
                color: '#c084fc',
                border: '1px solid rgba(155,89,182,0.4)',
                boxShadow: '0 0 10px rgba(155,89,182,0.2)',
              }}>
              🎬 Oda Kur ×
            </button>
          </div>
          <div className="space-y-2">
            {rooms.length === 0 ? (
              <div className="text-center py-8 text-gray-600 text-sm">Henüz aktif oda yok</div>
            ) : (
              rooms.map(r => <RoomRow key={r.id} room={r} onJoinLocked={handleJoinLocked} />)
            )}
          </div>
        </div>

        {/* ANNOUNCEMENTS */}
        {announcements.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-bold text-white text-sm flex items-center gap-2">
                <span style={{ color: '#d4af37' }}>🔔</span> Duyurular
              </h2>
              <button className="text-xs px-2 py-0.5 text-gray-400 hover:text-white">Tümünü Gör</button>
            </div>
            <div className="space-y-2">
              {announcements.map(a => <AnnouncementCard key={a.id} ann={a} />)}
            </div>
          </div>
        )}
      </div>

      {showCreate && (
        <CreateRoomModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            axios.get('/api/rooms').then(r => setRooms(r.data.filter(rm => rm.isActive && !rm.deletedAt))).catch(() => {});
          }}
        />
      )}

      {lockedRoom && (
        <PasswordPrompt
          room={lockedRoom}
          onSuccess={handlePassword}
          onCancel={() => setLockedRoom(null)}
        />
      )}
    </div>
  );
}
