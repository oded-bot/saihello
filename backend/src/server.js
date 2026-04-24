require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const { setupChatSocket } = require('./services/chat/chat.socket');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// CORS Origins
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'https://whatstalk.de';
const allowedOrigins = [CORS_ORIGIN, 'https://servuswiesn.de', 'https://www.servuswiesn.de', 'https://servuswiesn.com', 'https://www.servuswiesn.com', 'http://178.104.69.42'];

// Socket.IO
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Trust Proxy (für Cloudflare Tunnel)
app.set('trust proxy', 1);

// Security
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({ origin: allowedOrigins, credentials: true }));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { error: 'Zu viele Anfragen. Bitte warte kurz.' },
});
app.use(limiter);

// Body Parsing
app.use(express.json({ limit: '5mb' }));

// Statische Dateien (Uploads)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ===== ROUTES =====
app.use('/api/auth', require('./services/auth/auth.routes'));
app.use('/api/users', require('./services/user/user.routes'));
app.use('/api/tables', require('./services/table/table.routes'));
app.use('/api/matching', require('./services/matching/matching.routes'));
app.use('/api/chat', require('./services/chat/chat.routes'));
app.use('/api/upload', require('./services/upload/upload.routes'));
app.use('/api/notifications', require('./services/notifications/notifications.routes'));
app.use('/api/connect', require('./services/connect/connect.routes'));
app.use('/api/admin', require('./services/admin/admin.routes'));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', name: 'Servus Wiesn API', version: '1.0.0' });
});

// WebSocket Chat
setupChatSocket(io);

// Start
server.listen(PORT, () => {
  console.log(`\n  Servus Wiesn Backend`);
  console.log(`  API:       http://localhost:${PORT}/api`);
  console.log(`  WebSocket: ws://localhost:${PORT}`);
  console.log(`  Health:    http://localhost:${PORT}/api/health\n`);
});
