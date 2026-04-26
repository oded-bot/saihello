const express = require('express');
const { body, param, query } = require('express-validator');
const { validate } = require('../../middleware/validate');
const { authMiddleware } = require('../../middleware/auth');
const tableController = require('./table.controller');
const { canSearch, canOffer, getRoleStatus } = require('../user/rolecheck');

const router = express.Router();

// Alle Routes brauchen Auth
router.use(authMiddleware);

// Rollen-Status abfragen
router.get('/role-status', (req, res) => {
  res.json(getRoleStatus(req.user.id));
});

// Zelte auflisten
router.get('/tents', tableController.getTents);

// Tisch-Angebot erstellen (gesperrt wenn aktiv am Suchen)
router.post('/offers', canOffer, [
  body('totalSeats').isInt({ min: 1, max: 20 }).withMessage('1-20 Plätze'),
  body('availableSeats').isInt({ min: 1 }).withMessage('Mindestens 1 freier Platz'),
  body('date').isDate().withMessage('Gültiges Datum'),
  body('timeFrom').matches(/^\d{2}:\d{2}$/).withMessage('Uhrzeit im Format HH:MM'),
  body('timeUntil').matches(/^\d{2}:\d{2}$/).withMessage('Uhrzeit im Format HH:MM'),
  validate,
], tableController.createOffer);

// Eigene Angebote
router.get('/offers/mine', tableController.getMyOffers);

// Angebot aktualisieren
router.patch('/offers/:offerId', [
  param('offerId').isUUID(),
  validate,
], tableController.updateOffer);

// Angebot löschen/deaktivieren
router.delete('/offers/:offerId', [
  param('offerId').isUUID(),
  validate,
], tableController.deleteOffer);

// Verfügbare Angebote zum Swipen abrufen (gesperrt wenn aktiv am Anbieten)
router.get('/discover', canSearch, tableController.discoverOffers);

module.exports = router;
