import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { brand } from '../config/brand';

export default function RegisterPage() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { document.title = `${t('auth.register')} — ${brand.appTitle}`; }, [t]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await axios.post('/api/auth/register', form);
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
          <p className="text-gray-400 text-sm">{t('auth.registerTitle')}</p>
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
              <label className="block text-xs text-gray-400 mb-1.5 font-semibold">{t('auth.username')}</label>
              <input
                type="text"
                value={form.username}
                onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none focus:ring-1 focus:ring-gold-DEFAULT transition-all"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,175,55,0.2)' }}
                placeholder="KullanıcıAdı"
                required
              />
            </div>
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
              {loading ? t('common.loading') : t('auth.register')}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            {t('auth.hasAccount')}{' '}
            <Link to="/login" className="text-gold-DEFAULT hover:underline font-semibold">{t('auth.login')}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
