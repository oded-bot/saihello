const { v4: uuid } = require('uuid');
const db = require('../../config/database');
const leaderboard = require('../leaderboard/leaderboard');

let _io = null;
function setIo(io) { _io = io; }

function swipe(req, res) {
  try {
    const { offerId, direction } = req.body;
    const userId = req.user.id;

    if (direction === 'like') {
      const confirmedMatch = db.prepare(
        "SELECT id FROM matches WHERE seeker_id = ? AND status = 'confirmed'"
      ).get(userId);
      if (confirmedMatch) {
        return res.status(403).json({ error: 'Du hast bereits einen bestätigten Platz' });
      }
    }

    const offer = db.prepare(
      "SELECT id, user_id, available_seats, date, time_until FROM table_offers WHERE id = ? AND status = 'active'"
    ).get(offerId);

    if (!offer) {
      return res.status(404).json({ error: 'Angebot nicht verfügbar' });
    }
    if (offer.user_id === userId) {
      return res.status(400).json({ error: 'Eigenes Angebot' });
    }

    // Ablaufzeit: Ende des Angebots-Zeitfensters, oder +2h falls kein Zeitfenster
    const expiresAt = (offer.date && offer.time_until)
      ? `${offer.date} ${offer.time_until}`
      : new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString().slice(0, 19);

    // Swipe speichern (upsert)
    db.prepare(`
      INSERT INTO swipes (id, swiper_id, target_offer_id, target_user_id, direction)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT (swiper_id, target_offer_id) DO UPDATE SET direction = ?
    `).run(uuid(), userId, offerId, offer.user_id, direction, direction);

    let match = null;

    if (direction === 'like') {
      const matchId = uuid();
      const result = db.prepare(`
        INSERT OR IGNORE INTO matches (id, offer_id, offerer_id, seeker_id, seats_granted, status, expires_at)
        VALUES (?, ?, ?, ?, 1, 'pending', ?)
      `).run(matchId, offerId, offer.user_id, userId, expiresAt);

      if (result.changes > 0) {
        match = { id: matchId, isNew: true };
      }
    }

    res.json({ direction, match });
  } catch (err) {
    console.error('swipe Fehler:', err);
    res.status(500).json({ error: 'Swipe fehlgeschlagen' });
  }
}

function getMatches(req, res) {
  try {
    const userId = req.user.id;

    // Abgelaufene ausstehende Anfragen stillschweigend löschen
    db.prepare(`
      DELETE FROM matches
      WHERE status IN ('pending', 'active')
        AND expires_at IS NOT NULL
        AND expires_at < datetime('now')
    `).run();

    const matches = db.prepare(`
      SELECT m.id, m.offer_id, m.seats_granted, m.status, m.created_at, m.expires_at,
             m.offerer_id, m.seeker_id,
             o.date, o.time_from, o.time_until, o.location_text,
             CASE WHEN m.offerer_id = ? THEN sp.display_name ELSE op.display_name END as partner_name,
             CASE WHEN m.offerer_id = ? THEN sp.display_name ELSE op.display_name END as other_display_name,
             CASE WHEN m.offerer_id = ? THEN sp.photo_1 ELSE op.photo_1 END as other_photo,
             CASE WHEN m.offerer_id = ? THEN sp.age ELSE op.age END as other_age,
             CASE WHEN m.offerer_id = ? THEN sp.gender ELSE op.gender END as other_gender,
             CASE WHEN m.offerer_id = ? THEN sp.is_verified ELSE op.is_verified END as other_verified,
             CASE WHEN m.offerer_id = ? THEN 'offerer' ELSE 'seeker' END as my_role,
             (SELECT direction FROM swipes s WHERE s.swiper_id = m.seeker_id AND s.target_offer_id = m.offer_id LIMIT 1) as swipe_direction,
             (SELECT content FROM messages msg WHERE msg.match_id = m.id ORDER BY msg.created_at DESC LIMIT 1) as last_message,
             (SELECT created_at FROM messages msg WHERE msg.match_id = m.id ORDER BY msg.created_at DESC LIMIT 1) as last_message_at,
             (SELECT COUNT(*) FROM messages msg WHERE msg.match_id = m.id AND msg.sender_id != ? AND msg.is_read = 0) as unread_count
      FROM matches m
      JOIN table_offers o ON o.id = m.offer_id
      JOIN profiles op ON op.user_id = m.offerer_id
      JOIN profiles sp ON sp.user_id = m.seeker_id
      WHERE (m.offerer_id = ? OR m.seeker_id = ?)
        AND m.status IN ('pending', 'active', 'invited', 'confirmed')
      ORDER BY last_message_at DESC, m.created_at DESC
    `).all(userId, userId, userId, userId, userId, userId, userId, userId, userId, userId);

    res.json(matches);
  } catch (err) {
    console.error('getMatches Fehler:', err);
    res.status(500).json({ error: 'Matches laden fehlgeschlagen' });
  }
}

