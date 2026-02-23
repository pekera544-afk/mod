import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useSettings } from '../../context/SettingsContext';
import UserAvatar from '../../components/UserAvatar';

function HeroCardUserSelector({ currentUser, onSelect, onClear }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (query.length < 2) { setResults([]); return; }
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setSearching(true);
      axios.get(`/api/admin/users/search?q=${encodeURIComponent(query)}`)
        .then(r => setResults(r.data))
        .catch(() => {})
        .finally(() => setSearching(false));
    }, 300);
  }, [query]);

  return (
    <div className="space-y-3">
      {currentUser ? (
        <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.25)' }}>
          <UserAvatar user={currentUser} size={52} />
          <div className="flex-1">
            <div className="text-sm font-bold text-white">{currentUser.username}</div>
            <div className="text-xs text-gray-400">{currentUser.frameType ? `Çerçeve: ${currentUser.frameType}` : 'Çerçevesiz'} • Lv.{currentUser.level}</div>
            {currentUser.bio && <div className="text-xs text-gray-500 mt-0.5 truncate">{currentUser.bio}</div>}
          </div>
          <button onClick={onClear}
            className="text-xs px-3 py-1.5 rounded-lg"
            style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>
            Kaldır
          </button>
        </div>
      ) : (
        <div className="text-xs text-gray-500 p-2">Kart üzerinde görünecek kullanıcı seçilmedi</div>
      )}

      <div className="relative">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Kullanıcı ara (min. 2 karakter)..."
          className="w-full px-3 py-2 rounded-xl text-white text-sm outline-none"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,175,55,0.2)' }}
        />
        {searching && <div className="absolute right-3 top-2.5 text-xs text-gray-400 animate-pulse">Arıyor...</div>}
      </div>

      {results.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.4)' }}>
          {results.map(u => (
            <button key={u.id} onClick={() => { onSelect(u); setQuery(''); setResults([]); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-all hover:bg-white/5"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <UserAvatar user={u} size={32} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-white truncate">{u.username}</div>
                <div className="text-xs text-gray-500">{u.role} • Lv.{u.level} {u.frameType && `• ${u.frameType} çerçeve`}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

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
      const { id, updatedAt, heroCardUser, ...data } = form;
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

  const brandFields = [
    { key: 'siteTitle', label: 'Site Başlığı', type: 'text' },
    { key: 'taglineTR', label: 'Alt Başlık (TR)', type: 'text' },
    { key: 'taglineEN', label: 'Alt Başlık (EN)', type: 'text' },
    { key: 'heroTitleTR', label: 'Hero Başlık (TR)', type: 'text' },
    { key: 'heroTitleEN', label: 'Hero Başlık (EN)', type: 'text' },
    { key: 'logoUrl', label: 'Logo URL', type: 'url' },
    { key: 'wolfImageUrl', label: 'Wolf/Amblem Görseli URL (Kullanıcı seçilmezse gösterilir)', type: 'url' },
    { key: 'primaryColor', label: 'Ana Renk', type: 'color' },
    { key: 'bgImageUrl', label: 'Arka Plan Görsel URL', type: 'url' }
  ];

  const menuFields = [
    { key: 'menuHomeTR', label: 'Ana Sayfa (TR)' },
    { key: 'menuHomeEN', label: 'Ana Sayfa (EN)' },
    { key: 'menuRoomsTR', label: 'Odalar (TR)' },
    { key: 'menuRoomsEN', label: 'Odalar (EN)' },
    { key: 'menuEventsTR', label: 'Etkinlikler (TR)' },
    { key: 'menuEventsEN', label: 'Etkinlikler (EN)' },
    { key: 'menuTopTR', label: 'Liderlik (TR)' },
    { key: 'menuTopEN', label: 'Liderlik (EN)' },
    { key: 'menuAnnouncTR', label: 'Duyurular (TR)' },
    { key: 'menuAnnouncEN', label: 'Duyurular (EN)' }
  ];

  const contactFields = [
    { key: 'whatsappUrl', label: 'WhatsApp Linki', placeholder: 'https://wa.me/905xxxxxxxxx', icon: '💬' },
    { key: 'telegramUrl', label: 'Telegram Linki', placeholder: 'https://t.me/kanaliniz', icon: '✈️' },
    { key: 'supportUrl', label: 'Destek/SSS Linki', placeholder: '/support veya https://...', icon: '❓' },
  ];

  const toggleField = (key) => setForm(p => ({ ...p, [key]: !p[key] }));

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="cinzel font-bold text-xl gold-text mb-1">Site Ayarları</h2>
        <p className="text-gray-400 text-sm">Marka, iletişim ve menü ayarlarını düzenleyin</p>
      </div>

      {msg && <div className="p-3 rounded-lg text-sm glass-card">{msg}</div>}

      <form onSubmit={handleSave} className="space-y-6">

        <div className="glass-card p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gold-DEFAULT border-b border-gold-DEFAULT/10 pb-2">
            🎴 Hero Kart — Öne Çıkan Kullanıcı
          </h3>
          <p className="text-xs text-gray-500">
            Ana sayfadaki MOD CLUB kartında kurt resmi yerine seçilen kullanıcının profili (çerçevesiyle birlikte) gösterilir.
          </p>
          <HeroCardUserSelector
            currentUser={form.heroCardUser || null}
            onSelect={(u) => setForm(p => ({ ...p, heroCardUserId: u.id, heroCardUser: u }))}
            onClear={() => setForm(p => ({ ...p, heroCardUserId: null, heroCardUser: null }))}
          />
        </div>

        <div className="glass-card p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gold-DEFAULT border-b border-gold-DEFAULT/10 pb-2">Marka Ayarları</h3>
          {brandFields.map(f => (
            <div key={f.key}>
              <label className="block text-xs text-gray-400 mb-1">{f.label}</label>
              <div className="flex items-center gap-2">
                {f.type === 'color' && (
                  <input type="color" value={form[f.key] || '#d4af37'}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    className="w-10 h-10 rounded cursor-pointer border-0 p-0 bg-transparent" />
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
          <h3 className="text-sm font-semibold text-gold-DEFAULT border-b border-gold-DEFAULT/10 pb-2">
            📲 İletişim Linkleri (Landing Sayfası)
          </h3>
          <p className="text-xs text-gray-500">Bu linkler giriş yapmamış kullanıcılara gösterilen ana sayfada görünür.</p>
          {contactFields.map(f => (
            <div key={f.key}>
              <label className="block text-xs text-gray-400 mb-1">{f.icon} {f.label}</label>
              <input
                type="url"
                value={form[f.key] || ''}
                onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                className="w-full px-3 py-2 rounded-xl text-white text-sm outline-none"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,175,55,0.2)' }}
              />
            </div>
          ))}
          <div className="space-y-2 pt-2 border-t border-gold-DEFAULT/10">
            <p className="text-xs text-gray-500 mb-2">Kartları Göster/Gizle:</p>
            {[
              { key: 'showWhatsapp', label: '💬 WhatsApp kartını göster' },
              { key: 'showTelegram', label: '✈️ Telegram kartını göster' },
              { key: 'showSupport', label: '❓ Destek kartını göster' },
            ].map(t => (
              <label key={t.key} className="flex items-center gap-3 cursor-pointer">
                <div onClick={() => toggleField(t.key)}
                  className="w-10 h-5 rounded-full relative transition-colors flex-shrink-0"
                  style={{ background: form[t.key] ? '#d4af37' : 'rgba(255,255,255,0.1)' }}>
                  <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
                    style={{ left: form[t.key] ? '22px' : '2px' }} />
                </div>
                <span className="text-xs text-gray-300">{t.label}</span>
              </label>
            ))}
          </div>
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
