const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '../../data/servus_wiesn.db');

// Data-Ordner erstellen
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Schema initialisieren
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    phone TEXT UNIQUE,
    email TEXT UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    last_login TEXT,
    is_active INTEGER DEFAULT 1,
    is_banned INTEGER DEFAULT 0,
    ban_reason TEXT
  );

  CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY,
    user_id TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    bio TEXT,
    age INTEGER CHECK (age >= 18 AND age <= 120),
    gender TEXT CHECK (gender IN ('m', 'f', 'd')),
    photo_1 TEXT,
    photo_2 TEXT,
    photo_3 TEXT,
    photo_4 TEXT,
    photo_5 TEXT,
    photo_6 TEXT,
    is_verified INTEGER DEFAULT 0,
    verified_at TEXT,
    rating REAL DEFAULT 0.0,
    total_ratings INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS tents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    capacity INTEGER,
    image_url TEXT,
    is_active INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS table_offers (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tent_id TEXT REFERENCES tents(id),
    location_text TEXT,
    location_lat REAL,
    location_lng REAL,
    total_seats INTEGER NOT NULL CHECK (total_seats >= 1 AND total_seats <= 20),
    available_seats INTEGER NOT NULL CHECK (available_seats >= 1),
    date TEXT NOT NULL,
    time_from TEXT NOT NULL,
    time_until TEXT NOT NULL,
    preferred_genders TEXT DEFAULT '["m","f","d"]',
    preferred_age_min INTEGER DEFAULT 18,
    preferred_age_max INTEGER DEFAULT 99,
    description TEXT,
    group_description TEXT,
    photo_url TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'expired', 'full')),
    price_per_seat REAL DEFAULT 0.0,
    group_age_min INTEGER,
    group_age_max INTEGER,
    seats_for_women INTEGER DEFAULT 0,
    seats_for_men INTEGER DEFAULT 0,
    seats_any_gender INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    CHECK (available_seats <= total_seats)
  );

  CREATE TABLE IF NOT EXISTS swipes (
    id TEXT PRIMARY KEY,
    swiper_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_offer_id TEXT REFERENCES table_offers(id) ON DELETE CASCADE,
    target_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    direction TEXT NOT NULL CHECK (direction IN ('like', 'pass', 'superlike')),
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(swiper_id, target_offer_id)
  );

  CREATE TABLE IF NOT EXISTS matches (
    id TEXT PRIMARY KEY,
    offer_id TEXT NOT NULL REFERENCES table_offers(id) ON DELETE CASCADE,
    offerer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    seeker_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    seats_granted INTEGER NOT NULL DEFAULT 1,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'confirmed', 'cancelled', 'completed', 'no_show')),
    offerer_rating INTEGER CHECK (offerer_rating >= 1 AND offerer_rating <= 5),
    seeker_rating INTEGER CHECK (seeker_rating >= 1 AND seeker_rating <= 5),
    offerer_review TEXT,
    seeker_review TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    confirmed_at TEXT,
    completed_at TEXT,
    UNIQUE(offer_id, seeker_id)
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    match_id TEXT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'system')),
    is_read INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY,
    reporter_id TEXT NOT NULL REFERENCES users(id),
    reported_user_id TEXT NOT NULL REFERENCES users(id),
    reason TEXT NOT NULL CHECK (reason IN ('fake_profile', 'inappropriate', 'harassment', 'scam', 'no_show', 'other')),
    description TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS seeker_searches (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    location_text TEXT,
    location_lat REAL,
    location_lng REAL,
    seats_needed INTEGER NOT NULL DEFAULT 1 CHECK (seats_needed >= 1 AND seats_needed <= 20),
    date TEXT NOT NULL,
    time_from TEXT NOT NULL,
    time_until TEXT NOT NULL,
    preferred_genders TEXT DEFAULT '["m","f","d"]',
    preferred_age_min INTEGER DEFAULT 18,
    preferred_age_max INTEGER DEFAULT 99,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired')),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS daily_blocks (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    offer_id TEXT NOT NULL REFERENCES table_offers(id) ON DELETE CASCADE,
    blocked_date TEXT NOT NULL,
    UNIQUE(user_id, offer_id, blocked_date)
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT,
    data TEXT,
    is_read INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

// Life Feed Tabellen
db.exec(`
  CREATE TABLE IF NOT EXISTS life_feed_videos (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    video_url TEXT NOT NULL,
    caption TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS life_feed_reactions (
    id TEXT PRIMARY KEY,
    video_id TEXT NOT NULL REFERENCES life_feed_videos(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reaction_type TEXT NOT NULL CHECK (reaction_type IN ('thumbs_up', 'laughing', 'super_drauf', 'gute_unterhaltung')),
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(video_id, user_id)
  );
`);

// About Yesterday Tabellen
db.exec(`
  CREATE TABLE IF NOT EXISTS yesterday_pins (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS yesterday_feed_actions (
    id TEXT PRIMARY KEY,
    actor_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action TEXT NOT NULL CHECK (action IN ('liked', 'passed')),
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(actor_id, subject_id)
  );

  CREATE TABLE IF NOT EXISTS yesterday_requests (
    id TEXT PRIMARY KEY,
    user1_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user2_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user1_accepted INTEGER DEFAULT 0,
    user2_accepted INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    chat_id TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user1_id, user2_id)
  );

  CREATE TABLE IF NOT EXISTS yesterday_chats (
    id TEXT PRIMARY KEY,
    user1_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user2_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS yesterday_messages (
    id TEXT PRIMARY KEY,
    chat_id TEXT NOT NULL REFERENCES yesterday_chats(id) ON DELETE CASCADE,
    sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_read INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

// Direct Connect Tabellen
db.exec(`
  CREATE TABLE IF NOT EXISTS connect_requests (
    id TEXT PRIMARY KEY,
    sender_id TEXT NOT NULL REFERENCES users(id),
    receiver_id TEXT NOT NULL REFERENCES users(id),
    message TEXT,
    status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(sender_id, receiver_id)
  );

  CREATE TABLE IF NOT EXISTS connect_blocks (
    id TEXT PRIMARY KEY,
    blocker_id TEXT NOT NULL REFERENCES users(id),
    blocked_id TEXT NOT NULL REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(blocker_id, blocked_id)
  );
`);

// Indexes
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
  CREATE INDEX IF NOT EXISTS idx_table_offers_user_id ON table_offers(user_id);
  CREATE INDEX IF NOT EXISTS idx_table_offers_status ON table_offers(status);
  CREATE INDEX IF NOT EXISTS idx_table_offers_date ON table_offers(date);
  CREATE INDEX IF NOT EXISTS idx_table_offers_location ON table_offers(location_lat, location_lng);
  CREATE INDEX IF NOT EXISTS idx_seeker_searches_user_id ON seeker_searches(user_id);
  CREATE INDEX IF NOT EXISTS idx_seeker_searches_status ON seeker_searches(status);
  CREATE INDEX IF NOT EXISTS idx_seeker_searches_location ON seeker_searches(location_lat, location_lng);
  CREATE INDEX IF NOT EXISTS idx_swipes_swiper ON swipes(swiper_id);
  CREATE INDEX IF NOT EXISTS idx_matches_offerer ON matches(offerer_id);
  CREATE INDEX IF NOT EXISTS idx_matches_seeker ON matches(seeker_id);
  CREATE INDEX IF NOT EXISTS idx_messages_match ON messages(match_id);
  CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
  CREATE INDEX IF NOT EXISTS idx_connect_requests_receiver ON connect_requests(receiver_id);
  CREATE INDEX IF NOT EXISTS idx_connect_requests_sender ON connect_requests(sender_id);
  CREATE INDEX IF NOT EXISTS idx_connect_blocks_blocker ON connect_blocks(blocker_id);
  CREATE INDEX IF NOT EXISTS idx_connect_blocks_blocked ON connect_blocks(blocked_id);
`);

// Location-Spalten
try {
  db.exec(`ALTER TABLE table_offers ADD COLUMN location_text TEXT`);
} catch (e) { /* Spalte existiert bereits */ }
try {
  db.exec(`ALTER TABLE table_offers ADD COLUMN location_lat REAL`);
} catch (e) { /* Spalte existiert bereits */ }
try {
  db.exec(`ALTER TABLE table_offers ADD COLUMN location_lng REAL`);
} catch (e) { /* Spalte existiert bereits */ }

// Neue Spalten für Geschlechter-Plätze (Abwärtskompatibel)
try {
  db.exec(`ALTER TABLE table_offers ADD COLUMN seats_for_women INTEGER DEFAULT 0`);
} catch (e) { /* Spalte existiert bereits */ }
try {
  db.exec(`ALTER TABLE table_offers ADD COLUMN seats_for_men INTEGER DEFAULT 0`);
} catch (e) { /* Spalte existiert bereits */ }
try {
  db.exec(`ALTER TABLE table_offers ADD COLUMN seats_any_gender INTEGER DEFAULT 0`);
} catch (e) { /* Spalte existiert bereits */ }

// Emoji-Spalte im Profil
try {
  db.exec(`ALTER TABLE profiles ADD COLUMN emoji TEXT`);
} catch (e) { /* Spalte existiert bereits */ }

// Admin + Approval Spalten
try {
  db.exec(`ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0`);
} catch (e) { /* Spalte existiert bereits */ }
try {
  db.exec(`ALTER TABLE users ADD COLUMN is_approved INTEGER DEFAULT 1`);
} catch (e) { /* Spalte existiert bereits */ }

// E-Mail-Verifizierung Spalten
try {
  db.exec(`ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 0`);
} catch (e) { /* Spalte existiert bereits */ }
try {
  db.exec(`ALTER TABLE users ADD COLUMN verification_code TEXT`);
} catch (e) { /* Spalte existiert bereits */ }
try {
  db.exec(`ALTER TABLE users ADD COLUMN verification_expires TEXT`);
} catch (e) { /* Spalte existiert bereits */ }
try {
  db.exec(`ALTER TABLE users ADD COLUMN resend_count INTEGER DEFAULT 0`);
} catch (e) { /* Spalte existiert bereits */ }
try {
  db.exec(`ALTER TABLE users ADD COLUMN resend_window_start TEXT`);
} catch (e) { /* Spalte existiert bereits */ }

// Oktoberfest-Zelte einfügen (nur wenn leer)
const tentCount = db.prepare('SELECT COUNT(*) as c FROM tents').get();
if (tentCount.c === 0) {
  const insertTent = db.prepare(
    'INSERT INTO tents (id, name, slug, description, capacity) VALUES (?, ?, ?, ?, ?)'
  );
  const { v4: uuid } = require('uuid');

  const tents = [
    ['Augustiner-Festhalle', 'augustiner', 'Traditionelles Bier, gemütliche Atmosphäre', 6000],
    ['Hacker-Festzelt', 'hacker', 'Himmel der Bayern — bekannt für Stimmung', 6900],
    ['Hofbräu-Festzelt', 'hofbraeu', 'Das internationalste Zelt', 6896],
    ['Löwenbräu-Festhalle', 'loewenbraeu', 'Der Löwe brüllt — Party-Zelt', 5700],
    ['Marstall', 'marstall', 'Modernes Zelt mit gehobener Küche', 3200],
    ['Ochsenbraterei', 'ochsenbraterei', 'Tradition seit 1881 — Ochsen am Spieß', 5900],
    ['Paulaner-Festzelt', 'paulaner', 'Winzerer Fähndl — Stimmungszelt', 8450],
    ['Schottenhamel', 'schottenhamel', 'Das Anstich-Zelt — O\'zapft is!', 6000],
    ['Schützen-Festzelt', 'schuetzen', 'Bayerische Tradition', 4442],
    ['Käfer Wiesn-Schänke', 'kaefer', 'VIP und Promis — exklusiv', 1000],
    ['Weinzelt', 'weinzelt', 'Wein statt Bier — gehoben', 1300],
    ['Fischer-Vroni', 'fischer-vroni', 'Steckerlfisch-Spezialität', 2695],
    ['Armbrustschützenzelt', 'armbrustschuetzen', 'Armbrust-Tradition', 5830],
    ['Bräurosl', 'braerosl', 'Pschorr-Bräurosl — Familienzelt', 6220],
  ];

  const insertMany = db.transaction((tents) => {
    for (const [name, slug, desc, cap] of tents) {
      insertTent.run(uuid(), name, slug, desc, cap);
    }
  });
  insertMany(tents);
  console.log('14 Oktoberfest-Zelte eingefügt');
}

module.exports = db;
