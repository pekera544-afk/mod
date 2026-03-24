import { useState } from 'react';

const SEAT_MODES = [
  { key: 'couple', label: '💕 Sevgili (2)', count: 2 },
  { key: 'friends_2', label: '👥 Arkadaş (2)', count: 2 },
  { key: 'friends_3', label: '👥 Arkadaş (3)', count: 3 },
  { key: 'friends_4', label: '👥 Arkadaş (4)', count: 4 },
  { key: 'friends_6', label: '👥 Arkadaş (6)', count: 6 },
];

function getSeatRows(mode) {
  switch (mode) {
    case 'couple': return [[0, 1]];
    case 'friends_2': return [[0, 1]];
    case 'friends_3': return [[0, 1, 2]];
    case 'friends_4': return [[0, 1], [2, 3]];
    case 'friends_6': return [[0, 1, 2], [3, 4, 5]];
    default: return [[0, 1]];
  }
}

function SeatAvatar({ avatarUrl }) {
  if (!avatarUrl) {
    return (
      <div style={{
        width: 28, height: 28, borderRadius: '50%',
        background: 'linear-gradient(135deg, #374151, #1f2937)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 14, color: '#9ca3af'
      }}>👤</div>
    );
  }
  return (
    <img
      src={avatarUrl}
      alt=""
      style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }}
      onError={e => { e.target.style.display = 'none'; }}
    />
  );
}

