const express = require('express');
const { authMiddleware } = require('../../middleware/auth');
const { getTop10, getMyRank } = require('./leaderboard');

const router = express.Router();

router.get('/', authMiddleware, (req, res) => {
  try {
    res.json(getTop10());
  } catch (err) {
    console.error('Leaderboard Fehler:', err);
    res.status(500).json({ error: 'Leaderboard laden fehlgeschlagen' });
  }
});

router.get('/my-rank', authMiddleware, (req, res) => {
  try {
    res.json(getMyRank(req.user.id));
  } catch (err) {
    console.error('MyRank Fehler:', err);
    res.status(500).json({ error: 'Rang laden fehlgeschlagen' });
  }
});

module.exports = router;
