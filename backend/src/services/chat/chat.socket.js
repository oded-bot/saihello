const jwt = require('jsonwebtoken');
const { v4: uuid } = require('uuid');
const db = require('../../config/database');

const JWT_SECRET = process.env.JWT_SECRET;

function setupChatSocket(io) {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Nicht autorisiert'));
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      socket.userId = decoded.userId;
      next();
    } catch (err) {
      next(new Error('Token ungültig'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.userId;
    socket.join(`user:${userId}`);

    socket.on('join_match', (matchId) => {
      try {
        const match = db.prepare(
          'SELECT id FROM matches WHERE id = ? AND (offerer_id = ? OR seeker_id = ?)'
        ).get(matchId, userId, userId);
        if (match) {
          socket.join(`match:${matchId}`);
          socket.emit('joined_match', { matchId });
        }
      } catch (err) {
        console.error('join_match Fehler:', err);
      }
    });

    socket.on('send_message', ({ matchId, content }) => {
      try {
        if (!content || content.trim().length === 0 || content.length > 2000) return;

        const match = db.prepare(`
          SELECT id, offerer_id, seeker_id, status FROM matches
          WHERE id = ? AND (offerer_id = ? OR seeker_id = ?)
          AND status IN ('active', 'confirmed')
        `).get(matchId, userId, userId);
        if (!match) return;

        const msgId = uuid();
        db.prepare(`
          INSERT INTO messages (id, match_id, sender_id, content, message_type)
          VALUES (?, ?, ?, ?, 'text')
        `).run(msgId, matchId, userId, content.trim());

        const msgRow = db.prepare('SELECT created_at FROM messages WHERE id = ?').get(msgId);
        const profile = db.prepare('SELECT display_name, photo_1 FROM profiles WHERE user_id = ?').get(userId);

        const message = {
          id: msgId,
          matchId,
          senderId: userId,
          senderName: profile?.display_name,
          senderPhoto: profile?.photo_1,
          content: content.trim(),
          messageType: 'text',
          isRead: false,
          createdAt: msgRow.created_at,
        };

        io.to(`match:${matchId}`).emit('new_message', message);

        const recipientId = match.offerer_id === userId ? match.seeker_id : match.offerer_id;
        io.to(`user:${recipientId}`).emit('message_notification', { matchId, message });
      } catch (err) {
        console.error('send_message Fehler:', err);
      }
    });

    socket.on('typing', ({ matchId, isTyping }) => {
      try {
        const match = db.prepare('SELECT id FROM matches WHERE id = ? AND (offerer_id = ? OR seeker_id = ?)').get(matchId, userId, userId);
        if (!match) return;
        socket.to(`match:${matchId}`).emit('user_typing', { matchId, userId, isTyping });
      } catch (err) {
        console.error('typing Fehler:', err);
      }
    });

    socket.on('mark_read', ({ matchId }) => {
      try {
        const match = db.prepare('SELECT id FROM matches WHERE id = ? AND (offerer_id = ? OR seeker_id = ?)').get(matchId, userId, userId);
        if (!match) return;
        db.prepare(
          'UPDATE messages SET is_read = 1 WHERE match_id = ? AND sender_id != ? AND is_read = 0'
        ).run(matchId, userId);
        socket.to(`match:${matchId}`).emit('messages_read', { matchId, readBy: userId });
      } catch (err) {
        console.error('mark_read Fehler:', err);
      }
    });
  });
}

module.exports = { setupChatSocket };
