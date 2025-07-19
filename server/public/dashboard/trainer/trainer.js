document.addEventListener('DOMContentLoaded', function() {
    console.log('Дашборд тренера загружен');
    
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
    
    if (userType !== 'trainer') {
        if (userType === 'client') {
            // Пользователь клиент, перенаправляем на дашборд клиента
            window.location.href = '/dashboard/client';
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
            const response = await fetch('/api/trainer/profile', {
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
        const trainerName = document.getElementById('trainerName');
        const totalClients = document.getElementById('totalClients');
        const activeWorkouts = document.getElementById('activeWorkouts');
        const monthlyIncome = document.getElementById('monthlyIncome');
        const addClientBtn = document.getElementById('addClientBtn');
        const viewClientsBtn = document.getElementById('viewClientsBtn');
        const inviteModal = document.getElementById('inviteModal');
        const inviteLink = document.getElementById('inviteLink');
        const copyLinkBtn = document.getElementById('copyLinkBtn');
        const closeModalBtn = document.getElementById('closeModalBtn');
        const logoutBtn = document.getElementById('logoutBtn');
        
        console.log('Элементы найдены:', {
            addClientBtn: !!addClientBtn,
            inviteModal: !!inviteModal,
            inviteLink: !!inviteLink,
            closeModalBtn: !!closeModalBtn
        });
        
        // Загрузка данных тренера
        loadTrainerData();
        
        // Обработчики событий
        addClientBtn.addEventListener('click', function() {
            console.log('Кнопка добавления клиента нажата');
            generateInviteLink();
        });
        
        copyLinkBtn.addEventListener('click', copyInviteLink);
        closeModalBtn.addEventListener('click', function() {
            console.log('Кнопка закрытия нажата');
            closeModal();
        });
        logoutBtn.addEventListener('click', logout);
        
        // Закрытие модального окна по клику вне его
        inviteModal.addEventListener('click', function(e) {
            if (e.target === inviteModal) {
                closeModal();
            }
        });

        viewClientsBtn.addEventListener('click', function() {
            window.location.href = '/dashboard/trainer/clients';
        });
        
        // Функции
        async function loadTrainerData() {
            try {
                const response = await fetch('/api/trainer/profile', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    trainerName.textContent = data.name;
                    totalClients.textContent = data.clientsCount || 0;
                    activeWorkouts.textContent = data.activeWorkouts || 0;
                    monthlyIncome.textContent = `${data.monthlyIncome || 0}₴`;
                } else {
                    throw new Error('Ошибка загрузки профиля');
                }
            } catch (error) {
                console.error('Ошибка загрузки данных:', error);
                // Fallback к моковым данным
                trainerName.textContent = localStorage.getItem('userName') || 'Тренер';
                totalClients.textContent = '0';
                activeWorkouts.textContent = '0';
                monthlyIncome.textContent = '0₴';
            }
        }
        
        async function generateInviteLink() {
            console.log('Генерация ссылки начата');
            
            try {
                const response = await fetch('/api/trainer/generate-invite', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    const link = data.inviteLink;
                    console.log('Сгенерированная ссылка:', link);
                    inviteLink.value = link;
                    console.log('Значение поля после установки:', inviteLink.value);
                    inviteModal.classList.remove('hidden');
                    console.log('Модальное окно показано');
                } else {
                    throw new Error('Ошибка генерации ссылки');
                }
            } catch (error) {
                console.error('Ошибка:', error);
                // Fallback к старому методу
                const inviteCode = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
                const link = `${window.location.origin}/invite/${inviteCode}`;
                inviteLink.value = link;
                inviteModal.classList.remove('hidden');
            }
        }
        
        function copyInviteLink() {
            inviteLink.select();
            inviteLink.setSelectionRange(0, 99999);
            navigator.clipboard.writeText(inviteLink.value).then(() => {
                copyLinkBtn.textContent = 'Скопировано!';
                setTimeout(() => {
                    copyLinkBtn.textContent = 'Копировать';
                }, 2000);
            });
        }
        
        function closeModal() {
            console.log('Закрытие модального окна');
            inviteModal.classList.add('hidden');
        }
        
        function logout() {
            localStorage.removeItem('authToken');
            localStorage.removeItem('userType');
            localStorage.removeItem('userName');
            window.location.href = '/logout';
        }
    }
});