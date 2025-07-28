document.addEventListener('DOMContentLoaded', function() {
    console.log('Страница тренировок загружена');
    
    const token = localStorage.getItem('authToken');
    const userType = localStorage.getItem('userType');
    
    // Проверка авторизации
    if (!token || userType !== 'client') {
        window.location.href = '/';
        return;
    }
    
    // Элементы DOM
    const backBtn = document.getElementById('backBtn');
    const clientName = document.getElementById('clientName');
    const logoutBtn = document.getElementById('logoutBtn');
    const nextWorkoutCard = document.getElementById('nextWorkoutCard');
    const trainerInfo = document.getElementById('trainerInfo');
    const scheduleGrid = document.getElementById('scheduleGrid');
    
    // Обработчики событий
    backBtn.addEventListener('click', function() {
        window.location.href = '/dashboard/client';
    });
    
    logoutBtn.addEventListener('click', function() {
        localStorage.clear();
        window.location.href = '/logout';
    });
    
    // Инициализация
    loadClientName();
    loadWorkoutSchedule();
    
    function loadClientName() {
        clientName.textContent = localStorage.getItem('userName') || 'Победитель';
    }
    
    async function loadWorkoutSchedule() {
        try {
            const response = await fetch('/api/client/schedule', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                displaySchedule(data);
            } else {
                throw new Error('Ошибка загрузки расписания');
            }
        } catch (error) {
            console.error('Ошибка:', error);
            displayNoSchedule();
        }
    }
    
    function displaySchedule(data) {
        // Отображаем информацию о тренере
        if (data.trainerName) {
            trainerInfo.textContent = `Тренер: ${data.trainerName}`;
        } else {
            trainerInfo.textContent = 'Тренер: не назначен';
        }
        
        // Отображаем следующую тренировку
        if (data.hasSchedule && data.nextWorkout) {
            displayNextWorkout(data.nextWorkout);
        } else {
            displayNoNextWorkout();
        }
        
        // Отображаем недельное расписание
        if (data.hasSchedule && data.weekSchedule.length > 0) {
            displayWeekSchedule(data.weekSchedule);
        } else {
            displayNoWeekSchedule();
        }
    }
    
    function displayNextWorkout(nextWorkout) {
        nextWorkoutCard.innerHTML = `
            <div class="workout-day">${nextWorkout.day}</div>
            <div class="workout-time">🕐 ${nextWorkout.time}</div>
            <div class="workout-exercises">
                ${nextWorkout.exercises.length > 0 ? 
                    `Упражнений: ${nextWorkout.exercises.length}` : 
                    'Упражнения не назначены'
                }
            </div>
        `;
    }
    
    function displayNoNextWorkout() {
        nextWorkoutCard.innerHTML = `
            <div class="no-workout">
                <div style="font-size: 48px; margin-bottom: 15px;">📅</div>
                <div style="font-size: 18px; margin-bottom: 10px;">Расписание не назначено</div>
                <div style="font-size: 14px; opacity: 0.8;">Обратитесь к своему тренеру</div>
            </div>
        `;
    }
    
    function displayWeekSchedule(weekSchedule) {
        const dayNames = {
            'monday': 'Понедельник',
            'tuesday': 'Вторник', 
            'wednesday': 'Среда',
            'thursday': 'Четверг',
            'friday': 'Пятница',
            'saturday': 'Суббота',
            'sunday': 'Воскресенье'
        };
        
        const today = new Date().getDay();
        const todayKey = Object.keys(dayNames)[today === 0 ? 6 : today - 1]; // Конвертируем в наш формат
        
        const allDays = Object.keys(dayNames);
        
        const scheduleHTML = allDays.map(dayKey => {
            const daySchedule = weekSchedule.find(w => w.day === dayKey);
            const isToday = dayKey === todayKey;
            
            if (daySchedule) {
                return `
                    <div class="day-workout-card${isToday ? ' today' : ''}">
                        <div class="day-header">
                            <div class="day-name">${dayNames[dayKey]}</div>
                            <div class="day-time">${daySchedule.time.hour}:${daySchedule.time.minute.padStart(2, '0')}</div>
                        </div>
                        <ul class="exercises-list">
                            ${daySchedule.exercises.map(ex => `<li>${ex.text}</li>`).join('')}
                        </ul>
                    </div>
                `;
            } else {
                return `
                    <div class="day-workout-card">
                        <div class="day-header">
                            <div class="day-name">${dayNames[dayKey]}</div>
                        </div>
                        <div class="no-workout">Отдых</div>
                    </div>
                `;
            }
        }).join('');
        
        scheduleGrid.innerHTML = scheduleHTML;
    }
    
    function displayNoWeekSchedule() {
        scheduleGrid.innerHTML = `
            <div class="no-workout" style="grid-column: 1 / -1;">
                <div style="font-size: 48px; margin-bottom: 15px;">📝</div>
                <div style="font-size: 18px; margin-bottom: 10px;">Расписание тренировок не создано</div>
                <div style="font-size: 14px; opacity: 0.8;">Ваш тренер еще не составил план тренировок</div>
            </div>
        `;
    }
    
    function displayNoSchedule() {
        trainerInfo.textContent = 'Тренер: не назначен';
        displayNoNextWorkout();
        displayNoWeekSchedule();
    }
});