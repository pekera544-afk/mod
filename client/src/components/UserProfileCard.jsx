import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import UserAvatar from './UserAvatar';
import XpBar from './XpBar';
import BadgeList, { getUsernameClass, getRoleLabel } from './RoleBadge';

function ProfileCardContent({ userId, onClose, socket }) {
  const { user: me } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [friendStatus, setFriendStatus] = useState(null);
  const [openDM, setOpenDM] = useState(false);
  const [dmMsg, setDmMsg] = useState('');
  const [sentMsg, setSentMsg] = useState('');
  const [removingFriend, setRemovingFriend] = useState(false);

  useEffect(() => {
    if (!userId) return;
    fetch(`/api/profile/${userId}`)
      .then(r => r.json())
      .then(data => { setProfile(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [userId]);

  useEffect(() => {
    if (!me || !userId || me.id === userId) return;
    const token = localStorage.getItem('yoko_token');
    fetch('/api/profile/friends/list', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(friends => {
        if (Array.isArray(friends) && friends.find(f => f.id === userId))
          setFriendStatus('friends');
      })
      .catch(() => {});
    fetch('/api/profile/friends/sent', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data) && data.find(r => r.toId === userId))
          setFriendStatus(s => s !== 'friends' ? 'pending' : s);
      })
      .catch(() => {});
  }, [me, userId]);

  useEffect(() => {
    if (!socket) return;
    const onFriendError = ({ message }) => {
      setFriendStatus(null);
      alert(message);
    };
    socket.on('friend_error', onFriendError);
    return () => socket.off('friend_error', onFriendError);
  }, [socket]);

  function sendFriendRequest() {
    if (!socket || !userId) return;
    socket.emit('friend_request', { toId: userId });
    setFriendStatus('pending');
  }

  function removeFriend() {
    if (removingFriend) return;
    setRemovingFriend(true);
    const token = localStorage.getItem('yoko_token');
    fetch(`/api/profile/friends/${userId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(() => setFriendStatus(null))
      .catch(() => {})
      .finally(() => setRemovingFriend(false));
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
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        background: 'rgba(0,0,0,0.85)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
      onPointerDown={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 360,
          background: 'rgba(15,15,22,0.99)',
          border: '1px solid rgba(212,175,55,0.25)',
          borderRadius: 20,
          overflow: 'hidden',
        }}
        onPointerDown={e => e.stopPropagation()}
      >
        <button
          type="button"
          onPointerDown={e => { e.stopPropagation(); onClose(); }}
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            zIndex: 10,
            width: 44,
            height: 44,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.12)',
            border: '1px solid rgba(255,255,255,0.2)',
            color: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            touchAction: 'manipulation',
            WebkitTapHighlightColor: 'transparent',
          }}
          aria-label="Kapat"
        >
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Yükleniyor...</div>
        ) : profile ? (
          <>
            <div style={{ padding: '20px 56px 20px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                <UserAvatar user={profile} size={60} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 15, fontWeight: 700 }} className={usernameClass}>
                      {profile.username}
                    </span>
                    {roleInfo && (
                      <span style={{
                        fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 600,
                        background: `${roleInfo.color}22`, color: roleInfo.color
                      }}>
                        {roleInfo.icon} {roleInfo.label}
                      </span>
                    )}
                  </div>
                  <div style={{ marginTop: 4 }}>
                    <BadgeList badges={profile.badges} size={16} />
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <XpBar xp={profile.xp} level={profile.level} showLabel={true} />
                  </div>
                </div>
              </div>

              {profile.bio && (
                <p style={{
                  marginTop: 12, fontSize: 13, color: '#9ca3af', lineHeight: 1.5,
                  borderLeft: '2px solid rgba(212,175,55,0.35)', paddingLeft: 10
                }}>
                  {profile.bio}
                </p>
              )}

              <div style={{ marginTop: 10, fontSize: 11, color: '#4b5563' }}>
                Üyelik: {new Date(profile.createdAt).toLocaleDateString('tr-TR')}
              </div>
            </div>

            {me && me.id !== userId && (
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {friendStatus === 'friends' ? (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <div style={{
                      flex: 1, textAlign: 'center', fontSize: 13, color: '#86efac',
                      padding: '10px 0', background: 'rgba(134,239,172,0.08)',
                      borderRadius: 12, border: '1px solid rgba(134,239,172,0.2)'
                    }}>
                      ✓ Arkadaşsınız
                    </div>
                    <button
                      type="button"
                      onPointerDown={removeFriend}
                      disabled={removingFriend}
                      style={{
                        padding: '10px 14px', borderRadius: 12, fontSize: 12, fontWeight: 600,
                        background: 'rgba(239,68,68,0.1)', color: '#f87171',
                        border: '1px solid rgba(239,68,68,0.25)', cursor: 'pointer',
                        touchAction: 'manipulation', opacity: removingFriend ? 0.5 : 1
                      }}
                      title="Arkadaşlıktan çıkar"
                    >
                      ✕ Çıkar
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onPointerDown={sendFriendRequest}
                    disabled={friendStatus === 'pending'}
                    style={{
                      width: '100%', padding: '10px 0', borderRadius: 12, fontSize: 13, fontWeight: 600,
                      background: friendStatus === 'pending' ? 'rgba(212,175,55,0.08)' : 'rgba(212,175,55,0.15)',
                      color: '#d4af37', border: '1px solid rgba(212,175,55,0.3)', cursor: 'pointer',
                      touchAction: 'manipulation'
                    }}
                  >
                    {friendStatus === 'pending' ? '⏳ İstek Gönderildi' : '➕ Arkadaş Ekle'}
                  </button>
                )}
                <button
                  type="button"
                  onPointerDown={() => setOpenDM(v => !v)}
                  style={{
                    width: '100%', padding: '10px 0', borderRadius: 12, fontSize: 13, fontWeight: 600,
                    background: 'rgba(59,130,246,0.15)', color: '#60a5fa',
                    border: '1px solid rgba(59,130,246,0.3)', cursor: 'pointer', touchAction: 'manipulation'
                  }}
                >
                  💬 Özel Mesaj
                </button>
                {openDM && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                    <input
                      value={dmMsg}
                      onChange={e => setDmMsg(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && sendDM()}
                      placeholder="Mesajınız..."
                      style={{
                        flex: 1, background: 'rgba(255,255,255,0.05)', borderRadius: 10,
                        padding: '8px 12px', fontSize: 13, color: '#fff',
                        border: '1px solid rgba(255,255,255,0.1)', outline: 'none'
                      }}
                    />
                    <button
                      type="button"
                      onPointerDown={sendDM}
                      className="btn-gold"
                      style={{ fontSize: 12, padding: '8px 14px', borderRadius: 10, touchAction: 'manipulation' }}
                    >
                      Gönder
                    </button>
                  </div>
                )}
                {sentMsg && <div style={{ fontSize: 12, color: '#86efac', textAlign: 'center' }}>✓ Mesaj gönderildi</div>}
              </div>
            )}
          </>
        ) : (
          <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Kullanıcı bulunamadı</div>
        )}
      </div>
    </div>
  );
}

export default function UserProfileCard({ userId, onClose, socket }) {
  if (!userId) return null;
  return createPortal(
    <ProfileCardContent userId={userId} onClose={onClose} socket={socket} />,
    document.body
  );
}
