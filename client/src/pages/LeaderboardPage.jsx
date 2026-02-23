import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import UserAvatar from '../components/UserAvatar';
import XpBar from '../components/XpBar';
import { getUsernameClass, getRoleLabel } from '../components/RoleBadge';

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

const MEDAL = ['🥇', '🥈', '🥉'];
const COLORS = ['#d4af37', '#9ca3af', '#b8962a'];

export default function LeaderboardPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/api/top-users?all=1')
      .then(r => setUsers(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen pb-24" style={{ background: '#0a0a0f' }}>
      <div className="max-w-3xl mx-auto px-4 pt-4">
        <div className="flex items-center gap-3 mb-6">
          <BackButton />
          <h1 className="cinzel font-bold text-lg gold-text">👑 Sıralamalar</h1>
        </div>

        {/* Top 3 podium */}
        {users.length >= 3 && (
          <div className="flex gap-3 mb-8 items-end">
            {[
              { user: users[1], rank: 2, height: 'h-24 sm:h-28', mt: 'mt-4' },
              { user: users[0], rank: 1, height: 'h-32 sm:h-36', mt: 'mt-0' },
              { user: users[2], rank: 3, height: 'h-20 sm:h-24', mt: 'mt-6' },
            ].map(({ user: u, rank, mt }) => {
              if (!u) return null;
              const color = COLORS[rank - 1];
              return (
                <div key={u.id}
                  onClick={() => navigate(`/profile/${u.id}`)}
                  className={`flex-1 rounded-2xl p-3 sm:p-4 flex flex-col items-center gap-2 cursor-pointer transition-all hover:scale-105 active:scale-95 ${mt}`}
                  style={{
                    background: `linear-gradient(160deg, rgba(255,255,255,0.07), rgba(255,255,255,0.02))`,
                    border: `1.5px solid ${color}`,
                    boxShadow: rank === 1 ? `0 0 25px ${color}50` : 'none',
                  }}>
                  <span className="text-2xl sm:text-3xl">{MEDAL[rank - 1]}</span>
                  <UserAvatar user={u} size={rank === 1 ? 60 : 48} />
                  <div className="text-center">
                    <div className="font-bold text-xs sm:text-sm text-white truncate max-w-[90px]">{u.username}</div>
                    <div className="text-xs font-bold mt-0.5" style={{ color }}>Lv.{u.level || 1}</div>
                    {u.vip && <div className="text-xs" style={{ color: '#c084fc' }}>VIP 💎</div>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-gray-500 text-sm animate-pulse">Yükleniyor...</div>
        ) : (
          <div className="space-y-2">
            {users.map((u, i) => {
              const usernameClass = getUsernameClass(u);
              const roleInfo = getRoleLabel(u);
              return (
                <div key={u.id}
                  onClick={() => navigate(`/profile/${u.id}`)}
                  className="flex items-center gap-3 p-3 sm:p-4 rounded-2xl cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99]"
                  style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${i < 3 ? COLORS[i] + '40' : 'rgba(255,255,255,0.06)'}` }}>
                  <div className="w-8 sm:w-10 text-center font-bold text-sm flex-shrink-0"
                    style={{ color: i < 3 ? COLORS[i] : '#4b5563' }}>
                    {i < 3 ? MEDAL[i] : `#${i + 1}`}
                  </div>
                  <UserAvatar user={u} size={38} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-sm font-bold ${usernameClass}`}>{u.username}</span>
                      {roleInfo && <span className="text-xs" style={{ color: roleInfo.color }}>{roleInfo.icon}</span>}
                      {u.vip && <span className="text-xs" style={{ color: '#c084fc' }}>💎</span>}
                    </div>
                    {u.xp !== undefined && (
                      <div className="mt-0.5">
                        <XpBar xp={u.xp || 0} level={u.level || 1} compact />
                      </div>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-sm font-bold" style={{ color: '#d4af37' }}>Lv.{u.level || 1}</div>
                    <div className="text-xs text-gray-500">{(u.xp || 0).toLocaleString()} XP</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
