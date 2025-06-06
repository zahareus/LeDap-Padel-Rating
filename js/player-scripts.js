// js/player-scripts.js

document.addEventListener('DOMContentLoaded', function() {
    initializePlayerPage();
});

// Функція для розрахунку сетового рейтингу
function calculateSetRating(playerFields) {
    const elo = playerFields.Elo || 1500;
    const games = playerFields.GamesPlayed || 0;
    if (games === 0) return 0;
    return (elo - 1500) / games;
}

async function initializePlayerPage() {
    const profileContainer = document.getElementById('player-profile-container');
    const gamesContainer = document.getElementById('player-games-list');
    const gamesCountElement = document.getElementById('player-games-count');

    const urlParams = new URLSearchParams(window.location.search);
    const playerId = urlParams.get('id');

    if (!playerId) {
        profileContainer.innerHTML = '<p class="p-4 text-center text-red-500">Помилка: ID гравця не вказано.</p>';
        document.getElementById('player-games-container').style.display = 'none';
        return;
    }

    try {
        // Одночасно завантажуємо дані про ВСІХ гравців та ВСІ матчі
        const [allPlayers, allMatches] = await Promise.all([
            fetchAllPlayers(),
            fetchAllMatches()
        ]);

        const currentPlayerRecord = allPlayers.find(p => p.id === playerId);
        if (!currentPlayerRecord) {
            throw new Error('Гравця з таким ID не знайдено.');
        }

        // Розрахунок рангів
        const eloRank = getPlayerRank(allPlayers, playerId, 'elo');
        const setRank = getPlayerRank(allPlayers, playerId, 'set');

        // Фільтруємо матчі цього гравця на стороні клієнта
        const playerMatches = allMatches.filter(match => {
            const playerIdsInMatch = [
                ...(match.fields.Team1_Player1 || []),
                ...(match.fields.Team1_Player2 || []),
                ...(match.fields.Team2_Player1 || []),
                ...(match.fields.Team2_Player2 || [])
            ];
            return playerIdsInMatch.includes(playerId);
        });

        // Відображення профілю та історії ігор
        renderPlayerProfile(profileContainer, currentPlayerRecord.fields, eloRank, setRank);
        renderPlayerGames(gamesContainer, gamesCountElement, playerMatches, currentPlayerRecord.fields, playerId);

    } catch (error) {
        console.error("Помилка при ініціалізації сторінки гравця:", error);
        profileContainer.innerHTML = `<p class="p-4 text-center text-red-500">Не вдалося завантажити профіль гравця: ${error.message}</p>`;
        document.getElementById('player-games-container').style.display = 'none';
    }
}

// Функція для отримання ВСІХ гравців
async function fetchAllPlayers() {
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Players?maxRecords=100&view=Grid%20view`;
    const response = await fetch(url, { headers: { 'Authorization': `Bearer ${AIRTABLE_PERSONAL_ACCESS_TOKEN}` } });
    if (!response.ok) throw new Error('Не вдалося завантажити список гравців для розрахунку рангів.');
    const data = await response.json();
    return data.records;
}

// НОВА функція для отримання ВСІХ матчів
async function fetchAllMatches() {
    const tableName = 'Matches';
    const sortField = 'MatchDate';
    const sortDirection = 'desc';
    const viewName = 'Grid view';
    const fieldsToFetch = ['MatchDate', 'Team1_Score', 'Team2_Score', 'T1P1_Name', 'T1P2_Name', 'T2P1_Name', 'T2P2_Name', 'Team1_Player1', 'Team1_Player2', 'Team2_Player1', 'Team2_Player2'];

    let url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${tableName}?view=${encodeURIComponent(viewName)}&sort[0][field]=${sortField}&sort[0][direction]=${sortDirection}`;
    fieldsToFetch.forEach(field => { url += `&fields[]=${encodeURIComponent(field)}`; });
    
    const response = await fetch(url, { headers: { 'Authorization': `Bearer ${AIRTABLE_PERSONAL_ACCESS_TOKEN}` } });
    if (!response.ok) throw new Error('Не вдалося завантажити історію ігор.');
    const data = await response.json();
    return data.records;
}

