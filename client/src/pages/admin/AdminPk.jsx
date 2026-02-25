import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const EMPTY_FORM = {
  title: '', type: 'KISI', status: 'UPCOMING',
  startTime: '', description: '', teamAName: '', teamBName: '',
  membersA: [{ name: '' }, { name: '' }],
  membersB: [{ name: '' }, { name: '' }],
};

function MemberList({ label, members, onChange }) {
  const add = () => { if (members.length >= 10) return; onChange([...members, { name: '' }]); };
  const remove = (i) => { if (members.length <= 2) return; onChange(members.filter((_,j) => j !== i)); };
  const setName = (i, v) => onChange(members.map((m,j) => j === i ? { ...m, name: v } : m));

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs text-gray-400 font-semibold">{label} ({members.length}/10)</label>
        <button type="button" onClick={add}
          className="text-xs px-2 py-0.5 rounded" style={{ background: 'rgba(212,175,55,0.1)', color: '#d4af37' }}>+ Üye</button>
      </div>
      <div className="space-y-1">
        {members.map((m, i) => (
          <div key={i} className="flex gap-2">
            <input value={m.name} onChange={e => setName(i, e.target.value)}
              placeholder={`Üye ${i+1} adı`}
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white outline-none" />
            {members.length > 2 && (
              <button type="button" onClick={() => remove(i)} className="text-red-400 hover:text-red-300 text-xs px-2">✕</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminPk() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    axios.get('/api/pk').then(r => setMatches(r.data)).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleEdit = (m) => {
    setEditId(m.id);
    setForm({
      title: m.title, type: m.type, status: m.status,
      startTime: new Date(m.startTime).toISOString().slice(0,16),
      description: m.description || '',
      teamAName: m.teamAName, teamBName: m.teamBName,
      membersA: m.membersA?.length ? m.membersA.map(x => ({ name: x.name })) : [{ name: '' }, { name: '' }],
      membersB: m.membersB?.length ? m.membersB.map(x => ({ name: x.name })) : [{ name: '' }, { name: '' }],
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Silmek istiyor musun?')) return;
    await axios.delete(`/api/pk/${id}`);
    load();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const validA = form.membersA.filter(m => m.name.trim());
    const validB = form.membersB.filter(m => m.name.trim());
    if (validA.length < 2) { setError('Takim A en az 2 üye'); return; }
    if (validB.length < 2) { setError('Takim B en az 2 üye'); return; }
    setSaving(true);
    try {
      const payload = { ...form, membersA: validA, membersB: validB };
      if (editId) await axios.put(`/api/pk/${editId}`, payload);
      else await axios.post('/api/pk', payload);
      setForm(EMPTY_FORM);
      setEditId(null);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  const STATUS_COLORS = { UPCOMING: '#d4af37', LIVE: '#22c55e', ENDED: '#6b7280', CANCELED: '#ef4444' };
  const STATUS_LABELS = { UPCOMING: 'Yaklaşan', LIVE: 'Canlı', ENDED: 'Bitti', CANCELED: 'İptal' };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <h2 className="text-base font-bold text-white mb-4">{editId ? '✏️ PK Düzenle' : '⚔️ Yeni PK Oluştur'}</h2>
        {error && <div className="mb-3 text-sm text-red-400 bg-red-500/10 px-3 py-2 rounded-lg">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-3">
          <input required value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
            placeholder="PK Başlığı (örn: Ali vs Mehmet)"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none" />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Tür</label>
              <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                className="w-full bg-gray-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none">
                <option value="KISI">👤 Kişi PK</option>
                <option value="AJANS">🏢 Ajans PK</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Durum</label>
              <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                className="w-full bg-gray-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none">
                {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Tarih & Saat</label>
            <input required type="datetime-local" value={form.startTime}
              onChange={e => setForm(p => ({ ...p, startTime: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none" />
          </div>
          <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            placeholder="Açıklama (opsiyonel)" rows={2}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none resize-none" />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <input required value={form.teamAName} onChange={e => setForm(p => ({ ...p, teamAName: e.target.value }))}
                placeholder="Takim A Adı"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none mb-2" />
              <MemberList label="Takim A" members={form.membersA} onChange={v => setForm(p => ({ ...p, membersA: v }))} />
            </div>
            <div>
              <input required value={form.teamBName} onChange={e => setForm(p => ({ ...p, teamBName: e.target.value }))}
                placeholder="Takim B Adı"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none mb-2" />
              <MemberList label="Takim B" members={form.membersB} onChange={v => setForm(p => ({ ...p, membersB: v }))} />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all"
              style={{ background: 'rgba(212,175,55,0.2)', color: '#d4af37', border: '1px solid rgba(212,175,55,0.3)' }}>
              {saving ? 'Kaydediliyor...' : editId ? 'Güncelle' : 'Oluştur'}
            </button>
            {editId && (
              <button type="button" onClick={() => { setEditId(null); setForm(EMPTY_FORM); setError(''); }}
                className="px-4 py-2.5 rounded-xl text-sm text-gray-400"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                İptal
              </button>
            )}
          </div>
        </form>
      </div>

      <div>
        <h2 className="text-base font-bold text-white mb-3">PK Listesi</h2>
        {loading ? <div className="text-gray-500 text-sm">Yükleniyor...</div> : (
          <div className="space-y-2">
            {matches.map(m => (
              <div key={m.id} className="flex items-center justify-between gap-3 rounded-xl px-4 py-3"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-white text-sm truncate">{m.title}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs font-bold" style={{ color: STATUS_COLORS[m.status] }}>{STATUS_LABELS[m.status]}</span>
                    <span className="text-xs text-gray-500">•</span>
                    <span className="text-xs text-gray-500">{m.type === 'KISI' ? 'Kişi' : 'Ajans'}</span>
                    <span className="text-xs text-gray-500">•</span>
                    <span className="text-xs text-gray-500">{new Date(m.startTime).toLocaleDateString('tr-TR')}</span>
                  </div>
                  <div className="text-xs text-gray-600 mt-0.5">{m.teamAName} vs {m.teamBName}</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(m)} className="text-xs px-3 py-1.5 rounded-lg"
                    style={{ background: 'rgba(212,175,55,0.1)', color: '#d4af37' }}>Düzenle</button>
                  <button onClick={() => handleDelete(m.id)} className="text-xs px-3 py-1.5 rounded-lg"
                    style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171' }}>Sil</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}