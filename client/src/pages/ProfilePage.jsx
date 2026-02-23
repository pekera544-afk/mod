import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useOutletContext } from 'react-router-dom';
import UserAvatar from '../components/UserAvatar';
import XpBar from '../components/XpBar';
import BadgeList, { getUsernameClass, getRoleLabel } from '../components/RoleBadge';

function BackButton() {
  const navigate = useNavigate();
  return (
    <button onClick={() => navigate(-1)}
      className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors text-sm mb-4">
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <polyline points="15 18 9 12 15 6" />
      </svg>
      Geri
    </button>
  );
}

function FieldRow({ label, children }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs text-gray-500 font-semibold uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}

function InputField({ value, onChange, type = 'text', placeholder, disabled, maxLength }) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      maxLength={maxLength}
      className="w-full px-4 py-2.5 rounded-xl text-white text-sm outline-none disabled:opacity-40"
      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,175,55,0.2)' }}
    />
  );
}

function StatusMsg({ msg, type }) {
  if (!msg) return null;
  const styles = {
    success: { background: 'rgba(34,197,94,0.12)', color: '#86efac', border: '1px solid rgba(34,197,94,0.25)' },
    error: { background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)' },
  };
  return (
    <div className="px-4 py-2.5 rounded-xl text-sm" style={styles[type] || styles.error}>
      {msg}
    </div>
  );
}

