const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('sslmode=disable')
    ? { rejectUnauthorized: false } : false
});

router.get('/', async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 30, 100);
    const result = await pool.query(`SELECT * FROM "Notification" ORDER BY "createdAt" DESC LIMIT $1`, [limit]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/count', async (req, res) => {
  try {
    const since = req.query.since ? new Date(Number(req.query.since)) : new Date(0);
    const result = await pool.query(`SELECT COUNT(*)::int AS count FROM "Notification" WHERE "createdAt" > $1`, [since]);
    res.json({ count: result.rows[0].count });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;