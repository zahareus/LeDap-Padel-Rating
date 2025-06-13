// js/games-scripts.js
let allPlayersData = [];

// Завантажити всіх гравців для фото
async function fetchAllPlayersForGames() {
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Players?maxRecords=100&view=Grid%20view&fields[]=Name&fields[]=Photo`;
    const response = await fetch(url, { headers: { 'Authorization': `Bearer ${AIRTABLE_PERSONAL_ACCESS_TOKEN}` } });
    if (!response.ok) throw new Error('Не вдалося завантажити список гравців для фото.');
    const data = await response.json();
    allPlayersData = data.records;
}

document.addEventListener('DOMContentLoaded', async function() {
    await fetchAllPlayersForGames();
    fetchAndDisplayGames();
});

async function fetchAndDisplayGames() {
    const gamesListContainer = document.getElementById('games-list-container');
    if (!gamesListContainer) return;

    gamesListContainer.innerHTML = '<p class="p-4 text-center text-gray-500">Завантаження списку ігор...</p>';

    const tableName = 'Matches';
    const sortField = 'MatchDate';
    const sortDirection = 'desc';
    const viewName = 'Grid view'; 

    // Додаємо нові поля з історичним Ело та розіграними очками до списку полів, які треба завантажити
    const fieldsToFetch = [
        'MatchDate', 'Team1_Score', 'Team2_Score', 
        'T1P1_Name', 'T1P2_Name', 'T2P1_Name', 'T2P2_Name', 
        'T1P1_Elo_Before', 'T1P2_Elo_Before', 'T2P1_Elo_Before', 'T2P2_Elo_Before', 
        'Elo_Exchanged'
    ];
    let url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${tableName}?view=${encodeURIComponent(viewName)}&sort[0][field]=${sortField}&sort[0][direction]=${sortDirection}`;
    fieldsToFetch.forEach(field => { url += `&fields[]=${encodeURIComponent(field)}`; });

    try {
        const response = await fetch(url, { headers: { 'Authorization': `Bearer ${AIRTABLE_PERSONAL_ACCESS_TOKEN}` } });
        if (!response.ok) throw new Error(`Помилка завантаження даних: ${response.status}`);
        
        const data = await response.json();
        const matches = data.records;

        if (matches && matches.length > 0) {
            gamesListContainer.innerHTML = ''; 
            
            let currentDate = null;
            matches.forEach(matchRecord => {
                const match = matchRecord.fields;
                const matchDate = match.MatchDate;

                if (matchDate !== currentDate) {
                    currentDate = matchDate;
                    const dateHeader = document.createElement('h3');
                    dateHeader.className = 'text-xl font-semibold text-gray-600 mt-8 mb-4 border-b pb-2';
                    const dateObj = new Date(currentDate);
                    dateHeader.textContent = dateObj.toLocaleDateString('uk-UA', { year: 'numeric', month: 'long', day: 'numeric' });
                    gamesListContainer.appendChild(dateHeader);
                    
                    const gamesContainer = document.createElement('div');
                    gamesContainer.className = 'bg-white shadow-lg rounded-lg overflow-hidden divide-y divide-gray-200';
                    gamesContainer.dataset.date = currentDate;
                    gamesListContainer.appendChild(gamesContainer);
                }
                
                const gamesContainerForDate = document.querySelector(`div[data-date="${currentDate}"]`);
                if(gamesContainerForDate){
                    const gameElement = document.createElement('div');
                    gameElement.className = 'p-4';

                    // --- ПОЧАТОК ОНОВЛЕНОЇ ЛОГІКИ ВІДОБРАЖЕННЯ ---
                    const t1p1Name = match.T1P1_Name ? match.T1P1_Name[0] : 'N/A';
                    const t1p1Elo = match.T1P1_Elo_Before !== undefined ? `(${match.T1P1_Elo_Before})` : '';
                    const t1p2Name = match.T1P2_Name ? match.T1P2_Name[0] : 'N/A';
                    const t1p2Elo = match.T1P2_Elo_Before !== undefined ? `(${match.T1P2_Elo_Before})` : '';

                    const t2p1Name = match.T2P1_Name ? match.T2P1_Name[0] : 'N/A';
                    const t2p1Elo = match.T2P1_Elo_Before !== undefined ? `(${match.T2P1_Elo_Before})` : '';
                    const t2p2Name = match.T2P2_Name ? match.T2P2_Name[0] : 'N/A';
                    const t2p2Elo = match.T2P2_Elo_Before !== undefined ? `(${match.T2P2_Elo_Before})` : '';

                    const t1p1Photo = getPlayerPhotoByName(t1p1Name);
                    const t1p2Photo = getPlayerPhotoByName(t1p2Name);
                    const t2p1Photo = getPlayerPhotoByName(t2p1Name);
                    const t2p2Photo = getPlayerPhotoByName(t2p2Name);

                    const score1 = match.Team1_Score !== undefined ? match.Team1_Score : '-';
                    const score2 = match.Team2_Score !== undefined ? match.Team2_Score : '-';
                    const eloExchanged = match.Elo_Exchanged !== undefined ? match.Elo_Exchanged : '';

                    const team1WinnerClass = score1 > score2 ? 'winner' : '';
                    const team2WinnerClass = score2 > score1 ? 'winner' : '';

                    gameElement.innerHTML = `
                        <div class="flex flex-row items-center text-gray-800 w-full text-base min-h-[28px]">
                            <!-- Ліва команда -->
                            <div class="flex flex-col w-2/5 items-start justify-center gap-y-0.5">
                                <div class="flex flex-row items-center gap-x-0.5 flex-nowrap overflow-x-auto">
                                    <img src="${t1p1Photo}" alt="${t1p1Name}" class="w-4 h-4 rounded-full object-cover"/>
                                    <span class="text-[7px] max-w-[36px] truncate whitespace-nowrap" title="${t1p1Name}">${t1p1Name}</span>
                                    <span class="text-[6px] text-gray-400 font-normal">${t1p1Elo}</span>
                                </div>
                                <div class="flex flex-row items-center gap-x-0.5 flex-nowrap overflow-x-auto">
                                    <img src="${t1p2Photo}" alt="${t1p2Name}" class="w-4 h-4 rounded-full object-cover"/>
                                    <span class="text-[7px] max-w-[36px] truncate whitespace-nowrap" title="${t1p2Name}">${t1p2Name}</span>
                                    <span class="text-[6px] text-gray-400 font-normal">${t1p2Elo}</span>
                                </div>
                            </div>
                            <!-- Центр -->
                            <div class="flex flex-col items-center w-1/5 min-w-[44px] md:min-w-[120px] justify-center py-0.5">
                                <span class="font-bold text-base md:text-lg text-blue-600">${score1} : ${score2}</span>
                                <span class="text-[8px] md:text-xs font-normal text-gray-500 mt-0.5">${eloExchanged}</span>
                            </div>
                            <!-- Права команда -->
                            <div class="flex flex-col w-2/5 items-end justify-center gap-y-0.5">
                                <div class="flex flex-row items-center gap-x-0.5 flex-nowrap overflow-x-auto justify-end">
                                    <img src="${t2p1Photo}" alt="${t2p1Name}" class="w-4 h-4 rounded-full object-cover"/>
                                    <span class="text-[7px] max-w-[36px] truncate whitespace-nowrap" title="${t2p1Name}">${t2p1Name}</span>
                                    <span class="text-[6px] text-gray-400 font-normal">${t2p1Elo}</span>
                                </div>
                                <div class="flex flex-row items-center gap-x-0.5 flex-nowrap overflow-x-auto justify-end">
                                    <img src="${t2p2Photo}" alt="${t2p2Name}" class="w-4 h-4 rounded-full object-cover"/>
                                    <span class="text-[7px] max-w-[36px] truncate whitespace-nowrap" title="${t2p2Name}">${t2p2Name}</span>
                                    <span class="text-[6px] text-gray-400 font-normal">${t2p2Elo}</span>
                                </div>
                            </div>
                        </div>
                    `;
                    // --- КІНЕЦЬ ОНОВЛЕНОЇ ЛОГІКИ ВІДОБРАЖЕННЯ ---
                    gamesContainerForDate.appendChild(gameElement);
                }
            });
        } else {
            gamesListContainer.innerHTML = '<p class="p-4 text-center text-gray-500">Ще не зіграно жодного сету.</p>';
        }

    } catch (error) {
        console.error('Сталася помилка під час виконання запиту на отримання ігор:', error);
        gamesListContainer.innerHTML = `<p class="p-4 text-center text-red-500">Сталася помилка при завантаженні списку ігор.</p>`;
    }
}

// Helper to get player photo by name
function getPlayerPhotoByName(name) {
    if (allPlayersData && allPlayersData.length > 0) {
        for (const player of allPlayersData) {
            if (player.fields.Name === name && player.fields.Photo && player.fields.Photo.length > 0) {
                return player.fields.Photo[0].url;
            }
        }
    }
    return 'https://via.placeholder.com/32';
}
