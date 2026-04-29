const { v4: uuid } = require('uuid');
const db = require('../../config/database');

const RADIUS_M = 100;
const RADIUS_DEG_LAT = 0.0009;
const RADIUS_DEG_LNG = 0.00125;

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function wasUserActiveNear(userId, lat, lng) {
  const offer = db.prepare(`
    SELECT id FROM table_offers
    WHERE user_id = ? AND location_lat IS NOT NULL
      AND location_lat BETWEEN ? AND ?
      AND location_lng BETWEEN ? AND ?
      AND date >= date('now', '-7 days')
  `).get(userId, lat - RADIUS_DEG_LAT, lat + RADIUS_DEG_LAT, lng - RADIUS_DEG_LNG, lng + RADIUS_DEG_LNG);
  if (offer) return true;

  const search = db.prepare(`
    SELECT id FROM seeker_searches
    WHERE user_id = ? AND location_lat IS NOT NULL
      AND location_lat BETWEEN ? AND ?
      AND location_lng BETWEEN ? AND ?
      AND date >= date('now', '-7 days')
  `).get(userId, lat - RADIUS_DEG_LAT, lat + RADIUS_DEG_LAT, lng - RADIUS_DEG_LNG, lng + RADIUS_DEG_LNG);
  return !!search;
}

// GET /locations
function getLocations(req, res) {
  try {
    const userId = req.user.id;
    const rows = db.prepare(`
      SELECT location_lat as lat, location_lng as lng, location_text as label, date as activity_date
      FROM table_offers
      WHERE user_id = ? AND location_lat IS NOT NULL AND date >= date('now', '-7 days')
      UNION
      SELECT location_lat as lat, location_lng as lng, location_text as label, date as activity_date
      FROM seeker_searches
      WHERE user_id = ? AND location_lat IS NOT NULL AND date >= date('now', '-7 days')
      ORDER BY activity_date DESC
    `).all(userId, userId);

    // Deduplicate: merge locations within 100m
    const deduped = [];
    for (const row of rows) {
      const isDuplicate = deduped.some(d => haversine(d.lat, d.lng, row.lat, row.lng) < RADIUS_M);
      if (!isDuplicate) deduped.push(row);
    }

    // Flag which locations already have a pin
    const myPins = db.prepare(`
      SELECT lat, lng FROM yesterday_pins WHERE user_id = ? AND created_at >= datetime('now', '-7 days')
    `).all(userId);

    const result = deduped.map(loc => ({
      ...loc,
      pinned: myPins.some(p => haversine(p.lat, p.lng, loc.lat, loc.lng) < RADIUS_M),
    }));

    res.json(result);
  } catch (err) {
    console.error('getLocations Fehler:', err);
    res.status(500).json({ error: 'Orte laden fehlgeschlagen' });
  }
}

