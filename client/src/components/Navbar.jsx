import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import i18n from '../i18n';
import CreateRoomModal from './CreateRoomModal';
import UserAvatar from './UserAvatar';
import NotificationsPanel from './NotificationsPanel';

export default function Navbar({ onMenuClick, socket, notifCounts, setNotifCounts, xpInfo }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);
  const [showNotif, setShowNotif] = useState(false);

  const lang = i18n.language;
  const siteTitle = settings ? settings.siteTitle : 'YOKO AJANS';
  const totalNotifs = (notifCounts?.friendRequests || 0) + (notifCounts?.unreadDMs || 0);

  const toggleLang = () => {
    const newLang = lang === 'tr' ? 'en' : 'tr';
    i18n.changeLanguage(newLang);
    localStorage.setItem('yoko_lang', newLang);
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 h-16"
        style={{ background: 'rgba(15,15,20,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(212,175,55,0.15)' }}>
        <div className="flex items-center justify-between h-full px-4 max-w-screen-xl mx-auto">
          <button
            onClick={onMenuClick}
            className="p-2 rounded-lg text-gold-DEFAULT hover:bg-gold-DEFAULT/10 transition-colors"
            aria-label="Menu"
          >
            <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          <Link to="/" className="cinzel font-bold text-lg tracking-widest"
            style={{ color: '#d4af37', textShadow: '0 0 12px rgba(212,175,55,0.5)' }}>
            {siteTitle}
          </Link>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleLang}
              className="text-xs font-bold px-2 py-1 rounded border border-gold-DEFAULT/30 text-gold-DEFAULT hover:bg-gold-DEFAULT/10 transition-colors"
            >
              {lang === 'tr' ? 'EN' : 'TR'}
            </button>

            {user ? (
              <>
                {xpInfo && (
                  <div className="hidden sm:flex flex-col items-end" style={{ minWidth: 70 }}>
                    <span className="text-xs font-bold" style={{ color: '#d4af37' }}>Lv.{xpInfo.level}</span>
                    <div style={{ width: 60, height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: 'linear-gradient(90deg,#d4af37,#a855f7)', width: `${xpInfo.progress}%`, borderRadius: 2, transition: 'width 0.5s ease' }} />
                    </div>
                  </div>
                )}

                <button
                  onClick={() => setShowCreate(true)}
                  className="btn-gold text-xs px-3 py-1.5 flex items-center gap-1 font-bold"
                  title="Oda Oluştur"
                >
                  🎬 <span className="hidden sm:inline">Oda Oluştur</span>
                </button>

                <div className="relative">
                  <button
                    onClick={() => setShowNotif(s => !s)}
                    className="relative p-2 rounded-lg hover:bg-white/5 transition-colors"
                    aria-label="Bildirimler"
                  >
                    <svg width="20" height="20" fill="none" stroke="#9ca3af" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>
                    {totalNotifs > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-white flex items-center justify-center font-bold" style={{ background: '#ef4444', fontSize: 9 }}>
                        {totalNotifs > 9 ? '9+' : totalNotifs}
                      </span>
                    )}
                  </button>
                  {showNotif && (
                    <NotificationsPanel socket={socket} counts={notifCounts} setNotifCounts={setNotifCounts} onClose={() => setShowNotif(false)} />
                  )}
                </div>

                <div
                  onClick={() => navigate('/profile')}
                  className="cursor-pointer rounded-full transition-all hover:ring-2"
                  style={{ '--tw-ring-color': 'rgba(212,175,55,0.5)' }}
                  title="Profil Ayarları"
                >
                  <UserAvatar user={user} size={34} />
                </div>

                {user.role === 'admin' && (
                  <Link to="/admin" className="hidden sm:block text-xs font-bold px-2 py-0.5 rounded"
                    style={{ background: 'rgba(212,175,55,0.2)', color: '#d4af37', border: '1px solid rgba(212,175,55,0.4)' }}>
                    ADMIN
                  </Link>
                )}
              </>
            ) : (
              <Link to="/login" className="btn-gold text-sm px-3 py-1.5">
                {t('auth.login')}
              </Link>
            )}
          </div>
        </div>
      </header>

      {showCreate && (
        <CreateRoomModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            window.location.reload();
          }}
        />
      )}
    </>
  );
}
