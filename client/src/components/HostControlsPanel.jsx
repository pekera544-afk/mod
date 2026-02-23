import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function HostControlsPanel({ room, socket, roomState, onSettingsChange }) {
  const navigate = useNavigate();
  const [newMovieTitle, setNewMovieTitle] = useState(room.movieTitle || '');
  const [editingTitle, setEditingTitle] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);

  const toggleSetting = (key, val) => {
    socket?.emit('room_settings_changed', { roomId: room.id, [key]: val });
    onSettingsChange?.({ [key]: val });
  };

  const updateMovieTitle = async () => {
    if (!newMovieTitle.trim()) return;
    setSaving(true);
    try {
      await axios.put(`/api/rooms/${room.id}`, { movieTitle: newMovieTitle });
      socket?.emit('room_settings_changed', { roomId: room.id, movieTitle: newMovieTitle });
      setEditingTitle(false);
    } catch {}
    setSaving(false);
  };

  const deleteRoom = async () => {
    try {
      socket?.emit('room_deleted', { roomId: room.id });
      await axios.delete(`/api/rooms/${room.id}`);
      navigate('/');
    } catch {}
  };

  return (
    <div className="space-y-3 p-3"
      style={{ background: 'rgba(212,175,55,0.04)', border: '1px solid rgba(212,175,55,0.15)', borderRadius: '12px' }}>
      <div className="text-xs font-bold text-gold-DEFAULT uppercase tracking-widest flex items-center gap-1.5">
        🎬 Host Kontrolleri
      </div>

      <div className="space-y-2">
        <div className="text-xs text-gray-400 font-semibold">Film / Dizi Adı</div>
        {editingTitle ? (
          <div className="flex gap-1.5">
            <input
              value={newMovieTitle} onChange={e => setNewMovieTitle(e.target.value)}
              className="flex-1 px-2 py-1.5 rounded-lg text-white text-xs outline-none"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,175,55,0.3)' }}
              onKeyDown={e => e.key === 'Enter' && updateMovieTitle()}
            />
            <button onClick={updateMovieTitle} disabled={saving}
              className="btn-gold px-2.5 py-1.5 text-xs">✓</button>
            <button onClick={() => setEditingTitle(false)}
              className="text-gray-400 px-2 text-xs hover:text-white">✕</button>
          </div>
        ) : (
          <button onClick={() => setEditingTitle(true)}
            className="w-full text-left px-3 py-2 rounded-lg text-xs text-gray-200 flex items-center justify-between hover:bg-white/5 transition-colors"
            style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
            <span>{room.movieTitle || 'Film adı yok'}</span>
            <span className="text-gray-500 text-xs">✎</span>
          </button>
        )}
      </div>

      <div className="space-y-2 border-t border-white/5 pt-2">
        <div className="text-xs text-gray-400 font-semibold">Canlı Ayarlar</div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-300">💬 Sohbet</span>
          <ToggleBtn
            value={roomState?.chatEnabled !== false}
            onChange={v => toggleSetting('chatEnabled', v)}
          />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-300">🛡️ Anti-Spam</span>
          <ToggleBtn
            value={roomState?.spamProtectionEnabled !== false}
            onChange={v => toggleSetting('spamProtectionEnabled', v)}
          />
        </div>
      </div>

      <div className="border-t border-white/5 pt-2">
        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            className="w-full py-2 rounded-lg text-xs font-semibold text-red-400 border border-red-400/20 bg-red-400/5 hover:bg-red-400/10 transition-colors"
          >
            🗑️ Odayı Kapat
          </button>
        ) : (
          <div className="space-y-1.5">
            <p className="text-xs text-red-300 text-center">Odayı kapatmak istediğinizden emin misiniz?</p>
            <div className="flex gap-1.5">
              <button onClick={deleteRoom}
                className="flex-1 py-2 rounded-lg text-xs font-bold text-red-400 bg-red-400/10 border border-red-400/30 hover:bg-red-400/20 transition-colors">
                Evet, Kapat
              </button>
              <button onClick={() => setConfirmDelete(false)}
                className="flex-1 py-2 rounded-lg text-xs text-gray-400 bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                İptal
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ToggleBtn({ value, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`w-9 h-5 rounded-full relative transition-colors flex-shrink-0 ${value ? 'bg-gold-DEFAULT' : 'bg-gray-700'}`}
    >
      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-4' : 'translate-x-0.5'}`} />
    </button>
  );
}
