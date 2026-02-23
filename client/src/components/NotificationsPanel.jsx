import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import UserAvatar from './UserAvatar';

export default function NotificationsPanel({ socket, counts, onClose }) {
  const { user } = useAuth();
  const [friendRequests, setFriendRequests] = useState([]);
  const [tab, setTab] = useState('friends');

  useEffect(() => {
    if (!user) return;
    fetch('/api/profile/friends/requests', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setFriendRequests(data); })
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!socket) return;
    socket.on('friend_request_received', (req) => {
      setFriendRequests(prev => [{ ...req, from: req.from, id: Date.now() }, ...prev]);
    });
    return () => { socket.off('friend_request_received'); };
  }, [socket]);

  function acceptRequest(fromId) {
    if (!socket) return;
    socket.emit('accept_friend', { fromId });
    setFriendRequests(prev => prev.filter(r => r.from.id !== fromId));
  }

  function rejectRequest(fromId) {
    if (!socket) return;
    socket.emit('reject_friend', { fromId });
    setFriendRequests(prev => prev.filter(r => r.from.id !== fromId));
  }

  return (
    <div
      className="fixed top-14 right-4 z-50 slide-in-right"
      style={{
        width: 300,
        maxHeight: 400,
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

      <div className="flex border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
        <button
          onClick={() => setTab('friends')}
          className="flex-1 py-2 text-xs font-semibold transition-colors"
          style={{ color: tab === 'friends' ? '#d4af37' : '#6b7280', borderBottom: tab === 'friends' ? '2px solid #d4af37' : '2px solid transparent' }}
        >
          👥 Arkadaşlar {counts?.friendRequests > 0 && <span className="ml-1 bg-red-500 text-white rounded-full px-1.5 py-0.5 text-xs">{counts.friendRequests}</span>}
        </button>
        <button
          onClick={() => setTab('dms')}
          className="flex-1 py-2 text-xs font-semibold transition-colors"
          style={{ color: tab === 'dms' ? '#d4af37' : '#6b7280', borderBottom: tab === 'dms' ? '2px solid #d4af37' : '2px solid transparent' }}
        >
          💬 DM {counts?.unreadDMs > 0 && <span className="ml-1 bg-blue-500 text-white rounded-full px-1.5 py-0.5 text-xs">{counts.unreadDMs}</span>}
        </button>
      </div>

      <div className="overflow-y-auto flex-1">
        {tab === 'friends' && (
          <div>
            {friendRequests.length === 0 && (
              <div className="text-center text-gray-600 text-xs py-6">Bekleyen arkadaşlık isteği yok</div>
            )}
            {friendRequests.map((req) => (
              <div key={req.id} className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                <UserAvatar user={req.from} size={32} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-white truncate">{req.from.username}</div>
                  <div className="text-xs text-gray-500">Arkadaşlık isteği</div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => acceptRequest(req.from.id)} className="w-7 h-7 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors text-sm flex items-center justify-center">✓</button>
                  <button onClick={() => rejectRequest(req.from.id)} className="w-7 h-7 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors text-sm flex items-center justify-center">✕</button>
                </div>
              </div>
            ))}
          </div>
        )}
        {tab === 'dms' && (
          <div className="text-center text-gray-600 text-xs py-6">
            {counts?.unreadDMs > 0 ? `${counts.unreadDMs} okunmamış mesaj` : 'Okunmamış mesaj yok'}
            <br />
            <span className="text-gray-700">Profil kartından DM gönderin</span>
          </div>
        )}
      </div>
    </div>
  );
}
