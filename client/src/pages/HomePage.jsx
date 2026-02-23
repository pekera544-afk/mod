import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useSettings } from '../context/SettingsContext';
import i18n from '../i18n';

function HeroSection({ rooms, events }) {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const lang = i18n.language;

  const siteTitle = settings ? (lang === 'tr' ? settings.heroTitleTR : settings.heroTitleEN) : 'YOKO AJANS';
  const tagline = settings ? (lang === 'tr' ? settings.taglineTR : settings.taglineEN) : t('hero.tagline');
  const onlineCount = Math.floor(Math.random() * 50) + 60;

  return (
    <section className="relative min-h-[60vw] max-h-96 flex flex-col justify-end overflow-hidden">
      <div className="absolute inset-0"
        style={{
          background: 'linear-gradient(135deg, #0f0f14 0%, #1a0a2e 40%, #2a0a0a 70%, #0f0f14 100%)'
        }}>
        <div className="absolute inset-0 flex items-center justify-center opacity-10">
          <div className="text-9xl">🎬</div>
        </div>
        <div className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse at 50% 30%, rgba(212,175,55,0.08) 0%, transparent 70%)'
          }} />
        <div className="absolute bottom-0 left-0 right-0 h-32"
          style={{ background: 'linear-gradient(to top, #0f0f14, transparent)' }} />
      </div>

      <div className="relative z-10 px-4 pb-6 pt-10 text-center">
        <h1 className="cinzel font-black text-4xl sm:text-5xl mb-2 tracking-widest"
          style={{ color: '#d4af37', textShadow: '0 0 30px rgba(212,175,55,0.6), 0 0 60px rgba(212,175,55,0.3)' }}>
          {siteTitle}
        </h1>
        <p className="text-gray-300 text-sm sm:text-base mb-6 font-light tracking-wide">
          {tagline}
        </p>

        <div className="flex justify-center gap-4 flex-wrap">
          <div className="glass-card px-4 py-2 flex items-center gap-2">
            <span>🎬</span>
            <span className="text-sm"><span className="font-bold text-gold-DEFAULT">{rooms.length}</span> <span className="text-gray-400">{t('hero.stats.rooms')}</span></span>
          </div>
          <div className="glass-card px-4 py-2 flex items-center gap-2">
            <span>👑</span>
            <span className="text-sm"><span className="font-bold text-gold-DEFAULT">145</span> <span className="text-gray-400">{t('hero.stats.streamers')}</span></span>
          </div>
          <div className="glass-card px-4 py-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
            <span className="text-sm"><span className="font-bold text-green-400">{onlineCount}</span> <span className="text-gray-400">{t('hero.stats.online')}</span></span>
          </div>
        </div>
      </div>
    </section>
  );
}

function RoomCard({ room }) {
  const { t } = useTranslation();
  const fakeCount = Math.floor(Math.random() * 40) + 5;

  return (
    <div className="glass-card overflow-hidden transition-all duration-300 hover:scale-[1.02]"
      style={{ boxShadow: room.isTrending ? '0 0 20px rgba(212,175,55,0.2)' : '0 4px 20px rgba(0,0,0,0.4)' }}>
      {room.posterUrl && (
        <div className="h-32 overflow-hidden relative">
          <img src={room.posterUrl} alt={room.title} className="w-full h-full object-cover opacity-60" />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent, rgba(15,15,20,0.8))' }} />
        </div>
      )}
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-bold text-white text-sm">🎥 {room.title}</h3>
          {room.isTrending && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(212,175,55,0.2)', color: '#d4af37', border: '1px solid rgba(212,175,55,0.3)' }}>
              🔥 {t('rooms.trending')}
            </span>
          )}
        </div>
        {room.movieTitle && (
          <p className="text-xs text-gray-400 mb-1">📽 {t('rooms.watching')}: <span className="text-gray-200">{room.movieTitle}</span></p>
        )}
        <p className="text-xs text-gray-400 mb-1">👥 <span className="text-white font-medium">{fakeCount}</span> {t('rooms.participants')}</p>
        <p className="text-xs mb-3" style={{ color: '#22c55e' }}>💬 {t('rooms.chat')}</p>
        <Link to={`/rooms/${room.id}`} className="btn-gold w-full text-center text-sm block">
          {t('rooms.join')}
        </Link>
      </div>
    </div>
  );
}

