export default function UserAvatar({ user, size = 36, onClick }) {
  const sizeStyle = { width: size, height: size, minWidth: size, minHeight: size };
  const frameClass = user?.frameType ? `frame-${user.frameType}` : '';

  const initial = (user?.username || '?')[0].toUpperCase();
  const colors = {
    admin: 'from-red-500 to-yellow-500',
    moderator: 'from-blue-500 to-cyan-400',
    vip: 'from-purple-500 to-pink-500',
    user: 'from-gray-600 to-gray-500'
  };
  const gradClass = colors[user?.role] || colors.user;

  if (user?.avatarUrl) {
    return (
      <div
        className={`rounded-full overflow-hidden flex-shrink-0 cursor-pointer ${frameClass}`}
        style={{ ...sizeStyle, borderRadius: '50%' }}
        onClick={onClick}
      >
        <img
          src={user.avatarUrl}
          alt={user.username}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={e => { e.target.style.display = 'none'; }}
        />
      </div>
    );
  }

  return (
    <div
      className={`rounded-full flex items-center justify-center flex-shrink-0 bg-gradient-to-br ${gradClass} ${frameClass} ${onClick ? 'cursor-pointer' : ''}`}
      style={{ ...sizeStyle, borderRadius: '50%', fontSize: size * 0.4 }}
      onClick={onClick}
    >
      <span className="font-bold text-white" style={{ fontSize: size * 0.38 }}>{initial}</span>
    </div>
  );
}
