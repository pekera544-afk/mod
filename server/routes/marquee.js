const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('sslmode=disable')
    ? { rejectUnauthorized: false } : false
});

router.get('/', async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT "marqueeEnabled", "marqueeText", "marqueeSpeed", "marqueeFontSize", "marqueeColor"
      FROM "Settings" LIMIT 1
    `);
    if (!r.rows.length) return res.json({ marqueeEnabled: false, marqueeText: '', marqueeSpeed: 50, marqueeFontSize: 14, marqueeColor: '#d4af37' });
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { marqueeEnabled, marqueeText, marqueeSpeed, marqueeFontSize, marqueeColor } = req.body;
    await pool.query(`
      UPDATE "Settings" SET
        "marqueeEnabled" = $1,
        "marqueeText"    = $2,
        "marqueeSpeed"   = $3,
        "marqueeFontSize"= $4,
        "marqueeColor"   = $5
    `, [!!marqueeEnabled, marqueeText || '', Number(marqueeSpeed) || 50, Number(marqueeFontSize) || 14, marqueeColor || '#d4af37']);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;