const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, 'data/servus_wiesn.db'));
const userId = '206b4eb0-3686-4a7a-adbc-e55b1ddb9a2f';

db.prepare('DELETE FROM table_offers WHERE user_id = ?').run(userId);
db.prepare('DELETE FROM seeker_searches WHERE user_id = ?').run(userId);
db.prepare('DELETE FROM yesterday_pins WHERE user_id = ?').run(userId);
db.prepare('DELETE FROM yesterday_feed_actions WHERE actor_id = ? OR subject_id = ?').run(userId, userId);
db.prepare('DELETE FROM swipes WHERE swiper_id = ?').run(userId);
console.log('✅ Oded zurückgesetzt');
