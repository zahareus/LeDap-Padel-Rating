// js/player-scripts.js

document.addEventListener('DOMContentLoaded', function() {
    initializePlayerPage();
});

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
        const [allPlayers, allMatches] = await Promise.all([
            fetchAllPlayers(),
            fetchAllMatches()
        ]);

        const currentPlayerRecord = allPlayers.find(p => p.id === playerId);
        if (!currentPlayerRecord) {
            throw new Error('Гравця з таким ID не знайдено.');
        }
        
        const eloRank = getPlayerRank(allPlayers, playerId, 'elo');
        const setRank = getPlayerRank(allPlayers, playerId, 'set');
        const winrateRank = getPlayerRank(allPlayers, playerId, 'winrate');

        renderPlayerProfile(profileContainer, currentPlayerRecord.fields, eloRank, setRank, winrateRank);
        renderPlayerGames(gamesContainer, gamesCountElement, allMatches.filter(match => {
            const playerIdsInMatch = [
                ...(match.fields.Team1_Player1 || []),
                ...(match.fields.Team1_Player2 || []),
                ...(match.fields.Team2_Player1 || []),
                ...(match.fields.Team2_Player2 || [])
            ];
            return playerIdsInMatch.includes(playerId);
        }), currentPlayerRecord.fields, playerId);

        // Встановлюємо заголовок сторінки
        document.title = `Профіль гравця - ${currentPlayerRecord.fields.Name || 'LeDap'}`;

    } catch (error) {
        console.error("Помилка при ініціалізації сторінки гравця:", error);
        profileContainer.innerHTML = `<p class="p-4 text-center text-red-500">Не вдалося завантажити профіль гравця: ${error.message}</p>`;
        document.getElementById('player-games-container').style.display = 'none';
    }
}

async function fetchAllPlayers() {
    // Додаємо GamesWon до списку полів
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Players?maxRecords=100&view=Grid%20view&fields[]=Name&fields[]=Elo&fields[]=GamesPlayed&fields[]=GamesWon&fields[]=Photo`;
    const response = await fetch(url, { headers: { 'Authorization': `Bearer ${AIRTABLE_PERSONAL_ACCESS_TOKEN}` } });
    if (!response.ok) throw new Error('Не вдалося завантажити список гравців для розрахунку рангів.');
    const data = await response.json();
    return data.records;
}

async function fetchAllMatches() {
    const tableName = 'Matches';
    const sortField = 'MatchDate';
    const sortDirection = 'desc';
    const viewName = 'Grid view';
    
    const fieldsToFetch = [
        'MatchDate', 'Team1_Score', 'Team2_Score', 
        'T1P1_Name', 'T1P2_Name', 'T2P1_Name', 'T2P2_Name', 
        'Team1_Player1', 'Team1_Player2', 'Team2_Player1', 'Team2_Player2',
        'T1P1_Elo_Before', 'T1P2_Elo_Before', 'T2P1_Elo_Before', 'T2P2_Elo_Before', 
        'Elo_Exchanged'
    ];
    let url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${tableName}?view=${encodeURIComponent(viewName)}&sort[0][field]=${sortField}&sort[0][direction]=${sortDirection}`;
    fieldsToFetch.forEach(field => { url += `&fields[]=${encodeURIComponent(field)}`; });
    
    const response = await fetch(url, { headers: { 'Authorization': `Bearer ${AIRTABLE_PERSONAL_ACCESS_TOKEN}` } });
    if (!response.ok) throw new Error('Не вдалося завантажити історію ігор.');
    const data = await response.json();
    return data.records;
}

function getPlayerRank(allPlayers, playerId, mode) {
    let sortedPlayers = [...allPlayers];
    if (mode === 'elo') {
        sortedPlayers.sort((a, b) => (b.fields.Elo || 0) - (a.fields.Elo || 0));
    } else if (mode === 'set') {
        sortedPlayers.sort((a, b) => calculateSetRating(b.fields) - calculateSetRating(a.fields));
    } else { // winrate
        sortedPlayers.sort((a, b) => calculateWinRate(b.fields) - calculateWinRate(a.fields));
    }
    const rank = sortedPlayers.findIndex(p => p.id === playerId) + 1;
    return rank > 0 ? rank : 'N/A';
}

