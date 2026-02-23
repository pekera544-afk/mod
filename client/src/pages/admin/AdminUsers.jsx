import { useState, useEffect } from 'react';
import axios from 'axios';

const AVAILABLE_BADGES = ['⭐', '🏆', '🎬', '🔥', '💎', '🛡️', '🎭', '🌟', '👑', '🦊'];
const AVAILABLE_FRAMES = [
  { value: '', label: 'Yok' },
  { value: 'gold', label: '✨ Altın' },
  { value: 'fire', label: '🔥 Ateş' },
  { value: 'rainbow', label: '🌈 Gökkuşağı' },
  { value: 'galaxy', label: '🌌 Galaksi' },
  { value: 'ice', label: '❄️ Buz' },
];

function EditUserModal({ user, onClose, onSaved }) {
  const [tab, setTab] = useState('basic');
  const [form, setForm] = useState({
    username: user.username,
    email: user.email,
    password: '',
    confirmPassword: '',
    role: user.role,
    vip: user.vip,
    banned: user.banned
  });
  const [badges, setBadges] = useState((user.badges || '').split(',').map(b => b.trim()).filter(b => b));
  const [frame, setFrame] = useState(user.frameType || '');
  const [xpAmount, setXpAmount] = useState('');
  const [levelVal, setLevelVal] = useState(user.level || 1);
  const [vipDays, setVipDays] = useState('');
  const [vipPerm, setVipPerm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const showSuccess = (msg) => { setSuccess(msg); setTimeout(() => setSuccess(''), 3000); };

  const handleSave = async () => {
    setError('');
    if (form.password && form.password !== form.confirmPassword) { setError('Şifreler eşleşmiyor'); return; }
    if (form.password && form.password.length < 6) { setError('Şifre en az 6 karakter'); return; }
    setSaving(true);
    try {
      const payload = { username: form.username, email: form.email, role: form.role, vip: form.vip, banned: form.banned };
      if (form.password) payload.password = form.password;
      await axios.put(`/api/admin/users/${user.id}`, payload);
      onSaved(); onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Güncelleme hatası');
    } finally { setSaving(false); }
  };

  const saveBadges = async () => {
    try {
      await axios.post(`/api/profile/${user.id}/set-badges`, { badges: badges.join(',') });
      showSuccess('Rozetler kaydedildi!');
    } catch { setError('Rozet kayıt hatası'); }
  };

  const saveFrame = async () => {
    try {
      await axios.post(`/api/profile/${user.id}/set-frame`, { frameType: frame });
      showSuccess('Çerçeve kaydedildi!');
    } catch { setError('Çerçeve kayıt hatası'); }
  };

  const giveXp = async () => {
    if (!xpAmount) return;
    try {
      await axios.post(`/api/profile/${user.id}/give-xp`, { amount: Number(xpAmount) });
      showSuccess(`${xpAmount} XP verildi!`);
      setXpAmount('');
    } catch { setError('XP hatası'); }
  };

  const setLevel = async () => {
    try {
      await axios.post(`/api/profile/${user.id}/set-level`, { level: levelVal });
      showSuccess(`Seviye ${levelVal} ayarlandı!`);
    } catch { setError('Seviye hatası'); }
  };

  const setVip = async (give) => {
    try {
      const days = vipPerm ? 0 : Number(vipDays);
      await axios.post(`/api/profile/${user.id}/set-vip`, { vip: give, days: vipPerm ? null : days });
      showSuccess(give ? `VIP verildi${!vipPerm && days > 0 ? ` (${days} gün)` : ' (Süresiz)'}!` : 'VIP kaldırıldı!');
    } catch { setError('VIP hatası'); }
  };

  const toggleBadge = (b) => {
    setBadges(prev => prev.includes(b) ? prev.filter(x => x !== b) : [...prev, b]);
  };

  const tabs = [
    { key: 'basic', label: 'Temel' },
    { key: 'badges', label: 'Rozetler' },
    { key: 'xp', label: 'XP/Level' },
    { key: 'vip', label: 'VIP' },
    { key: 'frame', label: 'Çerçeve' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.85)' }}>
      <div className="w-full max-w-md rounded-2xl overflow-hidden flex flex-col"
        style={{ background: 'linear-gradient(135deg, #16161e, #1e1a0e)', border: '1px solid rgba(212,175,55,0.3)', maxHeight: '90vh' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gold-DEFAULT/10">
          <div>
            <h3 className="cinzel font-bold text-gold-DEFAULT">@{user.username}</h3>
            <p className="text-xs text-gray-400 mt-0.5">ID: {user.id} · Lv.{user.level || 1} · {user.xp || 0} XP</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl">✕</button>
        </div>

        <div className="flex border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="flex-1 py-2 text-xs font-semibold transition-colors"
              style={{ color: tab === t.key ? '#d4af37' : '#6b7280', borderBottom: tab === t.key ? '2px solid #d4af37' : '2px solid transparent' }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-5 overflow-y-auto flex-1">
          {error && <div className="mb-3 p-2.5 rounded-lg text-xs text-red-400" style={{ background: 'rgba(239,68,68,0.1)' }}>{error}</div>}
          {success && <div className="mb-3 p-2.5 rounded-lg text-xs text-green-400" style={{ background: 'rgba(34,197,94,0.1)' }}>{success}</div>}

          {tab === 'basic' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1.5 font-semibold">Kullanıcı Adı</label>
                <input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl text-white text-sm outline-none"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,175,55,0.2)' }} />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5 font-semibold">E-posta</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl text-white text-sm outline-none"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,175,55,0.2)' }} />
              </div>
              <div className="border-t border-white/5 pt-3">
                <label className="block text-xs text-gray-400 mb-1.5 font-semibold">Yeni Şifre <span className="text-gray-600 font-normal">(boş = değişmez)</span></label>
                <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Min. 6 karakter"
                  className="w-full px-3 py-2.5 rounded-xl text-white text-sm outline-none mb-2"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,175,55,0.2)' }} />
                <input type="password" value={form.confirmPassword} onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
                  placeholder="Tekrar gir"
                  className="w-full px-3 py-2.5 rounded-xl text-white text-sm outline-none"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,175,55,0.2)' }} />
              </div>
              <div className="border-t border-white/5 pt-3 grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5 font-semibold">Rol</label>
                  <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                    className="w-full px-2 py-2 rounded-lg text-sm outline-none"
                    style={{ background: 'rgba(212,175,55,0.1)', color: '#d4af37', border: '1px solid rgba(212,175,55,0.3)' }}>
                    <option value="user">User</option>
                    <option value="moderator">Mod</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <button onClick={() => setForm(f => ({ ...f, vip: !f.vip }))}
                  className="self-end py-2 rounded-lg text-sm font-semibold transition-colors"
                  style={{ background: form.vip ? 'rgba(168,85,247,0.2)' : 'rgba(255,255,255,0.05)', color: form.vip ? '#a855f7' : '#6b7280', border: `1px solid ${form.vip ? 'rgba(168,85,247,0.4)' : 'rgba(255,255,255,0.1)'}` }}>
                  💎 VIP
                </button>
                <button onClick={() => setForm(f => ({ ...f, banned: !f.banned }))}
                  className="self-end py-2 rounded-lg text-sm font-semibold transition-colors"
                  style={{ background: form.banned ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.05)', color: form.banned ? '#f87171' : '#6b7280', border: `1px solid ${form.banned ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.1)'}` }}>
                  {form.banned ? '🚫 Banlı' : '✓ Aktif'}
                </button>
              </div>
              <button onClick={handleSave} disabled={saving}
                className="w-full btn-gold py-2.5 text-sm disabled:opacity-50 mt-2">
                {saving ? 'Kaydediliyor...' : '💾 Kaydet'}
              </button>
            </div>
          )}

          {tab === 'badges' && (
            <div className="space-y-4">
              <p className="text-xs text-gray-400">Rozet seçin (birden fazla seçilebilir):</p>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_BADGES.map(b => (
                  <button
                    key={b}
                    onClick={() => toggleBadge(b)}
                    className="text-2xl w-12 h-12 rounded-xl flex items-center justify-center transition-all"
                    style={{
                      background: badges.includes(b) ? 'rgba(212,175,55,0.25)' : 'rgba(255,255,255,0.05)',
                      border: badges.includes(b) ? '2px solid rgba(212,175,55,0.6)' : '2px solid rgba(255,255,255,0.08)',
                      transform: badges.includes(b) ? 'scale(1.1)' : 'scale(1)'
                    }}
                  >
                    {b}
                  </button>
                ))}
              </div>
              <div className="text-xs text-gray-500">Seçilenler: {badges.join(' ') || 'Yok'}</div>
              <button onClick={saveBadges} className="w-full btn-gold py-2.5 text-sm">✨ Rozetleri Kaydet</button>
            </div>
          )}

          {tab === 'xp' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-2 font-semibold">XP Ver / Al (negatif = al)</label>
                <div className="flex gap-2">
                  <input type="number" value={xpAmount} onChange={e => setXpAmount(e.target.value)}
                    placeholder="Miktar (örn: 100 veya -50)"
                    className="flex-1 px-3 py-2.5 rounded-xl text-white text-sm outline-none"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,175,55,0.2)' }} />
                  <button onClick={giveXp} className="btn-gold px-4 py-2.5 text-sm rounded-xl">Ver</button>
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-2 font-semibold">Seviye Ayarla (1-10)</label>
                <div className="flex gap-2 items-center">
                  <input type="number" min="1" max="10" value={levelVal} onChange={e => setLevelVal(Number(e.target.value))}
                    className="w-24 px-3 py-2.5 rounded-xl text-white text-sm outline-none text-center"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,175,55,0.2)' }} />
                  <button onClick={setLevel} className="btn-gold px-4 py-2.5 text-sm rounded-xl">Ayarla</button>
                </div>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {[1,2,3,4,5,6,7,8,9,10].map(l => (
                  <button key={l} onClick={() => setLevelVal(l)}
                    className="py-2 rounded-lg text-sm font-bold transition-all"
                    style={{ background: levelVal === l ? 'rgba(212,175,55,0.25)' : 'rgba(255,255,255,0.05)', color: levelVal === l ? '#d4af37' : '#6b7280', border: levelVal === l ? '1px solid rgba(212,175,55,0.5)' : '1px solid rgba(255,255,255,0.08)' }}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
          )}

          {tab === 'vip' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.2)' }}>
                <span className="text-2xl">💎</span>
                <div>
                  <div className="text-sm font-bold text-purple-300">VIP Yönetimi</div>
                  <div className="text-xs text-gray-400">Günlük veya süresiz VIP ver/kaldır</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="vipPerm"
                  checked={vipPerm}
                  onChange={e => setVipPerm(e.target.checked)}
                  className="w-4 h-4 accent-purple-500"
                />
                <label htmlFor="vipPerm" className="text-sm text-gray-300">Süresiz VIP</label>
              </div>
              {!vipPerm && (
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5 font-semibold">Kaç gün?</label>
                  <input type="number" min="1" value={vipDays} onChange={e => setVipDays(e.target.value)}
                    placeholder="Gün sayısı (örn: 30)"
                    className="w-full px-3 py-2.5 rounded-xl text-white text-sm outline-none"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(168,85,247,0.3)' }} />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setVip(true)}
                  className="py-3 rounded-xl font-semibold text-sm transition-all"
                  style={{ background: 'rgba(168,85,247,0.2)', color: '#a855f7', border: '1px solid rgba(168,85,247,0.4)' }}>
                  💎 VIP Ver
                </button>
                <button onClick={() => setVip(false)}
                  className="py-3 rounded-xl font-semibold text-sm transition-all"
                  style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}>
                  ✕ VIP Kaldır
                </button>
              </div>
            </div>
          )}

          {tab === 'frame' && (
            <div className="space-y-4">
              <p className="text-xs text-gray-400">Profil çerçevesi seçin:</p>
              <div className="space-y-2">
                {AVAILABLE_FRAMES.map(f => (
                  <button key={f.value} onClick={() => setFrame(f.value)}
                    className="w-full px-4 py-3 rounded-xl text-left text-sm font-semibold transition-all"
                    style={{ background: frame === f.value ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.04)', color: frame === f.value ? '#d4af37' : '#9ca3af', border: frame === f.value ? '1px solid rgba(212,175,55,0.4)' : '1px solid rgba(255,255,255,0.06)' }}>
                    {f.label}
                  </button>
                ))}
              </div>
              <button onClick={saveFrame} className="w-full btn-gold py-2.5 text-sm">🎨 Çerçeveyi Kaydet</button>
            </div>
          )}
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
    } catch { setMsg('Silme hatası'); }
    setTimeout(() => setMsg(''), 3000);
  };

  const roleColors = { admin: '#d4af37', moderator: '#3b82f6', vip: '#a855f7', user: '#6b7280' };
  const roleLabel = { admin: 'Admin', moderator: 'Mod', user: 'Üye' };

  const filtered = users.filter(u =>
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-4xl space-y-4">
      <div>
        <h2 className="cinzel font-bold text-xl gold-text mb-1">Kullanıcı Yönetimi</h2>
        <p className="text-gray-400 text-sm">{users.length} kullanıcı — Rozet, XP, VIP, Çerçeve yönetimi</p>
      </div>

      {msg && (
        <div className="p-3 rounded-lg text-sm glass-card" style={{ color: msg.includes('hata') ? '#f87171' : '#86efac' }}>
          {msg}
        </div>
      )}

      <input value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Kullanıcı adı veya e-posta ara..."
        className="w-full px-4 py-2.5 rounded-xl text-white text-sm outline-none"
        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,175,55,0.2)' }} />

      <div className="space-y-2">
        {filtered.map(user => (
          <div key={user.id} className="glass-card p-4 flex flex-wrap items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white flex-shrink-0"
              style={{ background: `linear-gradient(135deg, ${roleColors[user.role] || '#6b7280'}, ${roleColors[user.role] || '#6b7280'}88)` }}>
              {user.username[0].toUpperCase()}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-white text-sm">{user.username}</span>
                <span className="text-xs px-1.5 py-0.5 rounded font-semibold"
                  style={{ color: roleColors[user.role], background: `${roleColors[user.role]}18`, border: `1px solid ${roleColors[user.role]}33` }}>
                  {roleLabel[user.role] || 'Üye'}
                </span>
                {user.vip && <span className="text-xs text-purple-400">💎</span>}
                {user.banned && <span className="text-xs text-red-400">🚫</span>}
                {user.badges && <span className="text-sm">{user.badges.split(',').slice(0,3).join('')}</span>}
              </div>
              <div className="text-xs text-gray-400">{user.email}</div>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs text-gray-600">Lv.{user.level || 1}</span>
                <div style={{ width: 60, height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 2 }}>
                  <div style={{ height: '100%', background: 'linear-gradient(90deg,#d4af37,#a855f7)', width: `${Math.min(100, ((user.xp || 0) / 7500) * 100)}%`, borderRadius: 2 }} />
                </div>
                <span className="text-xs text-gray-600">{user.xp || 0} XP</span>
                {user.frameType && <span className="text-xs text-gray-500">🖼️ {user.frameType}</span>}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button onClick={() => setEditUser(user)}
                className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors"
                style={{ background: 'rgba(212,175,55,0.15)', color: '#d4af37', border: '1px solid rgba(212,175,55,0.3)' }}>
                ✏️ Düzenle
              </button>
              <button onClick={() => deleteUser(user.id, user.username)}
                className="text-xs px-3 py-1.5 rounded-lg transition-colors"
                style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>
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
          onSaved={() => { setMsg('Kullanıcı güncellendi'); setTimeout(() => setMsg(''), 3000); load(); }}
        />
      )}
    </div>
  );
}
