const db = require('../../config/database');

// Prüft ob User aktive Angebote hat
// Fix 4: 'full' nicht mehr als aktiv werten — Anbieter ist fertig wenn alle Plätze vergeben
function hasActiveOffers(userId) {
  const count = db.prepare(
    "SELECT COUNT(*) as c FROM table_offers WHERE user_id = ? AND status = 'active'"
  ).get(userId);
  return count.c > 0;
}

// Prüft ob User offene (nicht abgeschlossene) Matches als Suchender hat
// Fix 4: 'confirmed' AUCH als offene Aktivität werten — Suchender hat noch einen aktiven Platz
function hasOpenSearchActivity(userId) {
  const count = db.prepare(
    "SELECT COUNT(*) as c FROM matches WHERE seeker_id = ? AND status IN ('active', 'invited', 'confirmed')"
  ).get(userId);
  return count.c > 0;
}

// Middleware: Kann der User suchen (Discover)?
function canSearch(req, res, next) {
  if (hasActiveOffers(req.user.id)) {
    return res.status(403).json({
      error: 'Du hast aktive Angebote. Solange du Plätze anbietest, kannst du nicht suchen.',
      code: 'ROLE_LOCKED_OFFERING',
    });
  }
  next();
}

// Middleware: Kann der User ein Angebot erstellen?
function canOffer(req, res, next) {
  if (hasOpenSearchActivity(req.user.id)) {
    return res.status(403).json({
      error: 'Du bist gerade am Suchen. Schließe erst deine aktiven Matches ab, bevor du einen Tisch anbietest.',
      code: 'ROLE_LOCKED_SEARCHING',
    });
  }
  next();
}

// Status-Endpoint
function getRoleStatus(userId) {
  const isOffering = hasActiveOffers(userId);
  const isSearching = hasOpenSearchActivity(userId);
  let mode = 'idle';
  if (isOffering) mode = 'offering';
  else if (isSearching) mode = 'searching';
  return { mode, canSearch: !isOffering, canOffer: !isSearching };
}

module.exports = { canSearch, canOffer, getRoleStatus };