function getMatchDetail(req, res) {
  try {
    const { matchId } = req.params;
    const userId = req.user.id;

    const match = db.prepare(`
      SELECT m.*, o.date, o.time_from, o.time_until, o.location_text,
             o.group_description, o.photo_url as offer_photo,
             op.display_name as offerer_name, op.photo_1 as offerer_photo,
             op.age as offerer_age, op.gender as offerer_gender, op.bio as offerer_bio,
             op.is_verified as offerer_verified, op.rating as offerer_rating,
             sp.display_name as seeker_name, sp.photo_1 as seeker_photo,
             sp.age as seeker_age, sp.gender as seeker_gender, sp.bio as seeker_bio,
             sp.is_verified as seeker_verified, sp.rating as seeker_rating
      FROM matches m
      JOIN table_offers o ON o.id = m.offer_id
      JOIN profiles op ON op.user_id = m.offerer_id
      JOIN profiles sp ON sp.user_id = m.seeker_id
      WHERE m.id = ? AND (m.offerer_id = ? OR m.seeker_id = ?)
    `).get(matchId, userId, userId);

    if (!match) {
      return res.status(404).json({ error: 'Match nicht gefunden' });
    }
    res.json(match);
  } catch (err) {
    console.error('getMatchDetail Fehler:', err);
    res.status(500).json({ error: 'Match laden fehlgeschlagen' });
  }
}

// Anbieter bestätigt Anfrage → Match direkt confirmed, Chat öffnet sich
function confirmMatch(req, res) {
  try {
    const { matchId } = req.params;
    const { seats: grantedSeats } = req.body;
    const userId = req.user.id;

    const match = db.prepare(
      "SELECT id, offerer_id, seeker_id, offer_id, seats_granted FROM matches WHERE id = ? AND offerer_id = ? AND status IN ('pending', 'active')"
    ).get(matchId, userId);

    if (!match) {
      return res.status(404).json({ error: 'Anfrage nicht gefunden oder du bist nicht der Anbieter' });
    }

    const seatsToGrant = grantedSeats || match.seats_granted || 1;

    const confirmTx = db.transaction(() => {
      // 1. Match direkt bestätigen
      db.prepare("UPDATE matches SET status = 'confirmed', seats_granted = ?, confirmed_at = datetime('now') WHERE id = ?")
        .run(seatsToGrant, matchId);

      // 2. Plätze im Angebot reduzieren
      const offer = db.prepare('SELECT id, available_seats FROM table_offers WHERE id = ?').get(match.offer_id);
      const newSeats = Math.max(0, (offer.available_seats || 0) - seatsToGrant);
      if (newSeats <= 0) {
        db.prepare("UPDATE table_offers SET status = 'full' WHERE id = ?").run(offer.id);
      } else {
        db.prepare("UPDATE table_offers SET available_seats = ? WHERE id = ?").run(newSeats, offer.id);
      }

      // 3. Andere Anfragen für dieses Angebot canceln falls keine Plätze mehr
      if (newSeats <= 0) {
        const otherOfferMatches = db.prepare(
          "SELECT id FROM matches WHERE offer_id = ? AND id != ? AND status IN ('pending', 'active')"
        ).all(match.offer_id, matchId);
        for (const om of otherOfferMatches) {
          db.prepare("UPDATE matches SET status = 'cancelled' WHERE id = ?").run(om.id);
        }
      }

      // 4. Alle anderen Anfragen des Suchenden canceln (Exklusivität)
      const otherSeekerMatches = db.prepare(
        "SELECT id FROM matches WHERE seeker_id = ? AND id != ? AND status IN ('pending', 'active', 'confirmed')"
      ).all(match.seeker_id, matchId);
      for (const sm of otherSeekerMatches) {
        db.prepare("UPDATE matches SET status = 'cancelled' WHERE id = ?").run(sm.id);
      }

      // 5. System-Nachricht — Chat öffnet sich jetzt
      db.prepare(`
        INSERT INTO messages (id, match_id, sender_id, content, message_type)
        VALUES (?, ?, ?, 'Platz bestätigt! Ihr könnt jetzt chatten. 🎉', 'system')
      `).run(uuid(), matchId, userId);
    });

    confirmTx();

    if (_io) leaderboard.broadcast(_io);

    res.json({ message: 'Anfrage bestätigt!' });
  } catch (err) {
    console.error('confirmMatch Fehler:', err);
    res.status(500).json({ error: 'Bestätigung fehlgeschlagen' });
  }
}

