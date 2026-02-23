import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useSettings } from '../../context/SettingsContext';
import UserAvatar from '../../components/UserAvatar';

function Field({ label, hint, children }) {
  return (
    <div>
      <label className="block text-xs text-gray-400 mb-1">{label}</label>
      {hint && <p className="text-xs text-gray-600 mb-1.5">{hint}</p>}
      {children}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, maxLength }) {
  return (
    <input
      type="text"
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      maxLength={maxLength}
      className="w-full px-3 py-2 rounded-xl text-white text-sm outline-none"
      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,175,55,0.2)' }}
    />
  );
}

function StatRow({ num, color, icon, value, label, valueEditable = true, dynamicHint, onChange }) {
  return (
    <div className="p-4 rounded-xl space-y-3"
      style={{ background: `rgba(${color},0.04)`, border: `1px solid rgba(${color},0.12)` }}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold" style={{ color: `rgb(${color})` }}>
          İstatistik {num}
        </p>
        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: `rgba(${color},0.15)`, color: `rgb(${color})` }}>
          {icon} {value && <strong>{value}</strong>} {label}
        </span>
      </div>
      <div className={`grid gap-2 ${valueEditable ? 'grid-cols-3' : 'grid-cols-2'}`}>
        <div>
          <label className="block text-xs text-gray-400 mb-1">İkon</label>
          <input type="text" value={icon || ''} maxLength={4}
            onChange={e => onChange('icon', e.target.value)}
            className="w-full px-3 py-2 rounded-xl text-white text-sm outline-none text-center"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,175,55,0.2)' }} />
        </div>
        {valueEditable && (
          <div>
            <label className="block text-xs text-gray-400 mb-1">Değer</label>
            <input type="text" value={value || ''}
              onChange={e => onChange('value', e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-white text-sm outline-none"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,175,55,0.2)' }} />
          </div>
        )}
        <div>
          <label className="block text-xs text-gray-400 mb-1">Etiket</label>
          <input type="text" value={label || ''}
            onChange={e => onChange('label', e.target.value)}
            className="w-full px-3 py-2 rounded-xl text-white text-sm outline-none"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,175,55,0.2)' }} />
        </div>
      </div>
      {dynamicHint && (
        <p className="text-xs text-gray-600">{dynamicHint}</p>
      )}
    </div>
  );
}

