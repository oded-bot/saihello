const { v4: uuid } = require('uuid');
const db = require('../../config/database');
const { handleAutoReply } = require('./chat.autoresponder');

function getMessages(req, res) {
  try {
    const { matchId } = req.params;
    const userId = req.user.id;
    const { before, limit } = req.query;

    const match = db.prepare(
      'SELECT id FROM matches WHERE id = ? AND (offerer_id = ? OR seeker_id = ?)'
    ).get(matchId, userId, userId);

    if (!match) {
      return res.status(404).json({ error: 'Match nicht gefunden' });
    }

    let query = `
      SELECT m.id, m.sender_id, m.content, m.message_type, m.is_read, m.is_edited, m.created_at,
             p.display_name as sender_name, p.photo_1 as sender_photo
      FROM messages m
      JOIN profiles p ON p.user_id = m.sender_id
      WHERE m.match_id = ?
    `;
    const params = [matchId];

    if (before) {
      query += ' AND m.created_at < ?';
      params.push(before);
    }

    query += ' ORDER BY m.created_at ASC, m.rowid ASC LIMIT ?';
    params.push(parseInt(limit) || 50);

    const messages = db.prepare(query).all(...params);
    res.json(messages);
  } catch (err) {
    console.error('getMessages Fehler:', err);
    res.status(500).json({ error: 'Nachrichten laden fehlgeschlagen' });
  }
}

function sendMessage(req, res) {
  try {
    const { matchId } = req.params;
    const { content, message_type } = req.body;
    const userId = req.user.id;

    const match = db.prepare(
      'SELECT id, status FROM matches WHERE id = ? AND (offerer_id = ? OR seeker_id = ?)'
    ).get(matchId, userId, userId);

    if (!match) {
      return res.status(404).json({ error: 'Match nicht gefunden' });
    }
    if (!['active', 'invited', 'confirmed'].includes(match.status)) {
      return res.status(400).json({ error: 'Chat nicht mehr verfügbar' });
    }

    // message_type: 'text' (default), 'image', 'audio'
    const allowedTypes = ['text', 'image', 'audio'];
    const msgType = allowedTypes.includes(message_type) ? message_type : 'text';

    const msgId = uuid();
    db.prepare(`
      INSERT INTO messages (id, match_id, sender_id, content, message_type)
      VALUES (?, ?, ?, ?, ?)
    `).run(msgId, matchId, userId, content, msgType);

    const msg = db.prepare('SELECT created_at FROM messages WHERE id = ?').get(msgId);

    res.status(201).json({
      id: msgId,
      matchId,
      senderId: userId,
      content,
      messageType: msgType,
      createdAt: msg.created_at,
    });

    // Autoresponder für Fake-Accounts (nur bei Text-Nachrichten)
    if (msgType === 'text') {
      handleAutoReply(matchId, userId).catch(() => {});
    }
  } catch (err) {
    console.error('sendMessage Fehler:', err);
    res.status(500).json({ error: 'Nachricht senden fehlgeschlagen' });
  }
}

function markRead(req, res) {
  try {
    const { matchId } = req.params;
    const userId = req.user.id;

    db.prepare(
      'UPDATE messages SET is_read = 1 WHERE match_id = ? AND sender_id != ? AND is_read = 0'
    ).run(matchId, userId);

    res.json({ message: 'Als gelesen markiert' });
  } catch (err) {
    console.error('markRead Fehler:', err);
    res.status(500).json({ error: 'Fehler beim Markieren' });
  }
}

// Nachricht löschen (nur eigene)
function deleteMessage(req, res) {
  try {
    const { matchId, messageId } = req.params;
    const userId = req.user.id;

    const result = db.prepare(
      "DELETE FROM messages WHERE id = ? AND match_id = ? AND sender_id = ? AND message_type IN ('text', 'image', 'audio')"
    ).run(messageId, matchId, userId);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Nachricht nicht gefunden oder nicht löschbar' });
    }
    res.json({ message: 'Nachricht gelöscht' });
  } catch (err) {
    console.error('deleteMessage Fehler:', err);
    res.status(500).json({ error: 'Löschen fehlgeschlagen' });
  }
}

// Nachricht bearbeiten (nur eigene Text-Nachrichten)
function editMessage(req, res) {
  try {
    const { matchId, messageId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Nachricht darf nicht leer sein' });
    }

    const result = db.prepare(
      "UPDATE messages SET content = ?, is_edited = 1 WHERE id = ? AND match_id = ? AND sender_id = ? AND message_type = 'text'"
    ).run(content.trim(), messageId, matchId, userId);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Nachricht nicht gefunden oder nicht bearbeitbar' });
    }
    res.json({ message: 'Nachricht bearbeitet' });
  } catch (err) {
    console.error('editMessage Fehler:', err);
    res.status(500).json({ error: 'Bearbeiten fehlgeschlagen' });
  }
}

module.exports = { getMessages, sendMessage, markRead, deleteMessage, editMessage };
