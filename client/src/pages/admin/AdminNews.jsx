import { useState, useEffect } from 'react';
import axios from 'axios';

const empty = { title: '', description: '', imageUrl: '', videoUrl: '', published: false };

export default function AdminNews() {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => axios.get('/api/news/all').then(r => setItems(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.title.trim()) { setMsg('❌ Başlık zorunlu'); return; }
    setSaving(true);
    try {
      const { id, createdAt, updatedAt, ...data } = form;
      if (editing === 'new') {
        await axios.post('/api/news', data);
      } else {
        await axios.put(`/api/news/${editing}`, data);
      }
      setMsg('✅ Kaydedildi');
      setEditing(null);
      setForm(empty);
      load();
    } catch {
      setMsg('❌ Hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  const del = async (id) => {
    if (!window.confirm('Bu haberi silmek istediğinizden emin misiniz?')) return;
    try {
      await axios.delete(`/api/news/${id}`);
      load();
    } catch { setMsg('❌ Silme başarısız'); }
  };

  const togglePublish = async (item) => {
    try {
      await axios.put(`/api/news/${item.id}`, { ...item, published: !item.published });
      load();
    } catch { setMsg('❌ Hata'); }
  };

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="cinzel font-bold text-xl gold-text">Haberler</h2>
        <button
          onClick={() => { setEditing('new'); setForm(empty); }}
          className="btn-gold text-sm px-4 py-2">
          + Yeni Haber
        </button>
      </div>

      {msg && (
        <div className="p-3 rounded-lg text-sm glass-card flex items-center justify-between">
          <span>{msg}</span>
          <button onClick={() => setMsg('')} className="text-gray-400 hover:text-white ml-2">✕</button>
        </div>
      )}

      {editing && (
        <div className="glass-card p-4 rounded-2xl space-y-3">
          <h3 className="font-bold text-white text-sm">{editing === 'new' ? '+ Yeni Haber' : 'Haberi Düzenle'}</h3>

          <div>
            <label className="text-xs text-gray-400 mb-1 block">Başlık *</label>
            <input
              className="w-full px-3 py-2 rounded-xl text-white text-sm outline-none"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(212,175,55,0.2)' }}
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Haber başlığı"
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-1 block">Açıklama / İçerik</label>
            <textarea
              className="w-full px-3 py-2 rounded-xl text-white text-sm outline-none resize-none"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(212,175,55,0.2)', minHeight: 100 }}
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Haber içeriği..."
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-1 block">Görsel URL</label>
            <input
              className="w-full px-3 py-2 rounded-xl text-white text-sm outline-none"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(212,175,55,0.2)' }}
              value={form.imageUrl}
              onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))}
              placeholder="https://..."
            />
            {form.imageUrl && (
              <img src={form.imageUrl} alt="preview" className="mt-2 rounded-lg h-24 object-cover" onError={e => e.target.style.display = 'none'} />
            )}
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-1 block">Video URL (isteğe bağlı)</label>
            <input
              className="w-full px-3 py-2 rounded-xl text-white text-sm outline-none"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(212,175,55,0.2)' }}
              value={form.videoUrl}
              onChange={e => setForm(f => ({ ...f, videoUrl: e.target.value }))}
              placeholder="https://youtube.com/watch?v=..."
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.published}
              onChange={e => setForm(f => ({ ...f, published: e.target.checked }))}
              className="w-4 h-4 accent-yellow-500"
            />
            <span className="text-sm text-white">Yayınla</span>
            {form.published && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(34,197,94,0.15)', color: '#4ade80' }}>Yayında</span>}
          </label>

          <div className="flex gap-2">
            <button onClick={save} disabled={saving}
              className="btn-gold text-sm px-4 py-2 disabled:opacity-60">
              {saving ? 'Kaydediliyor...' : '✅ Kaydet'}
            </button>
            <button onClick={() => { setEditing(null); setForm(empty); }}
              className="btn-outline-gold text-sm px-4 py-2">
              İptal
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {items.length === 0 && <p className="text-gray-500 text-sm text-center py-8">Henüz haber yok</p>}
        {items.map(item => (
          <div key={item.id} className="glass-card p-4 rounded-2xl flex gap-3">
            {item.imageUrl && (
              <img src={item.imageUrl} alt={item.title}
                className="w-16 h-16 object-cover rounded-xl flex-shrink-0"
                onError={e => e.target.style.display = 'none'}
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-2 flex-wrap">
                <h3 className="text-white font-semibold text-sm flex-1 truncate">{item.title}</h3>
                <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                  style={{
                    background: item.published ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.06)',
                    color: item.published ? '#4ade80' : '#6b7280',
                    border: `1px solid ${item.published ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.1)'}`
                  }}>
                  {item.published ? '✅ Yayında' : '⏸ Taslak'}
                </span>
              </div>
              {item.description && (
                <p className="text-gray-400 text-xs mt-1 line-clamp-2">{item.description}</p>
              )}
              <div className="text-xs text-gray-600 mt-1">
                {new Date(item.createdAt).toLocaleDateString('tr-TR')}
              </div>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => { setEditing(item.id); setForm(item); }}
                  className="text-xs px-3 py-1 rounded-lg transition-colors"
                  style={{ background: 'rgba(212,175,55,0.1)', color: '#d4af37', border: '1px solid rgba(212,175,55,0.25)' }}>
                  ✏️ Düzenle
                </button>
                <button
                  onClick={() => togglePublish(item)}
                  className="text-xs px-3 py-1 rounded-lg transition-colors"
                  style={{
                    background: item.published ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.08)',
                    color: item.published ? '#f87171' : '#4ade80',
                    border: `1px solid ${item.published ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.2)'}`
                  }}>
                  {item.published ? '⏸ Gizle' : '✅ Yayınla'}
                </button>
                <button
                  onClick={() => del(item.id)}
                  className="text-xs px-3 py-1 rounded-lg transition-colors"
                  style={{ background: 'rgba(239,68,68,0.06)', color: '#f87171', border: '1px solid rgba(239,68,68,0.15)' }}>
                  🗑️ Sil
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
