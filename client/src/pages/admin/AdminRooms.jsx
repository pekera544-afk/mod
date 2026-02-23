import { useState, useEffect } from 'react';
import axios from 'axios';

const emptyRoom = { title: '', description: '', movieTitle: '', posterUrl: '', streamUrl: '', isTrending: false, allowedRoles: 'user,vip,admin', maxUsers: 100, isActive: true };

export default function AdminRooms() {
  const [rooms, setRooms] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyRoom);
  const [msg, setMsg] = useState('');

  const load = () => axios.get('/api/admin/rooms').then(r => setRooms(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing('new'); setForm(emptyRoom); };
  const openEdit = (room) => { setEditing(room.id); setForm(room); };
  const cancel = () => { setEditing(null); };

  const save = async () => {
    try {
      const { id, createdAt, ...data } = form;
      if (editing === 'new') {
        await axios.post('/api/admin/rooms', data);
      } else {
        await axios.put(`/api/admin/rooms/${editing}`, data);
      }
      setMsg('✅ Kaydedildi');
      setEditing(null);
      load();
    } catch { setMsg('❌ Hata'); }
  };

  const del = async (id) => {
    if (!window.confirm('Odayı silmek istediğinizden emin misiniz?')) return;
    await axios.delete(`/api/admin/rooms/${id}`);
    load();
  };

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="cinzel font-bold text-xl gold-text">Sinema Odaları</h2>
          <p className="text-gray-400 text-sm">{rooms.length} oda</p>
        </div>
        <button onClick={openNew} className="btn-gold text-sm px-4 py-2">+ Yeni Oda</button>
      </div>

      {msg && <div className="p-3 rounded-lg text-sm glass-card">{msg}</div>}

      {editing && (
        <div className="glass-card p-5 space-y-3">
          <h3 className="text-sm font-semibold text-gold-DEFAULT">{editing === 'new' ? 'Yeni Oda' : 'Odayı Düzenle'}</h3>
          {[
            ['title', 'Oda Adı *'],
            ['description', 'Açıklama'],
            ['movieTitle', 'Film Adı'],
            ['posterUrl', 'Poster URL'],
            ['streamUrl', 'Yayın URL (embed)'],
            ['allowedRoles', 'İzin Verilen Roller'],
            ['maxUsers', 'Max Kullanıcı']
          ].map(([key, label]) => (
            <div key={key}>
              <label className="block text-xs text-gray-400 mb-1">{label}</label>
              <input
                type={key === 'maxUsers' ? 'number' : 'text'}
                value={form[key] || ''}
                onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl text-white text-sm outline-none"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,175,55,0.2)' }}
              />
            </div>
          ))}
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
              <input type="checkbox" checked={form.isTrending} onChange={e => setForm(p => ({ ...p, isTrending: e.target.checked }))} />
              🔥 Trend
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
              <input type="checkbox" checked={form.isActive} onChange={e => setForm(p => ({ ...p, isActive: e.target.checked }))} />
              Aktif
            </label>
          </div>
          <div className="flex gap-2">
            <button onClick={save} className="btn-gold px-5 py-2 text-sm">Kaydet</button>
            <button onClick={cancel} className="btn-outline-gold px-5 py-2 text-sm">İptal</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {rooms.map(room => (
          <div key={room.id} className="glass-card p-4 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white text-sm">🎬 {room.title}</span>
                {room.isTrending && <span className="text-xs text-gold-DEFAULT">🔥 Trend</span>}
                {!room.isActive && <span className="text-xs text-gray-500">Pasif</span>}
              </div>
              {room.movieTitle && <div className="text-xs text-gray-400 mt-0.5">{room.movieTitle}</div>}
            </div>
            <button onClick={() => openEdit(room)} className="btn-outline-gold text-xs px-3 py-1.5">Düzenle</button>
            <button onClick={() => del(room.id)} className="text-xs px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-400/20 hover:bg-red-500/20 transition-colors">Sil</button>
          </div>
        ))}
      </div>
    </div>
  );
}
