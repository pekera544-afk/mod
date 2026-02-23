import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useOutletContext } from 'react-router-dom';
import UserAvatar from '../components/UserAvatar';
import XpBar from '../components/XpBar';
import BadgeList, { getUsernameClass, getRoleLabel } from '../components/RoleBadge';
import UserProfileCard from '../components/UserProfileCard';

export default function ProfilePage() {
  const { id } = useParams();
  const { user: me } = useAuth();
  const { socket } = useOutletContext() || {};
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [friends, setFriends] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [dmOpen, setDmOpen] = useState(false);
  const [dmMsg, setDmMsg] = useState('');
  const [dmHistory, setDmHistory] = useState([]);

  const profileId = id ? Number(id) : me?.id;
  const isMe = profileId === me?.id;

  useEffect(() => {
    if (!profileId) return;
    setLoading(true);
    fetch(`/api/profile/${profileId}`)
      .then(r => r.json())
      .then(data => {
        setProfile(data);
        setBio(data.bio || '');
        setAvatarUrl(data.avatarUrl || '');
        setLoading(false);
      })
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
    fetch(`/api/profile/dm/${profileId}`, { headers: { Authorization: `Bearer ${localStorage.getItem('yoko_token')}` } })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setDmHistory(data); })
      .catch(() => {});
  }, [dmOpen, profileId, isMe]);

  useEffect(() => {
    if (!socket) return;
    socket.on('dm_sent', (msg) => {
      if (msg.toId === profileId || msg.fromId === profileId) {
        setDmHistory(prev => [...prev, msg]);
      }
    });
    socket.on('new_dm', (msg) => {
      if (msg.fromId === profileId) {
        setDmHistory(prev => [...prev, msg]);
      }
    });
    return () => { socket.off('dm_sent'); socket.off('new_dm'); };
  }, [socket, profileId]);

  function saveProfile() {
    setSaving(true);
    const isPrivileged = me?.role === 'admin' || me?.role === 'moderator' || me?.vip;
    fetch('/api/profile/me', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('yoko_token')}` },
      body: JSON.stringify({ bio, avatarUrl, avatarType: isPrivileged && avatarUrl.includes('.gif') ? 'gif' : 'image' })
    })
      .then(r => r.json())
      .then(data => { setProfile(data); setSaving(false); setEditMode(false); })
      .catch(() => setSaving(false));
  }

  function sendDM() {
    if (!socket || !dmMsg.trim()) return;
    socket.emit('send_dm', { toId: profileId, content: dmMsg.trim() });
    setDmMsg('');
  }

  function sendFriendRequest() {
    if (!socket) return;
    socket.emit('friend_request', { toId: profileId });
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-gold-DEFAULT">Yükleniyor...</div>
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
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="glass-card p-6 mb-4">
        <div className="flex items-start gap-5">
          <div className="relative">
            <UserAvatar user={profile} size={80} />
            {isMe && editMode && (
              <button
                onClick={() => {
                  const url = window.prompt('Avatar URL girin:', avatarUrl);
                  if (url !== null) setAvatarUrl(url);
                }}
                className="absolute -bottom-2 -right-2 w-7 h-7 rounded-full bg-gold-DEFAULT text-cinema-dark flex items-center justify-center text-xs font-bold"
              >
                ✏️
              </button>
            )}
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`text-xl font-bold ${usernameClass}`}>{profile.username}</span>
              {roleInfo && (
                <span className="text-sm px-2 py-0.5 rounded-full font-semibold" style={{ background: `${roleInfo.color}22`, color: roleInfo.color }}>
                  {roleInfo.icon} {roleInfo.label}
                </span>
              )}
            </div>
            <div className="mb-2"><BadgeList badges={profile.badges} size={18} /></div>
            <div className="mb-3 max-w-xs"><XpBar xp={profile.xp} level={profile.level} showLabel /></div>
            {profile.bio && !editMode && (
              <p className="text-sm text-gray-400 leading-relaxed mb-2">{profile.bio}</p>
            )}
            {isMe && editMode && (
              <textarea
                value={bio}
                onChange={e => setBio(e.target.value)}
                placeholder="Kendinizi tanıtın..."
                maxLength={300}
                rows={2}
                className="w-full bg-white/5 rounded-lg px-3 py-2 text-sm text-white border border-white/10 focus:outline-none focus:border-yellow-500/50 resize-none mb-2"
              />
            )}
            <div className="text-xs text-gray-600">Üyelik: {new Date(profile.createdAt).toLocaleDateString('tr-TR')}</div>
          </div>

          <div className="flex flex-col gap-2 flex-shrink-0">
            {isMe && (
              <button
                onClick={() => editMode ? saveProfile() : setEditMode(true)}
                disabled={saving}
                className="btn-gold text-xs px-3 py-1.5 rounded-lg"
              >
                {saving ? '...' : editMode ? '💾 Kaydet' : '✏️ Düzenle'}
              </button>
            )}
            {isMe && editMode && (
              <button onClick={() => setEditMode(false)} className="text-xs text-gray-500 hover:text-white transition-colors">İptal</button>
            )}
            {!isMe && me && (
              <>
                <button
                  onClick={() => setDmOpen(!dmOpen)}
                  className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-all"
                  style={{ background: 'rgba(59,130,246,0.15)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.3)' }}
                >
                  💬 DM
                </button>
                {!isFriend && (
                  <button
                    onClick={sendFriendRequest}
                    className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-all"
                    style={{ background: 'rgba(212,175,55,0.15)', color: '#d4af37', border: '1px solid rgba(212,175,55,0.3)' }}
                  >
                    ➕ Arkadaş Ekle
                  </button>
                )}
                {isFriend && <div className="text-xs text-green-400 text-center">✓ Arkadaşsınız</div>}
              </>
            )}
          </div>
        </div>
      </div>

      {dmOpen && !isMe && (
        <div className="glass-card mb-4">
          <div className="p-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
            <span className="font-semibold text-sm text-white">💬 {profile.username} ile Özel Mesaj</span>
          </div>
          <div className="p-4 space-y-3 max-h-64 overflow-y-auto">
            {dmHistory.length === 0 && (
              <div className="text-center text-xs text-gray-600 py-4">Henüz mesaj yok</div>
            )}
            {dmHistory.map(msg => (
              <div key={msg.id} className={`flex ${msg.fromId === me?.id ? 'justify-end' : 'justify-start'}`}>
                <div
                  className="max-w-xs px-3 py-2 rounded-xl text-sm"
                  style={{
                    background: msg.fromId === me?.id ? 'rgba(212,175,55,0.2)' : 'rgba(255,255,255,0.06)',
                    color: '#e8e8f0'
                  }}
                >
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

      <div className="glass-card p-4">
        <h3 className="section-title mb-3 text-base">👥 Arkadaşlar</h3>
        {friends.length === 0 ? (
          <div className="text-xs text-gray-600 text-center py-4">Henüz arkadaş yok</div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {friends.map(f => (
              <div
                key={f.id}
                onClick={() => navigate(`/profile/${f.id}`)}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors"
              >
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
