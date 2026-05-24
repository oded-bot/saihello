const express = require('express');
const multer = require('multer');
const { authMiddleware } = require('../../middleware/auth');
const c = require('./yesterday.controller');

const router = express.Router();
router.use(authMiddleware);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
    cb(null, allowed.includes(file.mimetype));
  },
});

router.get('/locations', c.getLocations);
router.post('/pin', c.setPin);
router.get('/feed', c.getFeed);
router.post('/feed/:userId/like', c.likeUser);
router.post('/feed/:userId/pass', c.passUser);
router.get('/requests', c.getRequests);
router.post('/requests/:id/accept', c.acceptRequest);
router.post('/requests/:id/reject', c.rejectRequest);
router.get('/chats/:chatId/messages', c.getChatMessages);
router.post('/chats/:chatId/messages', c.sendChatMessage);
router.get('/photos', c.getPhotos);
router.post('/photos', upload.single('photo'), c.uploadPhoto);
router.post('/photos/:id/like', c.togglePhotoLike);
router.get('/photos/:id/comments', c.getPhotoComments);
router.post('/photos/:id/comments', c.addPhotoComment);

module.exports = router;
