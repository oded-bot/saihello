const { v4: uuid } = require('uuid');
const db = require('../../config/database');

let io;
function setIo(ioInstance) { io = ioInstance; }

function getFeed(req, res) {
  try {
    const userId = req.user.id;
    const videos = db.prepare(`
      SELECT v.id, v.video_url, v.caption, v.created_at,
             p.display_name, p.photo_1 as uploader_photo, p.emoji as uploader_emoji,
             (SELECT COUNT(*) FROM life_feed_likes WHERE video_id = v.id) as like_count,
             (SELECT COUNT(*) FROM life_feed_comments WHERE video_id = v.id) as comment_count,
             (SELECT 1 FROM life_feed_likes WHERE video_id = v.id AND user_id = ?) as my_like
      FROM life_feed_videos v
      JOIN profiles p ON p.user_id = v.user_id
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
    if (!req.file) return res.status(400).json({ error: 'Keine Videodatei hochgeladen' });
    const videoId = uuid();
    const videoUrl = `/uploads/${req.file.filename}`;
    const caption = req.body.caption || null;
    db.prepare('INSERT INTO life_feed_videos (id, user_id, video_url, caption) VALUES (?, ?, ?, ?)').run(videoId, req.user.id, videoUrl, caption);
    res.status(201).json({ success: true, videoId, videoUrl });
  } catch (err) {
    console.error('uploadVideo Fehler:', err);
    res.status(500).json({ error: 'Video-Upload fehlgeschlagen' });
  }
}

function toggleLike(req, res) {
  try {
    const { videoId } = req.params;
    const userId = req.user.id;
    const video = db.prepare('SELECT id FROM life_feed_videos WHERE id = ?').get(videoId);
    if (!video) return res.status(404).json({ error: 'Video nicht gefunden' });

    const existing = db.prepare('SELECT id FROM life_feed_likes WHERE video_id = ? AND user_id = ?').get(videoId, userId);
    if (existing) {
      db.prepare('DELETE FROM life_feed_likes WHERE video_id = ? AND user_id = ?').run(videoId, userId);
    } else {
      db.prepare('INSERT INTO life_feed_likes (video_id, user_id) VALUES (?, ?)').run(videoId, userId);
    }
    const likeCount = db.prepare('SELECT COUNT(*) as n FROM life_feed_likes WHERE video_id = ?').get(videoId).n;
    res.json({ liked: !existing, likeCount });
  } catch (err) {
    console.error('toggleLike Fehler:', err);
    res.status(500).json({ error: 'Like fehlgeschlagen' });
  }
}

function getComments(req, res) {
  try {
    const { videoId } = req.params;
    const comments = db.prepare(`
      SELECT c.id, c.text, c.created_at,
             p.display_name, p.photo_1 as photo, p.emoji
      FROM life_feed_comments c
      JOIN profiles p ON p.user_id = c.user_id
      WHERE c.video_id = ?
      ORDER BY c.created_at ASC
    `).all(videoId);
    res.json(comments);
  } catch (err) {
    console.error('getComments Fehler:', err);
    res.status(500).json({ error: 'Kommentare laden fehlgeschlagen' });
  }
}

function addComment(req, res) {
  try {
    const { videoId } = req.params;
    const { text } = req.body;
    const userId = req.user.id;
    if (!text || !text.trim()) return res.status(400).json({ error: 'Kein Text' });
    if (text.length > 300) return res.status(400).json({ error: 'Zu lang (max. 300 Zeichen)' });

    const video = db.prepare('SELECT id FROM life_feed_videos WHERE id = ?').get(videoId);
    if (!video) return res.status(404).json({ error: 'Video nicht gefunden' });

    const id = uuid();
    db.prepare('INSERT INTO life_feed_comments (id, video_id, user_id, text) VALUES (?, ?, ?, ?)').run(id, videoId, userId, text.trim());

    const profile = db.prepare('SELECT display_name, photo_1 as photo, emoji FROM profiles WHERE user_id = ?').get(userId);
    const comment = { id, text: text.trim(), created_at: new Date().toISOString(), ...profile };

    if (io) io.to(`video:${videoId}`).emit('new_comment', { videoId, comment });

    res.status(201).json(comment);
  } catch (err) {
    console.error('addComment Fehler:', err);
    res.status(500).json({ error: 'Kommentar fehlgeschlagen' });
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

module.exports = { getFeed, uploadVideo, toggleLike, getComments, addComment, deleteVideo, setIo };
