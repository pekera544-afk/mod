const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { requireAuth } = require('../middleware/auth');

const CP_PRIORITY = ['SEVGILI', 'KARI_KOCA', 'KANKA', 'ARKADAS', 'ABI', 'ABLA', 'ANNE', 'BABA'];

const USER_SELECT = {
  id: true, username: true, avatarUrl: true, avatarType: true,
  role: true, vip: true, level: true, frameType: true
};

async function areFriends(userAId, userBId) {
  const a = Math.min(userAId, userBId);
  const b = Math.max(userAId, userBId);
  const f = await prisma.friendship.findFirst({
    where: { OR: [{ userAId: a, userBId: b }, { userAId: b, userBId: a }] }
  });
  return !!f;
}

function getMainDisplay(relations, primaryId) {
  if (!relations || relations.length === 0) return null;
  const sevgili = relations.find(r => r.type === 'SEVGILI');
  if (sevgili) return sevgili;
  if (primaryId) {
    const primary = relations.find(r => r.id === primaryId);
    if (primary) return primary;
  }
  return relations.slice().sort((a, b) =>
    CP_PRIORITY.indexOf(a.type) - CP_PRIORITY.indexOf(b.type)
  )[0];
}

function normalizeRelation(rel, requestingUserId) {
  const isA = rel.userAId === requestingUserId;
  return {
    id: rel.id,
    type: rel.type,
    partner: isA ? rel.userB : rel.userA,
    partnerSide: isA ? 'B' : 'A',
    createdAt: rel.createdAt
  };
}

// GET /api/cp/relations/:userId
router.get('/relations/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const rawRels = await prisma.cpRelation.findMany({
      where: { OR: [{ userAId: userId }, { userBId: userId }] },
      include: { userA: { select: USER_SELECT }, userB: { select: USER_SELECT } },
      orderBy: { createdAt: 'asc' }
    });

    const primaryDisplay = await prisma.cpPrimaryDisplay.findUnique({
      where: { userId }
    });

    const relations = rawRels.map(r => normalizeRelation(r, userId));
    const mainDisplay = getMainDisplay(relations, primaryDisplay?.cpRelationId);

    res.json({
      relations,
      primaryDisplayRelationId: primaryDisplay?.cpRelationId || null,
      mainDisplay: mainDisplay || null
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', code: 'SERVER_ERROR' });
  }
});

