const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Подключение к MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB подключена'))
  .catch(err => console.error('Ошибка подключения к MongoDB:', err));

// Импорт модели пользователя
const User = require('./models/User');

// Middleware
app.use(cors());
app.use(express.json());

// Middleware для правильных заголовков
app.use((req, res, next) => {
  if (req.url.endsWith('.css')) {
    res.setHeader('Content-Type', 'text/css');
  } else if (req.url.endsWith('.js')) {
    res.setHeader('Content-Type', 'application/javascript');
  }
  next();
});

// МАРШРУТЫ ПЕРЕД СТАТИЧЕСКИМИ ФАЙЛАМИ
// Базовый маршрут
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'home.html'));
});

// Маршрут для авторизации
app.get('/auth', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Маршрут для приглашений
app.get('/invite/:code', async (req, res) => {
  try {
    const inviteCode = req.params.code;
    
    // Найти тренера по коду приглашения
    const trainer = await User.findOne({ inviteCode: inviteCode });
    
    if (!trainer) {
      return res.redirect('/invite.html?error=invalid');
    }
    
    // Отправить страницу приглашения с параметрами
    res.redirect(`/invite.html?invite=${inviteCode}&trainer=${encodeURIComponent(trainer.name)}`);
  } catch (error) {
    res.redirect('/invite.html?error=server');
  }
});

// Маршрут для страницы приглашений
app.get('/invite.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'invite.html'));
});

// Маршрут для страницы выхода
app.get('/logout', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'logout.html'));
});

// Маршруты для дашбордов
app.get('/dashboard/trainer', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard', 'trainer', 'index.html'));
});

app.get('/dashboard/client', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard', 'client', 'index.html'));
});

app.get('/dashboard/trainer/clients', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard', 'trainer', 'clients.html'));
});

app.get('/dashboard/trainer/client-detail', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard', 'trainer', 'client-detail.html'));
});


// Статические файлы ПОСЛЕ маршрутов
app.use(express.static(path.join(__dirname, 'public')));

// API маршруты
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

const trainerRoutes = require('./routes/trainer');
app.use('/api/trainer', trainerRoutes);

const clientRoutes = require('./routes/client');
app.use('/api/client', clientRoutes);



// Запуск Telegram бота
const bot = require('./telegram-bot');
console.log('Telegram бот запущен');

app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});