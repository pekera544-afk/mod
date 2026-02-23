const express = require('express');
const router = express.Router();
const prisma = require('../db');

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
