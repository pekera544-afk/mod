const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const prisma = require('../db');
const { requireAdmin } = require('../middleware/auth');
const { getIo } = require('../socketRef');

async function logAction(adminId, action, target, detail = '') {
  try {
    await prisma.auditLog.create({ data: { adminId, action, target, detail } });
  } catch {}
}

router.use(requireAdmin);

const HERO_USER_SELECT = {
  id: true, username: true, avatarUrl: true, avatarType: true, frameType: true,
  role: true, vip: true, badges: true, level: true, bio: true
};

router.get('/settings', async (req, res) => {
  try {
    let s = await prisma.settings.findFirst({
      include: { heroCardUser: { select: HERO_USER_SELECT } }
    });
    if (!s) s = await prisma.settings.create({ data: {}, include: { heroCardUser: { select: HERO_USER_SELECT } } });
    res.json(s);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.put('/settings', async (req, res) => {
  try {
    const { heroCardUser, ...rawData } = req.body;
    const data = { ...rawData };
    if ('heroCardUserId' in data) {
      data.heroCardUserId = data.heroCardUserId ? Number(data.heroCardUserId) : null;
    }
    let s = await prisma.settings.findFirst();
    if (!s) {
      s = await prisma.settings.create({ data, include: { heroCardUser: { select: HERO_USER_SELECT } } });
    } else {
      s = await prisma.settings.update({ where: { id: s.id }, data, include: { heroCardUser: { select: HERO_USER_SELECT } } });
    }
    await logAction(req.user.id, 'UPDATE', 'Settings', JSON.stringify(rawData).slice(0, 200));
    res.json(s);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.get('/users/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.json([]);
    const users = await prisma.user.findMany({
      where: { username: { contains: q, mode: 'insensitive' } },
      select: HERO_USER_SELECT,
      take: 10
    });
    res.json(users);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
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
    const { password, ...data } = req.body;
    if (data.isLocked && password) {
      data.passwordHash = await bcrypt.hash(password, 10);
    }
    const allowedFields = ['title','description','movieTitle','posterUrl','streamUrl','providerType',
      'isLocked','passwordHash','chatEnabled','spamProtectionEnabled','spamCooldownSeconds',
      'isTrending','allowedRoles','maxUsers','isActive'];
    const safeData = Object.fromEntries(Object.entries(data).filter(([k]) => allowedFields.includes(k)));
    const room = await prisma.room.create({ data: safeData });
    await logAction(req.user.id, 'CREATE_ROOM', `Room#${room.id}`, room.title);
    res.json(room);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.put('/rooms/:id', async (req, res) => {
  try {
    const { password, ...data } = req.body;
    if (data.isLocked && password) {
      data.passwordHash = await bcrypt.hash(password, 10);
    }
    const allowedFields = ['title','description','movieTitle','posterUrl','streamUrl','providerType',
      'isLocked','passwordHash','chatEnabled','spamProtectionEnabled','spamCooldownSeconds',
      'isTrending','allowedRoles','maxUsers','isActive'];
    const safeData = Object.fromEntries(Object.entries(data).filter(([k]) => allowedFields.includes(k)));
    const room = await prisma.room.update({ where: { id: Number(req.params.id) }, data: safeData });
    await logAction(req.user.id, 'UPDATE_ROOM', `Room#${req.params.id}`, room.title);
    res.json(room);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
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
    const io = getIo();
    if (io) io.emit('new_announcement', { id: item.id, titleTR: item.titleTR, titleEN: item.titleEN });
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
    const io = getIo();
    if (io) io.emit('new_event', { id: ev.id, titleTR: ev.titleTR, titleEN: ev.titleEN, startTime: ev.startTime });
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

router.get('/backup', async (req, res) => {
  try {
    const [
      users, rooms, roomStates, roomModerators, roomBans,
      messages, globalMessages, directMessages,
      friendRequests, friendships,
      announcements, events, news,
      settings, pwaSettings,
      cpRequests, cpRelationships
    ] = await Promise.all([
      prisma.user.findMany(),
      prisma.room.findMany(),
      prisma.roomState.findMany(),
      prisma.roomModerator.findMany(),
      prisma.roomBan.findMany(),
      prisma.message.findMany(),
      prisma.globalMessage.findMany(),
      prisma.directMessage.findMany(),
      prisma.friendRequest.findMany(),
      prisma.friendship.findMany(),
      prisma.announcement.findMany(),
      prisma.event.findMany(),
      prisma.news.findMany(),
      prisma.settings.findMany(),
      prisma.pwaSettings.findMany(),
      prisma.cpRequest.findMany(),
      prisma.cpRelationship.findMany()
    ]);

    const backup = {
      version: 1,
      exportedAt: new Date().toISOString(),
      data: {
        users, rooms, roomStates, roomModerators, roomBans,
        messages, globalMessages, directMessages,
        friendRequests, friendships,
        announcements, events, news,
        settings, pwaSettings,
        cpRequests, cpRelationships
      }
    };

    await logAction(req.user.id, 'BACKUP', 'Database', `users=${users.length} rooms=${rooms.length}`);

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="backup_${new Date().toISOString().slice(0,10)}.json"`);
    res.json(backup);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.post('/restore', async (req, res) => {
  try {
    const backup = req.body;
    if (!backup || !backup.data || backup.version !== 1) {
      return res.status(400).json({ error: 'Geçersiz yedek dosyası' });
    }

    const d = backup.data;

    await prisma.$transaction(async (tx) => {
      await tx.auditLog.deleteMany();
      await tx.cpRelationship.deleteMany();
      await tx.cpRequest.deleteMany();
      await tx.friendship.deleteMany();
      await tx.friendRequest.deleteMany();
      await tx.directMessage.deleteMany();
      await tx.globalMessage.deleteMany();
      await tx.roomBan.deleteMany();
      await tx.roomModerator.deleteMany();
      await tx.message.deleteMany();
      await tx.roomState.deleteMany();
      await tx.room.deleteMany();
      await tx.settings.deleteMany();
      await tx.pwaSettings.deleteMany();
      await tx.announcement.deleteMany();
      await tx.event.deleteMany();
      await tx.news.deleteMany();
      await tx.user.deleteMany();

      const toDate = v => v ? new Date(v) : null;

      if (d.users?.length) {
        for (const u of d.users) {
          await tx.user.create({ data: {
            id: u.id, username: u.username, email: u.email,
            passwordHash: u.passwordHash, role: u.role,
            vip: u.vip, vipExpiresAt: toDate(u.vipExpiresAt),
            banned: u.banned, bannedUntil: toDate(u.bannedUntil),
            avatarUrl: u.avatarUrl, avatarType: u.avatarType,
            frameType: u.frameType, frameColor: u.frameColor,
            frameExpiresAt: toDate(u.frameExpiresAt),
            chatBubble: u.chatBubble, usernameColor: u.usernameColor,
            usernameColorExpires: toDate(u.usernameColorExpires),
            badges: u.badges, xp: u.xp, level: u.level, bio: u.bio,
            cpRequestCount: u.cpRequestCount || 0,
            cpLastReset: toDate(u.cpLastReset) || new Date(),
            createdAt: toDate(u.createdAt) || new Date()
          }});
        }
        await tx.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"User"','id'), COALESCE(MAX(id),0)+1, false) FROM "User"`);
      }

      if (d.settings?.length) {
        for (const s of d.settings) {
          const { heroCardUser, updatedAt, ...sd } = s;
          await tx.settings.create({ data: { ...sd, updatedAt: toDate(updatedAt) || new Date() } });
        }
        await tx.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"Settings"','id'), COALESCE(MAX(id),0)+1, false) FROM "Settings"`);
      }

      if (d.pwaSettings?.length) {
        for (const p of d.pwaSettings) {
          const { updatedAt, ...pd } = p;
          await tx.pwaSettings.create({ data: { ...pd, updatedAt: toDate(updatedAt) || new Date() } });
        }
        await tx.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"PwaSettings"','id'), COALESCE(MAX(id),0)+1, false) FROM "PwaSettings"`);
      }

      if (d.rooms?.length) {
        for (const r of d.rooms) {
          await tx.room.create({ data: {
            id: r.id, title: r.title, description: r.description,
            movieTitle: r.movieTitle, posterUrl: r.posterUrl,
            streamUrl: r.streamUrl, providerType: r.providerType,
            isTrending: r.isTrending, allowedRoles: r.allowedRoles,
            maxUsers: r.maxUsers, isActive: r.isActive,
            isLocked: r.isLocked, passwordHash: r.passwordHash,
            chatEnabled: r.chatEnabled,
            spamProtectionEnabled: r.spamProtectionEnabled,
            spamCooldownSeconds: r.spamCooldownSeconds,
            ownerId: r.ownerId,
            createdAt: toDate(r.createdAt) || new Date(),
            updatedAt: toDate(r.updatedAt) || new Date(),
            deletedAt: toDate(r.deletedAt)
          }});
        }
        await tx.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"Room"','id'), COALESCE(MAX(id),0)+1, false) FROM "Room"`);
      }

      const simple = [
        ['roomState', d.roomStates, '"RoomState"'],
        ['roomModerator', d.roomModerators, '"RoomModerator"'],
        ['roomBan', d.roomBans, '"RoomBan"'],
        ['announcement', d.announcements, '"Announcement"'],
        ['event', d.events, '"Event"'],
        ['news', d.news, '"News"'],
      ];

      for (const [model, rows, seqTable] of simple) {
        if (rows?.length) {
          for (const row of rows) {
            const clean = Object.fromEntries(Object.entries(row).map(([k,v]) => [k, v instanceof Object && v.toISOString === undefined && typeof v === 'object' && v !== null && !Array.isArray(v) ? v : (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v) ? toDate(v) : v)]));
            await tx[model].create({ data: clean });
          }
          await tx.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('${seqTable}','id'), COALESCE(MAX(id),0)+1, false) FROM ${seqTable}`);
        }
      }

      if (d.messages?.length) {
        for (const m of d.messages) {
          await tx.message.create({ data: {
            id: m.id, roomId: m.roomId, userId: m.userId,
            content: m.content, reaction: m.reaction,
            replyToId: m.replyToId,
            createdAt: toDate(m.createdAt) || new Date(),
            deletedAt: toDate(m.deletedAt)
          }});
        }
        await tx.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"Message"','id'), COALESCE(MAX(id),0)+1, false) FROM "Message"`);
      }

      if (d.globalMessages?.length) {
        for (const m of d.globalMessages) {
          await tx.globalMessage.create({ data: {
            id: m.id, userId: m.userId, content: m.content,
            createdAt: toDate(m.createdAt) || new Date(),
            deletedAt: toDate(m.deletedAt)
          }});
        }
        await tx.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"GlobalMessage"','id'), COALESCE(MAX(id),0)+1, false) FROM "GlobalMessage"`);
      }

      if (d.directMessages?.length) {
        for (const m of d.directMessages) {
          await tx.directMessage.create({ data: {
            id: m.id, fromId: m.fromId, toId: m.toId,
            content: m.content, read: m.read,
            createdAt: toDate(m.createdAt) || new Date(),
            deletedAt: toDate(m.deletedAt)
          }});
        }
        await tx.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"DirectMessage"','id'), COALESCE(MAX(id),0)+1, false) FROM "DirectMessage"`);
      }

      if (d.friendRequests?.length) {
        for (const fr of d.friendRequests) {
          await tx.friendRequest.create({ data: {
            id: fr.id, fromId: fr.fromId, toId: fr.toId,
            status: fr.status, createdAt: toDate(fr.createdAt) || new Date()
          }});
        }
        await tx.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"FriendRequest"','id'), COALESCE(MAX(id),0)+1, false) FROM "FriendRequest"`);
      }

      if (d.friendships?.length) {
        for (const fs of d.friendships) {
          await tx.friendship.create({ data: {
            id: fs.id, userAId: fs.userAId, userBId: fs.userBId,
            createdAt: toDate(fs.createdAt) || new Date()
          }});
        }
        await tx.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"Friendship"','id'), COALESCE(MAX(id),0)+1, false) FROM "Friendship"`);
      }

      if (d.cpRequests?.length) {
        for (const cr of d.cpRequests) {
          await tx.cpRequest.create({ data: {
            id: cr.id, senderId: cr.senderId, receiverId: cr.receiverId,
            type: cr.type, status: cr.status,
            createdAt: toDate(cr.createdAt) || new Date()
          }});
        }
        await tx.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"CpRequest"','id'), COALESCE(MAX(id),0)+1, false) FROM "CpRequest"`);
      }

      if (d.cpRelationships?.length) {
        for (const cr of d.cpRelationships) {
          await tx.cpRelationship.create({ data: {
            id: cr.id, user1Id: cr.user1Id, user2Id: cr.user2Id,
            type: cr.type, createdAt: toDate(cr.createdAt) || new Date()
          }});
        }
        await tx.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"CpRelationship"','id'), COALESCE(MAX(id),0)+1, false) FROM "CpRelationship"`);
      }
    }, { timeout: 60000 });

    await logAction(req.user.id, 'RESTORE', 'Database', `users=${d.users?.length || 0} rooms=${d.rooms?.length || 0}`);
    res.json({ ok: true, message: 'Yedek başarıyla yüklendi' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Yedek yüklenirken hata oluştu: ' + err.message });
  }
});

module.exports = router;