// Функція для визначення рангу гравця
function getPlayerRank(allPlayers, playerId, mode) {
    let sortedPlayers = [...allPlayers];
    if (mode === 'elo') {
        sortedPlayers.sort((a, b) => (b.fields.Elo || 0) - (a.fields.Elo || 0));
    } else { // 'set'
        sortedPlayers.sort((a, b) => calculateSetRating(b.fields) - calculateSetRating(a.fields));
    }
    const rank = sortedPlayers.findIndex(p => p.id === playerId) + 1;
    return rank > 0 ? rank : 'N/A';
}

// Функція відображення блоку профілю (видалено рядок про кількість ігор)
function renderPlayerProfile(container, player, eloRank, setRank) {
    const photoUrl = (player.Photo && player.Photo.length > 0) ? player.Photo[0].url : 'https://via.placeholder.com/128';
    const elo = player.Elo !== undefined ? player.Elo.toFixed(0) : 'N/A';
    const setRating = calculateSetRating(player).toFixed(3);
    
    container.innerHTML = `
        <div class="bg-white shadow-lg rounded-lg p-6 flex flex-col items-center">
            <img alt="${player.Name}" src="${photoUrl}" class="w-32 h-32 rounded-full object-cover border-4 border-blue-500 shadow-md mb-4">
            <h1 class="text-3xl font-bold text-gray-800">${player.Name}</h1>
            <div class="mt-4 text-lg text-gray-600 flex flex-wrap justify-center gap-x-6 gap-y-2">
                <span>Рейтинг Ело: <strong class="text-blue-600">${elo}</strong> (#${eloRank})</span>
                <span>Сетовий рейтинг: <strong class="text-blue-600">${setRating}</strong> (#${setRank})</span>
            </div>
        </div>
    `;
}

// Функція відображення історії ігор (змінено)
function renderPlayerGames(container, gamesCountElement, matches, playerFields, currentPlayerId) {
    // Встановлюємо текст для кількості зіграних сетів
    gamesCountElement.textContent = `Зіграно сетів: ${playerFields.GamesPlayed || 0}`;

    if (!matches || matches.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-500 mt-4">Цей гравець ще не зіграв жодного сету.</p>';
        return;
    }

    const gamesContainer = document.createElement('div');
    gamesContainer.className = 'bg-white shadow-lg rounded-lg overflow-hidden divide-y divide-gray-200';
    
    matches.forEach(matchRecord => {
        const match = matchRecord.fields;
        const gameElement = document.createElement('div');
        gameElement.className = 'p-4';

        const t1p1_id = match.Team1_Player1 ? match.Team1_Player1[0] : null;
        const t1p2_id = match.Team1_Player2 ? match.Team1_Player2[0] : null;
        
        const playerIsOnTeam1 = (t1p1_id === currentPlayerId || t1p2_id === currentPlayerId);
        const playerWon = (playerIsOnTeam1 && match.Team1_Score > match.Team2_Score) || (!playerIsOnTeam1 && match.Team2_Score > match.Team1_Score);
        
        const resultClass = playerWon ? 'text-green-600' : 'text-red-600';
        const resultText = playerWon ? 'Перемога' : 'Поразка';

        const dateObj = new Date(match.MatchDate);
        const formattedDate = dateObj.toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric' });
        
        const t1p1Name = match.T1P1_Name ? match.T1P1_Name[0] : 'N/A';
        const t1p2Name = match.T1P2_Name ? match.T1P2_Name[0] : 'N/A';
        const t2p1Name = match.T2P1_Name ? match.T2P1_Name[0] : 'N/A';
        const t2p2Name = match.T2P2_Name ? match.T2P2_Name[0] : 'N/A';
        
        gameElement.innerHTML = `
            <div class="flex justify-between items-center">
                <div class="flex-grow">
                    <p class="font-semibold text-gray-800">${t1p1Name} / ${t1p2Name} <span class="text-blue-600 font-bold">vs</span> ${t2p1Name} / ${t2p2Name}</p>
                    <p class="text-sm text-gray-500">${formattedDate}</p>
                </div>
                <div class="text-right">
                    <p class="font-bold text-lg">${match.Team1_Score} : ${match.Team2_Score}</p>
                    <p class="font-semibold ${resultClass}">${resultText}</p>
                </div>
            </div>
        `;
        gamesContainer.appendChild(gameElement);
    });

    container.innerHTML = ''; // Очищуємо попередній вміст (наприклад, "Завантаження...")
    container.appendChild(gamesContainer);
}
