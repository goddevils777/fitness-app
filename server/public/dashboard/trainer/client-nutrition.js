document.addEventListener('DOMContentLoaded', function() {
    console.log('Страница плана питания загружена');
    
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
    
    // Данные блюд для каждого дня
    const mealsData = {
        monday: [],
        tuesday: [],
        wednesday: [],
        thursday: [],
        friday: [],
        saturday: [],
        sunday: []
    };
    
    // Данные времени для каждого дня
    const timesData = {
        monday: [],
        tuesday: [],
        wednesday: [],
        thursday: [],
        friday: [],
        saturday: [],
        sunday: []
    };
    
    // Обработчики событий
    backBtn.addEventListener('click', function() {
        window.location.href = '/dashboard/trainer/clients';
    });
    
    logoutBtn.addEventListener('click', function() {
        localStorage.clear();
        window.location.href = '/logout';
    });
    
    // Инициализация
    initializeApp();
    
    async function initializeApp() {
        loadTrainerName();
        await loadClientData();
        setupWeekDates();
        initializeDefaultMeals();
        
        // Загружаем существующий план питания
        await loadNutritionFromServer();
    }
    
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
        const currentDay = today.getDay();
        
        let mondayOffset;
        if (currentDay === 0) {
            mondayOffset = 1;
        } else {
            mondayOffset = 8 - currentDay;
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
    
    function initializeDefaultMeals() {
        // Добавляем 3 дефолтных блюда для понедельника
        const defaultMeals = [
            { name: 'Завтрак', calories: 400 },
            { name: 'Обед', calories: 600 },
            { name: 'Ужин', calories: 500 }
        ];
        
        const container = document.getElementById('monday-meals');
        
        defaultMeals.forEach((meal, index) => {
            const mealId = `monday-meal-${Date.now()}-${index}`;
            addMealToDOM('monday', meal.name, meal.calories, { hour: '08', minute: '00' }, mealId);
            
            mealsData.monday.push({
                id: mealId,
                name: meal.name,
                calories: meal.calories
            });
            
            timesData.monday.push({ hour: '08', minute: '00' });
        });
        
        updateCaloriesDisplay('monday');
    }
    
    // Глобальная функция для добавления блюда
    window.addMeal = function(day) {
        const container = document.getElementById(`${day}-meals`);
        const mealCount = mealsData[day].length;
        const mealId = `${day}-meal-${Date.now()}`;
        
        addMealToDOM(day, '', 0, { hour: '12', minute: '00' }, mealId);
        
        mealsData[day].push({
            id: mealId,
            name: '',
            calories: 0
        });
        
        timesData[day].push({ hour: '12', minute: '00' });
        
        updateMealNumbers(day);
        autoSave();
    };
    
    function addMealToDOM(day, name = '', calories = 0, time = { hour: '12', minute: '00' }, mealId = null) {
        const container = document.getElementById(`${day}-meals`);
        const mealCount = mealsData[day].length;
        const id = mealId || `${day}-meal-${Date.now()}`;
        
        const mealElement = document.createElement('div');
        mealElement.className = 'meal-item';
        mealElement.id = id;
        
        mealElement.innerHTML = `
            <div class="meal-header">
                <div class="meal-number">${mealCount + 1}</div>
                <button class="btn-remove-meal" onclick="removeMeal('${day}', '${id}')">✕</button>
            </div>
            <div class="meal-inputs">
                <div class="input-group">
                    <label>Название блюда</label>
                    <input type="text" 
                           value="${name}"
                           placeholder="Введите название..."
                           oninput="updateMeal('${day}', '${id}', 'name', this.value)">
                </div>
                <div class="input-group">
                    <label>Калории</label>
                    <input type="number" 
                           value="${calories}"
                           placeholder="0"
                           min="0"
                           oninput="updateMeal('${day}', '${id}', 'calories', this.value)">
                </div>
                <div class="input-group">
                    <label>Время</label>
                    <div class="time-inputs">
                        <select onchange="updateMealTime('${day}', '${id}', 'hour', this.value)">
                            ${generateHourOptions(time.hour)}
                        </select>
                        <span class="time-separator">:</span>
                        <select onchange="updateMealTime('${day}', '${id}', 'minute', this.value)">
                            ${generateMinuteOptions(time.minute)}
                        </select>
                    </div>
                </div>
            </div>
        `;
        
        container.appendChild(mealElement);
    }
    
    function generateHourOptions(selectedHour) {
        let options = '';
        for (let i = 6; i <= 23; i++) {
            const hour = i.toString().padStart(2, '0');
            options += `<option value="${hour}" ${hour === selectedHour ? 'selected' : ''}>${hour}</option>`;
        }
        return options;
    }
    
    function generateMinuteOptions(selectedMinute) {
        const minutes = ['00', '15', '30', '45'];
        return minutes.map(minute => 
            `<option value="${minute}" ${minute === selectedMinute ? 'selected' : ''}>${minute}</option>`
        ).join('');
    }
    
    // Глобальная функция для удаления блюда
    window.removeMeal = function(day, mealId) {
        const element = document.getElementById(mealId);
        if (element) {
            element.remove();
        }
        
        const mealIndex = mealsData[day].findIndex(meal => meal.id === mealId);
        if (mealIndex !== -1) {
            mealsData[day].splice(mealIndex, 1);
            timesData[day].splice(mealIndex, 1);
        }
        
        updateMealNumbers(day);
        updateCaloriesDisplay(day);
        autoSave();
    };
    
    // Глобальная функция для обновления данных блюда
    window.updateMeal = function(day, mealId, field, value) {
        const meal = mealsData[day].find(m => m.id === mealId);
        if (meal) {
            if (field === 'calories') {
                meal[field] = parseInt(value) || 0;
                updateCaloriesDisplay(day);
            } else {
                meal[field] = value;
            }
            autoSave();
        }
    };
    
    // Глобальная функция для обновления времени блюда
    window.updateMealTime = function(day, mealId, timeField, value) {
        const mealIndex = mealsData[day].findIndex(m => m.id === mealId);
        if (mealIndex !== -1) {
            timesData[day][mealIndex][timeField] = value;
            autoSave();
        }
    };
    
    function updateMealNumbers(day) {
        const container = document.getElementById(`${day}-meals`);
        const meals = container.querySelectorAll('.meal-item');
        
        meals.forEach((meal, index) => {
            const numberElement = meal.querySelector('.meal-number');
            if (numberElement) {
                numberElement.textContent = index + 1;
            }
        });
    }
    
    function updateCaloriesDisplay(day) {
        const container = document.getElementById(`${day}-meals`);
        let existingDisplay = container.querySelector('.calories-display');
        
        const totalCalories = mealsData[day].reduce((sum, meal) => sum + (meal.calories || 0), 0);
        
        if (!existingDisplay) {
            existingDisplay = document.createElement('div');
            existingDisplay.className = 'calories-display';
            container.appendChild(existingDisplay);
        }
        
        existingDisplay.textContent = `Всего калорий: ${totalCalories}`;
    }
    
    // Автосохранение
    function autoSave() {
        console.log('Автосохранение плана питания...');
        saveNutritionToServer();
    }
    
    async function saveNutritionToServer() {
        try {
            const meals = {};
            const times = {};
            
            Object.keys(mealsData).forEach(day => {
                meals[day] = mealsData[day]
                    .filter(meal => meal.name.trim() !== '')
                    .map(meal => ({
                        name: meal.name.trim(),
                        calories: meal.calories || 0
                    }));
                    
                times[day] = timesData[day] || [];
            });
            
            const response = await fetch(`/api/trainer/clients/${clientId}/nutrition`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ meals, times })
            });
            
            if (response.ok) {
                console.log('План питания сохранен на сервере');
            } else {
                console.error('Ошибка сохранения плана питания');
            }
        } catch (error) {
            console.error('Ошибка сети при сохранении:', error);
        }
    }
    
    async function loadNutritionFromServer() {
        try {
            const response = await fetch(`/api/trainer/clients/${clientId}/nutrition`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.meals) {
                    loadMealsForAllDays(data.meals, data.times);
                    console.log('План питания загружен с сервера');
                }
            }
        } catch (error) {
            console.error('Ошибка загрузки плана питания:', error);
        }
    }
    
    function loadMealsForAllDays(meals, times) {
        Object.keys(meals).forEach(day => {
            if (day !== 'monday') { // Понедельник уже инициализирован
                const container = document.getElementById(`${day}-meals`);
                container.innerHTML = '';
                mealsData[day] = [];
                timesData[day] = [];
            }
            
            const dayMeals = meals[day] || [];
            const dayTimes = times[day] || [];
            
            dayMeals.forEach((meal, index) => {
                if (day === 'monday' && index < 3) {
                    // Обновляем существующие блюда понедельника
                    const existingInputs = document.querySelectorAll(`#monday-meals .meal-item:nth-child(${index + 1}) input`);
                    if (existingInputs.length >= 2) {
                        existingInputs[0].value = meal.name;
                        existingInputs[1].value = meal.calories;
                        mealsData[day][index].name = meal.name;
                        mealsData[day][index].calories = meal.calories;
                    }
                } else {
                    // Добавляем новые блюда
                    const mealId = `${day}-meal-${Date.now()}-${Math.random()}`;
                    const mealTime = dayTimes[index] || { hour: '12', minute: '00' };
                    
                    addMealToDOM(day, meal.name, meal.calories, mealTime, mealId);
                    
                    mealsData[day].push({
                        id: mealId,
                        name: meal.name,
                        calories: meal.calories
                    });
                    
                    timesData[day].push(mealTime);
                }
            });
            
            updateCaloriesDisplay(day);
        });
    }
});