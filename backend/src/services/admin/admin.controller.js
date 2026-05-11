const db = require('../../config/database');

function getStats(req, res) {
  try {
    const totalUsers = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
    const pendingUsers = db.prepare('SELECT COUNT(*) as c FROM users WHERE is_approved = 0').get().c;
    const bannedUsers = db.prepare('SELECT COUNT(*) as c FROM users WHERE is_banned = 1').get().c;
    const totalMatches = db.prepare('SELECT COUNT(*) as c FROM matches').get().c;
    const totalOffers = db.prepare('SELECT COUNT(*) as c FROM table_offers').get().c;
    const totalMessages = db.prepare('SELECT COUNT(*) as c FROM messages').get().c;

    res.json({ totalUsers, pendingUsers, bannedUsers, totalMatches, totalOffers, totalMessages });
  } catch (err) {
    console.error('Admin getStats error:', err);
    res.status(500).json({ error: 'Statistiken laden fehlgeschlagen' });
  }
}

function getUsers(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const filter = req.query.filter || 'all';

    let whereClause = '1=1';
    const params = [];

    if (search) {
      whereClause += ' AND (p.display_name LIKE ? OR u.phone LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (filter === 'pending') {
      whereClause += ' AND u.is_approved = 0';
    } else if (filter === 'banned') {
      whereClause += ' AND u.is_banned = 1';
    }

    const total = db.prepare(`
      SELECT COUNT(*) as c FROM users u
      LEFT JOIN profiles p ON p.user_id = u.id
      WHERE ${whereClause}
    `).get(...params).c;

    const users = db.prepare(`
      SELECT u.id, u.phone, u.is_active, u.is_banned, u.is_admin, u.is_approved, u.created_at, u.last_login,
             p.display_name, p.age, p.gender, p.photo_1, p.is_verified
      FROM users u
      LEFT JOIN profiles p ON p.user_id = u.id
      WHERE ${whereClause}
      ORDER BY u.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    res.json({
      users: users.map(u => ({
        id: u.id,
        phone: u.phone,
        displayName: u.display_name,
        age: u.age,
        gender: u.gender,
        photo: u.photo_1,
        isActive: !!u.is_active,
        isBanned: !!u.is_banned,
        isAdmin: !!u.is_admin,
        isApproved: !!u.is_approved,
        isVerified: !!u.is_verified,
        createdAt: u.created_at,
        lastLogin: u.last_login,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error('Admin getUsers error:', err);
    res.status(500).json({ error: 'User laden fehlgeschlagen' });
  }
}

function getUserDetail(req, res) {
  try {
    const { id } = req.params;

    const user = db.prepare(`
      SELECT u.id, u.phone, u.is_active, u.is_banned, u.ban_reason, u.is_admin, u.is_approved, u.created_at, u.last_login,
             p.display_name, p.bio, p.age, p.gender, p.photo_1, p.photo_2, p.photo_3, p.is_verified, p.rating, p.total_ratings
      FROM users u
      LEFT JOIN profiles p ON p.user_id = u.id
      WHERE u.id = ?
    `).get(id);

    if (!user) {
      return res.status(404).json({ error: 'User nicht gefunden' });
    }

    const matchCount = db.prepare('SELECT COUNT(*) as c FROM matches WHERE offerer_id = ? OR seeker_id = ?').get(id, id).c;
    const offerCount = db.prepare('SELECT COUNT(*) as c FROM table_offers WHERE user_id = ?').get(id).c;
    const messageCount = db.prepare('SELECT COUNT(*) as c FROM messages WHERE sender_id = ?').get(id).c;

    res.json({
      id: user.id,
      phone: user.phone,
      displayName: user.display_name,
      bio: user.bio,
      age: user.age,
      gender: user.gender,
      photos: [user.photo_1, user.photo_2, user.photo_3].filter(Boolean),
      isActive: !!user.is_active,
      isBanned: !!user.is_banned,
      banReason: user.ban_reason,
      isAdmin: !!user.is_admin,
      isApproved: !!user.is_approved,
      isVerified: !!user.is_verified,
      rating: user.rating,
      totalRatings: user.total_ratings,
      createdAt: user.created_at,
      lastLogin: user.last_login,
      matchCount,
      offerCount,
      messageCount,
    });
  } catch (err) {
    console.error('Admin getUserDetail error:', err);
    res.status(500).json({ error: 'User-Details laden fehlgeschlagen' });
  }
}

function updateUser(req, res) {
  try {
    const { id } = req.params;
    const { isBanned, isAdmin, isApproved, banReason } = req.body;

    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(id);
    if (!user) {
      return res.status(404).json({ error: 'User nicht gefunden' });
    }

    if (typeof isBanned === 'boolean') {
      db.prepare('UPDATE users SET is_banned = ?, ban_reason = ? WHERE id = ?').run(
        isBanned ? 1 : 0,
        isBanned ? (banReason || 'Vom Admin gesperrt') : null,
        id
      );
    }

    if (typeof isAdmin === 'boolean') {
      db.prepare('UPDATE users SET is_admin = ? WHERE id = ?').run(isAdmin ? 1 : 0, id);
    }

    if (typeof isApproved === 'boolean') {
      db.prepare('UPDATE users SET is_approved = ? WHERE id = ?').run(isApproved ? 1 : 0, id);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Admin updateUser error:', err);
    res.status(500).json({ error: 'User aktualisieren fehlgeschlagen' });
  }
}

function deleteUser(req, res) {
  try {
    const { id } = req.params;

    // Don't allow deleting yourself
    if (id === req.user.id) {
      return res.status(400).json({ error: 'Du kannst dich nicht selbst loeschen' });
    }

    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(id);
    if (!user) {
      return res.status(404).json({ error: 'User nicht gefunden' });
    }

    // CASCADE will handle profiles, matches, messages etc.
    db.prepare('DELETE FROM users WHERE id = ?').run(id);

    res.json({ success: true });
  } catch (err) {
    console.error('Admin deleteUser error:', err);
    res.status(500).json({ error: 'User loeschen fehlgeschlagen' });
  }
}

function approveUser(req, res) {
  try {
    const { id } = req.params;

    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(id);
    if (!user) {
      return res.status(404).json({ error: 'User nicht gefunden' });
    }

    db.prepare('UPDATE users SET is_approved = 1 WHERE id = ?').run(id);

    res.json({ success: true });
  } catch (err) {
    console.error('Admin approveUser error:', err);
    res.status(500).json({ error: 'Freischaltung fehlgeschlagen' });
  }
}

function getOffers(req, res) {
  try {
    const offers = db.prepare(`
      SELECT o.*, p.display_name, t.name as tent_name
      FROM table_offers o
      LEFT JOIN profiles p ON p.user_id = o.user_id
      LEFT JOIN tents t ON t.id = o.tent_id
      ORDER BY o.created_at DESC
      LIMIT 100
    `).all();

    res.json(offers.map(o => ({
      id: o.id,
      userId: o.user_id,
      displayName: o.display_name,
      tentName: o.tent_name,
      totalSeats: o.total_seats,
      availableSeats: o.available_seats,
      date: o.date,
      timeFrom: o.time_from,
      timeUntil: o.time_until,
      status: o.status,
      createdAt: o.created_at,
    })));
  } catch (err) {
    console.error('Admin getOffers error:', err);
    res.status(500).json({ error: 'Angebote laden fehlgeschlagen' });
  }
}

function getMatches(req, res) {
  try {
    const matches = db.prepare(`
      SELECT m.*,
             po.display_name as offerer_name,
             ps.display_name as seeker_name
      FROM matches m
      LEFT JOIN profiles po ON po.user_id = m.offerer_id
      LEFT JOIN profiles ps ON ps.user_id = m.seeker_id
      ORDER BY m.created_at DESC
      LIMIT 100
    `).all();

    res.json(matches.map(m => ({
      id: m.id,
      offererName: m.offerer_name,
      seekerName: m.seeker_name,
      status: m.status,
      seatsGranted: m.seats_granted,
      createdAt: m.created_at,
    })));
  } catch (err) {
    console.error('Admin getMatches error:', err);
    res.status(500).json({ error: 'Matches laden fehlgeschlagen' });
  }
}

function getMessages(req, res) {
  try {
    const messages = db.prepare(`
      SELECT msg.id, msg.content, msg.message_type, msg.created_at,
             p.display_name as sender_name
      FROM messages msg
      LEFT JOIN profiles p ON p.user_id = msg.sender_id
      ORDER BY msg.created_at DESC
      LIMIT 50
    `).all();

    res.json(messages.map(m => ({
      id: m.id,
      content: m.content,
      type: m.message_type,
      senderName: m.sender_name,
      createdAt: m.created_at,
    })));
  } catch (err) {
    console.error('Admin getMessages error:', err);
    res.status(500).json({ error: 'Nachrichten laden fehlgeschlagen' });
  }
}

// ── Event Management ────────────────────────────────────────────────────────

function getEvents(req, res) {
  try {
    const events = db.prepare('SELECT * FROM upcoming_events ORDER BY sort_order, name').all();
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: 'Events laden fehlgeschlagen' });
  }
}

function createEvent(req, res) {
  try {
    const { name, city, state, date_text, emoji, event_type, estimated_visitors, sort_order } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Name erforderlich' });

    const BASE = { table: { soft: 75, hard: 150 }, street: { soft: 50, hard: 100 }, camping: { soft: 100, hard: 200 }, mixed: { soft: 75, hard: 150 } };
    const base = BASE[event_type] || BASE.mixed;

    const result = db.prepare(`
      INSERT INTO upcoming_events (name, city, state, date_text, emoji, event_type, estimated_visitors, sort_order, threshold_soft, threshold_hard)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(name.trim(), city?.trim() || null, state?.trim() || null, date_text?.trim() || null,
           emoji?.trim() || '🎉', event_type || 'mixed', estimated_visitors?.trim() || null,
           sort_order ?? 999, base.soft, base.hard);

    const event = db.prepare('SELECT * FROM upcoming_events WHERE id = ?').get(result.lastInsertRowid);
    res.json(event);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Event anlegen fehlgeschlagen' });
  }
}

