// js/admin-scripts.js
console.log('AIRTABLE_BASE_ID в admin-scripts.js:', typeof AIRTABLE_BASE_ID, AIRTABLE_BASE_ID); // Для діагностики

document.addEventListener('DOMContentLoaded', function() {
    populatePlayerDropdowns();

    // Розкоментовуємо та активуємо обробник для форми додавання гравця
    const addPlayerForm = document.getElementById('add-player-form');
    if (addPlayerForm) {
        addPlayerForm.addEventListener('submit', handleAddPlayer);
    } else {
        console.warn("Форму 'add-player-form' не знайдено.");
    }
    
    // Обробник для форми реєстрації матчу буде додано пізніше
    // const recordMatchForm = document.getElementById('record-match-form');
    // if (recordMatchForm) {
    //     recordMatchForm.addEventListener('submit', handleRecordMatch);
    // }
});

async function fetchPlayersForDropdown() {
    const tableName = 'Players';
    const sortField = 'Name'; 
    const sortDirection = 'asc';
    const viewName = 'Grid view'; // Перевірте назву вашого представлення в Airtable

    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${tableName}?maxRecords=100&view=${encodeURIComponent(viewName)}&sort[0][field]=${sortField}&sort[0][direction]=${sortDirection}`;
    
    console.log(`Запит до Airtable (fetchPlayersForDropdown): ${url}`); 

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
    console.log('Запускаємо populatePlayerDropdowns...'); // Додатковий лог
    const players = await fetchPlayersForDropdown();
    console.log('Гравці для дропдаунів отримані:', players); // Додатковий лог

    const dropdownIds = ['t1-player1', 't1-player2', 't2-player1', 't2-player2'];
    
    dropdownIds.forEach(dropdownId => {
        const selectElement = document.getElementById(dropdownId);
        if (selectElement) {
            const currentValue = selectElement.value; // Збережемо поточне значення, якщо є
            
            // Очищуємо попередні опції (окрім першої "Оберіть гравця...")
            while (selectElement.options.length > 1) {
                selectElement.remove(1);
            }

            players.forEach(playerRecord => {
                const playerName = playerRecord.fields.Name;
                const playerId = playerRecord.id; 

                if (playerName && playerId) {
                    const option = document.createElement('option');
                    option.value = playerId;
                    option.textContent = playerName;
                    selectElement.appendChild(option);
                }
            });
            // Відновимо вибране значення, якщо можливо
            if (players.some(p => p.id === currentValue)) {
                 selectElement.value = currentValue;
            }

        } else {
            console.warn(`Елемент select з ID "${dropdownId}" не знайдено.`);
        }
    });
     console.log('populatePlayerDropdowns завершено.'); // Додатковий лог
}

// --- НОВА ФУНКЦІЯ ДЛЯ ДОДАВАННЯ ГРАВЦЯ ---
async function handleAddPlayer(event) {
    event.preventDefault(); // Запобігаємо стандартній відправці форми

    const playerNameInput = document.getElementById('player-name');
    const playerName = playerNameInput.value.trim();

    if (!playerName) {
        alert('Будь ласка, введіть ім\'я гравця.');
        return;
    }

    // Поки що ігноруємо поле для фото
    // const playerPhotoInput = document.getElementById('player-photo'); 
    // const photoFile = playerPhotoInput.files[0];

    // Дані для нового гравця
    const newPlayerData = {
        fields: {
            "Name": playerName,
            "Elo": 1500,          // Початковий рейтинг
            "GamesPlayed": 0      // Початкова кількість ігор
            // Поле "Photo" поки не додаємо через API
        }
    };

    const tableName = 'Players';
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${tableName}`;

    console.log('Відправляємо дані для додавання гравця:', JSON.stringify(newPlayerData));

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${AIRTABLE_PERSONAL_ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(newPlayerData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Помилка додавання гравця в Airtable (статус):', response.status, errorData);
            alert(`Не вдалося додати гравця. Помилка: ${errorData.error?.message || response.status}`);
            return;
        }

        const createdPlayer = await response.json();
        console.log('Гравець успішно доданий в Airtable:', createdPlayer);
        alert(`Гравець "${playerName}" успішно доданий!`);

        playerNameInput.value = ''; // Очищуємо поле вводу імені
        // playerPhotoInput.value = ''; // Очищуємо поле фото (якщо б використовували)

        // Оновлюємо випадаючі списки гравців на сторінці
        await populatePlayerDropdowns(); 

    } catch (error) {
        console.error('Сталася помилка JavaScript під час додавання гравця:', error);
        alert('Сталася помилка JavaScript під час додавання гравця. Деталі в консолі.');
    }
}
