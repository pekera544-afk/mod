const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const prisma = require('../db');
const { signToken, requireAuth } = require('../middleware/auth');

const USER_SELECT = {
  id: true, username: true, email: true, role: true, vip: true,
  avatarUrl: true, avatarType: true, frameType: true, badges: true,
  level: true, xp: true, bio: true, createdAt: true, vipExpiresAt: true
};

router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'All fields required' });
    }
    const existing = await prisma.user.findFirst({ where: { OR: [{ email }, { username }] } });
    if (existing) return res.status(409).json({ error: 'Username or email already exists' });

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { username, email, passwordHash, role: 'user' }
    });
    const token = signToken({ id: user.id, username: user.username, role: user.role, vip: user.vip });
    res.json({ token, user: { id: user.id, username: user.username, role: user.role, vip: user.vip, level: 1, xp: 0, avatarUrl: '', avatarType: 'image', frameType: '', badges: '' } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    if (user.banned) return res.status(403).json({ error: 'Account banned' });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = signToken({ id: user.id, username: user.username, role: user.role, vip: user.vip });
    res.json({ token, user: { id: user.id, username: user.username, role: user.role, vip: user.vip, level: user.level, xp: user.xp, avatarUrl: user.avatarUrl, avatarType: user.avatarType, frameType: user.frameType, badges: user.badges } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: USER_SELECT });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.vipExpiresAt && new Date(user.vipExpiresAt) < new Date()) {
      await prisma.user.update({ where: { id: user.id }, data: { vip: false, vipExpiresAt: null } });
      user.vip = false;
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
