document.addEventListener('DOMContentLoaded', function() {
    console.log('Страница статистики клиента загружена');
    
    const token = localStorage.getItem('authToken');
    const userType = localStorage.getItem('userType');
    
    // Проверка авторизации
    if (!token || userType !== 'trainer') {
        window.location.href = '/';
        return;
    }
    
    // Получение ID клиента из URL
    const urlParams = new URLSearchParams(window.location.search);
    const clientId = urlParams.get('id');
    
    if (!clientId) {
        alert('ID клиента не найден');
        window.location.href = '/dashboard/trainer/clients';
        return;
    }
    
    // Элементы DOM
    const backBtn = document.getElementById('backBtn');
    const trainerName = document.getElementById('trainerName');
    const logoutBtn = document.getElementById('logoutBtn');
    const clientFullName = document.getElementById('clientFullName');
    const clientUsername = document.getElementById('clientUsername');
    const joinDate = document.getElementById('joinDate');
    const clientAvatar = document.getElementById('clientAvatar');
    const currentWeight = document.getElementById('currentWeight');
    const exerciseStatsContainer = document.getElementById('exerciseStatsContainer');


    const weightMinusBtn = document.getElementById('weightMinusBtn');
    const weightPlusBtn = document.getElementById('weightPlusBtn');

    // Обработчики для кнопок веса
    weightMinusBtn.addEventListener('click', function() {
        changeWeight(-0.5);
    });

    weightPlusBtn.addEventListener('click', function() {
        changeWeight(0.5);
    });
    
    // Обработчики событий
    backBtn.addEventListener('click', function() {
        window.location.href = '/dashboard/trainer/clients';
    });
    
    logoutBtn.addEventListener('click', function() {
        localStorage.clear();
        window.location.href = '/logout';
    });

    
    // Инициализация
    loadTrainerName();
    loadClientData();
    loadClientStats();


    function changeWeight(delta) {
        const currentValue = parseFloat(currentWeight.value) || 0;
        const newValue = Math.max(0, currentValue + delta);
        currentWeight.value = newValue.toFixed(1);
        
        // Автосохранение веса
        autoSaveWeight(newValue);
    }

    async function autoSaveWeight(weight) {
        try {
            const response = await fetch(`/api/trainer/clients/${clientId}/stats`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    currentWeight: weight
                })
            });
            
            if (response.ok) {
                console.log('Вес автоматически сохранен');
            }
        } catch (error) {
        console.error('Ошибка автосохранения веса:', error);
    }
}
    
    async function loadTrainerName() {
        trainerName.textContent = localStorage.getItem('userName') || 'Тренер';
        
        // Отображаем текущее время
        const now = new Date();
        const timeString = now.toLocaleString('ru-RU', {
            day: '2-digit',
            month: '2-digit', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        console.log('Текущее время:', timeString);
        
        const workoutTimestamp = document.getElementById('workoutTimestamp');
        console.log('Элемент времени найден:', workoutTimestamp);
        
        if (workoutTimestamp) {
            workoutTimestamp.textContent = timeString;
            console.log('Время установлено в элемент');
        } else {
            console.log('Элемент workoutTimestamp не найден!');
        }
    }
    
    async function loadClientData() {
        try {
            const response = await fetch(`/api/trainer/clients/${clientId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                displayClientInfo(data.client);
            } else {
                throw new Error('Ошибка загрузки данных клиента');
            }
        } catch (error) {
            console.error('Ошибка загрузки данных клиента:', error);
            const mockClient = {
                id: clientId,
                name: 'Клиент',
                username: 'client',
                joinedAt: new Date().toISOString()
            };
            displayClientInfo(mockClient);
        }
    }
    
    function displayClientInfo(client) {
        const initials = getInitials(client.name);
        const joinDateFormatted = new Date(client.joinedAt).toLocaleDateString('ru-RU');
        
        clientFullName.textContent = client.name;
        clientUsername.textContent = `@${client.username}`;
        joinDate.textContent = `Присоединился: ${joinDateFormatted}`;
        clientAvatar.textContent = initials;
    }
    
    function getInitials(name) {
        return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
    }
    
    async function loadClientStats() {
    try {
        // Загружаем расписание клиента чтобы получить список упражнений
        const scheduleResponse = await fetch(`/api/trainer/clients/${clientId}/schedule`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        // Загружаем существующую статистику
        const statsResponse = await fetch(`/api/trainer/clients/${clientId}/stats`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (scheduleResponse.ok && statsResponse.ok) {
            const scheduleData = await scheduleResponse.json();
            const statsData = await statsResponse.json();

            // Добавь эти строки для отладки
    console.log('Полученные данные с сервера:', statsData);
    console.log('Статус тренировки:', statsData.workoutStarted);
    console.log('Время начала:', statsData.workoutStartTime);
            
            // Устанавливаем текущий вес
            currentWeight.value = statsData.currentWeight || '';
            
            // Проверяем статус тренировки
            if (statsData.workoutStarted && statsData.workoutStartTime) {
                workoutStarted = true;
                const startTime = new Date(statsData.workoutStartTime);
                const timeString = startTime.toLocaleString('ru-RU', {
                    day: '2-digit',
                    month: '2-digit', 
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
                
                const workoutTimestamp = document.getElementById('workoutTimestamp');
                if (workoutTimestamp) {
                    workoutTimestamp.textContent = `Тренировка началась: ${timeString}`;
                    workoutTimestamp.style.background = '#48bb78';
                    workoutTimestamp.style.color = 'white';
                }
            }
            
            // Собираем все уникальные упражнения из расписания
            const allExercises = new Set();
            Object.values(scheduleData.exercises || {}).forEach(dayExercises => {
                dayExercises.forEach(exercise => {
                    if (exercise.trim()) {
                        allExercises.add(exercise.trim());
                    }
                });
            });
            
            if (allExercises.size === 0) {
                exerciseStatsContainer.innerHTML = '<div class="no-exercises-message">Сначала добавьте упражнения в расписание</div>';
                return;
            }
            
            // Отображаем упражнения
            displayExercises(Array.from(allExercises), statsData.exerciseResults || []);
            
        } else {
            throw new Error('Ошибка загрузки данных');
        }
    } catch (error) {
        console.error('Ошибка загрузки статистики:', error);
        exerciseStatsContainer.innerHTML = '<div class="no-exercises-message">Ошибка загрузки данных</div>';
    }
}

    function displayExercises(exercises, existingResults) {
        const exercisesHTML = exercises.map(exerciseName => {
            const existingResult = existingResults.find(r => r.exerciseName === exerciseName);
            
            return `
                <div class="exercise-stat-item">
                    <div class="exercise-stat-header">${exerciseName}</div>
                    <div class="exercise-inputs">
                        <div class="input-group">
                            <label>Вес (кг)</label>
                            <input type="number" 
                                data-exercise="${exerciseName}" 
                                data-field="weight" 
                                value="${existingResult?.weight || 0}" 
                                placeholder="0" 
                                min="0" 
                                step="0.5"
                                oninput="autoSaveExercise('${exerciseName}')">
                        </div>
                        <div class="input-group">
                            <label>Подходы</label>
                            <input type="number" 
                                data-exercise="${exerciseName}" 
                                data-field="sets" 
                                value="${existingResult?.sets || 4}" 
                                placeholder="4" 
                                min="0"
                                oninput="autoSaveExercise('${exerciseName}')">
                        </div>
                        <div class="input-group">
                            <label>Повторения</label>
                            <input type="number" 
                                data-exercise="${exerciseName}" 
                                data-field="reps" 
                                value="${existingResult?.reps || 10}" 
                                placeholder="10" 
                                min="0"
                                oninput="autoSaveExercise('${exerciseName}')">
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        exerciseStatsContainer.innerHTML = exercisesHTML;
    }

    let workoutStarted = false;

// Глобальная функция для автосохранения упражнений
window.autoSaveExercise = async function(exerciseName) {
    // Если тренировка еще не начата, фиксируем начало
    if (!workoutStarted) {
        markWorkoutStart();
        workoutStarted = true;
    }
    
    // Собираем данные текущего упражнения
    const exerciseItem = document.querySelector(`[data-exercise="${exerciseName}"]`).closest('.exercise-stat-item');
    const weightInput = exerciseItem.querySelector('[data-field="weight"]');
    const setsInput = exerciseItem.querySelector('[data-field="sets"]');
    const repsInput = exerciseItem.querySelector('[data-field="reps"]');
    
    const exerciseData = {
        exerciseName: exerciseName,
        weight: parseFloat(weightInput.value) || 0,
        sets: parseInt(setsInput.value) || 0,
        reps: parseInt(repsInput.value) || 0
    };
    
    // Сохраняем данные упражнения
    await saveExerciseData(exerciseData);
};

async function markWorkoutStart() {
    try {
        // Отправляем запрос на сервер для фиксации начала тренировки
        const response = await fetch(`/api/trainer/clients/${clientId}/start-workout`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('Тренировка зафиксирована на сервере:', data);
            
            // Показываем уведомление о начале тренировки
            showWorkoutNotification();
            
            // Обновляем время начала тренировки
            const startTime = new Date(data.workoutStartTime);
            const timeString = startTime.toLocaleString('ru-RU', {
                day: '2-digit',
                month: '2-digit', 
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            
            const workoutTimestamp = document.getElementById('workoutTimestamp');
            if (workoutTimestamp) {
                workoutTimestamp.textContent = `Тренировка началась: ${timeString}`;
                workoutTimestamp.style.background = '#48bb78';
                workoutTimestamp.style.color = 'white';
            }
        }
    } catch (error) {
        console.error('Ошибка фиксации начала тренировки:', error);
    }
}

function showWorkoutNotification() {
    // Создаем уведомление
    const notification = document.createElement('div');
    notification.innerHTML = `
        <div style="position: fixed; top: 20px; right: 20px; background: #48bb78; color: white; 
                    padding: 15px 20px; border-radius: 10px; z-index: 1000; box-shadow: 0 5px 15px rgba(0,0,0,0.2);">
            <strong>🚀 Тренировка началась!</strong><br>
            Удачи вам и вашему победителю! 💪
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Убираем уведомление через 4 секунды
    setTimeout(() => {
        document.body.removeChild(notification);
    }, 4000);
}

async function saveExerciseData(exerciseData) {
    try {
        // Получаем все текущие результаты упражнений
        const allExerciseResults = [];
        const exerciseItems = exerciseStatsContainer.querySelectorAll('.exercise-stat-item');
        
        exerciseItems.forEach(item => {
            const exerciseName = item.querySelector('.exercise-stat-header').textContent;
            const weightInput = item.querySelector('[data-field="weight"]');
            const setsInput = item.querySelector('[data-field="sets"]');
            const repsInput = item.querySelector('[data-field="reps"]');
            
            allExerciseResults.push({
                exerciseName: exerciseName,
                weight: parseFloat(weightInput.value) || 0,
                sets: parseInt(setsInput.value) || 0,
                reps: parseInt(repsInput.value) || 0
            });
        });
        
        // Отправляем все данные на сервер
        const response = await fetch(`/api/trainer/clients/${clientId}/stats`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                exerciseResults: allExerciseResults
            })
        });
        
        if (response.ok) {
            console.log('Данные упражнения сохранены');
        }
    } catch (error) {
        console.error('Ошибка сохранения упражнения:', error);
    }
}
    
});