const express = require('express');
const User = require('../models/User');
const Schedule = require('../models/Schedule');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const router = express.Router();
const ClientStats = require('../models/ClientStats');
const Nutrition = require('../models/Nutrition');

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

// Получение статистики клиента
router.get('/clients/:clientId/stats', authTrainer, async (req, res) => {
  try {
    const { clientId } = req.params;
    
    // Проверяем что клиент принадлежит этому тренеру
    const client = await User.findById(clientId);
    if (!client || client.trainerId.toString() !== req.userId) {
      return res.status(404).json({ success: false, error: 'Клиент не найден' });
    }
    
    let stats = await ClientStats.findOne({ 
      clientId: clientId, 
      trainerId: req.userId 
    });
    
    if (!stats) {
      stats = new ClientStats({
        clientId: clientId,
        trainerId: req.userId,
        currentWeight: 0,
        exerciseResults: [],
        workoutStarted: false,
        workoutStartTime: null
      });
      await stats.save();
    }
    
    // Проверяем нужно ли сбросить статус тренировки
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Начало сегодняшнего дня
    
    let workoutStarted = stats.workoutStarted;
    let workoutStartTime = stats.workoutStartTime;
    
    // Если тренировка была начата, но не сегодня - сбрасываем статус
    if (stats.workoutStarted && stats.workoutStartTime) {
      const workoutDate = new Date(stats.workoutStartTime);
      workoutDate.setHours(0, 0, 0, 0);
      
      if (workoutDate.getTime() < today.getTime()) {
        // Тренировка была вчера или раньше - сбрасываем
        stats.workoutStarted = false;
        stats.workoutStartTime = null;
        await stats.save();
        
        workoutStarted = false;
        workoutStartTime = null;
      }
    }
    
    res.json({
      success: true,
      currentWeight: stats.currentWeight,
      exerciseResults: stats.exerciseResults,
      workoutStarted: workoutStarted,
      workoutStartTime: workoutStartTime
    });
    
  } catch (error) {
    console.error('Ошибка получения статистики:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Сохранение статистики клиента
router.post('/clients/:clientId/stats', authTrainer, async (req, res) => {
  try {
    const { clientId } = req.params;
    const { currentWeight, exerciseResults } = req.body;
    
    // Проверяем что клиент принадлежит этому тренеру
    const client = await User.findById(clientId);
    if (!client || client.trainerId.toString() !== req.userId) {
      return res.status(404).json({ success: false, error: 'Клиент не найден' });
    }
    
    let stats = await ClientStats.findOne({ 
      clientId: clientId, 
      trainerId: req.userId 
    });
    
    if (!stats) {
      stats = new ClientStats({
        clientId: clientId,
        trainerId: req.userId
      });
    }
    
    stats.currentWeight = currentWeight || stats.currentWeight;
    stats.exerciseResults = exerciseResults || stats.exerciseResults;
    
    await stats.save();
    
    res.json({
      success: true,
      message: 'Статистика сохранена'
    });
    
  } catch (error) {
    console.error('Ошибка сохранения статистики:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Начало тренировки
router.post('/clients/:clientId/start-workout', authTrainer, async (req, res) => {
  try {
    const { clientId } = req.params;
    
    // Проверяем что клиент принадлежит этому тренеру
    const client = await User.findById(clientId);
    if (!client || client.trainerId.toString() !== req.userId) {
      return res.status(404).json({ success: false, error: 'Клиент не найден' });
    }
    
    let stats = await ClientStats.findOne({ 
      clientId: clientId, 
      trainerId: req.userId 
    });
    
    if (!stats) {
      stats = new ClientStats({
        clientId: clientId,
        trainerId: req.userId
      });
    }
    
    // Устанавливаем статус начала тренировки
    stats.workoutStarted = true;
    stats.workoutStartTime = new Date();
    stats.lastWorkoutDate = new Date();
    
    await stats.save();
    
    res.json({
      success: true,
      message: 'Тренировка начата',
      workoutStartTime: stats.workoutStartTime
    });
    
  } catch (error) {
    console.error('Ошибка начала тренировки:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Сохранение плана питания клиента
router.post('/clients/:clientId/nutrition', authTrainer, async (req, res) => {
  try {
    const { clientId } = req.params;
    const { meals, times } = req.body;
    
    // Проверяем что клиент принадлежит этому тренеру
    const client = await User.findById(clientId);
    if (!client || client.trainerId.toString() !== req.userId) {
      return res.status(404).json({ success: false, error: 'Клиент не найден' });
    }
    
    // Формируем данные плана питания
    const weekNutrition = [];
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    
    days.forEach(day => {
      if (meals[day] && meals[day].length > 0) {
        const dayData = {
          day: day,
          meals: meals[day].map((meal, index) => ({
            name: meal.name.trim(),
            calories: parseInt(meal.calories) || 0,
            time: times[day] && times[day][index] ? times[day][index] : { hour: '12', minute: '00' },
            order: index + 1
          })).filter(meal => meal.name !== '')
        };
        
        if (dayData.meals.length > 0) {
          weekNutrition.push(dayData);
        }
      }
    });
    
    // Ищем существующий план питания или создаем новый
    let nutrition = await Nutrition.findOne({ 
      clientId: clientId, 
      trainerId: req.userId 
    });
    
    if (nutrition) {
      nutrition.weekNutrition = weekNutrition;
      nutrition.updatedAt = new Date();
    } else {
      nutrition = new Nutrition({
        clientId: clientId,
        trainerId: req.userId,
        weekNutrition: weekNutrition
      });
    }
    
    await nutrition.save();
    
    res.json({
      success: true,
      message: 'План питания сохранен',
      nutritionId: nutrition._id
    });
    
  } catch (error) {
    console.error('Ошибка сохранения плана питания:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Загрузка плана питания клиента
router.get('/clients/:clientId/nutrition', authTrainer, async (req, res) => {
  try {
    const { clientId } = req.params;
    
    // Проверяем что клиент принадлежит этому тренеру
    const client = await User.findById(clientId);
    if (!client || client.trainerId.toString() !== req.userId) {
      return res.status(404).json({ success: false, error: 'Клиент не найден' });
    }
    
    const nutrition = await Nutrition.findOne({ 
      clientId: clientId, 
      trainerId: req.userId,
      isActive: true 
    });
    
    if (!nutrition) {
      return res.json({
        success: true,
        meals: {},
        times: {}
      });
    }
    
    // Преобразуем данные в формат для фронтенда
    const meals = {};
    const times = {};
    
    nutrition.weekNutrition.forEach(dayData => {
      meals[dayData.day] = dayData.meals
        .sort((a, b) => a.order - b.order)
        .map(meal => ({
          name: meal.name,
          calories: meal.calories
        }));
      times[dayData.day] = dayData.meals
        .sort((a, b) => a.order - b.order)
        .map(meal => meal.time);
    });
    
    res.json({
      success: true,
      meals: meals,
      times: times,
      nutritionId: nutrition._id
    });
    
  } catch (error) {
    console.error('Ошибка загрузки плана питания:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;