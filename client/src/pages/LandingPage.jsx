import { Link } from 'react-router-dom';

function ContactCard({ icon, title, desc, url, show, isExternal }) {
  if (!show) return null;
  const handleClick = () => {
    if (!url || url === '/') return;
    if (isExternal) window.open(url, '_blank');
    else window.location.href = url;
  };
  return (
    <div className="flex-1 min-w-[130px] rounded-2xl p-4 flex flex-col gap-2 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(212,175,55,0.18)', backdropFilter: 'blur(12px)' }}
      onClick={handleClick}>
      <div className="text-2xl">{icon}</div>
      <div className="font-bold text-white text-sm leading-tight">{title}</div>
      <div className="text-gray-400 text-xs">{desc}</div>
      <button className="mt-auto text-xs font-bold px-3 py-1.5 rounded-lg self-start flex items-center gap-1"
        style={{ background: 'rgba(212,175,55,0.15)', color: '#d4af37', border: '1px solid rgba(212,175,55,0.3)' }}>
        Aç 🔒
      </button>
    </div>
  );
}

function RoomTeaser({ room }) {
  return (
    <div className="flex-1 min-w-[110px] rounded-xl p-3 flex flex-col gap-1"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(212,175,55,0.12)' }}>
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-base">🎬</span>
        {room.isLocked && <span className="text-xs" style={{ color: '#d4af37' }}>🔒</span>}
      </div>
      <div className="text-white text-xs font-bold leading-tight line-clamp-1">{room.title}</div>
      {room.movieTitle && <div className="text-gray-500 text-xs line-clamp-1">{room.movieTitle}</div>}
      <div className="text-xs mt-1 flex items-center gap-1" style={{ color: '#d4af37' }}>
        <span>👥</span>
        <span>{Math.floor(Math.random() * 30) + 5} kişi</span>
      </div>
    </div>
  );
}

export default function LandingPage({ settings, rooms }) {
  const whatsappUrl = settings?.whatsappUrl || '';
  const telegramUrl = settings?.telegramUrl || '';
  const supportUrl = settings?.supportUrl || '/';
  const showWhatsapp = settings?.showWhatsapp !== false;
  const showTelegram = settings?.showTelegram !== false;
  const showSupport = settings?.showSupport !== false;

  const visibleRooms = (rooms || []).filter(r => r.isActive).slice(0, 3);

  return (
    <div className="min-h-screen flex flex-col" style={{
      background: 'linear-gradient(160deg, #0a0005 0%, #1a0a1e 30%, #0f0800 60%, #0a0510 100%)'
    }}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute bottom-0 left-0 right-0 h-64"
          style={{ background: 'linear-gradient(to top, rgba(120,0,20,0.3), transparent)' }} />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(212,175,55,0.06) 0%, transparent 70%)', filter: 'blur(40px)' }} />
        <div className="absolute bottom-40 right-10 w-64 h-64 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(150,0,200,0.08) 0%, transparent 70%)', filter: 'blur(30px)' }} />
        {[...Array(20)].map((_, i) => (
          <div key={i} className="absolute rounded-full animate-pulse"
            style={{
              width: Math.random() * 3 + 1 + 'px', height: Math.random() * 3 + 1 + 'px',
              left: Math.random() * 100 + '%', top: Math.random() * 100 + '%',
              background: i % 2 === 0 ? '#d4af37' : '#9b59b6',
              opacity: Math.random() * 0.5 + 0.1,
              animationDelay: Math.random() * 3 + 's',
              animationDuration: Math.random() * 2 + 2 + 's',
            }} />
        ))}
      </div>

      <div className="relative z-10 flex flex-col flex-1 px-4 w-full max-w-5xl mx-auto">

        <div className="flex flex-col lg:flex-row lg:items-center lg:gap-16 lg:min-h-screen">

          <div className="flex-1 pt-12 pb-8 lg:py-0">
            <div className="mb-10 lg:mb-12">
              <div className="inline-block mb-4 px-3 py-1 rounded-full text-xs font-bold"
                style={{ background: 'rgba(212,175,55,0.12)', color: '#d4af37', border: '1px solid rgba(212,175,55,0.25)' }}>
                🔞 18+ Premium Platform
              </div>
              <h1 className="font-black text-4xl sm:text-5xl lg:text-6xl leading-tight mb-5" style={{
                background: 'linear-gradient(135deg, #d4af37, #f5d76e, #d4af37)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
              }}>
                Birlikte<br />İzle,<br />
                <span style={{ color: '#c084fc', WebkitTextFillColor: '#c084fc' }}>Muhabbet Et.</span>
              </h1>
              <p className="text-gray-400 text-base lg:text-lg leading-relaxed max-w-md">
                Canlı sinema odaları, etkinlikler ve ajans duyuruları. 18+ premium kulüp deneyimi.
              </p>
            </div>

            <div className="flex gap-3 mb-10 lg:mb-0">
              <Link to="/register"
                className="flex-1 sm:flex-none sm:min-w-[180px] text-center py-3.5 px-6 rounded-xl font-bold text-sm cinzel tracking-wide transition-all hover:scale-105 active:scale-95"
                style={{
                  background: 'linear-gradient(135deg, #d4af37, #b8962a)',
                  color: '#0f0f14',
                  boxShadow: '0 0 25px rgba(212,175,55,0.45)',
                }}>
                Hemen Kayıt Ol
              </Link>
              <Link to="/login"
                className="flex-1 sm:flex-none sm:min-w-[140px] text-center py-3.5 px-6 rounded-xl font-bold text-sm cinzel tracking-wide transition-all hover:scale-105 active:scale-95"
                style={{
                  background: 'transparent',
                  color: '#c084fc',
                  border: '1.5px solid #9b59b6',
                  boxShadow: '0 0 18px rgba(155,89,182,0.28)',
                }}>
                Giriş Yap
              </Link>
            </div>
          </div>

          <div className="flex-1 pb-12 lg:py-0 space-y-6 lg:max-w-md">
            {(showWhatsapp || showTelegram || showSupport) && (
              <div>
                <h2 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
                  <span style={{ color: '#d4af37' }}>📞</span> Bize Ulaşın
                </h2>
                <div className="flex gap-3">
                  <ContactCard
                    icon="💬" title="WhatsApp" desc="Destek / 24 Saat"
                    url={whatsappUrl} show={showWhatsapp} isExternal={true} />
                  <ContactCard
                    icon="✈️" title="Telegram" desc="Duyuru Kanalı"
                    url={telegramUrl} show={showTelegram} isExternal={true} />
                  <ContactCard
                    icon="❓" title="Destek / SSS" desc="Sıkça Sorulanlar"
                    url={supportUrl} show={showSupport} isExternal={!supportUrl.startsWith('/')} />
                </div>
              </div>
            )}

            {visibleRooms.length > 0 && (
              <div>
                <h2 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
                  <span style={{ color: '#d4af37' }}>🎭</span> Canlı Sinema Odaları
                </h2>
                <div className="flex gap-3">
                  {visibleRooms.map(r => <RoomTeaser key={r.id} room={r} />)}
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-gray-600 pt-4 border-t"
              style={{ borderColor: 'rgba(212,175,55,0.1)' }}>
              <span className="hover:text-gray-400 cursor-pointer">KVKK</span>
              <span className="hover:text-gray-400 cursor-pointer">Kullanım Şartları</span>
              <span className="hover:text-gray-400 cursor-pointer">İletişim</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
