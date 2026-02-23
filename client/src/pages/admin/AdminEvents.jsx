import { useState, useEffect } from 'react';
import axios from 'axios';

const empty = { titleTR: '', titleEN: '', descriptionTR: '', descriptionEN: '', startTime: '', posterUrl: '', badge: '', isActive: true };

export default function AdminEvents() {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [msg, setMsg] = useState('');

  const load = () => axios.get('/api/admin/events').then(r => setItems(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const save = async () => {
    try {
      const { id, createdAt, ...data } = form;
      if (editing === 'new') {
        await axios.post('/api/admin/events', data);
      } else {
        await axios.put(`/api/admin/events/${editing}`, data);
      }
      setMsg('✅ Kaydedildi'); setEditing(null); load();
    } catch { setMsg('❌ Hata'); }
  };

  const del = async (id) => {
    if (!window.confirm('Silmek istediğinizden emin misiniz?')) return;
    await axios.delete(`/api/admin/events/${id}`); load();
  };

  const fmtForInput = (dt) => {
    if (!dt) return '';
    const d = new Date(dt);
    return d.toISOString().slice(0, 16);
  };

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="cinzel font-bold text-xl gold-text">Etkinlikler</h2>
        <button onClick={() => { setEditing('new'); setForm(empty); }} className="btn-gold text-sm px-4 py-2">+ Yeni Etkinlik</button>
      </div>
      {msg && <div className="p-3 rounded-lg text-sm glass-card">{msg}</div>}

      {editing && (
        <div className="glass-card p-5 space-y-3">
          <h3 className="text-sm font-semibold text-gold-DEFAULT">{editing === 'new' ? 'Yeni Etkinlik' : 'Düzenle'}</h3>
          {[['titleTR', 'Başlık (TR)'], ['titleEN', 'Başlık (EN)'], ['descriptionTR', 'Açıklama (TR)'], ['descriptionEN', 'Açıklama (EN)'], ['badge', 'Rozet Metni'], ['posterUrl', 'Poster URL']].map(([k, l]) => (
            <div key={k}>
              <label className="block text-xs text-gray-400 mb-1">{l}</label>
              <input type="text" value={form[k]} onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl text-white text-sm outline-none"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,175,55,0.2)' }} />
            </div>
          ))}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Başlangıç Tarihi/Saati</label>
            <input type="datetime-local" value={fmtForInput(form.startTime)} onChange={e => setForm(p => ({ ...p, startTime: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl text-white text-sm outline-none"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,175,55,0.2)', colorScheme: 'dark' }} />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
            <input type="checkbox" checked={form.isActive} onChange={e => setForm(p => ({ ...p, isActive: e.target.checked }))} />
            Aktif
          </label>
          <div className="flex gap-2">
            <button onClick={save} className="btn-gold px-5 py-2 text-sm">Kaydet</button>
            <button onClick={() => setEditing(null)} className="btn-outline-gold px-5 py-2 text-sm">İptal</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {items.map(item => (
          <div key={item.id} className="glass-card p-4 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-white text-sm">🗓️ {item.titleTR}</div>
              <div className="text-xs text-gray-400 mt-0.5">
                ⏰ {new Date(item.startTime).toLocaleString('tr-TR')}
                {!item.isActive && <span className="ml-2 text-gray-600">Pasif</span>}
              </div>
            </div>
            <button onClick={() => { setEditing(item.id); setForm({ ...item, startTime: fmtForInput(item.startTime) }); }} className="btn-outline-gold text-xs px-3 py-1.5">Düzenle</button>
            <button onClick={() => del(item.id)} className="text-xs px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-400/20 hover:bg-red-500/20 transition-colors">Sil</button>
          </div>
        ))}
      </div>
    </div>
  );
}
