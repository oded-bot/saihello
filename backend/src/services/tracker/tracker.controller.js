const db = require('../../config/database');

function getActive(req, res) {
  try {
    const event = db.prepare('SELECT * FROM tracker_events WHERE is_active = 1 LIMIT 1').get();
    if (!event) return res.json({ active: false });

    const count = db.prepare('SELECT COUNT(*) as cnt FROM tracker_registrations WHERE event_id = ?').get(event.id).cnt;
    const recentCount = db.prepare(`
      SELECT COUNT(*) as cnt FROM tracker_registrations
      WHERE event_id = ? AND created_at >= datetime('now', '-48 hours')
    `).get(event.id).cnt;
    const recentNames = db.prepare(`
      SELECT name FROM tracker_registrations
      WHERE event_id = ? ORDER BY created_at DESC LIMIT 6
    `).all(event.id).map(r => r.name.split(' ')[0]);

    const pct = count / event.threshold_hard;
    const phase = pct < 0.15 ? 1 : pct < 0.70 ? 2 : 3;

    res.json({
      active: true,
      event,
      count,
      recentCount,
      recentNames,
      phase,
      thresholdReached: count >= event.threshold_hard,
      softThresholdReached: count >= event.threshold_soft,
    });
  } catch (err) {
    res.status(500).json({ error: 'Serverfehler' });
  }
}

function register(req, res) {
  try {
    const { name, email, eventId } = req.body;
    if (!name?.trim() || !email?.trim() || !eventId) {
      return res.status(400).json({ error: 'Name, E-Mail und Event sind erforderlich' });
    }

    const event = db.prepare('SELECT * FROM tracker_events WHERE id = ? AND is_active = 1').get(eventId);
    if (!event) return res.status(404).json({ error: 'Event nicht gefunden' });

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({ error: 'Ungültige E-Mail-Adresse' });
    }

    try {
      db.prepare('INSERT INTO tracker_registrations (event_id, name, email) VALUES (?, ?, ?)').run(
        eventId, name.trim(), email.trim().toLowerCase()
      );
    } catch (err) {
      if (!err.message.includes('UNIQUE')) throw err;
    }

    const count = db.prepare('SELECT COUNT(*) as cnt FROM tracker_registrations WHERE event_id = ?').get(eventId).cnt;
    res.json({ success: true, count });
  } catch (err) {
    res.status(500).json({ error: 'Registrierung fehlgeschlagen' });
  }
}

module.exports = { getActive, register };