// Keine separate Annahme durch Suchenden mehr nötig — Bestätigung durch Anbieter ist final
function acceptInvite(req, res) {
  res.json({ message: 'OK' });
}

// Anbieter lehnt Match ab → Tages-Sperre für das Angebot
function rejectMatch(req, res) {
  try {
    const { matchId } = req.params;
    const userId = req.user.id;

    const match = db.prepare(
      "SELECT id, offerer_id, seeker_id, offer_id FROM matches WHERE id = ? AND offerer_id = ? AND status IN ('pending', 'active', 'invited')"
    ).get(matchId, userId);

    if (!match) {
      return res.status(404).json({ error: 'Match nicht gefunden oder du bist nicht der Anbieter' });
    }

    db.transaction(() => {
      // Match auf rejected setzen
      db.prepare("UPDATE matches SET status = 'rejected' WHERE id = ?").run(matchId);

      // Tages-Sperre: Suchender kann dieses Angebot heute nicht mehr sehen
      const today = new Date().toISOString().split('T')[0];
      db.prepare(
        "INSERT OR IGNORE INTO daily_blocks (id, user_id, offer_id, blocked_date) VALUES (?, ?, ?, ?)"
      ).run(uuid(), match.seeker_id, match.offer_id, today);

      // Info-Nachricht an den Suchenden
      db.prepare("INSERT INTO messages (id, match_id, sender_id, content, message_type) VALUES (?, ?, ?, ?, 'system')")
        .run(uuid(), matchId, userId, 'Der Anbieter hat den Match leider abgelehnt. Das Angebot ist für heute nicht mehr verfügbar.');
    })();

    res.json({ message: 'Match abgelehnt' });
  } catch (err) {
    console.error('rejectMatch Fehler:', err);
    res.status(500).json({ error: 'Ablehnung fehlgeschlagen' });
  }
}

function cancelMatch(req, res) {
  try {
    const { matchId } = req.params;
    const userId = req.user.id;

    // Fix 2: Alten Status und seats_granted holen
    const match = db.prepare(
      "SELECT id, offer_id, seats_granted, status FROM matches WHERE id = ? AND (offerer_id = ? OR seeker_id = ?) AND status IN ('active', 'invited', 'confirmed')"
    ).get(matchId, userId, userId);

    if (!match) {
      return res.status(404).json({ error: 'Match nicht gefunden' });
    }

    db.transaction(() => {
      db.prepare("UPDATE matches SET status = 'cancelled' WHERE id = ?").run(matchId);

      // Fix 2 + Fix 5: Plätze zurückgeben wenn confirmed
      if (match.status === 'confirmed') {
        const offer = db.prepare("SELECT id, available_seats, status FROM table_offers WHERE id = ?").get(match.offer_id);
        if (offer) {
          const newSeats = (offer.available_seats || 0) + (match.seats_granted || 1);
          const newStatus = offer.status === 'full' ? 'active' : offer.status;
          db.prepare("UPDATE table_offers SET available_seats = ?, status = ? WHERE id = ?").run(newSeats, newStatus, offer.id);
        }
      }

      // Fix 12: System-Nachricht bei Cancel
      db.prepare("INSERT INTO messages (id, match_id, sender_id, content, message_type) VALUES (?, ?, ?, ?, 'system')")
        .run(uuid(), matchId, userId, 'Der Match wurde beendet.');
    })();

    res.json({ message: 'Match abgesagt' });
  } catch (err) {
    console.error('cancelMatch Fehler:', err);
    res.status(500).json({ error: 'Absage fehlgeschlagen' });
  }
}

