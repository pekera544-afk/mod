import { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function AdminBackup() {
  const { token } = useAuth();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [restoreConfirm, setRestoreConfirm] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileRef = useRef();

  async function handleBackup() {
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch('/api/admin/backup', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Yedek alınamadı');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const date = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `backup_${date}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setStatus({ type: 'success', msg: 'Yedek başarıyla indirildi.' });
    } catch (e) {
      setStatus({ type: 'error', msg: e.message });
    } finally {
      setLoading(false);
    }
  }

  function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setSelectedFile(file);
    setRestoreConfirm(false);
    setStatus(null);
  }

  async function handleRestore() {
    if (!selectedFile) return;
    setLoading(true);
    setStatus(null);
    try {
      const text = await selectedFile.text();
      const json = JSON.parse(text);
      const res = await fetch('/api/admin/restore', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(json)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Yedek yüklenemedi');
      setStatus({ type: 'success', msg: data.message || 'Yedek başarıyla yüklendi!' });
      setSelectedFile(null);
      setRestoreConfirm(false);
      if (fileRef.current) fileRef.current.value = '';
    } catch (e) {
      setStatus({ type: 'error', msg: e.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="cinzel font-bold text-xl" style={{ color: '#d4af37' }}>Veri Yedekleme & Geri Yükleme</h2>
        <p className="text-sm text-gray-400 mt-1">
          Tüm kullanıcılar, odalar, mesajlar, seviyeler ve site ayarlarını yedekle veya geri yükle.
        </p>
      </div>

      {status && (
        <div className="px-4 py-3 rounded-lg text-sm font-medium"
          style={{
            background: status.type === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
            border: `1px solid ${status.type === 'success' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
            color: status.type === 'success' ? '#4ade80' : '#f87171'
          }}>
          {status.msg}
        </div>
      )}

      <div className="rounded-xl p-5 space-y-3"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(212,175,55,0.15)' }}>
        <div className="flex items-center gap-3">
          <div className="text-2xl">💾</div>
          <div>
            <div className="font-semibold text-white">Yedek Al</div>
            <div className="text-xs text-gray-400">
              Tüm veritabanı JSON formatında bilgisayarına indirilir.
              Kullanıcı şifreleri (hash), odalar, mesajlar, CP ilişkileri dahil her şey.
            </div>
          </div>
        </div>
        <button
          onClick={handleBackup}
          disabled={loading}
          className="w-full py-2.5 rounded-lg font-semibold text-sm transition-all"
          style={{
            background: loading ? 'rgba(212,175,55,0.2)' : 'rgba(212,175,55,0.9)',
            color: loading ? '#9ca3af' : '#0f0f14',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}>
          {loading ? 'İşleniyor...' : '⬇ Yedeği İndir'}
        </button>
      </div>

      <div className="rounded-xl p-5 space-y-3"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(239,68,68,0.2)' }}>
        <div className="flex items-center gap-3">
          <div className="text-2xl">📤</div>
          <div>
            <div className="font-semibold text-white">Yedekten Geri Yükle</div>
            <div className="text-xs text-gray-400">
              Mevcut tüm veriler silinir ve yedek dosyasındaki veriler yüklenir.
              Bu işlem geri alınamaz. Önce yedek al!
            </div>
          </div>
        </div>

        <div>
          <input
            ref={fileRef}
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="hidden"
            id="backup-file"
          />
          <label htmlFor="backup-file"
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-sm cursor-pointer transition-all"
            style={{
              border: '2px dashed rgba(255,255,255,0.15)',
              color: selectedFile ? '#4ade80' : '#9ca3af',
              background: selectedFile ? 'rgba(34,197,94,0.05)' : 'transparent'
            }}>
            {selectedFile ? `✓ ${selectedFile.name}` : '📁 JSON yedek dosyası seç'}
          </label>
        </div>

        {selectedFile && !restoreConfirm && (
          <button
            onClick={() => setRestoreConfirm(true)}
            className="w-full py-2.5 rounded-lg font-semibold text-sm transition-all"
            style={{
              background: 'rgba(239,68,68,0.15)',
              border: '1px solid rgba(239,68,68,0.4)',
              color: '#f87171'
            }}>
            ⚠ Geri Yükle (Tüm Veri Silinecek)
          </button>
        )}

        {restoreConfirm && (
          <div className="rounded-lg p-4 space-y-3"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)' }}>
            <p className="text-sm font-semibold text-red-400 text-center">
              UYARI: Mevcut tüm veriler kalıcı olarak silinecek ve yedeğin içindekiler yüklenecek.
              Emin misin?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setRestoreConfirm(false)}
                className="flex-1 py-2 rounded-lg text-sm transition-all"
                style={{ background: 'rgba(255,255,255,0.06)', color: '#9ca3af', border: '1px solid rgba(255,255,255,0.1)' }}>
                İptal
              </button>
              <button
                onClick={handleRestore}
                disabled={loading}
                className="flex-1 py-2 rounded-lg font-bold text-sm transition-all"
                style={{
                  background: loading ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.8)',
                  color: 'white',
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}>
                {loading ? 'Yükleniyor...' : 'EVET, GERİ YÜKLE'}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-xl p-4 text-xs text-gray-500 space-y-1"
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="font-semibold text-gray-400">Yedekte Ne Var?</div>
        <div>👤 Kullanıcılar (şifreler, roller, seviyeler, XP, avatar, VIP)</div>
        <div>🎬 Odalar ve oda ayarları</div>
        <div>💬 Tüm mesajlar (oda & global & DM)</div>
        <div>👫 Arkadaşlıklar ve CP ilişkileri</div>
        <div>📢 Duyurular, etkinlikler, haberler</div>
        <div>⚙ Site ve PWA ayarları</div>
      </div>
    </div>
  );
}
