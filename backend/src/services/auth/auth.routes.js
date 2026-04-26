const express = require('express');
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { validate } = require('../../middleware/validate');
const authController = require('./auth.controller');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'development' ? 1000 : 5,
  message: { error: 'Zu viele Login-Versuche. Bitte warte 15 Minuten.' },
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: process.env.NODE_ENV === 'development' ? 1000 : 3,
  message: { error: 'Zu viele Registrierungen. Bitte warte.' },
});

const resendLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: process.env.NODE_ENV === 'development' ? 1000 : 5,
  message: { error: 'Zu viele Versuche. Bitte warte.' },
});

router.post('/register', registerLimiter, [
  body('username').trim().isLength({ min: 3, max: 30 }).withMessage('Benutzername muss 3-30 Zeichen haben'),
  body('email').isEmail().withMessage('Gültige E-Mail-Adresse erforderlich'),
  body('password').isLength({ min: 6 }).withMessage('Passwort muss mindestens 6 Zeichen haben'),
  body('displayName').trim().isLength({ min: 2, max: 100 }).withMessage('Name muss 2-100 Zeichen haben'),
  body('age').isInt({ min: 18, max: 120 }).withMessage('Du musst mindestens 18 sein'),
  body('gender').isIn(['m', 'f', 'd']).withMessage('Geschlecht: m, f oder d'),
  validate,
], authController.register);

router.post('/login', loginLimiter, [
  body('username').notEmpty().withMessage('Benutzername erforderlich'),
  body('password').notEmpty().withMessage('Passwort erforderlich'),
  validate,
], authController.login);

router.post('/verify-email', [
  body('username').notEmpty().withMessage('Benutzername erforderlich'),
  body('code').isLength({ min: 6, max: 6 }).withMessage('6-stelliger Code erforderlich'),
  validate,
], authController.verifyEmail);

router.post('/resend-code', resendLimiter, [
  body('username').notEmpty().withMessage('Benutzername erforderlich'),
  validate,
], authController.resendCode);

router.get('/me', require('../../middleware/auth').authMiddleware, authController.getMe);

module.exports = router;
