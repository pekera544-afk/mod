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
    const result = await pool.query(`
      SELECT id, "titleTR", "titleEN", "descriptionTR", "descriptionEN",
             "startTime", "posterUrl", badge, "isActive"
      FROM "Event"
      WHERE "isActive" = true
      ORDER BY "startTime" ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/all', async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM "Event" ORDER BY "startTime" ASC`);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;