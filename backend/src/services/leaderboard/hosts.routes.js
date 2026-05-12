const express = require('express');
const router = express.Router();
const db = require('../../config/database');
const { authMiddleware: authenticate } = require('../../middleware/auth');
const { v4: uuidv4 } = require('uuid');

// GET /api/hosts/:userId — public profile + comments
router.get('/:userId', authenticate, (req, res) => {
  try {
    const profile = db.prepare(`
      SELECT u.id, u.username, p.display_name, p.photo_1, p.bio, p.age, p.gender,
             p.emoji, p.badges, p.top10_public,
             COUNT(m.id) as confirmed_count
      FROM users u
      JOIN profiles p ON p.user_id = u.id
      LEFT JOIN matches m ON m.offerer_id = u.id AND m.status = 'confirmed'
      WHERE u.id = ?
      GROUP BY u.id
    `).get(req.params.userId);

    if (!profile) return res.status(404).json({ error: 'Nicht gefunden' });
    if (!profile.top10_public) return res.status(403).json({ error: 'Profil nicht öffentlich' });

    const comments = db.prepare(`
      SELECT c.id, c.body, c.created_at,
             p.display_name as author_name, p.photo_1 as author_photo, p.emoji as author_emoji
      FROM host_comments c
      JOIN profiles p ON p.user_id = c.author_user_id
      WHERE c.host_user_id = ?
      ORDER BY c.created_at DESC
      LIMIT 50
    `).all(req.params.userId);

    res.json({ profile, comments });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

// POST /api/hosts/:userId/comments — post a comment
router.post('/:userId/comments', authenticate, (req, res) => {
  try {
    const { body } = req.body;
    if (!body?.trim() || body.trim().length > 280) {
      return res.status(400).json({ error: 'Kommentar ungültig (max. 280 Zeichen)' });
    }
    const host = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.userId);
    if (!host) return res.status(404).json({ error: 'Gastgeber nicht gefunden' });

    const id = uuidv4();
    db.prepare(`
      INSERT INTO host_comments (id, host_user_id, author_user_id, body)
      VALUES (?, ?, ?, ?)
    `).run(id, req.params.userId, req.user.id, body.trim());

    const comment = db.prepare(`
      SELECT c.id, c.body, c.created_at,
             p.display_name as author_name, p.photo_1 as author_photo, p.emoji as author_emoji
      FROM host_comments c
      JOIN profiles p ON p.user_id = c.author_user_id
      WHERE c.id = ?
    `).get(id);

    res.json(comment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

// POST /api/hosts/optin — opt in to public profile
router.post('/optin', authenticate, (req, res) => {
  try {
    db.prepare(`
      UPDATE profiles SET top10_public = 1, top10_opted_at = datetime('now')
      WHERE user_id = ?
    `).run(req.user.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Serverfehler' });
  }
});

// POST /api/hosts/optout
router.post('/optout', authenticate, (req, res) => {
  try {
    db.prepare(`UPDATE profiles SET top10_public = 0 WHERE user_id = ?`).run(req.user.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Serverfehler' });
  }
});

module.exports = router;
