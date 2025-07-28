const express = require('express');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const router = express.Router();

// Генерация ссылки для авторизации
router.post('/generate-link', async (req, res) => {
  try {
    const { telegramId, name, username } = req.body;
    const inviteCode = crypto.randomBytes(32).toString('hex');
    
    const authLink = `${process.env.BASE_URL}/auth?code=${inviteCode}&tgId=${telegramId}`;
    
    res.json({ 
      success: true, 
      authLink,
      inviteCode 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Авторизация пользователя
router.post('/login', async (req, res) => {
  try {
    const { telegramId, name, username, userType, inviteCode } = req.body;
    
    let user = await User.findOne({ where: { telegramId } });
    let trainerId = null;
    
    // Если есть код приглашения, найти тренера
    if (inviteCode) {
      console.log('🔍 Поиск тренера с кодом приглашения:', inviteCode);
      
      const trainer = await User.findOne({ 
        where: { inviteCode: inviteCode, userType: 'trainer' } 
      });
      
      console.log('🔍 Результат поиска тренера:', trainer ? 'НАЙДЕН' : 'НЕ НАЙДЕН');
      if (trainer) {
        console.log('🔍 Данные тренера:', {
          id: trainer.id,
          name: trainer.name,
          inviteCode: trainer.inviteCode
        });
      }
      
      if (!trainer) {
        console.log('❌ Тренер с таким кодом не найден');
        return res.status(400).json({ 
          success: false, 
          error: 'Неверный код приглашения' 
        });
      }
      trainerId = trainer.id;
      
      // Очистить код приглашения у тренера после использования
      await trainer.update({ inviteCode: null });
    }
    
    if (!user) {
      // Создаем нового пользователя
      user = await User.create({
        telegramId,
        name,
        username,
        userType,
        trainerId: trainerId
      });
    } else {
      // Обновляем существующего пользователя
      await user.update({
        name,
        username,
        userType,
        trainerId: trainerId || user.trainerId
      });
    }
    
    const token = jwt.sign(
      { userId: user.id, userType: user.userType },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );
    
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        userType: user.userType,
        hasTrainer: !!user.trainerId
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Проверка существующего пользователя
router.post('/check-user', async (req, res) => {
  try {
    const { telegramId } = req.body;
    
    const user = await User.findOne({ where: { telegramId } });
    
    if (user) {
      // Пользователь существует - генерируем токен для автоматического входа
      const token = jwt.sign(
        { userId: user.id, userType: user.userType },
        process.env.JWT_SECRET,
        { expiresIn: '30d' }
      );
      
      res.json({
        success: true,
        exists: true,
        token,
        user: {
          id: user.id,
          name: user.name,
          userType: user.userType
        }
      });
    } else {
      // Пользователь не существует
      res.json({
        success: true,
        exists: false
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;