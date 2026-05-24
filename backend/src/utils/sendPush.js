const webpush = require('web-push');
const db = require('../config/database');

webpush.setVapidDetails(
  process.env.VAPID_EMAIL,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY,
);

async function sendPushToUser(userId, payload) {
  const subs = db.prepare('SELECT * FROM push_subscriptions WHERE user_id = ?').all(userId);
  const results = await Promise.allSettled(
    subs.map(sub => {
      const subscription = {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      };
      return webpush.sendNotification(subscription, JSON.stringify(payload)).catch(err => {
        if (err.statusCode === 410 || err.statusCode === 404) {
          db.prepare('DELETE FROM push_subscriptions WHERE id = ?').run(sub.id);
        }
        throw err;
      });
    })
  );
  const failed = results.filter(r => r.status === 'rejected').length;
  if (failed) console.warn(`Push: ${failed}/${subs.length} fehlgeschlagen für user ${userId}`);
}

module.exports = { sendPushToUser };
