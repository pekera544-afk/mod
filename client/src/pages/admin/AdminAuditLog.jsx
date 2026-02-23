import { useState, useEffect } from 'react';
import axios from 'axios';

const actionColors = {
  CREATE: '#22c55e',
  UPDATE: '#d4af37',
  DELETE: '#ef4444',
  PUBLISH: '#a855f7',
  DEFAULT: '#6b7280'
};

export default function AdminAuditLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/api/admin/audit-log')
      .then(r => setLogs(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const getColor = (action) => {
    for (const [key, color] of Object.entries(actionColors)) {
      if (action.includes(key)) return color;
    }
    return actionColors.DEFAULT;
  };

  if (loading) return <div className="gold-text cinzel text-sm">Yükleniyor...</div>;

  return (
    <div className="max-w-3xl space-y-4">
      <div>
        <h2 className="cinzel font-bold text-xl gold-text mb-1">İşlem Geçmişi</h2>
        <p className="text-gray-400 text-sm">Son 100 admin işlemi</p>
      </div>

      <div className="space-y-2">
        {logs.length === 0 ? (
          <div className="glass-card p-6 text-center text-gray-500">Henüz işlem yok</div>
        ) : logs.map(log => (
          <div key={log.id} className="glass-card p-3 flex items-start gap-3">
            <div className="text-xs font-bold px-2 py-0.5 rounded flex-shrink-0 mt-0.5"
              style={{ background: `${getColor(log.action)}20`, color: getColor(log.action), border: `1px solid ${getColor(log.action)}30` }}>
              {log.action}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-white">{log.target}</div>
              {log.detail && <div className="text-xs text-gray-500 mt-0.5 truncate">{log.detail}</div>}
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-xs text-gray-400">{log.admin?.username}</div>
              <div className="text-xs text-gray-600">{new Date(log.createdAt).toLocaleString('tr-TR')}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
