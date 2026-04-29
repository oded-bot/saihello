const { v4: uuid } = require('uuid');
const db = require('../../config/database');

const REACTION_TYPES = ['thumbs_up', 'laughing', 'super_drauf', 'gute_unterhaltung'];

function getFeed(req, res) {
  try {
    const userId = req.user.id;
    const videos = db.prepare(`
      SELECT v.id, v.video_url, v.caption, v.created_at,
             p.display_name, p.photo_1 as uploader_photo, p.emoji as uploader_emoji,
             (SELECT COUNT(*) FROM life_feed_reactions WHERE video_id = v.id AND reaction_type = 'thumbs_up') as count_thumbs_up,
             (SELECT COUNT(*) FROM life_feed_reactions WHERE video_id = v.id AND reaction_type = 'laughing') as count_laughing,
             (SELECT COUNT(*) FROM life_feed_reactions WHERE video_id = v.id AND reaction_type = 'super_drauf') as count_super_drauf,
             (SELECT COUNT(*) FROM life_feed_reactions WHERE video_id = v.id AND reaction_type = 'gute_unterhaltung') as count_gute_unterhaltung
      FROM life_feed_videos v
      JOIN profiles p ON p.user_id = v.user_id
      WHERE NOT EXISTS (
        SELECT 1 FROM life_feed_reactions WHERE video_id = v.id AND user_id = ?
      )
      ORDER BY v.created_at DESC
    `).all(userId);

    res.json(videos);
  } catch (err) {
    console.error('getFeed Fehler:', err);
    res.status(500).json({ error: 'Feed laden fehlgeschlagen' });
  }
}

function uploadVideo(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Keine Videodatei hochgeladen' });
    }
    const videoId = uuid();
    const videoUrl = `/uploads/${req.file.filename}`;
    const caption = req.body.caption || null;

    db.prepare(
      'INSERT INTO life_feed_videos (id, user_id, video_url, caption) VALUES (?, ?, ?, ?)'
    ).run(videoId, req.user.id, videoUrl, caption);

    res.status(201).json({ success: true, videoId, videoUrl });
  } catch (err) {
    console.error('uploadVideo Fehler:', err);
    res.status(500).json({ error: 'Video-Upload fehlgeschlagen' });
  }
}

function reactToVideo(req, res) {
  try {
    const { videoId } = req.params;
    const { reaction } = req.body;
    const userId = req.user.id;

    if (!REACTION_TYPES.includes(reaction)) {
      return res.status(400).json({ error: 'Ungültige Reaktion' });
    }

    const video = db.prepare('SELECT id FROM life_feed_videos WHERE id = ?').get(videoId);
    if (!video) return res.status(404).json({ error: 'Video nicht gefunden' });

    const existing = db.prepare('SELECT reaction_type FROM life_feed_reactions WHERE video_id = ? AND user_id = ?').get(videoId, userId);

    if (existing) {
      return res.status(409).json({ error: 'Du hast bereits auf dieses Video reagiert' });
    }

    db.prepare('INSERT INTO life_feed_reactions (id, video_id, user_id, reaction_type) VALUES (?, ?, ?, ?)').run(uuid(), videoId, userId, reaction);

    res.json({ success: true });
  } catch (err) {
    console.error('reactToVideo Fehler:', err);
    res.status(500).json({ error: 'Reaktion fehlgeschlagen' });
  }
}

function deleteVideo(req, res) {
  try {
    const { videoId } = req.params;
    const video = db.prepare('SELECT user_id FROM life_feed_videos WHERE id = ?').get(videoId);
    if (!video) return res.status(404).json({ error: 'Video nicht gefunden' });
    if (video.user_id !== req.user.id) return res.status(403).json({ error: 'Nicht berechtigt' });
    db.prepare('DELETE FROM life_feed_videos WHERE id = ?').run(videoId);
    res.json({ success: true });
  } catch (err) {
    console.error('deleteVideo Fehler:', err);
    res.status(500).json({ error: 'Löschen fehlgeschlagen' });
  }
}

module.exports = { getFeed, uploadVideo, reactToVideo, deleteVideo };
