const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../../middleware/auth');
const { adminMiddleware } = require('../../middleware/admin');
const c = require('./suggestions.controller');

router.use(authMiddleware);

// User routes
router.post('/', c.submitSuggestion);
router.post('/:id/confirm', c.confirmSuggestion);
router.post('/:id/reject', c.rejectSuggestion);

// Admin routes
router.get('/admin/list', adminMiddleware, c.getSuggestions);
router.post('/admin/:id/accept', adminMiddleware, c.acceptSuggestion);
router.post('/admin/:id/decline', adminMiddleware, c.declineSuggestion);

module.exports = router;
