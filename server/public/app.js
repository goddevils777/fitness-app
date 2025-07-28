document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const telegramId = urlParams.get('tgId');
    const name = urlParams.get('name');
    const username = urlParams.get('username');
    const inviteCode = urlParams.get('invite');
    const trainerName = urlParams.get('trainer');
    
    const loading = document.getElementById('loading');
    const userTypeSelection = document.getElementById('userTypeSelection');
    const success = document.getElementById('success');
    const trainerBtn = document.getElementById('trainerBtn');
    const clientBtn = document.getElementById('clientBtn');
    
    // Проверка параметров
    if (!telegramId || !name) {
        loading.textContent = 'Ошибка: неверные параметры';
        return;
    }
    
    // Проверка существующего пользователя
    checkExistingUser();
    
    async function checkExistingUser() {
        try {
            const response = await fetch('/api/auth/check-user', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ telegramId })
            });
            
            const result = await response.json();
            console.log('Response status:', response.status);
console.log('Result from check-user:', result);
            
            if (result.success && result.exists) {
                // Пользователь уже существует - автоматический вход
                loading.textContent = 'Вход в систему...';
                
                localStorage.setItem('authToken', result.token);
                localStorage.setItem('userType', result.user.userType);
                localStorage.setItem('userName', result.user.name);
                
                setTimeout(() => {
                    loading.classList.add('hidden');
                    success.classList.remove('hidden');
                    success.innerHTML = `
                        <h2>✅ Добро пожаловать!</h2>
                        <p>Вход выполнен как ${result.user.userType === 'trainer' ? 'Тренер' : 'Победитель'}</p>
                    `;
                    
                    setTimeout(() => {
                        console.log('Перенаправление на:', result.user.userType === 'trainer' ? '/dashboard/trainer' : '/dashboard/client');
                        if (result.user.userType === 'trainer') {
                            window.location.href = '/dashboard/trainer';
                        } else {
                            window.location.href = '/dashboard/client';
                        }
                    }, 5000); // Увеличено до 5 секунд
                }, 1000);
                
                return; // Выходим, не показываем выбор типа
            }
        } catch (error) {
            console.log('Пользователь новый, показываем выбор типа');
        }
        
        // Если пользователь новый, показываем обычную логику
        showUserTypeSelection();
    }
    
    function showUserTypeSelection() {
        // Если есть приглашение, показать информацию о тренере
        if (inviteCode && trainerName) {
            userTypeSelection.innerHTML = `
                <h2>Приглашение от тренера</h2>
                <p>Тренер <strong>${decodeURIComponent(trainerName)}</strong> пригласил вас присоединиться</p>
                <button id="acceptInviteBtn" class="btn btn-primary">
                    ✅ Принять приглашение
                </button>
            `;
            
            // Обработчики для приглашения
            document.getElementById('acceptInviteBtn').addEventListener('click', () => {
                registerUserWithInvite('client', inviteCode);
            });
        } else {
            // Обычные кнопки выбора типа
            trainerBtn.addEventListener('click', () => {
                registerUser('trainer');
            });
            
            clientBtn.addEventListener('click', () => {
                registerUser('client');
            });
        }
        
        // Показать выбор типа пользователя
        setTimeout(() => {
            loading.classList.add('hidden');
            userTypeSelection.classList.remove('hidden');
        }, 1000);
    }
    
    // Остальные функции остаются без изменений...
    
    // Функция регистрации с приглашением
    async function registerUserWithInvite(userType, inviteCode) {
        console.log('Регистрация по приглашению:', userType, inviteCode);
        userTypeSelection.classList.add('hidden');
        loading.classList.remove('hidden');
        loading.textContent = 'Принятие приглашения...';
        
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    telegramId,
                    name,
                    username,
                    userType,
                    inviteCode
                })
            });
            
            const result = await response.json();
            console.log('Результат авторизации с приглашением:', result);
            
            if (result.success) {
                localStorage.setItem('authToken', result.token);
                localStorage.setItem('userType', result.user.userType);
                localStorage.setItem('userName', name);
                
                loading.classList.add('hidden');
                success.classList.remove('hidden');
                success.innerHTML = `
                    <h2>✅ Приглашение принято!</h2>
                    <p>Добро пожаловать в команду!</p>
                `;
                
                setTimeout(() => {
                    window.location.href = '/dashboard/client';
                }, 2000);
            } else {
                loading.textContent = 'Ошибка принятия приглашения: ' + result.error;
            }
        } catch (error) {
            loading.textContent = 'Ошибка сети: ' + error.message;
        }
    }
    
    // Обычная функция регистрации
    async function registerUser(userType) {
        console.log('Регистрация пользователя как:', userType);
        userTypeSelection.classList.add('hidden');
        loading.classList.remove('hidden');
        loading.textContent = 'Регистрация...';
        
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    telegramId,
                    name,
                    username,
                    userType
                })
            });
            
            const result = await response.json();
            console.log('Результат авторизации:', result);
            
            if (result.success) {
                localStorage.setItem('authToken', result.token);
                localStorage.setItem('userType', result.user.userType);
                localStorage.setItem('userName', name);
                console.log('Токен сохранен, userType:', result.user.userType);
                
                loading.classList.add('hidden');
                success.classList.remove('hidden');
                
                setTimeout(() => {
                    console.log('Перенаправление на:', userType === 'trainer' ? '/dashboard/trainer' : '/dashboard/client');
                    if (userType === 'trainer') {
                        window.location.href = '/dashboard/trainer';
                    } else {
                        window.location.href = '/dashboard/client';
                    }
                }, 1500);
            } else {
                loading.textContent = 'Ошибка регистрации: ' + result.error;
            }
        } catch (error) {
            loading.textContent = 'Ошибка сети: ' + error.message;
        }
    }
});