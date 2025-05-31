
// js/admin-scripts.js

console.log('AIRTABLE_BASE_ID в admin-scripts.js:', typeof AIRTABLE_BASE_ID, AIRTABLE_BASE_ID);

document.addEventListener('DOMContentLoaded', function() {
    populatePlayerDropdowns();

    // Тут пізніше будуть обробники для форм
    // document.getElementById('add-player-form').addEventListener('submit', handleAddPlayer);
    // document.getElementById('record-match-form').addEventListener('submit', handleRecordMatch);
});

async function fetchPlayersForDropdown() {
    const tableName = 'Players';
    const sortField = 'Name'; // Сортуємо за іменем для зручності в дропдауні
    const sortDirection = 'asc'; // За алфавітом

    // УВАГА! ЗАМІНІТЬ 'Grid view' НА ТОЧНУ НАЗВУ ВАШОГО ПРЕДСТАВЛЕННЯ
    // В ТАБЛИЦІ 'Players' В AIRTABLE, ЯКЩО ВОНА ІНША!
    const viewName = 'Grid view'; 

    // Ось коректний рядок для формування URL:
    const url = `https://api.airtable.com/v0/<span class="math-inline">\{AIRTABLE\_BASE\_ID\}/</span>{tableName}?maxRecords=100&view=<span class="math-inline">\{encodeURIComponent\(viewName\)\}&sort\[0\]\[field\]\=</span>{sortField}&sort[0][direction]=${sortDirection}`;

    console.log(`Запит до Airtable (admin-scripts): ${url}`); // Цей лог допоможе нам побачити правильний URL

    try {
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${AIRTABLE_PERSONAL_ACCESS_TOKEN}`
            }
        });

        if (!response.ok) {
            const errorResponseText = await response.text(); 
            console.error('Помилка завантаження гравців для дропдаунів (статус):', response.status);
            console.error('Тіло відповіді з помилкою від Airtable:', errorResponseText);
            return []; 
        }

        const data = await response.json();
        return data.records; 
    } catch (error) {
        console.error('Сталася помилка JavaScript під час завантаження гравців для дропдаунів:', error);
        return [];
    }
}

async function populatePlayerDropdowns() {
    const players = await fetchPlayersForDropdown();

    // Знаходимо всі наші select елементи
    const dropdownIds = ['t1-player1', 't1-player2', 't2-player1', 't2-player2'];

    dropdownIds.forEach(dropdownId => {
        const selectElement = document.getElementById(dropdownId);
        if (selectElement) {
            // Очищуємо попередні опції (окрім першої "Оберіть гравця...")
            while (selectElement.options.length > 1) {
                selectElement.remove(1);
            }

            // Додаємо гравців у список
            players.forEach(playerRecord => {
                const playerName = playerRecord.fields.Name;
                const playerId = playerRecord.id; // Важливо: використовуємо ID запису Airtable як value

                if (playerName && playerId) {
                    const option = document.createElement('option');
                    option.value = playerId;
                    option.textContent = playerName;
                    selectElement.appendChild(option);
                }
            });
        } else {
            console.warn(`Елемент select з ID "${dropdownId}" не знайдено.`);
        }
    });
}
