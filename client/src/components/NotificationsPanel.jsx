import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import UserAvatar from './UserAvatar';
import UserProfileCard from './UserProfileCard';

export default function NotificationsPanel({ socket, counts, setNotifCounts, onClose }) {
  const { user } = useAuth();
  const [friendRequests, setFriendRequests] = useState([]);
  const [friends, setFriends] = useState([]);
  const [tab, setTab] = useState('requests');
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

  return (
    <>
      <div
        className="fixed top-14 right-4 z-50 slide-in-right"
        style={{
          width: 320,
          maxHeight: 480,
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
            onClick={() => setTab('requests')}
            className="flex-1 py-2.5 text-xs font-semibold transition-colors flex items-center justify-center gap-1"
            style={{ color: tab === 'requests' ? '#d4af37' : '#6b7280', borderBottom: tab === 'requests' ? '2px solid #d4af37' : '2px solid transparent' }}
          >
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
            style={{ color: tab === 'friends' ? '#d4af37' : '#6b7280', borderBottom: tab === 'friends' ? '2px solid #d4af37' : '2px solid transparent' }}
          >
            👥 Arkadaşlar
            {friends.length > 0 && (
              <span className="rounded-full px-1.5 py-0.5" style={{ fontSize: 9, background: 'rgba(212,175,55,0.2)', color: '#d4af37', minWidth: 16, textAlign: 'center' }}>
                {friends.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab('dms')}
            className="flex-1 py-2.5 text-xs font-semibold transition-colors flex items-center justify-center gap-1"
            style={{ color: tab === 'dms' ? '#d4af37' : '#6b7280', borderBottom: tab === 'dms' ? '2px solid #d4af37' : '2px solid transparent' }}
          >
            💬 DM
            {counts?.unreadDMs > 0 && (
              <span className="bg-blue-500 text-white rounded-full px-1.5 py-0.5" style={{ fontSize: 9, minWidth: 16, textAlign: 'center' }}>
                {counts.unreadDMs}
              </span>
            )}
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {tab === 'requests' && (
            <div>
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
                      <div
                        className="text-sm font-semibold text-white truncate cursor-pointer hover:underline"
                        onClick={() => setProfileId(req.from.id)}
                      >
                        {req.from.username}
                      </div>
                      <div className="text-xs text-gray-500">Arkadaşlık isteği gönderdi</div>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => acceptRequest(req.from.id)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-sm transition-colors"
                        style={{ background: 'rgba(34,197,94,0.2)', color: '#4ade80' }}
                        title="Kabul Et"
                      >
                        ✓
                      </button>
                      <button
                        onClick={() => rejectRequest(req.from.id)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-sm transition-colors"
                        style={{ background: 'rgba(239,68,68,0.2)', color: '#f87171' }}
                        title="Reddet"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === 'friends' && (
            <div>
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
                      <div className="text-sm font-semibold text-white truncate hover:underline">
                        {friend.username}
                      </div>
                      {friend.vip && (
                        <div className="text-xs" style={{ color: '#c084fc' }}>💎 VIP</div>
                      )}
                    </div>
                    <button
                      onClick={() => removeFriend(friend.id)}
                      className="text-xs text-gray-600 hover:text-red-400 transition-colors px-2 py-1 rounded"
                      title="Arkadaşlıktan Çıkar"
                    >
                      ✕
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === 'dms' && (
            <div className="text-center text-gray-600 text-xs py-8">
              <div className="text-2xl mb-2">💬</div>
              {counts?.unreadDMs > 0 ? (
                <span className="text-blue-400 font-semibold">{counts.unreadDMs} okunmamış mesaj</span>
              ) : (
                'Okunmamış mesaj yok'
              )}
              <br />
              <span className="text-gray-700 mt-1 block">Profil kartından DM gönderin</span>
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
