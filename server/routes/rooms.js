const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const prisma = require('../db');
const { requireAuth } = require('../middleware/auth');

const roomSelect = {
  id: true, title: true, description: true, movieTitle: true, posterUrl: true,
  streamUrl: true, providerType: true, isTrending: true, allowedRoles: true,
  maxUsers: true, isActive: true, isLocked: true, chatEnabled: true,
  spamProtectionEnabled: true, spamCooldownSeconds: true, ownerId: true,
  createdAt: true, updatedAt: true, deletedAt: true,
  owner: { select: { id: true, username: true, role: true } },
  state: true
};

router.get('/', async (req, res) => {
  try {
    const rooms = await prisma.room.findMany({
      where: { isActive: true, deletedAt: null },
      select: roomSelect,
      orderBy: [{ isTrending: 'desc' }, { createdAt: 'desc' }]
    });
    res.json(rooms);
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
    res.json(room);
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

module.exports = router;
