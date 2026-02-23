const BADGES = {
  '⭐': { label: 'Star', color: '#ffd700' },
  '🏆': { label: 'Champion', color: '#d4af37' },
  '🎬': { label: 'Cinephile', color: '#e879f9' },
  '🔥': { label: 'Hotshot', color: '#ff4500' },
  '💎': { label: 'VIP', color: '#a855f7' },
  '🛡️': { label: 'Guardian', color: '#3b82f6' },
  '🎭': { label: 'Actor', color: '#ec4899' },
  '🌟': { label: 'Legend', color: '#fbbf24' },
  '👑': { label: 'King', color: '#f59e0b' },
  '🦊': { label: 'Fox', color: '#f97316' },
};

export function getUsernameClass(user) {
  if (user?.role === 'admin') return 'username-admin';
  if (user?.vip) return 'username-vip';
  if (user?.role === 'moderator') return 'username-moderator';
  return 'username-user';
}

// Returns null — admin label is rendered as text inline, not as an icon
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
