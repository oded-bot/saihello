const express = require('express');
const { body } = require('express-validator');
const { validate } = require('../../middleware/validate');
const { authMiddleware } = require('../../middleware/auth');
const userController = require('./user.controller');

const router = express.Router();
router.use(authMiddleware);

// Profil aktualisieren
router.patch('/profile', [
  body('displayName').optional().trim().isLength({ min: 2, max: 100 }),
  body('bio').optional().trim().isLength({ max: 500 }),
  body('age').optional().isInt({ min: 18, max: 120 }),
  body('gender').optional().isIn(['m', 'f', 'd']),
  validate,
], userController.updateProfile);

// User melden
router.post('/report', [
  body('reportedUserId').isUUID(),
  body('reason').isIn(['fake_profile', 'inappropriate', 'harassment', 'scam', 'no_show', 'other']),
  body('description').optional().trim().isLength({ max: 1000 }),
  validate,
], userController.reportUser);

// Account löschen
router.delete('/account', userController.deleteAccount);

module.exports = router;
