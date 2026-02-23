import { useNavigate } from 'react-router-dom';
import { brand } from '../config/brand';

function BackButton() {
  const navigate = useNavigate();
  return (
    <button onClick={() => navigate(-1)}
      className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors text-sm">
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <polyline points="15 18 9 12 15 6" />
      </svg>
      Geri
    </button>
  );
}

const perks = [
  { icon: '🎬', label: 'Özel VIP Sinema Odaları', desc: 'Sadece VIP üyelere özel senkronize film odaları' },
  { icon: '💬', label: 'Sohbette Özel Rozet', desc: 'Tüm sohbetlerde VIP 💎 rozeti görünür' },
  { icon: '👑', label: 'Özel Profil Çerçevesi', desc: 'Altın VIP çerçevesiyle profilinizi özelleştirin' },
  { icon: '🚀', label: '2x XP Kazanımı', desc: 'Tüm aktivitelerden 2 kat daha fazla deneyim puanı' },
  { icon: '🛡️', label: 'Anti-Spam Bypass', desc: 'Sohbette spam filtresi uygulanmaz' },
  { icon: '🌟', label: 'Öncelikli Destek', desc: 'Yönetim ekibine öncelikli erişim' },
];

export default function VipPage() {
  return (
    <div className="min-h-screen pb-24" style={{ background: '#0a0a0f' }}>
      <div className="max-w-lg mx-auto px-4 pt-4">
        <div className="flex items-center gap-3 mb-6">
          <BackButton />
          <h1 className="cinzel font-bold text-lg flex-1" style={{ color: '#c084fc' }}>💎 VIP Üyelik</h1>
        </div>

        <div className="rounded-3xl p-6 mb-6 text-center"
          style={{
            background: 'linear-gradient(135deg, rgba(192,132,252,0.15), rgba(139,92,246,0.08))',
            border: '1px solid rgba(192,132,252,0.3)',
            boxShadow: '0 0 40px rgba(192,132,252,0.1)'
          }}>
          <div className="text-5xl mb-3">💎</div>
          <h2 className="cinzel font-bold text-xl text-white mb-2">{brand.shortName} VIP</h2>
          <p className="text-gray-400 text-sm mb-4">Sinema topluluğunun ayrıcalıklı üyesi ol</p>
          <a href="https://t.me/yokoajans" target="_blank" rel="noopener noreferrer"
            className="inline-block px-8 py-3 rounded-2xl font-bold text-sm transition-all hover:scale-105"
            style={{
              background: 'linear-gradient(135deg, #c084fc, #7c3aed)',
              color: 'white',
              boxShadow: '0 4px 20px rgba(192,132,252,0.4)'
            }}>
            💎 VIP Al — Telegram'dan İletişime Geç
          </a>
        </div>

        <h3 className="text-white font-bold text-sm mb-3 px-1">VIP Ayrıcalıkları</h3>
        <div className="space-y-2">
          {perks.map((perk, i) => (
            <div key={i} className="flex items-start gap-3 p-4 rounded-2xl"
              style={{ background: 'rgba(192,132,252,0.06)', border: '1px solid rgba(192,132,252,0.15)' }}>
              <span className="text-xl flex-shrink-0">{perk.icon}</span>
              <div>
                <div className="text-white font-semibold text-sm">{perk.label}</div>
                <div className="text-gray-500 text-xs mt-0.5">{perk.desc}</div>
              </div>
              <span className="ml-auto text-green-400 text-sm flex-shrink-0">✓</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
