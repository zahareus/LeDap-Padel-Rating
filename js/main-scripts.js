// js/main-scripts.js

let allPlayersData = []; 
let currentRatingMode = 'elo'; // 'elo', 'set', або 'winrate'

document.addEventListener('DOMContentLoaded', function() {
    initializeApp();

    const eloBtn = document.getElementById('elo-rating-btn');
    const setBtn = document.getElementById('set-rating-btn');
    const winrateBtn = document.getElementById('winrate-btn');

    eloBtn.addEventListener('click', () => switchMode('elo'));
    setBtn.addEventListener('click', () => switchMode('set'));
    winrateBtn.addEventListener('click', () => switchMode('winrate'));
});

function switchMode(newMode) {
    if (currentRatingMode !== newMode) {
        currentRatingMode = newMode;
        updateButtonStyles();
        renderPlayerList();
    }
}

async function initializeApp() {
    const playersListDiv = document.getElementById('players-ranking-list');
    playersListDiv.innerHTML = '<p class="p-4 text-center text-gray-500">Завантаження рейтингу гравців...</p>';

    // Додаємо GamesWon до списку полів для завантаження
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Players?maxRecords=100&view=Grid%20view&fields[]=Name&fields[]=Elo&fields[]=GamesPlayed&fields[]=GamesWon&fields[]=Photo&sort[0][field]=Elo&sort[0][direction]=desc`;

    try {
        const response = await fetch(url, { headers: { 'Authorization': `Bearer ${AIRTABLE_PERSONAL_ACCESS_TOKEN}` } });
        if (!response.ok) throw new Error(`Помилка завантаження даних: ${response.status}`);
        
        const data = await response.json();
        allPlayersData = data.records; 
        renderPlayerList(); 

    } catch (error) {
        console.error('Сталася помилка під час виконання запиту:', error);
        document.getElementById('players-ranking-list').innerHTML = `<p class="p-4 text-center text-red-500">Сталася помилка при завантаженні рейтингу.</p>`;
    }
}

function calculateSetRating(playerFields) {
    const elo = playerFields.Elo || 1500;
    const games = playerFields.GamesPlayed || 0;
    if (games === 0) return 0;
    return (elo - 1500) / games;
}

function calculateWinRate(playerFields) {
    const gamesWon = playerFields.GamesWon || 0;
    const gamesPlayed = playerFields.GamesPlayed || 0;
    if (gamesPlayed === 0) return 0;
    return (gamesWon / gamesPlayed) * 100;
}

function updateButtonStyles() {
    const buttons = {
        elo: document.getElementById('elo-rating-btn'),
        set: document.getElementById('set-rating-btn'),
        winrate: document.getElementById('winrate-btn')
    };

    const activeClasses = ['text-white', 'bg-blue-600', 'shadow-md'];
    const inactiveClasses = ['text-blue-700', 'bg-white', 'border', 'border-blue-300', 'hover:bg-blue-50'];

    for (const mode in buttons) {
        if (mode === currentRatingMode) {
            buttons[mode].classList.add(...activeClasses);
            buttons[mode].classList.remove(...inactiveClasses);
        } else {
            buttons[mode].classList.add(...inactiveClasses);
            buttons[mode].classList.remove(...activeClasses);
        }
    }
}

function renderPlayerList() {
    const playersListDiv = document.getElementById('players-ranking-list');
    playersListDiv.innerHTML = ''; 

    let sortedPlayers = [...allPlayersData];

    if (currentRatingMode === 'elo') {
        sortedPlayers.sort((a, b) => (b.fields.Elo || 0) - (a.fields.Elo || 0));
    } else if (currentRatingMode === 'set') {
        sortedPlayers.sort((a, b) => calculateSetRating(b.fields) - calculateSetRating(a.fields));
    } else { // winrate
        sortedPlayers.sort((a, b) => calculateWinRate(b.fields) - calculateWinRate(a.fields));
    }
    
    if (sortedPlayers.length > 0) {
        let rank = 1;
        sortedPlayers.forEach(playerRecord => {
            const player = playerRecord.fields;
            const playerId = playerRecord.id;
            const playerCardLink = document.createElement('a');
            playerCardLink.href = `player.html?id=${playerId}`;
            playerCardLink.className = 'block p-4 hover:bg-gray-50 transition-colors';

            const photoUrl = (player.Photo && player.Photo.length > 0) ? player.Photo[0].url : 'https://via.placeholder.com/48';
            const rankColor = (rank === 1 && currentRatingMode === 'elo') ? 'text-yellow-500' : 'text-gray-400';
            const gamesPlayed = player.GamesPlayed !== undefined ? player.GamesPlayed : 'N/A';
            
            let mainStatHtml, otherStatHtml;

            if (currentRatingMode === 'elo') {
                mainStatHtml = `Рейтинг Ело: <span class="font-semibold text-blue-600">${(player.Elo || 1500).toFixed(0)}</span>`;
            } else if (currentRatingMode === 'set') {
                mainStatHtml = `Сетовий рейтинг: <span class="font-semibold text-blue-600">${calculateSetRating(player).toFixed(3)}</span>`;
            } else { // winrate
                mainStatHtml = `Win Rate: <span class="font-semibold text-blue-600">${calculateWinRate(player).toFixed(2)}%</span>`;
            }

            playerCardLink.innerHTML = `
                <div class="flex items-center space-x-4">
                    <img alt="${player.Name || 'N/A'}" class="w-12 h-12 rounded-full object-cover" src="${photoUrl}"/>
                    <div class="flex-grow">
                        <div class="font-medium text-gray-800">${player.Name || 'N/A'}</div>
                        <div class="text-sm text-gray-600">${mainStatHtml}</div>
                        <div class="text-sm text-gray-500">Зіграно сетів: ${gamesPlayed}</div>
                    </div>
                    <div class="text-xl font-bold ${rankColor}">#${rank}</div>
                </div>
            `;
            playersListDiv.appendChild(playerCardLink);
            rank++;
        });
    } else {
        playersListDiv.innerHTML = '<p class="p-4 text-center text-gray-500">Поки що немає жодного гравця в рейтингу.</p>';
    }
}
