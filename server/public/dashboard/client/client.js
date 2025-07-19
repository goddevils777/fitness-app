document.addEventListener('DOMContentLoaded', function() {
    console.log('Дашборд клиента загружен');
    
    const token = localStorage.getItem('authToken');
    const userType = localStorage.getItem('userType');
    
    console.log('Token:', token);
    console.log('UserType:', userType);
    
    // Проверка авторизации
    if (!token) {
        // Нет токена - перенаправляем на главную для авторизации через Telegram
        console.log('Нет токена, перенаправление на главную');
        window.location.href = '/';
        return;
    }
    
    if (userType !== 'client') {
        if (userType === 'trainer') {
            // Пользователь тренер, перенаправляем на дашборд тренера
            window.location.href = '/dashboard/trainer';
        } else {
            // Неверный тип пользователя
            console.log('Неверный тип пользователя, перенаправление на главную');
            localStorage.clear();
            window.location.href = '/';
        }
        return;
    }
    
    // Проверяем валидность токена
    checkTokenValidity();
    
    async function checkTokenValidity() {
        try {
            const response = await fetch('/api/client/profile', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                // Токен недействителен
                console.log('Токен недействителен, очистка localStorage');
                localStorage.clear();
                window.location.href = '/';
                return;
            }
            
            // Токен валиден, продолжаем загрузку дашборда
            initializeDashboard();
            
        } catch (error) {
            console.error('Ошибка проверки токена:', error);
            localStorage.clear();
            window.location.href = '/';
        }
    }
    
    function initializeDashboard() {
        // Элементы DOM
        const clientName = document.getElementById('clientName');
        const completedWorkouts = document.getElementById('completedWorkouts');
        const streak = document.getElementById('streak');
        const nextWorkout = document.getElementById('nextWorkout');
        const workoutBtn = document.getElementById('workoutBtn');
        const nutritionBtn = document.getElementById('nutritionBtn');
        const progressBtn = document.getElementById('progressBtn');
        const trainerInfo = document.getElementById('trainerInfo');
        const goalInfo = document.getElementById('goalInfo');
        const logoutBtn = document.getElementById('logoutBtn');
        
        // Загрузка данных клиента
        loadClientData();
        
        // Обработчики событий
        workoutBtn.addEventListener('click', function() {
            alert('Раздел "Мои тренировки" - в разработке');
        });
        
        nutritionBtn.addEventListener('click', function() {
            alert('Раздел "Питание" - в разработке');
        });
        
        progressBtn.addEventListener('click', function() {
            alert('Раздел "Прогресс" - в разработке');
        });
        
        logoutBtn.addEventListener('click', logout);
        
        // Функции
        async function loadClientData() {
            try {
                const response = await fetch(`/api/client/profile`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    clientName.textContent = data.name;
                    completedWorkouts.textContent = data.completedWorkouts || 8;
                    streak.textContent = data.streak || 3;
                    nextWorkout.textContent = data.nextWorkout || 'Завтра в 18:00';
                    trainerInfo.textContent = data.trainerName ? `${data.trainerName} - Ваш тренер` : 'Тренер не назначен';
                    goalInfo.textContent = data.goal || 'Цель не установлена';
                } else {
                    throw new Error('Ошибка загрузки профиля');
                }
            } catch (error) {
                console.error('Ошибка загрузки данных:', error);
                // Fallback: получаем имя из localStorage
                clientName.textContent = localStorage.getItem('userName') || 'Победитель';
                completedWorkouts.textContent = '8';
                streak.textContent = '3';
                nextWorkout.textContent = 'Завтра в 18:00';
                trainerInfo.textContent = 'Тренер не назначен';
                goalInfo.textContent = 'Цель не установлена';
            }
        }
        
        function logout() {
            localStorage.removeItem('authToken');
            localStorage.removeItem('userType');
            localStorage.removeItem('userName');
            window.location.href = '/logout';
        }
    }
});