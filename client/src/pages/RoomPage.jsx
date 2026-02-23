import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';

const REACTIONS = ['❤️', '🔥', '😂', '👏', '😮', '💎'];

function ChatMessage({ msg, onDelete, isAdmin }) {
  const roleColors = { admin: '#d4af37', vip: '#a855f7', user: '#9ca3af' };
  const color = roleColors[msg.user?.role] || '#9ca3af';

  return (
    <div className="flex gap-2 group py-1">
      <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-cinema-dark"
        style={{ background: `linear-gradient(135deg, ${color}, ${color}88)` }}>
        {(msg.user?.username || 'U')[0].toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-xs font-semibold mr-1" style={{ color }}>
          {msg.user?.username}
          {msg.user?.vip && <span className="ml-1 text-purple-400">💎</span>}
        </span>
        <span className="text-xs text-gray-300 break-words">{msg.content}</span>
      </div>
      {isAdmin && (
        <button
          onClick={() => onDelete(msg.id)}
          className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 text-xs px-1 transition-opacity"
        >
          ✕
        </button>
      )}
    </div>
  );
}

export default function RoomPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const { user, token } = useAuth();
  const [room, setRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const [activeTab, setActiveTab] = useState('chat');
  const [reactions, setReactions] = useState([]);
  const socketRef = useRef(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    axios.get(`/api/rooms/${id}`).then(r => setRoom(r.data));
    axios.get(`/api/rooms/${id}/messages`).then(r => setMessages(r.data));
  }, [id]);

  useEffect(() => {
    const socket = io({ auth: { token } });
    socketRef.current = socket;

    socket.emit('join_room', id);

    socket.on('new_message', (msg) => {
      setMessages(prev => [...prev, msg]);
    });

    socket.on('participants', (list) => {
      setParticipants(list);
    });

    socket.on('message_deleted', ({ messageId }) => {
      setMessages(prev => prev.filter(m => m.id !== messageId));
    });

    socket.on('new_reaction', (data) => {
      const rid = Date.now();
      setReactions(prev => [...prev, { ...data, rid }]);
      setTimeout(() => setReactions(prev => prev.filter(r => r.rid !== rid)), 3000);
    });

    return () => {
      socket.emit('leave_room', id);
      socket.disconnect();
    };
  }, [id, token]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (!newMsg.trim() || !user) return;
    socketRef.current?.emit('send_message', { roomId: id, content: newMsg });
    setNewMsg('');
  };

  const sendReaction = (reaction) => {
    socketRef.current?.emit('send_reaction', { roomId: id, reaction });
  };

  const deleteMessage = (messageId) => {
    socketRef.current?.emit('admin_delete_message', { roomId: id, messageId });
  };

  if (!room) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center gold-text cinzel">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] max-w-screen-xl mx-auto">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gold-DEFAULT/10"
        style={{ background: 'rgba(15,15,20,0.9)' }}>
        <Link to="/" className="text-gray-400 hover:text-gold-DEFAULT transition-colors">
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </Link>
        <div>
          <h1 className="font-bold text-white text-sm">🎥 {room.title}</h1>
          {room.movieTitle && <p className="text-xs text-gray-400">{room.movieTitle}</p>}
        </div>
        <div className="ml-auto flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
          <span className="text-xs text-gray-400">{participants.length}</span>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 flex flex-col">
          <div className="relative h-48 sm:h-64 bg-black flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #0a0a0f, #1a0a2e)' }}>
            {room.streamUrl ? (
              <iframe
                src={room.streamUrl}
                className="w-full h-full"
                allowFullScreen
                title={room.title}
              />
            ) : (
              <div className="text-center p-4">
                <div className="text-5xl mb-3 opacity-40">🎬</div>
                <p className="text-gray-500 text-sm">{room.movieTitle || room.title}</p>
                <p className="text-xs text-gray-600 mt-1">Yayın yakında başlayacak</p>
              </div>
            )}

            <div className="absolute top-2 right-2 flex gap-2">
              {reactions.map(r => (
                <div key={r.rid} className="text-2xl animate-bounce">{r.reaction}</div>
              ))}
            </div>
          </div>

          <div className="flex gap-1 p-2 border-b border-gold-DEFAULT/10 overflow-x-auto">
            {REACTIONS.map(r => (
              <button
                key={r}
                onClick={() => sendReaction(r)}
                className="text-xl hover:scale-125 transition-transform px-1"
              >
                {r}
              </button>
            ))}
          </div>

          <div className="flex border-b border-gold-DEFAULT/10">
            {['chat', 'participants'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="flex-1 py-2 text-xs font-semibold transition-colors"
                style={{
                  color: activeTab === tab ? '#d4af37' : '#6b7280',
                  borderBottom: activeTab === tab ? '2px solid #d4af37' : '2px solid transparent'
                }}
              >
                {tab === 'chat' ? `💬 ${t('room.chat')}` : `👥 ${t('room.participants')} (${participants.length})`}
              </button>
            ))}
          </div>

          {activeTab === 'chat' ? (
            <>
              <div className="flex-1 overflow-y-auto p-3 space-y-0.5">
                {messages.map(msg => (
                  <ChatMessage key={msg.id} msg={msg} onDelete={deleteMessage} isAdmin={user?.role === 'admin'} />
                ))}
                <div ref={chatEndRef} />
              </div>

              {user ? (
                <form onSubmit={sendMessage} className="flex gap-2 p-3 border-t border-gold-DEFAULT/10">
                  <input
                    value={newMsg}
                    onChange={e => setNewMsg(e.target.value)}
                    placeholder={t('room.sendMessage')}
                    maxLength={500}
                    className="flex-1 px-3 py-2 rounded-xl text-sm text-white outline-none"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,175,55,0.2)' }}
                  />
                  <button type="submit" className="btn-gold px-4 py-2 text-sm">
                    {t('room.send')}
                  </button>
                </form>
              ) : (
                <div className="p-3 border-t border-gold-DEFAULT/10 text-center text-xs text-gray-500">
                  <Link to="/login" className="text-gold-DEFAULT hover:underline">{t('room.loginToChat')}</Link>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 overflow-y-auto p-3">
              {participants.map((p, i) => (
                <div key={i} className="flex items-center gap-2 py-2 border-b border-white/5">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-cinema-dark"
                    style={{ background: 'linear-gradient(135deg, #d4af37, #a88a20)' }}>
                    {(p.username || 'U')[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm text-white">{p.username}</div>
                    <div className="text-xs text-gray-500">{p.role === 'admin' ? '⚙️ Admin' : p.vip ? '💎 VIP' : '🎬 Üye'}</div>
                  </div>
                  <div className="ml-auto">
                    <span className="w-2 h-2 rounded-full bg-green-400 inline-block"></span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
