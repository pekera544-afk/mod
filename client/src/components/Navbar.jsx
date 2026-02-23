import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import i18n from '../i18n';

export default function Navbar({ onMenuClick }) {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const [notifOpen, setNotifOpen] = useState(false);

  const lang = i18n.language;
  const siteTitle = settings ? settings.siteTitle : 'YOKO AJANS';

  const toggleLang = () => {
    const newLang = lang === 'tr' ? 'en' : 'tr';
    i18n.changeLanguage(newLang);
    localStorage.setItem('yoko_lang', newLang);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-40 h-16"
      style={{ background: 'rgba(15,15,20,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(212,175,55,0.15)' }}>
      <div className="flex items-center justify-between h-full px-4 max-w-screen-xl mx-auto">
        <button
          onClick={onMenuClick}
          className="p-2 rounded-lg text-gold-DEFAULT hover:bg-gold-DEFAULT/10 transition-colors"
          aria-label="Menu"
        >
          <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
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

          <div className="relative">
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className="p-2 rounded-lg text-gray-400 hover:text-gold-DEFAULT transition-colors relative"
            >
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              <span className="absolute top-1 right-1 w-2 h-2 bg-gold-DEFAULT rounded-full"></span>
            </button>
          </div>

          {user ? (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gold-DEFAULT to-gold-dark flex items-center justify-center text-cinema-dark font-bold text-sm">
                {user.username[0].toUpperCase()}
              </div>
              {user.role === 'admin' && (
                <span className="hidden sm:block text-xs font-bold px-2 py-0.5 rounded"
                  style={{ background: 'rgba(212,175,55,0.2)', color: '#d4af37', border: '1px solid rgba(212,175,55,0.4)' }}>
                  ADMIN
                </span>
              )}
              <button onClick={logout} className="text-xs text-gray-400 hover:text-red-400 transition-colors">
                {t('auth.logout')}
              </button>
            </div>
          ) : (
            <Link to="/login" className="btn-gold text-sm px-3 py-1.5">
              {t('auth.login')}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
