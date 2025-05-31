// js/admin-scripts.js
console.log('AIRTABLE_BASE_ID в admin-scripts.js:', typeof AIRTABLE_BASE_ID, AIRTABLE_BASE_ID);

document.addEventListener('DOMContentLoaded', function() {
    populatePlayerDropdowns();

    const addPlayerForm = document.getElementById('add-player-form');
    if (addPlayerForm) {
        addPlayerForm.addEventListener('submit', handleAddPlayer);
    } else {
        console.warn("Форму 'add-player-form' не знайдено.");
    }
    
    const recordMatchForm = document.getElementById('record-match-form');
    if (recordMatchForm) {
        recordMatchForm.addEventListener('submit', handleRecordMatch);
    } else {
        console.warn("Форму 'record-match-form' не знайдено.");
    }
});

async function fetchPlayersForDropdown() {
    const tableName = 'Players';
    const sortField = 'Name'; 
    const sortDirection = 'asc';
    const viewName = 'Grid view'; // Перевірте назву вашого представлення в Airtable 'Players'

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
    console.log('Запускаємо populatePlayerDropdowns...');
    const players = await fetchPlayersForDropdown();
    console.log('Гравці для дропдаунів отримані:', players.length > 0 ? players.length + ' гравців' : 'немає гравців'); 

    const dropdownIds = ['t1-player1', 't1-player2', 't2-player1', 't2-player2'];
    
    dropdownIds.forEach(dropdownId => {
        const selectElement = document.getElementById(dropdownId);
        if (selectElement) {
            const currentValue = selectElement.value; 
            
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
            if (players.some(p => p.id === currentValue)) {
                 selectElement.value = currentValue;
            }
        } else {
            console.warn(`Елемент select з ID "${dropdownId}" не знайдено.`);
        }
    });
     console.log('populatePlayerDropdowns завершено.');
}

