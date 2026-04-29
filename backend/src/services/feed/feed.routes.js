const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuid } = require('uuid');
const { authMiddleware } = require('../../middleware/auth');
const { getFeed, uploadVideo, reactToVideo, deleteVideo } = require('./feed.controller');

const router = express.Router();

const videoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '../../../uploads');
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.mp4';
    cb(null, `feed_${uuid()}${ext}`);
  },
});

const videoUpload = multer({
  storage: videoStorage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter: (req, file, cb) => {
    const allowed = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-m4v'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Nur Videos erlaubt (MP4, MOV, WebM)'));
    }
  },
});

router.get('/', authMiddleware, getFeed);
router.post('/upload', authMiddleware, videoUpload.single('video'), uploadVideo);
router.post('/:videoId/react', authMiddleware, reactToVideo);
router.delete('/:videoId', authMiddleware, deleteVideo);

module.exports = router;