function UserSearchSelector({ currentUser, onSelect, onClear }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const timer = useRef(null);

  useEffect(() => {
    if (query.length < 2) { setResults([]); return; }
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
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
        <div className="flex items-center gap-3 p-3 rounded-xl"
          style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.25)' }}>
          <UserAvatar user={currentUser} size={52} />
          <div className="flex-1">
            <div className="text-sm font-bold text-white">{currentUser.username}</div>
            <div className="text-xs text-gray-400">
              {currentUser.frameType ? `${currentUser.frameType} çerçeve` : 'Çerçevesiz'} • Lv.{currentUser.level}
            </div>
            {currentUser.bio && <div className="text-xs text-gray-500 mt-0.5 truncate">{currentUser.bio}</div>}
          </div>
          <button onClick={onClear}
            className="text-xs px-3 py-1.5 rounded-lg font-semibold"
            style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>
            Kaldır
          </button>
        </div>
      ) : (
        <div className="p-3 rounded-xl text-xs text-gray-500 text-center"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)' }}>
          Henüz kullanıcı seçilmedi — aşağıdan arama yapın
        </div>
      )}
      <div className="relative">
        <input value={query} onChange={e => setQuery(e.target.value)}
          placeholder="Kullanıcı adı ile ara (min. 2 harf)..."
          className="w-full px-3 py-2 rounded-xl text-white text-sm outline-none"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,175,55,0.2)' }} />
        {searching && <span className="absolute right-3 top-2.5 text-xs text-gray-500 animate-pulse">Arıyor...</span>}
      </div>
      {results.length > 0 && (
        <div className="rounded-xl overflow-hidden"
          style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.5)' }}>
          {results.map(u => (
            <button key={u.id} onClick={() => { onSelect(u); setQuery(''); setResults([]); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-all hover:bg-white/5"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <UserAvatar user={u} size={32} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-white truncate">{u.username}</div>
                <div className="text-xs text-gray-500">
                  {u.role} • Lv.{u.level}
                  {u.frameType && <span className="ml-1 text-gold-DEFAULT">• {u.frameType} çerçeve</span>}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminCardSettings() {
  const { refresh } = useSettings();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const load = () => {
    axios.get('/api/admin/settings').then(r => setForm(r.data)).catch(() => {});
  };

  useEffect(() => { load(); }, []);

  const set = (key, val) => setForm(p => ({ ...p, [key]: val }));

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    try {
      const { id, updatedAt, heroCardUser, ...data } = form;
      if ('heroCardUserId' in data) {
        data.heroCardUserId = data.heroCardUserId ? Number(data.heroCardUserId) : null;
      }
      await axios.put('/api/admin/settings', { ...data });
      await refresh();
      load();
      setMsg('✅ Kart ayarları kaydedildi!');
    } catch {
      setMsg('❌ Kaydetme hatası oluştu');
    } finally {
      setSaving(false);
    }
  };

  if (!form) return (
    <div className="flex items-center justify-center py-20">
      <div className="gold-text cinzel text-sm animate-pulse">Yükleniyor...</div>
    </div>
  );

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="cinzel font-bold text-xl gold-text mb-1">🃏 Kart Ayarları</h2>
        <p className="text-gray-400 text-sm">Ana sayfadaki MOD CLUB kartının tüm içeriğini buradan düzenleyin</p>
      </div>

      {msg && (
        <div className="p-3 rounded-lg text-sm glass-card border"
          style={{ borderColor: msg.includes('✅') ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)',
            background: msg.includes('✅') ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)' }}>
          {msg}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-5">

        {/* Öne Çıkan Kullanıcı */}
        <div className="glass-card p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-gold-DEFAULT/10 pb-2">
            <span>🎴</span>
            <h3 className="text-sm font-bold text-gold-DEFAULT">Öne Çıkan Kullanıcı</h3>
          </div>
          <p className="text-xs text-gray-500">
            Kurt resmi yerine seçilen kullanıcının avatarı (çerçevesiyle) gösterilir. Boş bırakılırsa kurt resmi görünür.
          </p>
          <UserSearchSelector
            currentUser={form.heroCardUser || null}
            onSelect={u => setForm(p => ({ ...p, heroCardUserId: u.id, heroCardUser: u }))}
            onClear={() => setForm(p => ({ ...p, heroCardUserId: null, heroCardUser: null }))}
          />
        </div>

        {/* Alt Yazı */}
        <div className="glass-card p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-gold-DEFAULT/10 pb-2">
            <span>✏️</span>
            <h3 className="text-sm font-bold text-gold-DEFAULT">Kart Yazıları</h3>
          </div>

          <Field label='Alt Yazı — kartın üst kısmındaki italik metin'>
            <TextInput
              value={form.heroCardSubtitle}
              onChange={v => set('heroCardSubtitle', v)}
              placeholder="Sesin Gücü Bizde!"
            />
          </Field>
        </div>

        {/* İstatistik Satırları */}
        <div className="glass-card p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-gold-DEFAULT/10 pb-2">
            <span>📊</span>
            <h3 className="text-sm font-bold text-gold-DEFAULT">İstatistik Satırları</h3>
          </div>
          <p className="text-xs text-gray-500">Her satırda bir emoji ikon, kalın bir değer ve açıklama etiketi bulunur.</p>

          <StatRow
            num={1}
            color="212,175,55"
            icon={form.heroCardStat1Icon}
            value={form.heroCardStat1Value}
            label={form.heroCardStat1Label}
            onChange={(field, val) => {
              if (field === 'icon') set('heroCardStat1Icon', val);
              if (field === 'value') set('heroCardStat1Value', val);
              if (field === 'label') set('heroCardStat1Label', val);
            }}
          />

          <StatRow
            num={2}
            color="168,85,247"
            icon={form.heroCardStat2Icon}
            value={form.heroCardStat2Value}
            label={form.heroCardStat2Label}
            onChange={(field, val) => {
              if (field === 'icon') set('heroCardStat2Icon', val);
              if (field === 'value') set('heroCardStat2Value', val);
              if (field === 'label') set('heroCardStat2Label', val);
            }}
          />

          <StatRow
            num={3}
            color="34,197,94"
            icon={form.heroCardStat3Icon}
            value="[otomatik]"
            label={form.heroCardStat3Label}
            valueEditable={false}
            dynamicHint='3. satırdaki sayı anlık aktif oda sayısını gösterir — otomatik güncellenir, elle değiştirilemez. İkon ve etiketi düzenleyebilirsiniz.'
            onChange={(field, val) => {
              if (field === 'icon') set('heroCardStat3Icon', val);
              if (field === 'label') set('heroCardStat3Label', val);
            }}
          />
        </div>

        <div className="flex items-center gap-3">
          <button type="submit" disabled={saving}
            className="btn-gold px-8 py-3 font-bold disabled:opacity-60">
            {saving ? 'Kaydediliyor...' : '💾 Kaydet'}
          </button>
          {msg && <span className="text-xs text-gray-400">Değişiklikler anında sitede görünür</span>}
        </div>
      </form>
    </div>
  );
}