// GET /api/cp/requests/inbox
router.get('/requests/inbox', requireAuth, async (req, res) => {
  try {
    const reqs = await prisma.cpRequest.findMany({
      where: { toUserId: req.user.id, status: 'PENDING' },
      include: { fromUser: { select: USER_SELECT } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(reqs);
  } catch (err) {
    res.status(500).json({ message: 'Server error', code: 'SERVER_ERROR' });
  }
});

// POST /api/cp/request
router.post('/request', requireAuth, async (req, res) => {
  try {
    const fromUserId = req.user.id;
    const { toUserId, type } = req.body;
    const toId = parseInt(toUserId);

    if (!CP_PRIORITY.includes(type)) return res.status(400).json({ message: 'Geçersiz CP türü', code: 'INVALID_TYPE' });
    if (fromUserId === toId) return res.status(400).json({ message: 'Kendinize istek gönderemezsiniz', code: 'SELF_REQUEST' });

    const target = await prisma.user.findUnique({ where: { id: toId } });
    if (!target) return res.status(404).json({ message: 'Kullanıcı bulunamadı', code: 'NOT_FOUND' });

    const friends = await areFriends(fromUserId, toId);
    if (!friends) return res.status(403).json({ message: 'Sadece arkadaşlarınıza CP isteği gönderebilirsiniz', code: 'NOT_FRIENDS' });

    const pending = await prisma.cpRequest.findFirst({
      where: { fromUserId, toUserId: toId, type, status: 'PENDING' }
    });
    if (pending) return res.status(409).json({ message: 'Bu türde bekleyen bir isteğiniz zaten var', code: 'DUPLICATE_REQUEST' });

    const aId = Math.min(fromUserId, toId);
    const bId = Math.max(fromUserId, toId);
    const existingRel = await prisma.cpRelation.findFirst({
      where: { userAId: aId, userBId: bId, type }
    });
    if (existingRel) return res.status(409).json({ message: 'Bu tür ilişki zaten mevcut', code: 'RELATION_EXISTS' });

    const request = await prisma.cpRequest.create({
      data: { fromUserId, toUserId: toId, type },
      include: { fromUser: { select: USER_SELECT }, toUser: { select: USER_SELECT } }
    });

    res.json(request);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', code: 'SERVER_ERROR' });
  }
});

// POST /api/cp/respond
router.post('/respond', requireAuth, async (req, res) => {
  try {
    const { requestId, action } = req.body;
    const reqId = parseInt(requestId);

    if (!['ACCEPT', 'REJECT'].includes(action)) return res.status(400).json({ message: 'Geçersiz aksiyon', code: 'INVALID_ACTION' });

    const cpReq = await prisma.cpRequest.findUnique({ where: { id: reqId } });
    if (!cpReq) return res.status(404).json({ message: 'İstek bulunamadı', code: 'NOT_FOUND' });
    if (cpReq.toUserId !== req.user.id) return res.status(403).json({ message: 'Yetkisiz', code: 'UNAUTHORIZED' });
    if (cpReq.status !== 'PENDING') return res.status(400).json({ message: 'İstek artık geçerli değil', code: 'NOT_PENDING' });

    if (action === 'REJECT') {
      await prisma.cpRequest.update({ where: { id: reqId }, data: { status: 'REJECTED' } });
      return res.json({ success: true });
    }

    // ACCEPT
    const aId = Math.min(cpReq.fromUserId, cpReq.toUserId);
    const bId = Math.max(cpReq.fromUserId, cpReq.toUserId);

    const existingRel = await prisma.cpRelation.findFirst({
      where: { userAId: aId, userBId: bId, type: cpReq.type }
    });
    if (existingRel) {
      await prisma.cpRequest.update({ where: { id: reqId }, data: { status: 'ACCEPTED' } });
      return res.status(409).json({ message: 'Bu ilişki zaten mevcut', code: 'RELATION_EXISTS' });
    }

    const [relation] = await prisma.$transaction([
      prisma.cpRelation.create({ data: { userAId: aId, userBId: bId, type: cpReq.type } }),
      prisma.cpRequest.update({ where: { id: reqId }, data: { status: 'ACCEPTED' } })
    ]);

    // Auto-set primary if none exists and no SEVGILI for both users
    for (const uid of [cpReq.fromUserId, cpReq.toUserId]) {
      const existing = await prisma.cpPrimaryDisplay.findUnique({ where: { userId: uid } });
      if (!existing) {
        const hasSevgili = await prisma.cpRelation.findFirst({
          where: { OR: [{ userAId: uid }, { userBId: uid }], type: 'SEVGILI' }
        });
        if (!hasSevgili || cpReq.type === 'SEVGILI') {
          await prisma.cpPrimaryDisplay.create({ data: { userId: uid, cpRelationId: relation.id } });
        }
      }
    }

    res.json({ success: true, relation });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', code: 'SERVER_ERROR' });
  }
});

// DELETE /api/cp/remove
router.delete('/remove', requireAuth, async (req, res) => {
  try {
    const { relationId } = req.body;
    const relId = parseInt(relationId);
    const userId = req.user.id;

    const rel = await prisma.cpRelation.findUnique({ where: { id: relId } });
    if (!rel) return res.status(404).json({ message: 'İlişki bulunamadı', code: 'NOT_FOUND' });
    if (rel.userAId !== userId && rel.userBId !== userId) {
      return res.status(403).json({ message: 'Yetkisiz', code: 'UNAUTHORIZED' });
    }

    // Clear primary if this was primary for either user
    await prisma.cpPrimaryDisplay.deleteMany({ where: { cpRelationId: relId } });
    await prisma.cpRelation.delete({ where: { id: relId } });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Server error', code: 'SERVER_ERROR' });
  }
});

// POST /api/cp/primary
router.post('/primary', requireAuth, async (req, res) => {
  try {
    const { relationId } = req.body;
    const relId = parseInt(relationId);
    const userId = req.user.id;

    const rel = await prisma.cpRelation.findUnique({ where: { id: relId } });
    if (!rel) return res.status(404).json({ message: 'İlişki bulunamadı', code: 'NOT_FOUND' });
    if (rel.userAId !== userId && rel.userBId !== userId) {
      return res.status(403).json({ message: 'Yetkisiz', code: 'UNAUTHORIZED' });
    }

    await prisma.cpPrimaryDisplay.upsert({
      where: { userId },
      update: { cpRelationId: relId },
      create: { userId, cpRelationId: relId }
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Server error', code: 'SERVER_ERROR' });
  }
});

module.exports = router;