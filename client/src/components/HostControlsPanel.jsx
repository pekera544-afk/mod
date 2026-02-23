import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function ToggleBtn({ value, onChange }) {
  return (
    <button type="button" onClick={() => onChange(!value)}
      className={`w-9 h-5 rounded-full relative transition-colors flex-shrink-0 ${value ? 'bg-gold-DEFAULT' : 'bg-gray-700'}`}>
      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-4' : 'translate-x-0.5'}`} />
    </button>
  );
}

function ParticipantRow({ participant, isOwner, roomId, socket, onAction }) {
  const [loading, setLoading] = useState('');

  const action = async (type) => {
    setLoading(type);
    try {
      if (type === 'kick') {
        socket?.emit('kick_user', { roomId, targetUserId: participant.id });
      } else if (type === 'ban') {
        const reason = prompt(`"${participant.username}" için ban sebebi (boş bırakabilirsin):`);
        if (reason === null) { setLoading(''); return; }
        socket?.emit('ban_user', { roomId, targetUserId: participant.id, reason });
      } else if (type === 'mod') {
        socket?.emit('assign_moderator', { roomId, targetUserId: participant.id });
      } else if (type === 'unmod') {
        socket?.emit('remove_moderator', { roomId, targetUserId: participant.id });
      }
      onAction?.();
    } finally {
      setTimeout(() => setLoading(''), 800);
    }
  };

  const roleColor = { admin: '#d4af37', vip: '#a855f7', user: '#6b7280', guest: '#4b5563' };
  const color = roleColor[participant.role] || '#6b7280';

  return (
    <div className="flex items-center gap-2 py-1.5 border-b border-white/5">
      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-cinema-dark flex-shrink-0"
        style={{ background: `linear-gradient(135deg, ${color}, ${color}88)` }}>
        {(participant.username || 'U')[0].toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-white flex items-center gap-1 truncate">
          {participant.username}
          {participant.isOwner && <span className="text-gold-DEFAULT text-xs">👑</span>}
          {participant.isModerator && !participant.isOwner && <span className="text-blue-400 text-xs">🛡️</span>}
          {participant.vip && <span className="text-purple-400 text-xs">💎</span>}
        </div>
      </div>
      {!participant.isOwner && isOwner && (
        <div className="flex items-center gap-1 flex-shrink-0">
          {participant.isModerator ? (
            <button onClick={() => action('unmod')} disabled={loading === 'unmod'}
              className="text-xs px-1.5 py-0.5 rounded transition-colors"
              style={{ background: 'rgba(59,130,246,0.2)', color: '#93c5fd', border: '1px solid rgba(59,130,246,0.3)', fontSize: '10px' }}
              title="Yöneticilikten al">
              🛡️✕
            </button>
          ) : (
            <button onClick={() => action('mod')} disabled={loading === 'mod'}
              className="text-xs px-1.5 py-0.5 rounded transition-colors"
              style={{ background: 'rgba(59,130,246,0.1)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.2)', fontSize: '10px' }}
              title="Yönetici yap">
              🛡️+
            </button>
          )}
          <button onClick={() => action('kick')} disabled={loading === 'kick'}
            className="text-xs px-1.5 py-0.5 rounded transition-colors"
            style={{ background: 'rgba(234,179,8,0.1)', color: '#fbbf24', border: '1px solid rgba(234,179,8,0.2)', fontSize: '10px' }}
            title="Odadan at">
            👢
          </button>
          <button onClick={() => action('ban')} disabled={loading === 'ban'}
            className="text-xs px-1.5 py-0.5 rounded transition-colors"
            style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)', fontSize: '10px' }}
            title="Yasakla">
            🚫
          </button>
        </div>
      )}
    </div>
  );
}

function BanList({ roomId, socket }) {
  const [bans, setBans] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadBans = () => {
    setLoading(true);
    axios.get(`/api/rooms/${roomId}/bans`).then(r => setBans(r.data)).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { loadBans(); }, [roomId]);

  const unban = (userId) => {
    socket?.emit('unban_user', { roomId, targetUserId: userId });
    setBans(prev => prev.filter(b => b.userId !== userId));
  };

  if (loading) return <div className="text-xs text-gray-500 py-2 text-center">Yükleniyor...</div>;
  if (bans.length === 0) return <div className="text-xs text-gray-600 py-2 text-center">Yasaklı kullanıcı yok</div>;

  return (
    <div className="space-y-1">
      {bans.map(ban => (
        <div key={ban.id} className="flex items-center gap-2 py-1">
          <div className="flex-1 text-xs text-gray-300">
            {ban.user.username}
            {ban.reason && <span className="text-gray-500 ml-1">— {ban.reason}</span>}
          </div>
          <button onClick={() => unban(ban.userId)}
            className="text-xs px-2 py-0.5 rounded"
            style={{ background: 'rgba(34,197,94,0.1)', color: '#86efac', border: '1px solid rgba(34,197,94,0.2)', fontSize: '10px' }}>
            Yasağı Kaldır
          </button>
        </div>
      ))}
    </div>
  );
}

