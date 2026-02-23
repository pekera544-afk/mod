import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
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

function NewsCard({ item }) {
  return (
    <Link to={`/news/${item.id}`}
      className="block rounded-2xl overflow-hidden transition-all hover:scale-[1.01] active:scale-[0.99]"
      style={{ background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.15)' }}>
      {item.imageUrl && (
        <div className="w-full aspect-video overflow-hidden">
          <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
        </div>
      )}
      <div className="p-4">
        <h2 className="text-white font-bold text-base leading-tight mb-1">{item.title}</h2>
        {item.description && (
          <p className="text-gray-400 text-sm line-clamp-3">{item.description}</p>
        )}
        <div className="flex items-center justify-between mt-3">
          <span className="text-xs" style={{ color: '#c084fc' }}>
            {new Date(item.createdAt).toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(168,85,247,0.15)', color: '#c084fc', border: '1px solid rgba(168,85,247,0.3)' }}>
            Devamını Oku →
          </span>
        </div>
      </div>
    </Link>
  );
}

function NewsDetail({ id }) {
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`/api/news/${id}`)
      .then(r => setItem(r.data))
      .catch(() => navigate('/news'))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  if (loading) return (
    <div className="text-center py-16 text-gray-500 text-sm animate-pulse">Yükleniyor...</div>
  );
  if (!item) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 pt-4 pb-24">
      <div className="flex items-center gap-3 mb-4">
        <BackButton />
        <Link to="/news" className="text-xs text-gray-500 hover:text-gray-300">← Haberler</Link>
      </div>

      <article className="rounded-2xl overflow-hidden"
        style={{ background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.18)' }}>
        {item.imageUrl && (
          <div className="w-full aspect-video overflow-hidden">
            <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
          </div>
        )}
        <div className="p-5">
          <div className="text-xs mb-3" style={{ color: '#c084fc' }}>
            📰 {new Date(item.createdAt).toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
          <h1 className="cinzel font-black text-xl text-white leading-tight mb-4">{item.title}</h1>
          {item.videoUrl && (
            <div className="mb-4 rounded-xl overflow-hidden aspect-video">
              <iframe
                src={item.videoUrl.replace('watch?v=', 'embed/')}
                className="w-full h-full"
                allowFullScreen
                title={item.title}
              />
            </div>
          )}
          {item.description && (
            <p className="text-gray-300 leading-relaxed whitespace-pre-wrap text-sm">{item.description}</p>
          )}
        </div>
      </article>
    </div>
  );
}

export default function NewsPage() {
  const { id } = useParams();
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) return;
    axios.get('/api/news')
      .then(r => setNews(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (id) return <NewsDetail id={id} />;

  return (
    <div className="min-h-screen pb-24" style={{ background: '#0a0a0f' }}>
      <div className="max-w-4xl mx-auto px-4 pt-4">
        <div className="flex items-center gap-3 mb-5">
          <BackButton />
          <h1 className="cinzel font-bold text-lg flex-1" style={{ color: '#c084fc' }}>📰 Haberler</h1>
        </div>

        {loading ? (
          <div className="text-center py-16 text-gray-500 text-sm animate-pulse">Haberler yükleniyor...</div>
        ) : news.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <div className="text-4xl">📰</div>
            <p className="text-gray-500 text-sm">Henüz haber yok</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {news.map(n => <NewsCard key={n.id} item={n} />)}
          </div>
        )}
      </div>
    </div>
  );
}
