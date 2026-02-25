import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { CP_META } from './AnimatedRelationshipEmoji';

const CP_TYPES = Object.entries(CP_META).map(([key, val]) => ({ key, ...val }));

export default function CpButton({ friendId }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const sendRequest = async (type) => {
    setOpen(false);
    setLoading(true);
    try {
      await axios.post('/api/cp/request', { toUserId: friendId, type });
      showToast(`${CP_META[type].label} isteği gönderildi!`);
    } catch (err) {
      showToast(err.response?.data?.message || 'Hata oluştu', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div ref={ref} className="relative" style={{ display: 'inline-block' }}>
      {toast && (
        <div className="fixed bottom-4 right-4 z-50 px-4 py-2.5 rounded-xl text-sm font-semibold shadow-xl"
          style={{
            background: toast.type === 'error' ? 'rgba(239,68,68,0.95)' : 'rgba(34,197,94,0.95)',
            color: '#fff',
            animation: 'fadeInUp 0.2s ease'
          }}>
          {toast.msg}
        </div>
      )}
      <button
        onClick={() => setOpen(o => !o)}
        disabled={loading}
        className="text-xs font-bold px-2 py-1 rounded-lg transition-all disabled:opacity-50 flex items-center gap-1"
        style={{ background: 'rgba(212,175,55,0.15)', color: '#d4af37', border: '1px solid rgba(212,175,55,0.3)' }}
      >
        {loading ? '⏳' : '💫'} CP
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-1 rounded-xl overflow-hidden shadow-2xl"
          style={{ background: 'rgba(15,15,22,0.98)', border: '1px solid rgba(212,175,55,0.2)', minWidth: 150 }}>
          {CP_TYPES.map(t => (
            <button key={t.key} onClick={() => sendRequest(t.key)}
              className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-white/5 transition-colors"
              style={{ color: t.color, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <span>{t.emoji}</span>
              <span className="font-medium text-white" style={{ fontSize: 12 }}>{t.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}