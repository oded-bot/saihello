const db = require('../../config/database');

const MILESTONES = [25, 50, 75, 100, 150, 200];
const FOUNDER_LIMIT = 100;

function generateRefCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function getUniqueRefCode() {
  for (let i = 0; i < 10; i++) {
    const code = generateRefCode();
    if (!db.prepare('SELECT id FROM tracker_registrations WHERE referral_code = ?').get(code)) {
      return code;
    }
  }
  return generateRefCode();
}

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
    const cities = db.prepare(`
      SELECT city, COUNT(*) as cnt FROM tracker_registrations
      WHERE event_id = ? AND city IS NOT NULL AND city != ''
      GROUP BY city ORDER BY cnt DESC LIMIT 8
    `).all(event.id);

    const pct = count / event.threshold_hard;
    const phase = pct < 0.15 ? 1 : pct < 0.70 ? 2 : 3;
    const nextMilestone = MILESTONES.find(m => m > count) || null;

    res.json({
      active: true,
      event,
      count,
      recentCount,
      recentNames,
      cities,
      phase,
      nextMilestone,
      thresholdReached: count >= event.threshold_hard,
      softThresholdReached: count >= event.threshold_soft,
    });
  } catch (err) {
    res.status(500).json({ error: 'Serverfehler' });
  }
}

function register(req, res) {
  try {
    const { name, email, city, eventId, referredBy } = req.body;
    if (!name?.trim() || !email?.trim() || !eventId) {
      return res.status(400).json({ error: 'Name, E-Mail und Event sind erforderlich' });
    }

    const event = db.prepare('SELECT * FROM tracker_events WHERE id = ? AND is_active = 1').get(eventId);
    if (!event) return res.status(404).json({ error: 'Event nicht gefunden' });

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ error: 'Ungültige E-Mail-Adresse' });
    }

    const prevCount = db.prepare('SELECT COUNT(*) as cnt FROM tracker_registrations WHERE event_id = ?').get(eventId).cnt;
    const refCode = getUniqueRefCode();
    let isNew = true;

    try {
      db.prepare(`
        INSERT INTO tracker_registrations (event_id, name, email, city, referral_code, referred_by)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(eventId, name.trim(), email.trim().toLowerCase(), city?.trim() || null, refCode, referredBy || null);
    } catch (err) {
      if (!err.message.includes('UNIQUE')) throw err;
      isNew = false;
    }

    const newCount = db.prepare('SELECT COUNT(*) as cnt FROM tracker_registrations WHERE event_id = ?').get(eventId).cnt;
    const reg = db.prepare('SELECT id, referral_code FROM tracker_registrations WHERE event_id = ? AND email = ?').get(eventId, email.trim().toLowerCase());
    const referralCount = db.prepare('SELECT COUNT(*) as cnt FROM tracker_registrations WHERE event_id = ? AND referred_by = ?').get(eventId, reg.referral_code).cnt;
    const milestoneCelebration = isNew ? (MILESTONES.find(m => m <= newCount && m > prevCount) || null) : null;

    res.json({
      success: true,
      count: newCount,
      referralCode: reg.referral_code,
      referralCount,
      founderBadge: reg.id <= FOUNDER_LIMIT,
      founderPosition: reg.id,
      milestoneCelebration,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Registrierung fehlgeschlagen' });
  }
}

module.exports = { getActive, register };
