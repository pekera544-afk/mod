import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import UserAvatar from './UserAvatar';
import XpBar from './XpBar';
import BadgeList, { getUsernameClass, getRoleLabel } from './RoleBadge';

const CP_TYPES = [
  { value: 'sevgili', label: 'Sevgili', icon: '❤️', color: '#f43f5e' },
  { value: 'kanka',   label: 'Kanka',   icon: '🤝', color: '#f97316' },
  { value: 'arkadas', label: 'Arkadaş', icon: '👥', color: '#3b82f6' },
  { value: 'aile',    label: 'Aile',    icon: '👨‍👩‍👧', color: '#22c55e' },
];

function CpBadge({ cp, isMine, onBreak }) {
  const [hovered, setHovered] = useState(false);
  const match = CP_TYPES.find(t => t.value === cp.type) || CP_TYPES[0];
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
      padding: '10px 14px',
      background: 'rgba(244,63,94,0.06)',
      border: '1px solid rgba(244,63,94,0.2)',
      borderRadius: 14,
      marginTop: 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <UserAvatar user={{ avatarUrl: '', username: '?' }} size={32} />
        <span style={{
          fontSize: 20,
          animation: 'heartbeat 1.8s ease-in-out infinite',
          display: 'inline-block',
          color: match.color,
          filter: `drop-shadow(0 0 6px ${match.color}60)`,
        }}>{match.icon}</span>
        <UserAvatar user={cp.partner} size={32} />
      </div>
      <div style={{ fontSize: 12, fontWeight: 700, color: match.color }}>{match.label}</div>
      <div style={{ fontSize: 11, color: '#6b7280' }}>
        {cp.partner?.username || 'Bilinmiyor'} ile
      </div>
      {isMine && (
        <button
          onClick={onBreak}
          style={{
            fontSize: 11, color: '#f87171', background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8,
            padding: '3px 10px', cursor: 'pointer', marginTop: 2,
          }}
        >💔 CP'yi Bitir</button>
      )}
    </div>
  );
}

