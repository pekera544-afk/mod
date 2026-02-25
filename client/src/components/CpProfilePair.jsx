import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import UserAvatar from './UserAvatar';
import AnimatedRelationshipEmoji, { CP_META } from './AnimatedRelationshipEmoji';

const CP_PRIORITY_ORDER = ['SEVGILI','KARI_KOCA','KANKA','ARKADAS','ABI','ABLA','ANNE','BABA'];

function CpChip({ rel, onRemove, isMe }) {
  const meta = CP_META[rel.type];
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full"
      style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${meta?.color}33` }}>
      <span style={{ fontSize: 14 }}>{meta?.emoji}</span>
      <span className="text-xs font-semibold" style={{ color: meta?.color }}>{meta?.label}</span>
      <UserAvatar user={rel.partner} size={18} />
      <span className="text-xs text-gray-400">{rel.partner?.username}</span>
      {isMe && (
        <button onClick={(e) => { e.stopPropagation(); onRemove && onRemove(rel.id); }}
          className="text-gray-600 hover:text-red-400 transition-colors ml-1"
          style={{ fontSize: 10 }}>✕</button>
      )}
    </div>
  );
}

export default function CpProfilePair({ userId, isMe = false, profileUser, socket, onOpenProfile }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [settingPrimary, setSettingPrimary] = useState(false);

  const load = useCallback(() => {
    if (!userId) return;
    setLoading(true);
    axios.get(`/api/cp/relations/${userId}`)
      .then(r => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!socket) return;
    const onRemoved = () => load();
    const onAdded = () => load();
    socket.on('cp_relation_removed', onRemoved);
    socket.on('cp_relation_added', onAdded);
    return () => {
      socket.off('cp_relation_removed', onRemoved);
      socket.off('cp_relation_added', onAdded);
    };
  }, [socket, load]);

  const handleRemove = async (relId) => {
    if (!window.confirm('Bu iliskiyi kaldirmak istiyor musun?')) return;
    try {
      await axios.delete('/api/cp/remove', { data: { relationId: relId } });
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Hata olustu');
    }
  };

  const handleSetPrimary = async (relId) => {
    setSettingPrimary(true);
    try {
      await axios.post('/api/cp/primary', { relationId: relId });
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Hata olustu');
    } finally {
      setSettingPrimary(false);
    }
  };

  if (loading) return null;
  if (!data || data.relations.length === 0) return null;

  const { mainDisplay, relations, primaryDisplayRelationId } = data;
  const hasSevgili = relations.some(r => r.type === 'SEVGILI');
  const otherRelations = relations
    .filter(r => r.id !== mainDisplay?.id)
    .sort((a, b) => CP_PRIORITY_ORDER.indexOf(a.type) - CP_PRIORITY_ORDER.indexOf(b.type));

  return (
    <div className="w-full">
      {mainDisplay && (
        <div className="flex flex-col items-center mb-3">
          <div className="flex items-center justify-center gap-4 w-full">
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <UserAvatar user={profileUser} size={48} />
              <span className="text-xs text-gray-300 font-semibold truncate max-w-16 text-center">
                {profileUser?.username}
              </span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <AnimatedRelationshipEmoji type={mainDisplay.type} size={60} />
              <span className="text-xs font-bold" style={{ color: CP_META[mainDisplay.type]?.color }}>
                {CP_META[mainDisplay.type]?.label}
              </span>
            </div>
            <div className="flex flex-col items-center gap-1 flex-shrink-0 cursor-pointer"
              onClick={() => onOpenProfile && onOpenProfile(mainDisplay.partner?.id)}>
              <UserAvatar user={mainDisplay.partner} size={48} />
              <span className="text-xs text-gray-300 font-semibold truncate max-w-16 text-center">
                {mainDisplay.partner?.username}
              </span>
            </div>
          </div>
          {isMe && (
            <button onClick={() => handleRemove(mainDisplay.id)}
              className="mt-2 text-xs text-red-400 hover:text-red-300 transition-colors">
              Sil
            </button>
          )}
        </div>
      )}

      {otherRelations.length > 0 && (
        <div className="mb-2">
          <div className="text-xs text-gray-500 mb-1.5 px-1">Diger Iliskiler</div>
          <div className="flex flex-wrap gap-1.5">
            {otherRelations.map(rel => (
              <CpChip key={rel.id} rel={rel} onRemove={handleRemove} isMe={isMe} />
            ))}
          </div>
        </div>
      )}

      {isMe && relations.length > 1 && (
        <div className="mt-2 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="text-xs text-gray-400 mb-2 font-semibold">Profilde Yaninda Kim Gozuksun?</div>
          {hasSevgili && (
            <div className="text-xs text-pink-400 mb-2 px-2 py-1 rounded-lg"
              style={{ background: 'rgba(236,72,153,0.08)', border: '1px solid rgba(236,72,153,0.2)' }}>
              Sevgili her zaman onceliklidir.
            </div>
          )}
          <div className="space-y-1">
            {relations.map(rel => {
              const meta = CP_META[rel.type];
              const isSelected = rel.id === primaryDisplayRelationId;
              return (
                <button key={rel.id}
                  onClick={() => handleSetPrimary(rel.id)}
                  disabled={settingPrimary}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left transition-all disabled:opacity-50"
                  style={{
                    background: isSelected ? `${meta?.color}18` : 'rgba(255,255,255,0.03)',
                    border: isSelected ? `1px solid ${meta?.color}44` : '1px solid rgba(255,255,255,0.06)'
                  }}>
                  <span style={{ fontSize: 15 }}>{meta?.emoji}</span>
                  <span className="text-xs font-semibold" style={{ color: meta?.color }}>{meta?.label}</span>
                  <span className="text-xs text-gray-500">ile</span>
                  <UserAvatar user={rel.partner} size={16} />
                  <span className="text-xs text-gray-300 flex-1">{rel.partner?.username}</span>
                  {isSelected && <span className="text-xs font-bold text-green-400">✓ Secili</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}