const express = require('express');
const router = express.Router();
const prisma = require('../db');

const HERO_USER_SELECT = {
  id: true, username: true, avatarUrl: true, avatarType: true, frameType: true,
  role: true, vip: true, badges: true, level: true, bio: true
};

router.get('/', async (req, res) => {
  try {
    let settings = await prisma.settings.findFirst({
      include: { heroCardUser: { select: HERO_USER_SELECT } }
    });
    if (!settings) {
      settings = await prisma.settings.create({
        data: {},
        include: { heroCardUser: { select: HERO_USER_SELECT } }
      });
    }
    res.json(settings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
