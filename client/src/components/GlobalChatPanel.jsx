import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import UserAvatar from './UserAvatar';
import UserProfileCard from './UserProfileCard';
import { LevelBadge, RolePill, getUsernameClass, getUsernameStyle } from './RoleBadge';
import { getBubbleForRole } from '../config/bubblePresets';

const EMOJI_LIST = ['😂','❤️','😍','🔥','👏','😮','😎','🎬','👑','💎','🎉','😭','🤣','✨','🫶','💪','🥳','🤩','😤','👀','💯','🎭','🌟','⚡'];

const ROLE_CONFIG = {
  admin: {
    border: 'rgba(255,107,107,0.7)',
    glow: 'rgba(255,107,107,0.25)',
    bg: 'linear-gradient(135deg, rgba(220,38,38,0.12), rgba(255,107,107,0.06))',
    textColor: '#fca5a5',
    nameColor: '#ff6b6b',
    sparkle: true,
  },
  moderator: {
    border: 'rgba(34,197,94,0.6)',
    glow: 'rgba(34,197,94,0.2)',
    bg: 'linear-gradient(135deg, rgba(34,197,94,0.1), rgba(16,185,129,0.05))',
    textColor: '#d1d5db',
    nameColor: '#86efac',
    sparkle: false,
  },
  vip: {
    border: 'rgba(168,85,247,0.5)',
    glow: 'rgba(168,85,247,0.18)',
    bg: 'linear-gradient(135deg, rgba(168,85,247,0.1), rgba(124,58,237,0.05))',
    textColor: '#d1d5db',
    nameColor: '#c084fc',
    sparkle: false,
    shimmer: true,
  },
  user: {
    border: 'rgba(255,255,255,0.07)',
    glow: 'transparent',
    bg: 'transparent',
    textColor: '#d1d5db',
    nameColor: '#e5e7eb',
    sparkle: false,
  },
};

function getRoleKey(user) {
  if (user?.role === 'admin') return 'admin';
  if (user?.role === 'moderator') return 'moderator';
  if (user?.vip) return 'vip';
  return 'user';
}

function SparkleIcon() {
  return (
    <span className="admin-sparkle" style={{ display: 'inline-block', animation: 'sparkle 1.5s infinite', fontSize: 10, marginLeft: 2 }}>✨</span>
  );
}

