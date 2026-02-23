import { useState } from 'react';
import axios from 'axios';

export default function PasswordPrompt({ roomId, roomTitle, onSuccess, onClose }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await axios.post(`/api/rooms/${roomId}/join`, { password });
      onSuccess(res.data.room);
    } catch (err) {
      setError(err.response?.data?.error || 'Hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm glass-card p-6"
        style={{ boxShadow: '0 0 40px rgba(212,175,55,0.15)' }}>
        <div className="text-center mb-5">
          <div className="text-3xl mb-2">🔒</div>
          <h3 className="cinzel font-bold text-lg gold-text">Şifreli Oda</h3>
          <p className="text-sm text-gray-400 mt-1">{roomTitle}</p>
        </div>

        {error && (
          <div className="mb-3 p-2.5 rounded-lg text-sm text-red-400 bg-red-400/10 border border-red-400/20 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="Oda şifresini girin..."
            autoFocus
            className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none focus:ring-1 focus:ring-gold-DEFAULT text-center"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,175,55,0.2)' }}
          />
          <button
            type="submit" disabled={loading}
            className="btn-gold w-full py-3 text-sm disabled:opacity-60"
          >
            {loading ? 'Kontrol ediliyor...' : 'Odaya Gir'}
          </button>
          <button type="button" onClick={onClose}
            className="w-full text-sm text-gray-500 hover:text-gray-300 transition-colors py-1">
            İptal
          </button>
        </form>
      </div>
    </div>
  );
}
