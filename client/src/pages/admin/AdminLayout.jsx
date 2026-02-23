import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';

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

function getCurrentPageLabel(pathname) {
  if (pathname === '/admin') return 'Dashboard';
  const match = adminNav.find(n => !n.exact && pathname.startsWith(n.href));
  return match ? match.label : 'Admin Panel';
}

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { settings } = useSettings();
  const isRoot = location.pathname === '/admin';
  const currentLabel = getCurrentPageLabel(location.pathname);
  const siteTitle = settings?.siteTitle || 'YOKO AJANS';

  return (
    <div className="flex min-h-screen" style={{ maxWidth: '100vw', overflowX: 'hidden' }}>
      <aside className="w-56 flex-shrink-0 hidden md:flex flex-col"
        style={{ background: 'rgba(10,10,16,0.98)', borderRight: '1px solid rgba(212,175,55,0.15)' }}>
        <div className="p-4 border-b border-gold-DEFAULT/10">
          <div className="cinzel font-bold text-sm gold-text">{siteTitle}</div>
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
          <Link to="/" className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-300 mb-2 transition-colors">
            ← Siteye Dön
          </Link>
          <button onClick={logout} className="text-xs text-red-400 hover:text-red-300 transition-colors">
            Çıkış Yap
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-h-screen min-w-0 overflow-x-hidden">
        <header className="px-4 py-3 border-b border-gold-DEFAULT/10 flex items-center gap-3"
          style={{ background: 'rgba(15,15,20,0.95)' }}>
          {!isRoot ? (
            <button
              onClick={() => navigate(-1)}
              className="flex items-center justify-center flex-shrink-0 transition-colors"
              style={{
                width: 36, height: 36,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 10,
                color: '#9ca3af'
              }}
              title="Geri"
            >
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          ) : (
            <Link to="/"
              className="flex items-center justify-center flex-shrink-0 transition-colors"
              style={{
                width: 36, height: 36,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 10,
                color: '#9ca3af'
              }}
              title="Siteye Dön"
            >
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </Link>
          )}

          <div className="flex-1 flex items-center justify-between">
            <h1 className="cinzel font-bold text-sm md:text-base"
              style={{ color: '#d4af37' }}>
              {isRoot ? 'Admin Panel' : currentLabel}
            </h1>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 hidden sm:block">{user?.username}</span>
              <span className="text-xs px-2 py-0.5 rounded font-bold"
                style={{ background: 'rgba(212,175,55,0.2)', color: '#d4af37', border: '1px solid rgba(212,175,55,0.3)' }}>
                ADMIN
              </span>
              <button onClick={logout}
                className="md:hidden text-xs text-red-400 px-2 py-1 rounded-lg"
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                Çıkış
              </button>
            </div>
          </div>
        </header>

        <div className="md:hidden px-2 py-2 overflow-x-auto scrollbar-hide"
          style={{ background: 'rgba(10,10,16,0.95)', borderBottom: '1px solid rgba(212,175,55,0.1)' }}>
          <div className="flex gap-1" style={{ minWidth: 'max-content' }}>
            <Link
              to="/"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-all"
              style={{ color: '#9ca3af', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              🏠 Site
            </Link>
            {adminNav.map(item => {
              const active = item.exact ? location.pathname === item.href : location.pathname.startsWith(item.href) && item.href !== '/admin';
              const exactActive = item.exact && location.pathname === '/admin';
              const isActive = active || exactActive;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-all"
                  style={{
                    color: isActive ? '#d4af37' : '#6b7280',
                    background: isActive ? 'rgba(212,175,55,0.12)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${isActive ? 'rgba(212,175,55,0.3)' : 'rgba(255,255,255,0.06)'}`,
                    fontWeight: isActive ? '600' : '400'
                  }}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>

        <main className="flex-1 p-4 md:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
