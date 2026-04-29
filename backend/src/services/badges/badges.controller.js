const db = require('../../config/database');

const VALID_BADGES = [
  'body_positive',
  'lgbtq_friendly',
  'neurodivergent',
  'disability_friendly',
  'boundaries_respected',
  'open_to_all_cultures',
  'introvert_friendly',
  'non_drinker_friendly',
];

function getMyBadges(req, res) {
  try {
    const row = db.prepare('SELECT badges FROM profiles WHERE user_id = ?').get(req.user.id);
    const badges = row?.badges ? JSON.parse(row.badges) : [];
    res.json({ badges });
  } catch (err) {
    console.error('getMyBadges Fehler:', err);
    res.status(500).json({ error: 'Badges laden fehlgeschlagen' });
  }
}

function updateMyBadges(req, res) {
  try {
    const { badges } = req.body;

    if (!Array.isArray(badges)) {
      return res.status(400).json({ error: 'badges muss ein Array sein' });
    }

    const filtered = badges.filter(b => VALID_BADGES.includes(b));

    db.prepare("UPDATE profiles SET badges = ?, updated_at = datetime('now') WHERE user_id = ?")
      .run(JSON.stringify(filtered), req.user.id);

    res.json({ badges: filtered });
  } catch (err) {
    console.error('updateMyBadges Fehler:', err);
    res.status(500).json({ error: 'Badges speichern fehlgeschlagen' });
  }
}

module.exports = { getMyBadges, updateMyBadges, VALID_BADGES };
