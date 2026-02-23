const prisma = require('./db');
const { verifyToken } = require('./middleware/auth');

const roomParticipants = new Map();
const roomStates = new Map();
const roomHosts = new Map();
const roomModerators = new Map();
const roomBanned = new Map();
const spamTracker = new Map();
const userSockets = new Map();

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

  io.on('connection', (socket) => {
    if (socket.user.id) {
      userSockets.set(socket.user.id, socket.id);
    }

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
          state.currentTimeSeconds = dbState.currentTimeSeconds;
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
      if (isPlaying !== undefined) state.isPlaying = isPlaying;
      if (currentTimeSeconds !== undefined) state.currentTimeSeconds = currentTimeSeconds;
      if (streamUrl !== undefined) state.streamUrl = streamUrl;
      if (movieTitle !== undefined) state.movieTitle = movieTitle;
      state.lastUpdated = Date.now();
      io.to(key).except(socket.id).emit('room_state', { ...state, hostConnected: true });
      try {
        await prisma.roomState.upsert({
          where: { roomId: Number(roomId) },
          update: { isPlaying: state.isPlaying, currentTimeSeconds: state.currentTimeSeconds, lastUpdatedAt: new Date() },
          create: { roomId: Number(roomId), isPlaying: state.isPlaying, currentTimeSeconds: state.currentTimeSeconds }
        });
      } catch {}
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

    socket.on('room_settings_changed', async ({ roomId, chatEnabled, spamProtectionEnabled, spamCooldownSeconds }) => {
      const key = String(roomId);
      if (roomHosts.get(key) !== socket.id) return;
      const state = getRoomState(key);
      if (chatEnabled !== undefined) state.chatEnabled = chatEnabled;
      if (spamProtectionEnabled !== undefined) state.spamProtectionEnabled = spamProtectionEnabled;
      if (spamCooldownSeconds !== undefined) state.spamCooldownSeconds = spamCooldownSeconds;
      io.to(key).emit('room_settings_changed', {
        chatEnabled: state.chatEnabled,
        spamProtectionEnabled: state.spamProtectionEnabled,
        spamCooldownSeconds: state.spamCooldownSeconds
      });
      try {
        const updateData = {};
        if (chatEnabled !== undefined) updateData.chatEnabled = chatEnabled;
        if (spamProtectionEnabled !== undefined) updateData.spamProtectionEnabled = spamProtectionEnabled;
        if (spamCooldownSeconds !== undefined) updateData.spamCooldownSeconds = spamCooldownSeconds;
        await prisma.room.update({ where: { id: Number(roomId) }, data: updateData });
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
        const room = await prisma.room.findFirst({ where: { id: Number(roomId), deletedAt: null } });
        if (!room) return;
        if (!room.chatEnabled) {
          socket.emit('error', { message: 'Bu odada sohbet devre dışı' });
          return;
        }
        const isPrivileged = room.ownerId === socket.user.id || socket.user.role === 'admin' || canControl(socket, key);
        if (room.spamProtectionEnabled && !isPrivileged) {
          const spamKey = getSpamKey(roomId, socket.user.id);
          const lastTime = spamTracker.get(spamKey) || 0;
          const cooldown = (room.spamCooldownSeconds || 3) * 1000;
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
          include: { user: { select: { id: true, username: true, role: true, vip: true } } }
        });
        io.to(key).emit('new_message', message);
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
    io.to(key).emit('host_changed', { hostConnected: false });
  }
}

module.exports = setupSocket;
