import { Outlet } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import FloatingChat from './FloatingChat';
import LevelUpToast from './LevelUpToast';
import { useAuth } from '../context/AuthContext';
import { getLevelInfo } from './XpBar';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [socket, setSocket] = useState(null);
  const [notifCounts, setNotifCounts] = useState({ friendRequests: 0, unreadDMs: 0 });
  const [xpInfo, setXpInfo] = useState(null);
  const [levelUpVal, setLevelUpVal] = useState(null);
  const { user, updateUser } = useAuth();
  const socketRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('yoko_token');
    const sock = io(window.location.origin, {
      auth: { token: token || '' },
      transports: ['websocket', 'polling']
    });
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

    return () => {
      sock.disconnect();
    };
  }, []);

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
    </div>
  );
}
