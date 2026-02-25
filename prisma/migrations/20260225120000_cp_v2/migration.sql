-- Force drop ALL old CP tables and recreate cleanly
DROP TABLE IF EXISTS "CpPrimaryDisplay" CASCADE;
DROP TABLE IF EXISTS "CpRelation" CASCADE;
DROP TABLE IF EXISTS "CpRelationship" CASCADE;
DROP TABLE IF EXISTS "CpRequest" CASCADE;

-- Remove old User columns
ALTER TABLE "User" DROP COLUMN IF EXISTS "cpRequestCount";
ALTER TABLE "User" DROP COLUMN IF EXISTS "cpLastReset";

-- Drop enums if exist and recreate
DROP TYPE IF EXISTS "CpType" CASCADE;
DROP TYPE IF EXISTS "CpStatus" CASCADE;

CREATE TYPE "CpType" AS ENUM ('SEVGILI', 'KARI_KOCA', 'KANKA', 'ARKADAS', 'ABLA', 'ABI', 'ANNE', 'BABA');
CREATE TYPE "CpStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELED');

CREATE TABLE "CpRequest" (
    "id" SERIAL NOT NULL,
    "fromUserId" INTEGER NOT NULL,
    "toUserId" INTEGER NOT NULL,
    "type" "CpType" NOT NULL,
    "status" "CpStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CpRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CpRelation" (
    "id" SERIAL NOT NULL,
    "userAId" INTEGER NOT NULL,
    "userBId" INTEGER NOT NULL,
    "type" "CpType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CpRelation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CpPrimaryDisplay" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "cpRelationId" INTEGER NOT NULL,
    CONSTRAINT "CpPrimaryDisplay_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CpRelation_userAId_userBId_type_key" ON "CpRelation"("userAId", "userBId", "type");
CREATE UNIQUE INDEX "CpPrimaryDisplay_userId_key" ON "CpPrimaryDisplay"("userId");

ALTER TABLE "CpRequest" ADD CONSTRAINT "CpRequest_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CpRequest" ADD CONSTRAINT "CpRequest_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CpRelation" ADD CONSTRAINT "CpRelation_userAId_fkey" FOREIGN KEY ("userAId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CpRelation" ADD CONSTRAINT "CpRelation_userBId_fkey" FOREIGN KEY ("userBId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CpPrimaryDisplay" ADD CONSTRAINT "CpPrimaryDisplay_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CpPrimaryDisplay" ADD CONSTRAINT "CpPrimaryDisplay_cpRelationId_fkey" FOREIGN KEY ("cpRelationId") REFERENCES "CpRelation"("id") ON DELETE CASCADE ON UPDATE CASCADE;