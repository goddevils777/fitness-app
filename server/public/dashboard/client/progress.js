document.addEventListener('DOMContentLoaded', function() {
    console.log('Страница прогресса загружена');
    
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
    const lastUpdate = document.getElementById('lastUpdate');
    const currentWeight = document.getElementById('currentWeight');
    const totalWorkouts = document.getElementById('totalWorkouts');
    const totalExercises = document.getElementById('totalExercises');
    const progressHistory = document.getElementById('progressHistory');
    const exercisesProgress = document.getElementById('exercisesProgress');
    
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
    loadProgressData();
    
    function loadClientName() {
        clientName.textContent = localStorage.getItem('userName') || 'Победитель';
    }
    
    async function loadProgressData() {
        try {
            const response = await fetch('/api/client/progress', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                displayProgressData(data);
            } else {
                throw new Error('Ошибка загрузки прогресса');
            }
        } catch (error) {
            console.error('Ошибка:', error);
            displayNoData();
        }
    }
    
    function displayProgressData(data) {
        if (!data.hasData) {
            displayNoData();
            return;
        }
        
        // Отображаем текущие показатели
        currentWeight.textContent = data.currentWeight || '0';
        totalWorkouts.textContent = data.totalWorkouts || '0';
        totalExercises.textContent = data.totalExercises || '0';
        
        // Отображаем время последнего обновления
        if (data.lastUpdate) {
            const updateDate = new Date(data.lastUpdate);
            lastUpdate.textContent = `Обновлено: ${updateDate.toLocaleString('ru-RU')}`;
        }
        
        // Отображаем историю тренировок
        displayWorkoutHistory(data.workoutHistory);
        
        // Отображаем прогресс по упражнениям
        displayExerciseProgress(data.exerciseProgress);
    }
    
    function displayWorkoutHistory(workoutHistory) {
        if (workoutHistory.length === 0) {
            progressHistory.innerHTML = `
                <div class="no-data">
                    <div style="font-size: 48px; margin-bottom: 15px;">📊</div>
                    <div>История тренировок пуста</div>
                    <div style="font-size: 14px; margin-top: 10px; opacity: 0.7;">
                        Начните тренироваться, чтобы увидеть свой прогресс
                    </div>
                </div>
            `;
            return;
        }
        
        const historyHTML = workoutHistory.map(workout => {
            const workoutDate = new Date(workout.date);
            const dateString = workoutDate.toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });
            
            const exercisesHTML = workout.exercises.map(exercise => `
                <div class="exercise-result">
                    <div class="exercise-name">${exercise.exerciseName}</div>
                    <div class="exercise-stats">
                        ${exercise.weight > 0 ? `${exercise.weight} кг` : ''} 
                        ${exercise.sets > 0 ? `${exercise.sets} подх.` : ''} 
                        ${exercise.reps > 0 ? `${exercise.reps} повт.` : ''}
                    </div>
                </div>
            `).join('');
            
            return `
                <div class="workout-entry">
                    <div class="workout-header">
                        <div class="workout-date">📅 ${dateString}</div>
                        ${workout.weight > 0 ? `<div class="workout-weight">⚖️ ${workout.weight} кг</div>` : ''}
                    </div>
                    <div class="workout-exercises">
                        ${exercisesHTML}
                    </div>
                </div>
            `;
        }).join('');
        
        progressHistory.innerHTML = historyHTML;
    }
    
    function displayExerciseProgress(exerciseProgress) {
        const exercises = Object.keys(exerciseProgress);
        
        if (exercises.length === 0) {
            exercisesProgress.innerHTML = `
                <div class="no-data">
                    <div style="font-size: 48px; margin-bottom: 15px;">🏋️</div>
                    <div>Нет данных по упражнениям</div>
                    <div style="font-size: 14px; margin-top: 10px; opacity: 0.7;">
                        Выполните тренировку, чтобы увидеть прогресс
                    </div>
                </div>
            `;
            return;
        }
        
        const progressHTML = exercises.map(exerciseName => {
            const progress = exerciseProgress[exerciseName];
            
            const timelineHTML = progress.map(entry => {
                const entryDate = new Date(entry.date);
                const dateString = entryDate.toLocaleDateString('ru-RU');
                
                let statsText = '';
                if (entry.weight > 0) statsText += `${entry.weight} кг `;
                if (entry.sets > 0) statsText += `${entry.sets} подх. `;
                if (entry.reps > 0) statsText += `${entry.reps} повт.`;
                
                return `
                    <div class="timeline-entry">
                        <div class="timeline-date">${dateString}</div>
                        <div class="timeline-stats">${statsText || 'Нет данных'}</div>
                    </div>
                `;
            }).join('');
            
            return `
                <div class="exercise-progress-item">
                    <div class="exercise-progress-header">${exerciseName}</div>
                    <div class="progress-timeline">
                        ${timelineHTML}
                    </div>
                </div>
            `;
        }).join('');
        
        exercisesProgress.innerHTML = progressHTML;
    }
    
    function displayNoData() {
        currentWeight.textContent = '0';
        totalWorkouts.textContent = '0';
        totalExercises.textContent = '0';
        lastUpdate.textContent = 'Обновлено: никогда';
        
        progressHistory.innerHTML = `
            <div class="no-data">
                <div style="font-size: 48px; margin-bottom: 15px;">📊</div>
                <div>Нет данных о тренировках</div>
                <div style="font-size: 14px; margin-top: 10px; opacity: 0.7;">
                    Обратитесь к тренеру для назначения программы
                </div>
            </div>
        `;
        
        exercisesProgress.innerHTML = `
            <div class="no-data">
                <div style="font-size: 48px; margin-bottom: 15px;">🏋️</div>
                <div>Нет данных по упражнениям</div>
            </div>
        `;
    }
});