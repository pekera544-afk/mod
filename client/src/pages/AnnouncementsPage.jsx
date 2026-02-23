import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function BackButton() {
  const navigate = useNavigate();
  return (
    <button onClick={() => navigate(-1)}
      className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors text-sm">
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <polyline points="15 18 9 12 15 6" />
      </svg>
      Geri
    </button>
  );
}

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/api/announcements')
      .then(r => setAnnouncements(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen pb-24" style={{ background: '#0a0a0f' }}>
      <div className="max-w-lg mx-auto px-4 pt-4">
        <div className="flex items-center gap-3 mb-6">
          <BackButton />
          <h1 className="cinzel font-bold text-lg gold-text">📢 Duyurular</h1>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500 text-sm animate-pulse">Yükleniyor...</div>
        ) : announcements.length === 0 ? (
          <div className="text-center py-12 text-gray-600 text-sm">Henüz duyuru yok</div>
        ) : (
          <div className="space-y-3">
            {announcements.map(ann => (
              <div key={ann.id} className="p-4 rounded-2xl"
                style={{
                  background: ann.pinned ? 'rgba(212,175,55,0.07)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${ann.pinned ? 'rgba(212,175,55,0.3)' : 'rgba(255,255,255,0.07)'}`,
                }}>
                {ann.pinned && (
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(212,175,55,0.2)', color: '#d4af37' }}>
                      📌 Sabitlenmiş
                    </span>
                  </div>
                )}
                <h3 className="text-white font-bold text-sm mb-1">{ann.titleTR}</h3>
                {ann.contentTR && (
                  <p className="text-gray-400 text-sm leading-relaxed">{ann.contentTR}</p>
                )}
                <p className="text-xs text-gray-600 mt-2">
                  {new Date(ann.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
