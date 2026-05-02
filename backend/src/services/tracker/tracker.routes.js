const express = require('express');
const router = express.Router();
const c = require('./tracker.controller');

router.get('/active', c.getActive);
router.post('/register', c.register);

module.exports = router;
