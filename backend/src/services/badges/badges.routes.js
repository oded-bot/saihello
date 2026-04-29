const router = require('express').Router();
const { authMiddleware } = require('../../middleware/auth');
const { getMyBadges, updateMyBadges } = require('./badges.controller');

router.use(authMiddleware);
router.get('/mine', getMyBadges);
router.patch('/mine', updateMyBadges);

module.exports = router;
