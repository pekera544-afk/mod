const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { requireAuth } = require('../middleware/auth');

const CP_TYPES = ['sevgili', 'kanka', 'arkadas', 'aile'];
const CP_LABELS = { sevgili: 'Sevgili ❤️', kanka: 'Kanka 🤝', arkadas: 'Arkadaş 👥', aile: 'Aile 👨‍👩‍👧' };
const MONTHLY_LIMIT_USER = 3;
const MONTHLY_LIMIT_VIP = 10;

function resetIfNeeded(user) {
  const now = new Date();
  const lastReset = new Date(user.cpLastReset);
  const monthDiff = (now.getFullYear() - lastReset.getFullYear()) * 12 + (now.getMonth() - lastReset.getMonth());
  return monthDiff >= 1;
}

router.get('/my', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const rel = await prisma.cpRelationship.findFirst({
      where: { OR: [{ user1Id: userId }, { user2Id: userId }] },
      include: {
        user1: { select: { id: true, username: true, avatarUrl: true, avatarType: true, role: true, vip: true, level: true } },
        user2: { select: { id: true, username: true, avatarUrl: true, avatarType: true, role: true, vip: true, level: true } },
      }
    });
    if (!rel) return res.json(null);
    const partner = rel.user1Id === userId ? rel.user2 : rel.user1;
    res.json({ id: rel.id, type: rel.type, label: CP_LABELS[rel.type] || rel.type, partner, createdAt: rel.createdAt });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/user/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const rel = await prisma.cpRelationship.findFirst({
      where: { OR: [{ user1Id: userId }, { user2Id: userId }] },
      include: {
        user1: { select: { id: true, username: true, avatarUrl: true, avatarType: true, role: true, vip: true, level: true } },
        user2: { select: { id: true, username: true, avatarUrl: true, avatarType: true, role: true, vip: true, level: true } },
      }
    });
    if (!rel) return res.json(null);
    const partner = rel.user1Id === userId ? rel.user2 : rel.user1;
    res.json({ id: rel.id, type: rel.type, label: CP_LABELS[rel.type] || rel.type, partner, createdAt: rel.createdAt });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/requests/incoming', requireAuth, async (req, res) => {
  try {
    const reqs = await prisma.cpRequest.findMany({
      where: { receiverId: req.user.id, status: 'pending' },
      include: { sender: { select: { id: true, username: true, avatarUrl: true, avatarType: true, role: true, vip: true, level: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(reqs.map(r => ({ ...r, label: CP_LABELS[r.type] || r.type })));
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/request', requireAuth, async (req, res) => {
  try {
    const senderId = req.user.id;
    const { receiverId, type } = req.body;

    if (!CP_TYPES.includes(type)) return res.status(400).json({ error: 'Geçersiz CP türü' });
    if (senderId === receiverId) return res.status(400).json({ error: 'Kendinize CP isteği gönderemezsiniz' });

    const receiver = await prisma.user.findUnique({ where: { id: receiverId } });
    if (!receiver) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });

    let sender = await prisma.user.findUnique({ where: { id: senderId } });

    if (resetIfNeeded(sender)) {
      sender = await prisma.user.update({
        where: { id: senderId },
        data: { cpRequestCount: 0, cpLastReset: new Date() }
      });
    }

    const limit = sender.vip ? MONTHLY_LIMIT_VIP : MONTHLY_LIMIT_USER;
    if (sender.cpRequestCount >= limit) {
      return res.status(429).json({ error: `Aylık CP isteği hakkınız doldu (${limit})` });
    }

    const existing = await prisma.cpRequest.findFirst({
      where: { senderId, receiverId, status: 'pending' }
    });
    if (existing) return res.status(409).json({ error: 'Zaten bekleyen bir isteğiniz var' });

    const senderRel = await prisma.cpRelationship.findFirst({
      where: { OR: [{ user1Id: senderId }, { user2Id: senderId }] }
    });
    if (senderRel) return res.status(409).json({ error: 'Zaten aktif bir CP ilişkiniz var. Önce mevcut CP ilişkinizi sonlandırın.' });

    const receiverRel = await prisma.cpRelationship.findFirst({
      where: { OR: [{ user1Id: receiverId }, { user2Id: receiverId }] }
    });
    if (receiverRel) return res.status(409).json({ error: 'Bu kullanıcının zaten aktif bir CP ilişkisi var' });

    const request = await prisma.cpRequest.create({
      data: { senderId, receiverId, type },
      include: { sender: { select: { id: true, username: true, avatarUrl: true, avatarType: true, role: true, vip: true, level: true } } }
    });

    await prisma.user.update({ where: { id: senderId }, data: { cpRequestCount: { increment: 1 } } });

    res.json({ ...request, label: CP_LABELS[request.type] || request.type });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/request/:id/accept', requireAuth, async (req, res) => {
  try {
    const requestId = parseInt(req.params.id);
    const userId = req.user.id;

    const request = await prisma.cpRequest.findUnique({ where: { id: requestId } });
    if (!request || request.receiverId !== userId) return res.status(403).json({ error: 'Yetkisiz' });
    if (request.status !== 'pending') return res.status(400).json({ error: 'İstek artık geçerli değil' });

    const [existA, existB] = await Promise.all([
      prisma.cpRelationship.findFirst({ where: { OR: [{ user1Id: request.senderId }, { user2Id: request.senderId }] } }),
      prisma.cpRelationship.findFirst({ where: { OR: [{ user1Id: userId }, { user2Id: userId }] } })
    ]);
    if (existA || existB) return res.status(409).json({ error: 'Taraflardan biri zaten aktif bir CP ilişkisinde' });

    const [rel] = await prisma.$transaction([
      prisma.cpRelationship.create({ data: { user1Id: request.senderId, user2Id: userId, type: request.type } }),
      prisma.cpRequest.update({ where: { id: requestId }, data: { status: 'accepted' } }),
      prisma.cpRequest.updateMany({ where: { OR: [{ senderId: request.senderId }, { senderId: userId }], status: 'pending' }, data: { status: 'rejected' } })
    ]);

    res.json({ success: true, relationship: rel });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/request/:id/reject', requireAuth, async (req, res) => {
  try {
    const requestId = parseInt(req.params.id);
    const userId = req.user.id;

    const request = await prisma.cpRequest.findUnique({ where: { id: requestId } });
    if (!request || request.receiverId !== userId) return res.status(403).json({ error: 'Yetkisiz' });

    await prisma.cpRequest.update({ where: { id: requestId }, data: { status: 'rejected' } });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/break', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    await prisma.cpRelationship.deleteMany({
      where: { OR: [{ user1Id: userId }, { user2Id: userId }] }
    });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
