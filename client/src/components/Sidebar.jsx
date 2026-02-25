import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import UserAvatar from './UserAvatar';
import XpBar from './XpBar';
import BadgeList, { getRoleLabel } from './RoleBadge';
import { brand } from '../config/brand';

export default function Sidebar({ open, onClose }) {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { settings } = useSettings();
  const siteTitle = settings?.siteTitle || brand.name;

  if (!user) {
    return (
      <aside
        className={`fixed top-0 left-0 h-full z-40 transition-transform duration-300 ${open ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ width: '280px', background: 'rgba(12,12,18,0.99)', backdropFilter: 'blur(20px)', borderRight: '1px solid rgba(212,175,55,0.15)' }}
      >
        <div className="flex items-center justify-between p-5 border-b border-gold-DEFAULT/10">
          <span className="cinzel font-bold text-lg gold-text">{siteTitle}</span>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors p-1">
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="p-8 text-center">
          <div className="text-4xl mb-4">🎬</div>
          <p className="text-gray-400 text-sm mb-6">Menüyü görmek için giriş yapın</p>
          <Link to="/login" onClick={onClose} className="btn-gold block text-center py-2 rounded-xl mb-3 text-sm">Giriş Yap</Link>
          <Link to="/register" onClick={onClose} className="btn-outline-gold block text-center py-2 rounded-xl text-sm">Kayıt Ol</Link>
        </div>
      </aside>
    );
  }

  const roleInfo = getRoleLabel(user);

  const navItems = [
    { label: '🏠 Ana Sayfa', href: '/' },
    { label: '🎬 Sinema Odaları', href: '/rooms' },
    { label: '📰 Haberler', href: '/news' },
    { label: '📢 Duyurular', href: '/announcements' },
    { label: '👑 Sıralamalar', href: '/leaderboard' },
    { label: '💎 VIP', href: '/vip' },
    { label: '🎯 Etkinlikler', href: '/events' },
    { label: '⚔️ VS PK', href: '/pk' },
  ];

  if (user.role === 'admin') {
    navItems.push({ label: '⚙️ Yönetim Paneli', href: '/admin' });
  }

  function handleLogout() {
    logout();
    onClose();
    navigate('/');
  }

  return (
    <aside
      className={`fixed top-0 left-0 h-full z-40 transition-transform duration-300 ${open ? 'translate-x-0' : '-translate-x-full'}`}
      style={{ width: '280px', background: 'rgba(12,12,18,0.99)', backdropFilter: 'blur(20px)', borderRight: '1px solid rgba(212,175,55,0.15)', display: 'flex', flexDirection: 'column' }}
    >
      <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'rgba(212,175,55,0.1)' }}>
        <span className="cinzel font-bold text-lg gold-text">{siteTitle}</span>
        <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors p-1">
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div className="p-4 border-b" style={{ borderColor: 'rgba(212,175,55,0.08)' }}>
        <div className="flex items-center gap-3 mb-3">
          <UserAvatar user={user} size={44} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`text-sm font-bold ${
                user.role === 'admin' ? 'username-admin' :
                user.vip ? 'username-vip' :
                user.role === 'moderator' ? 'username-moderator' : 'text-white'
              }`}>{user.username}</span>
              {roleInfo && (
                <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold" style={{ background: `${roleInfo.color}22`, color: roleInfo.color, fontSize: 10 }}>
                  {roleInfo.icon} {roleInfo.label}
                </span>
              )}
            </div>
            <BadgeList badges={user.badges} size={12} />
          </div>
        </div>
        <XpBar xp={user.xp || 0} level={user.level || 1} showLabel={true} />
      </div>

      <nav className="p-4 space-y-1 flex-1 overflow-y-auto">
        {navItems.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            onClick={onClose}
            className="flex items-center px-4 py-3 rounded-xl transition-all duration-200 text-sm font-medium"
            style={{
              color: location.pathname === item.href ? '#d4af37' : '#9ca3af',
              background: location.pathname === item.href ? 'rgba(212,175,55,0.1)' : 'transparent'
            }}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t" style={{ borderColor: 'rgba(212,175,55,0.08)' }}>
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl transition-all text-sm font-medium"
          style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Çıkış Yap
        </button>
        <div className="text-center text-xs text-gray-700 mt-3">{brand.footerText}</div>
      </div>
    </aside>
  );
}
