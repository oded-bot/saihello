const db = require('../../config/database');
const { v4: uuidv4 } = require('uuid');

function getTop10() {
  return db.prepare(`
    SELECT u.id, u.username,
           p.display_name, p.photo_1, p.emoji, p.bio,
           p.top10_public,
           COUNT(m.id) as confirmed_matches
    FROM users u
    JOIN profiles p ON p.user_id = u.id
    LEFT JOIN matches m ON (m.offerer_id = u.id OR m.seeker_id = u.id)
      AND m.status = 'confirmed'
    GROUP BY u.id
    HAVING confirmed_matches > 0
    ORDER BY confirmed_matches DESC
    LIMIT 10
  `).all();
}

function broadcast(io) {
  const prev = broadcast._prev || [];
  const top10 = getTop10();
  const prevIds = new Set(prev.map(e => e.id));

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

function getMyRank(userId) {
  const row = db.prepare(`
    SELECT COUNT(*) + 1 as rank,
           (SELECT COUNT(*) FROM matches
            WHERE (offerer_id = ? OR seeker_id = ?) AND status = 'confirmed') as my_matches
    FROM (
      SELECT user_id, COUNT(*) as cnt
      FROM (
        SELECT offerer_id as user_id FROM matches WHERE status = 'confirmed'
        UNION ALL
        SELECT seeker_id as user_id FROM matches WHERE status = 'confirmed'
      )
      GROUP BY user_id
      HAVING cnt > (
        SELECT COUNT(*) FROM matches
        WHERE (offerer_id = ? OR seeker_id = ?) AND status = 'confirmed'
      )
    )
  `).get(userId, userId, userId, userId);
  return { rank: row.rank, matches: row.my_matches };
}

module.exports = { getTop10, getMyRank, broadcast };
