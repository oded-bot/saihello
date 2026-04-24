const db = require('../config/database');

function adminMiddleware(req, res, next) {
  const user = db.prepare('SELECT is_admin FROM users WHERE id = ?').get(req.user.id);
  if (!user || !user.is_admin) {
    return res.status(403).json({ error: 'Kein Admin-Zugang' });
  }
  next();
}

module.exports = { adminMiddleware };