function MyProfileSettings({ profile, onUpdated }) {
  const [activeTab, setActiveTab] = useState('profile');

  const [bio, setBio] = useState(profile.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl || '');
  const [saving, setSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState(null);

  const [username, setUsername] = useState(profile.username || '');
  const [usernameMsg, setUsernameMsg] = useState(null);
  const [savingUser, setSavingUser] = useState(false);

  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [newPw2, setNewPw2] = useState('');
  const [pwMsg, setPwMsg] = useState(null);
  const [savingPw, setSavingPw] = useState(false);

  const isPrivileged = profile.role === 'admin' || profile.role === 'moderator' || profile.vip;

  async function saveProfile() {
    setSaving(true);
    setProfileMsg(null);
    try {
      const res = await fetch('/api/profile/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('yoko_token')}` },
        body: JSON.stringify({
          bio,
          avatarUrl,
          avatarType: isPrivileged && avatarUrl.toLowerCase().includes('.gif') ? 'gif' : 'image'
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Hata');
      setProfileMsg({ type: 'success', text: '✓ Profil güncellendi' });
      onUpdated?.(data);
    } catch (err) {
      setProfileMsg({ type: 'error', text: err.message || 'Bir hata oluştu' });
    } finally {
      setSaving(false);
    }
  }

  async function saveUsername() {
    if (!username.trim() || username === profile.username) return;
    setSavingUser(true);
    setUsernameMsg(null);
    try {
      const res = await fetch('/api/profile/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('yoko_token')}` },
        body: JSON.stringify({ username: username.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Hata');
      setUsernameMsg({ type: 'success', text: '✓ Kullanıcı adı değiştirildi' });
      onUpdated?.(data);
    } catch (err) {
      setUsernameMsg({ type: 'error', text: err.message || 'Bir hata oluştu' });
    } finally {
      setSavingUser(false);
    }
  }

  async function savePassword() {
    setPwMsg(null);
    if (!currentPw) return setPwMsg({ type: 'error', text: 'Mevcut şifreyi girin' });
    if (newPw.length < 6) return setPwMsg({ type: 'error', text: 'Yeni şifre en az 6 karakter olmalı' });
    if (newPw !== newPw2) return setPwMsg({ type: 'error', text: 'Yeni şifreler eşleşmiyor' });
    setSavingPw(true);
    try {
      const res = await fetch('/api/profile/me/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('yoko_token')}` },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Hata');
      setPwMsg({ type: 'success', text: '✓ Şifre başarıyla değiştirildi' });
      setCurrentPw(''); setNewPw(''); setNewPw2('');
    } catch (err) {
      setPwMsg({ type: 'error', text: err.message || 'Bir hata oluştu' });
    } finally {
      setSavingPw(false);
    }
  }

  const tabs = [
    { key: 'profile', label: '🖼️ Profil' },
    { key: 'account', label: '👤 Hesap' },
    { key: 'password', label: '🔑 Şifre' },
  ];

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(212,175,55,0.12)' }}>
      <div className="flex border-b" style={{ borderColor: 'rgba(212,175,55,0.1)' }}>
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className="flex-1 py-3 text-xs font-semibold transition-colors"
            style={{
              color: activeTab === tab.key ? '#d4af37' : '#6b7280',
              borderBottom: activeTab === tab.key ? '2px solid #d4af37' : '2px solid transparent',
              background: activeTab === tab.key ? 'rgba(212,175,55,0.05)' : 'transparent'
            }}>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="p-4 space-y-4">
        {activeTab === 'profile' && (
          <>
            <FieldRow label="Avatar URL">
              <div className="flex gap-2 items-center">
                <div className="flex-shrink-0">
                  <UserAvatar user={{ ...profile, avatarUrl }} size={40} />
                </div>
                <InputField value={avatarUrl} onChange={setAvatarUrl}
                  placeholder="https://i.imgur.com/..." type="url" />
              </div>
              {isPrivileged && (
                <p className="text-xs text-gray-600 mt-1">VIP/Mod/Admin: GIF avatar kullanabilirsiniz</p>
              )}
            </FieldRow>

            <FieldRow label="Biyografi">
              <textarea
                value={bio}
                onChange={e => setBio(e.target.value)}
                placeholder="Kendinizi tanıtın..."
                maxLength={300}
                rows={3}
                className="w-full px-4 py-2.5 rounded-xl text-white text-sm outline-none resize-none"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,175,55,0.2)' }}
              />
              <p className="text-xs text-gray-700 text-right">{bio.length}/300</p>
            </FieldRow>

            <StatusMsg msg={profileMsg?.text} type={profileMsg?.type} />

            <button onClick={saveProfile} disabled={saving}
              className="w-full py-3 rounded-xl font-bold text-sm disabled:opacity-50 transition-all"
              style={{ background: 'linear-gradient(135deg,rgba(212,175,55,0.25),rgba(212,175,55,0.1))', color: '#d4af37', border: '1px solid rgba(212,175,55,0.4)' }}>
              {saving ? 'Kaydediliyor...' : '💾 Profili Kaydet'}
            </button>
          </>
        )}

        {activeTab === 'account' && (
          <>
            <FieldRow label="Kullanıcı Adı">
              <InputField value={username} onChange={setUsername} placeholder="kullanici_adi" maxLength={30} />
              <p className="text-xs text-gray-600 mt-1">3-30 karakter, harf ve rakam</p>
            </FieldRow>

            <StatusMsg msg={usernameMsg?.text} type={usernameMsg?.type} />

            <button onClick={saveUsername} disabled={savingUser || username === profile.username || !username.trim()}
              className="w-full py-3 rounded-xl font-bold text-sm disabled:opacity-40 transition-all"
              style={{ background: 'linear-gradient(135deg,rgba(212,175,55,0.25),rgba(212,175,55,0.1))', color: '#d4af37', border: '1px solid rgba(212,175,55,0.4)' }}>
              {savingUser ? 'Kaydediliyor...' : '✓ Kullanıcı Adını Değiştir'}
            </button>
          </>
        )}

        {activeTab === 'password' && (
          <>
            <FieldRow label="Mevcut Şifre">
              <InputField value={currentPw} onChange={setCurrentPw} type="password" placeholder="••••••••" />
            </FieldRow>

            <FieldRow label="Yeni Şifre">
              <InputField value={newPw} onChange={setNewPw} type="password" placeholder="En az 6 karakter" />
            </FieldRow>

            <FieldRow label="Yeni Şifre (Tekrar)">
              <InputField value={newPw2} onChange={setNewPw2} type="password" placeholder="Yeni şifreyi tekrar girin" />
            </FieldRow>

            <StatusMsg msg={pwMsg?.text} type={pwMsg?.type} />

            <button onClick={savePassword} disabled={savingPw}
              className="w-full py-3 rounded-xl font-bold text-sm disabled:opacity-50 transition-all"
              style={{ background: 'linear-gradient(135deg,rgba(239,68,68,0.15),rgba(239,68,68,0.08))', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}>
              {savingPw ? 'Değiştiriliyor...' : '🔑 Şifreyi Değiştir'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { id } = useParams();
  const { user: me, updateUser } = useAuth();
  const { socket } = useOutletContext() || {};
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [friends, setFriends] = useState([]);
  const [dmOpen, setDmOpen] = useState(false);
  const [dmMsg, setDmMsg] = useState('');
  const [dmHistory, setDmHistory] = useState([]);

  const profileId = id ? Number(id) : me?.id;
  const isMe = profileId === me?.id;

  useEffect(() => {
    if (!profileId) { setLoading(false); return; }
    setLoading(true);
    fetch(`/api/profile/${profileId}`)
      .then(r => r.json())
      .then(data => { setProfile(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [profileId]);

  useEffect(() => {
    if (!me) return;
    fetch('/api/profile/friends/list', { headers: { Authorization: `Bearer ${localStorage.getItem('yoko_token')}` } })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setFriends(data); })
      .catch(() => {});
  }, [me]);

  useEffect(() => {
    if (!dmOpen || !profileId || isMe) return;
    fetch(`/api/profile/dm/${profileId}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('yoko_token')}` }
    })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setDmHistory(data); })
      .catch(() => {});
  }, [dmOpen, profileId, isMe]);

  useEffect(() => {
    if (!socket) return;
    const onSent = (msg) => { if (msg.toId === profileId || msg.fromId === profileId) setDmHistory(prev => [...prev, msg]); };
    const onNew = (msg) => { if (msg.fromId === profileId) setDmHistory(prev => [...prev, msg]); };
    socket.on('dm_sent', onSent);
    socket.on('new_dm', onNew);
    return () => { socket.off('dm_sent', onSent); socket.off('new_dm', onNew); };
  }, [socket, profileId]);

  function sendDM() {
    if (!socket || !dmMsg.trim()) return;
    socket.emit('send_dm', { toId: profileId, content: dmMsg.trim() });
    setDmMsg('');
  }

  function sendFriendRequest() {
    if (!socket) return;
    socket.emit('friend_request', { toId: profileId });
  }

  function handleProfileUpdated(data) {
    setProfile(data);
    if (isMe && updateUser) updateUser(data);
  }

  if (!profileId && !loading) {
    navigate('/login');
    return null;
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-gold-DEFAULT animate-pulse">Yükleniyor...</div>
    </div>
  );

  if (!profile) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-gray-400">Kullanıcı bulunamadı</div>
    </div>
  );

  const roleInfo = getRoleLabel(profile);
  const usernameClass = getUsernameClass(profile);
  const isFriend = friends.some(f => f.id === profileId);

  return (
    <div className="max-w-lg mx-auto px-4 py-6 pb-24">
      <BackButton />

      <div className="glass-card p-5 mb-4">
        <div className="flex items-start gap-4">
          <UserAvatar user={profile} size={72} />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`text-lg font-bold ${usernameClass}`}>{profile.username}</span>
              {roleInfo && (
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                  style={{ background: `${roleInfo.color}22`, color: roleInfo.color }}>
                  {roleInfo.icon} {roleInfo.label}
                </span>
              )}
            </div>
            <div className="mb-2"><BadgeList badges={profile.badges} size={16} /></div>
            <div className="max-w-xs mb-2"><XpBar xp={profile.xp} level={profile.level} showLabel /></div>
            {profile.bio && (
              <p className="text-sm text-gray-400 leading-relaxed">{profile.bio}</p>
            )}
          </div>

          {!isMe && me && (
            <div className="flex flex-col gap-2 flex-shrink-0">
              <button
                onClick={() => setDmOpen(!dmOpen)}
                className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-all"
                style={{ background: 'rgba(59,130,246,0.15)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.3)' }}>
                💬 DM
              </button>
              {!isFriend ? (
                <button
                  onClick={sendFriendRequest}
                  className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-all"
                  style={{ background: 'rgba(212,175,55,0.15)', color: '#d4af37', border: '1px solid rgba(212,175,55,0.3)' }}>
                  ➕ Arkadaş
                </button>
              ) : (
                <div className="text-xs text-green-400 text-center">✓ Arkadaş</div>
              )}
            </div>
          )}
        </div>
        <div className="text-xs text-gray-600 mt-3">
          Üyelik: {new Date(profile.createdAt).toLocaleDateString('tr-TR')}
        </div>
      </div>

      {dmOpen && !isMe && (
        <div className="glass-card mb-4">
          <div className="p-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
            <span className="font-semibold text-sm text-white">💬 {profile.username} ile Özel Mesaj</span>
          </div>
          <div className="p-4 space-y-2 max-h-56 overflow-y-auto">
            {dmHistory.length === 0 && (
              <div className="text-center text-xs text-gray-600 py-4">Henüz mesaj yok</div>
            )}
            {dmHistory.map(msg => (
              <div key={msg.id} className={`flex ${msg.fromId === me?.id ? 'justify-end' : 'justify-start'}`}>
                <div className="max-w-xs px-3 py-2 rounded-xl text-sm"
                  style={{
                    background: msg.fromId === me?.id ? 'rgba(212,175,55,0.2)' : 'rgba(255,255,255,0.06)',
                    color: '#e8e8f0'
                  }}>
                  {msg.content}
                </div>
              </div>
            ))}
          </div>
          <div className="p-3 border-t flex gap-2" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
            <input
              value={dmMsg}
              onChange={e => setDmMsg(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendDM()}
              placeholder="Mesajınız..."
              className="flex-1 bg-white/5 rounded-lg px-3 py-2 text-sm text-white border border-white/10 focus:outline-none"
            />
            <button onClick={sendDM} className="btn-gold text-xs px-4 py-2 rounded-lg">Gönder</button>
          </div>
        </div>
      )}

      {isMe && (
        <div className="mb-4">
          <h3 className="text-sm font-bold text-white mb-3 px-1">⚙️ Profil Ayarları</h3>
          <MyProfileSettings profile={profile} onUpdated={handleProfileUpdated} />
        </div>
      )}

      <div className="glass-card p-4">
        <h3 className="section-title mb-3 text-base">👥 Arkadaşlar</h3>
        {friends.length === 0 ? (
          <div className="text-xs text-gray-600 text-center py-4">Henüz arkadaş yok</div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {friends.map(f => (
              <div key={f.id} onClick={() => navigate(`/profile/${f.id}`)}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors">
                <UserAvatar user={f} size={32} />
                <div className="min-w-0">
                  <div className="text-sm text-white truncate">{f.username}</div>
                  <div className="text-xs text-gray-500">Lv.{f.level}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
