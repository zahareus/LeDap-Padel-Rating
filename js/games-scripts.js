// js/games-scripts.js
console.log('AIRTABLE_BASE_ID в games-scripts.js:', typeof AIRTABLE_BASE_ID, AIRTABLE_BASE_ID);

document.addEventListener('DOMContentLoaded', function() {
    fetchAndDisplayGames();
});

async function fetchAndDisplayGames() {
    const gamesListContainer = document.getElementById('games-list-container');
    if (!gamesListContainer) {
        console.error('Елемент #games-list-container не знайдено!');
        return;
    }

    gamesListContainer.innerHTML = '<p>Завантаження списку ігор...</p>';

    const tableName = 'Matches';
    // Сортуємо за полем 'MatchDate' в спадаючому порядку (новіші зверху)
    const sortField = 'MatchDate';
    const sortDirection = 'desc';
    const viewName = 'Grid view'; // Перевірте назву вашого представлення в таблиці 'Matches'

    // Поля, які ми хочемо отримати. Включаємо нові Lookup-поля з іменами гравців.
    const fieldsToFetch = ['MatchDate', 'Team1_Score', 'Team2_Score', 'T1P1_Name', 'T1P2_Name', 'T2P1_Name', 'T2P2_Name'];
    let url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${tableName}?view=${encodeURIComponent(viewName)}&sort[0][field]=${sortField}&sort[0][direction]=${sortDirection}`;

    // Додаємо параметри fields[] до URL
    fieldsToFetch.forEach(field => {
        url += `&fields[]=${encodeURIComponent(field)}`;
    });
    
    console.log(`Запит до Airtable (games-scripts): ${url}`);

    try {
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${AIRTABLE_PERSONAL_ACCESS_TOKEN}`
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Помилка завантаження ігор з Airtable:', response.status, errorData);
            gamesListContainer.innerHTML = `<p>Не вдалося завантажити список ігор. Помилка: ${response.status}. Перевірте консоль.</p>`;
            return;
        }

        const data = await response.json();
        const matches = data.records;

        if (matches && matches.length > 0) {
            gamesListContainer.innerHTML = ''; // Очищуємо повідомлення про завантаження
            
            let currentDate = null;
            matches.forEach(matchRecord => {
                const match = matchRecord.fields;

                // Групування по даті
                if (match.MatchDate !== currentDate) {
                    currentDate = match.MatchDate;
                    const dateHeader = document.createElement('h3');
                    dateHeader.classList.add('game-date-header');
                    // Форматуємо дату (можна зробити краще з бібліотекою типу date-fns або moment.js, але поки просто)
                    const dateObj = new Date(currentDate);
                    const formattedDate = dateObj.toLocaleDateString('uk-UA', { year: 'numeric', month: 'long', day: 'numeric' });
                    dateHeader.textContent = formattedDate;
                    gamesListContainer.appendChild(dateHeader);
                }

                const gameElement = document.createElement('div');
                gameElement.classList.add('game-entry');

                // Отримуємо імена гравців (з Lookup полів)
                // Airtable повертає імена з Lookup полів як масиви з одного елемента, якщо посилання встановлено.
                const t1p1Name = match.T1P1_Name && match.T1P1_Name.length > 0 ? match.T1P1_Name[0] : 'Гравець не вказаний';
                const t1p2Name = match.T1P2_Name && match.T1P2_Name.length > 0 ? match.T1P2_Name[0] : 'Гравець не вказаний';
                const t2p1Name = match.T2P1_Name && match.T2P1_Name.length > 0 ? match.T2P1_Name[0] : 'Гравець не вказаний';
                const t2p2Name = match.T2P2_Name && match.T2P2_Name.length > 0 ? match.T2P2_Name[0] : 'Гравець не вказаний';

                gameElement.innerHTML = `
                    <p class="game-teams">
                        <span class="team team1 ${match.Team1_Score > match.Team2_Score ? 'winner' : ''}">
                            <strong>${t1p1Name}</strong> / <strong>${t1p2Name}</strong>
                        </span>
                        <span class="game-score">
                            ${match.Team1_Score !== undefined ? match.Team1_Score : '-'} : ${match.Team2_Score !== undefined ? match.Team2_Score : '-'}
                        </span>
                        <span class="team team2 ${match.Team2_Score > match.Team1_Score ? 'winner' : ''}">
                            <strong>${t2p1Name}</strong> / <strong>${t2p2Name}</strong>
                        </span>
                    </p>
                `;
                gamesListContainer.appendChild(gameElement);
            });
        } else {
            gamesListContainer.innerHTML = '<p>Ще не зіграно жодного сету.</p>';
        }

    } catch (error) {
        console.error('Сталася помилка під час виконання запиту на отримання ігор:', error);
        gamesListContainer.innerHTML = '<p>Сталася помилка при завантаженні списку ігор. Будь ласка, спробуйте пізніше.</p>';
    }
}
