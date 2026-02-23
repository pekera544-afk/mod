const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const prisma = require('../db');
const { requireAuth } = require('../middleware/auth');
const socketModule = require('../socket');
const { getIo } = require('../socketRef');

const roomSelect = {
  id: true, title: true, description: true, movieTitle: true, posterUrl: true,
  streamUrl: true, providerType: true, isTrending: true, allowedRoles: true,
  maxUsers: true, isActive: true, isLocked: true, chatEnabled: true,
  spamProtectionEnabled: true, spamCooldownSeconds: true, ownerId: true,
  createdAt: true, updatedAt: true, deletedAt: true,
  owner: { select: { id: true, username: true, role: true } },
  state: true
};

router.get('/counts', (req, res) => {
  try {
    const counts = socketModule.getAllLiveCounts ? socketModule.getAllLiveCounts() : {};
    res.json(counts);
  } catch {
    res.json({});
  }
});

router.get('/', async (req, res) => {
  try {
    const rooms = await prisma.room.findMany({
      where: { isActive: true, deletedAt: null },
      select: roomSelect,
      orderBy: [{ isTrending: 'desc' }, { createdAt: 'desc' }]
    });
    const liveCounts = socketModule.getAllLiveCounts ? socketModule.getAllLiveCounts() : {};
    const roomsWithCounts = rooms.map(r => ({ ...r, liveCount: liveCounts[String(r.id)] || 0 }));
    res.json(roomsWithCounts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/my', requireAuth, async (req, res) => {
  try {
    const room = await prisma.room.findFirst({
      where: { ownerId: req.user.id, deletedAt: null, isActive: true },
      select: roomSelect
    });
    if (!room) return res.json(null);
    const liveCounts = socketModule.getAllLiveCounts ? socketModule.getAllLiveCounts() : {};
    res.json({ ...room, liveCount: liveCounts[String(room.id)] || 0 });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const room = await prisma.room.findFirst({
      where: { id: Number(req.params.id), deletedAt: null },
      select: roomSelect
    });
    if (!room) return res.status(404).json({ error: 'Room not found' });
    const { passwordHash, ...safeRoom } = room;
    res.json(safeRoom);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const existing = await prisma.room.findFirst({
      where: { ownerId: req.user.id, deletedAt: null, isActive: true }
    });
    if (existing) {
      return res.status(409).json({ error: 'You already have an active room', roomId: existing.id });
    }

    const {
      title, description, movieTitle, posterUrl, streamUrl,
      providerType = 'youtube', isLocked = false, password,
      chatEnabled = true, spamProtectionEnabled = true, spamCooldownSeconds = 3
    } = req.body;

    if (!title || !movieTitle || !streamUrl) {
      return res.status(400).json({ error: 'Title, movieTitle, and streamUrl are required' });
    }

    let passwordHash = null;
    if (isLocked && password) {
      passwordHash = await bcrypt.hash(password, 10);
    }

    const room = await prisma.room.create({
      data: {
        title, description: description || '', movieTitle,
        posterUrl: posterUrl || '', streamUrl,
        providerType, isLocked, passwordHash,
        chatEnabled, spamProtectionEnabled,
        spamCooldownSeconds: Number(spamCooldownSeconds) || 3,
        ownerId: req.user.id, isActive: true
      }
    });

    await prisma.roomState.create({
      data: { roomId: room.id, isPlaying: false, currentTimeSeconds: 0 }
    });

    const io = getIo();
    if (io) {
      io.emit('new_room_opened', {
        id: room.id,
        title: room.title,
        movieTitle: room.movieTitle,
        providerType: room.providerType,
        isLocked: room.isLocked,
        ownerUsername: req.user.username
      });
    }

    res.status(201).json({ ...room, passwordHash: undefined });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', requireAuth, async (req, res) => {
  try {
    const room = await prisma.room.findFirst({
      where: { id: Number(req.params.id), deletedAt: null }
    });
    if (!room) return res.status(404).json({ error: 'Room not found' });

    const isOwner = room.ownerId === req.user.id;
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) return res.status(403).json({ error: 'Only the room owner can edit this room' });

    const {
      title, description, movieTitle, posterUrl, streamUrl,
      providerType, isLocked, password, chatEnabled,
      spamProtectionEnabled, spamCooldownSeconds, isTrending
    } = req.body;

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (movieTitle !== undefined) updateData.movieTitle = movieTitle;
    if (posterUrl !== undefined) updateData.posterUrl = posterUrl;
    if (streamUrl !== undefined) updateData.streamUrl = streamUrl;
    if (providerType !== undefined) updateData.providerType = providerType;
    if (isLocked !== undefined) updateData.isLocked = isLocked;
    if (chatEnabled !== undefined) updateData.chatEnabled = chatEnabled;
    if (spamProtectionEnabled !== undefined) updateData.spamProtectionEnabled = spamProtectionEnabled;
    if (spamCooldownSeconds !== undefined) updateData.spamCooldownSeconds = Number(spamCooldownSeconds);
    if (isAdmin && isTrending !== undefined) updateData.isTrending = isTrending;

    if (isLocked && password) {
      updateData.passwordHash = await bcrypt.hash(password, 10);
    } else if (!isLocked) {
      updateData.passwordHash = null;
    }

    const updated = await prisma.room.update({
      where: { id: Number(req.params.id) },
      data: updateData,
      select: roomSelect
    });

    res.json({ ...updated, passwordHash: undefined });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const room = await prisma.room.findFirst({
      where: { id: Number(req.params.id), deletedAt: null }
    });
    if (!room) return res.status(404).json({ error: 'Room not found' });

    const isOwner = room.ownerId === req.user.id;
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) return res.status(403).json({ error: 'Only the room owner can delete this room' });

    await prisma.room.update({
      where: { id: Number(req.params.id) },
      data: { deletedAt: new Date(), isActive: false }
    });

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:id/join', async (req, res) => {
  try {
    const room = await prisma.room.findFirst({
      where: { id: Number(req.params.id), deletedAt: null, isActive: true }
    });
    if (!room) return res.status(404).json({ error: 'Room not found' });

    if (room.isLocked) {
      const { password } = req.body;
      if (!password) return res.status(401).json({ error: 'Password required', locked: true });
      if (!room.passwordHash) return res.status(401).json({ error: 'Room has no password set' });
      const valid = await bcrypt.compare(password, room.passwordHash);
      if (!valid) return res.status(401).json({ error: 'Incorrect password', locked: true });
    }

    const { passwordHash: _, ...safeRoom } = room;
    res.json({ ok: true, room: safeRoom });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id/messages', async (req, res) => {
  try {
    const messages = await prisma.message.findMany({
      where: { roomId: Number(req.params.id), deletedAt: null },
      include: { user: { select: { id: true, username: true, role: true, vip: true } } },
      orderBy: { createdAt: 'asc' },
      take: 100
    });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id/moderators', async (req, res) => {
  try {
    const mods = await prisma.roomModerator.findMany({
      where: { roomId: Number(req.params.id) },
      include: { user: { select: { id: true, username: true, role: true, vip: true } } }
    });
    res.json(mods);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.post('/:id/moderators', requireAuth, async (req, res) => {
  try {
    const room = await prisma.room.findFirst({ where: { id: Number(req.params.id), deletedAt: null } });
    if (!room) return res.status(404).json({ error: 'Room not found' });
    if (room.ownerId !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    const { userId } = req.body;
    const mod = await prisma.roomModerator.upsert({
      where: { roomId_userId: { roomId: Number(req.params.id), userId: Number(userId) } },
      update: {},
      create: { roomId: Number(req.params.id), userId: Number(userId), assignedBy: req.user.id }
    });
    res.json(mod);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.delete('/:id/moderators/:userId', requireAuth, async (req, res) => {
  try {
    const room = await prisma.room.findFirst({ where: { id: Number(req.params.id), deletedAt: null } });
    if (!room) return res.status(404).json({ error: 'Room not found' });
    if (room.ownerId !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    await prisma.roomModerator.deleteMany({
      where: { roomId: Number(req.params.id), userId: Number(req.params.userId) }
    });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.get('/:id/bans', requireAuth, async (req, res) => {
  try {
    const room = await prisma.room.findFirst({ where: { id: Number(req.params.id), deletedAt: null } });
    if (!room) return res.status(404).json({ error: 'Room not found' });
    if (room.ownerId !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    const bans = await prisma.roomBan.findMany({
      where: { roomId: Number(req.params.id) },
      include: { user: { select: { id: true, username: true } } }
    });
    res.json(bans);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.post('/:id/bans', requireAuth, async (req, res) => {
  try {
    const room = await prisma.room.findFirst({ where: { id: Number(req.params.id), deletedAt: null } });
    if (!room) return res.status(404).json({ error: 'Room not found' });
    const isMod = await prisma.roomModerator.findUnique({
      where: { roomId_userId: { roomId: Number(req.params.id), userId: req.user.id } }
    });
    if (room.ownerId !== req.user.id && req.user.role !== 'admin' && !isMod) return res.status(403).json({ error: 'Forbidden' });
    const { userId, reason } = req.body;
    const ban = await prisma.roomBan.upsert({
      where: { roomId_userId: { roomId: Number(req.params.id), userId: Number(userId) } },
      update: { bannedBy: req.user.id, reason: reason || '' },
      create: { roomId: Number(req.params.id), userId: Number(userId), bannedBy: req.user.id, reason: reason || '' }
    });
    res.json(ban);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.delete('/:id/bans/:userId', requireAuth, async (req, res) => {
  try {
    const room = await prisma.room.findFirst({ where: { id: Number(req.params.id), deletedAt: null } });
    if (!room) return res.status(404).json({ error: 'Room not found' });
    if (room.ownerId !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    await prisma.roomBan.deleteMany({
      where: { roomId: Number(req.params.id), userId: Number(req.params.userId) }
    });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
