const { v4: uuid } = require('uuid');
const db = require('../../config/database');
const { geocode } = require('../../lib/geocode');

async function createSearch(req, res) {
  try {
    const {
      locationText, locationLat, locationLng,
      seatsNeeded, date, timeFrom, timeUntil,
      preferredGenders, preferredAgeMin, preferredAgeMax,
    } = req.body;

    if (!locationText && (locationLat == null || locationLng == null)) {
      return res.status(400).json({ error: 'Entweder Ort (Text) oder GPS-Koordinaten erforderlich' });
    }

    let finalLat = locationLat != null ? parseFloat(locationLat) : null;
    let finalLng = locationLng != null ? parseFloat(locationLng) : null;

    if (locationText && finalLat == null) {
      const coords = await geocode(locationText);
      if (coords) { finalLat = coords.lat; finalLng = coords.lng; }
    }

    db.prepare("UPDATE seeker_searches SET status = 'expired' WHERE user_id = ? AND status = 'active'").run(req.user.id);

    const searchId = uuid();
    db.prepare(`
      INSERT INTO seeker_searches
        (id, user_id, location_text, location_lat, location_lng,
         seats_needed, date, time_from, time_until,
         preferred_genders, preferred_age_min, preferred_age_max)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      searchId, req.user.id,
      locationText || null, finalLat, finalLng,
      seatsNeeded || 1, date, timeFrom, timeUntil,
      JSON.stringify(preferredGenders || ['m', 'f', 'd']),
      preferredAgeMin || 18, preferredAgeMax || 99
    );

    res.status(201).json({ id: searchId, message: 'Suchanfrage erstellt', lat: finalLat, lng: finalLng });
  } catch (err) {
    console.error('createSearch Fehler:', err);
    res.status(500).json({ error: 'Suchanfrage erstellen fehlgeschlagen' });
  }
}

function getMySearch(req, res) {
  try {
    const today = new Date().toISOString().slice(0, 10);
    db.prepare("UPDATE seeker_searches SET status = 'expired' WHERE user_id = ? AND date < ?").run(req.user.id, today);
    const search = db.prepare("SELECT * FROM seeker_searches WHERE user_id = ? AND status = 'active' ORDER BY created_at DESC LIMIT 1").get(req.user.id);
    res.json(search || null);
  } catch (err) {
    console.error('getMySearch Fehler:', err);
    res.status(500).json({ error: 'Suche laden fehlgeschlagen' });
  }
}

function deleteSearch(req, res) {
  try {
    const result = db.prepare("UPDATE seeker_searches SET status = 'expired' WHERE user_id = ? AND status = 'active'").run(req.user.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Keine aktive Suche gefunden' });
    res.json({ message: 'Suche beendet' });
  } catch (err) {
    console.error('deleteSearch Fehler:', err);
    res.status(500).json({ error: 'Löschen fehlgeschlagen' });
  }
}

module.exports = { createSearch, getMySearch, deleteSearch };
