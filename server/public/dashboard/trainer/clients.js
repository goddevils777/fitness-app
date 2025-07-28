document.addEventListener('DOMContentLoaded', function() {
    console.log('Страница клиентов загружена');
    
    const token = localStorage.getItem('authToken');
    const userType = localStorage.getItem('userType');
    
    // Проверка авторизации
    if (!token || userType !== 'trainer') {
        window.location.href = '/';
        return;
    }
    
    // Элементы DOM
    const backBtn = document.getElementById('backBtn');
    const trainerName = document.getElementById('trainerName');
    const logoutBtn = document.getElementById('logoutBtn');
    const loading = document.getElementById('loading');
    const clientsList = document.getElementById('clientsList');
    const noClients = document.getElementById('noClients');
    const createInviteBtn = document.getElementById('createInviteBtn');
    
    // Обработчики событий
    backBtn.addEventListener('click', function() {
        window.location.href = '/dashboard/trainer';
    });
    
    logoutBtn.addEventListener('click', function() {
        localStorage.clear();
        window.location.href = '/logout';
    });
    
    createInviteBtn.addEventListener('click', function() {
        window.location.href = '/dashboard/trainer';
    });
    
    // Загрузка данных
    loadTrainerName();
    loadClients();
    
    async function loadTrainerName() {
        try {
            const response = await fetch('/api/trainer/profile', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                trainerName.textContent = data.name;
            }
        } catch (error) {
            trainerName.textContent = localStorage.getItem('userName') || 'Тренер';
        }
    }
    
    async function loadClients() {
        try {
            const response = await fetch('/api/trainer/clients', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                displayClients(data.clients);
            } else {
                throw new Error('Ошибка загрузки клиентов');
            }
        } catch (error) {
            console.error('Ошибка загрузки клиентов:', error);
            loading.textContent = 'Ошибка загрузки клиентов';
        }
    }
    
    function displayClients(clients) {
        loading.classList.add('hidden');
        
        if (clients.length === 0) {
            noClients.classList.remove('hidden');
            return;
        }
        
        clientsList.classList.remove('hidden');
        
        const clientsHTML = clients.map(client => {
            const joinDate = new Date(client.joinedAt).toLocaleDateString('ru-RU');
            const initials = getInitials(client.name);
            
            return `
                <div class="client-card">
                    <div class="client-header">
                        <div class="client-avatar">${initials}</div>
                        <div class="client-info">
                            <h3>${client.name}</h3>
                            <div class="client-username">@${client.username || 'не указан'}</div>
                        </div>
                    </div>
                    
                    <div class="client-stats">
                        <div class="stat-item">
                            <span class="stat-value">8</span>
                            <div class="stat-label">Тренировок</div>
                        </div>
                        <div class="stat-item">
                            <span class="stat-value">3</span>
                            <div class="stat-label">Дней подряд</div>
                        </div>
                    </div>
                    
                    <div class="join-date">Присоединился: ${joinDate}</div>
                    
                    <div class="client-actions">
                        <button class="btn-small btn-primary" onclick="viewClientDetails('${client.id}')">
                            👁️ Детали
                        </button>
                        <button class="btn-small btn-secondary" onclick="createWorkout('${client.id}')">
                            💪 Тренировка
                        </button>
                        <button class="btn-small btn-nutrition" onclick="manageNutrition('${client.id}')">
                            🥗 Питание
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        
        clientsList.innerHTML = clientsHTML;
    }
    
    function getInitials(name) {
        return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
    }
    
    // Глобальные функции для кнопок
    window.viewClientDetails = function(clientId) {
        window.location.href = `/dashboard/trainer/client-stats?id=${clientId}`;
    };
    
    window.createWorkout = function(clientId) {
        window.location.href = `/dashboard/trainer/client-detail?id=${clientId}`;
    };

    window.manageNutrition = function(clientId) {
        window.location.href = `/dashboard/trainer/client-nutrition?id=${clientId}`;
    };
    
});