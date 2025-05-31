// js/admin-scripts.js
console.log('AIRTABLE_BASE_ID в admin-scripts.js:', typeof AIRTABLE_BASE_ID, AIRTABLE_BASE_ID); // Для діагностики

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

    // 1. Збір даних з форми
    const t1p1_id = document.getElementById('t1-player1').value;
    const t1p2_id = document.getElementById('t1-player2').value;
    const t2p1_id = document.getElementById('t2-player1').value;
    const t2p2_id = document.getElementById('t2-player2').value;

    const scoreTeam1 = parseInt(document.getElementById('t1-score').value);
    const scoreTeam2 = parseInt(document.getElementById('t2-score').value);
    const matchDate = document.getElementById('match-date').value;

    console.log("Зібрані ID гравців:", { t1p1_id, t1p2_id, t2p1_id, t2p2_id });
    console.log("Рахунок:", { scoreTeam1, scoreTeam2 });
    console.log("Дата матчу:", matchDate);

    // 2. Валідація даних
    if (!t1p1_id || !t1p2_id || !t2p1_id || !t2p2_id) {
        alert('Будь ласка, оберіть усіх чотирьох гравців.');
        return;
    }
    const playerIds = [t1p1_id, t1p2_id, t2p1_id, t2p2_id];
    const uniquePlayerIds = new Set(playerIds);
    if (uniquePlayerIds.size !== 4) {
        alert('Гравці не повинні повторюватися в одному матчі.');
        return;
    }
    if (isNaN(scoreTeam1) || isNaN(scoreTeam2) || scoreTeam1 < 0 || scoreTeam2 < 0) {
        alert('Будь ласка, введіть коректний рахунок (невід\'ємні числа).');
        return;
    }
    if (scoreTeam1 === scoreTeam2) {
        alert('Рахунок не може бути нічийним для зміни рейтингу.');
        return;
    }
    if (!matchDate) {
        alert('Будь ласка, оберіть дату матчу.');
        return;
    }

    // 3. Отримання поточних даних гравців (Elo, GamesPlayed) з Airtable
    const filterFormula = "OR(" + playerIds.map(id => `RECORD_ID()='${id}'`).join(',') + ")";
    const fetchPlayersUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Players?filterByFormula=${encodeURIComponent(filterFormula)}`;
    console.log("Запит для отримання даних гравців:", fetchPlayersUrl);

    try {
        const response = await fetch(fetchPlayersUrl, {
            headers: { 'Authorization': `Bearer ${AIRTABLE_PERSONAL_ACCESS_TOKEN}` }
        });
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Помилка отримання даних гравців з Airtable:', response.status, errorText);
            alert(`Не вдалося отримати дані гравців. Статус: ${response.status}. Деталі: ${errorText}`);
            return;
        }
        const playerDataResponse = await response.json();
        const currentPlayersData = {}; 
        if (playerDataResponse.records.length !== 4) {
            console.error('Отримано невірну кількість гравців:', playerDataResponse.records);
            alert('Не вдалося отримати дані для всіх обраних гравців. Перевірте консоль.');
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
        console.log("Поточні дані гравців отримано:", currentPlayersData);

        // 4. Виклик elo-calculator.js
        const pA1 = currentPlayersData[t1p1_id];
        const pA2 = currentPlayersData[t1p2_id];
        const pB1 = currentPlayersData[t2p1_id];
        const pB2 = currentPlayersData[t2p2_id];

        // Перевірка, чи всі дані гравців завантажено коректно перед розрахунком
        if (!pA1 || !pA2 || !pB1 || !pB2) {
            alert('Не вдалося отримати повні дані для всіх гравців. Розрахунок Ело неможливий.');
            console.error('Дані для розрахунку Ело неповні:', {pA1, pA2, pB1, pB2});
            return;
        }
        
        const eloChangeForTeamA = calculateEloChangeForSet(
            pA1.elo, pA2.elo, 
            pB1.elo, pB2.elo, 
            scoreTeam1, scoreTeam2
        );
        console.log("Розрахована зміна Ело для Команди A:", eloChangeForTeamA.toFixed(2));

        // 5. Підготовка даних для оновлення в Airtable
        const playersToUpdatePayload = {
            records: [
                { id: pA1.recordId, fields: { "Elo": Math.round(pA1.elo + eloChangeForTeamA), "GamesPlayed": pA1.gamesPlayed + 1 } },
                { id: pA2.recordId, fields: { "Elo": Math.round(pA2.elo + eloChangeForTeamA), "GamesPlayed": pA2.gamesPlayed + 1 } },
                { id: pB1.recordId, fields: { "Elo": Math.round(pB1.elo - eloChangeForTeamA), "GamesPlayed": pB1.gamesPlayed + 1 } },
                { id: pB2.recordId, fields: { "Elo": Math.round(pB2.elo - eloChangeForTeamA), "GamesPlayed": pB2.gamesPlayed + 1 } }
            ]
        };
        console.log("Дані для оновлення гравців (PATCH payload):", JSON.stringify(playersToUpdatePayload, null, 2));

        const newMatchDataPayload = {
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
        };
        console.log("Дані для нового матчу (POST payload):", JSON.stringify(newMatchDataPayload, null, 2));
        
        // EloHistory records will be prepared after we get the new Match ID
        // For now, let's log what would be the content for Elo_After for history records
        const eloHistoryPreview = [
            { player: pA1.name, eloBefore: pA1.elo, eloAfter: Math.round(pA1.elo + eloChangeForTeamA) },
            { player: pA2.name, eloBefore: pA2.elo, eloAfter: Math.round(pA2.elo + eloChangeForTeamA) },
            { player: pB1.name, eloBefore: pB1.elo, eloAfter: Math.round(pB1.elo - eloChangeForTeamA) },
            { player: pB2.name, eloBefore: pB2.elo, eloAfter: Math.round(pB2.elo - eloChangeForTeamA) }
        ];
        console.log("Попередній перегляд даних для історії Ело (після розрахунку):", eloHistoryPreview);


        // 6. Виконання запитів до Airtable (буде реалізовано наступним кроком)
        alert('Дані для оновлення підготовлено! Дивіться консоль. Надсилання на сервер буде наступним кроком.');
        
        // 7. Обробка результатів та повідомлення користувачу (наступним кроком)
        // 8. Очищення форми (наступним кроком)

    } catch (error) {
        console.error('Сталася помилка JavaScript під час обробки матчу:', error);
        alert('Сталася помилка JavaScript. Деталі в консолі.');
    }
}
