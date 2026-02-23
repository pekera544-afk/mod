import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import i18n from '../i18n';
import CreateRoomModal from '../components/CreateRoomModal';
import PasswordPrompt from '../components/PasswordPrompt';

function HeroSection({ rooms }) {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const lang = i18n.language;
  const [showCreate, setShowCreate] = useState(false);
  const { user } = useAuth();

  const siteTitle = settings ? (lang === 'tr' ? settings.heroTitleTR : settings.heroTitleEN) : 'YOKO AJANS';
  const tagline = settings ? (lang === 'tr' ? settings.taglineTR : settings.taglineEN) : t('hero.tagline');
  const onlineCount = Math.floor(Math.random() * 50) + 60;

  return (
    <section className="relative flex flex-col justify-end overflow-hidden"
      style={{ minHeight: '52vw', maxHeight: '380px' }}>
      <div className="absolute inset-0"
        style={{ background: 'linear-gradient(135deg, #0f0f14 0%, #1a0a2e 40%, #2a0a0a 70%, #0f0f14 100%)' }}>
        <div className="absolute inset-0 flex items-center justify-center opacity-8">
          <div className="text-[120px] select-none">🎬</div>
        </div>
        <div className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse at 50% 30%, rgba(212,175,55,0.08) 0%, transparent 70%)' }} />
        <div className="absolute bottom-0 left-0 right-0 h-32"
          style={{ background: 'linear-gradient(to top, #0f0f14, transparent)' }} />
      </div>

      <div className="relative z-10 px-4 pb-6 pt-10 text-center">
        <h1 className="cinzel font-black text-4xl sm:text-5xl mb-2 tracking-widest"
          style={{ color: '#d4af37', textShadow: '0 0 30px rgba(212,175,55,0.6), 0 0 60px rgba(212,175,55,0.3)' }}>
          {siteTitle}
        </h1>
        <p className="text-gray-300 text-sm sm:text-base mb-5 font-light tracking-wide">{tagline}</p>

        <div className="flex justify-center gap-3 flex-wrap mb-4">
          <div className="glass-card px-3 py-1.5 flex items-center gap-2">
            <span>🎬</span>
            <span className="text-xs"><span className="font-bold text-gold-DEFAULT">{rooms.length}</span> <span className="text-gray-400">Oda</span></span>
          </div>
          <div className="glass-card px-3 py-1.5 flex items-center gap-2">
            <span>👑</span>
            <span className="text-xs"><span className="font-bold text-gold-DEFAULT">145</span> <span className="text-gray-400">Yayıncı</span></span>
          </div>
          <div className="glass-card px-3 py-1.5 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
            <span className="text-xs"><span className="font-bold text-green-400">{onlineCount}</span> <span className="text-gray-400">Online</span></span>
          </div>
        </div>

        {user && (
          <button
            onClick={() => setShowCreate(true)}
            className="btn-gold px-6 py-2.5 text-sm font-bold inline-flex items-center gap-2"
          >
            🎬 Oda Oluştur
          </button>
        )}
      </div>

      {showCreate && <CreateRoomModal onClose={() => setShowCreate(false)} />}
    </section>
  );
}

function RoomCard({ room, onJoinLocked }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const fakeCount = Math.floor(Math.random() * 40) + 5;
  const isOwned = user && room.ownerId === user.id;

  const handleJoin = (e) => {
    e.preventDefault();
    if (room.isLocked) {
      onJoinLocked(room);
    } else {
      navigate(`/rooms/${room.id}`);
    }
  };

  return (
    <div className="glass-card overflow-hidden transition-all duration-300 hover:scale-[1.02]"
      style={{ boxShadow: room.isTrending ? '0 0 20px rgba(212,175,55,0.2)' : '0 4px 20px rgba(0,0,0,0.4)' }}>
      {room.posterUrl && (
        <div className="h-28 overflow-hidden relative">
          <img src={room.posterUrl} alt={room.title} className="w-full h-full object-cover opacity-60" />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent, rgba(15,15,20,0.85))' }} />
          <div className="absolute top-2 left-2 flex gap-1.5 flex-wrap">
            {room.isTrending && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(212,175,55,0.85)', color: '#0f0f14' }}>
                🔥 Trend
              </span>
            )}
            {room.isLocked && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(0,0,0,0.7)', color: '#e8e8f0', border: '1px solid rgba(255,255,255,0.2)' }}>
                🔒
              </span>
            )}
            {isOwned && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full cinzel"
                style={{ background: 'rgba(212,175,55,0.9)', color: '#0f0f14' }}>
                HOST
              </span>
            )}
          </div>
        </div>
      )}
      <div className="p-3">
        <div className="flex items-start justify-between mb-1.5">
          <h3 className="font-bold text-white text-sm leading-tight">🎥 {room.title}</h3>
          {!room.posterUrl && room.isTrending && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0"
              style={{ background: 'rgba(212,175,55,0.2)', color: '#d4af37', border: '1px solid rgba(212,175,55,0.3)' }}>
              🔥 Trend
            </span>
          )}
        </div>
        {room.movieTitle && (
          <p className="text-xs text-gray-400 mb-1">📽 <span className="text-gray-200">{room.movieTitle}</span></p>
        )}
        <div className="flex items-center gap-3 mb-2.5">
          <p className="text-xs text-gray-400">
            👥 <span className="text-white font-medium">{fakeCount}</span> kişi
          </p>
          {room.chatEnabled !== false && (
            <p className="text-xs text-green-400">💬 Chat aktif</p>
          )}
          {room.providerType === 'external' && (
            <p className="text-xs text-blue-400">🔗 Harici</p>
          )}
        </div>
        {room.owner && !isOwned && (
          <p className="text-xs text-gray-500 mb-2">
            👤 {room.owner.username}
            {room.owner.vip && <span className="text-purple-400 ml-1">💎</span>}
          </p>
        )}
        <button onClick={handleJoin} className="btn-gold w-full text-center text-xs py-2.5">
          {room.isLocked ? '🔒 Şifreyle Gir' : t('rooms.join')}
        </button>
      </div>
    </div>
  );
}

