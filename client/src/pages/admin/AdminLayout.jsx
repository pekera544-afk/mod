import { Outlet, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';

const adminNav = [
  { href: '/admin', label: 'Dashboard', icon: '📊', exact: true },
  { href: '/admin/settings', label: 'Site Ayarları', icon: '🎨' },
  { href: '/admin/pwa', label: 'PWA Ayarları', icon: '📱' },
  { href: '/admin/users', label: 'Kullanıcılar', icon: '👥' },
  { href: '/admin/rooms', label: 'Sinema Odaları', icon: '🎬' },
  { href: '/admin/announcements', label: 'Duyurular', icon: '📢' },
  { href: '/admin/events', label: 'Etkinlikler', icon: '🗓️' },
  { href: '/admin/audit-log', label: 'İşlem Geçmişi', icon: '📋' }
];

export default function AdminLayout() {
  const location = useLocation();
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 flex-shrink-0 hidden md:flex flex-col"
        style={{ background: 'rgba(10,10,16,0.98)', borderRight: '1px solid rgba(212,175,55,0.15)' }}>
        <div className="p-4 border-b border-gold-DEFAULT/10">
          <div className="cinzel font-bold text-sm gold-text">YOKO AJANS</div>
          <div className="text-xs text-gray-500 mt-0.5">Admin Panel</div>
        </div>
        <nav className="flex-1 p-3 space-y-0.5">
          {adminNav.map(item => {
            const active = item.exact ? location.pathname === item.href : location.pathname.startsWith(item.href) && item.href !== '/admin';
            const exactActive = item.exact && location.pathname === '/admin';
            const isActive = active || exactActive;
            return (
              <Link
                key={item.href}
                to={item.href}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all duration-200"
                style={{
                  color: isActive ? '#d4af37' : '#6b7280',
                  background: isActive ? 'rgba(212,175,55,0.1)' : 'transparent',
                  fontWeight: isActive ? '600' : '400'
                }}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-gold-DEFAULT/10">
          <Link to="/" className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-300 mb-2">
            ← Siteye Dön
          </Link>
          <button onClick={logout} className="text-xs text-red-400 hover:text-red-300">
            Çıkış Yap
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-h-screen">
        <header className="px-6 py-4 border-b border-gold-DEFAULT/10 flex items-center justify-between"
          style={{ background: 'rgba(15,15,20,0.95)' }}>
          <h1 className="cinzel font-bold gold-text text-lg">Admin Panel</h1>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400">{user?.username}</span>
            <span className="text-xs px-2 py-0.5 rounded font-bold"
              style={{ background: 'rgba(212,175,55,0.2)', color: '#d4af37', border: '1px solid rgba(212,175,55,0.3)' }}>
              ADMIN
            </span>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
