const express = require('express');
const { body, param } = require('express-validator');
const { validate } = require('../../middleware/validate');
const { authMiddleware } = require('../../middleware/auth');
const chatController = require('./chat.controller');

const router = express.Router();
router.use(authMiddleware);

// Nachrichten eines Matches laden
router.get('/:matchId/messages', [
  param('matchId').isUUID(),
  validate,
], chatController.getMessages);

// Nachricht senden (REST-Fallback, primär über WebSocket)
router.post('/:matchId/messages', [
  param('matchId').isUUID(),
  body('content').trim().isLength({ min: 1, max: 2000 }).withMessage('Nachricht 1-2000 Zeichen'),
  body('message_type').optional().isIn(['text', 'image', 'audio']).withMessage('Ungültiger Nachrichtentyp'),
  validate,
], chatController.sendMessage);

// Nachrichten als gelesen markieren
router.post('/:matchId/read', [
  param('matchId').isUUID(),
  validate,
], chatController.markRead);

// Nachricht löschen
router.delete('/:matchId/messages/:messageId', [
  param('matchId').isUUID(),
  param('messageId').isUUID(),
  validate,
], chatController.deleteMessage);

// Nachricht bearbeiten
router.patch('/:matchId/messages/:messageId', [
  param('matchId').isUUID(),
  param('messageId').isUUID(),
  body('content').trim().isLength({ min: 1, max: 2000 }),
  validate,
], chatController.editMessage);

module.exports = router;
