import { useEffect } from 'react';

export const CP_META = {
  SEVGILI:  { emoji: '💗', label: 'Sevgili',   color: '#ff6b9d', anim: 'cp-pulse-pink' },
  KARI_KOCA:{ emoji: '❤️', label: 'Karı/Koca', color: '#ef4444', anim: 'cp-beat-red' },
  KANKA:    { emoji: '🤜',  label: 'Kanka',     color: '#f59e0b', anim: 'cp-bounce-gold' },
  ARKADAS:  { emoji: '🤝',  label: 'Arkadaş',   color: '#60a5fa', anim: 'cp-pulse-blue' },
  ABLA:     { emoji: '👑',  label: 'Abla',      color: '#d4af37', anim: 'cp-shimmer-gold' },
  ABI:      { emoji: '🛡️', label: 'Abi',       color: '#818cf8', anim: 'cp-steady-purple' },
  ANNE:     { emoji: '🌸',  label: 'Anne',      color: '#f9a8d4', anim: 'cp-float-pink' },
  BABA:     { emoji: '🦁',  label: 'Baba',      color: '#92400e', anim: 'cp-power-brown' },
};

const CSS_KEYFRAMES = `
@keyframes cp-pulse-pink {
  0%,100% { transform: scale(1); filter: drop-shadow(0 0 8px #ff6b9d88); }
  50% { transform: scale(1.18); filter: drop-shadow(0 0 20px #ff6b9dcc); }
}
@keyframes cp-beat-red {
  0%,100% { transform: scale(1); filter: drop-shadow(0 0 6px #ef444488); }
  14% { transform: scale(1.25); }
  28% { transform: scale(1.1); }
  42% { transform: scale(1.22); filter: drop-shadow(0 0 18px #ef4444cc); }
}
@keyframes cp-bounce-gold {
  0%,100% { transform: translateY(0) rotate(0deg); }
  30% { transform: translateY(-8px) rotate(-5deg); }
  60% { transform: translateY(-4px) rotate(3deg); }
}
@keyframes cp-pulse-blue {
  0%,100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.12); opacity: 0.85; }
}
@keyframes cp-shimmer-gold {
  0%,100% { filter: drop-shadow(0 0 6px #d4af3788) brightness(1); }
  50% { filter: drop-shadow(0 0 22px #d4af37ee) brightness(1.3); }
}
@keyframes cp-steady-purple {
  0%,100% { transform: scale(1); filter: drop-shadow(0 0 5px #818cf855); }
  50% { transform: scale(1.1); filter: drop-shadow(0 0 14px #818cf8aa); }
}
@keyframes cp-float-pink {
  0%,100% { transform: translateY(0); filter: drop-shadow(0 0 8px #f9a8d466); }
  50% { transform: translateY(-10px); filter: drop-shadow(0 0 18px #f9a8d4aa); }
}
@keyframes cp-power-brown {
  0%,100% { transform: scale(1); filter: drop-shadow(0 0 4px #92400e55); }
  50% { transform: scale(1.14); filter: drop-shadow(0 0 16px #92400eaa); }
}
`;

let injected = false;
function injectStyles() {
  if (injected) return;
  const style = document.createElement('style');
  style.innerHTML = CSS_KEYFRAMES;
  document.head.appendChild(style);
  injected = true;
}

export default function AnimatedRelationshipEmoji({ type, size = 80 }) {
  useEffect(() => { injectStyles(); }, []);
  const meta = CP_META[type];
  if (!meta) return null;
  const animDuration = type === 'KARI_KOCA' ? '0.8s' : type === 'ANNE' || type === 'ABLA' ? '2.5s' : '1.6s';
  return (
    <span
      style={{
        fontSize: size,
        display: 'inline-block',
        animation: `${meta.anim} ${animDuration} ease-in-out infinite`,
        lineHeight: 1,
        userSelect: 'none',
        cursor: 'default',
      }}
      title={meta.label}
    >
      {meta.emoji}
    </span>
  );
}