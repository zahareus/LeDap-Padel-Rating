// js/main-scripts.js

let allPlayersData = []; // Зберігаємо завантажені дані тут, щоб не робити повторні запити
let currentRatingMode = 'elo'; // 'elo' або 'set'

// Прив'язуємо події після завантаження сторінки
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();

    const eloBtn = document.getElementById('elo-rating-btn');
    const setBtn = document.getElementById('set-rating-btn');

    eloBtn.addEventListener('click', () => {
        if (currentRatingMode !== 'elo') {
            currentRatingMode = 'elo';
            updateButtonStyles();
            renderPlayerList();
        }
    });

    setBtn.addEventListener('click', () => {
        if (currentRatingMode !== 'set') {
            currentRatingMode = 'set';
            updateButtonStyles();
            renderPlayerList();
        }
    });
});

// Головна функція ініціалізації
async function initializeApp() {
    const playersListDiv = document.getElementById('players-ranking-list');
    playersListDiv.innerHTML = '<p class="p-4 text-center text-gray-500">Завантаження рейтингу гравців...</p>';

    const tableName = 'Players';
    const sortField = 'Elo'; // Початкове сортування завжди за Ело
    const sortDirection = 'desc';
    const viewName = 'Grid view'; 
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${tableName}?maxRecords=100&view=${encodeURIComponent(viewName)}&sort[0][field]=${sortField}&sort[0][direction]=${sortDirection}`;

    try {
        const response = await fetch(url, { headers: { 'Authorization': `Bearer ${AIRTABLE_PERSONAL_ACCESS_TOKEN}` } });
        if (!response.ok) {
            throw new Error(`Помилка завантаження даних: ${response.status}`);
        }
        const data = await response.json();
        allPlayersData = data.records; // Зберігаємо дані в глобальну змінну
        renderPlayerList(); // Відображаємо список (за замовчуванням - за Ело)

    } catch (error) {
        console.error('Сталася помилка під час виконання запиту:', error);
        document.getElementById('players-ranking-list').innerHTML = `<p class="p-4 text-center text-red-500">Сталася помилка при завантаженні рейтингу.</p>`;
    }
}

// Функція для розрахунку сетового рейтингу
function calculateSetRating(playerFields) {
    const elo = playerFields.Elo || 1500;
    const games = playerFields.GamesPlayed || 0;
    
    // Щоб уникнути ділення на нуль
    if (games === 0) {
        return 0;
    }
    
    return (elo - 1500) / games;
}

// Оновлення стилів кнопок-перемикачів
function updateButtonStyles() {
    const eloBtn = document.getElementById('elo-rating-btn');
    const setBtn = document.getElementById('set-rating-btn');

    const activeClasses = ['text-white', 'bg-blue-600', 'shadow-md'];
    const inactiveClasses = ['text-blue-700', 'bg-white', 'border', 'border-blue-300', 'hover:bg-blue-50'];

    if (currentRatingMode === 'elo') {
        eloBtn.classList.add(...activeClasses);
        eloBtn.classList.remove(...inactiveClasses);
        setBtn.classList.add(...inactiveClasses);
        setBtn.classList.remove(...activeClasses);
    } else { // 'set' mode
        setBtn.classList.add(...activeClasses);
        setBtn.classList.remove(...inactiveClasses);
        eloBtn.classList.add(...inactiveClasses);
        eloBtn.classList.remove(...activeClasses);
    }
}

// Головна функція для відображення списку гравців
function renderPlayerList() {
    const playersListDiv = document.getElementById('players-ranking-list');
    playersListDiv.innerHTML = ''; // Очищуємо контейнер

    // Копіюємо масив, щоб не змінювати оригінальний порядок
    let sortedPlayers = [...allPlayersData];

    // Сортуємо масив в залежності від обраного режиму
    if (currentRatingMode === 'elo') {
        sortedPlayers.sort((a, b) => (b.fields.Elo || 0) - (a.fields.Elo || 0));
    } else { // 'set' mode
        sortedPlayers.sort((a, b) => calculateSetRating(b.fields) - calculateSetRating(a.fields));
    }
    
    if (sortedPlayers.length > 0) {
        let rank = 1;
        sortedPlayers.forEach(playerRecord => {
            const player = playerRecord.fields;
            const playerCard = document.createElement('div');
            playerCard.className = 'p-4 hover:bg-gray-50 transition-colors';

            const photoUrl = (player.Photo && player.Photo.length > 0) ? player.Photo[0].url : 'https://via.placeholder.com/48';
            const rankColor = (rank === 1 && currentRatingMode === 'elo') ? 'text-yellow-500' : 'text-gray-400';
            const gamesPlayed = player.GamesPlayed !== undefined ? player.GamesPlayed : 'N/A';
            
            let ratingHtml;
            if (currentRatingMode === 'elo') {
                const elo = player.Elo !== undefined ? player.Elo.toFixed(0) : 'N/A';
                ratingHtml = `<div class="text-sm text-gray-600">Рейтинг Ело: <span class="font-semibold text-blue-600">${elo}</span></div>`;
            } else {
                const setRating = calculateSetRating(player).toFixed(3);
                ratingHtml = `<div class="text-sm text-gray-600">Сетовий рейтинг: <span class="font-semibold text-blue-600">${setRating}</span></div>`;
            }

            playerCard.innerHTML = `
                <div class="flex items-center space-x-4">
                    <img alt="${player.Name || 'Фото гравця'}" class="w-12 h-12 rounded-full object-cover" src="${photoUrl}"/>
                    <div class="flex-grow">
                        <div class="font-medium text-gray-800">${player.Name || 'N/A'}</div>
                        ${ratingHtml}
                        <div class="text-sm text-gray-500">Зіграно сетів: ${gamesPlayed}</div>
                    </div>
                    <div class="text-xl font-bold ${rankColor}">#${rank}</div>
                </div>
            `;
            playersListDiv.appendChild(playerCard);
            rank++;
        });
    } else {
        playersListDiv.innerHTML = '<p class="p-4 text-center text-gray-500">Поки що немає жодного гравця в рейтингу.</p>';
    }
}
