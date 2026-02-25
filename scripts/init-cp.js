const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('sslmode=disable')
    ? { rejectUnauthorized: false } : false
});

async function migrateCp() {
  const client = await pool.connect();
  try {
    const t1 = await client.query(`SELECT to_regclass('public."CpRequest"') AS r`);
    const t2 = await client.query(`SELECT to_regclass('public."CpRelation"') AS r`);
    const t3 = await client.query(`SELECT to_regclass('public."CpPrimaryDisplay"') AS r`);

    const allExist = t1.rows[0].r && t2.rows[0].r && t3.rows[0].r;
    if (allExist) {
      const colCheck = await client.query(
        `SELECT 1 FROM information_schema.columns WHERE table_name = 'CpRequest' AND column_name = 'fromUserId' LIMIT 1`
      );
      if (colCheck.rows.length > 0) {
        console.log('[CP] Tables already up-to-date, skipping migration.');
        return;
      }
    }

    console.log('[CP] Migrating CP tables...');

    await client.query(`DROP TABLE IF EXISTS "CpPrimaryDisplay" CASCADE`);
    await client.query(`DROP TABLE IF EXISTS "CpRelation" CASCADE`);
    await client.query(`DROP TABLE IF EXISTS "CpRelationship" CASCADE`);
    await client.query(`DROP TABLE IF EXISTS "CpRequest" CASCADE`);

    await client.query(`
      DO $$ BEGIN
        CREATE TYPE "CpType" AS ENUM ('SEVGILI','KARI_KOCA','KANKA','ARKADAS','ABLA','ABI','ANNE','BABA');
      EXCEPTION WHEN duplicate_object THEN
        NULL;
      END $$
    `);

    await client.query(`
      DO $$ BEGIN
        CREATE TYPE "CpStatus" AS ENUM ('PENDING','ACCEPTED','REJECTED','CANCELED');
      EXCEPTION WHEN duplicate_object THEN
        NULL;
      END $$
    `);

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

    await client.query(
      `CREATE UNIQUE INDEX "CpRelation_unique_idx" ON "CpRelation"("userAId","userBId","type")`
    );

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
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrateCp();