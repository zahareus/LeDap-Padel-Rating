// js/elo-calculator.js

const K_FACTOR = 30; // K-фактор, як ми обговорювали

/**
 * Розраховує зміну рейтингу Ело для гравців після одного сету.
 * @param {number} eloPlayerA1 - Рейтинг Ело гравця A1 (Команда A)
 * @param {number} eloPlayerA2 - Рейтинг Ело гравця A2 (Команда A)
 * @param {number} eloPlayerB1 - Рейтинг Ело гравця B1 (Команда B)
 * @param {number} eloPlayerB2 - Рейтинг Ело гравця B2 (Команда B)
 * @param {number} scoreTeamA - Рахунок команди A (кількість виграних геймів)
 * @param {number} scoreTeamB - Рахунок команди B (кількість виграних геймів)
 * @returns {number} Значення зміни рейтингу (додатне для переможців, від'ємне для переможених)
 * Або 0, якщо рахунок недійсний для визначення переможця.
 */
function calculateEloChangeForSet(eloPlayerA1, eloPlayerA2, eloPlayerB1, eloPlayerB2, scoreTeamA, scoreTeamB) {
    const averageEloTeamA = (eloPlayerA1 + eloPlayerA2) / 2;
    const averageEloTeamB = (eloPlayerB1 + eloPlayerB2) / 2;

    // Розрахунок очікуваного результату для Команди A
    const expectedScoreTeamA = 1 / (1 + Math.pow(10, (averageEloTeamB - averageEloTeamA) / 400));

    let actualScoreTeamA;
    let gameDifference;
    let winnerTeam; // 'A' or 'B'

    if (scoreTeamA > scoreTeamB) {
        actualScoreTeamA = 1; // Команда A виграла
        winnerTeam = 'A';
        gameDifference = scoreTeamA - scoreTeamB;
    } else if (scoreTeamB > scoreTeamA) {
        actualScoreTeamA = 0; // Команда A програла (Команда B виграла)
        winnerTeam = 'B';
        gameDifference = scoreTeamB - scoreTeamA;
    } else {
        // Нічия в сеті паделу зазвичай неможлива для фіксації рейтингу,
        // або має бути чіткий переможець сету.
        // Якщо ваш формат допускає нічиї, цю логіку треба адаптувати.
        // Поки що повертаємо 0, якщо рахунок однаковий (не визначає переможця).
        console.warn("Рахунок сету однаковий, неможливо визначити переможця для розрахунку Ело.");
        return 0; 
    }

    // Множник різниці в геймах (GDM)
    // GDM = 1 + 0.1 * РГ (Різниця в Геймах)
    const gdm = 1 + (0.1 * gameDifference);

    const eloChange = K_FACTOR * (actualScoreTeamA - expectedScoreTeamA) * gdm;

    // eloChange - це те, наскільки зміниться рейтинг Команди А.
    // Якщо Команда А виграла (actualScoreTeamA = 1), eloChange буде > 0.
    // Якщо Команда А програла (actualScoreTeamA = 0), eloChange буде < 0.
    // Кожен гравець команди-переможця отримує +eloChange (якщо eloChange позитивне) або -(eloChange) (якщо eloChange негативне, але команда виграла - це не має статись)
    // Кожен гравець команди-що-програла отримує -eloChange (якщо eloChange позитивне) або +eloChange (якщо eloChange негативне).

    // Функція повертає АБСОЛЮТНУ величину зміни для гравців команди, що виграла, 
    // та цю ж величину зі знаком мінус для гравців команди, що програла.
    // Або, простіше, повертаємо розраховану зміну для Команди А.
    // Гравці команди А отримають цю зміну, гравці команди Б - протилежну.
    return eloChange; 
}

// Приклад використання (можна розкоментувати для тестування в консолі браузера, якщо підключити файл)
/*
const change = calculateEloChangeForSet(1500, 1500, 1500, 1500, 6, 3);
console.log("Elo change for Team A members:", change);       // e.g., +11.4
console.log("Elo change for Team B members:", -change);      // e.g., -11.4

const change2 = calculateEloChangeForSet(1600, 1600, 1500, 1500, 6, 0);
console.log("Elo change for Team A members (stronger wins decisively):", change2); // e.g., +11.2 (K=30 * (1 - 0.64) * 1.6)
console.log("Elo change for Team B members:", -change2);

const change3 = calculateEloChangeForSet(1500, 1500, 1600, 1600, 7, 6); 
console.log("Elo change for Team A members (weaker wins narrowly):", change3); // e.g., +20.4 (K=30 * (1-0.36) * 1.1)
console.log("Elo change for Team B members:", -change3);
*/
