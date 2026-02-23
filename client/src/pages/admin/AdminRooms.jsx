import { useState, useEffect } from 'react';
import axios from 'axios';

const emptyRoom = {
  title: '', description: '', movieTitle: '', posterUrl: '', streamUrl: '',
  providerType: 'youtube', isLocked: false, chatEnabled: true,
  spamProtectionEnabled: true, isTrending: false, allowedRoles: 'user,vip,admin',
  maxUsers: 100, isActive: true
};

function Toggle({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
      <div
        onClick={() => onChange(!checked)}
        className={`w-9 h-5 rounded-full relative transition-colors cursor-pointer ${checked ? 'bg-gold-DEFAULT' : 'bg-gray-700'}`}
      >
        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0.5'}`} />
      </div>
      {label}
    </label>
  );
}

export default function AdminRooms() {
  const [rooms, setRooms] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyRoom);
  const [msg, setMsg] = useState('');

  const load = () => axios.get('/api/admin/rooms').then(r => setRooms(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const set = (key, val) => setForm(p => ({ ...p, [key]: val }));

  const openNew = () => { setEditing('new'); setForm(emptyRoom); };
  const openEdit = (room) => { setEditing(room.id); setForm({ ...emptyRoom, ...room }); };
  const cancel = () => { setEditing(null); };

  const save = async () => {
    try {
      const { id, createdAt, updatedAt, deletedAt, owner, state, messages, ...data } = form;
      if (editing === 'new') {
        await axios.post('/api/admin/rooms', data);
      } else {
        await axios.put(`/api/admin/rooms/${editing}`, data);
      }
      setMsg('Kaydedildi');
      setTimeout(() => setMsg(''), 2000);
      setEditing(null);
      load();
    } catch { setMsg('Hata oluştu'); }
  };

  const del = async (id) => {
    if (!window.confirm('Odayı silmek istediğinizden emin misiniz?')) return;
    await axios.delete(`/api/admin/rooms/${id}`);
    load();
  };

  const providerLabel = { youtube: '▶ YouTube', external: '🔗 Harici' };

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="cinzel font-bold text-xl gold-text">Sinema Odaları</h2>
          <p className="text-gray-400 text-sm">{rooms.length} oda</p>
        </div>
        <button onClick={openNew} className="btn-gold text-sm px-4 py-2">+ Yeni Oda</button>
      </div>

      {msg && <div className="p-3 rounded-lg text-sm glass-card text-green-400">{msg}</div>}

      {editing && (
        <div className="glass-card p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gold-DEFAULT cinzel">
            {editing === 'new' ? '🎬 Yeni Oda Oluştur' : '✏️ Odayı Düzenle'}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              ['title', 'Oda Adı *', 'text'],
              ['movieTitle', 'Film / Dizi Adı *', 'text'],
              ['description', 'Açıklama', 'text'],
              ['posterUrl', 'Poster URL', 'text'],
            ].map(([key, label]) => (
              <div key={key}>
                <label className="block text-xs text-gray-400 mb-1">{label}</label>
                <input
                  type="text"
                  value={form[key] || ''}
                  onChange={e => set(key, e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-white text-sm outline-none"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,175,55,0.2)' }}
                />
              </div>
            ))}
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Yayın Türü</label>
            <div className="flex gap-2">
              {['youtube', 'external'].map(val => (
                <button
                  key={val} type="button"
                  onClick={() => set('providerType', val)}
                  className="flex-1 py-2 rounded-xl text-sm font-semibold transition-all"
                  style={{
                    background: form.providerType === val ? 'rgba(212,175,55,0.2)' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${form.providerType === val ? 'rgba(212,175,55,0.6)' : 'rgba(255,255,255,0.1)'}`,
                    color: form.providerType === val ? '#d4af37' : '#9ca3af'
                  }}
                >
                  {providerLabel[val]}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              {form.providerType === 'youtube'
                ? 'YouTube embed veya watch URL yapıştırın — otomatik dönüştürülür'
                : 'Netflix, Exxen vb. bağlantı — platforma yönlendirilir, sohbet aktif kalır'}
            </p>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">
              {form.providerType === 'youtube' ? 'YouTube URL (watch?v= veya embed/) *' : 'Platform Bağlantısı *'}
            </label>
            <input
              type="text"
              value={form.streamUrl || ''}
              onChange={e => set('streamUrl', e.target.value)}
              placeholder={form.providerType === 'youtube' ? 'https://www.youtube.com/embed/...' : 'https://www.netflix.com/watch/...'}
              className="w-full px-3 py-2 rounded-xl text-white text-sm outline-none"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,175,55,0.2)' }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <Toggle label="🔥 Trend" checked={!!form.isTrending} onChange={v => set('isTrending', v)} />
            <Toggle label="✅ Aktif" checked={!!form.isActive} onChange={v => set('isActive', v)} />
            <Toggle label="🔒 Şifreli" checked={!!form.isLocked} onChange={v => set('isLocked', v)} />
            <Toggle label="💬 Sohbet" checked={form.chatEnabled !== false} onChange={v => set('chatEnabled', v)} />
            <Toggle label="🛡️ Anti-Spam" checked={form.spamProtectionEnabled !== false} onChange={v => set('spamProtectionEnabled', v)} />
          </div>

          {form.isLocked && (
            <div>
              <label className="block text-xs text-gray-400 mb-1">Oda Şifresi</label>
              <input
                type="password"
                onChange={e => set('password', e.target.value)}
                placeholder="Yeni şifre (boş = değişmez)"
                className="w-full px-3 py-2 rounded-xl text-white text-sm outline-none"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,175,55,0.2)' }}
              />
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button onClick={save} className="btn-gold px-5 py-2 text-sm">Kaydet</button>
            <button onClick={cancel} className="btn-outline-gold px-5 py-2 text-sm">İptal</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {rooms.map(room => (
          <div key={room.id} className="glass-card p-4 flex items-center gap-3">
            {room.posterUrl && (
              <img src={room.posterUrl} alt="" className="w-10 h-14 object-cover rounded flex-shrink-0 opacity-70" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-white text-sm">🎬 {room.title}</span>
                {room.isTrending && <span className="text-xs text-gold-DEFAULT">🔥</span>}
                {room.isLocked && <span className="text-xs text-gray-400">🔒</span>}
                {!room.isActive && <span className="text-xs text-gray-500">Pasif</span>}
                <span className="text-xs px-1.5 py-0.5 rounded"
                  style={{ background: 'rgba(212,175,55,0.1)', color: '#d4af37', fontSize: '10px' }}>
                  {providerLabel[room.providerType] || '▶ YouTube'}
                </span>
              </div>
              {room.movieTitle && <div className="text-xs text-gray-400 mt-0.5">🎥 {room.movieTitle}</div>}
              <div className="text-xs text-gray-600 mt-0.5 truncate">{room.streamUrl || 'URL yok'}</div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button onClick={() => openEdit(room)} className="btn-outline-gold text-xs px-3 py-1.5">Düzenle</button>
              <button onClick={() => del(room.id)} className="text-xs px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-400/20 hover:bg-red-500/20 transition-colors">Sil</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
