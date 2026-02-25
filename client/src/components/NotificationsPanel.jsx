import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import UserAvatar from './UserAvatar';
import UserProfileCard from './UserProfileCard';
import CpButton from './CpButton';
import CpRequestsInbox from './CpRequestsInbox';

function timeAgo(ts) {
  const diff = Date.now() - new Date(ts);
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Az önce';
  if (m < 60) return `${m}dk`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}s`;
  return `${Math.floor(h / 24)}g`;
}

function DMInbox({ socket, counts, setNotifCounts, onClose }) {
  const { user } = useAuth();
  const token = localStorage.getItem('yoko_token');
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [thread, setThread] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const [friends, setFriends] = useState([]);
  const [showNewDM, setShowNewDM] = useState(false);
  const [loading, setLoading] = useState(false);
  const threadEndRef = useRef(null);

  const loadConversations = () => {
    if (!token) return;
    fetch('/api/profile/dms/conversations', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setConversations(data); })
      .catch(() => {});
  };

  const loadFriends = () => {
    if (!token) return;
    fetch('/api/profile/friends/list', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setFriends(data); })
      .catch(() => {});
  };

  useEffect(() => {
    loadConversations();
    loadFriends();
  }, [token]);

  useEffect(() => {
    if (!socket) return;
    const handleNewDM = (msg) => {
      if (activeConv && (msg.fromId === activeConv.other.id || msg.toId === activeConv.other.id)) {
        setThread(prev => [...prev, msg]);
        socket.emit('mark_dm_read', { fromId: msg.fromId });
        if (setNotifCounts) setNotifCounts(prev => ({ ...prev, unreadDMs: Math.max(0, (prev.unreadDMs || 0) - 1) }));
      } else {
        setConversations(prev => {
          const idx = prev.findIndex(c => c.other.id === msg.fromId);
          if (idx >= 0) {
            const updated = [...prev];
            updated[idx] = { ...updated[idx], lastMessage: msg, unread: (updated[idx].unread || 0) + 1 };
            return updated;
          }
          return [{ other: msg.from, lastMessage: msg, unread: 1 }, ...prev];
        });
        if (setNotifCounts) setNotifCounts(prev => ({ ...prev, unreadDMs: (prev.unreadDMs || 0) + 1 }));
      }
    };
    const handleDMSent = (msg) => {
      setThread(prev => [...prev, msg]);
      setConversations(prev => {
        const idx = prev.findIndex(c => c.other.id === msg.toId);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = { ...updated[idx], lastMessage: msg };
          return updated;
        }
        return prev;
      });
    };
    socket.on('new_dm', handleNewDM);
    socket.on('dm_sent', handleDMSent);
    return () => { socket.off('new_dm', handleNewDM); socket.off('dm_sent', handleDMSent); };
  }, [socket, activeConv, setNotifCounts]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thread]);

  const openConversation = (conv) => {
    setActiveConv(conv);
    setLoading(true);
    fetch(`/api/profile/dm/${conv.other.id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setThread(data);
        setConversations(prev => prev.map(c => c.other.id === conv.other.id ? { ...c, unread: 0 } : c));
        socket?.emit('mark_dm_read', { fromId: conv.other.id });
        if (setNotifCounts) setNotifCounts(prev => ({ ...prev, unreadDMs: Math.max(0, (prev.unreadDMs || 0) - (conv.unread || 0)) }));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  const sendMessage = () => {
    if (!newMsg.trim() || !socket || !activeConv) return;
    socket.emit('send_dm', { toId: activeConv.other.id, content: newMsg.trim() });
    setNewMsg('');
  };

  const startNewDM = (friend) => {
    setShowNewDM(false);
    const existingConv = conversations.find(c => c.other.id === friend.id);
    if (existingConv) {
      openConversation(existingConv);
    } else {
      const newConv = { other: friend, lastMessage: null, unread: 0 };
      setConversations(prev => [newConv, ...prev]);
      openConversation(newConv);
    }
  };

  const markAllRead = async () => {
    if (!token) return;
    try {
      await fetch('/api/profile/dms/mark-all-read', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      socket?.emit('mark_all_dms_read');
      setConversations(prev => prev.map(c => ({ ...c, unread: 0 })));
      if (setNotifCounts) setNotifCounts(prev => ({ ...prev, unreadDMs: 0 }));
    } catch {}
  };

  const deleteAll = async () => {
    if (!window.confirm('Tüm mesajlar silinsin mi?')) return;
    if (!token) return;
    try {
      await fetch('/api/profile/dms/all', { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      setConversations([]);
      setActiveConv(null);
      setThread([]);
      if (setNotifCounts) setNotifCounts(prev => ({ ...prev, unreadDMs: 0 }));
    } catch {}
  };

  if (activeConv) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-2 px-3 py-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <button onClick={() => { setActiveConv(null); setThread([]); }}
            className="text-gray-400 hover:text-white transition-colors text-lg leading-none">←</button>
          <UserAvatar user={activeConv.other} size={28} />
          <span className="text-sm font-semibold text-white flex-1 truncate">{activeConv.other.username}</span>
          {activeConv.other.vip && <span className="text-xs" style={{ color: '#c084fc' }}>💎</span>}
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2" style={{ minHeight: 0 }}>
          {loading && <div className="text-center text-xs text-gray-500 py-4 animate-pulse">Yükleniyor...</div>}
          {!loading && thread.length === 0 && (
            <div className="text-center text-xs text-gray-600 py-6">
              <div className="text-2xl mb-2">💬</div>
              Henüz mesaj yok
            </div>
          )}
          {thread.map(msg => {
            const isOwn = msg.fromId === user?.id;
            return (
              <div key={msg.id} className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
                {!isOwn && <UserAvatar user={msg.from} size={24} />}
                <div className={`max-w-[75%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                  <div className="px-3 py-2 rounded-2xl text-xs leading-relaxed break-words"
                    style={{
                      background: isOwn ? 'rgba(212,175,55,0.2)' : 'rgba(255,255,255,0.06)',
                      color: isOwn ? '#e8cc6b' : '#e8e8f0',
                      borderBottomRightRadius: isOwn ? 4 : undefined,
                      borderBottomLeftRadius: !isOwn ? 4 : undefined,
                    }}>
                    {msg.content}
                  </div>
                  <span className="text-gray-600 px-1" style={{ fontSize: 9 }}>
                    {new Date(msg.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                    {!msg.read && isOwn && ' ·'}
                  </span>
                </div>
              </div>
            );
          })}
          <div ref={threadEndRef} />
        </div>

        <div className="flex gap-2 p-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <input
            value={newMsg}
            onChange={e => setNewMsg(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder="Mesaj yaz..."
            maxLength={1000}
            className="flex-1 px-3 py-2 rounded-xl text-white text-xs outline-none"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(212,175,55,0.2)' }}
          />
          <button onClick={sendMessage}
            className="px-3 py-2 rounded-xl text-xs font-bold flex-shrink-0"
            style={{ background: 'rgba(212,175,55,0.2)', color: '#d4af37' }}>
            ↑
          </button>
        </div>
      </div>
    );
  }

  if (showNewDM) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-2 px-3 py-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <button onClick={() => setShowNewDM(false)}
            className="text-gray-400 hover:text-white transition-colors text-lg leading-none">←</button>
          <span className="text-sm font-semibold text-white flex-1">Yeni Mesaj</span>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {friends.length === 0 ? (
            <div className="text-center text-xs text-gray-600 py-8">
              <div className="text-2xl mb-2">👥</div>
              Arkadaş listeniz boş
            </div>
          ) : (
            friends.map(f => (
              <button key={f.id} onClick={() => startNewDM(f)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all hover:bg-white/5"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <UserAvatar user={f} size={32} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-white truncate">{f.username}</div>
                  {f.vip && <div className="text-xs" style={{ color: '#c084fc' }}>💎 VIP</div>}
                </div>
                <span className="text-gray-500 text-xs">→</span>
              </button>
            ))
          )}
        </div>
      </div>
    );
  }

  const totalUnread = conversations.reduce((s, c) => s + (c.unread || 0), 0);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <span className="text-xs font-semibold text-white">
          💬 Gelen Kutusu {totalUnread > 0 && <span className="text-blue-400">({totalUnread})</span>}
        </span>
        <div className="flex gap-1">
          <button onClick={() => setShowNewDM(true)}
            className="text-xs px-2 py-1 rounded-lg"
            style={{ background: 'rgba(212,175,55,0.15)', color: '#d4af37' }}
            title="Yeni DM">
            + Yeni
          </button>
          {totalUnread > 0 && (
            <button onClick={markAllRead}
              className="text-xs px-2 py-1 rounded-lg"
              style={{ background: 'rgba(34,197,94,0.1)', color: '#4ade80' }}
              title="Tümünü Okundu İşaretle">
              ✓ Okundu
            </button>
          )}
          {conversations.length > 0 && (
            <button onClick={deleteAll}
              className="text-xs px-2 py-1 rounded-lg"
              style={{ background: 'rgba(239,68,68,0.08)', color: '#f87171' }}
              title="Tümünü Sil">
              🗑️
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="text-center text-gray-600 text-xs py-8">
            <div className="text-2xl mb-2">💬</div>
            Henüz mesaj yok
            <br />
            <button onClick={() => setShowNewDM(true)}
              className="mt-3 text-xs px-3 py-1.5 rounded-full"
              style={{ background: 'rgba(212,175,55,0.15)', color: '#d4af37', border: '1px solid rgba(212,175,55,0.3)' }}>
              + Yeni Mesaj Gönder
            </button>
          </div>
        ) : (
          conversations.map((conv, i) => (
            <button key={i} onClick={() => openConversation(conv)}
              className="w-full flex items-center gap-3 px-3 py-3 transition-all hover:bg-white/4 text-left"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <div className="relative flex-shrink-0">
                <UserAvatar user={conv.other} size={36} />
                {conv.unread > 0 && (
                  <span className="absolute -top-1 -right-1 bg-blue-500 text-white rounded-full text-center font-bold"
                    style={{ fontSize: 8, minWidth: 14, height: 14, lineHeight: '14px', padding: '0 3px' }}>
                    {conv.unread}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-semibold truncate ${conv.unread > 0 ? 'text-white' : 'text-gray-300'}`}>
                    {conv.other.username}
                  </span>
                  {conv.lastMessage && (
                    <span className="text-gray-600 flex-shrink-0 ml-1" style={{ fontSize: 10 }}>
                      {timeAgo(conv.lastMessage.createdAt)}
                    </span>
                  )}
                </div>
                {conv.lastMessage && (
                  <div className={`text-xs truncate mt-0.5 ${conv.unread > 0 ? 'text-gray-300' : 'text-gray-500'}`}>
                    {conv.lastMessage.fromId === user?.id ? 'Sen: ' : ''}{conv.lastMessage.content}
                  </div>
                )}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

export default function NotificationsPanel({ socket, counts, setNotifCounts, onClose }) {
  const { user } = useAuth();
  const [friendRequests, setFriendRequests] = useState([]);
  const [friends, setFriends] = useState([]);
  const [tab, setTab] = useState('dms');
  const [cpCount, setCpCount] = useState(0);
  const [profileId, setProfileId] = useState(null);

  const token = localStorage.getItem('yoko_token');

  useEffect(() => {
    if (!user || !token) return;
    fetch('/api/profile/friends/requests', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setFriendRequests(data); })
      .catch(() => {});
    fetch('/api/profile/friends/list', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setFriends(data); })
      .catch(() => {});
  }, [user, token]);

  useEffect(() => {
    if (!socket) return;
    socket.on('friend_request_received', (req) => {
      setFriendRequests(prev => [{ ...req, from: req.from, id: req.id || Date.now() }, ...prev]);
    });
    socket.on('friend_request_accepted', () => {
      if (!token) return;
      fetch('/api/profile/friends/list', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(data => { if (Array.isArray(data)) setFriends(data); })
        .catch(() => {});
    });
    return () => {
      socket.off('friend_request_received');
      socket.off('friend_request_accepted');
    };
  }, [socket, token]);

  function acceptRequest(fromId) {
    if (!socket) return;
    socket.emit('accept_friend', { fromId });
    setFriendRequests(prev => prev.filter(r => r.from.id !== fromId));
    if (setNotifCounts) {
      setNotifCounts(prev => ({ ...prev, friendRequests: Math.max(0, (prev.friendRequests || 0) - 1) }));
    }
  }

  function rejectRequest(fromId) {
    if (!socket) return;
    socket.emit('reject_friend', { fromId });
    setFriendRequests(prev => prev.filter(r => r.from.id !== fromId));
    if (setNotifCounts) {
      setNotifCounts(prev => ({ ...prev, friendRequests: Math.max(0, (prev.friendRequests || 0) - 1) }));
    }
  }

  function removeFriend(friendId) {
    if (!token) return;
    fetch(`/api/profile/friends/${friendId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    }).then(() => {
      setFriends(prev => prev.filter(f => f.id !== friendId));
    }).catch(() => {});
  }

  const pendingCount = counts?.friendRequests || 0;
  const unreadDMs = counts?.unreadDMs || 0;

  return (
    <>
      <div
        className="fixed top-14 right-4 z-50 slide-in-right"
        style={{
          width: 340,
          height: 520,
          background: 'rgba(12,12,18,0.98)',
          border: '1px solid rgba(212,175,55,0.2)',
          borderRadius: 14,
          boxShadow: '0 8px 40px rgba(0,0,0,0.8)',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <span className="font-bold text-sm" style={{ color: '#d4af37' }}>🔔 Bildirimler</span>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="flex" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <button
            onClick={() => setTab('dms')}
            className="flex-1 py-2.5 text-xs font-semibold transition-colors flex items-center justify-center gap-1"
            style={{ color: tab === 'dms' ? '#d4af37' : '#6b7280', borderBottom: tab === 'dms' ? '2px solid #d4af37' : '2px solid transparent' }}>
            💬 Mesajlar
            {unreadDMs > 0 && (
              <span className="bg-blue-500 text-white rounded-full px-1.5 py-0.5" style={{ fontSize: 9, minWidth: 16, textAlign: 'center' }}>
                {unreadDMs}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab('requests')}
            className="flex-1 py-2.5 text-xs font-semibold transition-colors flex items-center justify-center gap-1"
            style={{ color: tab === 'requests' ? '#d4af37' : '#6b7280', borderBottom: tab === 'requests' ? '2px solid #d4af37' : '2px solid transparent' }}>
            📨 İstekler
            {pendingCount > 0 && (
              <span className="bg-red-500 text-white rounded-full px-1.5 py-0.5" style={{ fontSize: 9, minWidth: 16, textAlign: 'center' }}>
                {pendingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab('friends')}
            className="flex-1 py-2.5 text-xs font-semibold transition-colors flex items-center justify-center gap-1"
            style={{ color: tab === 'friends' ? '#d4af37' : '#6b7280', borderBottom: tab === 'friends' ? '2px solid #d4af37' : '2px solid transparent' }}>
            👥 Arkadaşlar
            {friends.length > 0 && (
              <span className="rounded-full px-1.5 py-0.5" style={{ fontSize: 9, background: 'rgba(212,175,55,0.2)', color: '#d4af37', minWidth: 16, textAlign: 'center' }}>
                {friends.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab('cp')}
            className="flex-1 py-2.5 text-xs font-semibold transition-colors flex items-center justify-center gap-1"
            style={{ color: tab === 'cp' ? '#ff6b9d' : '#6b7280', borderBottom: tab === 'cp' ? '2px solid #ff6b9d' : '2px solid transparent' }}>
            💫 CP
            {cpCount > 0 && (
              <span className="rounded-full px-1.5 py-0.5" style={{ fontSize: 9, background: 'rgba(255,107,157,0.2)', color: '#ff6b9d', minWidth: 16, textAlign: 'center' }}>
                {cpCount}
              </span>
            )}
          </button>
        </div>

        <div className="flex-1 overflow-hidden min-h-0">
          {tab === 'dms' && (
            <DMInbox socket={socket} counts={counts} setNotifCounts={setNotifCounts} onClose={onClose} />
          )}

          {tab === 'requests' && (
            <div className="overflow-y-auto h-full">
              {friendRequests.length === 0 ? (
                <div className="text-center text-gray-600 text-xs py-8">
                  <div className="text-2xl mb-2">📨</div>
                  Bekleyen arkadaşlık isteği yok
                </div>
              ) : (
                friendRequests.map((req) => (
                  <div key={req.id} className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <div className="cursor-pointer" onClick={() => setProfileId(req.from.id)}>
                      <UserAvatar user={req.from} size={36} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-white truncate cursor-pointer hover:underline" onClick={() => setProfileId(req.from.id)}>
                        {req.from.username}
                      </div>
                      <div className="text-xs text-gray-500">Arkadaşlık isteği gönderdi</div>
                    </div>
                    <div className="flex gap-1.5">
                      <button onClick={() => acceptRequest(req.from.id)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-sm transition-colors"
                        style={{ background: 'rgba(34,197,94,0.2)', color: '#4ade80' }} title="Kabul Et">✓</button>
                      <button onClick={() => rejectRequest(req.from.id)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-sm transition-colors"
                        style={{ background: 'rgba(239,68,68,0.2)', color: '#f87171' }} title="Reddet">✕</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === 'friends' && (
            <div className="overflow-y-auto h-full">
              {friends.length === 0 ? (
                <div className="text-center text-gray-600 text-xs py-8">
                  <div className="text-2xl mb-2">👥</div>
                  Henüz arkadaşın yok
                  <br />
                  <span className="text-gray-700">Profil kartından arkadaş ekle</span>
                </div>
              ) : (
                friends.map((friend) => (
                  <div key={friend.id} className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <div className="cursor-pointer" onClick={() => setProfileId(friend.id)}>
                      <UserAvatar user={friend} size={36} />
                    </div>
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setProfileId(friend.id)}>
                      <div className="text-sm font-semibold text-white truncate hover:underline">{friend.username}</div>
                      {friend.vip && <div className="text-xs" style={{ color: '#c084fc' }}>💎 VIP</div>}
                    </div>
                    <CpButton friendId={friend.id} />
                    <button onClick={() => removeFriend(friend.id)}
                      className="text-xs text-gray-600 hover:text-red-400 transition-colors px-2 py-1 rounded"
                      title="Arkadaşlıktan Çıkar">✕</button>
                  </div>
                ))
              )}
            </div>
          )}
          {tab === 'cp' && (
            <div className="overflow-y-auto h-full">
              <CpRequestsInbox onCountChange={setCpCount} />
            </div>
          )}
        </div>
      </div>

      {profileId && (
        <UserProfileCard userId={profileId} onClose={() => setProfileId(null)} socket={socket} />
      )}
    </>
  );
}
