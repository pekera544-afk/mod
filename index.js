require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');

async function migrateCp() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('sslmode=disable')
      ? { rejectUnauthorized: false } : false
  });
  const client = await pool.connect();
  try {
    const q = await client.query(`
      SELECT
        (SELECT COUNT(*)::int FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'CpRequest') AS has_req,
        (SELECT COUNT(*)::int FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'CpRelation') AS has_rel,
        (SELECT COUNT(*)::int FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'CpPrimaryDisplay') AS has_prim,
        (SELECT COUNT(*)::int FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'CpRequest' AND column_name = 'fromUserId') AS has_col
    `);
    const r = q.rows[0];
    console.log('[CP] DB check:', JSON.stringify(r));
    if (r.has_req === 1 && r.has_rel === 1 && r.has_prim === 1 && r.has_col === 1) {
      console.log('[CP] Tables OK, skipping migration.');
      return;
    }
    console.log('[CP] Running migration...');
    await client.query(`DROP TABLE IF EXISTS "CpPrimaryDisplay" CASCADE`);
    await client.query(`DROP TABLE IF EXISTS "CpRelation" CASCADE`);
    await client.query(`DROP TABLE IF EXISTS "CpRelationship" CASCADE`);
    await client.query(`DROP TABLE IF EXISTS "CpRequest" CASCADE`);
    await client.query(`DROP TYPE IF EXISTS "CpType" CASCADE`);
    await client.query(`DROP TYPE IF EXISTS "CpStatus" CASCADE`);
    await client.query(`CREATE TYPE "CpType" AS ENUM ('SEVGILI','KARI_KOCA','KANKA','ARKADAS','ABLA','ABI','ANNE','BABA')`);
    await client.query(`CREATE TYPE "CpStatus" AS ENUM ('PENDING','ACCEPTED','REJECTED','CANCELED')`);
    await client.query(`
      CREATE TABLE "CpRequest" (
        "id"         SERIAL PRIMARY KEY,
        "fromUserId" INTEGER NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
        "toUserId"   INTEGER NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
        "type"       "CpType"   NOT NULL,
        "status"     "CpStatus" NOT NULL DEFAULT 'PENDING',
        "createdAt"  TIMESTAMP  NOT NULL DEFAULT NOW(),
        "updatedAt"  TIMESTAMP  NOT NULL DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE TABLE "CpRelation" (
        "id"        SERIAL PRIMARY KEY,
        "userAId"   INTEGER NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
        "userBId"   INTEGER NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
        "type"      "CpType" NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT "CpRelation_userAId_userBId_type_key" UNIQUE ("userAId","userBId","type")
      )
    `);
    await client.query(`
      CREATE TABLE "CpPrimaryDisplay" (
        "id"           SERIAL PRIMARY KEY,
        "userId"       INTEGER NOT NULL UNIQUE REFERENCES "User"(id) ON DELETE CASCADE,
        "cpRelationId" INTEGER NOT NULL REFERENCES "CpRelation"(id) ON DELETE CASCADE
      )
    `);
    await client.query(`ALTER TABLE "User" DROP COLUMN IF EXISTS "cpRequestCount"`);
    await client.query(`ALTER TABLE "User" DROP COLUMN IF EXISTS "cpLastReset"`);
    console.log('[CP] Migration complete!');
  } catch (err) {
    console.error('[CP] Migration FAILED:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => res.status(200).json({ ok: true }));
app.use('/api/settings', require('./server/routes/settings'));
app.use('/api/auth', require('./server/routes/auth'));
app.use('/api/rooms', require('./server/routes/rooms'));
app.use('/api/profile', require('./server/routes/profile'));
app.use('/api/cp', require('./server/routes/cp'));
app.use('/api/news', require('./server/routes/news'));
app.use('/api', require('./server/routes/public'));
app.use('/api/admin', require('./server/routes/admin'));
app.use('/api/pwa', require('./server/routes/pwa'));
app.use('/api/upload', require('./server/routes/upload'));

const uploadsPath = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsPath)) fs.mkdirSync(uploadsPath, { recursive: true });
app.use('/uploads', express.static(uploadsPath));

const distPath = path.join(__dirname, 'client', 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath, {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      } else if (filePath.endsWith('sw.js') || filePath.endsWith('manifest.webmanifest')) {
        res.setHeader('Cache-Control', 'no-cache, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
      } else if (/\.(js|css|woff2?|png|jpg|svg|ico)$/.test(filePath)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    }
  }));
  app.get('/{*splat}', (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.json({ message: 'YOKO AJANS API running. Build the frontend with: npm run build:client' });
  });
}

require('./server/socketRef').setIo(io);
require('./server/socket')(io);

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} kullanim da! Lutfen mevcut sureci kapatin.`);
    process.exit(1);
  } else {
    console.error('Server error:', err);
    process.exit(1);
  }
});

migrateCp()
  .then(() => {
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`YOKO AJANS server running at http://0.0.0.0:${PORT}`);
      require('./server/seed')().catch(err => console.error('Seed error:', err.message));
    });
  })
  .catch(err => {
    console.error('[CP] Fatal error during migration, aborting startup:', err.message);
    process.exit(1);
  });