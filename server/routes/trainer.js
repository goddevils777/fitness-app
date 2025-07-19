const express = require('express');
const User = require('../models/User');
const Schedule = require('../models/Schedule');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const router = express.Router();

// Middleware для проверки авторизации тренера
const authTrainer = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, error: 'Токен не предоставлен' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.userType !== 'trainer') {
      return res.status(403).json({ success: false, error: 'Доступ запрещен' });
    }
    
    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).json({ success: false, error: 'Неверный токен' });
  }
};

// Сохранение расписания клиента
router.post('/clients/:clientId/schedule', authTrainer, async (req, res) => {
  try {
    const { clientId } = req.params;
    const { exercises, times } = req.body;
    
    // Проверяем что клиент принадлежит этому тренеру
    const client = await User.findById(clientId);
    if (!client || client.trainerId.toString() !== req.userId) {
      return res.status(404).json({ success: false, error: 'Клиент не найден' });
    }
    
    // Формируем данные расписания
    const weekSchedule = [];
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    
    days.forEach(day => {
      if (exercises[day] && exercises[day].length > 0) {
        const dayData = {
          day: day,
          time: times[day] || { hour: '18', minute: '00' },
          exercises: exercises[day].map((text, index) => ({
            text: text.trim(),
            order: index + 1
          })).filter(ex => ex.text !== '')
        };
        
        if (dayData.exercises.length > 0) {
          weekSchedule.push(dayData);
        }
      }
    });
    
    // Ищем существующее расписание или создаем новое
    let schedule = await Schedule.findOne({ 
      clientId: clientId, 
      trainerId: req.userId 
    });
    
    if (schedule) {
      schedule.weekSchedule = weekSchedule;
      schedule.updatedAt = new Date();
    } else {
      schedule = new Schedule({
        clientId: clientId,
        trainerId: req.userId,
        weekSchedule: weekSchedule
      });
    }
    
    await schedule.save();
    
    res.json({
      success: true,
      message: 'Расписание сохранено',
      scheduleId: schedule._id
    });
    
  } catch (error) {
    console.error('Ошибка сохранения расписания:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Загрузка расписания клиента
router.get('/clients/:clientId/schedule', authTrainer, async (req, res) => {
  try {
    const { clientId } = req.params;
    
    // Проверяем что клиент принадлежит этому тренеру
    const client = await User.findById(clientId);
    if (!client || client.trainerId.toString() !== req.userId) {
      return res.status(404).json({ success: false, error: 'Клиент не найден' });
    }
    
    const schedule = await Schedule.findOne({ 
      clientId: clientId, 
      trainerId: req.userId,
      isActive: true 
    });
    
    if (!schedule) {
      return res.json({
        success: true,
        exercises: {},
        times: {}
      });
    }
    
    // Преобразуем данные в формат для фронтенда
    const exercises = {};
    const times = {};
    
    schedule.weekSchedule.forEach(dayData => {
      exercises[dayData.day] = dayData.exercises
        .sort((a, b) => a.order - b.order)
        .map(ex => ex.text);
      times[dayData.day] = dayData.time;
    });
    
    res.json({
      success: true,
      exercises: exercises,
      times: times,
      scheduleId: schedule._id
    });
    
  } catch (error) {
    console.error('Ошибка загрузки расписания:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Получение профиля тренера
router.get('/profile', authTrainer, async (req, res) => {
  try {
    const trainer = await User.findById(req.userId);
    const clientsCount = await User.countDocuments({ trainerId: req.userId });
    
    res.json({
      success: true,
      name: trainer.name,
      clientsCount: clientsCount,
      activeWorkouts: clientsCount * 3, // Моковые данные
      monthlyIncome: clientsCount * 3000 // Моковые данные
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Генерация ссылки-приглашения для клиента
router.post('/generate-invite', authTrainer, async (req, res) => {
  try {
    const inviteCode = crypto.randomBytes(16).toString('hex');
    
    // Сохраняем код приглашения в профиле тренера
    await User.findByIdAndUpdate(req.userId, { 
      inviteCode: inviteCode 
    });
    
    const inviteLink = `${process.env.BASE_URL}/invite/${inviteCode}`;
    
    res.json({
      success: true,
      inviteLink: inviteLink
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Получение списка клиентов тренера
router.get('/clients', authTrainer, async (req, res) => {
  try {
    const clients = await User.find({ 
      trainerId: req.userId,
      userType: 'client' 
    }).select('name username createdAt');
    
    res.json({
      success: true,
      clients: clients.map(client => ({
        id: client._id,
        name: client.name,
        username: client.username,
        joinedAt: client.createdAt
      }))
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Получение данных конкретного клиента
router.get('/clients/:clientId', authTrainer, async (req, res) => {
  try {
    const { clientId } = req.params;
    
    const client = await User.findById(clientId);
    
    if (!client || client.trainerId.toString() !== req.userId) {
      return res.status(404).json({ success: false, error: 'Клиент не найден' });
    }
    
    res.json({
      success: true,
      client: {
        id: client._id,
        name: client.name,
        username: client.username,
        joinedAt: client.createdAt,
        userType: client.userType
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;