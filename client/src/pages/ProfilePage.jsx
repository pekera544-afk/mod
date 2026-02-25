import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useOutletContext } from 'react-router-dom';
import UserAvatar, { FRAME_LIST } from '../components/UserAvatar';
import CpProfilePair from '../components/CpProfilePair';
import XpBar from '../components/XpBar';
import BadgeList, { getUsernameClass, getRoleLabel } from '../components/RoleBadge';
import { BUBBLE_PRESETS, MOD_BUBBLE_COUNT, ADMIN_BUBBLE_COUNT } from '../config/bubblePresets';

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
  const [avatarMode, setAvatarMode] = useState('url');
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState(null);
  const [saving, setSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState(null);
  const fileInputRef = useRef(null);

  const [username, setUsername] = useState(profile.username || '');
  const [usernameMsg, setUsernameMsg] = useState(null);
  const [savingUser, setSavingUser] = useState(false);

  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [newPw2, setNewPw2] = useState('');
  const [pwMsg, setPwMsg] = useState(null);
  const [savingPw, setSavingPw] = useState(false);

  const [selectedFrame, setSelectedFrame] = useState(profile.frameType || '');
  const [frameMsg, setFrameMsg] = useState(null);
  const [savingFrame, setSavingFrame] = useState(false);
  const [selectedBubble, setSelectedBubble] = useState(profile.chatBubble || '');
  const [bubbleMsg, setBubbleMsg] = useState(null);
  const [savingBubble, setSavingBubble] = useState(false);

  const isPrivileged = profile.role === 'admin' || profile.role === 'moderator' || profile.vip;
  const isAdminOrMod = profile.role === 'admin' || profile.role === 'moderator';
  const hasGrantedFrame = !!(profile.frameType);
  const availableFrames = isPrivileged
    ? FRAME_LIST
    : hasGrantedFrame
      ? FRAME_LIST.filter(f => f.value === '' || f.value === profile.frameType)
      : FRAME_LIST.filter(f => f.value === '');

  async function saveFrame() {
    setSavingFrame(true);
    setFrameMsg(null);
    try {
      const res = await fetch('/api/profile/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('yoko_token')}` },
        body: JSON.stringify({ frameType: selectedFrame })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Hata');
      setFrameMsg({ type: 'success', text: selectedFrame ? `✓ ${FRAME_LIST.find(f=>f.value===selectedFrame)?.label} çerçevesi takıldı` : '✓ Çerçeve çıkarıldı' });
      onUpdated?.(data);
    } catch (err) {
      setFrameMsg({ type: 'error', text: err.message || 'Bir hata oluştu' });
    } finally {
      setSavingFrame(false);
    }
  }

  async function saveBubble() {
    setSavingBubble(true);
    setBubbleMsg(null);
    try {
      const res = await fetch('/api/profile/me/set-bubble', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('yoko_token')}` },
        body: JSON.stringify({ chatBubble: selectedBubble })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Hata');
      setBubbleMsg({ type: 'success', text: selectedBubble ? '✓ Balon rengi kaydedildi' : '✓ Balon kapatıldı' });
    } catch (err) {
      setBubbleMsg({ type: 'error', text: err.message || 'Bir hata oluştu' });
    } finally {
      setSavingBubble(false);
    }
  }

  async function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const isGif = file.type === 'image/gif';
    if (isGif && !isPrivileged) {
      setUploadMsg({ type: 'error', text: 'GIF yüklemek için VIP, Moderatör veya Admin olmanız gerekiyor' });
      return;
    }
    setUploading(true);
    setUploadMsg(null);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const res = await fetch('/api/upload/avatar', {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('yoko_token')}` },
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Yükleme başarısız');
      setAvatarUrl(data.avatarUrl);
      setUploadMsg({ type: 'success', text: '✓ Fotoğraf yüklendi' });
      onUpdated?.(data.user);
    } catch (err) {
      setUploadMsg({ type: 'error', text: err.message || 'Yükleme hatası' });
    } finally {
      setUploading(false);
    }
  }

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
          avatarType: isPrivileged && (avatarUrl.toLowerCase().endsWith('.gif') || avatarUrl.toLowerCase().includes('.gif?')) ? 'gif' : 'image'
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
    { key: 'frame', label: '✨ Çerçeve' },
    ...(isAdminOrMod ? [{ key: 'bubble', label: '💬 Balon' }] : []),
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
            <FieldRow label="Profil Fotoğrafı">
              <div className="flex items-center gap-3 mb-3">
                <UserAvatar user={{ ...profile, avatarUrl, avatarType: profile.avatarType }} size={52} />
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-gray-400 font-semibold">{profile.username}</span>
                  {isPrivileged && <span className="text-xs text-purple-400">💎 GIF yükleyebilirsiniz</span>}
                </div>
              </div>

              <div className="flex gap-1 mb-3">
                {[{ k: 'upload', l: '📷 Cihaz / Kamera' }, { k: 'url', l: '🔗 URL ile' }].map(({ k, l }) => (
                  <button key={k} type="button" onClick={() => { setAvatarMode(k); setUploadMsg(null); }}
                    className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all"
                    style={{
                      background: avatarMode === k ? 'rgba(212,175,55,0.2)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${avatarMode === k ? 'rgba(212,175,55,0.5)' : 'rgba(255,255,255,0.08)'}`,
                      color: avatarMode === k ? '#d4af37' : '#6b7280'
                    }}>
                    {l}
                  </button>
                ))}
              </div>

              {avatarMode === 'upload' ? (
                <div className="space-y-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={isPrivileged ? 'image/jpeg,image/png,image/webp,image/gif' : 'image/jpeg,image/png,image/webp'}
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                    style={{ background: 'rgba(212,175,55,0.1)', border: '1px dashed rgba(212,175,55,0.4)', color: '#d4af37' }}
                  >
                    {uploading ? (
                      <><span className="animate-spin">⏳</span> Yükleniyor...</>
                    ) : (
                      <><span className="text-lg">📷</span> Galeri / Kamera</>
                    )}
                  </button>
                  <p className="text-xs text-gray-600 text-center">
                    {isPrivileged ? 'JPEG, PNG, WebP, GIF • max 8MB' : 'JPEG, PNG, WebP • max 8MB'}
                  </p>
                  <StatusMsg msg={uploadMsg?.text} type={uploadMsg?.type} />
                </div>
              ) : (
                <div className="flex gap-2 items-center">
                  <InputField value={avatarUrl} onChange={setAvatarUrl}
                    placeholder="https://i.imgur.com/..." type="url" />
                </div>
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

        {activeTab === 'frame' && (
          <>
            <div className="flex items-center gap-4 mb-4 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(212,175,55,0.1)' }}>
              <UserAvatar user={{ ...profile, frameType: selectedFrame }} size={60} />
              <div>
                <div className="text-sm font-semibold text-white">{profile.username}</div>
                <div className="text-xs mt-0.5" style={{ color: '#d4af37' }}>
                  {selectedFrame ? (FRAME_LIST.find(f => f.value === selectedFrame)?.label || selectedFrame) : 'Çerçeve yok'}
                </div>
                <div className="text-xs text-gray-600 mt-0.5">Önizleme</div>
              </div>
            </div>

            {availableFrames.length <= 1 && !isPrivileged && !hasGrantedFrame && (
              <div className="text-center py-6 text-xs text-gray-500">
                <div className="text-2xl mb-2">🔒</div>
                Çerçeve kullanmak için VIP olmanız veya<br />bir çerçevenin admin tarafından verilmesi gerekiyor
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              {availableFrames.map(frame => (
                <button
                  key={frame.value}
                  onClick={() => setSelectedFrame(frame.value)}
                  className="flex items-center gap-3 p-3 rounded-xl transition-all text-left"
                  style={{
                    background: selectedFrame === frame.value ? `${frame.color}18` : 'rgba(255,255,255,0.03)',
                    border: `1.5px solid ${selectedFrame === frame.value ? frame.color : 'rgba(255,255,255,0.07)'}`,
                  }}
                >
                  <div style={{ position: 'relative', width: 38, height: 38, flexShrink: 0 }}>
                    <UserAvatar
                      user={{ ...profile, frameType: frame.value }}
                      size={32}
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold truncate" style={{ color: selectedFrame === frame.value ? frame.color : '#d1d5db' }}>
                      {frame.label}
                    </div>
                    {selectedFrame === frame.value && (
                      <div className="text-xs mt-0.5" style={{ color: frame.color, opacity: 0.8 }}>● Seçili</div>
                    )}
                  </div>
                </button>
              ))}
            </div>

            <StatusMsg msg={frameMsg?.text} type={frameMsg?.type} />

            <button
              onClick={saveFrame}
              disabled={savingFrame || selectedFrame === (profile.frameType || '')}
              className="w-full py-3 rounded-xl font-bold text-sm disabled:opacity-40 transition-all mt-2"
              style={{ background: 'linear-gradient(135deg,rgba(212,175,55,0.25),rgba(212,175,55,0.1))', color: '#d4af37', border: '1px solid rgba(212,175,55,0.4)' }}
            >
              {savingFrame ? 'Kaydediliyor...' : selectedFrame ? '✨ Çerçeveyi Tak' : '○ Çerçeveyi Çıkar'}
            </button>
          </>
        )}

        {activeTab === 'bubble' && isAdminOrMod && (
          <>
            <div className="flex items-center gap-3 p-3 rounded-xl mb-4" style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}>
              <div>
                <div className="text-sm font-bold text-blue-300">💬 Sohbet Balonu Rengi</div>
                <div className="text-xs text-gray-400 mt-0.5">
                  {profile.role === 'admin' ? 'Admin: 10 renk seçeneği' : 'Moderatör: 5 renk seçeneği'}
                </div>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              {BUBBLE_PRESETS.slice(0, profile.role === 'admin' ? ADMIN_BUBBLE_COUNT : MOD_BUBBLE_COUNT).map(p => {
                const isSelected = selectedBubble === p.id;
                return (
                  <button key={p.id} onClick={() => setSelectedBubble(p.id)}
                    className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-left transition-all"
                    style={{
                      background: isSelected ? `${p.border}12` : 'rgba(255,255,255,0.03)',
                      border: isSelected ? `1.5px solid ${p.border}` : '1px solid rgba(255,255,255,0.06)',
                    }}>
                    <div className="w-16 h-7 rounded-xl flex items-center justify-center text-xs"
                      style={{ background: p.bg, border: `1px solid ${p.border}40`, color: p.text, boxShadow: isSelected ? `0 0 6px ${p.border}40` : 'none' }}>
                      Merhaba
                    </div>
                    <span className="flex-1 text-sm" style={{ color: isSelected ? p.border : '#d1d5db' }}>{p.name}</span>
                    {isSelected && <span className="text-xs" style={{ color: p.border }}>✓ Seçili</span>}
                  </button>
                );
              })}
            </div>

            <StatusMsg msg={bubbleMsg?.text} type={bubbleMsg?.type} />

            <button
              onClick={saveBubble}
              disabled={savingBubble || selectedBubble === (profile.chatBubble || '')}
              className="w-full py-3 rounded-xl font-bold text-sm disabled:opacity-40 transition-all"
              style={{ background: 'linear-gradient(135deg,rgba(59,130,246,0.25),rgba(59,130,246,0.1))', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.4)' }}
            >
              {savingBubble ? 'Kaydediliyor...' : selectedBubble ? '💬 Balon Rengini Kaydet' : '○ Balonu Kapat'}
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
    <div className="max-w-4xl mx-auto px-4 py-6 pb-24">
      <BackButton />

      <div className="lg:grid lg:grid-cols-[1fr_380px] lg:gap-6 lg:items-start">
      <div>

      <div className="glass-card p-5 mb-4">
        <div className="flex items-start gap-4">
          <UserAvatar user={profile} size={80} />

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

            {/* CP / Relationship Display */}
            <CpProfilePair userId={profile.id} isMe={isMe} profileUser={profile} />
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
        <div className="mb-4 lg:hidden">
          <h3 className="text-sm font-bold text-white mb-3 px-1">⚙️ Profil Ayarları</h3>
          <MyProfileSettings profile={profile} onUpdated={handleProfileUpdated} />
        </div>
      )}

      <div className="glass-card p-4">
        <h3 className="section-title mb-3 text-base">👥 Arkadaşlar</h3>
        {friends.length === 0 ? (
          <div className="text-xs text-gray-600 text-center py-4">Henüz arkadaş yok</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-2">
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

      </div>{/* end left column */}

      {/* Right column: settings (desktop only) */}
      {isMe && (
        <div className="hidden lg:block mt-0">
          <h3 className="text-sm font-bold text-white mb-3 px-1">⚙️ Profil Ayarları</h3>
          <MyProfileSettings profile={profile} onUpdated={handleProfileUpdated} />
        </div>
      )}

      </div>{/* end grid */}
    </div>
  );
}
