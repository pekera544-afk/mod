const prisma = require('./db');
const { verifyToken } = require('./middleware/auth');

const roomParticipants = new Map();
const roomStates = new Map();
const roomHosts = new Map();
const roomModerators = new Map();
const roomBanned = new Map();
const spamTracker = new Map();
const userSockets = new Map();
const globalChatParticipants = new Map();
const dmSpamTracker = new Map();
const roomDbWriteTime = new Map();

function getLiveParticipantCount(roomId) {
  const map = roomParticipants.get(String(roomId));
  return map ? map.size : 0;
}

function getAllLiveCounts() {
  const result = {};
  for (const [roomId, map] of roomParticipants.entries()) {
    result[roomId] = map.size;
  }
  return result;
}

const XP_PER_MESSAGE = 5;
const XP_TABLE = [0, 100, 250, 500, 900, 1400, 2100, 3000, 4200, 5700, 7500];

function getLevelFromXp(xp) {
  let level = 1;
  for (let i = XP_TABLE.length - 1; i >= 0; i--) {
    if (xp >= XP_TABLE[i]) { level = i + 1; break; }
  }
  return Math.min(level, 10);
}

function getXpForNextLevel(level) {
  return XP_TABLE[Math.min(level, XP_TABLE.length - 1)] || XP_TABLE[XP_TABLE.length - 1];
}

function getSpamKey(roomId, userId) { return `${roomId}:${userId}`; }

function getRoomState(roomId) {
  if (!roomStates.has(String(roomId))) {
    roomStates.set(String(roomId), {
      isPlaying: false, currentTimeSeconds: 0,
      streamUrl: '', movieTitle: '', lastUpdated: Date.now()
    });
  }
  return roomStates.get(String(roomId));
}

function canControl(socket, key) {
  if (roomHosts.get(key) === socket.id) return true;
  const mods = roomModerators.get(key);
  return mods ? mods.has(socket.id) : false;
}

function isModOrOwner(socket, key) { return canControl(socket, key); }

function userPublicData(user) {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    vip: user.vip,
    avatarUrl: user.avatarUrl || '',
    avatarType: user.avatarType || 'image',
    frameType: user.frameType || '',
    badges: user.badges || '',
    level: user.level || 1,
    xp: user.xp || 0
  };
}

async function addXp(userId, amount, io) {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return;
    const newXp = (user.xp || 0) + amount;
    const newLevel = getLevelFromXp(newXp);
    const leveledUp = newLevel > (user.level || 1);
    await prisma.user.update({ where: { id: userId }, data: { xp: newXp, level: newLevel } });
    const socketId = userSockets.get(userId);
    if (socketId) {
      io.to(socketId).emit('xp_update', { xp: newXp, level: newLevel, xpForNext: getXpForNextLevel(newLevel) });
      if (leveledUp) {
        io.to(socketId).emit('level_up', { level: newLevel });
      }
    }
  } catch {}
}

