export const FRAME_LIST = [
  { value: '', label: 'Yok', color: '#6b7280', icon: '○' },
  { value: 'gold', label: '✨ Altın', color: '#d4af37', icon: '✨' },
  { value: 'fire', label: '🔥 Ateş', color: '#ff6200', icon: '🔥' },
  { value: 'rainbow', label: '🌈 Gökkuşağı', color: '#ff00aa', icon: '🌈' },
  { value: 'galaxy', label: '🌌 Galaksi', color: '#a855f7', icon: '🌌' },
  { value: 'ice', label: '❄️ Buz', color: '#67e8f9', icon: '❄️' },
  { value: 'rose', label: '🌹 Gül', color: '#f472b6', icon: '🌹' },
  { value: 'crystal', label: '💠 Kristal', color: '#e0f2fe', icon: '💠' },
  { value: 'love', label: '💖 Aşk', color: '#fb7185', icon: '💖' },
  { value: 'angel', label: '👼 Melek', color: '#bfdbfe', icon: '👼' },
  { value: 'neon', label: '⚡ Neon', color: '#39ff14', icon: '⚡' },
  { value: 'diamond', label: '💎 Elmas', color: '#a5f3fc', icon: '💎' },
  { value: 'sakura', label: '🌸 Sakura', color: '#fda4af', icon: '🌸' },
];

export default function UserAvatar({ user, size = 36, onClick }) {
  const hasFrame = !!(user?.frameType);
  const frameClass = hasFrame ? `frame-${user.frameType}` : '';
  const initial = (user?.username || '?')[0].toUpperCase();
  const colors = {
    admin: 'from-red-500 to-yellow-500',
    moderator: 'from-blue-500 to-cyan-400',
    vip: 'from-purple-500 to-pink-500',
    user: 'from-gray-600 to-gray-500'
  };
  const gradClass = colors[user?.role] || colors.user;

  const innerContent = user?.avatarUrl ? (
    <img
      src={user.avatarUrl}
      alt={user?.username || ''}
      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      onError={e => { e.target.style.display = 'none'; }}
    />
  ) : (
    <span className="font-bold text-white select-none" style={{ fontSize: size * 0.38 }}>{initial}</span>
  );

  if (hasFrame) {
    const outerSize = size + 6;
    return (
      <div
        className={`${frameClass} flex-shrink-0`}
        style={{
          width: outerSize,
          height: outerSize,
          minWidth: outerSize,
          minHeight: outerSize,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: onClick ? 'pointer' : 'default',
          padding: 3,
          flexShrink: 0,
        }}
        onClick={onClick}
      >
        <div
          style={{ width: size, height: size, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          className={user?.avatarUrl ? '' : `bg-gradient-to-br ${gradClass}`}
        >
          {innerContent}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{ width: size, height: size, minWidth: size, minHeight: size, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, cursor: onClick ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      className={user?.avatarUrl ? '' : `bg-gradient-to-br ${gradClass}`}
      onClick={onClick}
    >
      {innerContent}
    </div>
  );
}
