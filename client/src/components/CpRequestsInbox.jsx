import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import UserAvatar from './UserAvatar';
import { CP_META } from './AnimatedRelationshipEmoji';

export default function CpRequestsInbox({ onCountChange }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(null);

  const load = useCallback(() => {
    axios.get('/api/cp/requests/inbox')
      .then(r => { setRequests(r.data); onCountChange && onCountChange(r.data.length); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [onCountChange]);

  useEffect(() => { load(); }, [load]);

  const respond = async (requestId, action) => {
    setActing(requestId);
    try {
      await axios.post('/api/cp/respond', { requestId, action });
      setRequests(prev => prev.filter(r => r.id !== requestId));
      onCountChange && onCountChange(prev => Math.max(0, prev - 1));
    } catch (err) {
      alert(err.response?.data?.message || 'Hata oluştu');
    } finally {
      setActing(null);
    }
  };

  if (loading) return (
    <div className="text-center text-xs text-gray-500 py-6">Yükleniyor...</div>
  );

  if (requests.length === 0) return (
    <div className="text-center py-8">
      <div className="text-3xl mb-2">💫</div>
      <div className="text-xs text-gray-500">Bekleyen CP isteği yok</div>
    </div>
  );

  return (
    <div className="space-y-2 p-2">
      {requests.map(req => {
        const meta = CP_META[req.type];
        return (
          <div key={req.id} className="flex items-center gap-3 p-3 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <UserAvatar user={req.fromUser} size={36} />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-white truncate">{req.fromUser?.username}</div>
              <div className="flex items-center gap-1 mt-0.5">
                <span style={{ fontSize: 14 }}>{meta?.emoji}</span>
                <span className="text-xs font-bold" style={{ color: meta?.color }}>{meta?.label}</span>
                <span className="text-xs text-gray-500">isteği gönderdi</span>
              </div>
            </div>
            <div className="flex gap-1.5 flex-shrink-0">
              <button
                onClick={() => respond(req.id, 'ACCEPT')}
                disabled={acting === req.id}
                className="text-xs font-bold px-2.5 py-1.5 rounded-lg transition-all disabled:opacity-50"
                style={{ background: 'rgba(34,197,94,0.2)', color: '#86efac', border: '1px solid rgba(34,197,94,0.3)' }}
              >
                ✓
              </button>
              <button
                onClick={() => respond(req.id, 'REJECT')}
                disabled={acting === req.id}
                className="text-xs font-bold px-2.5 py-1.5 rounded-lg transition-all disabled:opacity-50"
                style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)' }}
              >
                ✕
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}