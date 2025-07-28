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
    const client = await User.findByPk(req.userId);
    
    if (!client) {
      return res.status(404).json({ success: false, error: 'Клиент не найден' });
    }

    // Получаем тренера если есть
    let trainerName = null;
    if (client.trainerId) {
      const trainer = await User.findByPk(client.trainerId);
      if (trainer) {
        trainerName = trainer.name;
      }
    }
    
    res.json({
      success: true,
      name: client.name,
      trainerName: trainerName,
      completedWorkouts: 8, // Моковые данные
      streak: 3, // Моковые данные
      nextWorkout: 'Завтра в 18:00', // Моковые данные
      goal: 'Похудеть на 5 кг и набрать мышечную массу' // Моковые данные
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Получение расписания тренировок клиента
router.get('/schedule', authClient, async (req, res) => {
  try {
    const client = await User.findByPk(req.userId);
    
    if (!client || !client.trainerId) {
      return res.status(404).json({ 
        success: false, 
        error: 'Тренер не назначен' 
      });
    }

    // Получаем тренера
    const trainer = await User.findByPk(client.trainerId);
    if (!trainer) {
      return res.status(404).json({ 
        success: false, 
        error: 'Тренер не найден' 
      });
    }
    
    const Schedule = require('../models/Schedule');
    const schedule = await Schedule.findOne({ 
      where: { clientId: req.userId, trainerId: client.trainerId, isActive: true }
    });
    
    if (!schedule) {
      return res.json({
        success: true,
        hasSchedule: false,
        nextWorkout: null,
        weekSchedule: []
      });
    }
    
    // Находим следующую тренировку
    const nextWorkout = getNextWorkout(schedule.weekSchedule);
    
    res.json({
      success: true,
      hasSchedule: true,
      nextWorkout: nextWorkout,
      weekSchedule: schedule.weekSchedule,
      trainerName: trainer.name
    });
    
  } catch (error) {
    console.error('Ошибка получения расписания:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Функция для определения следующей тренировки
function getNextWorkout(weekSchedule) {
  if (!weekSchedule || weekSchedule.length === 0) {
    return null;
  }
  
  const today = new Date();
  const currentDay = today.getDay(); // 0 = воскресенье, 1 = понедельник
  const currentHour = today.getHours();
  const currentMinute = today.getMinutes();
  
  const dayNames = {
    'monday': { index: 1, name: 'понедельник' },
    'tuesday': { index: 2, name: 'вторник' },
    'wednesday': { index: 3, name: 'среда' },
    'thursday': { index: 4, name: 'четверг' },
    'friday': { index: 5, name: 'пятница' },
    'saturday': { index: 6, name: 'суббота' },
    'sunday': { index: 0, name: 'воскресенье' }
  };
  
  // Ищем ближайшую тренировку
  let nextWorkout = null;
  let minDaysUntil = 8; // больше недели
  
  weekSchedule.forEach(daySchedule => {
    const dayInfo = dayNames[daySchedule.day];
    if (!dayInfo) return;
    
    const workoutHour = parseInt(daySchedule.time.hour);
    const workoutMinute = parseInt(daySchedule.time.minute);
    
    let daysUntil = dayInfo.index - currentDay;
    
    // Если день уже прошел или сегодня но время прошло
    if (daysUntil < 0 || (daysUntil === 0 && (workoutHour < currentHour || (workoutHour === currentHour && workoutMinute <= currentMinute)))) {
      daysUntil += 7; // на следующей неделе
    }
    
    if (daysUntil < minDaysUntil) {
      minDaysUntil = daysUntil;
      nextWorkout = {
        day: dayInfo.name,
        time: `${daySchedule.time.hour}:${daySchedule.time.minute.padStart(2, '0')}`,
        exercises: daySchedule.exercises
      };
    }
  });
  
  return nextWorkout;
}

// Получение прогресса клиента
router.get('/progress', authClient, async (req, res) => {
  try {
    const ClientStats = require('../models/ClientStats');
    
    // Получаем все записи статистики клиента
    const stats = await ClientStats.findAll({ 
      where: { clientId: req.userId },
      order: [['updatedAt', 'DESC']],
      limit: 30 // Последние 30 записей
    });
    
    if (stats.length === 0) {
      return res.json({
        success: true,
        hasData: false,
        currentWeight: 0,
        totalWorkouts: 0,
        totalExercises: 0,
        workoutHistory: [],
        exerciseProgress: {}
      });
    }
    
    // Текущие показатели из последней записи
    const latestStats = stats[0];
    
    // Подсчитываем общую статистику
    const totalWorkouts = stats.filter(s => s.workoutStarted).length;
    const allExercises = new Set();
    
    stats.forEach(stat => {
      if (stat.exerciseResults && Array.isArray(stat.exerciseResults)) {
        stat.exerciseResults.forEach(ex => {
          allExercises.add(ex.exerciseName);
        });
      }
    });
    
    // Формируем историю тренировок
    const workoutHistory = stats
      .filter(s => s.workoutStarted && s.exerciseResults && s.exerciseResults.length > 0)
      .map(stat => ({
        date: stat.updatedAt,
        weight: stat.currentWeight,
        exercises: stat.exerciseResults
      }));
    
    // Формируем прогресс по упражнениям
    const exerciseProgress = {};
    
    Array.from(allExercises).forEach(exerciseName => {
      exerciseProgress[exerciseName] = stats
        .filter(s => s.exerciseResults && s.exerciseResults.some(ex => ex.exerciseName === exerciseName))
        .map(stat => {
          const exercise = stat.exerciseResults.find(ex => ex.exerciseName === exerciseName);
          return {
            date: stat.updatedAt,
            weight: exercise.weight,
            sets: exercise.sets,
            reps: exercise.reps
          };
        })
        .reverse(); // От старых к новым
    });
    
    res.json({
      success: true,
      hasData: true,
      currentWeight: latestStats.currentWeight,
      totalWorkouts: totalWorkouts,
      totalExercises: allExercises.size,
      lastUpdate: latestStats.updatedAt,
      workoutHistory: workoutHistory,
      exerciseProgress: exerciseProgress
    });
    
  } catch (error) {
    console.error('Ошибка получения прогресса:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Получение плана питания клиента
router.get('/nutrition', authClient, async (req, res) => {
  try {
    const client = await User.findByPk(req.userId);
    
    if (!client || !client.trainerId) {
      return res.status(404).json({ 
        success: false, 
        error: 'Тренер не назначен' 
      });
    }

    // Получаем тренера
    const trainer = await User.findByPk(client.trainerId);
    if (!trainer) {
      return res.status(404).json({ 
        success: false, 
        error: 'Тренер не найден' 
      });
    }
    
    const Nutrition = require('../models/Nutrition');
    const nutrition = await Nutrition.findOne({ 
      where: { clientId: req.userId, trainerId: client.trainerId, isActive: true }
    });
    
    if (!nutrition) {
      return res.json({
        success: true,
        hasNutrition: false,
        todayMeals: [],
        weekNutrition: [],
        trainerName: trainer.name
      });
    }
    
    // Находим сегодняшние блюда
    const todayMeals = getTodayMeals(nutrition.weekNutrition);
    
    res.json({
      success: true,
      hasNutrition: true,
      todayMeals: todayMeals,
      weekNutrition: nutrition.weekNutrition,
      trainerName: trainer.name
    });
    
  } catch (error) {
    console.error('Ошибка получения плана питания:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Функция для получения сегодняшних блюд
function getTodayMeals(weekNutrition) {
  if (!weekNutrition || weekNutrition.length === 0) {
    return [];
  }
  
  const today = new Date();
  const currentDay = today.getDay(); // 0 = воскресенье, 1 = понедельник
  
  const dayNames = {
    1: 'monday',
    2: 'tuesday', 
    3: 'wednesday',
    4: 'thursday',
    5: 'friday',
    6: 'saturday',
    0: 'sunday'
  };
  
  const todayKey = dayNames[currentDay];
  const todayNutrition = weekNutrition.find(day => day.day === todayKey);
  
  if (!todayNutrition) {
    return [];
  }
  
  return todayNutrition.meals.sort((a, b) => a.order - b.order);
}

module.exports = router;