document.addEventListener('DOMContentLoaded', function() {
    console.log('Страница питания клиента загружена');
    
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
    const todayDate = document.getElementById('todayDate');
    const todayMealsContainer = document.getElementById('todayMealsContainer');
    const trainerInfo = document.getElementById('trainerInfo');
    const weeklyNutritionGrid = document.getElementById('weeklyNutritionGrid');
    
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
    setTodayDate();
    loadNutritionData();
    
    function loadClientName() {
        clientName.textContent = localStorage.getItem('userName') || 'Победитель';
    }
    
    function setTodayDate() {
        const today = new Date();
        const dateString = today.toLocaleDateString('ru-RU', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
        todayDate.textContent = dateString;
    }
    
    async function loadNutritionData() {
        try {
            const response = await fetch('/api/client/nutrition', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                displayNutritionData(data);
            } else {
                throw new Error('Ошибка загрузки плана питания');
            }
        } catch (error) {
            console.error('Ошибка:', error);
            displayNoNutrition();
        }
    }
    
    function displayNutritionData(data) {
        // Отображаем информацию о тренере
        if (data.trainerName) {
            trainerInfo.textContent = `👨‍🏫 Составлен тренером: ${data.trainerName}`;
        } else {
            trainerInfo.textContent = '👨‍🏫 Тренер не назначен';
        }
        
        if (!data.hasNutrition) {
            displayNoNutrition();
            return;
        }
        
        // Отображаем сегодняшние блюда
        displayTodayMeals(data.todayMeals);
        
        // Отображаем недельный план
        displayWeeklyNutrition(data.weekNutrition);
    }
    
    function displayTodayMeals(todayMeals) {
        if (todayMeals.length === 0) {
            todayMealsContainer.innerHTML = `
                <div class="no-meals">
                    <div style="font-size: 48px; margin-bottom: 15px;">🍽️</div>
                    <div>На сегодня блюда не запланированы</div>
                    <div style="font-size: 14px; margin-top: 10px; opacity: 0.7;">
                        Обратитесь к тренеру для составления плана питания
                    </div>
                </div>
            `;
            return;
        }
        
        const mealsHTML = todayMeals.map(meal => `
            <div class="meal-card">
                <div class="meal-time">${meal.time.hour}:${meal.time.minute}</div>
                <div class="meal-name">${meal.name}</div>
                <div class="meal-calories">${meal.calories} ккал</div>
            </div>
        `).join('');
        
        todayMealsContainer.innerHTML = mealsHTML;
    }
    
    function displayWeeklyNutrition(weekNutrition) {
        if (weekNutrition.length === 0) {
            weeklyNutritionGrid.innerHTML = `
                <div class="no-nutrition">
                    <div style="font-size: 48px; margin-bottom: 15px;">📅</div>
                    <div>План питания не составлен</div>
                    <div style="font-size: 14px; margin-top: 10px; opacity: 0.7;">
                        Ваш тренер еще не создал недельный план питания
                    </div>
                </div>
            `;
            return;
        }
        
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
        const todayKey = Object.keys(dayNames)[today === 0 ? 6 : today - 1];
        
        const allDays = Object.keys(dayNames);
        
        const nutritionHTML = allDays.map(dayKey => {
            const dayNutrition = weekNutrition.find(w => w.day === dayKey);
            const isToday = dayKey === todayKey;
            
            if (dayNutrition) {
                const totalCalories = dayNutrition.meals.reduce((sum, meal) => sum + meal.calories, 0);
                
                const mealsHTML = dayNutrition.meals
                    .sort((a, b) => a.order - b.order)
                    .map(meal => `
                        <div class="day-meal-item">
                            <div class="meal-info">
                                <div class="meal-item-name">${meal.name}</div>
                                <div class="meal-item-time">🕐 ${meal.time.hour}:${meal.time.minute}</div>
                            </div>
                            <div class="meal-item-calories">${meal.calories} ккал</div>
                        </div>
                    `).join('');
                
                return `
                    <div class="day-nutrition-card${isToday ? ' today' : ''}">
                        <div class="day-header">
                            <div class="day-name">${dayNames[dayKey]}</div>
                            <div class="day-total-calories">🔥 ${totalCalories} ккал</div>
                        </div>
                        <div class="day-meals-list">
                            ${mealsHTML}
                        </div>
                    </div>
                `;
            } else {
                return `
                    <div class="day-nutrition-card${isToday ? ' today' : ''}">
                        <div class="day-header">
                            <div class="day-name">${dayNames[dayKey]}</div>
                        </div>
                        <div class="no-meals">Питание не запланировано</div>
                    </div>
                `;
            }
        }).join('');
        
        weeklyNutritionGrid.innerHTML = nutritionHTML;
    }
    
    function displayNoNutrition() {
        trainerInfo.textContent = '👨‍🏫 Тренер не назначен';
        
        todayMealsContainer.innerHTML = `
            <div class="no-meals">
                <div style="font-size: 48px; margin-bottom: 15px;">🍽️</div>
                <div>План питания не составлен</div>
                <div style="font-size: 14px; margin-top: 10px; opacity: 0.7;">
                    Обратитесь к тренеру для составления плана питания
                </div>
            </div>
        `;
        
        weeklyNutritionGrid.innerHTML = `
            <div class="no-nutrition">
                <div style="font-size: 48px; margin-bottom: 15px;">📅</div>
                <div>План питания не составлен</div>
                <div style="font-size: 14px; margin-top: 10px; opacity: 0.7;">
                    Ваш тренер еще не создал план питания
                </div>
            </div>
        `;
    }
});