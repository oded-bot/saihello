const bcrypt = require('bcryptjs');
const { v4: uuid } = require('uuid');
const db = require('../../config/database');
const { generateToken } = require('../../middleware/auth');
const { sendVerificationEmail } = require('../email/email.service');

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function register(req, res) {
  try {
    const { username, password, email, displayName, age, gender, bio } = req.body;

    const existingUsername = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existingUsername) {
      return res.status(409).json({ error: 'Dieser Benutzername ist bereits vergeben' });
    }

    const existingEmail = db.prepare('SELECT id, email_verified FROM users WHERE email = ?').get(email);
    if (existingEmail) {
      if (!existingEmail.email_verified) {
        db.prepare('DELETE FROM users WHERE email = ? AND email_verified = 0').run(email);
      } else {
        return res.status(409).json({ error: 'Diese E-Mail-Adresse ist bereits registriert' });
      }
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const userId = uuid();
    const profileId = uuid();

    const code = generateCode();
    const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const insertUser = db.prepare(
      'INSERT INTO users (id, username, email, password_hash, is_approved, verification_code, verification_expires, email_verified) VALUES (?, ?, ?, ?, 0, ?, ?, 0)'
    );
    const insertProfile = db.prepare(
      'INSERT INTO profiles (id, user_id, display_name, age, gender, bio) VALUES (?, ?, ?, ?, ?, ?)'
    );

    const transaction = db.transaction(() => {
      insertUser.run(userId, username, email, passwordHash, code, expires);
      insertProfile.run(profileId, userId, displayName, age, gender, bio || null);
    });
    transaction();

    try {
      await sendVerificationEmail(email, code);
    } catch (emailErr) {
      console.error('E-Mail senden fehlgeschlagen:', emailErr);
    }

    res.status(201).json({
      success: true,
      pendingVerification: true,
      message: 'Bestätigungscode an deine E-Mail gesendet',
    });
  } catch (err) {
    console.error('Register Fehler:', err);
    res.status(500).json({ error: 'Registrierung fehlgeschlagen' });
  }
}

async function login(req, res) {
  try {
    const { username, password } = req.body;

    const user = db.prepare(`
      SELECT u.id, u.username, u.password_hash, u.is_banned, u.ban_reason, u.is_admin, u.is_approved, u.email_verified,
             p.display_name, p.age, p.gender, p.photo_1, p.is_verified, p.rating
      FROM users u
      LEFT JOIN profiles p ON p.user_id = u.id
      WHERE u.username = ? AND u.is_active = 1
    `).get(username);

    if (!user) {
      return res.status(401).json({ error: 'Benutzername oder Passwort falsch' });
    }

    if (user.is_banned) {
      return res.status(403).json({ error: 'Account gesperrt', reason: user.ban_reason });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Benutzername oder Passwort falsch' });
    }

    if (!user.email_verified) {
      return res.status(403).json({ error: 'Bitte bestätige zuerst deine E-Mail', code: 'EMAIL_NOT_VERIFIED', username: user.username });
    }

    if (!user.is_approved) {
      return res.status(403).json({ error: 'Dein Account wartet auf Freischaltung' });
    }

    db.prepare("UPDATE users SET last_login = datetime('now') WHERE id = ?").run(user.id);

    const token = generateToken(user.id);
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        age: user.age,
        gender: user.gender,
        photo: user.photo_1,
        isVerified: !!user.is_verified,
        isAdmin: !!user.is_admin,
        rating: user.rating || 0,
      },
    });
  } catch (err) {
    console.error('Login Fehler:', err);
    res.status(500).json({ error: 'Login fehlgeschlagen' });
  }
}

