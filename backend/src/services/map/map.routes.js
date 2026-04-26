const router = require('express').Router();
const { authMiddleware } = require('../../middleware/auth');
const { getOfferPins, getSeekerPins, getOfferFeed, getSeekerFeed } = require('./map.controller');

router.get('/offer-pins', authMiddleware, getOfferPins);
router.get('/seeker-pins', authMiddleware, getSeekerPins);
router.get('/offer-feed', authMiddleware, getOfferFeed);
router.get('/seeker-feed', authMiddleware, getSeekerFeed);

module.exports = router;
