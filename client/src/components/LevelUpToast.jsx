import { useEffect, useState } from 'react';

export default function LevelUpToast({ level, onDone }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => { setVisible(false); setTimeout(onDone, 400); }, 3000);
    return () => clearTimeout(t);
  }, [onDone]);

  if (!visible) return null;

  return (
    <div
      className="fixed top-20 left-1/2 z-50 text-center"
      style={{
        transform: 'translateX(-50%)',
        animation: 'levelUp 0.6s ease-in-out',
        background: 'linear-gradient(135deg, rgba(212,175,55,0.95), rgba(168,138,32,0.95))',
        borderRadius: 14,
        padding: '12px 24px',
        boxShadow: '0 0 30px rgba(212,175,55,0.6)',
        color: '#0f0f14'
      }}
    >
      <div className="text-2xl mb-1">🎉</div>
      <div className="font-bold text-lg">SEVİYE ATLANDI!</div>
      <div className="font-bold text-3xl">Seviye {level}</div>
    </div>
  );
}
