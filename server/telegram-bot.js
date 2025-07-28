const TelegramBot = require('node-telegram-bot-api');
const User = require('./models/User');

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

// Временное хранение данных пользователей
const pendingUsers = new Map();

// Команда /start с возможными параметрами
bot.onText(/\/start(.*)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const telegramId = msg.from.id.toString();
  const name = msg.from.first_name;
  const username = msg.from.username || '';
  
  const startParam = match[1] ? match[1].trim() : '';
  
  console.log(`Пользователь ${name} запустил бота с параметром: "${startParam}"`);
  
  // Проверка существующего пользователя
  try {
    console.log('🔍 Проверяем пользователя с telegramId:', telegramId);
    
    const existingUser = await User.findOne({ where: { telegramId } });
    
    console.log('🔍 Результат поиска пользователя:', existingUser ? 'НАЙДЕН' : 'НЕ НАЙДЕН');
    if (existingUser) {
      console.log('🔍 Данные найденного пользователя:', {
        id: existingUser.id,
        name: existingUser.name,
        userType: existingUser.userType,
        createdAt: existingUser.createdAt
      });
    }
    
    if (existingUser) {
      // Пользователь уже зарегистрирован - отправляем кнопку для входа
      const authLink = `${process.env.BASE_URL}/auth?tgId=${telegramId}&name=${encodeURIComponent(name)}&username=${username}`;
      
      const userTypeText = existingUser.userType === 'trainer' ? 'Тренер' : 'Победитель';
      
      const welcomeMessage = `Привет, ${name}! 👋

Вы уже зарегистрированы как ${userTypeText} в Fitness App!`;

      const keyboard = {
        inline_keyboard: [
          [{
            text: '🚀 Открыть приложение',
            url: authLink
          }]
        ]
      };

      bot.sendMessage(chatId, welcomeMessage, {
        reply_markup: keyboard
      });
      return;
    }
  } catch (error) {
    console.error('Ошибка проверки пользователя:', error);
  }
  
  // Проверка на приглашение
  if (startParam.startsWith('invite_')) {
    const inviteCode = startParam.replace('invite_', '');
    
    try {
      const trainer = await User.findOne({ inviteCode: inviteCode });
      
      if (!trainer) {
        bot.sendMessage(chatId, '❌ Приглашение недействительно или истекло.');
        return;
      }
      
      // Сохранить данные пользователя
      const userKey = `invite_${telegramId}`;
      pendingUsers.set(userKey, {
        telegramId,
        name,
        username,
        inviteCode,
        trainerName: trainer.name
      });
      
      const welcomeMessage = `Привет, ${name}! 👋

Тренер ${trainer.name} пригласил вас присоединиться к Fitness App!

Нажми кнопку ниже для принятия приглашения:`;

      const keyboard = {
        inline_keyboard: [
          [{
            text: '✅ Принять приглашение',
            callback_data: `invite_${telegramId}`
          }]
        ]
      };

      bot.sendMessage(chatId, welcomeMessage, {
        reply_markup: keyboard
      });
      
    } catch (error) {
      console.error('Ошибка обработки приглашения:', error);
      bot.sendMessage(chatId, '❌ Ошибка обработки приглашения.');
    }
    
  } else {
    // Обычный старт - показываем кнопку для новых пользователей
    console.log('Новый пользователь для регистрации:', name);
    
    const welcomeMessage = `Привет, ${name}! 👋

Добро пожаловать в Fitness App!

Нажми кнопку ниже для получения ссылки:`;

    const keyboard = {
      inline_keyboard: [
        [{
          text: '🔐 Получить ссылку для входа',
          callback_data: `auth_${telegramId}`
        }]
      ]
    };

    bot.sendMessage(chatId, welcomeMessage, {
      reply_markup: keyboard
    });
    
    // Сохранить данные пользователя
    const userKey = `auth_${telegramId}`;
    pendingUsers.set(userKey, {
      telegramId,
      name,
      username
    });
  }
});

// Команда /help
bot.onText(/\/help/, async (msg) => {
  const chatId = msg.chat.id;
  
  const helpMessage = `🏋️ Fitness App - Помощь

📋 Доступные команды:
/start - Начать работу с приложением  
/help - Показать эту справку

💡 Как пользоваться:
1. Нажми /start
2. Получи ссылку для входа
3. Открой ссылку в браузере
4. Выбери тип аккаунта

🔗 Приложение работает в браузере.`;

  bot.sendMessage(chatId, helpMessage);
});

// Обработка нажатий кнопок
bot.on('callback_query', async (callbackQuery) => {
  const message = callbackQuery.message;
  const data = callbackQuery.data;

  if (data.startsWith('auth_')) {
    // Обычная авторизация
    const telegramId = data.replace('auth_', '');
    const userKey = `auth_${telegramId}`;
    const userData = pendingUsers.get(userKey);
    
    if (!userData) {
      bot.sendMessage(message.chat.id, '❌ Данные не найдены. Попробуйте /start снова.');
      bot.answerCallbackQuery(callbackQuery.id);
      return;
    }
    
    const authLink = `${process.env.BASE_URL}/auth?tgId=${userData.telegramId}&name=${encodeURIComponent(userData.name)}&username=${userData.username}`;
    
    const keyboard = {
      inline_keyboard: [
        [{
          text: '🚀 Открыть приложение',
          url: authLink
        }]
      ]
    };
    
    bot.sendMessage(message.chat.id, '🔗 Ссылка для входа в приложение готова!', {
      reply_markup: keyboard
    });
    
    pendingUsers.delete(userKey);
    
  } else if (data.startsWith('invite_')) {
    // Принятие приглашения
    const telegramId = data.replace('invite_', '');
    const userKey = `invite_${telegramId}`;
    const userData = pendingUsers.get(userKey);
    
    if (!userData) {
      bot.sendMessage(message.chat.id, '❌ Данные приглашения не найдены.');
      bot.answerCallbackQuery(callbackQuery.id);
      return;
    }
    
    try {
      const trainer = await User.findOne({ inviteCode: userData.inviteCode });
      
      if (!trainer) {
        bot.sendMessage(message.chat.id, '❌ Приглашение больше недействительно.');
        pendingUsers.delete(userKey);
        bot.answerCallbackQuery(callbackQuery.id);
        return;
      }
      
      const authLink = `${process.env.BASE_URL}/auth?tgId=${userData.telegramId}&name=${encodeURIComponent(userData.name)}&username=${userData.username}&invite=${userData.inviteCode}&trainer=${encodeURIComponent(userData.trainerName)}`;
      
      const keyboard = {
        inline_keyboard: [
          [{
            text: '🚀 Завершить регистрацию',
            url: authLink
          }]
        ]
      };
      
      bot.sendMessage(message.chat.id, `✅ Приглашение от тренера ${userData.trainerName} принято!`, {
        reply_markup: keyboard
      });
      
      pendingUsers.delete(userKey);
      
    } catch (error) {
      console.error('Ошибка обработки приглашения:', error);
      bot.sendMessage(message.chat.id, '❌ Ошибка обработки приглашения.');
    }
  }
  
  bot.answerCallbackQuery(callbackQuery.id);
});

module.exports = bot;