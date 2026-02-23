const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const PROFILE_SELECT = {
  id: true, username: true, role: true, vip: true,
  avatarUrl: true, avatarType: true, frameType: true, badges: true,
  level: true, xp: true, bio: true, createdAt: true
};

router.get('/global-chat/history', async (req, res) => {
  try {
    const messages = await prisma.globalMessage.findMany({
      where: { deletedAt: null },
      include: {
        user: { select: { id: true, username: true, role: true, vip: true, avatarUrl: true, avatarType: true, frameType: true, badges: true, level: true } }
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

router.post('/:id/give-xp', requireAdmin, async (req, res) => {
  try {
    const { amount } = req.body;
    if (amount === undefined) return res.status(400).json({ error: 'Amount required' });
    const user = await prisma.user.findUnique({ where: { id: Number(req.params.id) } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    const newXp = Math.max(0, (user.xp || 0) + Number(amount));
    const XP_TABLE = [0, 100, 250, 500, 900, 1400, 2100, 3000, 4200, 5700, 7500];
    let newLevel = 1;
    for (let i = XP_TABLE.length - 1; i >= 0; i--) {
      if (newXp >= XP_TABLE[i]) { newLevel = i + 1; break; }
    }
    const updated = await prisma.user.update({ where: { id: Number(req.params.id) }, data: { xp: newXp, level: Math.min(newLevel, 10) }, select: PROFILE_SELECT });
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
    const XP_TABLE = [0, 100, 250, 500, 900, 1400, 2100, 3000, 4200, 5700, 7500];
    const lvl = Math.min(Math.max(1, Number(level)), 10);
    const xp = XP_TABLE[lvl - 1] || 0;
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
    const updated = await prisma.user.update({ where: { id: Number(req.params.id) }, data: { frameType: frameType || '' }, select: PROFILE_SELECT });
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
