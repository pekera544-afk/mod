import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import UserAvatar from './UserAvatar';
import XpBar from './XpBar';
import BadgeList, { getUsernameClass, getRoleLabel } from './RoleBadge';

export default function UserProfileCard({ userId, onClose, socket }) {
  const { user: me } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [friendStatus, setFriendStatus] = useState(null);
  const [openDM, setOpenDM] = useState(false);
  const [dmMsg, setDmMsg] = useState('');
  const [sentMsg, setSentMsg] = useState('');

  useEffect(() => {
    if (!userId) return;
    fetch(`/api/profile/${userId}`)
      .then(r => r.json())
      .then(data => { setProfile(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [userId]);

  useEffect(() => {
    if (!me || !userId || me.id === userId) return;
    fetch('/api/profile/friends/list', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      .then(r => r.json())
      .then(friends => {
        if (Array.isArray(friends) && friends.find(f => f.id === userId)) {
          setFriendStatus('friends');
        }
      });
  }, [me, userId]);

  function sendFriendRequest() {
    if (!socket || !userId) return;
    socket.emit('friend_request', { toId: userId });
    setFriendStatus('pending');
  }

  function sendDM() {
    if (!socket || !dmMsg.trim()) return;
    socket.emit('send_dm', { toId: userId, content: dmMsg.trim() });
    setSentMsg(dmMsg.trim());
    setDmMsg('');
    setTimeout(() => setSentMsg(''), 3000);
  }

  if (!profile && !loading) return null;

  const roleInfo = profile ? getRoleLabel(profile) : null;
  const usernameClass = profile ? getUsernameClass(profile) : '';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        className="glass-card w-full max-w-sm slide-in-right"
        style={{ background: 'rgba(15,15,22,0.98)', border: '1px solid rgba(212,175,55,0.25)' }}
      >
        {loading ? (
          <div className="p-8 text-center text-gray-400">Yükleniyor...</div>
        ) : profile ? (
          <>
            <div className="p-5">
              <div className="flex items-start gap-4">
                <UserAvatar user={profile} size={64} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-base ${usernameClass}`}>{profile.username}</span>
                    {roleInfo && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: `${roleInfo.color}22`, color: roleInfo.color }}>
                        {roleInfo.icon} {roleInfo.label}
                      </span>
                    )}
                  </div>
                  <div className="mt-1">
                    <BadgeList badges={profile.badges} size={18} />
                  </div>
                  <div className="mt-2">
                    <XpBar xp={profile.xp} level={profile.level} showLabel={true} />
                  </div>
                </div>
                <button onClick={onClose} className="text-gray-500 hover:text-white ml-1 flex-shrink-0">
                  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              {profile.bio && (
                <p className="mt-3 text-sm text-gray-400 leading-relaxed" style={{ borderLeft: '2px solid rgba(212,175,55,0.3)', paddingLeft: 10 }}>
                  {profile.bio}
                </p>
              )}

              <div className="mt-3 text-xs text-gray-600">
                Üyelik: {new Date(profile.createdAt).toLocaleDateString('tr-TR')}
              </div>
            </div>

            {me && me.id !== userId && (
              <div className="border-t border-white/5 p-4 flex gap-2 flex-col">
                {friendStatus !== 'friends' && (
                  <button
                    onClick={sendFriendRequest}
                    disabled={friendStatus === 'pending'}
                    className="w-full py-2 rounded-lg text-sm font-semibold transition-all"
                    style={{ background: friendStatus === 'pending' ? 'rgba(212,175,55,0.2)' : 'rgba(212,175,55,0.15)', color: '#d4af37', border: '1px solid rgba(212,175,55,0.3)' }}
                  >
                    {friendStatus === 'pending' ? '⏳ İstek Gönderildi' : '➕ Arkadaş Ekle'}
                  </button>
                )}
                {friendStatus === 'friends' && (
                  <div className="text-center text-sm text-green-400">✓ Arkadaşsınız</div>
                )}
                <button
                  onClick={() => setOpenDM(!openDM)}
                  className="w-full py-2 rounded-lg text-sm font-semibold transition-all"
                  style={{ background: 'rgba(59,130,246,0.15)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.3)' }}
                >
                  💬 Özel Mesaj
                </button>
                {openDM && (
                  <div className="flex gap-2 mt-1 fade-in-up">
                    <input
                      value={dmMsg}
                      onChange={e => setDmMsg(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && sendDM()}
                      placeholder="Mesajınız..."
                      className="flex-1 bg-white/5 rounded-lg px-3 py-2 text-sm text-white border border-white/10 focus:outline-none focus:border-blue-500/50"
                    />
                    <button onClick={sendDM} className="btn-gold text-xs px-3 py-2 rounded-lg">Gönder</button>
                  </div>
                )}
                {sentMsg && <div className="text-xs text-green-400 text-center fade-in-up">✓ Mesaj gönderildi</div>}
              </div>
            )}
          </>
        ) : (
          <div className="p-8 text-center text-gray-400">Kullanıcı bulunamadı</div>
        )}
      </div>
    </div>
  );
}
