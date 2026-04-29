const express = require('express');
const { authMiddleware } = require('../../middleware/auth');
const c = require('./yesterday.controller');

const router = express.Router();
router.use(authMiddleware);

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

module.exports = router;
