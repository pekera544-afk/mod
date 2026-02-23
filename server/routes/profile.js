const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const PROFILE_SELECT = {
  id: true, username: true, role: true, vip: true,
  avatarUrl: true, avatarType: true, frameType: true, frameColor: true, frameExpiresAt: true,
  chatBubble: true, usernameColor: true, usernameColorExpires: true, badges: true,
  level: true, xp: true, bio: true, createdAt: true
};

router.get('/global-chat/history', async (req, res) => {
  try {
    const messages = await prisma.globalMessage.findMany({
      where: { deletedAt: null },
      include: {
        user: { select: { id: true, username: true, role: true, vip: true, avatarUrl: true, avatarType: true, frameType: true, frameColor: true, frameExpiresAt: true, chatBubble: true, usernameColor: true, usernameColorExpires: true, badges: true, level: true } }
      },
      orderBy: { createdAt: 'asc' },
      take: 100
    });
    res.json(messages);
  } catch (err) {
    console.error('global-chat history error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/friends/list', requireAuth, async (req, res) => {
  try {
    const friendships = await prisma.friendship.findMany({
      where: { OR: [{ userAId: req.user.id }, { userBId: req.user.id }] },
      include: {
        userA: { select: { id: true, username: true, avatarUrl: true, level: true, role: true, vip: true } },
        userB: { select: { id: true, username: true, avatarUrl: true, level: true, role: true, vip: true } }
      }
    });
    const friends = friendships.map(f => f.userAId === req.user.id ? f.userB : f.userA);
    res.json(friends);
  } catch (err) {
    console.error('friends list error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/friends/requests', requireAuth, async (req, res) => {
  try {
    const requests = await prisma.friendRequest.findMany({
      where: { toId: req.user.id, status: 'pending' },
      include: { from: { select: { id: true, username: true, avatarUrl: true, level: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(requests);
  } catch (err) {
    console.error('friend requests error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/friends/sent', requireAuth, async (req, res) => {
  try {
    const sent = await prisma.friendRequest.findMany({
      where: { fromId: req.user.id, status: 'pending' },
      select: { id: true, toId: true, createdAt: true }
    });
    res.json(sent);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/dms/conversations', requireAuth, async (req, res) => {
  try {
    const myId = req.user.id;
    const allDMs = await prisma.directMessage.findMany({
      where: {
        deletedAt: null,
        OR: [{ fromId: myId }, { toId: myId }]
      },
      include: {
        from: { select: { id: true, username: true, avatarUrl: true, role: true, vip: true, level: true } },
        to: { select: { id: true, username: true, avatarUrl: true, role: true, vip: true, level: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 500
    });

    const convMap = new Map();
    for (const dm of allDMs) {
      const otherId = dm.fromId === myId ? dm.toId : dm.fromId;
      const other = dm.fromId === myId ? dm.to : dm.from;
      if (!convMap.has(otherId)) {
        convMap.set(otherId, { other, lastMessage: dm, unread: 0 });
      }
      if (!dm.read && dm.toId === myId) {
        convMap.get(otherId).unread++;
      }
    }

    const conversations = Array.from(convMap.values())
      .sort((a, b) => new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt));

    res.json(conversations);
  } catch (err) {
    console.error('DM conversations error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/dms/all', requireAuth, async (req, res) => {
  try {
    await prisma.directMessage.updateMany({
      where: { OR: [{ fromId: req.user.id }, { toId: req.user.id }], deletedAt: null },
      data: { deletedAt: new Date() }
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/dms/mark-all-read', requireAuth, async (req, res) => {
  try {
    await prisma.directMessage.updateMany({
      where: { toId: req.user.id, read: false },
      data: { read: true }
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/dm/:userId', requireAuth, async (req, res) => {
  try {
    const otherId = Number(req.params.userId);
    const messages = await prisma.directMessage.findMany({
      where: {
        OR: [
          { fromId: req.user.id, toId: otherId },
          { fromId: otherId, toId: req.user.id }
        ],
        deletedAt: null
      },
      include: { from: { select: { id: true, username: true, avatarUrl: true, role: true, vip: true, badges: true, level: true } } },
      orderBy: { createdAt: 'asc' },
      take: 100
    });
    await prisma.directMessage.updateMany({
      where: { fromId: otherId, toId: req.user.id, read: false },
      data: { read: true }
    });
    res.json(messages);
  } catch (err) {
    console.error('DM history error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/friends/:userId', requireAuth, async (req, res) => {
  try {
    const otherId = Number(req.params.userId);
    await prisma.friendship.deleteMany({
      where: {
        OR: [
          { userAId: req.user.id, userBId: otherId },
          { userAId: otherId, userBId: req.user.id }
        ]
      }
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/me', requireAuth, async (req, res) => {
  try {
    const { avatarUrl, avatarType, bio, username, frameType } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const isPrivileged = user.role === 'admin' || user.role === 'moderator' || user.vip;
    const updateData = {};
    if (bio !== undefined) updateData.bio = String(bio).slice(0, 300);
    if (avatarUrl !== undefined) {
      if (!isPrivileged && avatarType === 'gif') {
        return res.status(403).json({ error: 'GIF avatar requires VIP or higher' });
      }
      updateData.avatarUrl = avatarUrl;
      updateData.avatarType = isPrivileged ? (avatarType || 'image') : 'image';
    }
    if (frameType !== undefined) {
      const validFrames = ['', 'gold', 'fire', 'rainbow', 'galaxy', 'ice', 'rose', 'crystal', 'love', 'angel', 'neon', 'diamond', 'sakura'];
      if (validFrames.includes(frameType)) {
        if (!frameType || isPrivileged || user.frameType) {
          updateData.frameType = frameType;
        } else {
          return res.status(403).json({ error: 'Çerçeve kullanmak için VIP olmalı veya admin tarafından verilmiş olmalı' });
        }
      }
    }
    if (username !== undefined) {
      const trimmed = String(username).trim().slice(0, 30);
      if (trimmed.length < 3) return res.status(400).json({ error: 'Kullanıcı adı en az 3 karakter olmalı' });
      if (!/^[a-zA-Z0-9_çğıöşüÇĞİÖŞÜ]+$/.test(trimmed)) return res.status(400).json({ error: 'Kullanıcı adı sadece harf, rakam ve _ içerebilir' });
      const existing = await prisma.user.findFirst({ where: { username: trimmed, NOT: { id: req.user.id } } });
      if (existing) return res.status(409).json({ error: 'Bu kullanıcı adı zaten kullanılıyor' });
      updateData.username = trimmed;
    }
    const updated = await prisma.user.update({ where: { id: req.user.id }, data: updateData, select: PROFILE_SELECT });
    res.json(updated);
  } catch (err) {
    console.error('profile update error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/me/password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Tüm alanlar gerekli' });
    if (newPassword.length < 6) return res.status(400).json({ error: 'Yeni şifre en az 6 karakter olmalı' });
    const bcrypt = require('bcryptjs');
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Mevcut şifre yanlış' });
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: req.user.id }, data: { passwordHash } });
    res.json({ ok: true });
  } catch (err) {
    console.error('password change error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Unlimited XP formula: Level N needs 25*N*(N-1) XP
function getXpForLevel(level) { return level <= 1 ? 0 : 25 * level * (level - 1); }
function getLevelFromXp(xp) {
  if (!xp || xp <= 0) return 1;
  let level = Math.max(1, Math.floor(Math.sqrt(xp / 25)));
  while (getXpForLevel(level + 1) <= xp) level++;
  while (level > 1 && getXpForLevel(level) > xp) level--;
  return level;
}

router.post('/:id/give-xp', requireAdmin, async (req, res) => {
  try {
    const { amount } = req.body;
    if (amount === undefined) return res.status(400).json({ error: 'Amount required' });
    const user = await prisma.user.findUnique({ where: { id: Number(req.params.id) } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    const newXp = Math.max(0, (user.xp || 0) + Number(amount));
    const newLevel = getLevelFromXp(newXp);
    const updated = await prisma.user.update({ where: { id: Number(req.params.id) }, data: { xp: newXp, level: newLevel }, select: PROFILE_SELECT });
    res.json(updated);
  } catch (err) {
    console.error('give-xp error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:id/set-level', requireAdmin, async (req, res) => {
  try {
    const { level } = req.body;
    if (!level) return res.status(400).json({ error: 'Level required' });
    const lvl = Math.max(1, Number(level));
    const xp = getXpForLevel(lvl);
    const updated = await prisma.user.update({ where: { id: Number(req.params.id) }, data: { level: lvl, xp }, select: PROFILE_SELECT });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:id/set-badges', requireAdmin, async (req, res) => {
  try {
    const { badges } = req.body;
    const updated = await prisma.user.update({ where: { id: Number(req.params.id) }, data: { badges: badges || '' }, select: PROFILE_SELECT });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:id/set-frame', requireAdmin, async (req, res) => {
  try {
    const { frameType } = req.body;
    const updated = await prisma.user.update({ where: { id: Number(req.params.id) }, data: { frameType: frameType || '', frameColor: '', frameExpiresAt: null }, select: PROFILE_SELECT });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:id/gift-frame', requireAdmin, async (req, res) => {
  try {
    const { frameType, frameColor, days } = req.body;
    const updateData = {
      frameType: frameType || 'custom',
      frameColor: frameColor || '',
      frameExpiresAt: null
    };
    if (days && Number(days) > 0) {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + Number(days));
      updateData.frameExpiresAt = expiresAt;
    }
    const updated = await prisma.user.update({ where: { id: Number(req.params.id) }, data: updateData, select: PROFILE_SELECT });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/me/set-bubble', requireAuth, async (req, res) => {
  try {
    const { chatBubble } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    const isAdmin = user.role === 'admin';
    const isMod = user.role === 'moderator';
    if (!isAdmin && !isMod) return res.status(403).json({ error: 'Only admin/moderator can set bubble style' });
    const ADMIN_BUBBLES = ['', 'blue', 'purple', 'green', 'cyan', 'gold', 'orange', 'pink', 'red', 'fire'];
    const MOD_BUBBLES = ['', 'blue', 'purple', 'green', 'cyan'];
    const allowed = isAdmin ? ADMIN_BUBBLES : MOD_BUBBLES;
    if (!allowed.includes(chatBubble || '')) return res.status(400).json({ error: 'Invalid bubble style' });
    await prisma.user.update({ where: { id: req.user.id }, data: { chatBubble: chatBubble || '' } });
    res.json({ ok: true, chatBubble: chatBubble || '' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:id/set-bubble', requireAdmin, async (req, res) => {
  try {
    const { chatBubble } = req.body;
    const updated = await prisma.user.update({ where: { id: Number(req.params.id) }, data: { chatBubble: chatBubble || '' }, select: PROFILE_SELECT });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:id/gift-username-color', requireAdmin, async (req, res) => {
  try {
    const { color, permanent, days } = req.body;
    const updateData = { usernameColor: color || '' };
    if (!color) {
      updateData.usernameColorExpires = null;
    } else if (permanent || !days) {
      updateData.usernameColorExpires = null;
    } else {
      const expires = new Date();
      expires.setDate(expires.getDate() + Number(days));
      updateData.usernameColorExpires = expires;
    }
    const updated = await prisma.user.update({ where: { id: Number(req.params.id) }, data: updateData, select: PROFILE_SELECT });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:id/set-vip', requireAdmin, async (req, res) => {
  try {
    const { vip, days } = req.body;
    const updateData = { vip: Boolean(vip) };
    if (vip && days && Number(days) > 0) {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + Number(days));
      updateData.vipExpiresAt = expiresAt;
    } else {
      updateData.vipExpiresAt = null;
    }
    const updated = await prisma.user.update({ where: { id: Number(req.params.id) }, data: updateData, select: PROFILE_SELECT });
    res.json(updated);
  } catch (err) {
    console.error('set-vip error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const userId = Number(req.params.id);
    if (isNaN(userId)) return res.status(400).json({ error: 'Invalid user ID' });
    const user = await prisma.user.findUnique({ where: { id: userId }, select: PROFILE_SELECT });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    console.error('profile get error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
