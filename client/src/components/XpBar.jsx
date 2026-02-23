const XP_TABLE = [0, 100, 250, 500, 900, 1400, 2100, 3000, 4200, 5700, 7500];

export function getLevelInfo(xp, level) {
  const current = XP_TABLE[Math.min(level - 1, XP_TABLE.length - 1)] || 0;
  const next = XP_TABLE[Math.min(level, XP_TABLE.length - 1)] || XP_TABLE[XP_TABLE.length - 1];
  const progress = next > current ? Math.min(100, ((xp - current) / (next - current)) * 100) : 100;
  return { current, next, progress };
}

export default function XpBar({ xp = 0, level = 1, showLabel = true }) {
  const { next, progress } = getLevelInfo(xp, level);

  return (
    <div>
      {showLabel && (
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs font-bold" style={{ color: '#d4af37' }}>Seviye {level}</span>
          <span className="text-xs text-gray-400">{xp} / {next} XP</span>
        </div>
      )}
      <div className="xp-bar">
        <div className="xp-bar-fill" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}