export default function CinemaSeats({
  cinemaState, socket, roomId, currentUser, isOwner,
  participants, speakingUsers = [], isMuted, onToggleMute, micError
}) {
  const [hoveredSeat, setHoveredSeat] = useState(null);
  const [showModePanel, setShowModePanel] = useState(false);

  const { mode = 'friends_2', seats = [] } = cinemaState || {};
  const isCouple = mode === 'couple';
  const rows = getSeatRows(mode);

  const mySeatedIdx = seats.findIndex(s => s.userId === currentUser?.id);
  const amSeated = mySeatedIdx !== -1;

  const seatedUserIds = new Set(seats.filter(s => s.userId).map(s => s.userId));
  const spectators = participants.filter(p => p.id && !seatedUserIds.has(p.id));

  const takeSeat = (idx) => {
    if (!currentUser) return;
    const seat = seats[idx];
    if (seat?.userId && seat.userId !== currentUser.id) return;
    socket?.emit('cinema_take_seat', { roomId, seatIdx: idx });
  };

  const leaveSeat = () => socket?.emit('cinema_leave_seat', { roomId });

  const removeUser = (seatIdx) => socket?.emit('cinema_remove_user', { roomId, seatIdx });

  const kickUser = (userId) => socket?.emit('kick_user', { roomId: Number(roomId), targetUserId: userId });

  const banUser = (userId) => {
    const reason = window.prompt('Ban sebebi (opsiyonel):') ?? '';
    socket?.emit('ban_user', { roomId: Number(roomId), targetUserId: userId, reason });
  };

  const setMode = (newMode) => {
    socket?.emit('cinema_set_mode', { roomId, mode: newMode });
    setShowModePanel(false);
  };

  return (
    <div style={{
      background: 'linear-gradient(180deg, #060610 0%, #0c0c18 60%, #0f0f1e 100%)',
      padding: '10px 8px 8px',
      borderTop: '1px solid rgba(212,175,55,0.12)'
    }}>
      {/* Screen glow */}
      <div style={{ textAlign: 'center', marginBottom: 10 }}>
        <div style={{
          display: 'inline-block', width: '75%', height: 5,
          background: 'linear-gradient(90deg, transparent 0%, rgba(200,220,255,0.25) 20%, rgba(255,255,255,0.7) 50%, rgba(200,220,255,0.25) 80%, transparent 100%)',
          borderRadius: 3,
          boxShadow: '0 0 18px rgba(200,220,255,0.35), 0 2px 30px rgba(200,220,255,0.15)',
          marginBottom: 3
        }} />
        <div style={{ fontSize: 8, color: 'rgba(180,200,255,0.4)', letterSpacing: '0.25em', fontFamily: 'monospace' }}>EKRAN</div>
      </div>

      {/* Owner mode selector */}
      {isOwner && (
        <div style={{ marginBottom: 8, textAlign: 'center' }}>
          <button
            onClick={() => setShowModePanel(p => !p)}
            style={{
              fontSize: 10, padding: '3px 10px', borderRadius: 12, cursor: 'pointer',
              background: 'rgba(212,175,55,0.12)', color: '#d4af37',
              border: '1px solid rgba(212,175,55,0.3)', fontWeight: 600
            }}
          >
            🎭 Koltuk Modu: {SEAT_MODES.find(m => m.key === mode)?.label || mode}
          </button>
          {showModePanel && (
            <div style={{
              display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap', justifyContent: 'center'
            }}>
              {SEAT_MODES.map(m => (
                <button key={m.key} onClick={() => setMode(m.key)} style={{
                  fontSize: 9, padding: '3px 8px', borderRadius: 10, cursor: 'pointer',
                  background: mode === m.key ? 'rgba(212,175,55,0.25)' : 'rgba(255,255,255,0.04)',
                  color: mode === m.key ? '#d4af37' : '#9ca3af',
                  border: `1px solid ${mode === m.key ? 'rgba(212,175,55,0.5)' : 'rgba(255,255,255,0.08)'}`,
                  fontWeight: mode === m.key ? 700 : 400
                }}>
                  {m.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Seats */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center', marginBottom: 10 }}>
        {rows.map((row, rowIdx) => (
          <div key={rowIdx} style={{ display: 'flex', gap: isCouple ? 6 : 10, alignItems: 'flex-end' }}>
            {row.map((seatIdx, colIdx) => {
              const seat = seats[seatIdx];
              const isOccupied = seat?.userId != null;
              const isMe = seat?.userId === currentUser?.id;
              const isSpeaking = speakingUsers.includes(seat?.userId);
              const isHov = hoveredSeat === seatIdx;
              const showHeartBetween = isCouple && colIdx === 0 && row.length === 2;

              const seatBg = isOccupied
                ? (isCouple
                  ? 'linear-gradient(180deg, #c0394f 0%, #7b1832 100%)'
                  : 'linear-gradient(180deg, #1a4a8a 0%, #0d2a55 100%)')
                : (isCouple
                  ? 'linear-gradient(180deg, #2a0f18 0%, #1a0a12 100%)'
                  : 'linear-gradient(180deg, #0d1825 0%, #080f1a 100%)');

              const borderColor = isSpeaking
                ? '#4ade80'
                : isMe
                ? '#d4af37'
                : isCouple
                ? (isOccupied ? 'rgba(220,80,100,0.6)' : 'rgba(180,60,80,0.25)')
                : (isOccupied ? 'rgba(50,120,220,0.6)' : 'rgba(30,80,180,0.25)');

              return (
                <div key={seatIdx} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div
                    style={{ position: 'relative' }}
                    onMouseEnter={() => setHoveredSeat(seatIdx)}
                    onMouseLeave={() => setHoveredSeat(null)}
                  >
                    {/* Seat body */}
                    <div
                      onClick={() => {
                        if (!isOccupied) takeSeat(seatIdx);
                        else if (isMe) leaveSeat();
                      }}
                      style={{
                        width: 56, height: 64, cursor: (!isOccupied || isMe) ? 'pointer' : 'default',
                        borderRadius: isCouple ? '50% 50% 10px 10px / 40% 40% 10px 10px' : '10px 10px 5px 5px',
                        background: seatBg,
                        border: `2px solid ${borderColor}`,
                        boxShadow: isSpeaking
                          ? `0 0 14px rgba(74,222,128,0.6), inset 0 0 8px rgba(74,222,128,0.1)`
                          : isMe
                          ? '0 0 10px rgba(212,175,55,0.35)'
                          : isOccupied
                          ? (isCouple ? '0 2px 12px rgba(200,50,80,0.3)' : '0 2px 12px rgba(30,80,200,0.3)')
                          : 'none',
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center',
                        transition: 'transform 0.15s, box-shadow 0.15s',
                        transform: isHov && !isOccupied ? 'scale(1.08) translateY(-2px)' : 'scale(1)',
                        position: 'relative', overflow: 'hidden'
                      }}
                    >
                      {/* Backrest highlight */}
                      <div style={{
                        position: 'absolute', top: 0, left: 0, right: 0, height: '38%',
                        background: isOccupied
                          ? (isCouple ? 'rgba(255,120,140,0.18)' : 'rgba(80,140,255,0.18)')
                          : 'rgba(255,255,255,0.03)',
                        borderRadius: isCouple ? '50% 50% 0 0' : '8px 8px 0 0'
                      }} />

                      {isOccupied ? (
                        <div style={{ zIndex: 1, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                          <SeatAvatar avatarUrl={seat.avatarUrl} />
                          <div style={{ fontSize: 8, color: 'white', maxWidth: 52, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 700 }}>
                            {seat.username?.slice(0, 7)}
                          </div>
                          {isSpeaking && <div style={{ fontSize: 7, color: '#4ade80', lineHeight: 1 }}>🎤</div>}
                          {isMe && !isSpeaking && <div style={{ fontSize: 7, color: '#d4af37', lineHeight: 1 }}>★ Ben</div>}
                        </div>
                      ) : (
                        <div style={{ zIndex: 1, textAlign: 'center' }}>
                          <div style={{ fontSize: isCouple ? 22 : 20 }}>{isCouple ? '💕' : '🪑'}</div>
                          <div style={{ fontSize: 8, color: isCouple ? 'rgba(255,150,170,0.5)' : 'rgba(100,160,255,0.5)', marginTop: 1 }}>
                            {isHov ? 'Otur' : 'boş'}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Owner controls tooltip */}
                    {isOwner && isOccupied && !isMe && isHov && (
                      <div style={{
                        position: 'absolute', top: -34, left: '50%', transform: 'translateX(-50%)',
                        display: 'flex', gap: 2, background: 'rgba(10,10,18,0.97)',
                        border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8,
                        padding: '3px 5px', zIndex: 20, whiteSpace: 'nowrap'
                      }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); removeUser(seatIdx); }}
                          title="Koltuğu boşalt"
                          style={{ fontSize: 10, color: '#fbbf24', background: 'none', border: 'none', cursor: 'pointer', padding: '0 3px' }}
                        >⬆</button>
                        <button
                          onClick={(e) => { e.stopPropagation(); kickUser(seat.userId); }}
                          title="Odadan at"
                          style={{ fontSize: 10, color: '#f87171', background: 'none', border: 'none', cursor: 'pointer', padding: '0 3px' }}
                        >🚫</button>
                        <button
                          onClick={(e) => { e.stopPropagation(); banUser(seat.userId); }}
                          title="Banla"
                          style={{ fontSize: 10, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: '0 3px' }}
                        >🔨</button>
                      </div>
                    )}
                  </div>

                  {/* Heart between couple seats */}
                  {showHeartBetween && (
                    <div style={{ fontSize: 16, color: '#ff6b8a', marginBottom: 8, filter: 'drop-shadow(0 0 4px rgba(255,100,130,0.6))' }}>
                      💗
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Mic controls (only for seated users) */}
      {amSeated && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, marginBottom: 8 }}>
          <button
            onClick={onToggleMute}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '5px 16px',
              borderRadius: 20, cursor: 'pointer',
              background: isMuted ? 'rgba(239,68,68,0.18)' : 'rgba(74,222,128,0.18)',
              border: `1px solid ${isMuted ? 'rgba(239,68,68,0.5)' : 'rgba(74,222,128,0.5)'}`,
              color: isMuted ? '#f87171' : '#4ade80', fontSize: 11, fontWeight: 700
            }}
          >
            {isMuted ? '🔇 Mikrofon Kapalı' : '🎤 Mikrofon Açık'}
          </button>
          {micError && (
            <div style={{ fontSize: 9, color: '#f87171' }}>{micError}</div>
          )}
        </div>
      )}

      {/* Spectators row */}
      {spectators.length > 0 && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 6 }}>
          <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.25)', textAlign: 'center', marginBottom: 4, letterSpacing: '0.12em' }}>
            YUKARI KATTA İZLEYENLER ({spectators.length})
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, justifyContent: 'center' }}>
            {spectators.slice(0, 24).map((p, i) => (
              <div
                key={i}
                title={p.username}
                style={{
                  width: 18, height: 18, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #1f2937, #111827)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 8, color: 'rgba(156,163,175,0.6)', fontWeight: 700,
                  border: '1px solid rgba(255,255,255,0.06)'
                }}
              >
                {(p.username || '?')[0].toUpperCase()}
              </div>
            ))}
            {spectators.length > 24 && (
              <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.2)', alignSelf: 'center' }}>
                +{spectators.length - 24}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
