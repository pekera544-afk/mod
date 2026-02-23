import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="glass-card p-8"
          style={{ boxShadow: '0 0 40px rgba(212,175,55,0.1)' }}>
          <div className="text-center mb-8">
            <div className="text-4xl mb-3">🎬</div>
            <h1 className="cinzel font-bold text-2xl gold-text">YOKO AJANS</h1>
            <p className="text-gray-400 text-sm mt-1">{t('auth.loginTitle')}</p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg text-sm text-red-400 border border-red-400/20 bg-red-400/5">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">{t('auth.email')}</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none focus:ring-1 focus:ring-gold-DEFAULT"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,175,55,0.2)' }}
                placeholder="admin@yokoajans.com"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">{t('auth.password')}</label>
              <input
                type="password"
                value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none focus:ring-1 focus:ring-gold-DEFAULT"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,175,55,0.2)' }}
                placeholder="••••••••"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-gold w-full py-3 text-sm disabled:opacity-60"
            >
              {loading ? t('common.loading') : t('auth.login')}
            </button>
          </form>

          <p className="text-center text-xs text-gray-500 mt-6">
            {t('auth.noAccount')}{' '}
            <Link to="/register" className="text-gold-DEFAULT hover:underline">{t('auth.register')}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