function rateMatch(req, res) {
  try {
    const { matchId } = req.params;
    const { rating, review } = req.body;
    const userId = req.user.id;

    const match = db.prepare(
      "SELECT offerer_id, seeker_id FROM matches WHERE id = ? AND status = 'completed'"
    ).get(matchId);

    if (!match) {
      return res.status(404).json({ error: 'Match nicht gefunden oder noch nicht abgeschlossen' });
    }

    const isOfferer = match.offerer_id === userId;
    const ratedUserId = isOfferer ? match.seeker_id : match.offerer_id;

    if (isOfferer) {
      db.prepare('UPDATE matches SET seeker_rating = ?, seeker_review = ? WHERE id = ?')
        .run(rating, review || null, matchId);
    } else {
      db.prepare('UPDATE matches SET offerer_rating = ?, offerer_review = ? WHERE id = ?')
        .run(rating, review || null, matchId);
    }

    db.prepare(`
      UPDATE profiles SET
        rating = (rating * total_ratings + ?) / (total_ratings + 1),
        total_ratings = total_ratings + 1
      WHERE user_id = ?
    `).run(rating, ratedUserId);

    res.json({ message: 'Bewertung gespeichert' });
  } catch (err) {
    console.error('rateMatch Fehler:', err);
    res.status(500).json({ error: 'Bewertung fehlgeschlagen' });
  }
}

function getReceivedLikes(req, res) {
  try {
    const userId = req.user.id;

    const likes = db.prepare(`
      SELECT s.id, s.direction, s.created_at,
             s.target_offer_id as offer_id,
             o.date, o.time_from, o.location_text,
             p.display_name, p.photo_1, p.age, p.gender, p.is_verified, p.rating, p.bio
      FROM swipes s
      JOIN table_offers o ON o.id = s.target_offer_id
      JOIN profiles p ON p.user_id = s.swiper_id
      WHERE s.target_user_id = ?
        AND s.direction = 'like'
        AND o.status = 'active'
      ORDER BY s.created_at DESC
    `).all(userId);

    res.json(likes);
  } catch (err) {
    console.error('getReceivedLikes Fehler:', err);
    res.status(500).json({ error: 'Likes laden fehlgeschlagen' });
  }
}

// Anbieter lädt Suchenden direkt ein (vom Kartenpin aus)
function inviteSeeker(req, res) {
  try {
    const { seekerUserId, direction } = req.body;
    const offererId = req.user.id;

    if (seekerUserId === offererId) {
      return res.status(400).json({ error: 'Eigenes Profil' });
    }

    const offer = db.prepare(
      "SELECT id, available_seats FROM table_offers WHERE user_id = ? AND status = 'active' ORDER BY created_at DESC LIMIT 1"
    ).get(offererId);

    if (!offer) {
      return res.status(404).json({ error: 'Kein aktives Angebot gefunden' });
    }

    const matchId = uuid();
    const result = db.prepare(`
      INSERT OR IGNORE INTO matches (id, offer_id, offerer_id, seeker_id, seats_granted, status, confirmed_at)
      VALUES (?, ?, ?, ?, 1, 'confirmed', datetime('now'))
    `).run(matchId, offer.id, offererId, seekerUserId);

    let match = null;
    if (result.changes > 0) {
      match = { id: matchId, isNew: true };
      db.prepare(`
        INSERT INTO messages (id, match_id, sender_id, content, message_type)
        VALUES (?, ?, ?, 'Platz bestätigt! Ihr könnt jetzt chatten. 🎉', 'system')
      `).run(uuid(), matchId, offererId);
    }

    res.json({ direction, match });
  } catch (err) {
    console.error('inviteSeeker Fehler:', err);
    res.status(500).json({ error: 'Einladung fehlgeschlagen' });
  }
}

module.exports = { swipe, inviteSeeker, getMatches, getMatchDetail, confirmMatch, acceptInvite, rejectMatch, cancelMatch, rateMatch, getReceivedLikes, setIo };
