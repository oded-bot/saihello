const db = require('../../config/database');

function getTop10() {
  return db.prepare(`
    SELECT u.id, u.username,
           p.display_name, p.photo_1, p.emoji,
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
  const top10 = getTop10();
  io.emit('leaderboard_update', top10);
}

module.exports = { getTop10, broadcast };
