const express = require('express');
const router = express.Router();
const c = require('./tracker.controller');

router.get('/active', c.getActive);
router.get('/featured', c.getFeatured);
router.get('/upcoming/:id', c.getUpcomingEvent);
router.get('/upcoming/:id/active', c.getUpcomingActive);
router.post('/register', c.register);
router.post('/register-upcoming', c.registerForUpcoming);

module.exports = router;
