const express = require('express');
const { authMiddleware } = require('../../middleware/auth');
const { adminMiddleware } = require('../../middleware/admin');
const controller = require('./admin.controller');

const router = express.Router();

// All routes require auth + admin
router.use(authMiddleware);
router.use(adminMiddleware);

router.get('/stats', controller.getStats);
router.get('/users', controller.getUsers);
router.get('/users/:id', controller.getUserDetail);
router.patch('/users/:id', controller.updateUser);
router.delete('/users/:id', controller.deleteUser);
router.post('/users/:id/approve', controller.approveUser);
router.get('/offers', controller.getOffers);
router.get('/matches', controller.getMatches);
router.get('/messages', controller.getMessages);

module.exports = router;
