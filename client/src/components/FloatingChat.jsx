import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function FloatingChat() {
  const [pulse, setPulse] = useState(true);
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate('/')}
      className="fixed bottom-6 right-6 z-30 w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110"
      style={{
        background: 'linear-gradient(135deg, #d4af37, #a88a20)',
        boxShadow: '0 0 20px rgba(212,175,55,0.5), 0 4px 15px rgba(0,0,0,0.4)'
      }}
      aria-label="Quick Chat"
    >
      <svg width="24" height="24" fill="none" stroke="#0f0f14" strokeWidth="2.5" viewBox="0 0 24 24">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    </button>
  );
}
