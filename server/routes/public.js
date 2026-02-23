const express = require('express');
const router = express.Router();
const prisma = require('../db');

router.get('/rooms', async (req, res) => {
  try {
    const rooms = await prisma.room.findMany({
      where: { isActive: true },
      orderBy: [{ isTrending: 'desc' }, { createdAt: 'desc' }]
    });
    res.json(rooms);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/rooms/:id', async (req, res) => {
  try {
    const room = await prisma.room.findUnique({ where: { id: Number(req.params.id) } });
    if (!room) return res.status(404).json({ error: 'Room not found' });
    res.json(room);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/rooms/:id/messages', async (req, res) => {
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

router.get('/announcements', async (req, res) => {
  try {
    const items = await prisma.announcement.findMany({
      orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
      take: 20
    });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/events', async (req, res) => {
  try {
    const events = await prisma.event.findMany({
      where: { isActive: true },
      orderBy: { startTime: 'asc' }
    });
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/leaderboard', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { banned: false },
      select: { id: true, username: true, role: true, vip: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
      take: 3
    });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
