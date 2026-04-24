const express = require('express');
const multer = require('multer');
const path = require('path');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const { authMiddleware } = require('../../middleware/auth');
const db = require('../../config/database');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Nur Bilder erlaubt (JPEG, PNG, WebP, GIF)'));
    }
  },
});

const audioUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/x-m4a'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Nur Audio-Dateien erlaubt'));
    }
  },
});

// Profilbild hochladen
router.post('/profile-photo', authMiddleware, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Kein Bild hochgeladen' });
    }

    const filename = `profile_${uuidv4()}.webp`;
    const filepath = path.join(process.env.UPLOAD_DIR || path.join(__dirname, '../../../uploads'), filename);

    // Bild optimieren: Resize + WebP
    await sharp(req.file.buffer)
      .rotate() // EXIF-Rotation automatisch anwenden
      .resize(800, 800, { fit: 'cover', position: 'center' })
      .webp({ quality: 85 })
      .toFile(filepath);

    const photoUrl = `/uploads/${filename}`;

    // In welchen Slot speichern?
    const slot = parseInt(req.body.slot) || 1;
    if (slot < 1 || slot > 6) {
      return res.status(400).json({ error: 'Foto-Slot 1-6' });
    }

    db.prepare(`UPDATE profiles SET photo_${slot} = ? WHERE user_id = ?`)
      .run(photoUrl, req.user.id);

    res.json({ url: photoUrl, slot });
  } catch (err) {
    console.error('Upload Fehler:', err);
    res.status(500).json({ error: 'Upload fehlgeschlagen' });
  }
});

// Tisch-/Gruppenfoto hochladen
router.post('/table-photo', authMiddleware, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Kein Bild hochgeladen' });
    }

    const filename = `table_${uuidv4()}.webp`;
    const filepath = path.join(process.env.UPLOAD_DIR || path.join(__dirname, '../../../uploads'), filename);

    await sharp(req.file.buffer)
      .rotate() // EXIF-Rotation automatisch anwenden
      .resize(1200, 800, { fit: 'cover' })
      .webp({ quality: 85 })
      .toFile(filepath);

    const photoUrl = `/uploads/${filename}`;
    res.json({ url: photoUrl });
  } catch (err) {
    console.error('Upload Fehler:', err);
    res.status(500).json({ error: 'Upload fehlgeschlagen' });
  }
});

// Audio-Nachricht hochladen
router.post('/audio', authMiddleware, audioUpload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Keine Audio-Datei hochgeladen' });
    }

    const ext = req.file.mimetype === 'audio/webm' ? 'webm' :
                req.file.mimetype === 'audio/ogg' ? 'ogg' :
                req.file.mimetype === 'audio/mp4' ? 'mp4' :
                req.file.mimetype === 'audio/mpeg' ? 'mp3' :
                req.file.mimetype === 'audio/wav' ? 'wav' :
                req.file.mimetype === 'audio/x-m4a' ? 'm4a' : 'webm';

    const filename = `audio_${uuidv4()}.${ext}`;
    const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '../../../uploads');

    // Sicherstellen dass Upload-Dir existiert
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filepath = path.join(uploadDir, filename);

    // Audio direkt speichern (keine Konvertierung nötig)
    fs.writeFileSync(filepath, req.file.buffer);

    const audioUrl = `/uploads/${filename}`;
    res.json({ url: audioUrl });
  } catch (err) {
    console.error('Audio Upload Fehler:', err);
    res.status(500).json({ error: 'Audio Upload fehlgeschlagen' });
  }
});

module.exports = router;
