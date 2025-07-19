document.addEventListener('DOMContentLoaded', function() {
    console.log('Страница детального просмотра клиента загружена');
    
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
    
    // Данные упражнений для каждого дня
    const exerciseData = {
        monday: [],
        tuesday: [],
        wednesday: [],
        thursday: [],
        friday: [],
        saturday: [],
        sunday: []
    };
    
    // Данные времени для каждого дня
    const timeData = {
        monday: { hour: '18', minute: '00' },
        tuesday: { hour: '18', minute: '00' },
        wednesday: { hour: '18', minute: '00' },
        thursday: { hour: '18', minute: '00' },
        friday: { hour: '18', minute: '00' },
        saturday: { hour: '18', minute: '00' },
        sunday: { hour: '18', minute: '00' }
    };
    
    // Обработчики событий
    backBtn.addEventListener('click', function() {
        window.location.href = '/dashboard/trainer/clients';
    });
    
    logoutBtn.addEventListener('click', function() {
        localStorage.clear();
        window.location.href = '/logout';
    });
    
    // Добавь новую функцию инициализации
    async function initializeApp() {
        loadTrainerName();
        await loadClientData();
        setupWeekDates();
        initializeDefaultExercises();
        setupTimeSelectors();
        
        // Загружаем существующее расписание
        await loadScheduleFromServer();
    }

    // Запуск приложения
    initializeApp();
    
    async function loadTrainerName() {
        trainerName.textContent = localStorage.getItem('userName') || 'Тренер';
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
            // Fallback к моковым данным
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
    
    function setupWeekDates() {
        const today = new Date();
        const currentDay = today.getDay(); // 0 = воскресенье, 1 = понедельник
        
        // Находим понедельник СЛЕДУЮЩЕЙ недели
        let mondayOffset;
        if (currentDay === 0) { // воскресенье
            mondayOffset = 1; // следующий понедельник через 1 день
        } else {
            mondayOffset = 8 - currentDay; // дней до следующего понедельника
        }
        
        const nextMonday = new Date(today);
        nextMonday.setDate(today.getDate() + mondayOffset);
        
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        
        days.forEach((day, index) => {
            const date = new Date(nextMonday);
            date.setDate(nextMonday.getDate() + index);
            
            const dayElement = document.getElementById(`${day}-date`);
            if (dayElement) {
                dayElement.textContent = `(${date.getDate()}.${(date.getMonth() + 1).toString().padStart(2, '0')})`;
            }
        });
    }
    
    function initializeDefaultExercises() {
        // Добавляем 3 дефолтных упражнения для понедельника
        const defaultExercises = [
            'Упражнение 1',
            'Упражнение 2', 
            'Упражнение 3'
        ];
        
        const container = document.getElementById('monday-exercises');
        
        defaultExercises.forEach((exerciseText, index) => {
            const exerciseId = `monday-exercise-${Date.now()}-${index}`;
            
            const exerciseElement = document.createElement('div');
            exerciseElement.className = 'exercise-item';
            exerciseElement.id = exerciseId;
            
            exerciseElement.innerHTML = `
                <div class="exercise-number">${index + 1}</div>
                <input type="text" 
                       class="exercise-input" 
                       value="${exerciseText}"
                       placeholder="Введите упражнение..."
                       oninput="updateExercise('monday', '${exerciseId}', this.value)">
                <button class="btn-remove-exercise" onclick="removeExercise('monday', '${exerciseId}')">
                    ✕
                </button>
            `;
            
            container.appendChild(exerciseElement);
            
            // Добавляем упражнение в данные
            exerciseData.monday.push({
                id: exerciseId,
                text: exerciseText
            });
        });
    }
    
    function setupTimeSelectors() {
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        
        days.forEach(day => {
            const hourSelect = document.getElementById(`${day}-hour`);
            const minuteSelect = document.getElementById(`${day}-minute`);
            
            if (hourSelect && minuteSelect) {
                hourSelect.addEventListener('change', function() {
                    timeData[day].hour = this.value;
                    autoSave();
                });
                
                minuteSelect.addEventListener('change', function() {
                    timeData[day].minute = this.value;
                    autoSave();
                });
            }
        });
    }
    
    // Автосохранение
    function autoSave() {
        // Показываем индикатор сохранения
        console.log('Автосохранение...');
        
        // Собираем данные для сохранения
        const exercises = {};
        const times = {};
        
        Object.keys(exerciseData).forEach(day => {
            exercises[day] = exerciseData[day]
                .filter(ex => ex.text.trim() !== '')
                .map(ex => ex.text.trim());
                
            times[day] = timeData[day];
        });
        
        // Отправляем на сервер
        saveScheduleToServer(exercises, times);
    }
    
    // Глобальная функция для добавления упражнения
    window.addExercise = function(day) {
        const container = document.getElementById(`${day}-exercises`);
        const exerciseCount = exerciseData[day].length;
        const exerciseId = `${day}-exercise-${Date.now()}`;
        
        const exerciseElement = document.createElement('div');
        exerciseElement.className = 'exercise-item';
        exerciseElement.id = exerciseId;
        
        exerciseElement.innerHTML = `
            <div class="exercise-number">${exerciseCount + 1}</div>
            <input type="text" 
                   class="exercise-input" 
                   placeholder="Введите упражнение..."
                   oninput="updateExercise('${day}', '${exerciseId}', this.value)">
            <button class="btn-remove-exercise" onclick="removeExercise('${day}', '${exerciseId}')">
                ✕
            </button>
        `;
        
        container.appendChild(exerciseElement);
        
        // Добавляем упражнение в данные
        exerciseData[day].push({
            id: exerciseId,
            text: ''
        });
        
        // Фокус на новое поле
        exerciseElement.querySelector('.exercise-input').focus();
        
        updateExerciseNumbers(day);
        autoSave();
    };
    
    // Глобальная функция для удаления упражнения
    window.removeExercise = function(day, exerciseId) {
        const element = document.getElementById(exerciseId);
        if (element) {
            element.remove();
        }
        
        // Удаляем из данных
        exerciseData[day] = exerciseData[day].filter(ex => ex.id !== exerciseId);
        
        updateExerciseNumbers(day);
        autoSave();
    };
    
    // Глобальная функция для обновления текста упражнения
    window.updateExercise = function(day, exerciseId, text) {
        const exercise = exerciseData[day].find(ex => ex.id === exerciseId);
        if (exercise) {
            exercise.text = text;
            autoSave();
        }
    };
    
    function updateExerciseNumbers(day) {
        const container = document.getElementById(`${day}-exercises`);
        const exercises = container.querySelectorAll('.exercise-item');
        
        exercises.forEach((exercise, index) => {
            const numberElement = exercise.querySelector('.exercise-number');
            if (numberElement) {
                numberElement.textContent = index + 1;
            }
        });
    }
    // Добавь новую функцию для сохранения на сервер
async function saveScheduleToServer(exercises, times) {
    try {
        const response = await fetch(`/api/trainer/clients/${clientId}/schedule`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ exercises, times })
        });
        
        if (response.ok) {
            console.log('Расписание сохранено на сервере');
        } else {
            console.error('Ошибка сохранения расписания');
        }
    } catch (error) {
        console.error('Ошибка сети при сохранении:', error);
    }
}

