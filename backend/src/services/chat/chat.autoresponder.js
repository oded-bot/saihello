const https = require('https');
const { v4: uuid } = require('uuid');
const db = require('../../config/database');

const GEMINI_KEY = process.env.GEMINI_KEY;

// Fake-Accounts die automatisch antworten
const FAKE_PHONES = [
  'anna01','max02','sarah03','felix04','lisa05',
  'tom06','julia07','chris08','nina09','david10',
  'lena11','marco12','sophie13','kevin14','mia15',
  'jan16','clara17','alex18','hanna19','paul20',
];

const PERSONALITIES = {
  anna01: 'Du bist Anna, 26, aus München. Du bist mit 3 Freundinnen auf der Wiesn, mega Stimmung. Ihr feiert gerne und sucht lustige Gesellschaft. Locker, witzig, bayerisch.',
  max02: 'Du bist Max, 29, Stammtisch-Chef. Du und deine 6 Jungs feiern jedes Jahr Wiesn. Ihr seid laut, lustig und trinkt viel. Sucht hübsche Frauen für den Tisch.',
  sarah03: 'Du bist Sarah, 24, feiert mit einer gemischten Gruppe im Hacker-Zelt. Freundlich, offen, mag neue Leute kennenlernen.',
  felix04: 'Du bist Felix, 31, Firmenfeier im Hofbräu. Locker-professionell, Bier geht auf die Firma. Sucht nette Leute die dazupassen.',
  lisa05: 'Du bist Lisa Marie, 27, Dirndl-Queen. Im exklusiven Käfer-Zelt mit 3 Freundinnen. Etwas glamourös aber herzlich.',
  tom06: 'Du bist Tom, 33, die lauteste Truppe im Schottenhamel. Schunkel-Profis! Mega Party-Stimmung, jeder ist willkommen der mithält.',
  julia07: 'Du bist Julia, 25, Party-Girl im Löwenbräu. Tanzfreudig, feiert gerne, sucht Leute die genauso drauf sind.',
  chris08: 'Du bist Chris, 28, hier mit deiner Freundin Marie. Fast ganzer Tisch frei im Marstall, sucht nette Runde.',
  nina09: 'Du bist Nina, 23, JGA (Junggesellinnenabschied) im Weinzelt. 7 Mädls, verrückte Stimmung, sucht mutige Jungs.',
  david10: 'Du bist David, 35, VIP-Insider im Käfer. Gepflegt, eloquent, Gentleman. Exklusiver Tisch, sucht stilvolle Gesellschaft.',
  lena11: 'Du bist Lena, 22, erste Wiesn überhaupt! Total aufgeregt, sucht Anschluss. Süß, neugierig, etwas schüchtern.',
  marco12: 'Du bist Marco, 27, Italiener. Erste Oktoberfest, findest alles crazy und amazing. Spricht deutsch mit leichtem Akzent.',
  sophie13: 'Du bist Sophie, 24, mit deiner besten Freundin Emma aus Hamburg. Ihr sucht verzweifelt einen Tisch und seid für alles offen.',
  kevin14: 'Du bist Kevin, 30, allein auf der Wiesn. Deine Kumpels haben abgesagt. Locker, humorvoll, sucht Anschluss.',
  mia15: 'Du bist Mia, 26, Münchnerin. Dirndl steht, Stimmung top, aber kein Tisch. Selbstbewusst, charmant, flirty.',
  jan16: 'Du bist Jan, 25, mit deinem Kumpel Niklas aus Berlin. Erste Wiesn, mega begeistert. Berliner Schnauze trifft Bayern.',
  clara17: 'Du bist Clara, 28, Münchnerin die jedes Jahr Wiesn feiert aber nie einen Tisch bekommt. Kennt sich super aus.',
  alex18: 'Du bist Alex, 32, sportlich, sucht gemütliche Runde. Unkompliziert, trinkt gern ein Maß, redet mit jedem.',
  hanna19: 'Du bist Hanna, 23, mit 2 Studienfreundinnen. Jung, wild, wollen feiern. Suchen einen Tisch wo was geht.',
  paul20: 'Du bist Paul, 29, Australier. First Oktoberfest ever! Findet ALLES amazing. Spricht deutsch mit australischem Einschlag, mischt englische Wörter rein.',
};

