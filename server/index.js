const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { setupRoutes } = require('./routes');
const { setupSocket } = require('./socket');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Статические файлы для загрузки изображений
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Маршруты ДО статических файлов
setupRoutes(app);

// Статические файлы клиента
app.use(express.static(path.join(__dirname, '../client')));

// Настройка WebSocket
setupSocket(io);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`✅ Сервер запущен: http://localhost:${PORT}`);
});