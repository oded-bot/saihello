const { createClient } = require('redis');

const redis = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

redis.on('error', (err) => console.error('Redis Fehler:', err));
redis.on('connect', () => console.log('Redis verbunden'));

async function connectRedis() {
  if (!redis.isOpen) {
    await redis.connect();
  }
  return redis;
}

module.exports = { redis, connectRedis };