function isFakeUser(userId) {
  const user = db.prepare('SELECT phone FROM users WHERE id = ?').get(userId);
  return user && FAKE_PHONES.includes(user.phone);
}

function getFakePhone(userId) {
  const user = db.prepare('SELECT phone FROM users WHERE id = ?').get(userId);
  return user?.phone;
}

async function generateReply(personality, chatHistory, incomingMessage) {
  const systemPrompt = `${personality}

Du chattest auf der "Servus Wiesn" App. Antworte kurz und natürlich wie in einem WhatsApp-Chat. 1-3 Sätze max. Sei freundlich, locker und in Stimmung. Schreib auf Deutsch. Kein Emoji-Overkill, aber ab und zu eins ist okay.`;

  const messages = chatHistory.map(m => ({
    role: m.is_bot ? 'model' : 'user',
    parts: [{ text: m.content }]
  }));
  messages.push({ role: 'user', parts: [{ text: incomingMessage }] });

  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: messages,
      generationConfig: { maxOutputTokens: 256, temperature: 0.9, thinkingConfig: { thinkingBudget: 0 } }
    });

    const req = https.request({
      hostname: 'generativelanguage.googleapis.com',
      path: `/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    }, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        try {
          const data = JSON.parse(Buffer.concat(chunks).toString());
          // Gemini 2.5 hat manchmal "thinking" parts — den letzten Text-Part nehmen
          const parts = data.candidates?.[0]?.content?.parts || [];
          let text = '';
          for (const p of parts) {
            if (p.text && !p.thought) text = p.text;
          }
          resolve(text.trim() || 'Hey, bin grad busy auf der Wiesn! 🍺');
        } catch(e) {
          resolve('Sorry, schlechter Empfang im Zelt! Schreib nochmal 😄');
        }
      });
    });
    req.on('error', () => resolve('Bin grad offline, meld mich gleich!'));
    req.write(body);
    req.end();
  });
}

async function handleAutoReply(matchId, senderUserId) {
  try {
    // Finde den Match und den "anderen" User
    const match = db.prepare(
      'SELECT offerer_id, seeker_id FROM matches WHERE id = ?'
    ).get(matchId);
    if (!match) return;

    const recipientId = match.offerer_id === senderUserId ? match.seeker_id : match.offerer_id;

    // Ist der Empfänger ein Fake-Account?
    if (!isFakeUser(recipientId)) return;

    const fakePhone = getFakePhone(recipientId);
    const personality = PERSONALITIES[fakePhone];
    if (!personality) return;

    // Chat-History laden (letzte 10 Nachrichten)
    const history = db.prepare(`
      SELECT content, sender_id, message_type FROM messages
      WHERE match_id = ? AND message_type = 'text'
      ORDER BY created_at DESC LIMIT 10
    `).all(matchId).reverse();

    const chatHistory = history.map(m => ({
      content: m.content,
      is_bot: m.sender_id === recipientId,
    }));

    // Letzte Nachricht des Users
    const lastMsg = history[history.length - 1];
    if (!lastMsg || lastMsg.sender_id === recipientId) return; // Nicht auf eigene Nachrichten antworten

    // KI-Antwort generieren
    const reply = await generateReply(personality, chatHistory.slice(0, -1), lastMsg.content);

    // Antwort speichern (mit kurzer Verzögerung für Realismus)
    setTimeout(() => {
      const msgId = uuid();
      db.prepare(`
        INSERT INTO messages (id, match_id, sender_id, content, message_type)
        VALUES (?, ?, ?, ?, 'text')
      `).run(msgId, matchId, recipientId, reply);
    }, 2000 + Math.random() * 3000); // 2-5 Sekunden Verzögerung

  } catch (err) {
    console.error('AutoReply Fehler:', err);
  }
}

module.exports = { handleAutoReply, isFakeUser };