// Добавь новую функцию для загрузки расписания
async function loadScheduleFromServer() {
    try {
        const response = await fetch(`/api/trainer/clients/${clientId}/schedule`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                // Загружаем упражнения
                Object.keys(data.exercises || {}).forEach(day => {
                    const exercises = data.exercises[day];
                    if (exercises && exercises.length > 0) {
                        loadExercisesForDay(day, exercises);
                    }
                });
                
                // Загружаем время
                Object.keys(data.times || {}).forEach(day => {
                    const time = data.times[day];
                    if (time) {
                        timeData[day] = time;
                        updateTimeSelectors(day, time);
                    }
                });
                
                console.log('Расписание загружено с сервера');
            }
        }
    } catch (error) {
        console.error('Ошибка загрузки расписания:', error);
    }
}

// Добавь функцию для загрузки упражнений для дня
function loadExercisesForDay(day, exercises) {
    const container = document.getElementById(`${day}-exercises`);
    
    // Очищаем контейнер (кроме понедельника с дефолтными упражнениями)
    if (day !== 'monday') {
        container.innerHTML = '';
        exerciseData[day] = [];
    }
    
    exercises.forEach((exerciseText, index) => {
        if (day === 'monday' && index < 3) {
            // Для понедельника обновляем существующие дефолтные упражнения
            const existingInput = container.children[index]?.querySelector('.exercise-input');
            if (existingInput) {
                existingInput.value = exerciseText;
                exerciseData[day][index].text = exerciseText;
            }
        } else {
            // Для остальных дней или дополнительных упражнений добавляем новые
            addExerciseToDOM(day, exerciseText);
        }
    });
}

// Добавь функцию для добавления упражнения в DOM
function addExerciseToDOM(day, text = '') {
    const container = document.getElementById(`${day}-exercises`);
    const exerciseCount = exerciseData[day].length;
    const exerciseId = `${day}-exercise-${Date.now()}-${Math.random()}`;
    
    const exerciseElement = document.createElement('div');
    exerciseElement.className = 'exercise-item';
    exerciseElement.id = exerciseId;
    
    exerciseElement.innerHTML = `
        <div class="exercise-number">${exerciseCount + 1}</div>
        <input type="text" 
               class="exercise-input" 
               value="${text}"
               placeholder="Введите упражнение..."
               oninput="updateExercise('${day}', '${exerciseId}', this.value)">
        <button class="btn-remove-exercise" onclick="removeExercise('${day}', '${exerciseId}')">
            ✕
        </button>
    `;
    
    container.appendChild(exerciseElement);
    
    // Добавляем упражнение в данные
    exerciseData[day].push({
        id: exerciseId,
        text: text
    });
}

// Добавь функцию для обновления селекторов времени
function updateTimeSelectors(day, time) {
    const hourSelect = document.getElementById(`${day}-hour`);
    const minuteSelect = document.getElementById(`${day}-minute`);
    
    if (hourSelect && minuteSelect) {
        hourSelect.value = time.hour;
        minuteSelect.value = time.minute;
    }
}
});