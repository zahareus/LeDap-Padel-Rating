// js/games-scripts.js
document.addEventListener('DOMContentLoaded', function() {
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
    const fieldsToFetch = ['MatchDate', 'Team1_Score', 'Team2_Score', 'T1P1_Name', 'T1P2_Name', 'T2P1_Name', 'T2P2_Name'];
    let url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${tableName}?view=${encodeURIComponent(viewName)}&sort[0][field]=${sortField}&sort[0][direction]=${sortDirection}`;
    fieldsToFetch.forEach(field => { url += `&fields[]=${encodeURIComponent(field)}`; });

    try {
        const response = await fetch(url, { headers: { 'Authorization': `Bearer ${AIRTABLE_PERSONAL_ACCESS_TOKEN}` } });
        if (!response.ok) {
            throw new Error(`Помилка завантаження даних: ${response.status}`);
        }
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

                    const t1p1 = match.T1P1_Name ? match.T1P1_Name[0] : 'N/A';
                    const t1p2 = match.T1P2_Name ? match.T1P2_Name[0] : 'N/A';
                    const t2p1 = match.T2P1_Name ? match.T2P1_Name[0] : 'N/A';
                    const t2p2 = match.T2P2_Name ? match.T2P2_Name[0] : 'N/A';
                    const score1 = match.Team1_Score !== undefined ? match.Team1_Score : '-';
                    const score2 = match.Team2_Score !== undefined ? match.Team2_Score : '-';
                    const team1WinnerClass = score1 > score2 ? 'winner' : '';
                    const team2WinnerClass = score2 > score1 ? 'winner' : '';

                    gameElement.innerHTML = `
                        <div class="flex justify-between items-center text-gray-800">
                            <div class="team text-right w-2/5 ${team1WinnerClass}">
                                <strong class="font-medium">${t1p1}</strong> / <strong class="font-medium">${t1p2}</strong>
                            </div>
                            <div class="font-bold text-lg text-blue-600 px-4">${score1} : ${score2}</div>
                            <div class="team text-left w-2/5 ${team2WinnerClass}">
                                <strong class="font-medium">${t2p1}</strong> / <strong class="font-medium">${t2p2}</strong>
                            </div>
                        </div>
                    `;
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
