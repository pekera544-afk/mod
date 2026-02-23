import { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

function StatCard({ label, value, icon, color }) {
  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-2xl font-bold" style={{ color }}>{value}</div>
          <div className="text-xs text-gray-400 mt-1">{label}</div>
        </div>
        <div className="text-3xl opacity-60">{icon}</div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState({ rooms: 0, users: 0, announcements: 0, events: 0 });

  useEffect(() => {
    Promise.all([
      axios.get('/api/admin/rooms').then(r => r.data.length),
      axios.get('/api/admin/users').then(r => r.data.length),
      axios.get('/api/admin/announcements').then(r => r.data.length),
      axios.get('/api/admin/events').then(r => r.data.length)
    ]).then(([rooms, users, announcements, events]) => {
      setStats({ rooms, users, announcements, events });
    }).catch(() => {});
  }, []);

  const quickLinks = [
    { href: '/admin/settings', label: 'Site Ayarları', icon: '🎨', desc: 'Logo, başlık, renkler' },
    { href: '/admin/pwa', label: 'PWA Ayarları', icon: '📱', desc: 'Manifest ve servis worker' },
    { href: '/admin/rooms', label: 'Sinema Odaları', icon: '🎬', desc: 'Oda ekle, düzenle' },
    { href: '/admin/users', label: 'Kullanıcılar', icon: '👥', desc: 'Rol ve VIP yönetimi' }
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="cinzel font-bold text-xl gold-text mb-1">Yönetim Paneli</h2>
        <p className="text-gray-400 text-sm">YOKO AJANS platform yönetimi</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Sinema Odası" value={stats.rooms} icon="🎬" color="#d4af37" />
        <StatCard label="Kullanıcı" value={stats.users} icon="👥" color="#a855f7" />
        <StatCard label="Duyuru" value={stats.announcements} icon="📢" color="#22c55e" />
        <StatCard label="Etkinlik" value={stats.events} icon="🗓️" color="#ef4444" />
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-300 mb-3">Hızlı Erişim</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {quickLinks.map(link => (
            <Link key={link.href} to={link.href}
              className="glass-card p-4 flex items-center gap-3 hover:border-gold-DEFAULT/30 transition-all">
              <span className="text-2xl">{link.icon}</span>
              <div>
                <div className="font-semibold text-white text-sm">{link.label}</div>
                <div className="text-xs text-gray-400">{link.desc}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