function FeaturedEvent({ event }) {
  const { t } = useTranslation();
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
        boxShadow: '0 0 40px rgba(212,175,55,0.15), inset 0 0 40px rgba(212,175,55,0.05)'
      }}>
      <div className="absolute top-0 left-0 right-0 h-1"
        style={{ background: 'linear-gradient(90deg, transparent, #d4af37, transparent)' }} />
      <div className="p-5">
        <div className="text-xs font-bold mb-1" style={{ color: '#d4af37' }}>🎬 {t('featured.title')}</div>
        <h3 className="cinzel font-black text-2xl text-white mb-2">🎥 {title}</h3>
        <p className="text-sm text-gray-300 mb-3">⏰ {t('featured.starting')} <span className="font-bold text-gold-DEFAULT">{startTime}</span></p>
        {event.badge && <p className="text-sm text-gray-300 mb-4">🎁 {description || t('featured.badge')}</p>}
        <button className="btn-gold w-full">{t('featured.join')}</button>
      </div>
    </div>
  );
}

function LeaderboardCard({ user, rank }) {
  const { t } = useTranslation();
  const colors = {
    1: { glow: 'rgba(212,175,55,0.4)', border: '#d4af37', icon: '🥇' },
    2: { glow: 'rgba(192,192,192,0.4)', border: '#c0c0c0', icon: '🥈' },
    3: { glow: 'rgba(205,127,50,0.4)', border: '#cd7f32', icon: '🥉' }
  };
  const style = colors[rank] || colors[3];

  return (
    <div className="glass-card p-4 text-center transition-all duration-300 hover:scale-[1.02]"
      style={{ border: `1px solid ${style.border}40`, boxShadow: `0 0 20px ${style.glow}` }}>
      <div className="text-2xl mb-2">{style.icon}</div>
      <div className="w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center font-bold text-lg text-cinema-dark"
        style={{ background: `linear-gradient(135deg, ${style.border}, ${style.border}99)` }}>
        {user.username[0].toUpperCase()}
      </div>
      <div className="font-bold text-sm text-white truncate">{user.username}</div>
      <div className="text-xs mt-1" style={{ color: style.border }}>
        {user.role === 'admin' ? t('leaderboard.admin') : user.vip ? t('leaderboard.vip') : t('leaderboard.user')}
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
        {item.pinned && <span className="text-xs" style={{ color: '#d4af37' }}>📌</span>}
        <h4 className="font-semibold text-white text-sm">{title}</h4>
      </div>
      <p className="text-xs text-gray-400 leading-relaxed">{content}</p>
      <p className="text-xs text-gray-600 mt-2">{new Date(item.createdAt).toLocaleDateString()}</p>
    </div>
  );
}

export default function HomePage() {
  const { t } = useTranslation();
  const [rooms, setRooms] = useState([]);
  const [events, setEvents] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      axios.get('/api/rooms').then(r => setRooms(r.data)),
      axios.get('/api/events').then(r => setEvents(r.data)),
      axios.get('/api/announcements').then(r => setAnnouncements(r.data)),
      axios.get('/api/leaderboard').then(r => setLeaderboard(r.data))
    ]).finally(() => setLoading(false));
  }, []);

  const featuredEvent = events[0] || null;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">🎬</div>
          <div className="gold-text font-bold cinzel">{t('common.loading')}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-screen-xl mx-auto pb-20">
      <HeroSection rooms={rooms} events={events} />

      <div className="px-4 mt-6 space-y-8">
        {featuredEvent && (
          <section>
            <FeaturedEvent event={featuredEvent} />
          </section>
        )}

        <section id="rooms">
          <h2 className="section-title mb-4">🎬 {t('rooms.title')}</h2>
          {rooms.length === 0 ? (
            <div className="glass-card p-8 text-center text-gray-500">{t('common.noData')}</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {rooms.map(room => <RoomCard key={room.id} room={room} />)}
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
              {leaderboard.map((user, i) => <LeaderboardCard key={user.id} user={user} rank={i + 1} />)}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
