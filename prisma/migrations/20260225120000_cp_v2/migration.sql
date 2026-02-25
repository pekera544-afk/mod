-- Drop old CP tables (replaced by new multi-relation system)
DROP TABLE IF EXISTS "CpRelationship" CASCADE;
DROP TABLE IF EXISTS "CpRequest" CASCADE;

-- Remove old User columns
ALTER TABLE "User" DROP COLUMN IF EXISTS "cpRequestCount";
ALTER TABLE "User" DROP COLUMN IF EXISTS "cpLastReset";

-- CreateEnum CpType
DO $$ BEGIN
  CREATE TYPE "CpType" AS ENUM ('SEVGILI', 'KARI_KOCA', 'KANKA', 'ARKADAS', 'ABLA', 'ABI', 'ANNE', 'BABA');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- CreateEnum CpStatus
DO $$ BEGIN
  CREATE TYPE "CpStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- CreateTable CpRequest
CREATE TABLE IF NOT EXISTS "CpRequest" (
    "id" SERIAL NOT NULL,
    "fromUserId" INTEGER NOT NULL,
    "toUserId" INTEGER NOT NULL,
    "type" "CpType" NOT NULL,
    "status" "CpStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CpRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable CpRelation
CREATE TABLE IF NOT EXISTS "CpRelation" (
    "id" SERIAL NOT NULL,
    "userAId" INTEGER NOT NULL,
    "userBId" INTEGER NOT NULL,
    "type" "CpType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CpRelation_pkey" PRIMARY KEY ("id")
);

-- CreateTable CpPrimaryDisplay
CREATE TABLE IF NOT EXISTS "CpPrimaryDisplay" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "cpRelationId" INTEGER NOT NULL,
    CONSTRAINT "CpPrimaryDisplay_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "CpRelation_userAId_userBId_type_key" ON "CpRelation"("userAId", "userBId", "type");
CREATE UNIQUE INDEX IF NOT EXISTS "CpPrimaryDisplay_userId_key" ON "CpPrimaryDisplay"("userId");

-- AddForeignKey
ALTER TABLE "CpRequest" ADD CONSTRAINT "CpRequest_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CpRequest" ADD CONSTRAINT "CpRequest_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CpRelation" ADD CONSTRAINT "CpRelation_userAId_fkey" FOREIGN KEY ("userAId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CpRelation" ADD CONSTRAINT "CpRelation_userBId_fkey" FOREIGN KEY ("userBId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CpPrimaryDisplay" ADD CONSTRAINT "CpPrimaryDisplay_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CpPrimaryDisplay" ADD CONSTRAINT "CpPrimaryDisplay_cpRelationId_fkey" FOREIGN KEY ("cpRelationId") REFERENCES "CpRelation"("id") ON DELETE CASCADE ON UPDATE CASCADE;