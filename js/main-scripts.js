// js/main-scripts.js
document.addEventListener('DOMContentLoaded', function() {
    fetchAndDisplayPlayers();
});

async function fetchAndDisplayPlayers() {
    const playersListDiv = document.getElementById('players-ranking-list');
    if (!playersListDiv) {
        console.error('Елемент #players-ranking-list не знайдено!');
        return;
    }
    playersListDiv.innerHTML = '<p class="p-4 text-center text-gray-500">Завантаження рейтингу гравців...</p>';

    const tableName = 'Players';
    const sortField = 'Elo';
    const sortDirection = 'desc';
    const viewName = 'Grid view'; 
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${tableName}?maxRecords=100&view=${encodeURIComponent(viewName)}&sort[0][field]=${sortField}&sort[0][direction]=${sortDirection}`;

    try {
        const response = await fetch(url, { headers: { 'Authorization': `Bearer ${AIRTABLE_PERSONAL_ACCESS_TOKEN}` } });
        if (!response.ok) {
            throw new Error(`Помилка завантаження даних: ${response.status}`);
        }
        const data = await response.json();
        const players = data.records;

        if (players && players.length > 0) {
            playersListDiv.innerHTML = ''; // Очищуємо
            let rank = 1;

            players.forEach(playerRecord => {
                const player = playerRecord.fields;
                const playerCard = document.createElement('div');
                playerCard.className = 'p-4 hover:bg-gray-50 transition-colors';

                const photoUrl = (player.Photo && player.Photo.length > 0) ? player.Photo[0].url : 'https://via.placeholder.com/48'; // Заглушка, якщо немає фото
                const rankColor = (rank === 1) ? 'text-yellow-500' : 'text-gray-400';
                const elo = player.Elo !== undefined ? player.Elo.toFixed(0) : 'N/A';
                const gamesPlayed = player.GamesPlayed !== undefined ? player.GamesPlayed : 'N/A';
                
                playerCard.innerHTML = `
                    <div class="flex items-center space-x-4">
                        <img alt="${player.Name || 'Фото гравця'}" class="w-12 h-12 rounded-full object-cover" src="${photoUrl}"/>
                        <div class="flex-grow">
                            <div class="font-medium text-gray-800">${player.Name || 'N/A'}</div>
                            <div class="text-sm text-gray-600">Рейтинг Ело: <span class="font-semibold text-blue-600">${elo}</span></div>
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
    } catch (error) {
        console.error('Сталася помилка під час виконання запиту:', error);
        playersListDiv.innerHTML = `<p class="p-4 text-center text-red-500">Сталася помилка при завантаженні рейтингу.</p>`;
    }
}
