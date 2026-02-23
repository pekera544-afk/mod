import { Outlet } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { Link } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import FloatingChat from './FloatingChat';
import LevelUpToast from './LevelUpToast';
import { useAuth } from '../context/AuthContext';
import { getLevelInfo } from './XpBar';

const TOAST_STYLES = {
  room:         { bg: 'rgba(212,175,55,0.12)',  border: 'rgba(212,175,55,0.3)',  icon: '🎬' },
  announcement: { bg: 'rgba(59,130,246,0.12)',  border: 'rgba(59,130,246,0.3)',  icon: '📢' },
  news:         { bg: 'rgba(168,85,247,0.12)',  border: 'rgba(168,85,247,0.3)',  icon: '📰' },
  mention:      { bg: 'rgba(34,197,94,0.12)',   border: 'rgba(34,197,94,0.3)',   icon: '💬' },
  event:        { bg: 'rgba(34,197,94,0.12)',   border: 'rgba(34,197,94,0.3)',   icon: '🎉' },
};

function ActivityToast({ item, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 6000);
    return () => clearTimeout(t);
  }, [onClose]);

  const style = TOAST_STYLES[item.type] || TOAST_STYLES.event;

  return (
    <div className="flex items-start gap-3 p-3 rounded-2xl slide-in-right"
      style={{ background: style.bg, border: `1px solid ${style.border}`, maxWidth: 280 }}>
      <span className="text-lg flex-shrink-0">{style.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-bold text-white truncate">{item.title}</div>
        <div className="text-xs text-gray-400 mt-0.5 truncate">{item.subtitle}</div>
        {item.type === 'room' && item.id && (
          <Link to={`/rooms/${item.id}`} onClick={onClose}
            className="text-xs font-semibold mt-1 inline-block" style={{ color: '#d4af37' }}>
            Odaya Git →
          </Link>
        )}
        {item.type === 'announcement' && (
          <Link to="/announcements" onClick={onClose}
            className="text-xs font-semibold mt-1 inline-block" style={{ color: '#60a5fa' }}>
            Duyuruya Git →
          </Link>
        )}
        {item.type === 'news' && item.id && (
          <Link to={`/news/${item.id}`} onClick={onClose}
            className="text-xs font-semibold mt-1 inline-block" style={{ color: '#c084fc' }}>
            Haberi Oku →
          </Link>
        )}
        {item.type === 'mention' && item.roomId && (
          <Link to={`/rooms/${item.roomId}`} onClick={onClose}
            className="text-xs font-semibold mt-1 inline-block" style={{ color: '#4ade80' }}>
            Odaya Git →
          </Link>
        )}
      </div>
      <button onClick={onClose} className="text-gray-500 hover:text-gray-300 flex-shrink-0 text-xs">✕</button>
    </div>
  );
}

function createSocket(token) {
  return io(window.location.origin, {
    auth: { token: token || '' },
    transports: ['websocket', 'polling']
  });
}

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [socket, setSocket] = useState(null);
  const [notifCounts, setNotifCounts] = useState({ friendRequests: 0, unreadDMs: 0 });
  const [xpInfo, setXpInfo] = useState(null);
  const [levelUpVal, setLevelUpVal] = useState(null);
  const [toasts, setToasts] = useState([]);
  const { user, updateUser } = useAuth();
  const socketRef = useRef(null);
  const prevUserIdRef = useRef(undefined);

  const addToast = (item) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev.slice(-2), { ...item, id }]);
    return id;
  };

  const removeToast = (id) => setToasts(prev => prev.filter(t => t.id !== id));

  useEffect(() => {
    const currentUserId = user?.id ?? null;
    if (prevUserIdRef.current === currentUserId) return;
    prevUserIdRef.current = currentUserId;

    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    const token = localStorage.getItem('yoko_token');
    const sock = createSocket(token);
    socketRef.current = sock;
    setSocket(sock);

    sock.on('xp_update', ({ xp, level, xpForNext }) => {
      const { progress } = getLevelInfo(xp, level);
      setXpInfo({ xp, level, xpForNext, progress });
      if (user) updateUser({ xp, level });
    });

    sock.on('level_up', ({ level }) => {
      setLevelUpVal(level);
    });

    sock.on('notification_counts', (counts) => {
      setNotifCounts(counts);
    });

    sock.on('friend_request_received', () => {
      setNotifCounts(prev => ({ ...prev, friendRequests: (prev.friendRequests || 0) + 1 }));
    });

    sock.on('new_room_opened', (data) => {
      addToast({
        type: 'room',
        id: data.id,
        title: `Yeni Oda: ${data.title}`,
        subtitle: `${data.ownerUsername} tarafından açıldı • ${data.movieTitle || ''}`,
      });
    });

    sock.on('new_announcement', (data) => {
      addToast({
        type: 'announcement',
        title: `Duyuru: ${data.titleTR}`,
        subtitle: 'Yeni duyuru yayınlandı',
      });
    });

    sock.on('new_event', (data) => {
      addToast({
        type: 'event',
        title: `Etkinlik: ${data.titleTR}`,
        subtitle: `Başlangıç: ${new Date(data.startTime).toLocaleDateString('tr-TR')}`,
      });
    });

    sock.on('new_news_published', (data) => {
      addToast({
        type: 'news',
        id: data.id,
        title: `Yeni Haber: ${data.title}`,
        subtitle: 'Yeni haber yayınlandı',
      });
    });

    sock.on('you_were_mentioned', (data) => {
      addToast({
        type: 'mention',
        roomId: data.roomId,
        title: `@${data.from} sizi etiketledi`,
        subtitle: data.content,
      });
    });

    return () => {
      sock.disconnect();
    };
  }, [user?.id]);

  useEffect(() => {
    if (user?.xp !== undefined) {
      const { progress } = getLevelInfo(user.xp, user.level || 1);
      setXpInfo({ xp: user.xp, level: user.level || 1, xpForNext: 0, progress });
    }
  }, [user?.xp, user?.level]);

  return (
    <div className="min-h-screen bg-cinema-dark relative">
      <Navbar
        onMenuClick={() => setSidebarOpen(true)}
        socket={socket}
        notifCounts={notifCounts}
        setNotifCounts={setNotifCounts}
        xpInfo={xpInfo}
      />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <main className="pt-16">
        <Outlet context={{ socket }} />
      </main>
      <FloatingChat socket={socket} />

      {levelUpVal && (
        <LevelUpToast level={levelUpVal} onDone={() => setLevelUpVal(null)} />
      )}

      {toasts.length > 0 && (
        <div className="fixed bottom-6 right-4 z-50 space-y-2 pointer-events-auto">
          {toasts.map(t => (
            <ActivityToast key={t.id} item={t} onClose={() => removeToast(t.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
