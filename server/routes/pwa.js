const express = require('express');
const router = express.Router();
const prisma = require('../db');

router.get('/manifest', async (req, res) => {
  try {
    let p = await prisma.pwaSettings.findFirst();
    if (!p) p = await prisma.pwaSettings.create({ data: {} });

    const lang = req.query.lang || 'tr';
    const description = lang === 'en' ? p.descriptionEN : p.descriptionTR;

    const manifest = {
      name: p.name,
      short_name: p.shortName,
      description,
      theme_color: p.themeColor,
      background_color: p.backgroundColor,
      start_url: p.startUrl,
      scope: p.scope,
      display: p.display,
      orientation: 'portrait',
      icons: [
        { src: p.icon192Url, sizes: '192x192', type: 'image/png' },
        { src: p.icon512Url, sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
      ],
      sw_version: p.version
    };

    res.setHeader('Content-Type', 'application/manifest+json');
    res.setHeader('Cache-Control', 'no-store');
    res.json(manifest);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
