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

// Role-exclusive frames (shown only in selector for that role)
export const ADMIN_EXCLUSIVE_FRAME = {
  value: 'admin-role',
  label: '⚙️ ADMİN Çerçevesi',
  color: '#ff4444',
  icon: '⚙️',
  roleOnly: 'admin'
};
export const MOD_EXCLUSIVE_FRAME = {
  value: 'mod-role',
  label: '🛡️ MODERATÖR Çerçevesi',
  color: '#3b82f6',
  icon: '🛡️',
  roleOnly: 'moderator'
};

function RoleFrameWrapper({ frameType, frameColor, size, onClick, children }) {
  const isAdmin = frameType === 'admin-role';
  const isMod = frameType === 'mod-role';
  const color = isAdmin ? '#ff4444' : '#3b82f6';
  const label = isAdmin ? 'ADMİN' : 'MOD';

  return (
    <div
      style={{
        width: size + 10,
        minWidth: size + 10,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        cursor: onClick ? 'pointer' : 'default',
        flexShrink: 0,
      }}
      onClick={onClick}
    >
      <div
        style={{
          width: size + 6,
          height: size + 6,
          borderRadius: '50%',
          padding: 3,
          background: `conic-gradient(${color}, #fff2, ${color})`,
          boxShadow: `0 0 12px ${color}80`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ width: size, height: size, borderRadius: '50%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {children}
        </div>
      </div>
      <div style={{
        fontSize: 8,
        fontWeight: 900,
        letterSpacing: '0.1em',
        color: '#fff',
        background: color,
        borderRadius: 3,
        padding: '1px 4px',
        marginTop: -4,
        lineHeight: 1.4,
        zIndex: 1,
        boxShadow: `0 1px 4px ${color}80`,
      }}>
        {label}
      </div>
    </div>
  );
}

export default function UserAvatar({ user, size = 36, onClick }) {
  const frameType = user?.frameType || '';
  const frameColor = user?.frameColor || '';

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

  const innerDiv = (
    <div
      style={{ width: size, height: size, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      className={user?.avatarUrl ? '' : `bg-gradient-to-br ${gradClass}`}
    >
      {innerContent}
    </div>
  );

  // Special role frames
  if (frameType === 'admin-role' || frameType === 'mod-role') {
    return (
      <RoleFrameWrapper frameType={frameType} frameColor={frameColor} size={size} onClick={onClick}>
        {innerContent}
      </RoleFrameWrapper>
    );
  }

  // Custom-color frame (gifted by admin)
  if (frameType === 'custom' && frameColor) {
    const outerSize = size + 6;
    return (
      <div
        style={{
          width: outerSize, height: outerSize, minWidth: outerSize, minHeight: outerSize,
          borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: onClick ? 'pointer' : 'default', padding: 3, flexShrink: 0,
          background: `conic-gradient(${frameColor}, #ffffff20, ${frameColor})`,
          boxShadow: `0 0 14px ${frameColor}60`,
          animation: 'spin 3s linear infinite',
        }}
        onClick={onClick}
      >
        {innerDiv}
      </div>
    );
  }

  // Standard frame (CSS class)
  if (frameType) {
    const outerSize = size + 6;
    return (
      <div
        className={`frame-${frameType} flex-shrink-0`}
        style={{
          width: outerSize, height: outerSize, minWidth: outerSize, minHeight: outerSize,
          borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: onClick ? 'pointer' : 'default', padding: 3, flexShrink: 0,
        }}
        onClick={onClick}
      >
        {innerDiv}
      </div>
    );
  }

  // No frame
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
