require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => res.status(200).json({ ok: true }));
app.use('/api/settings', require('./server/routes/settings'));
app.use('/api/auth', require('./server/routes/auth'));
app.use('/api/rooms', require('./server/routes/rooms'));
app.use('/api/profile', require('./server/routes/profile'));
app.use('/api/news', require('./server/routes/news'));
app.use('/api', require('./server/routes/public'));
app.use('/api/admin', require('./server/routes/admin'));
app.use('/api/pwa', require('./server/routes/pwa'));
app.use('/api/upload', require('./server/routes/upload'));
app.use('/api/cp', require('./server/routes/cp'));

const uploadsPath = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsPath)) fs.mkdirSync(uploadsPath, { recursive: true });
app.use('/uploads', express.static(uploadsPath));

const distPath = path.join(__dirname, 'client', 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath, {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      } else if (filePath.endsWith('sw.js') || filePath.endsWith('manifest.webmanifest')) {
        res.setHeader('Cache-Control', 'no-cache, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
      } else if (/\.(js|css|woff2?|png|jpg|svg|ico)$/.test(filePath)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    }
  }));
  app.get('/{*splat}', (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.json({ message: 'YOKO AJANS API running. Build the frontend with: npm run build:client' });
  });
}

require('./server/socketRef').setIo(io);
require('./server/socket')(io);

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} kullanımda! Lütfen mevcut süreci kapatın.`);
    process.exit(1);
  } else {
    console.error('Server error:', err);
    process.exit(1);
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`YOKO AJANS server running at http://0.0.0.0:${PORT}`);
  require('./server/seed')().catch(err => console.error('Seed error:', err.message));
});
