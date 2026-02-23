import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import UserAvatar from './UserAvatar';
import UserProfileCard from './UserProfileCard';
import BadgeList, { getUsernameClass, getRoleLabel, getUsernameStyle, LevelBadge } from './RoleBadge';
import { getBubbleForRole } from '../config/bubblePresets';

const EMOJI_LIST = ['😂', '❤️', '😍', '🔥', '👏', '😮', '😎', '🎬', '👑', '💎', '🎉', '😭'];

function ChatMessageItem({ msg, onUserClick, canDelete, onDelete }) {
  const usernameClass = getUsernameClass(msg.user);
  const usernameStyle = getUsernameStyle(msg.user);
  const roleInfo = getRoleLabel(msg.user);
  const isAdmin = msg.user?.role === 'admin';
  const isMod = msg.user?.role === 'moderator';
  const hasBubble = isAdmin || isMod;
  const bubble = hasBubble ? getBubbleForRole(msg.user?.role, msg.user?.chatBubble) : null;

  if (hasBubble && bubble) {
    return (
      <div className="flex gap-2 items-start py-1.5 px-2 group fade-in-up">
        <div className="flex-shrink-0 mt-0.5">
          <UserAvatar user={msg.user} size={28} onClick={() => onUserClick && onUserClick(msg.user.id)} />
        </div>
        <div className="flex-1 min-w-0">
          {isAdmin && (
            <div className="flex items-center gap-1 mb-0.5">
              <span className="text-xs font-black tracking-widest px-1.5 py-0.5 rounded"
                style={{ background: 'rgba(220,38,38,0.2)', color: '#ff6b6b', border: '1px solid rgba(220,38,38,0.4)', fontSize: 9, letterSpacing: '0.15em' }}>
                ADMİN
              </span>
            </div>
          )}
          <div className="flex items-center gap-1 flex-wrap mb-0.5">
            {isMod && !isAdmin && (
              <span className="text-xs font-bold" style={{ color: '#3b82f6', fontSize: 10 }}>🛡️ MOD</span>
            )}
            <span
              className={`text-xs font-bold cursor-pointer ${usernameStyle ? '' : usernameClass}`}
              style={{ fontWeight: 800, ...(usernameStyle || {}) }}
              onClick={() => onUserClick && onUserClick(msg.user.id)}
            >
              {msg.user.username}
            </span>
            <LevelBadge level={msg.user?.level} />
            <BadgeList badges={msg.user.badges} size={10} />
            <span className="text-gray-600 ml-auto flex-shrink-0" style={{ fontSize: 9 }}>
              {new Date(msg.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
            </span>
            {canDelete && (
              <button
                onClick={() => onDelete(msg.id)}
                className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-opacity"
                style={{ fontSize: 10 }}
              >🗑</button>
            )}
          </div>
          <div className="rounded-2xl rounded-tl-sm px-3 py-2 inline-block max-w-full"
            style={{
              background: bubble.bg,
              border: `1px solid ${bubble.border}40`,
              boxShadow: `0 0 8px ${bubble.border}20`,
            }}>
            <p className="text-xs break-words leading-relaxed"
              style={{ color: isAdmin ? '#fca5a5' : bubble.text, fontWeight: isAdmin ? 700 : 500 }}>
              {msg.content}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2 items-start py-1 px-2 rounded-lg hover:bg-white/3 group fade-in-up">
      <div className="flex-shrink-0 mt-0.5">
        <UserAvatar user={msg.user} size={28} onClick={() => onUserClick && onUserClick(msg.user.id)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1 flex-wrap">
          {roleInfo && !isAdmin && (
            <span style={{ fontSize: 11, color: roleInfo.color }}>{roleInfo.icon}</span>
          )}
          <span
            className={`text-xs font-semibold cursor-pointer ${usernameStyle ? '' : usernameClass}`}
            style={{ ...(usernameStyle || {}) }}
            onClick={() => onUserClick && onUserClick(msg.user.id)}
          >
            {msg.user.username}
          </span>
          <LevelBadge level={msg.user?.level} />
          <BadgeList badges={msg.user.badges} size={11} />
          <span className="text-gray-600" style={{ fontSize: 10 }}>
            {new Date(msg.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
          </span>
          {canDelete && (
            <button
              onClick={() => onDelete(msg.id)}
              className="opacity-0 group-hover:opacity-100 ml-auto text-red-400 hover:text-red-300 transition-opacity"
              style={{ fontSize: 10 }}
            >🗑</button>
          )}
        </div>
        <div className="text-xs leading-relaxed break-words" style={{ color: '#d1d5db', marginTop: 1 }}>
          {msg.content}
        </div>
      </div>
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
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const cooldownRef = useRef(null);

  useEffect(() => {
    fetch('/api/profile/global-chat/history')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setMessages(data); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!socket) return;
    socket.emit('join_global_chat');

    socket.on('global_message', (msg) => {
      setMessages(prev => [...prev.slice(-199), msg]);
    });

    socket.on('global_message_deleted', ({ messageId }) => {
      setMessages(prev => prev.filter(m => m.id !== messageId));
    });

    socket.on('global_chat_cleared', () => {
      setMessages([]);
    });

    socket.on('global_participants', (participants) => {
      setOnlineCount(participants.length);
    });

    socket.on('spam_blocked', ({ remaining }) => {
      setCooldown(remaining);
    });

    return () => {
      socket.off('global_message');
      socket.off('global_message_deleted');
      socket.off('global_chat_cleared');
      socket.off('global_participants');
      socket.off('spam_blocked');
      socket.emit('leave_global_chat');
    };
  }, [socket]);

  useEffect(() => {
    if (cooldown > 0) {
      cooldownRef.current = setTimeout(() => setCooldown(c => Math.max(0, c - 1)), 1000);
    }
    return () => clearTimeout(cooldownRef.current);
  }, [cooldown]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function sendMessage() {
    if (!socket || !input.trim() || !user || cooldown > 0) return;
    socket.emit('send_global_message', { content: input.trim() });
    setInput('');
    setShowEmoji(false);
    inputRef.current?.focus();
  }

  function deleteMessage(messageId) {
    if (!socket) return;
    socket.emit('admin_delete_global_message', { messageId });
  }

  function clearChat() {
    if (!socket || !window.confirm('Tüm global sohbeti temizlemek istiyor musunuz?')) return;
    socket.emit('admin_clear_global_chat');
  }

  const isAdminOrMod = user?.role === 'admin' || user?.role === 'moderator';

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-end" style={{ pointerEvents: 'none' }}>
      <div
        className="slide-in-right"
        style={{
          width: 340, height: '90vh', maxHeight: 640,
          marginBottom: 80, marginRight: 16,
          background: 'rgba(12,12,18,0.98)',
          border: '1px solid rgba(212,175,55,0.2)',
          borderRadius: 16, display: 'flex', flexDirection: 'column',
          pointerEvents: 'all', boxShadow: '0 8px 40px rgba(0,0,0,0.8)'
        }}
      >
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div>
            <div className="font-bold text-sm gold-text">🌐 Global Sohbet</div>
            <div className="text-xs text-gray-500">{onlineCount} çevrimiçi</div>
          </div>
          <div className="flex gap-2 items-center">
            {isAdminOrMod && (
              <button onClick={clearChat} className="text-red-400 hover:text-red-300 text-xs px-2 py-1 rounded border border-red-400/20 hover:border-red-400/40 transition-all">
                Temizle
              </button>
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors p-1">
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-2 px-1" style={{ overscrollBehavior: 'contain' }}>
          {messages.length === 0 && (
            <div className="text-center text-gray-600 text-xs py-8">Henüz mesaj yok. İlk mesajı gönder! 👋</div>
          )}
          {messages.map(msg => (
            <ChatMessageItem
              key={msg.id}
              msg={msg}
              onUserClick={setProfileId}
              canDelete={isAdminOrMod}
              onDelete={deleteMessage}
            />
          ))}
          <div ref={bottomRef} />
        </div>

        {showEmoji && (
          <div className="px-3 pb-2 flex flex-wrap gap-1">
            {EMOJI_LIST.map(e => (
              <button key={e} onClick={() => { setInput(p => p + e); setShowEmoji(false); inputRef.current?.focus(); }}
                className="text-lg hover:scale-125 transition-transform">{e}</button>
            ))}
          </div>
        )}

        <div className="px-3 pb-3 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          {!user ? (
            <div className="text-center text-xs text-gray-500 py-2">Sohbet için giriş yapın</div>
          ) : (
            <div className="flex gap-2 items-center">
              <button onClick={() => setShowEmoji(s => !s)} className="text-lg hover:scale-110 transition-transform flex-shrink-0">😊</button>
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                placeholder={cooldown > 0 ? `${cooldown}s bekle...` : 'Mesaj yaz...'}
                disabled={cooldown > 0}
                className="flex-1 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', fontSize: 13 }}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || cooldown > 0}
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all"
                style={{
                  background: input.trim() && cooldown === 0 ? 'linear-gradient(135deg, #d4af37, #a88a20)' : 'rgba(255,255,255,0.06)',
                  color: input.trim() && cooldown === 0 ? '#0f0f14' : '#6b7280'
                }}
              >
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>

      {profileId && (
        <UserProfileCard userId={profileId} onClose={() => setProfileId(null)} socket={socket} />
      )}
    </div>
  );
}
