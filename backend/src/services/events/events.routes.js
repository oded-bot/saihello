const express = require('express');
const { authMiddleware } = require('../../middleware/auth');
const db = require('../../config/database');

const router = express.Router();
router.use(authMiddleware);

router.get('/', (req, res) => {
  try {
    const events = db.prepare(
      'SELECT id, name, city, state, date_text, emoji, event_type, estimated_visitors FROM upcoming_events ORDER BY sort_order ASC'
    ).all();
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: 'Events laden fehlgeschlagen' });
  }
});

module.exports = router;
