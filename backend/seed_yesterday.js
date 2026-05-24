const db = require('better-sqlite3')('./data/servus_wiesn.db');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const hash = bcrypt.hashSync('test1234', 10);
const today = new Date().toISOString().split('T')[0];

// Odeds zwei aktive Pins
const LOCATIONS = [
  {
    name: 'München (Schumanns)',
    lat: 48.139687, lng: 11.57489,
    users: [
      { display: 'Theresa', username: 'yest_theresa', age: 26, gender: 'f', emoji: '🌸', bio: 'War gestern auch im Schumanns 🍸' },
      { display: 'Marco',   username: 'yest_marco',   age: 31, gender: 'm', emoji: '🎸', bio: 'Immer wieder schöne Abende hier.' },
      { display: 'Lena K.', username: 'yest_lenak',   age: 24, gender: 'f', emoji: '✨', bio: null },
    ],
  },
  {
    name: 'Tel Aviv (Dizengoff)',
    lat: 32.0752455, lng: 34.7745919,
    users: [
      { display: 'Yael',  username: 'yest_yael',  age: 28, gender: 'f', emoji: '🌺', bio: 'Local, loves Dizengoff.' },
      { display: 'Nir',   username: 'yest_nir',   age: 33, gender: 'm', emoji: '🏄', bio: null },
      { display: 'Dana',  username: 'yest_dana',  age: 27, gender: 'f', emoji: '🎨', bio: 'Coffee and art.' },
    ],
  },
];

// Kleine Jitter-Funktion — bleibt innerhalb 80m (< 100m Radius)
function jitter() { return (Math.random() - 0.5) * 0.0012; }

const seed = db.transaction(() => {
  for (const loc of LOCATIONS) {
    for (const u of loc.users) {
      // User anlegen (überspringen falls schon vorhanden)
      const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(u.username);
      let uid;
      if (existing) {
        uid = existing.id;
        console.log(`  ↩  ${u.username} existiert bereits (${uid})`);
      } else {
        uid = uuidv4();
        db.prepare(`INSERT INTO users (id, username, email, password_hash, is_approved, email_verified)
                    VALUES (?, ?, ?, ?, 1, 1)`)
          .run(uid, u.username, `${u.username}@test.de`, hash);
        db.prepare(`INSERT INTO profiles (id, user_id, display_name, age, gender, emoji, bio)
                    VALUES (?, ?, ?, ?, ?, ?, ?)`)
          .run(uuidv4(), uid, u.display, u.age, u.gender, u.emoji || null, u.bio || null);
        console.log(`  ✅  ${u.username} angelegt (${uid})`);
      }

      // Angebot in der Nähe anlegen (damit wasUserActiveNear() true zurückgibt)
      const pinLat = loc.lat + jitter() * 0.5;
      const pinLng = loc.lng + jitter() * 0.5;
      const offerExists = db.prepare(
        "SELECT id FROM table_offers WHERE user_id = ? AND date = ? AND status = 'active'"
      ).get(uid, today);
      if (!offerExists) {
        db.prepare(`INSERT INTO table_offers
          (id, user_id, location_lat, location_lng, location_text, total_seats, available_seats,
           date, time_from, time_until, status, seats_for_women, seats_for_men, seats_any_gender)
          VALUES (?, ?, ?, ?, ?, 4, 2, ?, '18:00', '23:00', 'active', 0, 0, 4)`)
          .run(uuidv4(), uid, pinLat, pinLng, loc.name, today);
      }

      // Yesterday-Pin setzen (innerhalb 100m von Odeds Pin)
      const pinExists = db.prepare(
        'SELECT id FROM yesterday_pins WHERE user_id = ? AND lat BETWEEN ? AND ? AND lng BETWEEN ? AND ?'
      ).get(uid, loc.lat - 0.001, loc.lat + 0.001, loc.lng - 0.0015, loc.lng + 0.0015);
      if (!pinExists) {
        db.prepare('INSERT INTO yesterday_pins (id, user_id, lat, lng) VALUES (?, ?, ?, ?)')
          .run(uuidv4(), uid, loc.lat + jitter() * 0.6, loc.lng + jitter() * 0.6);
        console.log(`     📍 Pin gesetzt für ${u.username}`);
      } else {
        console.log(`     📍 Pin existiert bereits für ${u.username}`);
      }
    }
  }
});

console.log('\nStarte Yesterday-Seed...\n');
seed();
console.log('\nFertig.');