function updateEvent(req, res) {
  try {
    const { id } = req.params;
    const { name, city, state, date_text, emoji, event_type, estimated_visitors, sort_order, is_tracker_active } = req.body;

    const event = db.prepare('SELECT * FROM upcoming_events WHERE id = ?').get(id);
    if (!event) return res.status(404).json({ error: 'Event nicht gefunden' });

    const fields = [];
    const vals = [];
    if (name !== undefined) { fields.push('name = ?'); vals.push(name.trim()); }
    if (city !== undefined) { fields.push('city = ?'); vals.push(city.trim() || null); }
    if (state !== undefined) { fields.push('state = ?'); vals.push(state.trim() || null); }
    if (date_text !== undefined) { fields.push('date_text = ?'); vals.push(date_text.trim() || null); }
    if (emoji !== undefined) { fields.push('emoji = ?'); vals.push(emoji.trim() || '🎉'); }
    if (event_type !== undefined) {
      const BASE = { table: { soft: 75, hard: 150 }, street: { soft: 50, hard: 100 }, camping: { soft: 100, hard: 200 }, mixed: { soft: 75, hard: 150 } };
      const base = BASE[event_type] || BASE.mixed;
      fields.push('event_type = ?', 'threshold_soft = ?', 'threshold_hard = ?');
      vals.push(event_type, base.soft, base.hard);
    }
    if (estimated_visitors !== undefined) { fields.push('estimated_visitors = ?'); vals.push(estimated_visitors.trim() || null); }
    if (sort_order !== undefined) { fields.push('sort_order = ?'); vals.push(Number(sort_order)); }
    if (is_tracker_active !== undefined) { fields.push('is_tracker_active = ?'); vals.push(is_tracker_active ? 1 : 0); }
    if (req.body.tagline !== undefined) { fields.push('tagline = ?'); vals.push(req.body.tagline || null); }

    if (fields.length === 0) return res.json({ success: true });

    db.prepare(`UPDATE upcoming_events SET ${fields.join(', ')} WHERE id = ?`).run(...vals, id);
    res.json(db.prepare('SELECT * FROM upcoming_events WHERE id = ?').get(id));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Event aktualisieren fehlgeschlagen' });
  }
}

function deleteEvent(req, res) {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM upcoming_events WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Event löschen fehlgeschlagen' });
  }
}

async function generateTagline(req, res) {
  const { name, city, event_type, table } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Name erforderlich' });

  const GEMINI_KEY = process.env.GEMINI_KEY;
  if (!GEMINI_KEY) return res.status(500).json({ error: 'Kein Gemini API Key konfiguriert' });

  const TYPE_CONTEXT = {
    table:   'ein Volksfest mit Bierzelten und Tischen (Oktoberfest-Stil)',
    street:  'ein Straßenfest oder Karneval mit Umzügen und Straßenpartys',
    camping: 'ein Musikfestival mit Campingbereich',
    mixed:   'ein großes Stadtfest oder gemischtes Event',
  };

  const prompt = `Du bist ein kreativer Texter für die App "SaiHello", die Menschen dabei hilft, Plätze bei Events zu finden und zu teilen.

Schreibe einen kurzen, einladenden Satz (max. 8 Wörter) für die Startseite der App, der Nutzer animiert, beim folgenden Event mitzumachen:

Event: "${name.trim()}"${city ? ` in ${city.trim()}` : ''}
Typ: ${TYPE_CONTEXT[event_type] || TYPE_CONTEXT.mixed}

Regeln:
- Kein Ausrufezeichen
- Keine Anführungszeichen
- Kein Emoji
- Deutsch, einladend, kurz
- Darf den Event-Namen enthalten
- Beispiel-Stil: "Finde deinen Platz beim Oktoberfest" oder "Sei dabei beim Hamburger Dom"

Antworte NUR mit dem Satz, nichts anderes.`;

  const https = require('https');
  const body = JSON.stringify({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: 64, temperature: 0.8 }
  });

  try {
    const tagline = await new Promise((resolve, reject) => {
      const req2 = https.request({
        hostname: 'generativelanguage.googleapis.com',
        path: `/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      }, (r) => {
        const chunks = [];
        r.on('data', c => chunks.push(c));
        r.on('end', () => {
          try {
            const data = JSON.parse(Buffer.concat(chunks).toString());
            const parts = data.candidates?.[0]?.content?.parts || [];
            let text = '';
            for (const p of parts) { if (p.text && !p.thought) text = p.text; }
            resolve(text.trim().replace(/^["']|["']$/g, ''));
          } catch (e) { reject(e); }
        });
      });
      req2.on('error', reject);
      req2.write(body);
      req2.end();
    });

    // Persist immediately if table + id given
    if (table && req.body.id) {
      const tbl = table === 'tracker' ? 'tracker_events' : 'upcoming_events';
      db.prepare(`UPDATE ${tbl} SET tagline = ? WHERE id = ?`).run(tagline, req.body.id);
    }

    res.json({ tagline });
  } catch (err) {
    console.error('Tagline error:', err);
    res.status(500).json({ error: 'Tagline-Generierung fehlgeschlagen' });
  }
}

async function classifyEvent(req, res) {
  const { name, city } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Name erforderlich' });

  const GEMINI_KEY = process.env.GEMINI_KEY;
  if (!GEMINI_KEY) return res.status(500).json({ error: 'Kein Gemini API Key konfiguriert' });

  const prompt = `Du bist ein Event-Klassifizierungs-Assistent.

Klassifiziere das folgende Event in genau eine der vier Kategorien:
- "table": Volksfest, Bierzelt-Event, Rummel mit festen Tischen/Zelten (z.B. Oktoberfest, Cannstatter Volksfest)
- "street": Straßenfest, Karneval, Parade, Rosenmontagszug, CSD, Stadtfest ohne Zelte
- "camping": Musikfestival mit Campingbereich (z.B. Rock am Ring, Wacken, Hurricane)
- "mixed": Mischform — Stadtfeste, Hafengeburtstag, Seefeste, Events die nicht klar in die anderen passen

Event: "${name.trim()}"${city ? ` in ${city.trim()}` : ''}

Antworte NUR mit einem JSON-Objekt, keine Erklärung:
{"event_type": "table"|"street"|"camping"|"mixed", "confidence": "high"|"medium"|"low", "reason": "kurze Begründung auf Deutsch"}`;

  const https = require('https');
  const body = JSON.stringify({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: 128, temperature: 0.1, thinkingConfig: { thinkingBudget: 0 } }
  });

  try {
    const result = await new Promise((resolve, reject) => {
      const req2 = https.request({
        hostname: 'generativelanguage.googleapis.com',
        path: `/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      }, (r) => {
        const chunks = [];
        r.on('data', c => chunks.push(c));
        r.on('end', () => {
          try {
            const data = JSON.parse(Buffer.concat(chunks).toString());
            const parts = data.candidates?.[0]?.content?.parts || [];
            let text = '';
            for (const p of parts) { if (p.text && !p.thought) text = p.text; }
            const match = text.match(/\{[\s\S]*\}/);
            if (!match) throw new Error('No JSON in response');
            resolve(JSON.parse(match[0]));
          } catch (e) { reject(e); }
        });
      });
      req2.on('error', reject);
      req2.write(body);
      req2.end();
    });
    res.json(result);
  } catch (err) {
    console.error('Classify error:', err);
    res.status(500).json({ error: 'Klassifizierung fehlgeschlagen' });
  }
}

module.exports = {
  getStats,
  getUsers,
  getUserDetail,
  updateUser,
  deleteUser,
  approveUser,
  getOffers,
  getMatches,
  getMessages,
  getEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  classifyEvent,
};