function ChatMessageCard({ msg, onUserClick, canModerate, onDelete, onMute }) {
  const [hovered, setHovered] = useState(false);
  const rk = getRoleKey(msg.user);
  const cfg = ROLE_CONFIG[rk];
  const usernameStyle = getUsernameStyle(msg.user);
  const usernameClass = getUsernameClass(msg.user);
  const isSpecial = rk === 'admin' || rk === 'moderator' || rk === 'vip';
  const time = new Date(msg.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        gap: 10,
        padding: '8px 12px',
        borderRadius: 14,
        background: isSpecial ? cfg.bg : 'transparent',
        border: isSpecial ? `1px solid ${cfg.border}` : '1px solid transparent',
        boxShadow: isSpecial ? `0 0 12px ${cfg.glow}` : 'none',
        transition: 'all 0.2s ease',
        transform: hovered ? 'translateY(-1px)' : 'none',
        marginBottom: 3,
        position: 'relative',
      }}
    >
      {/* Avatar with role ring */}
      <div
        style={{
          flexShrink: 0,
          borderRadius: '50%',
          padding: 2,
          background: isSpecial ? `linear-gradient(135deg, ${cfg.border}, transparent)` : 'transparent',
          boxShadow: isSpecial ? `0 0 10px ${cfg.glow}` : 'none',
        }}
      >
        <UserAvatar
          user={msg.user}
          size={36}
          onClick={() => onUserClick && onUserClick(msg.user.id)}
        />
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap', marginBottom: 3 }}>
          <RolePill user={msg.user} />
          <span
            className={usernameStyle ? '' : usernameClass}
            style={{
              fontSize: 12,
              fontWeight: 800,
              cursor: 'pointer',
              letterSpacing: '0.01em',
              ...(usernameStyle || { color: cfg.nameColor }),
            }}
            onClick={() => onUserClick && onUserClick(msg.user.id)}
          >
            {msg.user.username}
          </span>
          {cfg.sparkle && <SparkleIcon />}
          <LevelBadge level={msg.user?.level} />
          <span style={{ fontSize: 10, color: '#4b5563', marginLeft: 'auto' }}>{time}</span>
        </div>
        <p style={{
          fontSize: 13,
          color: cfg.textColor,
          lineHeight: 1.5,
          wordBreak: 'break-word',
          margin: 0,
          ...(rk === 'vip' && { backgroundImage: 'linear-gradient(90deg, #d1d5db, #c084fc, #d1d5db)', backgroundSize: '200%', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', animation: 'shimmer 3s linear infinite' }),
        }}>
          {msg.content}
        </p>
      </div>

      {/* Mod tools on hover */}
      {canModerate && hovered && (
        <div style={{
          position: 'absolute',
          top: 6,
          right: 8,
          display: 'flex',
          gap: 4,
          background: 'rgba(15,15,22,0.95)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 10,
          padding: '3px 6px',
        }}>
          <button
            onClick={() => onDelete && onDelete(msg.id)}
            title="Sil"
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, padding: '2px 3px', color: '#f87171', borderRadius: 6 }}
          >🗑️</button>
          <button
            onClick={() => onMute && onMute(msg.user.id, msg.user.username)}
            title="Sustur"
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, padding: '2px 3px', color: '#fbbf24', borderRadius: 6 }}
          >🔇</button>
        </div>
      )}
    </div>
  );
}

