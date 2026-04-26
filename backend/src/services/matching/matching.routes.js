const express = require('express');
const { body, param } = require('express-validator');
const { validate } = require('../../middleware/validate');
const { authMiddleware } = require('../../middleware/auth');
const matchingController = require('./matching.controller');

const router = express.Router();
router.use(authMiddleware);

// Anbieter lädt Suchenden direkt ein (vom Kartenpin)
router.post('/invite-seeker', [
  body('seekerUserId').isUUID().withMessage('Suchender-ID erforderlich'),
  body('direction').isIn(['like', 'superlike']).withMessage('like oder superlike'),
  validate,
], matchingController.inviteSeeker);

// Swipe auf ein Angebot
router.post('/swipe', [
  body('offerId').isUUID().withMessage('Angebots-ID erforderlich'),
  body('direction').isIn(['like', 'pass', 'superlike']).withMessage('like, pass oder superlike'),
  validate,
], matchingController.swipe);

// Super Like Status (wie viele übrig heute)
router.get('/superlike-status', matchingController.getSuperLikeStatus);

// Meine Matches
router.get('/matches', matchingController.getMatches);

// Match-Details
router.get('/matches/:matchId', [
  param('matchId').isUUID(),
  validate,
], matchingController.getMatchDetail);

// Match bestätigen (Einladung senden)
router.post('/matches/:matchId/confirm', [
  param('matchId').isUUID(),
  body('message').optional().trim().isLength({ max: 500 }),
  body('seats').optional().isInt({ min: 1, max: 20 }),
  validate,
], matchingController.confirmMatch);

// Einladung annehmen (Suchender)
router.post('/matches/:matchId/accept', [
  param('matchId').isUUID(),
  validate,
], matchingController.acceptInvite);

// Match ablehnen (Anbieter, mit Tages-Sperre)
router.post('/matches/:matchId/reject', [
  param('matchId').isUUID(),
  validate,
], matchingController.rejectMatch);

// Match absagen
router.post('/matches/:matchId/cancel', [
  param('matchId').isUUID(),
  validate,
], matchingController.cancelMatch);

// Bewertung abgeben
router.post('/matches/:matchId/rate', [
  param('matchId').isUUID(),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Bewertung 1-5'),
  validate,
], matchingController.rateMatch);

// Likes sehen die auf meine Angebote reinkamen (für Anbieter)
router.get('/likes/received', matchingController.getReceivedLikes);

module.exports = router;
