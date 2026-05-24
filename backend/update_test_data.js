const db = require('better-sqlite3')('./data/servus_wiesn.db');

const today = new Date().toISOString().split('T')[0];

const r1 = db.prepare(`
  UPDATE table_offers
  SET date = ?, status = 'active'
  WHERE user_id IN (SELECT id FROM users WHERE username LIKE 'test2_%')
`).run(today);

const r2 = db.prepare(`
  UPDATE seeker_searches
  SET date = ?, status = 'active'
  WHERE user_id IN (SELECT id FROM users WHERE username LIKE 'testuser_%')
`).run(today);

console.log(`✅ Angebote aktualisiert: ${r1.changes}, Suchen aktualisiert: ${r2.changes} → Datum: ${today}`);
