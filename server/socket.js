const prisma = require('./db');
const { verifyToken } = require('./middleware/auth');

const roomParticipants = new Map();
const roomStates = new Map();
const roomHosts = new Map();
const spamTracker = new Map();

function getSpamKey(roomId, userId) {
  return `${roomId}:${userId}`;
}

function getRoomState(roomId) {
  if (!roomStates.has(String(roomId))) {
    roomStates.set(String(roomId), {
      isPlaying: false,
      currentTimeSeconds: 0,
      streamUrl: '',
      movieTitle: '',
      lastUpdated: Date.now()
    });
  }
  return roomStates.get(String(roomId));
}

function setupSocket(io) {
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (token) {
      try {
        socket.user = verifyToken(token);
      } catch {
        socket.user = { id: null, username: 'Misafir', role: 'guest', vip: false };
      }
    } else {
      socket.user = { id: null, username: 'Misafir', role: 'guest', vip: false };
    }
    next();
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.user.username}`);

    socket.on('join_room', async (roomId) => {
      const key = String(roomId);
      socket.join(key);
      socket.currentRoomId = key;

      if (!roomParticipants.has(key)) roomParticipants.set(key, new Map());
      roomParticipants.get(key).set(socket.id, {
        id: socket.user.id,
        username: socket.user.username,
        role: socket.user.role,
        vip: socket.user.vip
      });

      io.to(key).emit('participants', Array.from(roomParticipants.get(key).values()));

      try {
        const dbState = await prisma.roomState.findUnique({ where: { roomId: Number(roomId) } });
        const room = await prisma.room.findFirst({ where: { id: Number(roomId), deletedAt: null } });

        if (dbState && room) {
          const state = getRoomState(key);
          state.isPlaying = dbState.isPlaying;
          state.currentTimeSeconds = dbState.currentTimeSeconds;
          state.streamUrl = room.streamUrl;
          state.movieTitle = room.movieTitle;
          state.chatEnabled = room.chatEnabled;
          state.spamProtectionEnabled = room.spamProtectionEnabled;
          state.spamCooldownSeconds = room.spamCooldownSeconds;
        }
      } catch {}

      const state = getRoomState(key);
      const isHost = roomHosts.get(key) === undefined && socket.user.id
        ? false
        : roomHosts.get(key) === socket.id;

      socket.emit('room_state', {
        ...state,
        hostConnected: roomHosts.has(key),
        isHost
      });
    });

    socket.on('claim_host', async (roomId) => {
      const key = String(roomId);
      if (!socket.user.id) return;

      try {
        const room = await prisma.room.findFirst({
          where: { id: Number(roomId), deletedAt: null }
        });

        if (!room) return;

        const isOwner = room.ownerId === socket.user.id;
        const isAdmin = socket.user.role === 'admin';

        if (isOwner || isAdmin) {
          const oldHostId = roomHosts.get(key);
          if (oldHostId && oldHostId !== socket.id) {
            io.to(oldHostId).emit('host_taken');
          }
          roomHosts.set(key, socket.id);

          socket.emit('host_granted', { roomId });
          io.to(key).emit('host_changed', {
            username: socket.user.username,
            hostConnected: true
          });

          const state = getRoomState(key);
          state.streamUrl = room.streamUrl;
          state.movieTitle = room.movieTitle;
        }
      } catch (err) {
        console.error('claim_host error:', err);
      }
    });

    socket.on('room_state_update', async ({ roomId, isPlaying, currentTimeSeconds, streamUrl, movieTitle }) => {
      const key = String(roomId);
      if (roomHosts.get(key) !== socket.id) return;

      const state = getRoomState(key);
      if (isPlaying !== undefined) state.isPlaying = isPlaying;
      if (currentTimeSeconds !== undefined) state.currentTimeSeconds = currentTimeSeconds;
      if (streamUrl !== undefined) state.streamUrl = streamUrl;
      if (movieTitle !== undefined) state.movieTitle = movieTitle;
      state.lastUpdated = Date.now();

      io.to(key).except(socket.id).emit('room_state', {
        ...state,
        hostConnected: true
      });

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
        const state = getRoomState(key);
        socket.emit('room_state', { ...state, hostConnected: false });
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
      if (roomHosts.get(key) !== socket.id) return;

      const state = getRoomState(key);
      state.streamUrl = streamUrl;
      state.isPlaying = false;
      state.currentTimeSeconds = 0;
      state.lastUpdated = Date.now();

      io.to(key).emit('url_changed', { streamUrl, providerType });

      try {
        await prisma.room.updateMany({
          where: { id: Number(roomId), ownerId: socket.user.id },
          data: { streamUrl, providerType: providerType || 'youtube' }
        });
        await prisma.roomState.update({
          where: { roomId: Number(roomId) },
          data: { isPlaying: false, currentTimeSeconds: 0, streamUrlVersion: { increment: 1 } }
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
        await prisma.room.updateMany({
          where: { id: Number(roomId), ownerId: socket.user.id },
          data: updateData
        });
      } catch {}
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
        const room = await prisma.room.findFirst({
          where: { id: Number(roomId), deletedAt: null }
        });

        if (!room) return;
        if (!room.chatEnabled) {
          socket.emit('error', { message: 'Bu odada sohbet devre dışı' });
          return;
        }

        const isOwner = room.ownerId === socket.user.id;
        const isAdmin = socket.user.role === 'admin';

        if (room.spamProtectionEnabled && !isOwner && !isAdmin) {
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
      } catch (err) {
        console.error('Message error:', err);
      }
    });

    socket.on('send_reaction', ({ roomId, reaction }) => {
      io.to(String(roomId)).emit('new_reaction', {
        username: socket.user.username,
        reaction,
        timestamp: Date.now()
      });
    });

    socket.on('admin_delete_message', async ({ roomId, messageId }) => {
      const key = String(roomId);
      const isHost = roomHosts.get(key) === socket.id;
      const isAdmin = socket.user.role === 'admin';

      if (!isHost && !isAdmin) return;

      try {
        await prisma.message.update({
          where: { id: Number(messageId) },
          data: { deletedAt: new Date() }
        });
        io.to(key).emit('message_deleted', { messageId });
      } catch (err) {
        console.error('Delete message error:', err);
      }
    });

    socket.on('room_deleted', async ({ roomId }) => {
      const key = String(roomId);
      if (roomHosts.get(key) !== socket.id) return;

      try {
        await prisma.room.updateMany({
          where: { id: Number(roomId), ownerId: socket.user.id },
          data: { deletedAt: new Date(), isActive: false }
        });
        io.to(key).emit('room_deleted', { roomId });
        roomHosts.delete(key);
        roomStates.delete(key);
      } catch (err) {
        console.error('Delete room error:', err);
      }
    });

    socket.on('disconnect', () => {
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

  if (roomHosts.get(key) === socket.id) {
    roomHosts.delete(key);
    io.to(key).emit('host_changed', { hostConnected: false });
  }
}

module.exports = setupSocket;
