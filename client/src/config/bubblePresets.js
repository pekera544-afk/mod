// Chat bubble presets
// MOD can use first 5 (indices 0-4), ADMIN can use all 10 (indices 0-9)
// VIP gets no bubble option
export const BUBBLE_PRESETS = [
  { id: '', name: 'Yok', bg: 'transparent', border: 'transparent', text: '#d1d5db' },
  { id: 'blue', name: '🔵 Mavi', bg: 'rgba(59,130,246,0.13)', border: '#3b82f6', text: '#93c5fd' },
  { id: 'purple', name: '🟣 Mor', bg: 'rgba(168,85,247,0.13)', border: '#a855f7', text: '#d8b4fe' },
  { id: 'green', name: '🟢 Yeşil', bg: 'rgba(34,197,94,0.13)', border: '#22c55e', text: '#86efac' },
  { id: 'cyan', name: '💠 Cyan', bg: 'rgba(6,182,212,0.13)', border: '#06b6d4', text: '#67e8f9' },
  // MOD uses above (0-4). ADMIN continues below:
  { id: 'gold', name: '🟡 Altın', bg: 'rgba(212,175,55,0.13)', border: '#d4af37', text: '#fde68a' },
  { id: 'orange', name: '🟠 Turuncu', bg: 'rgba(249,115,22,0.13)', border: '#f97316', text: '#fdba74' },
  { id: 'pink', name: '🌸 Pembe', bg: 'rgba(236,72,153,0.13)', border: '#ec4899', text: '#f9a8d4' },
  { id: 'red', name: '🔴 Kırmızı', bg: 'rgba(220,38,38,0.13)', border: '#dc2626', text: '#fca5a5' },
  { id: 'fire', name: '🔥 Ateş', bg: 'rgba(220,60,10,0.13)', border: '#ea580c', text: '#fb923c' },
];

export const MOD_BUBBLE_COUNT = 5;   // first 5 (including "none")
export const ADMIN_BUBBLE_COUNT = 10; // all 10

export function getBubbleStyle(chatBubble) {
  if (!chatBubble) return null;
  return BUBBLE_PRESETS.find(p => p.id === chatBubble) || null;
}

export function getBubbleForRole(role, chatBubble) {
  if (role === 'admin') {
    // Admin default bubble if none chosen: red-gold
    if (!chatBubble) return { bg: 'rgba(220,38,38,0.1)', border: '#dc2626', text: '#fca5a5' };
    return getBubbleStyle(chatBubble) || { bg: 'rgba(220,38,38,0.1)', border: '#dc2626', text: '#fca5a5' };
  }
  if (role === 'moderator') {
    if (!chatBubble) return { bg: 'rgba(59,130,246,0.1)', border: '#3b82f6', text: '#93c5fd' };
    return getBubbleStyle(chatBubble) || { bg: 'rgba(59,130,246,0.1)', border: '#3b82f6', text: '#93c5fd' };
  }
  return null;
}
