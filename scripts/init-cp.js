const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('sslmode=disable')
    ? { rejectUnauthorized: false } : false
});

async function needsMigration(client) {
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
  const allOk = r.has_req === 1 && r.has_rel === 1 && r.has_prim === 1 && r.has_col === 1;
  console.log('[CP] Check:', JSON.stringify(r), '=> needsMigration:', !allOk);
  return !allOk;
}

async function migrateCp() {
  const client = await pool.connect();
  try {
    if (!(await needsMigration(client))) {
      console.log('[CP] Tables already up-to-date, skipping.');
      return;
    }

    console.log('[CP] Starting migration...');

    await client.query(`DROP TABLE IF EXISTS "CpPrimaryDisplay" CASCADE`);
    await client.query(`DROP TABLE IF EXISTS "CpRelation" CASCADE`);
    await client.query(`DROP TABLE IF EXISTS "CpRelationship" CASCADE`);
    await client.query(`DROP TABLE IF EXISTS "CpRequest" CASCADE`);
    await client.query(`DROP TYPE IF EXISTS "CpType" CASCADE`);
    await client.query(`DROP TYPE IF EXISTS "CpStatus" CASCADE`);
    console.log('[CP] Dropped old tables/types');

    await client.query(`CREATE TYPE "CpType" AS ENUM ('SEVGILI','KARI_KOCA','KANKA','ARKADAS','ABLA','ABI','ANNE','BABA')`);
    await client.query(`CREATE TYPE "CpStatus" AS ENUM ('PENDING','ACCEPTED','REJECTED','CANCELED')`);
    console.log('[CP] Created enum types');

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
    console.log('[CP] Created CpRequest');

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
    console.log('[CP] Created CpRelation');

    await client.query(`
      CREATE TABLE "CpPrimaryDisplay" (
        "id"           SERIAL PRIMARY KEY,
        "userId"       INTEGER NOT NULL UNIQUE REFERENCES "User"(id) ON DELETE CASCADE,
        "cpRelationId" INTEGER NOT NULL REFERENCES "CpRelation"(id) ON DELETE CASCADE
      )
    `);
    console.log('[CP] Created CpPrimaryDisplay');

    await client.query(`ALTER TABLE "User" DROP COLUMN IF EXISTS "cpRequestCount"`);
    await client.query(`ALTER TABLE "User" DROP COLUMN IF EXISTS "cpLastReset"`);

    console.log('[CP] Migration complete!');
  } catch (err) {
    console.error('[CP] Migration FAILED:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrateCp();