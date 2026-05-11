const https = require('https');
const db = require('../../config/database');
const { sendMail } = require('../email/email.service');

const ADMIN_EMAIL = 'oded.schein@schein-legal.com';
const ADMIN_PANEL_URL = process.env.APP_URL || 'https://saihello.de';

// ── Gemini web-search call ────────────────────────────────────────────────────
async function geminiVerifyEvent(rawName, rawCity, rawDate, rawNotes, existingNames) {
  const GEMINI_KEY = process.env.GEMINI_KEY;
  if (!GEMINI_KEY) throw new Error('Kein Gemini Key');

  const existingList = existingNames.slice(0, 80).join(', ');

  const prompt = `Du bist ein Event-Verifikations-Assistent für die App "SaiHello".

Ein Nutzer hat folgende Veranstaltung vorgeschlagen (Angaben können unvollständig oder mit Tippfehlern sein):
- Name: "${rawName}"
${rawCity ? `- Stadt: "${rawCity}"` : ''}
${rawDate ? `- Datum/Zeitraum: "${rawDate}"` : ''}
${rawNotes ? `- Zusatzinfo: "${rawNotes}"` : ''}

Bereits in unserer Datenbank (Auswahl): ${existingList}

Aufgaben:
1. Suche im Internet nach dieser Veranstaltung und verifiziere die Angaben
2. Prüfe ob die Veranstaltung bereits in der Datenbank ist (fuzzy match auf obige Liste)
3. Klassifiziere den Event-Typ: "table" (Volksfest/Bierzelt), "street" (Straßenfest/Karneval), "camping" (Musikfestival/Camping), "mixed" (Stadtfest/Sonstiges)
4. Schreibe eine kurze Tagline (max. 8 Wörter, Deutsch, kein Ausrufezeichen)

Antworte NUR mit einem JSON-Objekt:
{
  "found": true/false,
  "already_in_db": true/false,
  "confidence": "high"/"medium"/"low",
  "name": "korrekter offizieller Name",
  "city": "Stadt",
  "state": "Bundesland oder Land",
  "date_text": "Datumstexte z.B. 08.02.2027",
  "emoji": "passendes Emoji",
  "event_type": "table/street/camping/mixed",
  "estimated_visitors": "z.B. 1.000.000+",
  "tagline": "Kurze Ansprache",
  "reason": "Kurze Begründung auf Deutsch warum found true/false"
}`;

  const body = JSON.stringify({
    tools: [{ google_search: {} }],
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: 512, temperature: 0.1 }
  });

  return new Promise((resolve, reject) => {
    const req = https.request({
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
          const match = text.match(/\{[\s\S]*?\}/);
          resolve(match ? JSON.parse(match[0]) : null);
        } catch (e) { resolve(null); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ── Submit suggestion ─────────────────────────────────────────────────────────
async function submitSuggestion(req, res) {
  try {
    const { rawName, rawCity, rawDate, rawNotes } = req.body;
    if (!rawName?.trim()) return res.status(400).json({ error: 'Veranstaltungsname erforderlich' });

    const userId = req.user.id;

    // Save raw suggestion
    const insertResult = db.prepare(`
      INSERT INTO event_suggestions (user_id, raw_name, raw_city, raw_date, raw_notes, status)
      VALUES (?, ?, ?, ?, ?, 'pending_ai')
    `).run(userId, rawName.trim(), rawCity?.trim() || null, rawDate?.trim() || null, rawNotes?.trim() || null);

    const suggestionId = insertResult.lastInsertRowid;

    // Get existing event names for duplicate check
    const existingNames = db.prepare('SELECT name FROM upcoming_events ORDER BY sort_order').all().map(e => e.name);

    // Call Gemini with web search
    let aiResult = null;
    try {
      aiResult = await geminiVerifyEvent(rawName.trim(), rawCity?.trim(), rawDate?.trim(), rawNotes?.trim(), existingNames);
    } catch (e) {
      console.error('Gemini verify error:', e.message);
    }

    if (aiResult) {
      db.prepare(`
        UPDATE event_suggestions SET
          ai_name=?, ai_city=?, ai_state=?, ai_date_text=?, ai_emoji=?,
          ai_event_type=?, ai_estimated_visitors=?, ai_tagline=?,
          ai_confidence=?, ai_found=?, ai_already_in_db=?,
          status='pending_user_confirm'
        WHERE id=?
      `).run(
        aiResult.name || null, aiResult.city || null, aiResult.state || null,
        aiResult.date_text || null, aiResult.emoji || null,
        aiResult.event_type || 'mixed', aiResult.estimated_visitors || null,
        aiResult.tagline || null, aiResult.confidence || 'low',
        aiResult.found ? 1 : 0, aiResult.already_in_db ? 1 : 0,
        suggestionId
      );
    } else {
      db.prepare("UPDATE event_suggestions SET status='pending_user_confirm', ai_found=0 WHERE id=?").run(suggestionId);
    }

    const suggestion = db.prepare('SELECT * FROM event_suggestions WHERE id=?').get(suggestionId);
    res.json({ suggestion, aiResult });
  } catch (err) {
    console.error('submitSuggestion error:', err);
    res.status(500).json({ error: 'Vorschlag konnte nicht verarbeitet werden' });
  }
}

// ── User confirms AI result ───────────────────────────────────────────────────
async function confirmSuggestion(req, res) {
  try {
    const { id } = req.params;
    const suggestion = db.prepare('SELECT * FROM event_suggestions WHERE id=? AND user_id=?').get(id, req.user.id);
    if (!suggestion) return res.status(404).json({ error: 'Vorschlag nicht gefunden' });

    db.prepare("UPDATE event_suggestions SET status='user_confirmed' WHERE id=?").run(id);

    // Email to admin
    const eventName = suggestion.ai_name || suggestion.raw_name;
    const user = db.prepare('SELECT phone FROM users WHERE id=?').get(req.user.id);
    const profile = db.prepare('SELECT display_name FROM profiles WHERE user_id=?').get(req.user.id);

    const html = `
<div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px">
  <h2 style="color:#0d9488">Neuer Event-Vorschlag bestätigt</h2>
  <p>Nutzer <strong>${profile?.display_name || user?.phone || 'Unbekannt'}</strong> hat einen verifizierten Event-Vorschlag bestätigt:</p>
  <table style="width:100%;border-collapse:collapse;margin:16px 0">
    <tr><td style="padding:6px;color:#666">Name</td><td style="padding:6px;font-weight:bold">${suggestion.ai_name || suggestion.raw_name}</td></tr>
    <tr><td style="padding:6px;color:#666">Stadt</td><td style="padding:6px">${suggestion.ai_city || suggestion.raw_city || '—'}</td></tr>
    <tr><td style="padding:6px;color:#666">Datum</td><td style="padding:6px">${suggestion.ai_date_text || suggestion.raw_date || '—'}</td></tr>
    <tr><td style="padding:6px;color:#666">Typ</td><td style="padding:6px">${suggestion.ai_event_type || '—'}</td></tr>
    <tr><td style="padding:6px;color:#666">KI-Konfidenz</td><td style="padding:6px">${suggestion.ai_confidence || '—'}</td></tr>
    <tr><td style="padding:6px;color:#666">Tagline</td><td style="padding:6px">${suggestion.ai_tagline || '—'}</td></tr>
  </table>
  <a href="${ADMIN_PANEL_URL}/admin" style="display:inline-block;background:#0d9488;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">Im Admin-Panel öffnen →</a>
  <p style="color:#999;font-size:12px;margin-top:24px">SaiHello · Event-Vorschlag #${id}</p>
</div>`;

    await sendMail(ADMIN_EMAIL, `Event-Vorschlag: ${eventName}`, html).catch(e => console.error('Mail error:', e));

    res.json({ success: true });
  } catch (err) {
    console.error('confirmSuggestion error:', err);
    res.status(500).json({ error: 'Bestätigung fehlgeschlagen' });
  }
}

// ── User rejects AI result ────────────────────────────────────────────────────
async function rejectSuggestion(req, res) {
  try {
    const { id } = req.params;
    const { message } = req.body;
    const suggestion = db.prepare('SELECT * FROM event_suggestions WHERE id=? AND user_id=?').get(id, req.user.id);
    if (!suggestion) return res.status(404).json({ error: 'Vorschlag nicht gefunden' });

    db.prepare("UPDATE event_suggestions SET status='user_rejected', user_message=? WHERE id=?").run(message?.trim() || null, id);

    const user = db.prepare('SELECT phone FROM users WHERE id=?').get(req.user.id);
    const profile = db.prepare('SELECT display_name FROM profiles WHERE user_id=?').get(req.user.id);

    const html = `
<div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px">
  <h2 style="color:#f59e0b">Event-Vorschlag — KI-Ergebnis abgelehnt</h2>
  <p>Nutzer <strong>${profile?.display_name || user?.phone || 'Unbekannt'}</strong> hat einen Event vorgeschlagen, konnte das KI-Ergebnis aber nicht bestätigen:</p>
  <table style="width:100%;border-collapse:collapse;margin:16px 0">
    <tr><td style="padding:6px;color:#666">Ursprüngliche Angabe</td><td style="padding:6px;font-weight:bold">${suggestion.raw_name}${suggestion.raw_city ? `, ${suggestion.raw_city}` : ''}</td></tr>
    ${suggestion.raw_date ? `<tr><td style="padding:6px;color:#666">Datum</td><td style="padding:6px">${suggestion.raw_date}</td></tr>` : ''}
    ${suggestion.raw_notes ? `<tr><td style="padding:6px;color:#666">Notizen</td><td style="padding:6px">${suggestion.raw_notes}</td></tr>` : ''}
    ${suggestion.ai_name ? `<tr><td style="padding:6px;color:#666">KI hatte vorgeschlagen</td><td style="padding:6px">${suggestion.ai_name}</td></tr>` : ''}
  </table>
  ${message ? `<p><strong>Nachricht des Nutzers:</strong><br>${message}</p>` : '<p>Keine zusätzliche Nachricht.</p>'}
  <p style="color:#999;font-size:12px;margin-top:24px">SaiHello · Event-Vorschlag #${id} (unbekanntes Event)</p>
</div>`;

    await sendMail(ADMIN_EMAIL, `Unbekannter Event-Vorschlag: ${suggestion.raw_name}`, html).catch(e => console.error('Mail error:', e));

    res.json({ success: true });
  } catch (err) {
    console.error('rejectSuggestion error:', err);
    res.status(500).json({ error: 'Ablehnung fehlgeschlagen' });
  }
}

// ── Admin: list suggestions ───────────────────────────────────────────────────
function getSuggestions(req, res) {
  try {
    const suggestions = db.prepare(`
      SELECT s.*, p.display_name as user_name
      FROM event_suggestions s
      LEFT JOIN profiles p ON p.user_id = s.user_id
      ORDER BY s.created_at DESC
      LIMIT 100
    `).all();
    res.json(suggestions);
  } catch (err) {
    res.status(500).json({ error: 'Vorschläge laden fehlgeschlagen' });
  }
}

// ── Admin: accept → create event ──────────────────────────────────────────────
function acceptSuggestion(req, res) {
  try {
    const { id } = req.params;
    const suggestion = db.prepare('SELECT * FROM event_suggestions WHERE id=?').get(id);
    if (!suggestion) return res.status(404).json({ error: 'Vorschlag nicht gefunden' });

    const BASE = { table: { soft: 75, hard: 150 }, street: { soft: 50, hard: 100 }, camping: { soft: 100, hard: 200 }, mixed: { soft: 75, hard: 150 } };
    const type = suggestion.ai_event_type || 'mixed';
    const base = BASE[type] || BASE.mixed;

    db.prepare(`
      INSERT INTO upcoming_events (name, city, state, date_text, emoji, event_type, estimated_visitors, tagline, threshold_soft, threshold_hard)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      suggestion.ai_name || suggestion.raw_name,
      suggestion.ai_city || suggestion.raw_city || null,
      suggestion.ai_state || null,
      suggestion.ai_date_text || suggestion.raw_date || null,
      suggestion.ai_emoji || '🎉',
      type,
      suggestion.ai_estimated_visitors || null,
      suggestion.ai_tagline || null,
      base.soft, base.hard
    );

    db.prepare("UPDATE event_suggestions SET status='admin_accepted' WHERE id=?").run(id);
    res.json({ success: true });
  } catch (err) {
    console.error('acceptSuggestion error:', err);
    res.status(500).json({ error: 'Annehmen fehlgeschlagen' });
  }
}

// ── Admin: decline ────────────────────────────────────────────────────────────
function declineSuggestion(req, res) {
  try {
    const { id } = req.params;
    db.prepare("UPDATE event_suggestions SET status='admin_declined' WHERE id=?").run(id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Ablehnen fehlgeschlagen' });
  }
}

module.exports = { submitSuggestion, confirmSuggestion, rejectSuggestion, getSuggestions, acceptSuggestion, declineSuggestion };
