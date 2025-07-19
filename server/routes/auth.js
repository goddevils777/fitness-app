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
    
    let user = await User.findOne({ telegramId });
    let trainerId = null;
    
    // Если есть код приглашения, найти тренера
    if (inviteCode) {
      const trainer = await User.findOne({ inviteCode: inviteCode, userType: 'trainer' });
      if (!trainer) {
        return res.status(400).json({ 
          success: false, 
          error: 'Неверный код приглашения' 
        });
      }
      trainerId = trainer._id;
      
      // Очистить код приглашения у тренера после использования
      await User.findByIdAndUpdate(trainer._id, { 
        $unset: { inviteCode: 1 } 
      });
    }
    
    if (!user) {
      // Создаем нового пользователя
      user = new User({
        telegramId,
        name,
        username,
        userType,
        trainerId: trainerId
      });
      await user.save();
    } else {
      // Обновляем существующего пользователя
      user.name = name;
      user.username = username;
      user.userType = userType;
      
      // Если есть тренер, обновляем связь
      if (trainerId) {
        user.trainerId = trainerId;
      }
      
      await user.save();
    }
    
    const token = jwt.sign(
      { userId: user._id, userType: user.userType },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );
    
    res.json({
      success: true,
      token,
      user: {
        id: user._id,
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
    
    const user = await User.findOne({ telegramId });
    
    if (user) {
      // Пользователь существует - генерируем токен для автоматического входа
      const token = jwt.sign(
        { userId: user._id, userType: user.userType },
        process.env.JWT_SECRET,
        { expiresIn: '30d' }
      );
      
      res.json({
        success: true,
        exists: true,
        token,
        user: {
          id: user._id,
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