export default function HostControlsPanel({ room, socket, roomState, onSettingsChange, participants, isOwner }) {
  const navigate = useNavigate();
  const [newMovieTitle, setNewMovieTitle] = useState(room.movieTitle || '');
  const [editingTitle, setEditingTitle] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('settings');

  const toggleSetting = (key, val) => {
    socket?.emit('room_settings_changed', { roomId: room.id, [key]: val });
    onSettingsChange?.({ [key]: val });
  };

  const updateMovieTitle = async () => {
    if (!newMovieTitle.trim()) return;
    setSaving(true);
    try {
      await axios.put(`/api/rooms/${room.id}`, { movieTitle: newMovieTitle });
      socket?.emit('room_settings_changed', { roomId: room.id, movieTitle: newMovieTitle });
      setEditingTitle(false);
    } catch {}
    setSaving(false);
  };

  const deleteRoom = async () => {
    try {
      socket?.emit('room_deleted', { roomId: room.id });
      await axios.delete(`/api/rooms/${room.id}`);
      navigate('/');
    } catch {}
  };

  const tabs = [
    { key: 'settings', label: '⚙️ Ayarlar' },
    { key: 'users', label: `👥 Kullanıcılar (${participants?.length || 0})` },
    ...(isOwner ? [{ key: 'bans', label: '🚫 Yasaklar' }] : [])
  ];

  return (
    <div className="space-y-3">
      <div className="flex gap-1 border-b border-white/5 pb-2">
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className="text-xs px-2 py-1 rounded-lg transition-colors"
            style={{
              background: activeTab === tab.key ? 'rgba(212,175,55,0.2)' : 'transparent',
              color: activeTab === tab.key ? '#d4af37' : '#6b7280',
              border: activeTab === tab.key ? '1px solid rgba(212,175,55,0.3)' : '1px solid transparent'
            }}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'settings' && (
        <div className="space-y-3 p-3 rounded-xl"
          style={{ background: 'rgba(212,175,55,0.04)', border: '1px solid rgba(212,175,55,0.15)' }}>

          <div className="space-y-2">
            <div className="text-xs text-gray-400 font-semibold">Film / Dizi Adı</div>
            {editingTitle ? (
              <div className="flex gap-1.5">
                <input value={newMovieTitle} onChange={e => setNewMovieTitle(e.target.value)}
                  className="flex-1 px-2 py-1.5 rounded-lg text-white text-xs outline-none"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,175,55,0.3)' }}
                  onKeyDown={e => e.key === 'Enter' && updateMovieTitle()} />
                <button onClick={updateMovieTitle} disabled={saving} className="btn-gold px-2.5 py-1.5 text-xs">✓</button>
                <button onClick={() => setEditingTitle(false)} className="text-gray-400 px-2 text-xs">✕</button>
              </div>
            ) : (
              <button onClick={() => setEditingTitle(true)}
                className="w-full text-left px-3 py-2 rounded-lg text-xs text-gray-200 flex items-center justify-between hover:bg-white/5 transition-colors"
                style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
                <span>{room.movieTitle || 'Film adı yok'}</span>
                <span className="text-gray-500 text-xs">✎</span>
              </button>
            )}
          </div>

          <div className="space-y-2 border-t border-white/5 pt-2">
            <div className="text-xs text-gray-400 font-semibold">Canlı Ayarlar</div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-300">💬 Sohbet</span>
              <ToggleBtn value={roomState?.chatEnabled !== false} onChange={v => toggleSetting('chatEnabled', v)} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-300">🛡️ Anti-Spam</span>
              <ToggleBtn value={roomState?.spamProtectionEnabled !== false} onChange={v => toggleSetting('spamProtectionEnabled', v)} />
            </div>
            {roomState?.spamProtectionEnabled !== false && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 flex-1">Bekleme (saniye):</span>
                <input
                  type="number" min={1} max={30}
                  defaultValue={roomState?.spamCooldownSeconds || 3}
                  onBlur={e => toggleSetting('spamCooldownSeconds', Number(e.target.value))}
                  onKeyDown={e => e.key === 'Enter' && toggleSetting('spamCooldownSeconds', Number(e.target.value))}
                  className="w-14 px-2 py-1 rounded-lg text-white text-xs outline-none text-center"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,175,55,0.2)' }}
                />
              </div>
            )}
          </div>

          {isOwner && (
            <div className="border-t border-white/5 pt-2">
              {!confirmDelete ? (
                <button onClick={() => setConfirmDelete(true)}
                  className="w-full py-2 rounded-lg text-xs font-semibold text-red-400 border border-red-400/20 bg-red-400/5 hover:bg-red-400/10 transition-colors">
                  🗑️ Odayı Kapat
                </button>
              ) : (
                <div className="space-y-1.5">
                  <p className="text-xs text-red-300 text-center">Odayı kapatmak istediğinizden emin misiniz?</p>
                  <div className="flex gap-1.5">
                    <button onClick={deleteRoom}
                      className="flex-1 py-2 rounded-lg text-xs font-bold text-red-400 bg-red-400/10 border border-red-400/30">
                      Evet, Kapat
                    </button>
                    <button onClick={() => setConfirmDelete(false)}
                      className="flex-1 py-2 rounded-lg text-xs text-gray-400 bg-white/5 border border-white/10">
                      İptal
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'users' && (
        <div className="space-y-1">
          <div className="text-xs text-gray-500 mb-2">
            {isOwner ? '👑 Yönetici ata, kullanıcı at veya yasakla' : '🛡️ Kullanıcı at veya yasakla'}
          </div>
          {(participants || []).filter(p => p.id).map((p, i) => (
            <ParticipantRow
              key={p.socketId || i}
              participant={p}
              isOwner={isOwner}
              roomId={room.id}
              socket={socket}
              onAction={() => {}}
            />
          ))}
        </div>
      )}

      {activeTab === 'bans' && isOwner && (
        <div>
          <div className="text-xs text-gray-500 mb-2">Yasaklı kullanıcıları kaldırabilirsin</div>
          <BanList roomId={room.id} socket={socket} />
        </div>
      )}
    </div>
  );
}
