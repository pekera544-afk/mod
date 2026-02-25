const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('sslmode=disable')
    ? { rejectUnauthorized: false } : false
});

async function migrateCp() {
  const client = await pool.connect();
  try {
    // Check if CpRequest table has the new 'fromUserId' column
    const colCheck = await client.query(`
      SELECT attname FROM pg_attribute
      WHERE attrelid = (SELECT oid FROM pg_class WHERE relname = 'CpRequest' LIMIT 1)
        AND attname = 'fromUserId' AND attnum > 0
    `);

    if (colCheck.rows.length > 0) {
      console.log('[CP] Tables already up-to-date, skipping migration.');
      return;
    }

    console.log('[CP] Migrating CP tables to new schema...');

    await client.query(`
      DROP TABLE IF EXISTS "CpPrimaryDisplay" CASCADE;
      DROP TABLE IF EXISTS "CpRelation" CASCADE;
      DROP TABLE IF EXISTS "CpRelationship" CASCADE;
      DROP TABLE IF EXISTS "CpRequest" CASCADE;
    `);

    const typeCheck = await client.query(`SELECT typname FROM pg_type WHERE typname = 'CpType'`);
    if (typeCheck.rows.length === 0) {
      await client.query(`CREATE TYPE "CpType" AS ENUM ('SEVGILI','KARI_KOCA','KANKA','ARKADAS','ABLA','ABI','ANNE','BABA')`);
    }

    const statusCheck = await client.query(`SELECT typname FROM pg_type WHERE typname = 'CpStatus'`);
    if (statusCheck.rows.length === 0) {
      await client.query(`CREATE TYPE "CpStatus" AS ENUM ('PENDING','ACCEPTED','REJECTED','CANCELED')`);
    }

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
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE UNIQUE INDEX "CpRelation_unique_idx"
        ON "CpRelation"("userAId","userBId","type")
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
    console.error('[CP] Migration error:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

migrateCp();