function CpModal({ targetUser, onClose, socket, myVip }) {
  const [selected, setSelected] = useState('sevgili');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const limit = myVip ? 10 : 3;

  const send = () => {
    if (!socket || loading) return;
    setLoading(true);
    socket.emit('cp_request', { receiverId: targetUser.id, type: selected });
    socket.once('cp_request_sent', () => {
      setMsg('✅ CP isteği gönderildi!');
      setLoading(false);
      setTimeout(onClose, 1500);
    });
    socket.once('cp_error', ({ message }) => {
      setMsg(`❌ ${message}`);
      setLoading(false);
    });
  };

  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 999999,
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
    >
      <div style={{
        width: '100%', maxWidth: 340,
        background: 'rgba(15,15,22,0.99)',
        border: '1.5px solid rgba(168,85,247,0.35)',
        borderRadius: 18,
        padding: 20,
        boxShadow: '0 8px 40px rgba(168,85,247,0.2)',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#c084fc' }}>💝 CP İsteği Gönder</div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, width: 28, height: 28, cursor: 'pointer', color: '#9ca3af', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: 12, marginBottom: 14 }}>
          <UserAvatar user={targetUser} size={36} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#e5e7eb' }}>{targetUser.username}</div>
            <div style={{ fontSize: 11, color: '#6b7280' }}>CP isteği alacak</div>
          </div>
        </div>

        <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 8 }}>CP türü seç:</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
          {CP_TYPES.map(t => (
            <button key={t.value} onClick={() => setSelected(t.value)} style={{
              padding: '9px 10px', borderRadius: 12, cursor: 'pointer', fontWeight: 700, fontSize: 13,
              display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center',
              background: selected === t.value ? `${t.color}20` : 'rgba(255,255,255,0.04)',
              border: `1.5px solid ${selected === t.value ? `${t.color}60` : 'rgba(255,255,255,0.08)'}`,
              color: selected === t.value ? t.color : '#9ca3af',
              transition: 'all 0.15s',
            }}>
              <span style={{ fontSize: 16 }}>{t.icon}</span> {t.label}
            </button>
          ))}
        </div>

        <div style={{ fontSize: 11, color: '#4b5563', marginBottom: 12, textAlign: 'center' }}>
          Aylık hak: {limit} istek {myVip ? '(VIP)' : '(Normal Üye)'}
        </div>

        {msg && <div style={{ textAlign: 'center', fontSize: 12, padding: '8px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', marginBottom: 10, color: msg.startsWith('✅') ? '#86efac' : '#f87171' }}>{msg}</div>}

        <button
          onClick={send}
          disabled={loading}
          style={{
            width: '100%', padding: '11px', borderRadius: 12, fontWeight: 800, fontSize: 14,
            background: loading ? 'rgba(168,85,247,0.1)' : 'linear-gradient(135deg, rgba(168,85,247,0.3), rgba(124,58,237,0.2))',
            border: '1.5px solid rgba(168,85,247,0.5)', color: '#c084fc',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >{loading ? 'Gönderiliyor...' : '💝 İstek Gönder'}</button>
      </div>
    </div>
  );
}

function ProfileCardContent({ userId, onClose, socket }) {
  const { user: me } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [friendStatus, setFriendStatus] = useState(null);
  const [openDM, setOpenDM] = useState(false);
  const [dmMsg, setDmMsg] = useState('');
  const [sentMsg, setSentMsg] = useState('');
  const [removingFriend, setRemovingFriend] = useState(false);
  const [myCp, setMyCp] = useState(undefined);
  const [targetCp, setTargetCp] = useState(undefined);
  const [showCpModal, setShowCpModal] = useState(false);

  useEffect(() => {
    if (!userId) return;
    fetch(`/api/profile/${userId}`)
      .then(r => r.json())
      .then(data => { setProfile(data); setLoading(false); })
      .catch(() => setLoading(false));
    fetch(`/api/cp/user/${userId}`)
      .then(r => r.json())
      .then(data => setTargetCp(data))
      .catch(() => setTargetCp(null));
  }, [userId]);

  useEffect(() => {
    if (!me) return;
    const token = localStorage.getItem('yoko_token');
    fetch('/api/cp/my', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => setMyCp(data))
      .catch(() => setMyCp(null));
  }, [me]);

  useEffect(() => {
    if (!me || !userId || me.id === userId) return;
    const token = localStorage.getItem('yoko_token');
    fetch('/api/profile/friends/list', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(friends => { if (Array.isArray(friends) && friends.find(f => f.id === userId)) setFriendStatus('friends'); })
      .catch(() => {});
    fetch('/api/profile/friends/sent', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data) && data.find(r => r.toId === userId)) setFriendStatus(s => s !== 'friends' ? 'pending' : s); })
      .catch(() => {});
  }, [me, userId]);

  function sendFriendRequest() {
    if (!socket || !userId) return;
    socket.emit('friend_request', { toId: userId });
    setFriendStatus('pending');
  }

  function removeFriend() {
    if (removingFriend) return;
    setRemovingFriend(true);
    const token = localStorage.getItem('yoko_token');
    fetch(`/api/profile/friends/${userId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
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

  function breakCp() {
    if (!window.confirm('CP ilişkisini bitirmek istediğinizden emin misiniz?')) return;
    socket?.emit('cp_break');
    setMyCp(null);
  }

  if (!profile && !loading) return null;

  const roleInfo = profile ? getRoleLabel(profile) : null;
  const usernameClass = profile ? getUsernameClass(profile) : '';
  const canSendCp = me && me.id !== userId && me.vip && !myCp;
  const isMyPartner = myCp && myCp.partner?.id === userId;

  return (
    <>
      <style>{`
        @keyframes heartbeat { 0%,100%{transform:scale(1)} 50%{transform:scale(1.2)} }
      `}</style>
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 99999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 16,
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(8px)',
        }}
        onPointerDown={e => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div
          style={{
            position: 'relative', width: '100%', maxWidth: 360,
            background: 'rgba(15,15,22,0.99)',
            border: '1px solid rgba(212,175,55,0.25)',
            borderRadius: 20, overflow: 'hidden',
          }}
          onPointerDown={e => e.stopPropagation()}
        >
          <button
            type="button"
            onPointerDown={e => { e.stopPropagation(); onClose(); }}
            style={{
              position: 'absolute', top: 12, right: 12, zIndex: 10,
              width: 44, height: 44, borderRadius: '50%',
              background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)',
              color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              touchAction: 'manipulation',
            }}
          >
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>

          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Yükleniyor...</div>
          ) : profile ? (
            <>
              <div style={{ padding: '20px 56px 16px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                  <UserAvatar user={profile} size={60} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 15, fontWeight: 700 }} className={usernameClass}>{profile.username}</span>
                      {roleInfo && (
                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 600, background: `${roleInfo.color}22`, color: roleInfo.color }}>
                          {roleInfo.icon} {roleInfo.label}
                        </span>
                      )}
                    </div>
                    <div style={{ marginTop: 4 }}><BadgeList badges={profile.badges} size={16} /></div>
                    <div style={{ marginTop: 8 }}><XpBar xp={profile.xp} level={profile.level} showLabel={true} /></div>
                  </div>
                </div>

                {profile.bio && (
                  <p style={{ marginTop: 12, fontSize: 13, color: '#9ca3af', lineHeight: 1.5, borderLeft: '2px solid rgba(212,175,55,0.35)', paddingLeft: 10 }}>
                    {profile.bio}
                  </p>
                )}

                <div style={{ marginTop: 10, fontSize: 11, color: '#4b5563' }}>
                  Üyelik: {new Date(profile.createdAt).toLocaleDateString('tr-TR')}
                </div>

                {/* CP Section */}
                {isMyPartner && myCp ? (
                  <CpBadge cp={myCp} isMine={true} onBreak={breakCp} />
                ) : targetCp ? (
                  <div style={{
                    marginTop: 10, padding: '8px 12px', background: 'rgba(244,63,94,0.06)',
                    border: '1px solid rgba(244,63,94,0.2)', borderRadius: 12,
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}>
                    <span style={{ fontSize: 16, animation: 'heartbeat 1.8s ease-in-out infinite', display: 'inline-block' }}>
                      {CP_TYPES.find(t => t.value === targetCp.type)?.icon || '❤️'}
                    </span>
                    <div>
                      <div style={{ fontSize: 12, color: '#f43f5e', fontWeight: 700 }}>{targetCp.label}</div>
                      <div style={{ fontSize: 11, color: '#6b7280' }}>{targetCp.partner?.username} ile</div>
                    </div>
                  </div>
                ) : myCp === null && !canSendCp && me && me.id !== userId && !me.vip ? (
                  <div style={{ marginTop: 8, fontSize: 11, color: '#4b5563', padding: '6px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: 10 }}>
                    💝 CP eklemek için VIP olun
                  </div>
                ) : null}
              </div>

              {me && me.id !== userId && (
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {canSendCp && !targetCp && (
                    <button
                      type="button"
                      onPointerDown={() => setShowCpModal(true)}
                      style={{
                        width: '100%', padding: '10px 0', borderRadius: 12, fontSize: 13, fontWeight: 700,
                        background: 'linear-gradient(135deg, rgba(168,85,247,0.2), rgba(244,63,94,0.15))',
                        color: '#c084fc', border: '1px solid rgba(168,85,247,0.4)',
                        cursor: 'pointer', touchAction: 'manipulation',
                      }}
                    >💝 CP Ekle</button>
                  )}

                  {friendStatus === 'friends' ? (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <div style={{ flex: 1, textAlign: 'center', fontSize: 13, color: '#86efac', padding: '10px 0', background: 'rgba(134,239,172,0.08)', borderRadius: 12, border: '1px solid rgba(134,239,172,0.2)' }}>
                        ✓ Arkadaşsınız
                      </div>
                      <button type="button" onPointerDown={removeFriend} disabled={removingFriend} style={{ padding: '10px 14px', borderRadius: 12, fontSize: 12, fontWeight: 600, background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)', cursor: 'pointer', touchAction: 'manipulation', opacity: removingFriend ? 0.5 : 1 }}>
                        ✕ Çıkar
                      </button>
                    </div>
                  ) : (
                    <button type="button" onPointerDown={sendFriendRequest} disabled={friendStatus === 'pending'} style={{ width: '100%', padding: '10px 0', borderRadius: 12, fontSize: 13, fontWeight: 600, background: friendStatus === 'pending' ? 'rgba(212,175,55,0.08)' : 'rgba(212,175,55,0.15)', color: '#d4af37', border: '1px solid rgba(212,175,55,0.3)', cursor: 'pointer', touchAction: 'manipulation' }}>
                      {friendStatus === 'pending' ? '⏳ İstek Gönderildi' : '➕ Arkadaş Ekle'}
                    </button>
                  )}

                  <button type="button" onPointerDown={() => setOpenDM(v => !v)} style={{ width: '100%', padding: '10px 0', borderRadius: 12, fontSize: 13, fontWeight: 600, background: 'rgba(59,130,246,0.15)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.3)', cursor: 'pointer', touchAction: 'manipulation' }}>
                    💬 Özel Mesaj
                  </button>
                  {openDM && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                      <input value={dmMsg} onChange={e => setDmMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendDM()} placeholder="Mesajınız..." style={{ flex: 1, background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: '8px 12px', fontSize: 13, color: '#fff', border: '1px solid rgba(255,255,255,0.1)', outline: 'none' }} />
                      <button type="button" onPointerDown={sendDM} className="btn-gold" style={{ fontSize: 12, padding: '8px 14px', borderRadius: 10, touchAction: 'manipulation' }}>Gönder</button>
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

      {showCpModal && profile && (
        <CpModal
          targetUser={profile}
          onClose={() => setShowCpModal(false)}
          socket={socket}
          myVip={me?.vip}
        />
      )}
    </>
  );
}

export default function UserProfileCard({ userId, onClose, socket }) {
  if (!userId) return null;
  return createPortal(
    <ProfileCardContent userId={userId} onClose={onClose} socket={socket} />,
    document.body
  );
}
