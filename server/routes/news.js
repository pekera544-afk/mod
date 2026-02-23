const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { requireAuth } = require('../middleware/auth');
const { getIo } = require('../socketRef');

router.get('/', async (req, res) => {
  try {
    const news = await prisma.news.findMany({
      where: { published: true },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    res.json(news);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/all', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    const news = await prisma.news.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(news);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const item = await prisma.news.findFirst({ where: { id: Number(req.params.id), published: true } });
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    const { title, description, imageUrl, videoUrl, published } = req.body;
    if (!title) return res.status(400).json({ error: 'Başlık zorunlu' });
    const item = await prisma.news.create({
      data: { title, description: description || '', imageUrl: imageUrl || '', videoUrl: videoUrl || '', published: !!published }
    });
    if (published) {
      const io = getIo();
      if (io) io.emit('new_news_published', { id: item.id, title: item.title, imageUrl: item.imageUrl });
    }
    res.json(item);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    const { title, description, imageUrl, videoUrl, published } = req.body;
    const existing = await prisma.news.findUnique({ where: { id: Number(req.params.id) } });
    if (!existing) return res.status(404).json({ error: 'Not found' });
    const item = await prisma.news.update({
      where: { id: Number(req.params.id) },
      data: { title, description, imageUrl, videoUrl, published: !!published }
    });
    if (published && !existing.published) {
      const io = getIo();
      if (io) io.emit('new_news_published', { id: item.id, title: item.title, imageUrl: item.imageUrl });
    }
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    await prisma.news.delete({ where: { id: Number(req.params.id) } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
