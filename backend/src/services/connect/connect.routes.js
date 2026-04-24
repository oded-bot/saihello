const express = require('express');
const { body, param } = require('express-validator');
const { validate } = require('../../middleware/validate');
const { authMiddleware } = require('../../middleware/auth');
const connectController = require('./connect.controller');

const router = express.Router();
router.use(authMiddleware);

// Alle User mit Profil+Foto
router.get('/people', connectController.getPeople);

// Connect-Status (verbleibende Anfragen heute)
router.get('/status', connectController.getConnectStatus);

// Connect-Anfrage senden
router.post('/request', [
  body('receiverId').isUUID().withMessage('Empfänger-ID erforderlich'),
  body('message').optional().trim().isLength({ max: 300 }).withMessage('Nachricht max. 300 Zeichen'),
  validate,
], connectController.sendRequest);

// Meine eingehenden Anfragen
router.get('/requests', connectController.getRequests);

// Meine gesendeten Anfragen
router.get('/sent', connectController.getSentRequests);

// Anfrage annehmen
router.post('/requests/:id/accept', [
  param('id').isUUID(),
  validate,
], connectController.acceptRequest);

// Anfrage ablehnen
router.post('/requests/:id/reject', [
  param('id').isUUID(),
  validate,
], connectController.rejectRequest);

module.exports = router;
