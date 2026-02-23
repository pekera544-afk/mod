import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function CreateRoomModal({ onClose, onCreated }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: '',
    description: '',
    movieTitle: '',
    posterUrl: '',
    streamUrl: '',
    providerType: 'youtube',
    isLocked: false,
    password: '',
    chatEnabled: true,
    spamProtectionEnabled: true,
    spamCooldownSeconds: 3
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (key, val) => setForm(p => ({ ...p, [key]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.title.trim()) return setError('Oda adı gereklidir');
    if (!form.movieTitle.trim()) return setError('Film/Dizi adı gereklidir');
    if (!form.streamUrl.trim()) return setError('Yayın URL gereklidir');

    setLoading(true);
    try {
      const res = await axios.post('/api/rooms', {
        ...form,
        password: form.isLocked ? form.password : undefined
      });
      if (onCreated) onCreated(res.data);
      navigate(`/rooms/${res.data.id}`);
      onClose();
    } catch (err) {
      const msg = err.response?.data?.error;
      if (err.response?.data?.roomId) {
        navigate(`/rooms/${err.response.data.roomId}`);
        onClose();
        return;
      }
      setError(msg || 'Oda oluşturulurken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const providerInfo = {
    youtube: 'YouTube URL yapıştırın (youtube.com/watch?v=... veya youtu.be/...)',
    video: 'Doğrudan MP4, WebM veya HLS (.m3u8) bağlantısı — gerçek zamanlı senkronize oynatma',
    external: 'Netflix, Exxen vb. — DRM korumalı; bağlantı paylaşılır, embed edilemez'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl"
        style={{ background: '#12121a', border: '1px solid rgba(212,175,55,0.2)', boxShadow: '0 0 60px rgba(212,175,55,0.1)' }}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between p-5 border-b border-gold-DEFAULT/10"
          style={{ background: '#12121a' }}>
          <h2 className="cinzel font-bold text-lg gold-text">🎬 Oda Oluştur</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1 transition-colors">
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-xl text-sm text-red-400 bg-red-400/10 border border-red-400/20">{error}</div>
          )}

          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Oda Adı *</label>
            <input
              type="text" value={form.title} onChange={e => set('title', e.target.value)}
              placeholder="Harika Sinema Odası" maxLength={80}
              className="w-full px-4 py-2.5 rounded-xl text-white text-sm outline-none focus:ring-1 focus:ring-gold-DEFAULT"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,175,55,0.2)' }}
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Film / Dizi Adı *</label>
            <input
              type="text" value={form.movieTitle} onChange={e => set('movieTitle', e.target.value)}
              placeholder="Oppenheimer" maxLength={120}
              className="w-full px-4 py-2.5 rounded-xl text-white text-sm outline-none focus:ring-1 focus:ring-gold-DEFAULT"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,175,55,0.2)' }}
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Açıklama</label>
            <textarea
              value={form.description} onChange={e => set('description', e.target.value)}
              placeholder="Oda açıklaması..." maxLength={300} rows={2}
              className="w-full px-4 py-2.5 rounded-xl text-white text-sm outline-none resize-none focus:ring-1 focus:ring-gold-DEFAULT"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,175,55,0.2)' }}
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Poster URL</label>
            <input
              type="url" value={form.posterUrl} onChange={e => set('posterUrl', e.target.value)}
              placeholder="https://..."
              className="w-full px-4 py-2.5 rounded-xl text-white text-sm outline-none focus:ring-1 focus:ring-gold-DEFAULT"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,175,55,0.2)' }}
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Yayın Türü</label>
            <div className="flex gap-2">
              {[
                { val: 'youtube', label: '▶ YouTube' },
                { val: 'video', label: '🎞 Video/HLS' },
                { val: 'external', label: '🔗 Harici Link' }
              ].map(({ val, label }) => (
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
                  {label}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">{providerInfo[form.providerType]}</p>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Yayın URL / Bağlantı *</label>
            <input
              type="text" value={form.streamUrl} onChange={e => set('streamUrl', e.target.value)}
              placeholder={
                form.providerType === 'youtube' ? 'https://www.youtube.com/watch?v=...' :
                form.providerType === 'video' ? 'https://example.com/video.mp4  veya  stream.m3u8' :
                'https://www.netflix.com/watch/...'
              }
              className="w-full px-4 py-2.5 rounded-xl text-white text-sm outline-none focus:ring-1 focus:ring-gold-DEFAULT"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,175,55,0.2)' }}
            />
          </div>

          <div className="space-y-3 rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Oda Ayarları</div>

            <Toggle label="🔒 Şifreli Oda" value={form.isLocked} onChange={v => set('isLocked', v)} />

            {form.isLocked && (
              <input
                type="password" value={form.password} onChange={e => set('password', e.target.value)}
                placeholder="Oda şifresi..."
                className="w-full px-4 py-2.5 rounded-xl text-white text-sm outline-none focus:ring-1 focus:ring-gold-DEFAULT"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,175,55,0.2)' }}
              />
            )}

            <Toggle label="💬 Sohbete İzin Ver" value={form.chatEnabled} onChange={v => set('chatEnabled', v)} />
            <Toggle label="🛡️ Anti-Spam Modu" value={form.spamProtectionEnabled} onChange={v => set('spamProtectionEnabled', v)} />

            {form.spamProtectionEnabled && (
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400">Bekleme süresi (sn):</span>
                <input
                  type="number" min={1} max={30} value={form.spamCooldownSeconds}
                  onChange={e => set('spamCooldownSeconds', Number(e.target.value))}
                  className="w-20 px-3 py-1.5 rounded-lg text-white text-sm outline-none text-center"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,175,55,0.2)' }}
                />
              </div>
            )}
          </div>

          <button
            type="submit" disabled={loading}
            className="btn-gold w-full py-3 text-sm font-bold disabled:opacity-60"
          >
            {loading ? 'Oluşturuluyor...' : '🎬 Odayı Oluştur'}
          </button>
        </form>
      </div>
    </div>
  );
}

function Toggle({ label, value, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className="flex items-center justify-between w-full"
    >
      <span className="text-sm text-gray-300">{label}</span>
      <div className={`w-11 h-6 rounded-full relative transition-colors ${value ? 'bg-gold-DEFAULT' : 'bg-gray-700'}`}>
        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </div>
    </button>
  );
}
