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
            window.location.href = '/dashboard/client/workouts';
        });
        
        nutritionBtn.addEventListener('click', function() {
            window.location.href = '/dashboard/client/nutrition';
        });
        
        progressBtn.addEventListener('click', function() {
            window.location.href = '/dashboard/client/progress';
        });


        
        logoutBtn.addEventListener('click', logout);
        
        async function loadClientData() {
            try {
                // Загружаем профиль клиента
                const profileResponse = await fetch(`/api/client/profile`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                // Загружаем расписание тренировок
                const scheduleResponse = await fetch(`/api/client/schedule`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                if (profileResponse.ok) {
                    const profileData = await profileResponse.json();
                    clientName.textContent = profileData.name;
                    completedWorkouts.textContent = profileData.completedWorkouts || 8;
                    streak.textContent = profileData.streak || 3;
                    trainerInfo.textContent = profileData.trainerName ? `${profileData.trainerName} - Ваш тренер` : 'Тренер не назначен';
                    goalInfo.textContent = profileData.goal || 'Цель не установлена';
                }
                
                if (scheduleResponse.ok) {
                    const scheduleData = await scheduleResponse.json();
                    
                    if (scheduleData.hasSchedule && scheduleData.nextWorkout) {
                        const nextWorkoutData = scheduleData.nextWorkout;
                        nextWorkout.textContent = `${nextWorkoutData.day} в ${nextWorkoutData.time}`;
                    } else {
                        nextWorkout.textContent = 'Расписание не назначено';
                    }
                }
                
            } catch (error) {
                console.error('Ошибка загрузки данных:', error);
                // Fallback: получаем имя из localStorage
                clientName.textContent = localStorage.getItem('userName') || 'Победитель';
                completedWorkouts.textContent = '8';
                streak.textContent = '3';
                nextWorkout.textContent = 'Расписание не назначено';
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