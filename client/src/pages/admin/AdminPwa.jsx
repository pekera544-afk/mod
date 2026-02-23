import { useState, useEffect } from 'react';
import axios from 'axios';

export default function AdminPwa() {
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    axios.get('/api/admin/pwa').then(r => setForm(r.data)).catch(() => {});
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    try {
      const { id, updatedAt, ...data } = form;
      await axios.put('/api/admin/pwa', data);
      setMsg('✅ PWA ayarları kaydedildi!');
    } catch {
      setMsg('❌ Kaydetme hatası');
    } finally {
      setSaving(false);
    }
  };

  const publishUpdate = async () => {
    try {
      const res = await axios.post('/api/admin/pwa/publish-update');
      setForm(p => ({ ...p, version: res.data.version }));
      setMsg(`✅ PWA güncellemesi yayınlandı! Versiyon: ${res.data.version}`);
    } catch {
      setMsg('❌ Yayınlama hatası');
    }
  };

  if (!form) return <div className="gold-text cinzel text-sm">Yükleniyor...</div>;

  const fields = [
    { key: 'name', label: 'Uygulama Adı' },
    { key: 'shortName', label: 'Kısa Ad' },
    { key: 'descriptionTR', label: 'Açıklama (TR)' },
    { key: 'descriptionEN', label: 'Açıklama (EN)' },
    { key: 'themeColor', label: 'Tema Rengi', type: 'color' },
    { key: 'backgroundColor', label: 'Arka Plan Rengi', type: 'color' },
    { key: 'icon192Url', label: '192x192 İkon URL' },
    { key: 'icon512Url', label: '512x512 İkon URL' },
    { key: 'startUrl', label: 'Start URL' },
    { key: 'scope', label: 'Scope' }
  ];

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="cinzel font-bold text-xl gold-text mb-1">PWA Ayarları</h2>
        <p className="text-gray-400 text-sm">Progressive Web App manifest ve servis worker ayarları</p>
      </div>

      {msg && <div className="p-3 rounded-lg text-sm glass-card">{msg}</div>}

      <div className="glass-card p-4 flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-white">Mevcut Versiyon: <span className="text-gold-DEFAULT">v{form.version}</span></div>
          <div className="text-xs text-gray-400 mt-0.5">Versiyon artırmak istemci önbelleklerini temizler</div>
        </div>
        <button onClick={publishUpdate} className="btn-gold text-sm px-4 py-2">
          📱 PWA Güncellemesini Yayınla
        </button>
      </div>

      <form onSubmit={handleSave} className="glass-card p-5 space-y-4">
        <h3 className="text-sm font-semibold text-gold-DEFAULT border-b border-gold-DEFAULT/10 pb-2">Manifest Ayarları</h3>

        <div className="flex items-center gap-3">
          <label className="text-xs text-gray-400">PWA Aktif</label>
          <button
            type="button"
            onClick={() => setForm(p => ({ ...p, enabled: !p.enabled }))}
            className={`w-10 h-5 rounded-full transition-colors relative ${form.enabled ? 'bg-gold-DEFAULT' : 'bg-gray-600'}`}
          >
            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${form.enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
        </div>

        {fields.map(f => (
          <div key={f.key}>
            <label className="block text-xs text-gray-400 mb-1">{f.label}</label>
            <div className="flex items-center gap-2">
              {f.type === 'color' && (
                <input type="color" value={form[f.key] || '#0f0f14'}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  className="w-10 h-10 rounded cursor-pointer border-0 p-0"
                />
              )}
              <input
                type={f.type === 'color' ? 'text' : 'text'}
                value={form[f.key] || ''}
                onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                className="flex-1 px-3 py-2 rounded-xl text-white text-sm outline-none"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,175,55,0.2)' }}
              />
            </div>
          </div>
        ))}

        <button type="submit" disabled={saving} className="btn-gold px-8 py-3 disabled:opacity-60">
          {saving ? 'Kaydediliyor...' : 'Kaydet'}
        </button>
      </form>
    </div>
  );
}
