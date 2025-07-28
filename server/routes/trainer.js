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
    const client = await User.findByPk(clientId);
    if (!client || client.trainerId != req.userId) {
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
      where: { clientId: clientId, trainerId: req.userId }
    });
    
    if (schedule) {
      await schedule.update({ weekSchedule: weekSchedule });
    } else {
      schedule = await Schedule.create({
        clientId: clientId,
        trainerId: req.userId,
        weekSchedule: weekSchedule
      });
    }
    
    res.json({
      success: true,
      message: 'Расписание сохранено',
      scheduleId: schedule.id
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
    const client = await User.findByPk(clientId);
    if (!client || client.trainerId != req.userId) {
      return res.status(404).json({ success: false, error: 'Клиент не найден' });
    }
    
    const schedule = await Schedule.findOne({ 
      where: { clientId: clientId, trainerId: req.userId, isActive: true }
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
      scheduleId: schedule.id
    });
    
  } catch (error) {
    console.error('Ошибка загрузки расписания:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Получение профиля тренера
router.get('/profile', authTrainer, async (req, res) => {
  try {
    const trainer = await User.findByPk(req.userId);
    const clientsCount = await User.count({ where: { trainerId: req.userId } });
    
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
    await User.update({ inviteCode: inviteCode }, { where: { id: req.userId } });
    
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
    const clients = await User.findAll({ 
      where: { trainerId: req.userId, userType: 'client' },
      attributes: ['id', 'name', 'username', 'createdAt']
    });
    
    res.json({
      success: true,
      clients: clients.map(client => ({
        id: client.id,
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
    
    const client = await User.findByPk(clientId);
    
    if (!client || client.trainerId != req.userId) {
      return res.status(404).json({ success: false, error: 'Клиент не найден' });
    }
    
    res.json({
      success: true,
      client: {
        id: client.id,
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
    const client = await User.findByPk(clientId);
    if (!client || client.trainerId != req.userId) {
      return res.status(404).json({ success: false, error: 'Клиент не найден' });
    }
    
    let stats = await ClientStats.findOne({ 
      where: { clientId: clientId, trainerId: req.userId }
    });
    
    if (!stats) {
      stats = await ClientStats.create({
        clientId: clientId,
        trainerId: req.userId,
        currentWeight: 0,
        exerciseResults: [],
        workoutStarted: false,
        workoutStartTime: null
      });
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
        await stats.update({
          workoutStarted: false,
          workoutStartTime: null
        });
        
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
    const client = await User.findByPk(clientId);
    if (!client || client.trainerId != req.userId) {
      return res.status(404).json({ success: false, error: 'Клиент не найден' });
    }
    
    let stats = await ClientStats.findOne({ 
      where: { clientId: clientId, trainerId: req.userId }
    });
    
    if (!stats) {
      stats = await ClientStats.create({
        clientId: clientId,
        trainerId: req.userId,
        currentWeight: currentWeight || 0,
        exerciseResults: exerciseResults || []
      });
    } else {
      await stats.update({
        currentWeight: currentWeight || stats.currentWeight,
        exerciseResults: exerciseResults || stats.exerciseResults
      });
    }
    
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
    const client = await User.findByPk(clientId);
    if (!client || client.trainerId != req.userId) {
      return res.status(404).json({ success: false, error: 'Клиент не найден' });
    }
    
    let stats = await ClientStats.findOne({ 
      where: { clientId: clientId, trainerId: req.userId }
    });
    
    if (!stats) {
      stats = await ClientStats.create({
        clientId: clientId,
        trainerId: req.userId,
        workoutStarted: true,
        workoutStartTime: new Date(),
        lastWorkoutDate: new Date()
      });
    } else {
      await stats.update({
        workoutStarted: true,
        workoutStartTime: new Date(),
        lastWorkoutDate: new Date()
      });
    }
    
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
    const client = await User.findByPk(clientId);
    if (!client || client.trainerId != req.userId) {
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
      where: { clientId: clientId, trainerId: req.userId }
    });
    
    if (nutrition) {
      await nutrition.update({ weekNutrition: weekNutrition });
    } else {
      nutrition = await Nutrition.create({
        clientId: clientId,
        trainerId: req.userId,
        weekNutrition: weekNutrition
      });
    }
    
    res.json({
      success: true,
      message: 'План питания сохранен',
      nutritionId: nutrition.id
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
    const client = await User.findByPk(clientId);
    if (!client || client.trainerId != req.userId) {
      return res.status(404).json({ success: false, error: 'Клиент не найден' });
    }
    
    const nutrition = await Nutrition.findOne({ 
      where: { clientId: clientId, trainerId: req.userId, isActive: true }
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
      nutritionId: nutrition.id
    });
    
  } catch (error) {
    console.error('Ошибка загрузки плана питания:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;