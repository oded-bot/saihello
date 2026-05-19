const db = require('../../config/database');

// Prüft ob User ein aktives Angebot hat, das mit dem gesuchten Zeitfenster überlappt.
// Kein Datum in der Suche → alle aktiven Angebote als Konflikt werten (Vorsichtsprinzip).
function hasConflictingOffer(userId, date, timeFrom, timeUntil) {
  const offers = db.prepare(
    "SELECT date, time_from, time_until FROM table_offers WHERE user_id = ? AND status = 'active'"
  ).all(userId);

  if (offers.length === 0) return false;
  if (!date) return true; // kein Datum angegeben → sicherheitshalber sperren

  return offers.some(offer => {
    if (offer.date !== date) return false;          // anderes Datum → kein Konflikt
    if (!timeFrom || !timeUntil) return true;       // gleicher Tag, kein Zeitfilter → Konflikt
    // Zeitüberlappung: Angebot beginnt vor Ende der Suche UND endet nach Beginn der Suche
    return offer.time_from < timeUntil && offer.time_until > timeFrom;
  });
}

// Prüft ob User offene (nicht abgeschlossene) Matches als Suchender hat
function hasOpenSearchActivity(userId) {
  const count = db.prepare(
    "SELECT COUNT(*) as c FROM matches WHERE seeker_id = ? AND status IN ('active', 'invited', 'confirmed')"
  ).get(userId);
  return count.c > 0;
}

const TEST_USER_IDS = (process.env.TEST_USER_IDS || '206b4eb0-3686-4a7a-adbc-e55b1ddb9a2f').split(',').map(s => s.trim());

function isTestUser(userId) {
  return TEST_USER_IDS.includes(userId);
}

// Middleware: Kann der User suchen (Discover)?
// Nur sperren wenn das gesuchte Zeitfenster mit einem aktiven Angebot kollidiert.
function canSearch(req, res, next) {
  if (isTestUser(req.user.id)) return next();

  const { date, timeFrom, timeUntil } = req.query;
  const offers = db.prepare(
    "SELECT id, date, time_from, time_until, location_text FROM table_offers WHERE user_id = ? AND status = 'active'"
  ).all(req.user.id);

  if (offers.length === 0) return next();

  const conflict = offers.find(offer => {
    if (!date) return true;
    if (offer.date !== date) return false;
    if (!timeFrom || !timeUntil) return true;
    return offer.time_from < timeUntil && offer.time_until > timeFrom;
  });

  if (conflict) {
    return res.status(403).json({
      error: 'Zeitfenster belegt',
      code: 'ROLE_LOCKED_OFFERING',
      conflictingOffer: {
        date: conflict.date,
        timeFrom: conflict.time_from,
        timeUntil: conflict.time_until,
        locationText: conflict.location_text,
      },
    });
  }
  next();
}

// Middleware: Kann der User ein Angebot erstellen?
function canOffer(req, res, next) {
  if (isTestUser(req.user.id)) return next();

  if (hasOpenSearchActivity(req.user.id)) {
    return res.status(403).json({
      error: 'Du bist gerade am Suchen. Schließe erst deine aktiven Matches ab, bevor du einen Platz anbietest.',
      code: 'ROLE_LOCKED_SEARCHING',
    });
  }
  next();
}

// Status-Endpoint
function getRoleStatus(userId) {
  const isOffering = db.prepare(
    "SELECT COUNT(*) as c FROM table_offers WHERE user_id = ? AND status = 'active'"
  ).get(userId).c > 0;
  const isSearching = hasOpenSearchActivity(userId);
  let mode = 'idle';
  if (isOffering) mode = 'offering';
  else if (isSearching) mode = 'searching';
  return { mode, canSearch: true, canOffer: !isSearching }; // canSearch immer true, Zeitfenster-Check erst beim Discover-Call
}

module.exports = { canSearch, canOffer, getRoleStatus };
