const db = require('better-sqlite3')('./data/servus_wiesn.db');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const hash = bcrypt.hashSync('test1234', 10);
const today = new Date().toISOString().split('T')[0];

// München center + slight offsets
const BASE_LAT = 48.1374;
const BASE_LNG = 11.5755;
function jitter(range) { return (Math.random() - 0.5) * range; }

const SEEKERS = [
  { name: 'Luisa', gender: 'f', age: 24 },
  { name: 'Max', gender: 'm', age: 27 },
  { name: 'Sophie', gender: 'f', age: 22 },
  { name: 'Felix', gender: 'm', age: 29 },
  { name: 'Emma', gender: 'f', age: 23 },
  { name: 'Jonas', gender: 'm', age: 26 },
  { name: 'Mia', gender: 'f', age: 21 },
  { name: 'Leon', gender: 'm', age: 28 },
  { name: 'Anna', gender: 'f', age: 25 },
  { name: 'Tim', gender: 'm', age: 30 },
  { name: 'Lena', gender: 'f', age: 23 },
  { name: 'Paul', gender: 'm', age: 27 },
  { name: 'Marie', gender: 'f', age: 24 },
  { name: 'Tobias', gender: 'm', age: 31 },
  { name: 'Sarah', gender: 'f', age: 26 },
  { name: 'Markus', gender: 'm', age: 33 },
  { name: 'Julia', gender: 'f', age: 22 },
  { name: 'David', gender: 'm', age: 29 },
  { name: 'Laura', gender: 'f', age: 25 },
  { name: 'Florian', gender: 'm', age: 28 },
  { name: 'Nina', gender: 'f', age: 24 },
  { name: 'Stefan', gender: 'm', age: 32 },
  { name: 'Katharina', gender: 'f', age: 27 },
  { name: 'Michael', gender: 'm', age: 35 },
  { name: 'Theresa', gender: 'f', age: 23 },
];

const OFFERERS = [
  { name: 'Hannah', gender: 'f', age: 26, badges: ['lgbtq_friendly'] },
  { name: 'Monika', gender: 'f', age: 34, badges: ['wheelchair_accessible'] },
  { name: 'Zoe', gender: 'f', age: 22, badges: ['lgbtq_friendly', 'women_only'] },
  { name: 'Birgit', gender: 'f', age: 41, badges: ['family_friendly'] },
  { name: 'Lara', gender: 'f', age: 25, badges: ['lgbtq_friendly'] },
  { name: 'Silke', gender: 'f', age: 38, badges: ['wheelchair_accessible'] },
  { name: 'Oliver', gender: 'm', age: 30, badges: ['lgbtq_friendly'] },
  { name: 'Tobias', gender: 'm', age: 28, badges: [] },
  { name: 'Klaus', gender: 'm', age: 45, badges: [] },
  { name: 'Werner', gender: 'm', age: 52, badges: [] },
  { name: 'Petra', gender: 'f', age: 37, badges: [] },
  { name: 'Ralf', gender: 'm', age: 33, badges: [] },
  { name: 'Sabine', gender: 'f', age: 29, badges: [] },
  { name: 'Heinz', gender: 'm', age: 48, badges: [] },
  { name: 'Gabi', gender: 'f', age: 31, badges: [] },
  { name: 'Franz', gender: 'm', age: 44, badges: [] },
  { name: 'Inge', gender: 'f', age: 39, badges: [] },
  { name: 'Karl', gender: 'm', age: 36, badges: [] },
  { name: 'Hilde', gender: 'f', age: 43, badges: [] },
  { name: 'Bernd', gender: 'm', age: 27, badges: [] },
];

const insertUser = db.prepare(`INSERT INTO users (id, username, email, password_hash, is_approved, email_verified) VALUES (?, ?, ?, ?, 1, 1)`);
const insertProfile = db.prepare(`INSERT INTO profiles (id, user_id, display_name, age, gender, badges) VALUES (?, ?, ?, ?, ?, ?)`);
const insertSeeker = db.prepare(`INSERT INTO seeker_searches (id, user_id, location_text, location_lat, location_lng, seats_needed, date, time_from, time_until, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`);
const insertOffer = db.prepare(`INSERT INTO table_offers (id, user_id, location_text, location_lat, location_lng, total_seats, available_seats, date, time_from, time_until, status, seats_for_women, seats_for_men, seats_any_gender) VALUES (?, ?, ?, ?, ?, 4, ?, ?, ?, ?, 'active', 0, 0, 4)`);

const seed = db.transaction(() => {
  // Seekers
  SEEKERS.forEach((s, i) => {
    const uid = uuidv4();
    const username = `testuser_${s.name.toLowerCase()}_${i}`;
    insertUser.run(uid, username, `${username}@test.de`, hash);
    insertProfile.run(uuidv4(), uid, s.name, s.age, s.gender, null);
    insertSeeker.run(uuidv4(), uid, 'München', BASE_LAT + jitter(0.02), BASE_LNG + jitter(0.02), 2, today, '18:00', '23:59');
  });

  // Offerers
  OFFERERS.forEach((o, i) => {
    const uid = uuidv4();
    const username = `test2_${o.name.toLowerCase()}_${i}`;
    insertUser.run(uid, username, `${username}@test.de`, hash);
    insertProfile.run(uuidv4(), uid, o.name, o.age, o.gender, o.badges.length ? JSON.stringify(o.badges) : null);
    insertOffer.run(uuidv4(), uid, 'München', BASE_LAT + jitter(0.02), BASE_LNG + jitter(0.02), 4, today, '18:00', '23:59');
  });
});

seed();

const s = db.prepare("SELECT COUNT(*) as c FROM users WHERE username LIKE 'testuser_%'").get();
const o = db.prepare("SELECT COUNT(*) as c FROM users WHERE username LIKE 'test2_%'").get();
console.log(`✅ Suchende: ${s.c}, Anbieter: ${o.c}`);