export default function GlobalChatPanel({ onClose, socket }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [profileId, setProfileId] = useState(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [onlineCount, setOnlineCount] = useState(0);
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [cpRequests, setCpRequests] = useState([]);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const cooldownRef = useRef(null);
  const typingTimers = useRef({});

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    fetch('/api/profile/global-chat/history')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setMessages(data); })
      .catch(() => {});
    if (user) {
      const token = localStorage.getItem('yoko_token');
      fetch('/api/cp/requests/incoming', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(data => { if (Array.isArray(data)) setCpRequests(data); })
        .catch(() => {});
    }
  }, [user]);

  useEffect(() => {
    if (!socket) return;
    socket.emit('join_global_chat');

    socket.on('global_message', msg => setMessages(prev => [...prev.slice(-199), msg]));
    socket.on('global_message_deleted', ({ messageId }) => setMessages(prev => prev.filter(m => m.id !== messageId)));
    socket.on('global_chat_cleared', () => setMessages([]));
    socket.on('global_participants', participants => setOnlineCount(participants.length));
    socket.on('spam_blocked', ({ remaining }) => setCooldown(remaining));
    socket.on('user_typing', ({ username, userId }) => {
      if (userId === user?.id) return;
      setTypingUsers(prev => {
        if (prev.find(u => u.userId === userId)) return prev;
        return [...prev.slice(-2), { username, userId }];
      });
      clearTimeout(typingTimers.current[userId]);
      typingTimers.current[userId] = setTimeout(() => {
        setTypingUsers(prev => prev.filter(u => u.userId !== userId));
      }, 3000);
    });
    socket.on('cp_request_received', req => {
      setCpRequests(prev => [req, ...prev]);
    });
    socket.on('cp_accepted', ({ partner, label }) => {
      if (partner) {
        const msg = `🎉 ${partner.username} ile "${label}" olarak eşleştiniz!`;
        setMessages(prev => [...prev, { id: Date.now(), content: msg, createdAt: new Date(), user: { username: 'Sistem', role: 'admin', id: 0, level: 1, badges: '', vip: false } }]);
      }
    });
    socket.on('cp_broken', ({ by }) => {
      setMessages(prev => [...prev, { id: Date.now(), content: `💔 CP ilişkisi sona erdi.`, createdAt: new Date(), user: { username: 'Sistem', role: 'admin', id: 0, level: 1, badges: '', vip: false } }]);
    });

    return () => {
      socket.off('global_message');
      socket.off('global_message_deleted');
      socket.off('global_chat_cleared');
      socket.off('global_participants');
      socket.off('spam_blocked');
      socket.off('user_typing');
      socket.off('cp_request_received');
      socket.off('cp_accepted');
      socket.off('cp_broken');
      socket.emit('leave_global_chat');
    };
  }, [socket, user]);

  useEffect(() => {
    if (cooldown > 0) {
      cooldownRef.current = setTimeout(() => setCooldown(c => Math.max(0, c - 1)), 1000);
    }
    return () => clearTimeout(cooldownRef.current);
  }, [cooldown]);

  useEffect(() => {
    if (!search) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, search]);

  const sendMessage = () => {
    if (!socket || !input.trim() || !user || cooldown > 0) return;
    socket.emit('send_global_message', { content: input.trim() });
    setInput('');
    setShowEmoji(false);
    inputRef.current?.focus();
  };

  const handleInputChange = (val) => {
    setInput(val);
    if (socket && user && val.trim()) socket.emit('global_typing');
  };

  const deleteMessage = (messageId) => socket?.emit('admin_delete_global_message', { messageId });
  const muteUser = (userId, username) => {
    if (!socket) return;
    if (window.confirm(`"${username}" kullanıcısını susturmak istediğinizden emin misiniz?`)) {
      socket.emit('admin_mute_user', { userId });
    }
  };
  const clearChat = () => {
    if (!socket || !window.confirm('Tüm global sohbeti temizlemek istiyor musunuz?')) return;
    socket.emit('admin_clear_global_chat');
  };

  const acceptCpRequest = (requestId) => {
    socket?.emit('cp_accept', { requestId });
    setCpRequests(prev => prev.filter(r => r.id !== requestId));
  };

  const rejectCpRequest = (requestId) => {
    socket?.emit('cp_reject', { requestId });
    setCpRequests(prev => prev.filter(r => r.id !== requestId));
  };

  const isAdminOrMod = user?.role === 'admin' || user?.role === 'moderator';

  const filtered = search.trim()
    ? messages.filter(m =>
        m.content.toLowerCase().includes(search.toLowerCase()) ||
        m.user?.username?.toLowerCase().includes(search.toLowerCase())
      )
    : messages;

  const panelStyle = isMobile ? {
    position: 'fixed', inset: 0, zIndex: 9999,
    background: '#0b0f19',
    display: 'flex', flexDirection: 'column',
  } : {
    width: 400, height: '88vh', maxHeight: 700,
    marginBottom: 80, marginRight: 16,
    background: 'rgba(11,15,25,0.99)',
    border: '1.5px solid rgba(212,175,55,0.2)',
    borderRadius: 18,
    display: 'flex', flexDirection: 'column',
    boxShadow: '0 8px 48px rgba(0,0,0,0.85), 0 0 0 1px rgba(212,175,55,0.05)',
    backdropFilter: 'blur(20px)',
  };

  return (
    <>
      <style>{`
        @keyframes shimmer { 0%{background-position:0% 50%} 100%{background-position:200% 50%} }
        @keyframes sparkle { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(1.3)} }
        @keyframes slideInRight { from{opacity:0;transform:translateX(20px)} to{opacity:1;transform:translateX(0)} }
        @keyframes pulse-dot { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes heartbeat { 0%,100%{transform:scale(1)} 50%{transform:scale(1.15)} }
        .global-chat-panel { animation: slideInRight 0.25s ease; }
        .cp-req-card { animation: slideInRight 0.2s ease; }
      `}</style>

      <div style={isMobile ? { position: 'fixed', inset: 0, zIndex: 9998, pointerEvents: 'none' } : {
        position: 'fixed', inset: 0, zIndex: 40, display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end', pointerEvents: 'none'
      }}>
        <div className="global-chat-panel" style={{ ...panelStyle, pointerEvents: 'all' }}>

          {/* ── HEADER ── */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 16px 12px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.08))',
                border: '1px solid rgba(212,175,55,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16,
              }}>🌍</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#d4af37', letterSpacing: '0.01em' }}>Global Sohbet</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', display: 'inline-block', animation: 'pulse-dot 2s infinite' }} />
                  <span style={{ fontSize: 11, color: '#6b7280' }}>{onlineCount} çevrimiçi</span>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {cpRequests.length > 0 && (
                <button
                  style={{
                    background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.4)',
                    borderRadius: 10, padding: '5px 10px', fontSize: 12, color: '#c084fc',
                    cursor: 'default', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4,
                  }}
                >
                  💝 <span style={{ background: '#c084fc', color: '#0b0f19', borderRadius: '50%', width: 16, height: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 10 }}>{cpRequests.length}</span>
                </button>
              )}
              <button
                onClick={() => setShowSearch(s => !s)}
                style={{
                  background: showSearch ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${showSearch ? 'rgba(212,175,55,0.4)' : 'rgba(255,255,255,0.1)'}`,
                  borderRadius: 10, padding: '6px 8px', cursor: 'pointer', color: showSearch ? '#d4af37' : '#9ca3af',
                }}
                title="Ara"
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
              </button>
              {isAdminOrMod && (
                <button
                  onClick={clearChat}
                  style={{
                    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
                    borderRadius: 10, padding: '6px 10px', fontSize: 11, color: '#f87171',
                    cursor: 'pointer', fontWeight: 700,
                  }}
                >Temizle</button>
              )}
              <button
                onClick={onClose}
                style={{
                  background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 10, width: 32, height: 32, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', cursor: 'pointer', color: '#9ca3af',
                }}
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          </div>

          {/* ── SEARCH BAR ── */}
          {showSearch && (
            <div style={{ padding: '8px 14px', borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
              <input
                autoFocus
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Mesaj veya kullanıcı ara..."
                style={{
                  width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(212,175,55,0.2)',
                  borderRadius: 12, padding: '8px 14px', fontSize: 13, color: '#fff', outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          )}

          {/* ── CP REQUESTS ── */}
          {cpRequests.length > 0 && (
            <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(168,85,247,0.15)', flexShrink: 0 }}>
              <div style={{ fontSize: 11, color: '#c084fc', fontWeight: 700, marginBottom: 6 }}>💝 CP İstekleri ({cpRequests.length})</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {cpRequests.slice(0, 3).map(req => (
                  <div key={req.id} className="cp-req-card" style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.25)',
                    borderRadius: 12, padding: '7px 10px',
                  }}>
                    <UserAvatar user={req.sender} size={28} onClick={() => setProfileId(req.sender.id)} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#e5e7eb', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{req.sender.username}</div>
                      <div style={{ fontSize: 11, color: '#c084fc' }}>{req.label}</div>
                    </div>
                    <button onClick={() => acceptCpRequest(req.id)} style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.35)', borderRadius: 8, padding: '4px 8px', fontSize: 12, color: '#86efac', cursor: 'pointer', fontWeight: 700 }}>✓</button>
                    <button onClick={() => rejectCpRequest(req.id)} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, padding: '4px 8px', fontSize: 12, color: '#f87171', cursor: 'pointer', fontWeight: 700 }}>✕</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── MESSAGES ── */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 6px', overscrollBehavior: 'contain' }}
            className="scrollbar-hide">
            {filtered.length === 0 && (
              <div style={{ textAlign: 'center', color: '#374151', fontSize: 13, padding: '40px 20px', lineHeight: 1.6 }}>
                {search ? '🔍 Sonuç bulunamadı' : 'Henüz mesaj yok.\nİlk mesajı gönder! 👋'}
              </div>
            )}
            {filtered.map(msg => (
              <ChatMessageCard
                key={msg.id}
                msg={msg}
                onUserClick={setProfileId}
                canModerate={isAdminOrMod && msg.user?.id !== 0}
                onDelete={deleteMessage}
                onMute={muteUser}
              />
            ))}
            {typingUsers.length > 0 && (
              <div style={{ padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ display: 'flex', gap: 3 }}>
                  {[0,1,2].map(i => (
                    <span key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: '#d4af37', display: 'inline-block', animation: `pulse-dot 1.2s ${i * 0.2}s infinite` }} />
                  ))}
                </div>
                <span style={{ fontSize: 11, color: '#6b7280', fontStyle: 'italic' }}>
                  {typingUsers.map(u => u.username).join(', ')} yazıyor...
                </span>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* ── EMOJI PICKER ── */}
          {showEmoji && (
            <div style={{
              padding: '8px 12px 4px',
              display: 'flex', flexWrap: 'wrap', gap: 4,
              background: 'rgba(255,255,255,0.03)',
              borderTop: '1px solid rgba(255,255,255,0.05)',
              flexShrink: 0,
            }}>
              {EMOJI_LIST.map(e => (
                <button key={e} onClick={() => { setInput(p => p + e); setShowEmoji(false); inputRef.current?.focus(); }}
                  style={{ fontSize: 18, background: 'none', border: 'none', cursor: 'pointer', padding: '2px 3px', borderRadius: 6, transition: 'transform 0.1s' }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.3)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                >{e}</button>
              ))}
            </div>
          )}

          {/* ── INPUT AREA ── */}
          <div style={{ padding: '10px 12px 14px', borderTop: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
            {!user ? (
              <div style={{ textAlign: 'center', fontSize: 12, color: '#4b5563', padding: '10px 0' }}>
                Sohbet için <span style={{ color: '#d4af37', cursor: 'pointer' }}>giriş yapın</span>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <button
                    onClick={() => setShowEmoji(s => !s)}
                    style={{
                      fontSize: 18, background: showEmoji ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${showEmoji ? 'rgba(212,175,55,0.3)' : 'rgba(255,255,255,0.08)'}`,
                      borderRadius: 10, width: 36, height: 36, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >😊</button>
                </div>

                <div style={{ flex: 1, position: 'relative' }}>
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={e => handleInputChange(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
                    }}
                    placeholder={cooldown > 0 ? `${cooldown}s bekle...` : 'Mesajını yaz... (Enter: gönder)'}
                    disabled={cooldown > 0}
                    rows={1}
                    style={{
                      width: '100%', background: 'rgba(255,255,255,0.06)',
                      border: `1px solid ${input.trim() ? 'rgba(212,175,55,0.3)' : 'rgba(255,255,255,0.08)'}`,
                      borderRadius: 12, padding: '9px 12px', fontSize: 13, color: '#fff',
                      outline: 'none', resize: 'none', lineHeight: 1.5,
                      boxSizing: 'border-box',
                      transition: 'border-color 0.2s',
                    }}
                  />
                  {cooldown > 0 && (
                    <span style={{
                      position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                      fontSize: 12, color: '#d4af37', fontWeight: 700
                    }}>{cooldown}s</span>
                  )}
                </div>

                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || cooldown > 0}
                  style={{
                    width: 40, height: 40, borderRadius: 12, border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: input.trim() && cooldown === 0
                      ? 'linear-gradient(135deg, #d4af37, #a88a20)'
                      : 'rgba(255,255,255,0.06)',
                    color: input.trim() && cooldown === 0 ? '#0f0f14' : '#4b5563',
                    transition: 'all 0.2s',
                    flexShrink: 0,
                  }}
                >
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {profileId && (
        <UserProfileCard userId={profileId} onClose={() => setProfileId(null)} socket={socket} />
      )}
    </>
  );
}