// POST /pin
function setPin(req, res) {
  try {
    const { lat, lng } = req.body;
    const userId = req.user.id;

    if (lat == null || lng == null) return res.status(400).json({ error: 'lat und lng erforderlich' });

    if (!wasUserActiveNear(userId, lat, lng)) {
      return res.status(400).json({ error: 'Keine Aktivität an diesem Ort in den letzten 7 Tagen gefunden' });
    }

    // Avoid duplicate pins within 100m for same user
    const existing = db.prepare(`
      SELECT id FROM yesterday_pins
      WHERE user_id = ?
        AND lat BETWEEN ? AND ?
        AND lng BETWEEN ? AND ?
    `).get(userId, lat - RADIUS_DEG_LAT, lat + RADIUS_DEG_LAT, lng - RADIUS_DEG_LNG, lng + RADIUS_DEG_LNG);

    if (!existing) {
      db.prepare('INSERT INTO yesterday_pins (id, user_id, lat, lng) VALUES (?, ?, ?, ?)').run(uuid(), userId, lat, lng);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('setPin Fehler:', err);
    res.status(500).json({ error: 'Pin setzen fehlgeschlagen' });
  }
}

// GET /feed
function getFeed(req, res) {
  try {
    const userId = req.user.id;

    const myPins = db.prepare(`
      SELECT lat, lng FROM yesterday_pins
      WHERE user_id = ? AND created_at >= datetime('now', '-7 days')
    `).all(userId);

    if (myPins.length === 0) return res.json([]);

    const feedMap = new Map();

    for (const myPin of myPins) {
      const { lat, lng } = myPin;

      const nearbyPins = db.prepare(`
        SELECT yp.user_id, yp.lat, yp.lng,
               p.display_name, p.photo_1, p.photo_2, p.emoji, p.age, p.gender, p.bio
        FROM yesterday_pins yp
        JOIN profiles p ON p.user_id = yp.user_id
        WHERE yp.user_id != ?
          AND yp.lat BETWEEN ? AND ?
          AND yp.lng BETWEEN ? AND ?
          AND yp.created_at >= datetime('now', '-7 days')
      `).all(userId, lat - RADIUS_DEG_LAT, lat + RADIUS_DEG_LAT, lng - RADIUS_DEG_LNG, lng + RADIUS_DEG_LNG);

      for (const pin of nearbyPins) {
        if (haversine(lat, lng, pin.lat, pin.lng) > RADIUS_M) continue;
        if (feedMap.has(pin.user_id)) continue;

        const action = db.prepare(
          'SELECT action FROM yesterday_feed_actions WHERE actor_id = ? AND subject_id = ?'
        ).get(userId, pin.user_id);
        if (action) continue;

        if (!wasUserActiveNear(pin.user_id, lat, lng)) continue;

        feedMap.set(pin.user_id, {
          userId: pin.user_id,
          displayName: pin.display_name,
          photo: pin.photo_1 || pin.photo_2,
          emoji: pin.emoji,
          age: pin.age,
          gender: pin.gender,
          bio: pin.bio,
        });
      }
    }

    res.json([...feedMap.values()]);
  } catch (err) {
    console.error('getFeed Fehler:', err);
    res.status(500).json({ error: 'Feed laden fehlgeschlagen' });
  }
}

// POST /feed/:userId/like
function likeUser(req, res) {
  try {
    const actorId = req.user.id;
    const subjectId = req.params.userId;

    if (actorId === subjectId) return res.status(400).json({ error: 'Nicht erlaubt' });

    const existing = db.prepare(
      'SELECT action FROM yesterday_feed_actions WHERE actor_id = ? AND subject_id = ?'
    ).get(actorId, subjectId);
    if (existing) return res.status(409).json({ error: 'Bereits bewertet' });

    db.prepare('INSERT INTO yesterday_feed_actions (id, actor_id, subject_id, action) VALUES (?, ?, ?, ?)')
      .run(uuid(), actorId, subjectId, 'liked');

    // Check mutual like
    const theyLikedMe = db.prepare(
      "SELECT id FROM yesterday_feed_actions WHERE actor_id = ? AND subject_id = ? AND action = 'liked'"
    ).get(subjectId, actorId);

    let mutualMatch = false;
    if (theyLikedMe) {
      const [u1, u2] = [actorId, subjectId].sort();
      const existingRequest = db.prepare(
        'SELECT id FROM yesterday_requests WHERE user1_id = ? AND user2_id = ?'
      ).get(u1, u2);
      if (!existingRequest) {
        db.prepare('INSERT INTO yesterday_requests (id, user1_id, user2_id) VALUES (?, ?, ?)').run(uuid(), u1, u2);
        mutualMatch = true;
      }
    }

    res.json({ success: true, mutualMatch });
  } catch (err) {
    console.error('likeUser Fehler:', err);
    res.status(500).json({ error: 'Like fehlgeschlagen' });
  }
}

// POST /feed/:userId/pass
function passUser(req, res) {
  try {
    const actorId = req.user.id;
    const subjectId = req.params.userId;

    const existing = db.prepare(
      'SELECT action FROM yesterday_feed_actions WHERE actor_id = ? AND subject_id = ?'
    ).get(actorId, subjectId);
    if (existing) return res.status(409).json({ error: 'Bereits bewertet' });

    db.prepare('INSERT INTO yesterday_feed_actions (id, actor_id, subject_id, action) VALUES (?, ?, ?, ?)')
      .run(uuid(), actorId, subjectId, 'passed');

    res.json({ success: true });
  } catch (err) {
    console.error('passUser Fehler:', err);
    res.status(500).json({ error: 'Pass fehlgeschlagen' });
  }
}

// GET /requests
function getRequests(req, res) {
  try {
    const userId = req.user.id;
    const requests = db.prepare(`
      SELECT yr.id, yr.user1_id, yr.user2_id, yr.status, yr.chat_id,
             yr.user1_accepted, yr.user2_accepted, yr.created_at,
             p1.display_name as u1_name, p1.photo_1 as u1_photo, p1.emoji as u1_emoji,
             p2.display_name as u2_name, p2.photo_1 as u2_photo, p2.emoji as u2_emoji
      FROM yesterday_requests yr
      JOIN profiles p1 ON p1.user_id = yr.user1_id
      JOIN profiles p2 ON p2.user_id = yr.user2_id
      WHERE (yr.user1_id = ? OR yr.user2_id = ?) AND yr.status != 'rejected'
      ORDER BY yr.created_at DESC
    `).all(userId, userId);

    res.json(requests.map(r => {
      const isUser1 = r.user1_id === userId;
      const myAccepted = isUser1 ? r.user1_accepted : r.user2_accepted;
      return {
        id: r.id,
        status: r.status,
        chatId: r.chat_id,
        myAccepted: !!myAccepted,
        createdAt: r.created_at,
        otherUser: isUser1
          ? { id: r.user2_id, displayName: r.u2_name, photo: r.u2_photo, emoji: r.u2_emoji }
          : { id: r.user1_id, displayName: r.u1_name, photo: r.u1_photo, emoji: r.u1_emoji },
      };
    }));
  } catch (err) {
    console.error('getRequests Fehler:', err);
    res.status(500).json({ error: 'Anfragen laden fehlgeschlagen' });
  }
}

// POST /requests/:id/accept
function acceptRequest(req, res) {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const request = db.prepare('SELECT * FROM yesterday_requests WHERE id = ?').get(id);
    if (!request) return res.status(404).json({ error: 'Anfrage nicht gefunden' });
    if (request.user1_id !== userId && request.user2_id !== userId) {
      return res.status(403).json({ error: 'Nicht berechtigt' });
    }
    if (request.status === 'rejected') return res.status(400).json({ error: 'Anfrage wurde abgelehnt' });

    const isUser1 = request.user1_id === userId;
    const acceptField = isUser1 ? 'user1_accepted' : 'user2_accepted';

    db.prepare(`UPDATE yesterday_requests SET ${acceptField} = 1 WHERE id = ?`).run(id);

    const updated = db.prepare('SELECT * FROM yesterday_requests WHERE id = ?').get(id);
    let chatId = updated.chat_id;

    if (updated.user1_accepted && updated.user2_accepted && !chatId) {
      chatId = uuid();
      db.prepare('INSERT INTO yesterday_chats (id, user1_id, user2_id) VALUES (?, ?, ?)').run(chatId, updated.user1_id, updated.user2_id);
      db.prepare("UPDATE yesterday_requests SET status = 'accepted', chat_id = ? WHERE id = ?").run(chatId, id);
    }

    res.json({ success: true, chatId: chatId || null, bothAccepted: !!(updated.user1_accepted && updated.user2_accepted) });
  } catch (err) {
    console.error('acceptRequest Fehler:', err);
    res.status(500).json({ error: 'Annehmen fehlgeschlagen' });
  }
}

