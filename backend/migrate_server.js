const Database = require('better-sqlite3');
const db = new Database('./data/servus_wiesn.db');

// 1. upcoming_events tracker fields
try { db.exec('ALTER TABLE upcoming_events ADD COLUMN threshold_soft INTEGER DEFAULT 75'); } catch(e) {}
try { db.exec('ALTER TABLE upcoming_events ADD COLUMN threshold_hard INTEGER DEFAULT 150'); } catch(e) {}
try { db.exec('ALTER TABLE upcoming_events ADD COLUMN is_tracker_active INTEGER DEFAULT 0'); } catch(e) {}
console.log('✓ upcoming_events: tracker fields');

// 2. upcoming_event_id on tracker_registrations
try { db.exec('ALTER TABLE tracker_registrations ADD COLUMN upcoming_event_id INTEGER REFERENCES upcoming_events(id)'); } catch(e) {}
console.log('✓ tracker_registrations: upcoming_event_id');

// 3. Make event_id nullable (recreate table)
const hasNullable = db.prepare("SELECT COUNT(*) as c FROM pragma_table_info('tracker_registrations') WHERE name='event_id' AND notnull=0").get().c;
if (!hasNullable) {
  db.exec(`
    PRAGMA foreign_keys=OFF;
    CREATE TABLE tracker_registrations_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER,
      upcoming_event_id INTEGER REFERENCES upcoming_events(id),
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      city TEXT,
      referral_code TEXT UNIQUE,
      referred_by TEXT
    );
    INSERT INTO tracker_registrations_new SELECT id,event_id,upcoming_event_id,name,email,created_at,city,referral_code,referred_by FROM tracker_registrations;
    DROP TABLE tracker_registrations;
    ALTER TABLE tracker_registrations_new RENAME TO tracker_registrations;
    PRAGMA foreign_keys=ON;
  `);
  console.log('✓ tracker_registrations: event_id now nullable');
} else {
  console.log('✓ tracker_registrations: event_id already nullable, skipped');
}

// 4. Calculate thresholds
const BASE = {
  table:   { soft: 75,  hard: 150 },
  street:  { soft: 50,  hard: 100 },
  camping: { soft: 100, hard: 200 },
  mixed:   { soft: 75,  hard: 150 },
};

function parseVisitors(str) {
  if (!str) return null;
  const n = parseInt(str.replace(/\./g, '').replace(/\+/g, '').replace(/,/g, '').trim());
  return isNaN(n) ? null : n;
}

const events = db.prepare('SELECT id, event_type, estimated_visitors FROM upcoming_events').all();
const update = db.prepare('UPDATE upcoming_events SET threshold_soft=?, threshold_hard=? WHERE id=?');
db.transaction(() => {
  events.forEach(ev => {
    const base = BASE[ev.event_type] || BASE.mixed;
    const visitors = parseVisitors(ev.estimated_visitors);
    const factor = (visitors && visitors < 100000) ? 0.7 : 1.0;
    update.run(Math.round(base.soft * factor), Math.round(base.hard * factor), ev.id);
  });
})();
console.log(`✓ Thresholds set for ${events.length} events`);

db.close();
console.log('\nMigration complete.');
