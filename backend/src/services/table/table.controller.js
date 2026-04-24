const { v4: uuid } = require('uuid');
const db = require('../../config/database');

function getTents(req, res) {
  try {
    const tents = db.prepare(
      'SELECT id, name, slug, description, capacity, image_url FROM tents WHERE is_active = 1 ORDER BY name'
    ).all();
    res.json(tents);
  } catch (err) {
    console.error('getTents Fehler:', err);
    res.status(500).json({ error: 'Zelte laden fehlgeschlagen' });
  }
}

function createOffer(req, res) {
  try {
    const {
      tentId, totalSeats, availableSeats, date, timeFrom, timeUntil,
      preferredGenders, preferredAgeMin, preferredAgeMax,
      description, groupDescription, photoUrl, pricePerSeat,
      groupAgeMin, groupAgeMax,
      seatsForWomen, seatsForMen, seatsAnyGender,
    } = req.body;

    // Geschlechter-Plätze
    const sfw = parseInt(seatsForWomen) || 0;
    const sfm = parseInt(seatsForMen) || 0;
    const sag = parseInt(seatsAnyGender) || 0;

    // preferred_genders automatisch aus Plätzen berechnen
    let computedGenders;
    if (sfw === 0 && sfm === 0 && sag === 0) {
      // Keine Einschränkung (Toggle "egal" oder alte Angebote)
      computedGenders = ['m', 'f', 'd'];
    } else {
      const genders = [];
      if (sfw > 0 || sag > 0) genders.push('f');
      if (sfm > 0 || sag > 0) genders.push('m');
      if (sag > 0) genders.push('d');
      computedGenders = genders.length > 0 ? genders : ['m', 'f', 'd'];
    }

    const offerId = uuid();
    db.prepare(`
      INSERT INTO table_offers
        (id, user_id, tent_id, total_seats, available_seats, date, time_from, time_until,
         preferred_genders, preferred_age_min, preferred_age_max,
         description, group_description, photo_url, price_per_seat,
         group_age_min, group_age_max,
         seats_for_women, seats_for_men, seats_any_gender)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      offerId, req.user.id, tentId, totalSeats, availableSeats, date, timeFrom, timeUntil,
      JSON.stringify(computedGenders),
      preferredAgeMin || 18, preferredAgeMax || 99,
      description || null, groupDescription || null, photoUrl || null,
      pricePerSeat || 0,
      groupAgeMin || null, groupAgeMax || null,
      sfw, sfm, sag
    );

    res.status(201).json({ id: offerId, message: 'Tisch-Angebot erstellt' });
  } catch (err) {
    console.error('createOffer Fehler:', err);
    res.status(500).json({ error: 'Angebot erstellen fehlgeschlagen' });
  }
}

function getMyOffers(req, res) {
  try {
    const offers = db.prepare(`
      SELECT o.*, t.name as tent_name, t.slug as tent_slug,
             (SELECT COUNT(*) FROM matches m WHERE m.offer_id = o.id AND m.status = 'active') as match_count
      FROM table_offers o
      JOIN tents t ON t.id = o.tent_id
      WHERE o.user_id = ?
      ORDER BY o.created_at DESC
    `).all(req.user.id);
    res.json(offers);
  } catch (err) {
    console.error('getMyOffers Fehler:', err);
    res.status(500).json({ error: 'Angebote laden fehlgeschlagen' });
  }
}

function updateOffer(req, res) {
  try {
    const { offerId } = req.params;
    const fields = req.body;

    const check = db.prepare('SELECT id FROM table_offers WHERE id = ? AND user_id = ?').get(offerId, req.user.id);
    if (!check) {
      return res.status(404).json({ error: 'Angebot nicht gefunden' });
    }

    // Fix 8: Seats-Reduktion validieren — nicht unter confirmed Matches fallen
    if (fields.availableSeats !== undefined) {
      const confirmedCount = db.prepare(
        "SELECT COALESCE(SUM(seats_granted),0) as total FROM matches WHERE offer_id = ? AND status = 'confirmed'"
      ).get(offerId);
      if (parseInt(fields.availableSeats) < confirmedCount.total) {
        return res.status(400).json({ error: 'Kann nicht unter die Anzahl bestätigter Plätze reduzieren' });
      }
    }

    // Fix 9: 'completed' als erlaubten Status hinzufügen
    const allowedFields = [
      'available_seats', 'time_from', 'time_until', 'preferred_genders',
      'preferred_age_min', 'preferred_age_max', 'description',
      'group_description', 'photo_url', 'price_per_seat', 'status',
      'seats_for_women', 'seats_for_men', 'seats_any_gender',
    ];

    // Fix 9: Status-Validierung — nur erlaubte Werte
    if (fields.status !== undefined) {
      const allowedStatuses = ['active', 'full', 'expired', 'completed'];
      if (!allowedStatuses.includes(fields.status)) {
        return res.status(400).json({ error: 'Ungültiger Status' });
      }
    }

    const updates = [];
    const values = [];

    for (const [key, value] of Object.entries(fields)) {
      const snakeKey = key.replace(/[A-Z]/g, c => '_' + c.toLowerCase());
      if (allowedFields.includes(snakeKey)) {
        updates.push(`${snakeKey} = ?`);
        values.push(snakeKey === 'preferred_genders' ? JSON.stringify(value) : value);
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Keine gültigen Felder zum Aktualisieren' });
    }

    values.push(offerId);
    db.prepare(`UPDATE table_offers SET ${updates.join(', ')} WHERE id = ?`).run(...values);

    // preferred_genders automatisch neu berechnen wenn Geschlechts-Slots geändert wurden
    if (fields.seatsForWomen !== undefined || fields.seatsForMen !== undefined || fields.seatsAnyGender !== undefined) {
      const offer = db.prepare('SELECT seats_for_women, seats_for_men, seats_any_gender FROM table_offers WHERE id = ?').get(offerId);
      const sfw = offer.seats_for_women || 0;
      const sfm = offer.seats_for_men || 0;
      const sag = offer.seats_any_gender || 0;
      let genders;
      if (sfw === 0 && sfm === 0 && sag === 0) {
        genders = ['m', 'f', 'd'];
      } else {
        genders = [];
        if (sfw > 0 || sag > 0) genders.push('f');
        if (sfm > 0 || sag > 0) genders.push('m');
        if (sag > 0) genders.push('d');
        if (genders.length === 0) genders = ['m', 'f', 'd'];
      }
      db.prepare('UPDATE table_offers SET preferred_genders = ? WHERE id = ?').run(JSON.stringify(genders), offerId);

      // Fix 7: Gender-Änderung — inkompatible Matches canceln
      const activeMatches = db.prepare(`
        SELECT m.id, m.seeker_id FROM matches m
        JOIN profiles p ON p.user_id = m.seeker_id
        WHERE m.offer_id = ? AND m.status IN ('active', 'invited')
      `).all(offerId);
      for (const am of activeMatches) {
        const seekerProfile = db.prepare('SELECT gender FROM profiles WHERE user_id = ?').get(am.seeker_id);
        if (seekerProfile && !genders.includes(seekerProfile.gender)) {
          db.prepare("UPDATE matches SET status = 'cancelled' WHERE id = ?").run(am.id);
          db.prepare("INSERT INTO messages (id, match_id, sender_id, content, message_type) VALUES (?, ?, ?, ?, 'system')")
            .run(uuid(), am.id, req.user.id, 'Das Angebot wurde geändert und passt nicht mehr zu deinem Profil.');
        }
      }
    }

    res.json({ message: 'Angebot aktualisiert' });
  } catch (err) {
    console.error('updateOffer Fehler:', err);
    res.status(500).json({ error: 'Aktualisierung fehlgeschlagen' });
  }
}

function deleteOffer(req, res) {
  try {
    const { offerId } = req.params;
    const result = db.prepare(
      "UPDATE table_offers SET status = 'expired' WHERE id = ? AND user_id = ?"
    ).run(offerId, req.user.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Angebot nicht gefunden' });
    }

    // Fix 1: Alle zugehörigen aktiven Matches canceln + System-Nachrichten
    const activeMatches = db.prepare(
      "SELECT id FROM matches WHERE offer_id = ? AND status IN ('active', 'invited', 'confirmed')"
    ).all(offerId);
    for (const m of activeMatches) {
      db.prepare("UPDATE matches SET status = 'cancelled' WHERE id = ?").run(m.id);
      db.prepare("INSERT INTO messages (id, match_id, sender_id, content, message_type) VALUES (?, ?, ?, ?, 'system')")
        .run(uuid(), m.id, req.user.id, 'Das Angebot wurde vom Anbieter zurückgezogen.');
    }

    res.json({ message: 'Angebot deaktiviert' });
  } catch (err) {
    console.error('deleteOffer Fehler:', err);
    res.status(500).json({ error: 'Löschen fehlgeschlagen' });
  }
}

function discoverOffers(req, res) {
  try {
    const userId = req.user.id;
    const { tentId, date, minSeats, ageMin, ageMax, seats, women, men, diverse, timeFrom, timeUntil } = req.query;

    const profile = db.prepare('SELECT age, gender FROM profiles WHERE user_id = ?').get(userId);
    if (!profile) {
      return res.status(400).json({ error: 'Profil nicht vollständig' });
    }

    let query = `
      SELECT o.id, o.total_seats, o.available_seats, o.date, o.time_from, o.time_until,
             o.preferred_genders, o.preferred_age_min, o.preferred_age_max,
             o.description, o.group_description, o.photo_url, o.price_per_seat,
             o.group_age_min, o.group_age_max,
             o.seats_for_women, o.seats_for_men, o.seats_any_gender,
             t.name as tent_name, t.slug as tent_slug, t.image_url as tent_image,
             p.display_name, p.age as offerer_age, p.gender as offerer_gender,
             p.photo_1 as offerer_photo, p.is_verified, p.rating
      FROM table_offers o
      JOIN tents t ON t.id = o.tent_id
      JOIN profiles p ON p.user_id = o.user_id
      WHERE o.status = 'active'
        AND o.user_id != ?
        AND o.date >= date('now')
        AND NOT EXISTS (
          SELECT 1 FROM swipes s WHERE s.swiper_id = ? AND s.target_offer_id = o.id
        )
        AND NOT EXISTS (
          SELECT 1 FROM daily_blocks db WHERE db.user_id = ? AND db.offer_id = o.id AND db.blocked_date = date('now')
        )
    `;
    const params = [userId, userId, userId];

    if (tentId) {
      query += ' AND o.tent_id = ?';
      params.push(tentId);
    }
    if (date) {
      query += ' AND o.date = ?';
      params.push(date);
    }
    if (minSeats) {
      query += ' AND o.available_seats >= ?';
      params.push(parseInt(minSeats));
    }

    query += ' ORDER BY o.date ASC, o.time_from ASC LIMIT 50';

    const offers = db.prepare(query).all(...params);

    // Objekte kopieren damit sie mutiert werden können (SQLite gibt frozen Objects)
    const mutableOffers = offers.map(o => ({...o}));

    // Gender-, Alters-, Gruppenalter- und Platz-Filter in JS
    const filtered = mutableOffers.filter(o => {
      const genders = JSON.parse(o.preferred_genders || '["m","f","d"]');
      if (!genders.includes(profile.gender)) return false;
      if (profile.age < o.preferred_age_min || profile.age > o.preferred_age_max) return false;

      // Suchender filtert nach Gruppenalter (wenn angegeben)
      if (ageMin && o.group_age_max && o.group_age_max < parseInt(ageMin)) return false;
      if (ageMax && o.group_age_min && o.group_age_min > parseInt(ageMax)) return false;

      // Platz-Anzahl-Filter
      if (seats && o.available_seats < parseInt(seats)) return false;

      // Geschlechts-Slot-Matching
      const sfw = o.seats_for_women || 0;
      const sfm = o.seats_for_men || 0;
      const sag = o.seats_any_gender || 0;

      // Wenn Anbieter keine Einschränkung hat (alle 0) → Gender OK, weiter mit Zeitfilter
      const genderOk = (sfw === 0 && sfm === 0 && sag === 0);

      const womenNeeded = parseInt(women) || 0;
      const menNeeded = parseInt(men) || 0;
      const diverseNeeded = parseInt(diverse) || 0;

      // Wenn Suchende keine Geschlechts-Info angeben → Gender OK
      const noGenderFilter = (womenNeeded === 0 && menNeeded === 0 && diverseNeeded === 0);

      // Geschlechts-Slot-Matching (nur wenn nötig)
      if (!genderOk && !noGenderFilter) {
        let anyLeft = sag;
        let womenRemaining = womenNeeded - sfw;
        if (womenRemaining < 0) womenRemaining = 0;
        anyLeft -= womenRemaining;
        if (anyLeft < 0) return false;

        let menRemaining = menNeeded - sfm;
        if (menRemaining < 0) menRemaining = 0;
        anyLeft -= menRemaining;
        if (anyLeft < 0) return false;

        anyLeft -= diverseNeeded;
        if (anyLeft < 0) return false;
      }

      // Zeitüberschneidung berechnen
      if (timeFrom && timeUntil) {
        const searchStart = timeFrom;   // z.B. "17:30"
        const searchEnd = timeUntil;     // z.B. "19:00"
        const offerStart = o.time_from;  // z.B. "17:00"
        const offerEnd = o.time_until;   // z.B. "18:00"

        // Keine Überschneidung → rausfiltern
        if (offerEnd <= searchStart || offerStart >= searchEnd) return false;

        // Überschneidung berechnen
        const overlapStart = offerStart > searchStart ? offerStart : searchStart;
        const overlapEnd = offerEnd < searchEnd ? offerEnd : searchEnd;

        // In Minuten umrechnen
        function toMinutes(t) { const [h, m] = t.split(':').map(Number); return h * 60 + m; }
        const overlapMinutes = toMinutes(overlapEnd) - toMinutes(overlapStart);
        const searchMinutes = toMinutes(searchEnd) - toMinutes(searchStart);

        // Ans Objekt anhängen für Frontend
        o.overlap_minutes = overlapMinutes;
        o.full_overlap = overlapMinutes >= searchMinutes;
      }

      return true;
    });

    res.json(filtered);
  } catch (err) {
    console.error('discoverOffers Fehler:', err);
    res.status(500).json({ error: 'Angebote laden fehlgeschlagen' });
  }
}

module.exports = { getTents, createOffer, getMyOffers, updateOffer, deleteOffer, discoverOffers };
