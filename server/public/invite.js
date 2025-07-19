document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const inviteCode = urlParams.get('invite');
    const trainerName = urlParams.get('trainer');
    
    const loading = document.getElementById('loading');
    const inviteInfo = document.getElementById('inviteInfo');
    const error = document.getElementById('error');
    const trainerNameSpan = document.getElementById('trainerName');
    const telegramLink = document.getElementById('telegramLink');
    
    // Проверка параметров
    if (!inviteCode || !trainerName) {
        setTimeout(() => {
            loading.classList.add('hidden');
            error.classList.remove('hidden');
        }, 1000);
        return;
    }
    
    // Отображение информации о приглашении
    setTimeout(() => {
        trainerNameSpan.textContent = decodeURIComponent(trainerName);
        
        // Создание ссылки на Telegram бота с параметрами приглашения
        const botUsername = 'fitness_app_you_bot'; // Замени на username своего бота
        const telegramUrl = `https://t.me/${botUsername}?start=invite_${inviteCode}`;
        telegramLink.href = telegramUrl;
        
        console.log('Генерируемая ссылка Telegram:', telegramUrl);
        
        loading.classList.add('hidden');
        inviteInfo.classList.remove('hidden');
    }, 1000);
});