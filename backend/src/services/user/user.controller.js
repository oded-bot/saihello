const { v4: uuid } = require('uuid');
const db = require('../../config/database');

function updateProfile(req, res) {
  try {
    const { displayName, bio, age, gender, emoji } = req.body;
    const userId = req.user.id;

    const updates = [];
    const values = [];

    if (displayName !== undefined) { updates.push('display_name = ?'); values.push(displayName); }
    if (bio !== undefined) { updates.push('bio = ?'); values.push(bio); }
    if (age !== undefined) { updates.push('age = ?'); values.push(age); }
    if (gender !== undefined) { updates.push('gender = ?'); values.push(gender); }
    if (emoji !== undefined) { updates.push('emoji = ?'); values.push(emoji || null); }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Keine Felder zum Aktualisieren' });
    }

    values.push(userId);
    db.prepare(`UPDATE profiles SET ${updates.join(', ')} WHERE user_id = ?`).run(...values);

    res.json({ message: 'Profil aktualisiert' });
  } catch (err) {
    console.error('updateProfile Fehler:', err);
    res.status(500).json({ error: 'Aktualisierung fehlgeschlagen' });
  }
}

function reportUser(req, res) {
  try {
    const { reportedUserId, reason, description } = req.body;

    db.prepare(`
      INSERT INTO reports (id, reporter_id, reported_user_id, reason, description)
      VALUES (?, ?, ?, ?, ?)
    `).run(uuid(), req.user.id, reportedUserId, reason, description || null);

    res.json({ message: 'Meldung eingereicht' });
  } catch (err) {
    console.error('reportUser Fehler:', err);
    res.status(500).json({ error: 'Meldung fehlgeschlagen' });
  }
}

function deleteAccount(req, res) {
  try {
    const userId = req.user.id;
    db.transaction(() => {
      db.prepare('DELETE FROM messages WHERE match_id IN (SELECT id FROM matches WHERE offerer_id = ? OR seeker_id = ?)').run(userId, userId);
      db.prepare('DELETE FROM matches WHERE offerer_id = ? OR seeker_id = ?').run(userId, userId);
      db.prepare('DELETE FROM swipes WHERE swiper_id = ? OR target_user_id = ?').run(userId, userId);
      db.prepare('DELETE FROM table_offers WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM daily_blocks WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM connect_requests WHERE sender_id = ? OR receiver_id = ?').run(userId, userId);
      db.prepare('DELETE FROM connect_blocks WHERE blocker_id = ? OR blocked_id = ?').run(userId, userId);
      db.prepare('DELETE FROM notification_settings WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM profiles WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM users WHERE id = ?').run(userId);
    })();
    res.json({ message: 'Account und alle Daten gelöscht' });
  } catch (err) {
    console.error('deleteAccount Fehler:', err);
    res.status(500).json({ error: 'Löschen fehlgeschlagen' });
  }
}

module.exports = { updateProfile, reportUser, deleteAccount };
