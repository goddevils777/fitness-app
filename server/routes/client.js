const express = require('express');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const router = express.Router();

// Middleware для проверки авторизации клиента
const authClient = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, error: 'Токен не предоставлен' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.userType !== 'client') {
      return res.status(403).json({ success: false, error: 'Доступ запрещен' });
    }
    
    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).json({ success: false, error: 'Неверный токен' });
  }
};

// Получение профиля клиента
router.get('/profile', authClient, async (req, res) => {
  try {
    const client = await User.findById(req.userId).populate('trainerId', 'name');
    
    if (!client) {
      return res.status(404).json({ success: false, error: 'Клиент не найден' });
    }
    
    res.json({
      success: true,
      name: client.name,
      trainerName: client.trainerId ? client.trainerId.name : null,
      completedWorkouts: 8, // Моковые данные
      streak: 3, // Моковые данные
      nextWorkout: 'Завтра в 18:00', // Моковые данные
      goal: 'Похудеть на 5 кг и набрать мышечную массу' // Моковые данные
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;