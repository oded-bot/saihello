const Database = require('better-sqlite3');
const db = new Database('/Users/odedschein/saihello/backend/data/servus_wiesn.db');

// Sophie hat eine Suche direkt beim Augustiner — Badge setzen
const sophie = db.prepare("SELECT user_id FROM profiles WHERE display_name = 'Sophie'").get();
console.log('Sophie ID:', sophie.user_id);
db.prepare("UPDATE profiles SET badges = ? WHERE user_id = ?").run(JSON.stringify(['lgbtq_friendly']), sophie.user_id);
const check = db.prepare("SELECT badges FROM profiles WHERE user_id = ?").get(sophie.user_id);
console.log('Sophie badges nach Update:', check.badges);
