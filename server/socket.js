const prisma = require('./db');
const { verifyToken } = require('./middleware/auth');

const roomParticipants = new Map();

function setupSocket(io) {
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (token) {
      try {
        socket.user = verifyToken(token);
      } catch {
        socket.user = { id: null, username: 'Misafir', role: 'guest' };
      }
    } else {
      socket.user = { id: null, username: 'Misafir', role: 'guest' };
    }
    next();
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.user.username}`);

    socket.on('join_room', (roomId) => {
      const key = String(roomId);
      socket.join(key);

      if (!roomParticipants.has(key)) roomParticipants.set(key, new Map());
      roomParticipants.get(key).set(socket.id, {
        id: socket.user.id,
        username: socket.user.username,
        role: socket.user.role,
        vip: socket.user.vip
      });

      io.to(key).emit('participants', Array.from(roomParticipants.get(key).values()));
    });

    socket.on('leave_room', (roomId) => {
      const key = String(roomId);
      socket.leave(key);
      if (roomParticipants.has(key)) {
        roomParticipants.get(key).delete(socket.id);
        io.to(key).emit('participants', Array.from(roomParticipants.get(key).values()));
      }
    });

    socket.on('send_message', async ({ roomId, content }) => {
      if (!content || !content.trim()) return;
      if (!socket.user.id) {
        socket.emit('error', { message: 'Mesaj göndermek için giriş yapmalısınız' });
        return;
      }
      try {
        const message = await prisma.message.create({
          data: { roomId: Number(roomId), userId: socket.user.id, content: content.trim() },
          include: { user: { select: { id: true, username: true, role: true, vip: true } } }
        });
        io.to(String(roomId)).emit('new_message', message);
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
      if (socket.user.role !== 'admin') return;
      try {
        await prisma.message.update({
          where: { id: Number(messageId) },
          data: { deletedAt: new Date() }
        });
        io.to(String(roomId)).emit('message_deleted', { messageId });
      } catch (err) {
        console.error('Delete message error:', err);
      }
    });

    socket.on('disconnect', () => {
      for (const [roomId, participants] of roomParticipants.entries()) {
        if (participants.has(socket.id)) {
          participants.delete(socket.id);
          io.to(roomId).emit('participants', Array.from(participants.values()));
        }
      }
    });
  });
}

module.exports = setupSocket;
