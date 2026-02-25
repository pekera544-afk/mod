const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { getIo } = require('../socketRef');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('sslmode=disable')
    ? { rejectUnauthorized: false } : false
});

async function getMatchWithMembers(matchId) {
  const mRes = await pool.query(`SELECT * FROM "PkMatch" WHERE id = $1`, [matchId]);
  if (!mRes.rows.length) return null;
  const match = mRes.rows[0];
  const mems = await pool.query(`SELECT * FROM "PkTeamMember" WHERE "matchId" = $1 ORDER BY team, id`, [matchId]);
  match.membersA = mems.rows.filter(m => m.team === 'A');
  match.membersB = mems.rows.filter(m => m.team === 'B');
  return match;
}

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM "PkMatch" ORDER BY "startTime" DESC`);
    const matches = await Promise.all(result.rows.map(r => getMatchWithMembers(r.id)));
    res.json(matches);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const match = await getMatchWithMembers(Number(req.params.id));
    if (!match) return res.status(404).json({ error: 'Bulunamadi' });
    res.json(match);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { title, type, status, startTime, description, teamAName, teamBName, membersA, membersB } = req.body;
    if (!title || !startTime || !teamAName || !teamBName) return res.status(400).json({ error: 'Eksik alan' });
    if ((membersA?.length || 0) < 2 || (membersA?.length || 0) > 10) return res.status(400).json({ error: 'Takim A: 2-10 uye' });
    if ((membersB?.length || 0) < 2 || (membersB?.length || 0) > 10) return res.status(400).json({ error: 'Takim B: 2-10 uye' });

    const mRes = await pool.query(
      `INSERT INTO "PkMatch" (title, type, status, "startTime", description, "teamAName", "teamBName") VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [title, type || 'KISI', status || 'UPCOMING', new Date(startTime), description || '', teamAName, teamBName]
    );
    const match = mRes.rows[0];

    for (const m of (membersA || [])) {
      await pool.query(`INSERT INTO "PkTeamMember" ("matchId", team, name, "userId") VALUES ($1,'A',$2,$3)`, [match.id, m.name, m.userId || null]);
    }
    for (const m of (membersB || [])) {
      await pool.query(`INSERT INTO "PkTeamMember" ("matchId", team, name, "userId") VALUES ($1,'B',$2,$3)`, [match.id, m.name, m.userId || null]);
    }

    await pool.query(
      `INSERT INTO "Notification" (type, title, body, link) VALUES ('PK',$1,$2,'/pk')`,
      [title, `${teamAName} vs ${teamBName} - ${new Date(startTime).toLocaleDateString('tr-TR')}`]
    );

    const io = getIo();
    if (io) io.emit('new_pk', { id: match.id, title, teamAName, teamBName, startTime, type: type || 'KISI' });

    const full = await getMatchWithMembers(match.id);
    res.json(full);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { title, type, status, startTime, description, teamAName, teamBName, membersA, membersB } = req.body;
    const id = Number(req.params.id);
    if (membersA && (membersA.length < 2 || membersA.length > 10)) return res.status(400).json({ error: 'Takim A: 2-10 uye' });
    if (membersB && (membersB.length < 2 || membersB.length > 10)) return res.status(400).json({ error: 'Takim B: 2-10 uye' });

    await pool.query(
      `UPDATE "PkMatch" SET title=$1, type=$2::\"PkType\", status=$3::\"PkStatus\", "startTime"=$4, description=$5, "teamAName"=$6, "teamBName"=$7 WHERE id=$8`,
      [title, type, status, new Date(startTime), description || '', teamAName, teamBName, id]
    );
    if (membersA) {
      await pool.query(`DELETE FROM "PkTeamMember" WHERE "matchId"=$1 AND team='A'`, [id]);
      for (const m of membersA) await pool.query(`INSERT INTO "PkTeamMember" ("matchId",team,name,"userId") VALUES ($1,'A',$2,$3)`, [id, m.name, m.userId || null]);
    }
    if (membersB) {
      await pool.query(`DELETE FROM "PkTeamMember" WHERE "matchId"=$1 AND team='B'`, [id]);
      for (const m of membersB) await pool.query(`INSERT INTO "PkTeamMember" ("matchId",team,name,"userId") VALUES ($1,'B',$2,$3)`, [id, m.name, m.userId || null]);
    }

    if (status === 'LIVE') {
      const io = getIo();
      if (io) io.emit('pk_live', { id, title });
    }

    const full = await getMatchWithMembers(id);
    res.json(full);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await pool.query(`DELETE FROM "PkMatch" WHERE id=$1`, [Number(req.params.id)]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;