function setupSocket(io) {
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (token) {
      try { socket.user = verifyToken(token); }
      catch { socket.user = { id: null, username: 'Misafir', role: 'guest', vip: false }; }
    } else {
      socket.user = { id: null, username: 'Misafir', role: 'guest', vip: false };
    }
    next();
  });

  io.on('connection', async (socket) => {
    if (socket.user.id) {
      userSockets.set(socket.user.id, socket.id);
      try {
        const dbUser = await prisma.user.findUnique({
          where: { id: socket.user.id },
          select: { id: true, username: true, role: true, vip: true, avatarUrl: true, avatarType: true, frameType: true, badges: true, level: true, xp: true }
        });
        if (dbUser) {
          socket.user = { ...socket.user, ...dbUser };
          socket.emit('xp_update', { xp: dbUser.xp, level: dbUser.level, xpForNext: getXpForNextLevel(dbUser.level) });
          const pending = await prisma.friendRequest.count({ where: { toId: socket.user.id, status: 'pending' } });
          const unreadDMs = await prisma.directMessage.count({ where: { toId: socket.user.id, read: false, deletedAt: null } });
          socket.emit('notification_counts', { friendRequests: pending, unreadDMs });
        }
      } catch {}
    }

    socket.on('join_global_chat', () => {
      socket.join('global_chat');
      globalChatParticipants.set(socket.id, {
        id: socket.user.id,
        username: socket.user.username,
        role: socket.user.role,
        vip: socket.user.vip,
        avatarUrl: socket.user.avatarUrl || '',
        avatarType: socket.user.avatarType || 'image',
        frameType: socket.user.frameType || '',
        badges: socket.user.badges || '',
        level: socket.user.level || 1
      });
      io.to('global_chat').emit('global_participants', Array.from(globalChatParticipants.values()).filter(p => p.id));
    });

    socket.on('leave_global_chat', () => {
      socket.leave('global_chat');
      globalChatParticipants.delete(socket.id);
      io.to('global_chat').emit('global_participants', Array.from(globalChatParticipants.values()).filter(p => p.id));
    });

    socket.on('send_global_message', async ({ content }) => {
      if (!content || !content.trim()) return;
      if (!socket.user.id) {
        socket.emit('error', { message: 'Mesaj göndermek için giriş yapmalısınız' });
        return;
      }
      const trimmed = content.trim().slice(0, 500);
      const spamKey = `global:${socket.user.id}`;
      const lastTime = spamTracker.get(spamKey) || 0;
      const now = Date.now();
      const isPrivileged = socket.user.role === 'admin' || socket.user.role === 'moderator';
      if (!isPrivileged && now - lastTime < 3000) {
        const remaining = Math.ceil((3000 - (now - lastTime)) / 1000);
        socket.emit('spam_blocked', { remaining });
        return;
      }
      spamTracker.set(spamKey, now);
      try {
        const msg = await prisma.globalMessage.create({
          data: { userId: socket.user.id, content: trimmed },
          include: {
            user: {
              select: { id: true, username: true, role: true, vip: true, avatarUrl: true, avatarType: true, frameType: true, badges: true, level: true }
            }
          }
        });
        io.to('global_chat').emit('global_message', msg);
        await addXp(socket.user.id, XP_PER_MESSAGE, io);
      } catch (err) { console.error('Global message error:', err); }
    });

    socket.on('admin_delete_global_message', async ({ messageId }) => {
      if (socket.user.role !== 'admin' && socket.user.role !== 'moderator') return;
      try {
        await prisma.globalMessage.update({ where: { id: Number(messageId) }, data: { deletedAt: new Date() } });
        io.to('global_chat').emit('global_message_deleted', { messageId });
      } catch {}
    });

    socket.on('admin_clear_global_chat', async () => {
      if (socket.user.role !== 'admin') return;
      try {
        await prisma.globalMessage.updateMany({ where: { deletedAt: null }, data: { deletedAt: new Date() } });
        io.to('global_chat').emit('global_chat_cleared');
      } catch {}
    });

    socket.on('send_dm', async ({ toId, content }) => {
      if (!socket.user.id || !toId || !content?.trim()) return;
      const spamKey = `dm:${socket.user.id}`;
      const now = Date.now();
      const last = dmSpamTracker.get(spamKey) || 0;
      if (now - last < 1000) return;
      dmSpamTracker.set(spamKey, now);
      try {
        const areFriends = await prisma.friendship.findFirst({
          where: {
            OR: [
              { userAId: socket.user.id, userBId: Number(toId) },
              { userAId: Number(toId), userBId: socket.user.id }
            ]
          }
        });
        const isAdmin = socket.user.role === 'admin';
        if (!areFriends && !isAdmin) {
          socket.emit('error', { message: 'Sadece arkadaşlarınıza DM gönderebilirsiniz' });
          return;
        }
        const msg = await prisma.directMessage.create({
          data: { fromId: socket.user.id, toId: Number(toId), content: content.trim().slice(0, 1000) },
          include: { from: { select: { id: true, username: true, avatarUrl: true, role: true, vip: true, badges: true, level: true } } }
        });
        socket.emit('dm_sent', msg);
        const targetSocketId = userSockets.get(Number(toId));
        if (targetSocketId) {
          io.to(targetSocketId).emit('new_dm', msg);
        }
      } catch (err) { console.error('DM error:', err); }
    });

    socket.on('mark_dm_read', async ({ fromId }) => {
      if (!socket.user.id) return;
      try {
        await prisma.directMessage.updateMany({
          where: { fromId: Number(fromId), toId: socket.user.id, read: false },
          data: { read: true }
        });
        const unreadDMs = await prisma.directMessage.count({ where: { toId: socket.user.id, read: false } });
        socket.emit('notification_counts', {
          friendRequests: await prisma.friendRequest.count({ where: { toId: socket.user.id, status: 'pending' } }),
          unreadDMs
        });
      } catch {}
    });

    socket.on('friend_request', async ({ toId }) => {
      if (!socket.user.id || !toId) return;
      try {
        const existing = await prisma.friendRequest.findFirst({
          where: { OR: [{ fromId: socket.user.id, toId: Number(toId) }, { fromId: Number(toId), toId: socket.user.id }] }
        });
        if (existing) { socket.emit('error', { message: 'Zaten bir istek var' }); return; }
        const alreadyFriends = await prisma.friendship.findFirst({
          where: { OR: [{ userAId: socket.user.id, userBId: Number(toId) }, { userAId: Number(toId), userBId: socket.user.id }] }
        });
        if (alreadyFriends) { socket.emit('error', { message: 'Zaten arkadaşsınız' }); return; }
        await prisma.friendRequest.create({ data: { fromId: socket.user.id, toId: Number(toId) } });
        const targetSocketId = userSockets.get(Number(toId));
        if (targetSocketId) {
          io.to(targetSocketId).emit('friend_request_received', {
            id: Date.now(),
            from: {
              id: socket.user.id,
              username: socket.user.username,
              avatarUrl: socket.user.avatarUrl || '',
              avatarType: socket.user.avatarType || 'image',
              frameType: socket.user.frameType || '',
              role: socket.user.role,
              vip: socket.user.vip,
              level: socket.user.level || 1
            }
          });
          const count = await prisma.friendRequest.count({ where: { toId: Number(toId), status: 'pending' } });
          const dmCount = await prisma.directMessage.count({ where: { toId: Number(toId), read: false } });
          io.to(targetSocketId).emit('notification_counts', { friendRequests: count, unreadDMs: dmCount });
        }
        socket.emit('friend_request_sent');
      } catch (err) { console.error('Friend request error:', err); }
    });

    socket.on('accept_friend', async ({ fromId }) => {
      if (!socket.user.id || !fromId) return;
      try {
        const req = await prisma.friendRequest.findFirst({ where: { fromId: Number(fromId), toId: socket.user.id, status: 'pending' } });
        if (!req) return;
        await prisma.friendRequest.update({ where: { id: req.id }, data: { status: 'accepted' } });
        await prisma.friendship.upsert({
          where: { userAId_userBId: { userAId: Math.min(socket.user.id, Number(fromId)), userBId: Math.max(socket.user.id, Number(fromId)) } },
          update: {},
          create: { userAId: Math.min(socket.user.id, Number(fromId)), userBId: Math.max(socket.user.id, Number(fromId)) }
        });
        const fromSocketId = userSockets.get(Number(fromId));
        if (fromSocketId) {
          io.to(fromSocketId).emit('friend_accepted', { by: { id: socket.user.id, username: socket.user.username } });
        }
        const pending = await prisma.friendRequest.count({ where: { toId: socket.user.id, status: 'pending' } });
        const dmCount = await prisma.directMessage.count({ where: { toId: socket.user.id, read: false } });
        socket.emit('notification_counts', { friendRequests: pending, unreadDMs: dmCount });
        socket.emit('friend_request_accepted', { userId: Number(fromId) });
      } catch (err) { console.error('Accept friend error:', err); }
    });

    socket.on('reject_friend', async ({ fromId }) => {
      if (!socket.user.id) return;
      try {
        await prisma.friendRequest.updateMany({ where: { fromId: Number(fromId), toId: socket.user.id }, data: { status: 'rejected' } });
        const pending = await prisma.friendRequest.count({ where: { toId: socket.user.id, status: 'pending' } });
        const dmCount = await prisma.directMessage.count({ where: { toId: socket.user.id, read: false } });
        socket.emit('notification_counts', { friendRequests: pending, unreadDMs: dmCount });
      } catch {}
    });

    socket.on('join_room', async (roomId) => {
      const key = String(roomId);
      socket.join(key);
      socket.currentRoomId = key;

      if (!roomParticipants.has(key)) roomParticipants.set(key, new Map());
      if (!roomModerators.has(key)) roomModerators.set(key, new Set());

      try {
        const room = await prisma.room.findFirst({ where: { id: Number(roomId), deletedAt: null } });
        if (!room) return;

        if (socket.user.id) {
          const isBanned = await prisma.roomBan.findUnique({
            where: { roomId_userId: { roomId: Number(roomId), userId: socket.user.id } }
          });
          if (isBanned) {
            socket.emit('you_are_banned', { reason: isBanned.reason });
            socket.leave(key);
            return;
          }
        }

        const dbState = await prisma.roomState.findUnique({ where: { roomId: Number(roomId) } });

        if (dbState) {
          const state = getRoomState(key);
          state.isPlaying = dbState.isPlaying;
          let savedTime = dbState.currentTimeSeconds || 0;
          if (dbState.isPlaying && dbState.lastUpdatedAt && !roomHosts.has(key)) {
            const elapsed = (Date.now() - new Date(dbState.lastUpdatedAt).getTime()) / 1000;
            savedTime = savedTime + elapsed;
          }
          state.currentTimeSeconds = savedTime;
          if (!state.lastUpdated) state.lastUpdated = Date.now();
          state.streamUrl = room.streamUrl;
          state.movieTitle = room.movieTitle;
          state.chatEnabled = room.chatEnabled;
          state.spamProtectionEnabled = room.spamProtectionEnabled;
          state.spamCooldownSeconds = room.spamCooldownSeconds;
        }

        let isModerator = false;
        if (socket.user.id) {
          const mod = await prisma.roomModerator.findUnique({
            where: { roomId_userId: { roomId: Number(roomId), userId: socket.user.id } }
          });
          if (mod) {
            roomModerators.get(key).add(socket.id);
            isModerator = true;
          }
        }

        const participant = {
          id: socket.user.id,
          username: socket.user.username,
          role: socket.user.role,
          vip: socket.user.vip,
          avatarUrl: socket.user.avatarUrl || '',
          avatarType: socket.user.avatarType || 'image',
          frameType: socket.user.frameType || '',
          badges: socket.user.badges || '',
          level: socket.user.level || 1,
          socketId: socket.id,
          isOwner: room.ownerId === socket.user.id,
          isModerator
        };
        roomParticipants.get(key).set(socket.id, participant);

        io.to(key).emit('participants', Array.from(roomParticipants.get(key).values()));

        const state = getRoomState(key);
        socket.emit('room_state', {
          ...state,
          hostConnected: roomHosts.has(key),
          isHost: roomHosts.get(key) === socket.id,
          isModerator
        });

        if (isModerator) {
          socket.emit('moderator_granted', { roomId });
        }
      } catch (err) {
        console.error('join_room error:', err);
      }
    });

    socket.on('claim_host', async (roomId) => {
      const key = String(roomId);
      if (!socket.user.id) return;
      try {
        const room = await prisma.room.findFirst({ where: { id: Number(roomId), deletedAt: null } });
        if (!room) return;
        const isOwner = room.ownerId === socket.user.id;
        const isAdmin = socket.user.role === 'admin';
        if (!isOwner && !isAdmin) return;

        const oldHostId = roomHosts.get(key);
        if (oldHostId && oldHostId !== socket.id) {
          io.to(oldHostId).emit('host_taken');
        }
        roomHosts.set(key, socket.id);
        socket.emit('host_granted', { roomId });
        io.to(key).emit('host_changed', { username: socket.user.username, hostConnected: true });

        const state = getRoomState(key);
        state.streamUrl = room.streamUrl;
        state.movieTitle = room.movieTitle;

        if (roomParticipants.has(key)) {
          const p = roomParticipants.get(key).get(socket.id);
          if (p) { p.isOwner = true; roomParticipants.get(key).set(socket.id, p); }
          io.to(key).emit('participants', Array.from(roomParticipants.get(key).values()));
        }
      } catch (err) { console.error('claim_host error:', err); }
    });

    socket.on('room_state_update', async ({ roomId, isPlaying, currentTimeSeconds, streamUrl, movieTitle }) => {
      const key = String(roomId);
      if (!canControl(socket, key)) return;
      const state = getRoomState(key);
      const prevPlaying = state.isPlaying;
      if (isPlaying !== undefined) state.isPlaying = isPlaying;
      if (currentTimeSeconds !== undefined) state.currentTimeSeconds = currentTimeSeconds;
      if (streamUrl !== undefined) state.streamUrl = streamUrl;
      if (movieTitle !== undefined) state.movieTitle = movieTitle;
      state.lastUpdated = Date.now();
      io.to(key).except(socket.id).emit('room_state', { ...state, hostConnected: true });
      const playingChanged = isPlaying !== undefined && isPlaying !== prevPlaying;
      const lastWrite = roomDbWriteTime.get(key) || 0;
      const timeSinceWrite = Date.now() - lastWrite;
      if (playingChanged || timeSinceWrite > 10000) {
        roomDbWriteTime.set(key, Date.now());
        try {
          await prisma.roomState.upsert({
            where: { roomId: Number(roomId) },
            update: { isPlaying: state.isPlaying, currentTimeSeconds: state.currentTimeSeconds, lastUpdatedAt: new Date() },
            create: { roomId: Number(roomId), isPlaying: state.isPlaying, currentTimeSeconds: state.currentTimeSeconds }
          });
        } catch {}
      }
    });

    socket.on('host_seek', ({ roomId, currentTimeSeconds }) => {
      const key = String(roomId);
      if (!canControl(socket, key)) return;
      const state = getRoomState(key);
      state.currentTimeSeconds = currentTimeSeconds;
      state.lastUpdated = Date.now();
      io.to(key).except(socket.id).emit('host_seek', { currentTimeSeconds });
    });

    socket.on('player_sync_request', ({ roomId }) => {
      const key = String(roomId);
      const hostId = roomHosts.get(key);
      if (hostId) {
        io.to(hostId).emit('player_sync_request', { requesterId: socket.id, roomId });
      } else {
        socket.emit('room_state', { ...getRoomState(key), hostConnected: false });
      }
    });

    socket.on('player_sync_response', ({ requesterId, roomId, currentTimeSeconds, isPlaying }) => {
      const key = String(roomId);
      if (roomHosts.get(key) !== socket.id) return;
      const state = getRoomState(key);
      state.isPlaying = isPlaying;
      state.currentTimeSeconds = currentTimeSeconds;
      io.to(requesterId).emit('room_state', { ...state, hostConnected: true });
    });

    socket.on('url_changed', async ({ roomId, streamUrl, providerType }) => {
      const key = String(roomId);
      if (!canControl(socket, key)) return;
      const state = getRoomState(key);
      state.streamUrl = streamUrl;
      state.isPlaying = false;
      state.currentTimeSeconds = 0;
      state.lastUpdated = Date.now();
      io.to(key).emit('url_changed', { streamUrl, providerType });
      try {
        await prisma.room.update({ where: { id: Number(roomId) }, data: { streamUrl, providerType: providerType || 'youtube' } });
        await prisma.roomState.upsert({
          where: { roomId: Number(roomId) },
          update: { isPlaying: false, currentTimeSeconds: 0, streamUrlVersion: { increment: 1 } },
          create: { roomId: Number(roomId), isPlaying: false, currentTimeSeconds: 0 }
        });
      } catch {}
    });

    socket.on('room_settings_changed', async ({ roomId, chatEnabled, spamProtectionEnabled, spamCooldownSeconds, movieTitle }) => {
      const key = String(roomId);
      if (roomHosts.get(key) !== socket.id) return;
      const state = getRoomState(key);
      if (chatEnabled !== undefined) state.chatEnabled = chatEnabled;
      if (spamProtectionEnabled !== undefined) state.spamProtectionEnabled = spamProtectionEnabled;
      if (spamCooldownSeconds !== undefined) state.spamCooldownSeconds = spamCooldownSeconds;
      if (movieTitle !== undefined) state.movieTitle = movieTitle;
      const broadcast = {
        chatEnabled: state.chatEnabled,
        spamProtectionEnabled: state.spamProtectionEnabled,
        spamCooldownSeconds: state.spamCooldownSeconds
      };
      if (movieTitle !== undefined) broadcast.movieTitle = movieTitle;
      io.to(key).emit('room_settings_changed', broadcast);
      try {
        const updateData = {};
        if (chatEnabled !== undefined) updateData.chatEnabled = chatEnabled;
        if (spamProtectionEnabled !== undefined) updateData.spamProtectionEnabled = spamProtectionEnabled;
        if (spamCooldownSeconds !== undefined) updateData.spamCooldownSeconds = spamCooldownSeconds;
        if (movieTitle !== undefined) updateData.movieTitle = movieTitle;
        if (Object.keys(updateData).length > 0) {
          await prisma.room.update({ where: { id: Number(roomId) }, data: updateData });
        }
      } catch {}
    });

    socket.on('assign_moderator', async ({ roomId, targetUserId }) => {
      const key = String(roomId);
      if (roomHosts.get(key) !== socket.id) return;
      if (!socket.user.id || !targetUserId) return;
      try {
        await prisma.roomModerator.upsert({
          where: { roomId_userId: { roomId: Number(roomId), userId: targetUserId } },
          update: {},
          create: { roomId: Number(roomId), userId: targetUserId, assignedBy: socket.user.id }
        });
        const targetSocketId = userSockets.get(targetUserId);
        if (targetSocketId && roomModerators.has(key)) {
          roomModerators.get(key).add(targetSocketId);
          if (roomParticipants.has(key)) {
            const p = roomParticipants.get(key).get(targetSocketId);
            if (p) { p.isModerator = true; roomParticipants.get(key).set(targetSocketId, p); }
          }
          io.to(targetSocketId).emit('moderator_granted', { roomId });
        }
        io.to(key).emit('moderator_assigned', { userId: targetUserId });
        io.to(key).emit('participants', Array.from(roomParticipants.get(key).values()));
      } catch (err) { console.error('assign_moderator error:', err); }
    });

    socket.on('remove_moderator', async ({ roomId, targetUserId }) => {
      const key = String(roomId);
      if (roomHosts.get(key) !== socket.id) return;
      try {
        await prisma.roomModerator.deleteMany({ where: { roomId: Number(roomId), userId: targetUserId } });
        const targetSocketId = userSockets.get(targetUserId);
        if (targetSocketId && roomModerators.has(key)) {
          roomModerators.get(key).delete(targetSocketId);
          if (roomParticipants.has(key)) {
            const p = roomParticipants.get(key).get(targetSocketId);
            if (p) { p.isModerator = false; roomParticipants.get(key).set(targetSocketId, p); }
          }
          io.to(targetSocketId).emit('moderator_removed', { roomId });
        }
        io.to(key).emit('moderator_removed_broadcast', { userId: targetUserId });
        io.to(key).emit('participants', Array.from(roomParticipants.get(key).values()));
      } catch (err) { console.error('remove_moderator error:', err); }
    });

    socket.on('kick_user', ({ roomId, targetUserId }) => {
      const key = String(roomId);
      if (!isModOrOwner(socket, key)) return;
      const targetSocketId = userSockets.get(targetUserId);
      if (targetSocketId) {
        io.to(targetSocketId).emit('you_are_kicked', { roomId });
        const targetSocket = io.sockets.sockets.get(targetSocketId);
        if (targetSocket) {
          handleLeaveRoom(targetSocket, key, io);
          targetSocket.leave(key);
        }
      }
      io.to(key).emit('user_kicked', { userId: targetUserId });
    });

    socket.on('ban_user', async ({ roomId, targetUserId, reason }) => {
      const key = String(roomId);
      if (!isModOrOwner(socket, key)) return;
      if (!socket.user.id || !targetUserId) return;
      try {
        await prisma.roomBan.upsert({
          where: { roomId_userId: { roomId: Number(roomId), userId: targetUserId } },
          update: { bannedBy: socket.user.id, reason: reason || '' },
          create: { roomId: Number(roomId), userId: targetUserId, bannedBy: socket.user.id, reason: reason || '' }
        });
        const targetSocketId = userSockets.get(targetUserId);
        if (targetSocketId) {
          io.to(targetSocketId).emit('you_are_banned', { reason: reason || '' });
          const targetSocket = io.sockets.sockets.get(targetSocketId);
          if (targetSocket) {
            handleLeaveRoom(targetSocket, key, io);
            targetSocket.leave(key);
          }
        }
        io.to(key).emit('user_banned', { userId: targetUserId });
        io.to(key).emit('participants', Array.from(roomParticipants.get(key).values()));
      } catch (err) { console.error('ban_user error:', err); }
    });

    socket.on('unban_user', async ({ roomId, targetUserId }) => {
      const key = String(roomId);
      if (roomHosts.get(key) !== socket.id) return;
      try {
        await prisma.roomBan.deleteMany({ where: { roomId: Number(roomId), userId: targetUserId } });
        io.to(key).emit('user_unbanned', { userId: targetUserId });
      } catch (err) { console.error('unban_user error:', err); }
    });

    socket.on('leave_room', (roomId) => {
      const key = String(roomId);
      socket.leave(key);
      handleLeaveRoom(socket, key, io);
    });

    socket.on('send_message', async ({ roomId, content }) => {
      if (!content || !content.trim()) return;
      if (!socket.user.id) {
        socket.emit('error', { message: 'Mesaj göndermek için giriş yapmalısınız' });
        return;
      }
      const trimmed = content.trim().slice(0, 500);
      const key = String(roomId);
      try {
        const memState = getRoomState(key);
        const chatEnabled = memState.chatEnabled !== undefined ? memState.chatEnabled : true;
        const spamProtectionEnabled = memState.spamProtectionEnabled !== undefined ? memState.spamProtectionEnabled : true;
        const spamCooldownSeconds = memState.spamCooldownSeconds || 3;

        if (!chatEnabled) {
          socket.emit('error', { message: 'Bu odada sohbet devre dışı' });
          return;
        }

        const room = await prisma.room.findFirst({
          where: { id: Number(roomId), deletedAt: null },
          select: { id: true, ownerId: true }
        });
        if (!room) return;

        const isPrivileged = room.ownerId === socket.user.id || socket.user.role === 'admin' || canControl(socket, key);
        if (spamProtectionEnabled && !isPrivileged) {
          const spamKey = getSpamKey(roomId, socket.user.id);
          const lastTime = spamTracker.get(spamKey) || 0;
          const cooldown = spamCooldownSeconds * 1000;
          const now = Date.now();
          if (now - lastTime < cooldown) {
            const remaining = Math.ceil((cooldown - (now - lastTime)) / 1000);
            socket.emit('spam_blocked', { remaining });
            return;
          }
          spamTracker.set(spamKey, now);
        }
        const message = await prisma.message.create({
          data: { roomId: Number(roomId), userId: socket.user.id, content: trimmed },
          include: {
            user: {
              select: { id: true, username: true, role: true, vip: true, avatarUrl: true, avatarType: true, frameType: true, badges: true, level: true }
            }
          }
        });
        io.to(key).emit('new_message', message);
        await addXp(socket.user.id, XP_PER_MESSAGE, io);
      } catch (err) { console.error('Message error:', err); }
    });

    socket.on('send_reaction', ({ roomId, reaction }) => {
      io.to(String(roomId)).emit('new_reaction', {
        username: socket.user.username, reaction, timestamp: Date.now()
      });
    });

    socket.on('admin_delete_message', async ({ roomId, messageId }) => {
      const key = String(roomId);
      if (!canControl(socket, key) && socket.user.role !== 'admin') return;
      try {
        await prisma.message.update({ where: { id: Number(messageId) }, data: { deletedAt: new Date() } });
        io.to(key).emit('message_deleted', { messageId });
      } catch {}
    });

    socket.on('room_deleted', async ({ roomId }) => {
      const key = String(roomId);
      if (roomHosts.get(key) !== socket.id) return;
      try {
        await prisma.room.update({
          where: { id: Number(roomId) },
          data: { deletedAt: new Date(), isActive: false }
        });
        io.to(key).emit('room_deleted', { roomId });
        roomHosts.delete(key);
        roomStates.delete(key);
        roomModerators.delete(key);
      } catch (err) { console.error('Delete room error:', err); }
    });

    socket.on('disconnect', () => {
      if (socket.user.id && userSockets.get(socket.user.id) === socket.id) {
        userSockets.delete(socket.user.id);
      }
      globalChatParticipants.delete(socket.id);
      io.to('global_chat').emit('global_participants', Array.from(globalChatParticipants.values()).filter(p => p.id));
      const rooms = Array.from(roomParticipants.keys());
      for (const roomId of rooms) {
        handleLeaveRoom(socket, roomId, io);
      }
    });
  });
}

