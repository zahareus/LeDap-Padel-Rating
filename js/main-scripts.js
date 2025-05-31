
// js/main-scripts.js

// Чекаємо, поки весь HTML-контент сторінки буде завантажено
document.addEventListener('DOMContentLoaded', function() {
    fetchAndDisplayPlayers();
});

async function fetchAndDisplayPlayers() {
    const playersListDiv = document.getElementById('players-ranking-list');
    if (!playersListDiv) {
        console.error('Елемент #players-ranking-list не знайдено!');
        return;
    }

    // Показуємо повідомлення про завантаження
    playersListDiv.innerHTML = '<p>Завантаження рейтингу гравців...</p>';

    // Формуємо URL для запиту до Airtable
    // Ми хочемо отримати дані з таблиці 'Players'
    // І відсортувати їх за полем 'Elo' в спадаючому порядку (desc)
    // MaxRecords обмежує кількість записів, які ми отримуємо (можна збільшити, якщо потрібно)
    const tableName = 'Players';
    const sortField = 'Elo';
    const sortDirection = 'desc';
    const viewName = 'Grid view'; // Зазвичай стандартна назва представлення в Airtable

    // Airtable вимагає вказувати назву представлення ('view') для сортування
    // Якщо ваше головне представлення називається інакше, змініть 'Grid view'
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${tableName}?maxRecords=100&view=${encodeURIComponent(viewName)}&sort[0][field]=${sortField}&sort[0][direction]=${sortDirection}`;

    try {
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${AIRTABLE_PERSONAL_ACCESS_TOKEN}`
            }
        });

        if (!response.ok) {
            // Якщо відповідь не успішна (наприклад, помилка 401, 403, 404)
            const errorData = await response.json();
            console.error('Помилка завантаження даних з Airtable:', response.status, errorData);
            playersListDiv.innerHTML = `<p>Не вдалося завантажити рейтинг. Помилка: ${response.status}. Перевірте консоль.</p>`;
            return;
        }

        const data = await response.json();
        const players = data.records;

        if (players && players.length > 0) {
            playersListDiv.innerHTML = ''; // Очищуємо повідомлення про завантаження

            players.forEach(playerRecord => {
                const player = playerRecord.fields; // Дані гравця знаходяться в об'єкті 'fields'

                // Створюємо HTML-елемент для картки гравця
                const playerCard = document.createElement('div');
                playerCard.classList.add('player-card'); // Додамо клас для можливої стилізації

                let photoHtml = '<img src="images/default_avatar.png" alt="Фото гравця" class="player-photo-small">'; // Заглушка, якщо фото немає
                if (player.Photo && player.Photo.length > 0 && player.Photo[0].thumbnails && player.Photo[0].thumbnails.large) {
                    // Airtable для фотографій (Attachment field) повертає масив. Беремо перше фото.
                    // Використовуємо 'large' thumbnail для кращої якості, але не надто великого розміру.
                    // Можна також використовувати player.Photo[0].url для оригінального розміру, але це може бути занадто велике.
                    photoHtml = `<img src="${player.Photo[0].thumbnails.large.url}" alt="${player.Name || 'Фото гравця'}" class="player-photo-small">`;
                }
                
                playerCard.innerHTML = `
                    ${photoHtml}
                    <div class="player-info">
                        <h3>${player.Name || 'N/A'}</h3>
                        <p><strong>Рейтинг Ело:</strong> ${player.Elo !== undefined ? player.Elo.toFixed(0) : 'N/A'}</p>
                        <p><strong>Зіграно сетів:</strong> ${player.GamesPlayed !== undefined ? player.GamesPlayed : 'N/A'}</p>
                    </div>
                `;
                playersListDiv.appendChild(playerCard);
            });
        } else {
            playersListDiv.innerHTML = '<p>Поки що немає жодного гравця в рейтингу.</p>';
        }

    } catch (error) {
        console.error('Сталася помилка під час виконання запиту:', error);
        playersListDiv.innerHTML = '<p>Сталася помилка при завантаженні рейтингу. Будь ласка, спробуйте пізніше.</p>';
    }
}

// Додаткові стилі для .player-card та .player-photo-small можуть знадобитися в style.css
// Наприклад:
.player-card { display: flex; align-items: center; margin-bottom: 15px; padding: 10px; border: 1px solid #eee; border-radius: 5px; }
.player-photo-small { width: 60px; height: 60px; border-radius: 50%; margin-right: 15px; object-fit: cover; }
.player-info h3 { margin: 0 0 5px 0; }
.player-info p { margin: 0; font-size: 0.9em; }
