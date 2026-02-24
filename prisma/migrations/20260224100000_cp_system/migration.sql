-- AlterTable: add CP fields to User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "cpRequestCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "cpLastReset" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable: CpRequest
CREATE TABLE IF NOT EXISTS "CpRequest" (
    "id" SERIAL NOT NULL,
    "senderId" INTEGER NOT NULL,
    "receiverId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CpRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable: CpRelationship
CREATE TABLE IF NOT EXISTS "CpRelationship" (
    "id" SERIAL NOT NULL,
    "user1Id" INTEGER NOT NULL,
    "user2Id" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CpRelationship_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "CpRelationship_user1Id_user2Id_key" ON "CpRelationship"("user1Id", "user2Id");

-- AddForeignKey
ALTER TABLE "CpRequest" ADD CONSTRAINT "CpRequest_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CpRequest" ADD CONSTRAINT "CpRequest_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CpRelationship" ADD CONSTRAINT "CpRelationship_user1Id_fkey" FOREIGN KEY ("user1Id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CpRelationship" ADD CONSTRAINT "CpRelationship_user2Id_fkey" FOREIGN KEY ("user2Id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