async function getMe(req, res) {
  try {
    const u = db.prepare(`
      SELECT u.id, u.username, u.created_at, u.is_admin, u.is_approved,
             p.display_name, p.bio, p.age, p.gender,
             p.photo_1, p.photo_2, p.photo_3, p.photo_4, p.photo_5, p.photo_6,
             p.is_verified, p.rating, p.total_ratings, p.emoji
      FROM users u
      LEFT JOIN profiles p ON p.user_id = u.id
      WHERE u.id = ?
    `).get(req.user.id);

    if (!u) {
      return res.status(404).json({ error: 'User nicht gefunden' });
    }

    res.json({
      id: u.id,
      username: u.username,
      displayName: u.display_name,
      bio: u.bio,
      age: u.age,
      gender: u.gender,
      photos: [u.photo_1, u.photo_2, u.photo_3, u.photo_4, u.photo_5, u.photo_6].filter(Boolean),
      isVerified: !!u.is_verified,
      isAdmin: !!u.is_admin,
      isApproved: !!u.is_approved,
      rating: u.rating || 0,
      totalRatings: u.total_ratings,
      emoji: u.emoji || null,
      createdAt: u.created_at,
    });
  } catch (err) {
    console.error('GetMe Fehler:', err);
    res.status(500).json({ error: 'Profil laden fehlgeschlagen' });
  }
}

async function verifyEmail(req, res) {
  try {
    const { username, code } = req.body;

    const user = db.prepare(
      'SELECT id, verification_code, verification_expires, email_verified FROM users WHERE username = ?'
    ).get(username);

    if (!user) {
      return res.status(404).json({ error: 'User nicht gefunden' });
    }

    if (user.email_verified) {
      return res.status(400).json({ error: 'E-Mail bereits verifiziert' });
    }

    if (!user.verification_code || !user.verification_expires) {
      return res.status(400).json({ error: 'Kein Bestätigungscode vorhanden. Fordere einen neuen an.' });
    }

    if (new Date() > new Date(user.verification_expires)) {
      return res.status(400).json({ error: 'Code abgelaufen. Fordere einen neuen an.' });
    }

    if (user.verification_code !== code) {
      return res.status(400).json({ error: 'Falscher Code' });
    }

    db.prepare(
      "UPDATE users SET email_verified = 1, verification_code = NULL, verification_expires = NULL, updated_at = datetime('now') WHERE id = ?"
    ).run(user.id);

    res.json({
      success: true,
      message: 'E-Mail verifiziert. Dein Account wartet auf Freischaltung.',
    });
  } catch (err) {
    console.error('VerifyEmail Fehler:', err);
    res.status(500).json({ error: 'Verifizierung fehlgeschlagen' });
  }
}

async function resendCode(req, res) {
  try {
    const { username } = req.body;

    const user = db.prepare(
      'SELECT id, email, email_verified, resend_count, resend_window_start FROM users WHERE username = ?'
    ).get(username);

    if (!user) {
      return res.status(404).json({ error: 'User nicht gefunden' });
    }

    if (user.email_verified) {
      return res.status(400).json({ error: 'E-Mail bereits verifiziert' });
    }

    if (!user.email) {
      return res.status(400).json({ error: 'Keine E-Mail hinterlegt' });
    }

    const now = new Date();
    const windowStart = user.resend_window_start ? new Date(user.resend_window_start) : null;
    let count = user.resend_count || 0;

    if (windowStart && (now - windowStart) < 60 * 60 * 1000) {
      if (count >= 3) {
        return res.status(429).json({ error: 'Zu viele Versuche. Bitte warte eine Stunde.' });
      }
      count++;
    } else {
      count = 1;
    }

    const code = generateCode();
    const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const windowStartValue = count === 1 ? new Date().toISOString() : user.resend_window_start;
    db.prepare(
      "UPDATE users SET verification_code = ?, verification_expires = ?, resend_count = ?, resend_window_start = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(code, expires, count, windowStartValue, user.id);

    try {
      await sendVerificationEmail(user.email, code);
    } catch (emailErr) {
      console.error('Resend E-Mail Fehler:', emailErr);
      return res.status(500).json({ error: 'E-Mail senden fehlgeschlagen' });
    }

    res.json({ success: true, message: 'Neuer Code gesendet' });
  } catch (err) {
    console.error('ResendCode Fehler:', err);
    res.status(500).json({ error: 'Code erneut senden fehlgeschlagen' });
  }
}

module.exports = { register, login, getMe, verifyEmail, resendCode };
