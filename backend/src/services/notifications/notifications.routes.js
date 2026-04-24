const express = require('express');
const { body } = require('express-validator');
const { validate } = require('../../middleware/validate');
const { authMiddleware } = require('../../middleware/auth');
const db = require('../../config/database');
const { v4: uuid } = require('uuid');

const router = express.Router();
router.use(authMiddleware);

// Ungelesene Notifications + Counts abrufen (Polling-Endpoint)
router.get('/status', (req, res) => {
  try {
    const userId = req.user.id;

    // Ungelesene Nachrichten über alle Matches
    const unreadMessages = db.prepare(`
      SELECT COUNT(*) as count FROM messages m
      JOIN matches ma ON ma.id = m.match_id
      WHERE (ma.offerer_id = ? OR ma.seeker_id = ?)
        AND m.sender_id != ?
        AND m.is_read = 0
        AND m.message_type IN ('text', 'invite')
        AND ma.status IN ('active', 'invited', 'confirmed')
    `).get(userId, userId, userId);

    // Neue Matches (die noch keine Nachrichten vom User haben)
    const newMatches = db.prepare(`
      SELECT COUNT(*) as count FROM matches m
      WHERE (m.offerer_id = ? OR m.seeker_id = ?)
        AND m.status IN ('active', 'invited')
        AND m.created_at > COALESCE(
          (SELECT MAX(created_at) FROM messages msg WHERE msg.match_id = m.id AND msg.sender_id = ?),
          '2000-01-01'
        )
    `).get(userId, userId, userId);

    // Offene Einladungen (für Suchende)
    const pendingInvites = db.prepare(`
      SELECT COUNT(*) as count FROM matches
      WHERE seeker_id = ? AND status = 'invited'
    `).get(userId);

    // Letzte ungelesene Nachrichten (für Banner)
    const latestUnread = db.prepare(`
      SELECT m.content, m.message_type, m.created_at, m.match_id,
             p.display_name as sender_name
      FROM messages m
      JOIN profiles p ON p.user_id = m.sender_id
      JOIN matches ma ON ma.id = m.match_id
      WHERE (ma.offerer_id = ? OR ma.seeker_id = ?)
        AND m.sender_id != ?
        AND m.is_read = 0
        AND m.message_type IN ('text', 'invite')
        AND ma.status IN ('active', 'invited', 'confirmed')
      ORDER BY m.created_at DESC
      LIMIT 3
    `).all(userId, userId, userId);

    res.json({
      unreadMessages: unreadMessages.count,
      newMatches: newMatches.count,
      pendingInvites: pendingInvites.count,
      totalBadge: unreadMessages.count + pendingInvites.count,
      latestUnread,
    });
  } catch (err) {
    console.error('Notification Status Fehler:', err);
    res.status(500).json({ error: 'Status laden fehlgeschlagen' });
  }
});

// Notification-Einstellungen laden
router.get('/settings', (req, res) => {
  try {
    let settings = db.prepare('SELECT * FROM notification_settings WHERE user_id = ?').get(req.user.id);
    if (!settings) {
      db.prepare('INSERT INTO notification_settings (user_id) VALUES (?)').run(req.user.id);
      settings = { matches_enabled: 1, messages_enabled: 1, invites_enabled: 1 };
    }
    res.json({
      matchesEnabled: !!settings.matches_enabled,
      messagesEnabled: !!settings.messages_enabled,
      invitesEnabled: !!settings.invites_enabled,
    });
  } catch (err) {
    res.status(500).json({ error: 'Einstellungen laden fehlgeschlagen' });
  }
});

// Notification-Einstellungen ändern
router.patch('/settings', [
  body('matchesEnabled').optional().isBoolean().withMessage('matchesEnabled muss boolean sein'),
  body('messagesEnabled').optional().isBoolean().withMessage('messagesEnabled muss boolean sein'),
  body('invitesEnabled').optional().isBoolean().withMessage('invitesEnabled muss boolean sein'),
  validate,
], (req, res) => {
  try {
    const { matchesEnabled, messagesEnabled, invitesEnabled } = req.body;
    db.prepare(`
      INSERT INTO notification_settings (user_id, matches_enabled, messages_enabled, invites_enabled)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        matches_enabled = ?, messages_enabled = ?, invites_enabled = ?,
        updated_at = datetime('now')
    `).run(
      req.user.id,
      matchesEnabled ? 1 : 0, messagesEnabled ? 1 : 0, invitesEnabled ? 1 : 0,
      matchesEnabled ? 1 : 0, messagesEnabled ? 1 : 0, invitesEnabled ? 1 : 0
    );
    res.json({ message: 'Einstellungen gespeichert' });
  } catch (err) {
    res.status(500).json({ error: 'Speichern fehlgeschlagen' });
  }
});

module.exports = router;
