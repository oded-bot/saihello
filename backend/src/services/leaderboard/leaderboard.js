const db = require('../../config/database');
const { v4: uuidv4 } = require('uuid');

function getTop10() {
  return db.prepare(`
    SELECT u.id, u.username,
           p.display_name, p.photo_1, p.emoji, p.bio,
           p.top10_public,
           COUNT(m.id) as confirmed_count
    FROM matches m
    JOIN users u ON u.id = m.offerer_id
    JOIN profiles p ON p.user_id = u.id
    WHERE m.status = 'confirmed'
    GROUP BY u.id
    ORDER BY confirmed_count DESC
    LIMIT 10
  `).all();
}

function broadcast(io) {
  const prev = broadcast._prev || [];
  const top10 = getTop10();
  const prevIds = new Set(prev.map(e => e.id));

  // Notify new entrants
  top10.forEach(entry => {
    if (!prevIds.has(entry.id)) {
      db.prepare(`
        INSERT INTO notifications (id, user_id, type, title, body, data)
        VALUES (?, ?, 'top10_entry', 'Du bist in den Top 10! 🏆', 'Möchtest du dein Profil für andere sichtbar machen?', '{"action":"top10_optin"}')
      `).run(uuidv4(), entry.id);
    }
  });

  broadcast._prev = top10;
  io.emit('leaderboard_update', top10);
}

module.exports = { getTop10, broadcast };
