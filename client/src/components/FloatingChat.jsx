import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import GlobalChatPanel from './GlobalChatPanel';

export default function FloatingChat({ socket }) {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const isRoomPage = pathname.startsWith('/rooms/');

  return (
    <>
      <button
        onClick={() => setOpen(o => !o)}
        className={"fixed z-30 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 " + (isRoomPage ? "bottom-20 left-4" : "bottom-6 right-6")}
        style={{
          background: open
            ? 'linear-gradient(135deg, #a88a20, #7a640f)'
            : 'linear-gradient(135deg, #d4af37, #a88a20)',
          boxShadow: '0 0 20px rgba(212,175,55,0.5), 0 4px 15px rgba(0,0,0,0.4)'
        }}
        aria-label="Global Chat"
      >
        {open ? (
          <svg width="22" height="22" fill="none" stroke="#0f0f14" strokeWidth="2.5" viewBox="0 0 24 24">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg width="24" height="24" fill="none" stroke="#0f0f14" strokeWidth="2.5" viewBox="0 0 24 24">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        )}
      </button>

      {open && <GlobalChatPanel onClose={() => setOpen(false)} socket={socket} />}
    </>
  );
}
