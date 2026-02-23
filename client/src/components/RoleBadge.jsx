const BADGES = {
  '⭐': { label: 'Star', color: '#ffd700' },
  '🏆': { label: 'Şampiyon', color: '#d4af37' },
  '🎬': { label: 'Sinefil', color: '#e879f9' },
  '🔥': { label: 'Ateşli', color: '#ff4500' },
  '💎': { label: 'VIP', color: '#a855f7' },
  '🛡️': { label: 'Koruyucu', color: '#3b82f6' },
  '🎭': { label: 'Aktör', color: '#ec4899' },
  '🌟': { label: 'Efsane', color: '#fbbf24' },
  '👑': { label: 'Kral', color: '#f59e0b' },
  '🦊': { label: 'Tilki', color: '#f97316' },
};

export const LEVEL_TIERS = [
  { min: 1,   max: 4,        icon: '🥉', label: 'Bronz',  color: '#cd7f32', bg: 'rgba(205,127,50,0.18)',  glow: '#cd7f32' },
  { min: 5,   max: 9,        icon: '🥈', label: 'Gümüş', color: '#b0b8c8', bg: 'rgba(176,184,200,0.15)', glow: '#b0b8c8' },
  { min: 10,  max: 19,       icon: '🥇', label: 'Altın',  color: '#ffd700', bg: 'rgba(255,215,0,0.15)',   glow: '#ffd700' },
  { min: 20,  max: 29,       icon: '💠', label: 'Platin', color: '#00d4ff', bg: 'rgba(0,212,255,0.13)',   glow: '#00d4ff' },
  { min: 30,  max: 49,       icon: '💎', label: 'Elmas',  color: '#7df9ff', bg: 'rgba(125,249,255,0.13)', glow: '#7df9ff' },
  { min: 50,  max: 99,       icon: '🔥', label: 'Usta',   color: '#ff6200', bg: 'rgba(255,98,0,0.15)',    glow: '#ff6200' },
  { min: 100, max: Infinity, icon: '👑', label: 'Efsane', color: '#d4af37', bg: 'rgba(212,175,55,0.18)',  glow: '#d4af37', rainbow: true },
];

export function getLevelTier(level) {
  return LEVEL_TIERS.find(t => level >= t.min && level <= t.max) || LEVEL_TIERS[0];
}

export function LevelBadge({ level, size = 'sm' }) {
  const tier = getLevelTier(level || 1);
  const isLg = size === 'lg';
  return (
    <span
      title={`${tier.label} — Seviye ${level}`}
      className={tier.rainbow ? 'level-badge-rainbow' : ''}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: isLg ? 3 : 2,
        padding: isLg ? '2px 8px' : '1px 5px',
        borderRadius: 20,
        background: tier.rainbow ? 'rgba(212,175,55,0.15)' : tier.bg,
        border: `1px solid ${tier.color}50`,
        fontSize: isLg ? 11 : 9,
        fontWeight: 800,
        color: tier.color,
        letterSpacing: '0.02em',
        boxShadow: `0 0 8px ${tier.glow}35`,
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}
    >
      <span style={{ fontSize: isLg ? 13 : 10, lineHeight: 1 }}>{tier.icon}</span>
      <span>Lv.{level}</span>
    </span>
  );
}

export function RolePill({ user, size = 'sm' }) {
  const isLg = size === 'lg';
  const px = isLg ? '8px' : '5px';
  const py = isLg ? '2px' : '1px';
  const fs = isLg ? 10 : 8;

  if (user?.role === 'admin') {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 2,
        padding: `${py} ${px}`, borderRadius: 20,
        background: 'rgba(220,38,38,0.2)', color: '#ff6b6b',
        border: '1px solid rgba(220,38,38,0.5)',
        fontSize: fs, fontWeight: 900, letterSpacing: '0.12em',
        boxShadow: '0 0 6px rgba(220,38,38,0.3)',
        flexShrink: 0,
      }}>
        ADMİN
      </span>
    );
  }
  if (user?.role === 'moderator') {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 2,
        padding: `${py} ${px}`, borderRadius: 20,
        background: 'rgba(59,130,246,0.18)', color: '#93c5fd',
        border: '1px solid rgba(59,130,246,0.45)',
        fontSize: fs, fontWeight: 800, letterSpacing: '0.08em',
        boxShadow: '0 0 5px rgba(59,130,246,0.25)',
        flexShrink: 0,
      }}>
        🛡️ MOD
      </span>
    );
  }
  if (user?.vip) {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 2,
        padding: `${py} ${px}`, borderRadius: 20,
        background: 'rgba(168,85,247,0.18)', color: '#c084fc',
        border: '1px solid rgba(168,85,247,0.45)',
        fontSize: fs, fontWeight: 800, letterSpacing: '0.06em',
        boxShadow: '0 0 5px rgba(168,85,247,0.25)',
        flexShrink: 0,
      }}>
        💎 VIP
      </span>
    );
  }
  return null;
}

export function getUsernameStyle(user) {
  if (user?.usernameColor) {
    const isExpired = user.usernameColorExpires && new Date(user.usernameColorExpires) < new Date();
    if (!isExpired) {
      return { color: user.usernameColor, fontWeight: 800, WebkitTextFillColor: user.usernameColor, backgroundImage: 'none' };
    }
  }
  return null;
}

export function getUsernameClass(user) {
  if (user?.usernameColor) {
    const isExpired = user?.usernameColorExpires && new Date(user.usernameColorExpires) < new Date();
    if (!isExpired) return '';
  }
  if (user?.role === 'admin') return 'username-admin';
  if (user?.vip) return 'username-vip';
  if (user?.role === 'moderator') return 'username-moderator';
  return 'username-user';
}

export function getRoleLabel(user) {
  if (user?.role === 'admin') return { icon: null, label: 'ADMİN', color: '#ff6b6b', isAdmin: true };
  if (user?.role === 'moderator') return { icon: '🛡️', label: 'MOD', color: '#3b82f6', isMod: true };
  if (user?.vip) return { icon: '💎', label: 'VIP', color: '#a855f7' };
  return null;
}

export default function BadgeList({ badges, size = 16 }) {
  if (!badges) return null;
  const list = badges.split(',').map(b => b.trim()).filter(b => b);
  if (!list.length) return null;
  return (
    <span className="inline-flex gap-0.5">
      {list.map((b, i) => (
        <span key={i} style={{ fontSize: size, lineHeight: 1 }} title={BADGES[b]?.label || b}>{b}</span>
      ))}
    </span>
  );
}