function renderPlayerProfile(container, player, eloRank, setRank, winrateRank) {
    const photoUrl = (player.Photo && player.Photo.length > 0) ? player.Photo[0].url : 'https://via.placeholder.com/128';
    const elo = player.Elo !== undefined ? player.Elo.toFixed(0) : 'N/A';
    const setRating = calculateSetRating(player).toFixed(3);
    const winRate = calculateWinRate(player).toFixed(2);
    
    container.innerHTML = `
        <div class="bg-white shadow-lg rounded-lg p-6 flex flex-col items-center">
            <img alt="${player.Name}" src="${photoUrl}" class="w-32 h-32 rounded-full object-cover border-4 border-blue-500 shadow-md mb-4">
            <h1 class="text-3xl font-bold text-gray-800">${player.Name}</h1>
            <div class="mt-4 text-lg text-gray-600 flex flex-wrap justify-center gap-x-4 gap-y-2">
                <span>Ело: <strong class="text-blue-600">${elo}</strong> (#${eloRank})</span>
                <span>Сетовий: <strong class="text-blue-600">${setRating}</strong> (#${setRank})</span>
                <span>Win Rate: <strong class="text-blue-600">${winRate}%</strong> (#${winrateRank})</span>
            </div>
        </div>
    `;
}

function renderPlayerGames(container, gamesCountElement, matches, playerFields, currentPlayerId) {
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

        const playerIsOnTeam1 = (match.Team1_Player1 && match.Team1_Player1.includes(currentPlayerId)) || 
                                (match.Team1_Player2 && match.Team1_Player2.includes(currentPlayerId));
        
        const playerWon = (playerIsOnTeam1 && match.Team1_Score > match.Team2_Score) || 
                          (!playerIsOnTeam1 && match.Team2_Score > match.Team1_Score);
        
        const eloExchanged = match.Elo_Exchanged !== undefined ? `(${match.Elo_Exchanged})` : '';
        const resultClass = playerWon ? 'text-green-600' : 'text-red-600';
        const resultText = playerWon ? `Перемога ${eloExchanged}` : `Поразка ${eloExchanged}`;

        const dateObj = new Date(match.MatchDate);
        const formattedDate = dateObj.toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric' });
        
        const t1p1Name = match.T1P1_Name ? match.T1P1_Name[0] : 'N/A';
        const t1p1Elo = match.T1P1_Elo_Before !== undefined ? `(${match.T1P1_Elo_Before})` : '';
        const t1p2Name = match.T1P2_Name ? match.T1P2_Name[0] : 'N/A';
        const t1p2Elo = match.T1P2_Elo_Before !== undefined ? `(${match.T1P2_Elo_Before})` : '';

        const t2p1Name = match.T2P1_Name ? match.T2P1_Name[0] : 'N/A';
        const t2p1Elo = match.T2P1_Elo_Before !== undefined ? `(${match.T2P1_Elo_Before})` : '';
        const t2p2Name = match.T2P2_Name ? match.T2P2_Name[0] : 'N/A';
        const t2p2Elo = match.T2P2_Elo_Before !== undefined ? `(${match.T2P2_Elo_Before})` : '';

        gameElement.innerHTML = `
            <div class="flex justify-between items-center">
                <div class="w-1/5 text-left text-sm">
                    <div class="font-semibold ${resultClass}">${resultText}</div>
                    <div class="text-gray-500">${formattedDate}</div>
                </div>
                <div class="w-3/5 flex justify-center items-center">
                    <div class="text-right w-2/5">
                        <div class="font-medium text-gray-800">${t1p1Name} <span class="text-gray-500 font-normal">${t1p1Elo}</span></div>
                        <div class="font-medium text-gray-800">${t1p2Name} <span class="text-gray-500 font-normal">${t1p2Elo}</span></div>
                    </div>
                    <div class="font-bold text-xl text-blue-600 px-4">${match.Team1_Score} : ${match.Team2_Score}</div>
                    <div class="text-left w-2/5">
                        <div class="font-medium text-gray-800">${t2p1Name} <span class="text-sm text-gray-500">${t2p1Elo}</span></div>
                        <div class="font-medium text-gray-800">${t2p2Name} <span class="text-sm text-gray-500">${t2p2Elo}</span></div>
                    </div>
                </div>
                <div class="w-1/5"></div>
            </div>
        `;
        gamesContainer.appendChild(gameElement);
    });

    container.innerHTML = ''; 
    container.appendChild(gamesContainer);
}
