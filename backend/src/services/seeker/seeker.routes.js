const router = require('express').Router();
const { authMiddleware } = require('../../middleware/auth');
const { createSearch, getMySearch, deleteSearch } = require('./seeker.controller');

router.post('/', authMiddleware, createSearch);
router.get('/my', authMiddleware, getMySearch);
router.delete('/my', authMiddleware, deleteSearch);

module.exports = router;
