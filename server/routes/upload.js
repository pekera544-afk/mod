const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { requireAuth } = require('../middleware/auth');
const prisma = require('../db');

const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `avatar_${req.user.id}_${Date.now()}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Sadece resim dosyaları kabul edilir (JPEG, PNG, WebP, GIF)'));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 8 * 1024 * 1024 }
});

router.post('/avatar', requireAuth, (req, res) => {
  upload.single('avatar')(req, res, async (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'Dosya 8MB\'dan büyük olamaz' });
      return res.status(400).json({ error: err.message || 'Yükleme hatası' });
    }
    if (!req.file) return res.status(400).json({ error: 'Dosya seçilmedi' });

    const isGif = req.file.mimetype === 'image/gif';
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const isPrivileged = user.role === 'admin' || user.role === 'moderator' || user.vip;

    if (isGif && !isPrivileged) {
      fs.unlinkSync(req.file.path);
      return res.status(403).json({ error: 'GIF avatar yalnızca VIP, Moderatör veya Admin üyeler için kullanılabilir' });
    }

    const avatarUrl = `/uploads/${req.file.filename}`;
    const avatarType = isGif ? 'gif' : 'image';

    const PROFILE_SELECT = {
      id: true, username: true, role: true, vip: true,
      avatarUrl: true, avatarType: true, frameType: true, badges: true,
      level: true, xp: true, bio: true, createdAt: true
    };

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: { avatarUrl, avatarType },
      select: PROFILE_SELECT
    });

    res.json({ ok: true, avatarUrl, avatarType, user: updated });
  });
});

module.exports = router;
