import { useState, useEffect } from 'react';
import axios from 'axios';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [msg, setMsg] = useState('');

  const load = () => {
    axios.get('/api/admin/users').then(r => setUsers(r.data)).catch(() => {});
  };

  useEffect(() => { load(); }, []);

  const updateUser = async (id, data) => {
    try {
      await axios.put(`/api/admin/users/${id}`, data);
      setMsg('✅ Kullanıcı güncellendi');
      load();
    } catch {
      setMsg('❌ Güncelleme hatası');
    }
  };

  const deleteUser = async (id) => {
    if (!window.confirm('Kullanıcıyı silmek istediğinizden emin misiniz?')) return;
    try {
      await axios.delete(`/api/admin/users/${id}`);
      setMsg('✅ Kullanıcı silindi');
      load();
    } catch {
      setMsg('❌ Silme hatası');
    }
  };

  const roleColors = { admin: '#d4af37', vip: '#a855f7', user: '#6b7280' };

  return (
    <div className="max-w-4xl space-y-4">
      <div>
        <h2 className="cinzel font-bold text-xl gold-text mb-1">Kullanıcı Yönetimi</h2>
        <p className="text-gray-400 text-sm">{users.length} kullanıcı</p>
      </div>
      {msg && <div className="p-3 rounded-lg text-sm glass-card">{msg}</div>}

      <div className="space-y-2">
        {users.map(user => (
          <div key={user.id} className="glass-card p-4 flex flex-wrap items-center gap-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-cinema-dark"
              style={{ background: `linear-gradient(135deg, ${roleColors[user.role]}, ${roleColors[user.role]}88)` }}>
              {user.username[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-white text-sm">{user.username}</div>
              <div className="text-xs text-gray-400">{user.email}</div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={user.role}
                onChange={e => updateUser(user.id, { role: e.target.value, vip: user.vip, banned: user.banned })}
                className="text-xs px-2 py-1 rounded-lg outline-none cursor-pointer"
                style={{ background: 'rgba(212,175,55,0.1)', color: '#d4af37', border: '1px solid rgba(212,175,55,0.3)' }}
              >
                <option value="user">User</option>
                <option value="vip">VIP</option>
                <option value="admin">Admin</option>
              </select>

              <button
                onClick={() => updateUser(user.id, { role: user.role, vip: !user.vip, banned: user.banned })}
                className={`text-xs px-2 py-1 rounded-lg transition-colors ${user.vip ? 'bg-purple-500/20 text-purple-400 border border-purple-400/30' : 'bg-white/5 text-gray-500 border border-white/10'}`}
              >
                💎 VIP
              </button>

              <button
                onClick={() => updateUser(user.id, { role: user.role, vip: user.vip, banned: !user.banned })}
                className={`text-xs px-2 py-1 rounded-lg transition-colors ${user.banned ? 'bg-red-500/20 text-red-400 border border-red-400/30' : 'bg-white/5 text-gray-500 border border-white/10'}`}
              >
                {user.banned ? '🚫 Banlı' : '✓ Aktif'}
              </button>

              <button
                onClick={() => deleteUser(user.id)}
                className="text-xs px-2 py-1 rounded-lg bg-red-500/10 text-red-400 border border-red-400/20 hover:bg-red-500/20 transition-colors"
              >
                Sil
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
