const { v4: uuid } = require('uuid');
const db = require('../../config/database');

// Alle User mit Profil+Foto (nicht man selbst, nicht geblockt)
function getPeople(req, res) {
  try {
    const userId = req.user.id;

    const people = db.prepare(`
      SELECT u.id as user_id, p.display_name, p.photo_1, p.age, p.gender, p.bio, p.is_verified, p.rating
      FROM users u
      JOIN profiles p ON p.user_id = u.id
      WHERE u.id != ?
        AND u.is_active = 1
        AND u.is_banned = 0
        AND u.id NOT IN (
          SELECT blocked_id FROM connect_blocks WHERE blocker_id = ?
        )
        AND u.id NOT IN (
          SELECT blocker_id FROM connect_blocks WHERE blocked_id = ?
        )
        AND u.id NOT IN (
          SELECT receiver_id FROM connect_requests WHERE sender_id = ? AND status = 'pending'
        )
      ORDER BY RANDOM()
      LIMIT 50
    `).all(userId, userId, userId, userId);

    res.json(people);
  } catch (err) {
    console.error('getPeople Fehler:', err);
    res.status(500).json({ error: 'User laden fehlgeschlagen' });
  }
}

// Connect-Anfrage senden
function sendRequest(req, res) {
  try {
    const userId = req.user.id;
    const { receiverId, message } = req.body;

    if (receiverId === userId) {
      return res.status(400).json({ error: 'Kann keine Anfrage an sich selbst senden' });
    }

    // Tages-Limit prüfen (1 pro Tag gratis)
    const today = new Date().toISOString().split('T')[0];
    const maxPerDay = 1;

    const count = db.prepare(`
      SELECT COUNT(*) as c FROM connect_requests
      WHERE sender_id = ? AND date(created_at) = ?
    `).get(userId, today);

    if ((count?.c || 0) >= maxPerDay) {
      return res.status(403).json({ error: 'Connect-Anfrage Limit erreicht (1/Tag)', remaining: 0 });
    }

    // Prüfen ob blockiert
    const blocked = db.prepare(`
      SELECT 1 FROM connect_blocks
      WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)
    `).get(userId, receiverId, receiverId, userId);

    if (blocked) {
      return res.status(400).json({ error: 'Anfrage nicht möglich' });
    }

    // Prüfen ob schon eine Anfrage existiert
    const existing = db.prepare(`
      SELECT id, status FROM connect_requests
      WHERE sender_id = ? AND receiver_id = ?
    `).get(userId, receiverId);

    if (existing) {
      if (existing.status === 'pending') {
        return res.status(400).json({ error: 'Anfrage wurde bereits gesendet' });
      }
      if (existing.status === 'rejected') {
        return res.status(400).json({ error: 'Anfrage nicht möglich' });
      }
    }

    const id = uuid();
    db.prepare(`
      INSERT INTO connect_requests (id, sender_id, receiver_id, message, status)
      VALUES (?, ?, ?, ?, 'pending')
    `).run(id, userId, receiverId, message || null);

    res.json({ id, message: 'Connect-Anfrage gesendet!' });
  } catch (err) {
    console.error('sendRequest Fehler:', err);
    res.status(500).json({ error: 'Anfrage senden fehlgeschlagen' });
  }
}

// Connect-Status (verbleibende Anfragen heute)
function getConnectStatus(req, res) {
  try {
    const userId = req.user.id;
    const today = new Date().toISOString().split('T')[0];
    const maxPerDay = 1;

    const count = db.prepare(`
      SELECT COUNT(*) as c FROM connect_requests
      WHERE sender_id = ? AND date(created_at) = ?
    `).get(userId, today);

    const used = count?.c || 0;
    res.json({ used, remaining: Math.max(0, maxPerDay - used), max: maxPerDay });
  } catch (err) {
    console.error('getConnectStatus Fehler:', err);
    res.status(500).json({ error: 'Status laden fehlgeschlagen' });
  }
}

// Meine eingehenden Anfragen
function getRequests(req, res) {
  try {
    const userId = req.user.id;

    const requests = db.prepare(`
      SELECT cr.id, cr.sender_id, cr.message, cr.status, cr.created_at,
             p.display_name, p.photo_1, p.age, p.gender, p.bio, p.is_verified, p.rating
      FROM connect_requests cr
      JOIN profiles p ON p.user_id = cr.sender_id
      WHERE cr.receiver_id = ? AND cr.status = 'pending'
      ORDER BY cr.created_at DESC
    `).all(userId);

    res.json(requests);
  } catch (err) {
    console.error('getRequests Fehler:', err);
    res.status(500).json({ error: 'Anfragen laden fehlgeschlagen' });
  }
}

// Anfrage annehmen → Match erstellen
function acceptRequest(req, res) {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const request = db.prepare(`
      SELECT id, sender_id, receiver_id FROM connect_requests
      WHERE id = ? AND receiver_id = ? AND status = 'pending'
    `).get(id, userId);

    if (!request) {
      return res.status(404).json({ error: 'Anfrage nicht gefunden' });
    }

    db.transaction(() => {
      // Anfrage auf accepted setzen
      db.prepare("UPDATE connect_requests SET status = 'accepted' WHERE id = ?")
        .run(id);
    })();

    res.json({ message: 'Anfrage angenommen!' });
  } catch (err) {
    console.error('acceptRequest Fehler:', err);
    res.status(500).json({ error: 'Annahme fehlgeschlagen' });
  }
}

// Anfrage ablehnen → Block erstellen
function rejectRequest(req, res) {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const request = db.prepare(`
      SELECT id, sender_id, receiver_id FROM connect_requests
      WHERE id = ? AND receiver_id = ? AND status = 'pending'
    `).get(id, userId);

    if (!request) {
      return res.status(404).json({ error: 'Anfrage nicht gefunden' });
    }

    db.transaction(() => {
      // Anfrage auf rejected setzen
      db.prepare("UPDATE connect_requests SET status = 'rejected' WHERE id = ?")
        .run(id);

      // Block erstellen (permanent)
      db.prepare(`
        INSERT OR IGNORE INTO connect_blocks (id, blocker_id, blocked_id)
        VALUES (?, ?, ?)
      `).run(uuid(), userId, request.sender_id);
    })();

    res.json({ message: 'Anfrage abgelehnt' });
  } catch (err) {
    console.error('rejectRequest Fehler:', err);
    res.status(500).json({ error: 'Ablehnung fehlgeschlagen' });
  }
}

// Meine gesendeten Anfragen mit Status
function getSentRequests(req, res) {
  try {
    const userId = req.user.id;

    const sent = db.prepare(`
      SELECT cr.id, cr.receiver_id, cr.message, cr.status, cr.created_at,
             p.display_name, p.photo_1, p.age, p.gender, p.bio, p.is_verified, p.rating
      FROM connect_requests cr
      JOIN profiles p ON p.user_id = cr.receiver_id
      WHERE cr.sender_id = ?
      ORDER BY cr.created_at DESC
    `).all(userId);

    res.json(sent);
  } catch (err) {
    console.error('getSentRequests Fehler:', err);
    res.status(500).json({ error: 'Gesendete Anfragen laden fehlgeschlagen' });
  }
}

module.exports = { getPeople, sendRequest, getConnectStatus, getRequests, getSentRequests, acceptRequest, rejectRequest };
