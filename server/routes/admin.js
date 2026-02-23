const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const prisma = require('../db');
const { requireAdmin } = require('../middleware/auth');

async function logAction(adminId, action, target, detail = '') {
  try {
    await prisma.auditLog.create({ data: { adminId, action, target, detail } });
  } catch {}
}

router.use(requireAdmin);

router.get('/settings', async (req, res) => {
  try {
    let s = await prisma.settings.findFirst();
    if (!s) s = await prisma.settings.create({ data: {} });
    res.json(s);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.put('/settings', async (req, res) => {
  try {
    let s = await prisma.settings.findFirst();
    if (!s) {
      s = await prisma.settings.create({ data: req.body });
    } else {
      s = await prisma.settings.update({ where: { id: s.id }, data: req.body });
    }
    await logAction(req.user.id, 'UPDATE', 'Settings', JSON.stringify(req.body).slice(0, 200));
    res.json(s);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.get('/pwa', async (req, res) => {
  try {
    let p = await prisma.pwaSettings.findFirst();
    if (!p) p = await prisma.pwaSettings.create({ data: {} });
    res.json(p);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.put('/pwa', async (req, res) => {
  try {
    let p = await prisma.pwaSettings.findFirst();
    if (!p) {
      p = await prisma.pwaSettings.create({ data: req.body });
    } else {
      p = await prisma.pwaSettings.update({ where: { id: p.id }, data: req.body });
    }
    await logAction(req.user.id, 'UPDATE', 'PwaSettings', JSON.stringify(req.body).slice(0, 200));
    res.json(p);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.post('/pwa/publish-update', async (req, res) => {
  try {
    let p = await prisma.pwaSettings.findFirst();
    if (!p) p = await prisma.pwaSettings.create({ data: {} });
    p = await prisma.pwaSettings.update({ where: { id: p.id }, data: { version: p.version + 1 } });
    await logAction(req.user.id, 'PUBLISH_UPDATE', 'PwaSettings', `version=${p.version}`);
    res.json({ version: p.version });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.get('/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, username: true, email: true, role: true, vip: true, banned: true, bannedUntil: true, createdAt: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(users);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.put('/users/:id', async (req, res) => {
  try {
    const { role, vip, banned, bannedUntil, username, email, password } = req.body;

    const updateData = {};
    if (role !== undefined) updateData.role = role;
    if (vip !== undefined) updateData.vip = vip;
    if (banned !== undefined) updateData.banned = banned;
    if (bannedUntil !== undefined) updateData.bannedUntil = bannedUntil ? new Date(bannedUntil) : null;
    if (username && username.trim()) {
      const existing = await prisma.user.findFirst({ where: { username: username.trim(), NOT: { id: Number(req.params.id) } } });
      if (existing) return res.status(409).json({ error: 'Bu kullanıcı adı zaten kullanılıyor' });
      updateData.username = username.trim();
    }
    if (email && email.trim()) {
      const existing = await prisma.user.findFirst({ where: { email: email.trim(), NOT: { id: Number(req.params.id) } } });
      if (existing) return res.status(409).json({ error: 'Bu e-posta zaten kullanılıyor' });
      updateData.email = email.trim();
    }
    if (password && password.length >= 6) {
      updateData.passwordHash = await bcrypt.hash(password, 12);
    }

    const user = await prisma.user.update({
      where: { id: Number(req.params.id) },
      data: updateData,
      select: { id: true, username: true, email: true, role: true, vip: true, banned: true, bannedUntil: true, createdAt: true }
    });
    await logAction(req.user.id, 'UPDATE_USER', `User#${req.params.id}`, JSON.stringify({ role, vip, banned, username: updateData.username, email: updateData.email, passwordChanged: !!password }));
    res.json(user);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.delete('/users/:id', async (req, res) => {
  try {
    await prisma.user.delete({ where: { id: Number(req.params.id) } });
    await logAction(req.user.id, 'DELETE_USER', `User#${req.params.id}`);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.get('/rooms', async (req, res) => {
  try {
    const rooms = await prisma.room.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(rooms);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.post('/rooms', async (req, res) => {
  try {
    const room = await prisma.room.create({ data: req.body });
    await logAction(req.user.id, 'CREATE_ROOM', `Room#${room.id}`, room.title);
    res.json(room);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.put('/rooms/:id', async (req, res) => {
  try {
    const room = await prisma.room.update({ where: { id: Number(req.params.id) }, data: req.body });
    await logAction(req.user.id, 'UPDATE_ROOM', `Room#${req.params.id}`, room.title);
    res.json(room);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.delete('/rooms/:id', async (req, res) => {
  try {
    await prisma.room.delete({ where: { id: Number(req.params.id) } });
    await logAction(req.user.id, 'DELETE_ROOM', `Room#${req.params.id}`);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.get('/announcements', async (req, res) => {
  try {
    const items = await prisma.announcement.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(items);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.post('/announcements', async (req, res) => {
  try {
    const item = await prisma.announcement.create({ data: req.body });
    await logAction(req.user.id, 'CREATE_ANNOUNCEMENT', `Ann#${item.id}`, item.titleTR);
    res.json(item);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.put('/announcements/:id', async (req, res) => {
  try {
    const item = await prisma.announcement.update({ where: { id: Number(req.params.id) }, data: req.body });
    await logAction(req.user.id, 'UPDATE_ANNOUNCEMENT', `Ann#${req.params.id}`, item.titleTR);
    res.json(item);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.delete('/announcements/:id', async (req, res) => {
  try {
    await prisma.announcement.delete({ where: { id: Number(req.params.id) } });
    await logAction(req.user.id, 'DELETE_ANNOUNCEMENT', `Ann#${req.params.id}`);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.get('/events', async (req, res) => {
  try {
    const events = await prisma.event.findMany({ orderBy: { startTime: 'asc' } });
    res.json(events);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.post('/events', async (req, res) => {
  try {
    const ev = await prisma.event.create({ data: { ...req.body, startTime: new Date(req.body.startTime) } });
    await logAction(req.user.id, 'CREATE_EVENT', `Event#${ev.id}`, ev.titleTR);
    res.json(ev);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.put('/events/:id', async (req, res) => {
  try {
    const data = { ...req.body };
    if (data.startTime) data.startTime = new Date(data.startTime);
    const ev = await prisma.event.update({ where: { id: Number(req.params.id) }, data });
    await logAction(req.user.id, 'UPDATE_EVENT', `Event#${req.params.id}`, ev.titleTR);
    res.json(ev);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.delete('/events/:id', async (req, res) => {
  try {
    await prisma.event.delete({ where: { id: Number(req.params.id) } });
    await logAction(req.user.id, 'DELETE_EVENT', `Event#${req.params.id}`);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.get('/messages/:roomId', async (req, res) => {
  try {
    const messages = await prisma.message.findMany({
      where: { roomId: Number(req.params.roomId) },
      include: { user: { select: { id: true, username: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100
    });
    res.json(messages);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.delete('/messages/:id', async (req, res) => {
  try {
    await prisma.message.update({ where: { id: Number(req.params.id) }, data: { deletedAt: new Date() } });
    await logAction(req.user.id, 'DELETE_MESSAGE', `Msg#${req.params.id}`);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.get('/audit-log', async (req, res) => {
  try {
    const logs = await prisma.auditLog.findMany({
      include: { admin: { select: { username: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100
    });
    res.json(logs);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
