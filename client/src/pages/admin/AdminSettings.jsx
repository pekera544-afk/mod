import { useState, useEffect } from 'react';
import axios from 'axios';
import { useSettings } from '../../context/SettingsContext';

export default function AdminSettings() {
  const { refresh } = useSettings();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    axios.get('/api/admin/settings').then(r => setForm(r.data)).catch(() => {});
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    try {
      const { id, updatedAt, ...data } = form;
      await axios.put('/api/admin/settings', data);
      refresh();
      setMsg('✅ Ayarlar kaydedildi!');
    } catch {
      setMsg('❌ Kaydetme hatası');
    } finally {
      setSaving(false);
    }
  };

  if (!form) return <div className="gold-text cinzel text-sm">Yükleniyor...</div>;

  const fields = [
    { key: 'siteTitle', label: 'Site Başlığı', type: 'text' },
    { key: 'taglineTR', label: 'Alt Başlık (TR)', type: 'text' },
    { key: 'taglineEN', label: 'Alt Başlık (EN)', type: 'text' },
    { key: 'heroTitleTR', label: 'Hero Başlık (TR)', type: 'text' },
    { key: 'heroTitleEN', label: 'Hero Başlık (EN)', type: 'text' },
    { key: 'logoUrl', label: 'Logo URL', type: 'url' },
    { key: 'primaryColor', label: 'Ana Renk', type: 'color' },
    { key: 'bgImageUrl', label: 'Arka Plan Görsel URL', type: 'url' }
  ];

  const menuFields = [
    { key: 'menuHomeTR', label: 'Menü: Ana Sayfa (TR)' },
    { key: 'menuHomeEN', label: 'Menü: Ana Sayfa (EN)' },
    { key: 'menuRoomsTR', label: 'Menü: Odalar (TR)' },
    { key: 'menuRoomsEN', label: 'Menü: Odalar (EN)' },
    { key: 'menuEventsTR', label: 'Menü: Etkinlikler (TR)' },
    { key: 'menuEventsEN', label: 'Menü: Etkinlikler (EN)' },
    { key: 'menuTopTR', label: 'Menü: Liderlik (TR)' },
    { key: 'menuTopEN', label: 'Menü: Liderlik (EN)' },
    { key: 'menuAnnouncTR', label: 'Menü: Duyurular (TR)' },
    { key: 'menuAnnouncEN', label: 'Menü: Duyurular (EN)' }
  ];

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="cinzel font-bold text-xl gold-text mb-1">Site Ayarları</h2>
        <p className="text-gray-400 text-sm">Marka, başlık ve menü ayarlarını düzenleyin</p>
      </div>

      {msg && <div className="p-3 rounded-lg text-sm glass-card">{msg}</div>}

      <form onSubmit={handleSave} className="space-y-6">
        <div className="glass-card p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gold-DEFAULT border-b border-gold-DEFAULT/10 pb-2">Marka Ayarları</h3>
          {fields.map(f => (
            <div key={f.key}>
              <label className="block text-xs text-gray-400 mb-1">{f.label}</label>
              <div className="flex items-center gap-2">
                {f.type === 'color' && (
                  <input type="color" value={form[f.key] || '#d4af37'}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    className="w-10 h-10 rounded cursor-pointer border-0 p-0 bg-transparent"
                  />
                )}
                <input
                  type={f.type === 'color' ? 'text' : f.type}
                  value={form[f.key] || ''}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  className="flex-1 px-3 py-2 rounded-xl text-white text-sm outline-none"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,175,55,0.2)' }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="glass-card p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gold-DEFAULT border-b border-gold-DEFAULT/10 pb-2">Menü Etiketleri</h3>
          <div className="grid grid-cols-2 gap-3">
            {menuFields.map(f => (
              <div key={f.key}>
                <label className="block text-xs text-gray-400 mb-1">{f.label}</label>
                <input
                  type="text"
                  value={form[f.key] || ''}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl text-white text-sm outline-none"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,175,55,0.2)' }}
                />
              </div>
            ))}
          </div>
        </div>

        <button type="submit" disabled={saving} className="btn-gold px-8 py-3 disabled:opacity-60">
          {saving ? 'Kaydediliyor...' : 'Kaydet'}
        </button>
      </form>
    </div>
  );
}
