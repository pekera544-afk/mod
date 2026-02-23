require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/settings', require('./server/routes/settings'));
app.use('/api/auth', require('./server/routes/auth'));
app.use('/api/rooms', require('./server/routes/rooms'));
app.use('/api', require('./server/routes/public'));
app.use('/api/admin', require('./server/routes/admin'));
app.use('/api/pwa', require('./server/routes/pwa'));

const distPath = path.join(__dirname, 'client', 'dist');
const fs = require('fs');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('/{*splat}', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.json({ message: 'YOKO AJANS API running. Build the frontend with: npm run build:client' });
  });
}

require('./server/socket')(io);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`YOKO AJANS server running at http://0.0.0.0:${PORT}`);
});
