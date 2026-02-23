import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import VideoPlayer from '../components/VideoPlayer';
import HostControlsPanel from '../components/HostControlsPanel';
import PasswordPrompt from '../components/PasswordPrompt';
import UserAvatar from '../components/UserAvatar';
import UserProfileCard from '../components/UserProfileCard';
import BadgeList, { getUsernameClass, getRoleLabel } from '../components/RoleBadge';

const REACTIONS = ['❤️', '🔥', '😂', '👏', '😮', '💎', '🎬', '⭐'];

function ChatMessage({ msg, onDelete, canModerate, onUserClick }) {
  const usernameClass = getUsernameClass(msg.user);
  const roleInfo = getRoleLabel(msg.user);
  return (
    <div className="flex gap-2 group py-1 px-1 rounded-lg hover:bg-white/3 fade-in-up">
      <div className="flex-shrink-0 mt-0.5">
        <UserAvatar user={msg.user} size={24} onClick={() => onUserClick && onUserClick(msg.user?.id)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1 flex-wrap">
          {roleInfo && <span style={{ fontSize: 10, color: roleInfo.color }}>{roleInfo.icon}</span>}
          <span className={`text-xs font-semibold cursor-pointer ${usernameClass}`} onClick={() => onUserClick && onUserClick(msg.user?.id)}>
            {msg.user?.username}
          </span>
          <BadgeList badges={msg.user?.badges} size={10} />
          {canModerate && (
            <button onClick={() => onDelete(msg.id)}
              className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 ml-auto transition-opacity flex-shrink-0"
              style={{ fontSize: 10 }}>✕</button>
          )}
        </div>
        <span className="text-xs text-gray-300 break-words leading-relaxed">{msg.content}</span>
      </div>
    </div>
  );
}

export default function RoomPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const [room, setRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const [activeTab, setActiveTab] = useState('chat');
  const [reactions, setReactions] = useState([]);
  const [roomState, setRoomState] = useState({
    isPlaying: false, currentTimeSeconds: 0, hostConnected: false,
    chatEnabled: true, spamProtectionEnabled: true, spamCooldownSeconds: 3
  });
  const [isHost, setIsHost] = useState(false);
  const [isModerator, setIsModerator] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [needPassword, setNeedPassword] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [spamCooldown, setSpamCooldown] = useState(0);
  const [hostDisconnected, setHostDisconnected] = useState(false);
  const [notification, setNotification] = useState('');
  const [profileCardId, setProfileCardId] = useState(null);

  const socketRef = useRef(null);
  const chatEndRef = useRef(null);
  const spamTimerRef = useRef(null);
  const roomStateRef = useRef(roomState);

  const showNotif = (msg, duration = 3000) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), duration);
  };

  useEffect(() => {
    const fetchRoom = async () => {
      try {
        const res = await axios.get(`/api/rooms/${id}`);
        setRoom(res.data);
        if (user && res.data.ownerId === user.id) setIsOwner(true);
        if (res.data.isLocked) setNeedPassword(true);
        else setUnlocked(true);
      } catch { navigate('/'); }
    };
    fetchRoom();
  }, [id, navigate, user]);

  useEffect(() => {
    if (!unlocked) return;
    axios.get(`/api/rooms/${id}/messages`).then(r => setMessages(r.data)).catch(() => {});
  }, [id, unlocked]);

  useEffect(() => {
    if (!unlocked || !room) return;

    const socket = io({ auth: { token } });
    socketRef.current = socket;
    socket.emit('join_room', id);

    if (user && room.ownerId === user.id) {
      socket.emit('claim_host', id);
    }

    socket.on('host_granted', () => {
      setIsHost(true);
      setIsOwner(true);
      setHostDisconnected(false);
    });

    socket.on('moderator_granted', () => {
      setIsModerator(true);
      showNotif('🛡️ Oda yöneticisi oldunuz');
    });

    socket.on('moderator_removed', () => {
      setIsModerator(false);
      showNotif('🛡️ Yöneticilik yetkisi alındı');
    });

    socket.on('room_state', (state) => {
      setRoomState(prev => ({ ...prev, ...state }));
      if (!state.hostConnected && !isOwner) setHostDisconnected(true);
      else if (state.hostConnected) setHostDisconnected(false);
      if (state.isModerator) setIsModerator(true);
    });

    socket.on('host_changed', ({ hostConnected, currentTimeSeconds }) => {
      if (!hostConnected) {
        setHostDisconnected(true);
        setRoomState(prev => ({
          ...prev,
          hostConnected: false,
          ...(currentTimeSeconds !== undefined ? { currentTimeSeconds } : {}),
        }));
      } else {
        setHostDisconnected(false);
        setRoomState(prev => ({ ...prev, hostConnected: true }));
      }
    });

    socket.on('room_settings_changed', (settings) => {
      setRoomState(prev => ({ ...prev, ...settings }));
      if (settings.movieTitle !== undefined) {
        setRoom(prev => prev ? { ...prev, movieTitle: settings.movieTitle } : prev);
      }
    });

    socket.on('url_changed', ({ streamUrl, providerType }) => {
      setRoom(prev => prev ? { ...prev, streamUrl, providerType: providerType || prev.providerType } : prev);
    });

    socket.on('new_message', (msg) => setMessages(prev => [...prev, msg]));
    socket.on('participants', (list) => setParticipants(list));
    socket.on('message_deleted', ({ messageId }) =>
      setMessages(prev => prev.filter(m => m.id !== messageId)));

    socket.on('new_reaction', (data) => {
      const rid = Date.now() + Math.random();
      setReactions(prev => [...prev, { ...data, rid }]);
      setTimeout(() => setReactions(prev => prev.filter(r => r.rid !== rid)), 3000);
    });

    socket.on('spam_blocked', ({ remaining }) => {
      setSpamCooldown(remaining);
      if (spamTimerRef.current) clearInterval(spamTimerRef.current);
      spamTimerRef.current = setInterval(() => {
        setSpamCooldown(prev => {
          if (prev <= 1) { clearInterval(spamTimerRef.current); return 0; }
          return prev - 1;
        });
      }, 1000);
    });

    socket.on('you_are_kicked', () => {
      alert('Oda sahibi tarafından odadan atıldınız.');
      navigate('/');
    });

    socket.on('you_are_banned', ({ reason }) => {
      alert(`Bu odadan yasaklandınız.${reason ? ` Sebep: ${reason}` : ''}`);
      navigate('/');
    });

    socket.on('user_kicked', ({ userId }) => {
      if (user && userId !== user.id) showNotif('Bir kullanıcı odadan atıldı');
    });

    socket.on('user_banned', ({ userId }) => {
      if (user && userId !== user.id) showNotif('Bir kullanıcı yasaklandı');
    });

    socket.on('moderator_assigned', ({ userId }) => {
      if (user && userId !== user.id) showNotif('Bir kullanıcıya yönetici yetkisi verildi');
    });

    socket.on('host_seek', ({ currentTimeSeconds }) => {
      setRoomState(prev => ({ ...prev, currentTimeSeconds, _seekedAt: Date.now() }));
    });

    socket.on('room_deleted', () => {
      alert('Bu oda kapatıldı.');
      navigate('/');
    });

    socket.emit('player_sync_request', { roomId: id });

    return () => {
      socket.emit('leave_room', id);
      socket.disconnect();
    };
  }, [id, token, user, unlocked, room?.ownerId]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  useEffect(() => { roomStateRef.current = roomState; }, [roomState]);

  useEffect(() => {
    if (!isHost || !socketRef.current) return;
    const socket = socketRef.current;
    const handler = ({ requesterId, roomId: reqId }) => {
      const s = roomStateRef.current;
      socket.emit('player_sync_response', {
        requesterId,
        roomId: id,
        currentTimeSeconds: s.currentTimeSeconds || 0,
        isPlaying: s.isPlaying || false,
      });
    };
    socket.on('player_sync_request', handler);
    return () => socket.off('player_sync_request', handler);
  }, [isHost, id]);

  const handleStateChange = useCallback((update) => {
    if (!isHost && !isModerator) return;
    setRoomState(prev => ({ ...prev, ...update }));
    socketRef.current?.emit('room_state_update', { roomId: id, ...update });
  }, [isHost, isModerator, id]);

  const handleSeek = useCallback((t) => {
    if (!isHost && !isModerator) return;
    setRoomState(prev => ({ ...prev, currentTimeSeconds: t }));
    socketRef.current?.emit('host_seek', { roomId: id, currentTimeSeconds: t });
  }, [isHost, isModerator, id]);

  const handleUrlChange = useCallback((streamUrl) => {
    if (!isHost && !isModerator) return;
    const providerType = streamUrl.includes('youtube.com') || streamUrl.includes('youtu.be') ? 'youtube' : 'external';
    socketRef.current?.emit('url_changed', { roomId: id, streamUrl, providerType });
    setRoom(prev => prev ? { ...prev, streamUrl, providerType } : prev);
  }, [isHost, isModerator, id]);

  const handleSettingsChange = useCallback((settings) => {
    setRoomState(prev => ({ ...prev, ...settings }));
  }, []);

  const sendMessage = (e) => {
    e.preventDefault();
    if (!newMsg.trim() || !user || spamCooldown > 0 || !roomState.chatEnabled) return;
    socketRef.current?.emit('send_message', { roomId: id, content: newMsg });
    setNewMsg('');
  };

  const sendReaction = (reaction) => {
    socketRef.current?.emit('send_reaction', { roomId: id, reaction });
  };

  const deleteMessage = (messageId) => {
    socketRef.current?.emit('admin_delete_message', { roomId: id, messageId });
  };

  const canControl = isHost || isModerator;
  const canModerate = canControl || user?.role === 'admin';

  if (!room) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center gold-text cinzel text-sm animate-pulse">Oda yükleniyor...</div>
      </div>
    );
  }

  if (needPassword && !unlocked) {
    return (
      <PasswordPrompt
        roomId={id} roomTitle={room.title}
        onSuccess={(unlockedRoom) => { setRoom(unlockedRoom); setNeedPassword(false); setUnlocked(true); }}
        onClose={() => navigate('/')}
      />
    );
  }

  const tabs = [
    { key: 'chat', label: '💬 Sohbet' },
    { key: 'participants', label: `👥 (${participants.length})` },
    ...(canControl ? [{ key: 'host', label: isOwner ? '👑 Sahip' : '🛡️ Yönetici' }] : [])
  ];

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 64px)' }}>
      {notification && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 text-xs px-4 py-2 rounded-full"
          style={{ background: 'rgba(212,175,55,0.9)', color: '#0f0f14', fontWeight: 600 }}>
          {notification}
        </div>
      )}

      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-gold-DEFAULT/10 flex-shrink-0"
        style={{ background: 'rgba(15,15,20,0.98)' }}>
        <Link to="/" className="text-gray-400 hover:text-gold-DEFAULT transition-colors flex-shrink-0">
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-white text-sm truncate">🎥 {room.title}</h1>
            {room.isLocked && <span className="text-xs text-gray-400">🔒</span>}
            {isOwner && (
              <span className="text-xs font-bold px-1.5 py-0.5 rounded cinzel"
                style={{ background: 'rgba(212,175,55,0.2)', color: '#d4af37', border: '1px solid rgba(212,175,55,0.4)', fontSize: '10px' }}>
                SAHİP
              </span>
            )}
            {isModerator && !isOwner && (
              <span className="text-xs font-bold px-1.5 py-0.5 rounded"
                style={{ background: 'rgba(59,130,246,0.2)', color: '#93c5fd', border: '1px solid rgba(59,130,246,0.3)', fontSize: '10px' }}>
                YÖNETİCİ
              </span>
            )}
          </div>
          {room.movieTitle && <p className="text-xs text-gray-400 truncate">{room.movieTitle}</p>}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {roomState.hostConnected && <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>}
          <span className="text-xs text-gray-400">{participants.length}</span>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden min-h-0 flex-col md:flex-row">

        {/* ── VIDEO COLUMN (full width mobile / left 65% desktop) ── */}
        <div className="flex flex-col flex-shrink-0 w-full md:w-[65%] lg:w-[68%] min-h-0 md:border-r border-gold-DEFAULT/10">

          {/* Video container – aspect-ratio on mobile, fills column on desktop */}
          <div className="relative w-full aspect-video md:aspect-auto md:flex-1 md:min-h-0">
            {hostDisconnected && !canControl && (
              <div className="absolute top-2 left-2 right-2 z-10 flex items-center gap-2 px-3 py-1.5 rounded-lg pointer-events-none"
                style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}>
                <span className="text-sm">📡</span>
                <p className="text-xs text-gray-300">Host çevrimdışı — video bağımsız devam ediyor</p>
              </div>
            )}
            <div className="absolute inset-0">
              {unlocked && (
                <VideoPlayer
                  streamUrl={room.streamUrl}
                  providerType={room.providerType || 'youtube'}
                  isHost={canControl}
                  roomState={roomState}
                  onStateChange={handleStateChange}
                  onSeek={handleSeek}
                  onUrlChange={handleUrlChange}
                  onResync={() => socketRef.current?.emit('player_sync_request', { roomId: id })}
                  movieTitle={room.movieTitle || room.title}
                />
              )}
            </div>
            <div className="absolute top-2 right-2 flex gap-1 pointer-events-none z-10">
              {reactions.map(r => (
                <div key={r.rid} className="text-xl animate-bounce pointer-events-none">{r.reaction}</div>
              ))}
            </div>
          </div>

          {/* Reactions bar */}
          <div className="flex gap-1 px-2 py-1.5 border-t border-b border-gold-DEFAULT/10 overflow-x-auto flex-shrink-0"
            style={{ background: 'rgba(12,12,18,0.98)' }}>
            {REACTIONS.map(r => (
              <button key={r} onClick={() => sendReaction(r)}
                className="text-lg hover:scale-125 transition-transform px-0.5 flex-shrink-0">{r}</button>
            ))}
          </div>
        </div>

        {/* ── CHAT COLUMN (full width mobile below video / right 35% desktop) ── */}
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden" style={{ minHeight: '280px' }}>

          {/* Tabs */}
          <div className="flex border-b border-gold-DEFAULT/10 flex-shrink-0"
            style={{ background: 'rgba(12,12,18,0.98)' }}>
            {tabs.map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className="flex-1 py-2.5 text-xs font-semibold transition-colors"
                style={{
                  color: activeTab === tab.key ? '#d4af37' : '#6b7280',
                  borderBottom: activeTab === tab.key ? '2px solid #d4af37' : '2px solid transparent',
                  fontSize: '11px'
                }}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-hidden min-h-0">
            {activeTab === 'chat' && (
              <div className="flex flex-col h-full">
                <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
                  {!roomState.chatEnabled && (
                    <div className="text-center text-xs text-gray-500 py-3">
                      💬 Sohbet host tarafından devre dışı bırakıldı
                    </div>
                  )}
                  {messages.map(msg => (
                    <ChatMessage key={msg.id} msg={msg} onDelete={deleteMessage} canModerate={canModerate} onUserClick={setProfileCardId} />
                  ))}
                  <div ref={chatEndRef} />
                </div>
                {user && roomState.chatEnabled ? (
                  <form onSubmit={sendMessage}
                    className="flex gap-1.5 p-2 border-t border-gold-DEFAULT/10 flex-shrink-0">
                    <div className="flex-1 relative">
                      <input value={newMsg} onChange={e => setNewMsg(e.target.value)}
                        placeholder={spamCooldown > 0 ? `${spamCooldown}s bekleyin...` : 'Mesaj yaz...'}
                        maxLength={500} disabled={spamCooldown > 0}
                        className="w-full px-3 py-2 rounded-xl text-white text-sm outline-none disabled:opacity-50"
                        style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${spamCooldown > 0 ? 'rgba(239,68,68,0.3)' : 'rgba(212,175,55,0.2)'}` }}
                      />
                      {spamCooldown > 0 && (
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-red-400 font-bold">{spamCooldown}s</div>
                      )}
                    </div>
                    <button type="submit" disabled={spamCooldown > 0}
                      className="btn-gold px-3 py-2 text-sm disabled:opacity-40 flex-shrink-0">↑</button>
                  </form>
                ) : !user ? (
                  <div className="p-2 border-t border-gold-DEFAULT/10 text-center text-xs text-gray-500 flex-shrink-0">
                    <Link to="/login" className="text-gold-DEFAULT hover:underline">Giriş yap</Link> ve sohbete katıl
                  </div>
                ) : null}
              </div>
            )}

            {activeTab === 'participants' && (
              <div className="overflow-y-auto h-full p-2 space-y-1">
                {participants.map((p, i) => (
                  <div key={i} className="flex items-center gap-2 py-1.5 border-b border-white/5">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-cinema-dark flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg, #d4af37, #a88a20)' }}>
                      {(p.username || 'U')[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white truncate flex items-center gap-1">
                        {p.username}
                        {p.isOwner && <span className="text-gold-DEFAULT">👑</span>}
                        {p.isModerator && !p.isOwner && <span className="text-blue-400">🛡️</span>}
                        {p.vip && <span className="text-purple-400">💎</span>}
                      </div>
                    </div>
                    <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0"></span>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'host' && canControl && (
              <div className="overflow-y-auto h-full p-2">
                <HostControlsPanel
                  room={room}
                  socket={socketRef.current}
                  roomState={roomState}
                  onSettingsChange={handleSettingsChange}
                  participants={participants}
                  isOwner={isOwner}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {profileCardId && (
        <UserProfileCard
          userId={profileCardId}
          onClose={() => setProfileCardId(null)}
          socket={socketRef.current}
        />
      )}
    </div>
  );
}