function handleLeaveRoom(socket, key, io) {
  if (roomParticipants.has(key)) {
    roomParticipants.get(key).delete(socket.id);
    io.to(key).emit('participants', Array.from(roomParticipants.get(key).values()));
  }
  if (roomModerators.has(key)) {
    roomModerators.get(key).delete(socket.id);
  }
  if (roomHosts.get(key) === socket.id) {
    roomHosts.delete(key);
    const state = getRoomState(key);
    if (state.isPlaying && state.lastUpdated) {
      const elapsed = (Date.now() - state.lastUpdated) / 1000;
      state.currentTimeSeconds = (state.currentTimeSeconds || 0) + elapsed;
      state.lastUpdated = Date.now();
      prisma.roomState.upsert({
        where: { roomId: Number(key) },
        update: { currentTimeSeconds: state.currentTimeSeconds, isPlaying: true, lastUpdatedAt: new Date() },
        create: { roomId: Number(key), isPlaying: true, currentTimeSeconds: state.currentTimeSeconds }
      }).catch(() => {});
    }
    io.to(key).emit('host_changed', {
      hostConnected: false,
      currentTimeSeconds: state.currentTimeSeconds,
    });
  }
}

module.exports = setupSocket;
module.exports.getLiveParticipantCount = getLiveParticipantCount;
module.exports.getAllLiveCounts = getAllLiveCounts;
