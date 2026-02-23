import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';

const icons = {
  home: (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  rooms: (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" /><line x1="7" y1="2" x2="7" y2="22" /><line x1="17" y1="2" x2="17" y2="22" /><line x1="2" y1="12" x2="22" y2="12" /><line x1="2" y1="7" x2="7" y2="7" /><line x1="2" y1="17" x2="7" y2="17" /><line x1="17" y1="17" x2="22" y2="17" /><line x1="17" y1="7" x2="22" y2="7" />
    </svg>
  ),
  events: (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  top: '👑',
  announcements: '📢',
  vip: '💎',
  admin: '⚙️',
  settings: (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
};

export default function Sidebar({ open, onClose }) {
  const { t } = useTranslation();
  const location = useLocation();
  const { user } = useAuth();
  const { settings } = useSettings();

  const siteTitle = settings?.siteTitle || 'YOKO AJANS';

  const navItems = [
    { key: 'home', label: t('nav.home'), href: '/', icon: icons.home },
    { key: 'rooms', label: t('nav.rooms'), href: '/#rooms', icon: icons.rooms },
    { key: 'events', label: t('nav.events'), href: '/#events', icon: icons.events },
    { key: 'top', label: t('nav.top'), href: '/#leaderboard', icon: icons.top },
    { key: 'announcements', label: t('nav.announcements'), href: '/#announcements', icon: icons.announcements },
    { key: 'vip', label: t('nav.vip'), href: '/#vip', icon: icons.vip },
  ];

  if (user?.role === 'admin') {
    navItems.push({ key: 'admin', label: t('nav.admin'), href: '/admin', icon: icons.admin });
  }

  return (
    <aside
      className={`fixed top-0 left-0 h-full z-40 transition-transform duration-300 ${open ? 'translate-x-0' : '-translate-x-full'}`}
      style={{ width: '280px', background: 'rgba(12,12,18,0.98)', backdropFilter: 'blur(20px)', borderRight: '1px solid rgba(212,175,55,0.15)' }}
    >
      <div className="flex items-center justify-between p-5 border-b border-gold-DEFAULT/10">
        <span className="cinzel font-bold text-lg gold-text">{siteTitle}</span>
        <button onClick={onClose} className="text-gray-400 hover:text-gold-DEFAULT transition-colors p-1">
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {user && (
        <div className="p-4 border-b border-gold-DEFAULT/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold-DEFAULT to-gold-dark flex items-center justify-center text-cinema-dark font-bold">
              {user.username[0].toUpperCase()}
            </div>
            <div>
              <div className="font-semibold text-sm text-white">{user.username}</div>
              <div className="text-xs" style={{ color: '#d4af37' }}>
                {user.role === 'admin' ? '⚙️ Admin' : user.vip ? '💎 VIP' : '🎬 Üye'}
              </div>
            </div>
          </div>
        </div>
      )}

      <nav className="p-4 space-y-1">
        {navItems.map((item) => (
          <a
            key={item.key}
            href={item.href}
            onClick={onClose}
            className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group"
            style={{
              color: location.pathname === item.href ? '#d4af37' : '#9ca3af',
              background: location.pathname === item.href ? 'rgba(212,175,55,0.1)' : 'transparent'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.color = '#d4af37';
              e.currentTarget.style.background = 'rgba(212,175,55,0.08)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = location.pathname === item.href ? '#d4af37' : '#9ca3af';
              e.currentTarget.style.background = location.pathname === item.href ? 'rgba(212,175,55,0.1)' : 'transparent';
            }}
          >
            <span className="text-lg">{typeof item.icon === 'string' ? item.icon : item.icon}</span>
            <span className="font-medium text-sm">{item.label}</span>
          </a>
        ))}
      </nav>

      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gold-DEFAULT/10">
        <div className="text-center text-xs text-gray-600">
          YOKO AJANS © 2025<br />
          <span style={{ color: '#d4af37' }}>18+ Platform</span>
        </div>
      </div>
    </aside>
  );
}
