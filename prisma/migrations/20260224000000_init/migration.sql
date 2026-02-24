-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Settings" (
    "id" SERIAL NOT NULL,
    "siteTitle" TEXT NOT NULL DEFAULT 'YOKO AJANS',
    "heroCardUserId" INTEGER,
    "taglineTR" TEXT NOT NULL DEFAULT 'Birlikte İzle, Birlikte Hisset.',
    "taglineEN" TEXT NOT NULL DEFAULT 'Watch Together, Feel Together.',
    "logoUrl" TEXT NOT NULL DEFAULT '',
    "primaryColor" TEXT NOT NULL DEFAULT '#d4af37',
    "bgImageUrl" TEXT NOT NULL DEFAULT '',
    "heroTitleTR" TEXT NOT NULL DEFAULT 'YOKO AJANS',
    "heroTitleEN" TEXT NOT NULL DEFAULT 'YOKO AJANS',
    "menuHomeTR" TEXT NOT NULL DEFAULT 'Ana Sayfa',
    "menuHomeEN" TEXT NOT NULL DEFAULT 'Home',
    "menuRoomsTR" TEXT NOT NULL DEFAULT 'Sinema Odaları',
    "menuRoomsEN" TEXT NOT NULL DEFAULT 'Cinema Rooms',
    "menuEventsTR" TEXT NOT NULL DEFAULT 'Etkinlikler',
    "menuEventsEN" TEXT NOT NULL DEFAULT 'Events',
    "menuTopTR" TEXT NOT NULL DEFAULT 'Ayın Elemanları',
    "menuTopEN" TEXT NOT NULL DEFAULT 'Top Members',
    "menuAnnouncTR" TEXT NOT NULL DEFAULT 'Duyurular',
    "menuAnnouncEN" TEXT NOT NULL DEFAULT 'Announcements',
    "menuVipTR" TEXT NOT NULL DEFAULT 'VIP',
    "menuVipEN" TEXT NOT NULL DEFAULT 'VIP',
    "menuAdminTR" TEXT NOT NULL DEFAULT 'Yönetim',
    "menuAdminEN" TEXT NOT NULL DEFAULT 'Management',
    "menuSettingsTR" TEXT NOT NULL DEFAULT 'Ayarlar',
    "menuSettingsEN" TEXT NOT NULL DEFAULT 'Settings',
    "whatsappUrl" TEXT NOT NULL DEFAULT '',
    "telegramUrl" TEXT NOT NULL DEFAULT '',
    "supportUrl" TEXT NOT NULL DEFAULT '/',
    "showWhatsapp" BOOLEAN NOT NULL DEFAULT true,
    "showTelegram" BOOLEAN NOT NULL DEFAULT true,
    "showSupport" BOOLEAN NOT NULL DEFAULT true,
    "wolfImageUrl" TEXT NOT NULL DEFAULT '',
    "heroCardSubtitle" TEXT NOT NULL DEFAULT 'Sesin Gücü Bizde!',
    "heroCardStat1Icon" TEXT NOT NULL DEFAULT '🔒',
    "heroCardStat1Value" TEXT NOT NULL DEFAULT '145',
    "heroCardStat1Label" TEXT NOT NULL DEFAULT 'Aktif Yayıncı',
    "heroCardStat2Icon" TEXT NOT NULL DEFAULT '🏆',
    "heroCardStat2Value" TEXT NOT NULL DEFAULT '98,750 ₺',
    "heroCardStat2Label" TEXT NOT NULL DEFAULT 'Bu Ayki Kazanç',
    "heroCardStat3Icon" TEXT NOT NULL DEFAULT '✨',
    "heroCardStat3Label" TEXT NOT NULL DEFAULT 'Oda Aktif',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PwaSettings" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'YOKO AJANS',
    "shortName" TEXT NOT NULL DEFAULT 'YOKO',
    "descriptionTR" TEXT NOT NULL DEFAULT 'Birlikte İzle, Birlikte Hisset.',
    "descriptionEN" TEXT NOT NULL DEFAULT 'Watch Together, Feel Together.',
    "themeColor" TEXT NOT NULL DEFAULT '#0f0f14',
    "backgroundColor" TEXT NOT NULL DEFAULT '#0f0f14',
    "icon192Url" TEXT NOT NULL DEFAULT '/icons/icon-192.png',
    "icon512Url" TEXT NOT NULL DEFAULT '/icons/icon-512.png',
    "startUrl" TEXT NOT NULL DEFAULT '/',
    "scope" TEXT NOT NULL DEFAULT '/',
    "display" TEXT NOT NULL DEFAULT 'standalone',
    "version" INTEGER NOT NULL DEFAULT 1,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PwaSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'user',
    "vip" BOOLEAN NOT NULL DEFAULT false,
    "vipExpiresAt" TIMESTAMP(3),
    "banned" BOOLEAN NOT NULL DEFAULT false,
    "bannedUntil" TIMESTAMP(3),
    "avatarUrl" TEXT NOT NULL DEFAULT '',
    "avatarType" TEXT NOT NULL DEFAULT 'image',
    "frameType" TEXT NOT NULL DEFAULT '',
    "frameColor" TEXT NOT NULL DEFAULT '',
    "frameExpiresAt" TIMESTAMP(3),
    "chatBubble" TEXT NOT NULL DEFAULT '',
    "usernameColor" TEXT NOT NULL DEFAULT '',
    "usernameColorExpires" TIMESTAMP(3),
    "badges" TEXT NOT NULL DEFAULT '',
    "xp" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "bio" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Room" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "movieTitle" TEXT NOT NULL DEFAULT '',
    "posterUrl" TEXT NOT NULL DEFAULT '',
    "streamUrl" TEXT NOT NULL DEFAULT '',
    "providerType" TEXT NOT NULL DEFAULT 'youtube',
    "isTrending" BOOLEAN NOT NULL DEFAULT false,
    "allowedRoles" TEXT NOT NULL DEFAULT 'user,vip,admin',
    "maxUsers" INTEGER NOT NULL DEFAULT 100,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "passwordHash" TEXT,
    "chatEnabled" BOOLEAN NOT NULL DEFAULT true,
    "spamProtectionEnabled" BOOLEAN NOT NULL DEFAULT true,
    "spamCooldownSeconds" INTEGER NOT NULL DEFAULT 3,
    "ownerId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomModerator" (
    "id" SERIAL NOT NULL,
    "roomId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "assignedBy" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoomModerator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomBan" (
    "id" SERIAL NOT NULL,
    "roomId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "bannedBy" INTEGER NOT NULL,
    "reason" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoomBan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomState" (
    "id" SERIAL NOT NULL,
    "roomId" INTEGER NOT NULL,
    "isPlaying" BOOLEAN NOT NULL DEFAULT false,
    "currentTimeSeconds" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "streamUrlVersion" INTEGER NOT NULL DEFAULT 1,
    "lastUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoomState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" SERIAL NOT NULL,
    "roomId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "reaction" TEXT NOT NULL DEFAULT '',
    "replyToId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GlobalMessage" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "GlobalMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FriendRequest" (
    "id" SERIAL NOT NULL,
    "fromId" INTEGER NOT NULL,
    "toId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FriendRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Friendship" (
    "id" SERIAL NOT NULL,
    "userAId" INTEGER NOT NULL,
    "userBId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Friendship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DirectMessage" (
    "id" SERIAL NOT NULL,
    "fromId" INTEGER NOT NULL,
    "toId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "DirectMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Announcement" (
    "id" SERIAL NOT NULL,
    "titleTR" TEXT NOT NULL,
    "titleEN" TEXT NOT NULL,
    "contentTR" TEXT NOT NULL,
    "contentEN" TEXT NOT NULL,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" SERIAL NOT NULL,
    "titleTR" TEXT NOT NULL,
    "titleEN" TEXT NOT NULL,
    "descriptionTR" TEXT NOT NULL DEFAULT '',
    "descriptionEN" TEXT NOT NULL DEFAULT '',
    "startTime" TIMESTAMP(3) NOT NULL,
    "posterUrl" TEXT NOT NULL DEFAULT '',
    "badge" TEXT NOT NULL DEFAULT '',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" SERIAL NOT NULL,
    "adminId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "detail" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "News" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "imageUrl" TEXT NOT NULL DEFAULT '',
    "videoUrl" TEXT NOT NULL DEFAULT '',
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "News_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "RoomModerator_roomId_userId_key" ON "RoomModerator"("roomId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "RoomBan_roomId_userId_key" ON "RoomBan"("roomId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "RoomState_roomId_key" ON "RoomState"("roomId");

-- CreateIndex
CREATE UNIQUE INDEX "FriendRequest_fromId_toId_key" ON "FriendRequest"("fromId", "toId");

-- CreateIndex
CREATE UNIQUE INDEX "Friendship_userAId_userBId_key" ON "Friendship"("userAId", "userBId");

-- AddForeignKey
ALTER TABLE "Settings" ADD CONSTRAINT "Settings_heroCardUserId_fkey" FOREIGN KEY ("heroCardUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomModerator" ADD CONSTRAINT "RoomModerator_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomModerator" ADD CONSTRAINT "RoomModerator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomModerator" ADD CONSTRAINT "RoomModerator_assignedBy_fkey" FOREIGN KEY ("assignedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomBan" ADD CONSTRAINT "RoomBan_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomBan" ADD CONSTRAINT "RoomBan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomBan" ADD CONSTRAINT "RoomBan_bannedBy_fkey" FOREIGN KEY ("bannedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomState" ADD CONSTRAINT "RoomState_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_replyToId_fkey" FOREIGN KEY ("replyToId") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GlobalMessage" ADD CONSTRAINT "GlobalMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FriendRequest" ADD CONSTRAINT "FriendRequest_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FriendRequest" ADD CONSTRAINT "FriendRequest_toId_fkey" FOREIGN KEY ("toId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Friendship" ADD CONSTRAINT "Friendship_userAId_fkey" FOREIGN KEY ("userAId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Friendship" ADD CONSTRAINT "Friendship_userBId_fkey" FOREIGN KEY ("userBId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectMessage" ADD CONSTRAINT "DirectMessage_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectMessage" ADD CONSTRAINT "DirectMessage_toId_fkey" FOREIGN KEY ("toId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