function MyRoomCard({ room }) {
  const navigate = useNavigate();
  return (
    <div className="relative overflow-hidden rounded-2xl mb-6"
      style={{
        background: 'linear-gradient(135deg, rgba(22,22,30,0.98), rgba(30,20,10,0.98))',
        border: '1px solid rgba(212,175,55,0.4)',
        boxShadow: '0 0 30px rgba(212,175,55,0.15)'
      }}>
      <div className="absolute top-0 left-0 right-0 h-0.5"
        style={{ background: 'linear-gradient(90deg, transparent, #d4af37, transparent)' }} />
      <div className="p-4 flex items-center gap-4">
        {room.posterUrl && (
          <img src={room.posterUrl} alt={room.title} className="w-16 h-20 object-cover rounded-lg opacity-80 flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold px-2 py-0.5 rounded cinzel"
              style={{ background: 'rgba(212,175,55,0.2)', color: '#d4af37', border: '1px solid rgba(212,175,55,0.4)', fontSize: '10px' }}>
              SENİN ODAYIN
            </span>
            {room.isLocked && <span className="text-xs text-gray-400">🔒</span>}
          </div>
          <h3 className="font-bold text-white text-sm mb-0.5">{room.title}</h3>
          <p className="text-xs text-gray-400">{room.movieTitle}</p>
        </div>
        <button
          onClick={() => navigate(`/rooms/${room.id}`)}
          className="btn-gold px-4 py-2 text-sm flex-shrink-0"
        >
          Odana Gir
        </button>
      </div>
    </div>
  );
}

function FeaturedEvent({ event }) {
  const lang = i18n.language;
  if (!event) return null;
  const title = lang === 'tr' ? event.titleTR : event.titleEN;
  const description = lang === 'tr' ? event.descriptionTR : event.descriptionEN;
  const startTime = new Date(event.startTime).toLocaleTimeString(lang === 'tr' ? 'tr-TR' : 'en-US', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="relative overflow-hidden rounded-2xl"
      style={{
        background: 'linear-gradient(135deg, rgba(22,22,30,0.95) 0%, rgba(30,10,50,0.95) 100%)',
        border: '1px solid rgba(212,175,55,0.3)',
        boxShadow: '0 0 40px rgba(212,175,55,0.15)'
      }}>
      <div className="absolute top-0 left-0 right-0 h-0.5"
        style={{ background: 'linear-gradient(90deg, transparent, #d4af37, transparent)' }} />
      <div className="p-5">
        <div className="text-xs font-bold mb-1 gold-text">🎬 Bu Gece Özel Gösterim</div>
        <h3 className="cinzel font-black text-2xl text-white mb-2">🎥 {title}</h3>
        <p className="text-sm text-gray-300 mb-3">⏰ Başlıyor: <span className="font-bold text-gold-DEFAULT">{startTime}</span></p>
        {description && <p className="text-sm text-gray-300 mb-4">🎁 {description}</p>}
        <button className="btn-gold w-full">Gösterime Katıl</button>
      </div>
    </div>
  );
}

function LeaderboardCard({ user: u, rank }) {
  const { t } = useTranslation();
  const colors = {
    1: { glow: 'rgba(212,175,55,0.4)', border: '#d4af37', icon: '🥇' },
    2: { glow: 'rgba(192,192,192,0.4)', border: '#c0c0c0', icon: '🥈' },
    3: { glow: 'rgba(205,127,50,0.4)', border: '#cd7f32', icon: '🥉' }
  };
  const s = colors[rank] || colors[3];
  return (
    <div className="glass-card p-4 text-center transition-all duration-300 hover:scale-[1.02]"
      style={{ border: `1px solid ${s.border}40`, boxShadow: `0 0 20px ${s.glow}` }}>
      <div className="text-2xl mb-2">{s.icon}</div>
      <div className="w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center font-bold text-lg text-cinema-dark"
        style={{ background: `linear-gradient(135deg, ${s.border}, ${s.border}99)` }}>
        {u.username[0].toUpperCase()}
      </div>
      <div className="font-bold text-sm text-white truncate">{u.username}</div>
      <div className="text-xs mt-0.5" style={{ color: s.border }}>
        {u.role === 'admin' ? t('leaderboard.admin') : u.vip ? t('leaderboard.vip') : t('leaderboard.user')}
      </div>
    </div>
  );
}

function AnnouncementCard({ item }) {
  const lang = i18n.language;
  const title = lang === 'tr' ? item.titleTR : item.titleEN;
  const content = lang === 'tr' ? item.contentTR : item.contentEN;
  return (
    <div className="glass-card p-4 border-l-2 border-gold-DEFAULT/50">
      <div className="flex items-center gap-2 mb-1">
        {item.pinned && <span className="text-xs text-gold-DEFAULT">📌</span>}
        <h4 className="font-semibold text-white text-sm">{title}</h4>
      </div>
      <p className="text-xs text-gray-400 leading-relaxed">{content}</p>
      <p className="text-xs text-gray-600 mt-2">{new Date(item.createdAt).toLocaleDateString()}</p>
    </div>
  );
}

export default function HomePage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [events, setEvents] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [myRoom, setMyRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lockedRoom, setLockedRoom] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const navigate = useNavigate();

  const loadData = () => {
    const fetches = [
      axios.get('/api/rooms').then(r => setRooms(r.data)),
      axios.get('/api/events').then(r => setEvents(r.data)),
      axios.get('/api/announcements').then(r => setAnnouncements(r.data)),
      axios.get('/api/leaderboard').then(r => setLeaderboard(r.data))
    ];
    if (user) {
      fetches.push(axios.get('/api/rooms/my').then(r => setMyRoom(r.data)).catch(() => {}));
    }
    Promise.all(fetches).finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, [user]);

  const handleJoinLocked = (room) => setLockedRoom(room);

  const featuredEvent = events[0] || null;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">🎬</div>
          <div className="gold-text font-bold cinzel text-sm">Yükleniyor...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-screen-xl mx-auto pb-20">
      <HeroSection rooms={rooms} />

      <div className="px-4 mt-5 space-y-8">
        {myRoom && <MyRoomCard room={myRoom} />}

        {featuredEvent && <FeaturedEvent event={featuredEvent} />}

        <section id="rooms">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title">🎬 {t('rooms.title')}</h2>
            {user && (
              <button
                onClick={() => setShowCreate(true)}
                className="btn-gold text-xs px-4 py-2 flex items-center gap-1.5"
              >
                + Oda Oluştur
              </button>
            )}
          </div>
          {rooms.length === 0 ? (
            <div className="glass-card p-8 text-center text-gray-500">{t('common.noData')}</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {rooms.map(room => (
                <RoomCard key={room.id} room={room} onJoinLocked={handleJoinLocked} />
              ))}
            </div>
          )}
        </section>

        {announcements.length > 0 && (
          <section id="announcements">
            <h2 className="section-title mb-4">📢 {t('announcements.title')}</h2>
            <div className="space-y-3">
              {announcements.map(ann => <AnnouncementCard key={ann.id} item={ann} />)}
            </div>
          </section>
        )}

        {leaderboard.length > 0 && (
          <section id="leaderboard">
            <h2 className="section-title mb-4">👑 {t('leaderboard.title')}</h2>
            <div className="grid grid-cols-3 gap-3">
              {leaderboard.map((u, i) => <LeaderboardCard key={u.id} user={u} rank={i + 1} />)}
            </div>
          </section>
        )}
      </div>

      {showCreate && <CreateRoomModal onClose={() => setShowCreate(false)} onCreated={() => loadData()} />}

      {lockedRoom && (
        <PasswordPrompt
          roomId={lockedRoom.id}
          roomTitle={lockedRoom.title}
          onSuccess={() => navigate(`/rooms/${lockedRoom.id}`)}
          onClose={() => setLockedRoom(null)}
        />
      )}
    </div>
  );
}