// POST /requests/:id/reject
function rejectRequest(req, res) {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const request = db.prepare('SELECT * FROM yesterday_requests WHERE id = ?').get(id);
    if (!request) return res.status(404).json({ error: 'Anfrage nicht gefunden' });
    if (request.user1_id !== userId && request.user2_id !== userId) {
      return res.status(403).json({ error: 'Nicht berechtigt' });
    }

    db.prepare("UPDATE yesterday_requests SET status = 'rejected' WHERE id = ?").run(id);
    res.json({ success: true });
  } catch (err) {
    console.error('rejectRequest Fehler:', err);
    res.status(500).json({ error: 'Ablehnen fehlgeschlagen' });
  }
}

// GET /chats/:chatId/messages
function getChatMessages(req, res) {
  try {
    const userId = req.user.id;
    const { chatId } = req.params;

    const chat = db.prepare(
      'SELECT * FROM yesterday_chats WHERE id = ? AND (user1_id = ? OR user2_id = ?)'
    ).get(chatId, userId, userId);
    if (!chat) return res.status(404).json({ error: 'Chat nicht gefunden' });

    const otherId = chat.user1_id === userId ? chat.user2_id : chat.user1_id;
    const other = db.prepare(`
      SELECT u.id, p.display_name, p.photo_1, p.emoji
      FROM users u JOIN profiles p ON p.user_id = u.id
      WHERE u.id = ?
    `).get(otherId);

    const messages = db.prepare(`
      SELECT m.id, m.sender_id, m.content, m.is_read, m.created_at,
             p.display_name as sender_name
      FROM yesterday_messages m
      JOIN profiles p ON p.user_id = m.sender_id
      WHERE m.chat_id = ?
      ORDER BY m.created_at ASC, m.rowid ASC
    `).all(chatId);

    db.prepare(
      'UPDATE yesterday_messages SET is_read = 1 WHERE chat_id = ? AND sender_id != ?'
    ).run(chatId, userId);

    res.json({ chat: { id: chatId, otherUser: other }, messages });
  } catch (err) {
    console.error('getChatMessages Fehler:', err);
    res.status(500).json({ error: 'Nachrichten laden fehlgeschlagen' });
  }
}

// POST /chats/:chatId/messages
function sendChatMessage(req, res) {
  try {
    const userId = req.user.id;
    const { chatId } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) return res.status(400).json({ error: 'Nachricht darf nicht leer sein' });

    const chat = db.prepare(
      'SELECT id FROM yesterday_chats WHERE id = ? AND (user1_id = ? OR user2_id = ?)'
    ).get(chatId, userId, userId);
    if (!chat) return res.status(404).json({ error: 'Chat nicht gefunden' });

    const msgId = uuid();
    db.prepare('INSERT INTO yesterday_messages (id, chat_id, sender_id, content) VALUES (?, ?, ?, ?)')
      .run(msgId, chatId, userId, content.trim());

    const msg = db.prepare('SELECT created_at FROM yesterday_messages WHERE id = ?').get(msgId);
    res.status(201).json({ id: msgId, chatId, senderId: userId, content: content.trim(), createdAt: msg.created_at });
  } catch (err) {
    console.error('sendChatMessage Fehler:', err);
    res.status(500).json({ error: 'Nachricht senden fehlgeschlagen' });
  }
}

module.exports = {
  getLocations, setPin, getFeed, likeUser, passUser,
  getRequests, acceptRequest, rejectRequest,
  getChatMessages, sendChatMessage,
};
