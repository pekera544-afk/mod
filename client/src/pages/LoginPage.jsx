import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { brand } from '../config/brand';

export default function LoginPage() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showInstall, setShowInstall] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    const isPwa = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    if (isPwa) return;
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
    setIsIos(ios);
    const handler = (e) => { e.preventDefault(); setInstallPrompt(e); setShowInstall(true); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);
  const handleInstall = () => { if (!installPrompt) return; installPrompt.prompt(); installPrompt.userChoice.then(() => { setInstallPrompt(null); setShowInstall(false); }); };
  useEffect(() => { document.title = `${t('auth.login')} — ${brand.appTitle}`; }, [t]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await axios.post('/api/auth/login', form);
      login(res.data.token, res.data.user);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8"
      style={{ background: 'linear-gradient(160deg, #0a0005 0%, #1a0a1e 30%, #0f0800 60%, #0a0510 100%)' }}>
      <div className="w-full max-w-sm sm:max-w-md">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🎬</div>
          <h1 className="cinzel font-bold text-3xl gold-text mb-1">{brand.appTitle}</h1>
          <p className="text-gray-400 text-sm">{t('auth.loginTitle')}</p>
        </div>

        <div className="glass-card p-6 sm:p-8"
          style={{ boxShadow: '0 0 40px rgba(212,175,55,0.1), 0 0 80px rgba(155,89,182,0.06)' }}>

          {error && (
            <div className="mb-5 p-3 rounded-xl text-sm text-red-400 border border-red-400/20 bg-red-400/5">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5 font-semibold">{t('auth.email')}</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none focus:ring-1 focus:ring-gold-DEFAULT transition-all"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,175,55,0.2)' }}
                placeholder="ornek@email.com"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5 font-semibold">{t('auth.password')}</label>
              <input
                type="password"
                value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none focus:ring-1 focus:ring-gold-DEFAULT transition-all"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,175,55,0.2)' }}
                placeholder="••••••••"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-gold w-full py-3.5 text-sm font-bold disabled:opacity-60 mt-2"
            >
              {loading ? t('common.loading') : t('auth.login')}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            {t('auth.noAccount')}{' '}
            <Link to="/register" className="text-gold-DEFAULT hover:underline font-semibold">{t('auth.register')}</Link>
          </p>
          {(showInstall || isIos) && (
            <div className="mt-5 pt-4 border-t border-gold-DEFAULT/10 text-center">
              <p className="text-xs text-gray-500 mb-2">Uygulamayı cihazına yükle</p>
              {showInstall && (
                <button onClick={handleInstall} className="w-full py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all" style={{ background: 'rgba(212,175,55,0.15)', color: '#d4af37', border: '1px solid rgba(212,175,55,0.35)' }}>
                  <span>📲</span> Uygulamayı Yükle (PWA)
                </button>
              )}
              {isIos && !showInstall && (
                <div className="text-xs text-gray-400 px-3 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <span>📲</span> Safari'de <strong className="text-gray-300">Paylaş</strong> → <strong className="text-gray-300">Ana Ekrana Ekle</strong>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
