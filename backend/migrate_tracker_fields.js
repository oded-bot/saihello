const Database = require('better-sqlite3');
const db = new Database('./data/servus_wiesn.db');

// ── 1. upcoming_events um Tracker-Felder erweitern ──────────────────────────
try { db.exec('ALTER TABLE upcoming_events ADD COLUMN threshold_soft INTEGER DEFAULT 75'); } catch(e) {}
try { db.exec('ALTER TABLE upcoming_events ADD COLUMN threshold_hard INTEGER DEFAULT 150'); } catch(e) {}
try { db.exec('ALTER TABLE upcoming_events ADD COLUMN is_tracker_active INTEGER DEFAULT 0'); } catch(e) {}
console.log('✓ upcoming_events: Felder ergänzt');

// ── 2. tracker_registrations: upcoming_event_id hinzufügen ──────────────────
try { db.exec('ALTER TABLE tracker_registrations ADD COLUMN upcoming_event_id INTEGER REFERENCES upcoming_events(id)'); } catch(e) {}
console.log('✓ tracker_registrations: upcoming_event_id ergänzt');

// ── 3. Thresholds berechnen und setzen ──────────────────────────────────────
// Basis-Werte nach event_type
const BASE = {
  table:   { soft: 75,  hard: 150 },
  street:  { soft: 50,  hard: 100 },
  camping: { soft: 100, hard: 200 },
  mixed:   { soft: 75,  hard: 150 },
};

// Besucherzahl aus TEXT parsen (z.B. "1.000.000+", "50.000+", "7200000")
function parseVisitors(str) {
  if (!str) return null;
  const cleaned = str.replace(/\./g, '').replace(/\+/g, '').replace(/,/g, '').trim();
  const n = parseInt(cleaned);
  return isNaN(n) ? null : n;
}

const events = db.prepare('SELECT id, event_type, estimated_visitors FROM upcoming_events').all();
const update = db.prepare('UPDATE upcoming_events SET threshold_soft=?, threshold_hard=? WHERE id=?');

const setAll = db.transaction(() => {
  events.forEach(ev => {
    const base = BASE[ev.event_type] || BASE.mixed;
    const visitors = parseVisitors(ev.estimated_visitors);
    // Kleines Event (<100k Besucher): Threshold um 30% reduzieren
    const factor = (visitors && visitors < 100000) ? 0.7 : 1.0;
    const soft = Math.round(base.soft * factor);
    const hard = Math.round(base.hard * factor);
    update.run(soft, hard, ev.id);
  });
});
setAll();
console.log(`✓ Thresholds gesetzt für ${events.length} Events`);

// Stichprobe ausgeben
const sample = db.prepare(`
  SELECT name, event_type, estimated_visitors, threshold_soft, threshold_hard
  FROM upcoming_events ORDER BY event_type, threshold_hard LIMIT 20
`).all();
console.log('\nStichprobe:');
sample.forEach(e => console.log(
  `  [${e.event_type.padEnd(7)}] ${e.name.padEnd(35)} ${e.estimated_visitors?.padEnd(12)} → ${e.threshold_soft}/${e.threshold_hard}`
));

db.close();