async function handleAddPlayer(event) {
    event.preventDefault(); 

    const playerNameInput = document.getElementById('player-name');
    const playerName = playerNameInput.value.trim();

    if (!playerName) {
        alert('Будь ласка, введіть ім\'я гравця.');
        return;
    }

    const newPlayerData = {
        fields: {
            "Name": playerName,
            "Elo": 1500,          
            "GamesPlayed": 0      
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

        playerNameInput.value = ''; 
        await populatePlayerDropdowns(); 

    } catch (error) {
        console.error('Сталася помилка JavaScript під час додавання гравця:', error);
        alert('Сталася помилка JavaScript під час додавання гравця. Деталі в консолі.');
    }
}

async function handleRecordMatch(event) {
    event.preventDefault(); 
    console.log("Форма реєстрації матчу відправлена.");

    const submitButton = event.target.querySelector('button[type="submit"]');
    submitButton.disabled = true; // Блокуємо кнопку на час обробки
    submitButton.textContent = 'Обробка...';

    // 1. Збір даних з форми (без змін)
    const t1p1_id = document.getElementById('t1-player1').value;
    const t1p2_id = document.getElementById('t1-player2').value;
    const t2p1_id = document.getElementById('t2-player1').value;
    const t2p2_id = document.getElementById('t2-player2').value;
    const scoreTeam1 = parseInt(document.getElementById('t1-score').value);
    const scoreTeam2 = parseInt(document.getElementById('t2-score').value);
    const matchDate = document.getElementById('match-date').value;

    // 2. Валідація даних (без змін)
    if (!t1p1_id || !t1p2_id || !t2p1_id || !t2p2_id) {
        alert('Будь ласка, оберіть усіх чотирьох гравців.');
        submitButton.disabled = false; submitButton.textContent = 'Зареєструвати сет';
        return;
    }
    const playerIds = [t1p1_id, t1p2_id, t2p1_id, t2p2_id];
    const uniquePlayerIds = new Set(playerIds);
    if (uniquePlayerIds.size !== 4) {
        alert('Гравці не повинні повторюватися в одному матчі.');
        submitButton.disabled = false; submitButton.textContent = 'Зареєструвати сет';
        return;
    }
    if (isNaN(scoreTeam1) || isNaN(scoreTeam2) || scoreTeam1 < 0 || scoreTeam2 < 0) {
        alert('Будь ласка, введіть коректний рахунок (невід\'ємні числа).');
        submitButton.disabled = false; submitButton.textContent = 'Зареєструвати сет';
        return;
    }
    if (scoreTeam1 === scoreTeam2) {
        alert('Рахунок не може бути нічийним для зміни рейтингу.');
        submitButton.disabled = false; submitButton.textContent = 'Зареєструвати сет';
        return;
    }
    if (!matchDate) {
        alert('Будь ласка, оберіть дату матчу.');
        submitButton.disabled = false; submitButton.textContent = 'Зареєструвати сет';
        return;
    }

    // 3. Отримання поточних даних гравців (без змін)
    const filterFormula = "OR(" + playerIds.map(id => `RECORD_ID()='${id}'`).join(',') + ")";
    const fetchPlayersUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Players?filterByFormula=${encodeURIComponent(filterFormula)}`;
    
    try {
        const playerDetailsResponse = await fetch(fetchPlayersUrl, {
            headers: { 'Authorization': `Bearer ${AIRTABLE_PERSONAL_ACCESS_TOKEN}` }
        });
        if (!playerDetailsResponse.ok) {
            const errorText = await playerDetailsResponse.text();
            console.error('Помилка отримання даних гравців з Airtable:', playerDetailsResponse.status, errorText);
            alert(`Не вдалося отримати дані гравців. Статус: ${playerDetailsResponse.status}. Деталі: ${errorText}`);
            submitButton.disabled = false; submitButton.textContent = 'Зареєструвати сет';
            return;
        }
        const playerDataResponse = await playerDetailsResponse.json();
        const currentPlayersData = {}; 
        if (playerDataResponse.records.length !== 4) {
            alert('Не вдалося отримати дані для всіх обраних гравців. Перевірте консоль.');
            submitButton.disabled = false; submitButton.textContent = 'Зареєструвати сет';
            return;
        }
        playerDataResponse.records.forEach(record => {
            currentPlayersData[record.id] = {
                elo: record.fields.Elo,
                gamesPlayed: record.fields.GamesPlayed || 0,
                name: record.fields.Name,
                recordId: record.id 
            };
        });
        
        // 4. Виклик elo-calculator.js (без змін)
        const pA1 = currentPlayersData[t1p1_id];
        const pA2 = currentPlayersData[t1p2_id];
        const pB1 = currentPlayersData[t2p1_id];
        const pB2 = currentPlayersData[t2p2_id];
        if (!pA1 || !pA2 || !pB1 || !pB2) {
            alert('Не вдалося отримати повні дані для всіх гравців. Розрахунок Ело неможливий.');
            submitButton.disabled = false; submitButton.textContent = 'Зареєструвати сет';
            return;
        }
        const eloChangeForTeamA = calculateEloChangeForSet(pA1.elo, pA2.elo, pB1.elo, pB2.elo, scoreTeam1, scoreTeam2);

        // 5. Підготовка даних (змінено назви payload на більш описові)
        const playersUpdateData = {
            records: [
                { id: pA1.recordId, fields: { "Elo": Math.round(pA1.elo + eloChangeForTeamA), "GamesPlayed": pA1.gamesPlayed + 1 } },
                { id: pA2.recordId, fields: { "Elo": Math.round(pA2.elo + eloChangeForTeamA), "GamesPlayed": pA2.gamesPlayed + 1 } },
                { id: pB1.recordId, fields: { "Elo": Math.round(pB1.elo - eloChangeForTeamA), "GamesPlayed": pB1.gamesPlayed + 1 } },
                { id: pB2.recordId, fields: { "Elo": Math.round(pB2.elo - eloChangeForTeamA), "GamesPlayed": pB2.gamesPlayed + 1 } }
            ]
        };
        const matchCreateData = {
            records: [{ // Для створення одного запису також потрібен масив records з одним об'єктом
                fields: {
                    "Team1_Player1": [t1p1_id], 
                    "Team1_Player2": [t1p2_id],
                    "Team2_Player1": [t2p1_id],
                    "Team2_Player2": [t2p2_id],
                    "Team1_Score": scoreTeam1,
                    "Team2_Score": scoreTeam2,
                    "MatchDate": matchDate,
                    "MatchProcessed": true 
                }
            }]
        };
        
        // 6. Виконання запитів до Airtable
        console.log("Надсилаємо оновлення для гравців:", JSON.stringify(playersUpdateData));
        const updatePlayersResponse = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Players`, {
            method: 'PATCH', // Використовуємо PATCH для оновлення існуючих записів
            headers: {
                'Authorization': `Bearer ${AIRTABLE_PERSONAL_ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(playersUpdateData)
        });

        if (!updatePlayersResponse.ok) {
            const errorText = await updatePlayersResponse.text();
            console.error('Помилка оновлення даних гравців в Airtable:', updatePlayersResponse.status, errorText);
            alert(`Не вдалося оновити дані гравців. Статус: ${updatePlayersResponse.status}. Деталі: ${errorText}`);
            submitButton.disabled = false; submitButton.textContent = 'Зареєструвати сет';
            return;
        }
        console.log("Дані гравців успішно оновлено.");

        // Створюємо запис про матч
        console.log("Надсилаємо дані для створення матчу:", JSON.stringify(matchCreateData));
        const createMatchResponse = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Matches`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${AIRTABLE_PERSONAL_ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(matchCreateData)
        });

        if (!createMatchResponse.ok) {
            const errorText = await createMatchResponse.text();
            console.error('Помилка створення запису матчу в Airtable:', createMatchResponse.status, errorText);
            alert(`Не вдалося створити запис матчу. Статус: ${createMatchResponse.status}. Деталі: ${errorText}`);
            submitButton.disabled = false; submitButton.textContent = 'Зареєструвати сет';
            return;
        }
        const createdMatchResult = await createMatchResponse.json();
        const newMatchId = createdMatchResult.records[0].id; // Отримуємо ID створеного матчу
        console.log("Запис матчу успішно створено. ID матчу:", newMatchId);

        // Готуємо та створюємо записи для EloHistory
        const eloHistoryCreateData = {
            records: [
                { fields: { "Player": [pA1.recordId], "Match": [newMatchId], "Elo_Before": pA1.elo, "Elo_After": Math.round(pA1.elo + eloChangeForTeamA), "Change": Math.round(eloChangeForTeamA) } },
                { fields: { "Player": [pA2.recordId], "Match": [newMatchId], "Elo_Before": pA2.elo, "Elo_After": Math.round(pA2.elo + eloChangeForTeamA), "Change": Math.round(eloChangeForTeamA) } },
                { fields: { "Player": [pB1.recordId], "Match": [newMatchId], "Elo_Before": pB1.elo, "Elo_After": Math.round(pB1.elo - eloChangeForTeamA), "Change": Math.round(-eloChangeForTeamA) } },
                { fields: { "Player": [pB2.recordId], "Match": [newMatchId], "Elo_Before": pB2.elo, "Elo_After": Math.round(pB2.elo - eloChangeForTeamA), "Change": Math.round(-eloChangeForTeamA) } }
            ]
        };
        console.log("Надсилаємо дані для історії Ело:", JSON.stringify(eloHistoryCreateData));
        const createEloHistoryResponse = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/EloHistory`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${AIRTABLE_PERSONAL_ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(eloHistoryCreateData)
        });

        if (!createEloHistoryResponse.ok) {
            const errorText = await createEloHistoryResponse.text();
            console.error('Помилка створення записів історії Ело в Airtable:', createEloHistoryResponse.status, errorText);
            // На цьому етапі основні дані вже збережено, тому можна не зупиняти все, а просто попередити
            alert(`Увага: Не вдалося створити записи історії Ело. Статус: ${createEloHistoryResponse.status}. Деталі: ${errorText}`);
        } else {
            console.log("Записи історії Ело успішно створено.");
        }

        // 7. Обробка результатів та повідомлення користувачу
        alert('Результат матчу успішно зареєстровано та рейтинги оновлено!');
        
        // 8. Очищення форми
        document.getElementById('record-match-form').reset(); // Скидає всі поля форми до початкових значень
        // Оновлюємо дропдауни, якщо раптом список гравців змінився (малоймовірно на цьому етапі, але для консистентності)
        // або якщо ми захочемо показувати їх поточний Elo в дропдаунах у майбутньому.
        await populatePlayerDropdowns();


    } catch (error) {
        console.error('Сталася помилка JavaScript під час обробки матчу:', error);
        alert('Сталася помилка JavaScript. Деталі в консолі.');
    } finally {
        // Повертаємо кнопку до активного стану
        submitButton.disabled = false;
        submitButton.textContent = 'Зареєструвати сет';
    }
}
