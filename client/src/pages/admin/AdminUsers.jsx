import { useState, useEffect } from 'react';
import axios from 'axios';

function EditUserModal({ user, onClose, onSaved }) {
  const [form, setForm] = useState({
    username: user.username,
    email: user.email,
    password: '',
    confirmPassword: '',
    role: user.role,
    vip: user.vip,
    banned: user.banned
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setError('');
    if (form.password && form.password !== form.confirmPassword) {
      setError('Şifreler eşleşmiyor');
      return;
    }
    if (form.password && form.password.length < 6) {
      setError('Şifre en az 6 karakter olmalı');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        username: form.username,
        email: form.email,
        role: form.role,
        vip: form.vip,
        banned: form.banned
      };
      if (form.password) payload.password = form.password;
      await axios.put(`/api/admin/users/${user.id}`, payload);
      onSaved();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Güncelleme hatası');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)' }}>
      <div className="w-full max-w-md rounded-2xl overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #16161e, #1e1a0e)', border: '1px solid rgba(212,175,55,0.3)' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gold-DEFAULT/10">
          <div>
            <h3 className="cinzel font-bold text-gold-DEFAULT">Kullanıcı Düzenle</h3>
            <p className="text-xs text-gray-400 mt-0.5">ID: {user.id} · Kayıt: {new Date(user.createdAt).toLocaleDateString('tr-TR')}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl">✕</button>
        </div>

        <div className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-lg text-sm text-red-400" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs text-gray-400 mb-1.5 font-semibold">Kullanıcı Adı</label>
            <input
              value={form.username}
              onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl text-white text-sm outline-none"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,175,55,0.2)' }}
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1.5 font-semibold">E-posta</label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl text-white text-sm outline-none"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,175,55,0.2)' }}
            />
          </div>

          <div className="border-t border-white/5 pt-4">
            <label className="block text-xs text-gray-400 mb-1.5 font-semibold">
              Yeni Şifre <span className="text-gray-600 font-normal">(boş bırakırsan değişmez)</span>
            </label>
            <input
              type="password"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              placeholder="Min. 6 karakter"
              className="w-full px-3 py-2.5 rounded-xl text-white text-sm outline-none mb-2"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,175,55,0.2)' }}
            />
            <input
              type="password"
              value={form.confirmPassword}
              onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
              placeholder="Şifreyi tekrar gir"
              className="w-full px-3 py-2.5 rounded-xl text-white text-sm outline-none"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,175,55,0.2)' }}
            />
          </div>

          <div className="border-t border-white/5 pt-4 grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5 font-semibold">Rol</label>
              <select
                value={form.role}
                onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                className="w-full px-2 py-2 rounded-lg text-sm outline-none"
                style={{ background: 'rgba(212,175,55,0.1)', color: '#d4af37', border: '1px solid rgba(212,175,55,0.3)' }}
              >
                <option value="user">User</option>
                <option value="vip">VIP</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <button
              onClick={() => setForm(f => ({ ...f, vip: !f.vip }))}
              className="self-end py-2 rounded-lg text-sm font-semibold transition-colors"
              style={{
                background: form.vip ? 'rgba(168,85,247,0.2)' : 'rgba(255,255,255,0.05)',
                color: form.vip ? '#a855f7' : '#6b7280',
                border: `1px solid ${form.vip ? 'rgba(168,85,247,0.4)' : 'rgba(255,255,255,0.1)'}`
              }}
            >
              💎 VIP
            </button>

            <button
              onClick={() => setForm(f => ({ ...f, banned: !f.banned }))}
              className="self-end py-2 rounded-lg text-sm font-semibold transition-colors"
              style={{
                background: form.banned ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.05)',
                color: form.banned ? '#f87171' : '#6b7280',
                border: `1px solid ${form.banned ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.1)'}`
              }}
            >
              {form.banned ? '🚫 Banlı' : '✓ Aktif'}
            </button>
          </div>
        </div>

        <div className="flex gap-3 px-5 pb-5">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm text-gray-400 hover:text-white transition-colors"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
            İptal
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 btn-gold py-2.5 text-sm disabled:opacity-50">
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [msg, setMsg] = useState('');
  const [editUser, setEditUser] = useState(null);
  const [search, setSearch] = useState('');

  const load = () => {
    axios.get('/api/admin/users').then(r => setUsers(r.data)).catch(() => {});
  };

  useEffect(() => { load(); }, []);

  const deleteUser = async (id, username) => {
    if (!window.confirm(`"${username}" kullanıcısını kalıcı olarak silmek istediğinizden emin misiniz?`)) return;
    try {
      await axios.delete(`/api/admin/users/${id}`);
      setMsg('Kullanıcı silindi');
      load();
    } catch {
      setMsg('Silme hatası');
    }
    setTimeout(() => setMsg(''), 3000);
  };

  const roleColors = { admin: '#d4af37', vip: '#a855f7', user: '#6b7280' };
  const roleLabel = { admin: 'Admin', vip: 'VIP', user: 'Üye' };

  const filtered = users.filter(u =>
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-4xl space-y-4">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="cinzel font-bold text-xl gold-text mb-1">Kullanıcı Yönetimi</h2>
          <p className="text-gray-400 text-sm">{users.length} kullanıcı — Kullanıcı adı, e-posta ve şifre değiştirilebilir</p>
        </div>
      </div>

      <div className="glass-card p-3 flex items-center gap-2"
        style={{ border: '1px solid rgba(212,175,55,0.2)', background: 'rgba(212,175,55,0.05)' }}>
        <span className="text-lg">🔑</span>
        <div className="text-xs text-gray-300">
          <span className="font-semibold text-gold-DEFAULT">Admin Giriş Bilgileri: </span>
          <span className="font-mono bg-black/30 px-2 py-0.5 rounded">admin@yokoajans.com</span>
          <span className="mx-1 text-gray-600">/</span>
          <span className="font-mono bg-black/30 px-2 py-0.5 rounded">admin123</span>
          <span className="text-gray-500 ml-2">— Düzenle butonundan değiştirebilirsin</span>
        </div>
      </div>

      {msg && (
        <div className="p-3 rounded-lg text-sm glass-card" style={{ color: msg.includes('hata') || msg.includes('Hata') ? '#f87171' : '#86efac' }}>
          {msg}
        </div>
      )}

      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Kullanıcı adı veya e-posta ara..."
        className="w-full px-4 py-2.5 rounded-xl text-white text-sm outline-none"
        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,175,55,0.2)' }}
      />

      <div className="space-y-2">
        {filtered.map(user => (
          <div key={user.id} className="glass-card p-4 flex flex-wrap items-center gap-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-cinema-dark flex-shrink-0"
              style={{ background: `linear-gradient(135deg, ${roleColors[user.role]}, ${roleColors[user.role]}88)` }}>
              {user.username[0].toUpperCase()}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white text-sm">{user.username}</span>
                <span className="text-xs px-1.5 py-0.5 rounded font-semibold"
                  style={{ color: roleColors[user.role], background: `${roleColors[user.role]}18`, border: `1px solid ${roleColors[user.role]}33` }}>
                  {roleLabel[user.role]}
                </span>
                {user.vip && <span className="text-xs text-purple-400">💎</span>}
                {user.banned && <span className="text-xs text-red-400">🚫 Banlı</span>}
              </div>
              <div className="text-xs text-gray-400">{user.email}</div>
              <div className="text-xs text-gray-600">ID: {user.id} · {new Date(user.createdAt).toLocaleDateString('tr-TR')}</div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => setEditUser(user)}
                className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors"
                style={{ background: 'rgba(212,175,55,0.15)', color: '#d4af37', border: '1px solid rgba(212,175,55,0.3)' }}
              >
                ✏️ Düzenle
              </button>

              <button
                onClick={() => deleteUser(user.id, user.username)}
                className="text-xs px-3 py-1.5 rounded-lg transition-colors"
                style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}
              >
                Sil
              </button>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="glass-card p-8 text-center text-gray-500 text-sm">Kullanıcı bulunamadı</div>
        )}
      </div>

      {editUser && (
        <EditUserModal
          user={editUser}
          onClose={() => setEditUser(null)}
          onSaved={() => {
            setMsg('Kullanıcı başarıyla güncellendi');
            setTimeout(() => setMsg(''), 3000);
            load();
          }}
        />
      )}
    </div>
  );
}
