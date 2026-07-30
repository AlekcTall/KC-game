// js/achievements.js

function getAchievementsConfig() {
  return [
    // Существующие (без изменений)
    { id: 'first_game', name: 'Первый блин', description: 'Сыграйте в любую игру', icon: '🎮', hidden: false },
    { id: 'clicker_100', name: 'Кликоман', description: 'Наберите 100 кликов в кликере', icon: '🖱️', hidden: false },
    { id: 'clicker_1000', name: 'Мышку сломаешь!', description: 'Наберите 1000 кликов в кликере', icon: '💥🖱️', hidden: false },
    { id: 'snake_start', name: 'Змеелов', description: 'Начните игру в змейку', icon: '🐍', hidden: false },
    { id: 'snake_100', name: 'Удав', description: 'Съешьте 100 яблок в змейке', icon: '🐍', hidden: false },
    { id: 'snake_200', name: 'Анаконда', description: 'Съешьте 200 яблок в змейке', icon: '🐍', hidden: false },
    { id: 'snake_self', name: 'Самоед', description: 'Врежьтесь в себя в змейке', icon: '🐍', hidden: true },
    { id: 'snake_wall', name: 'Ауч!', description: 'Врежьтесь в стену в змейке', icon: '🐍', hidden: true },
    { id: 'memory_first', name: 'Помню', description: 'Откройте первую карту в найди пару', icon: '🧠', hidden: false },
    { id: 'memory_complete', name: 'Идеальная память', description: 'Завершите игру найди пару', icon: '🧠', hidden: false },
    { id: 'memory_12moves', name: 'Эконом', description: 'Найдите все пары за ≤12 ходов', icon: '🧠', hidden: false },
    { id: 'memory_30sec', name: 'Спидран', description: 'Найдите все пары за ≤30 секунд', icon: '🧠', hidden: false },
    { id: 'memory_8moves', name: 'Невозможно!', description: 'Найдите все пары ровно за 8 ходов', icon: '🧠', hidden: true },
    { id: 'profile_bio', name: 'О себе', description: 'Заполните поле «О себе» (минимум 10 символов)', icon: '✏️', hidden: true },
    { id: 'top10', name: 'В десятке', description: 'Попадите в топ‑10 общего рейтинга', icon: '🏆', hidden: false },
    { id: 'top3', name: 'Пьедестал', description: 'Займите 1, 2 или 3 место в рейтинге', icon: '🥇', hidden: false },
    { id: 'easter_logo', name: 'Лого‑кликер', description: 'Найдите пасхалку в логотипе', icon: '🥚', hidden: true },
    { id: 'easter_footer', name: 'Подвал', description: 'Найдите пасхалку в футере', icon: '🥚', hidden: true },
    { id: 'easter_symbol', name: 'Секретный символ', description: 'Найдите секретный символ на главной', icon: '🥚', hidden: true },
    { id: 'easter_konami', name: 'Konami', description: 'Введите Konami Code', icon: '🥚', hidden: true },
    { id: 'easter_word', name: 'Бонус', description: 'Введите секретное слово "бонус"', icon: '🥚', hidden: true },
    { id: '2048_512', name: 'Это только начало', description: 'Соберите плитку 512 в 2048', icon: '🔢', hidden: false },
    { id: '2048_2048', name: 'Вот почему она так называется', description: 'Соберите плитку 2048 в 2048', icon: '🔢', hidden: false },
    { id: '2048_4096', name: 'Прошел?', description: 'Соберите плитку 4096 в 2048', icon: '🔢', hidden: false },
    { id: '2048_8192', name: 'Х4', description: 'Соберите плитку 8192 в 2048', icon: '🔢', hidden: true },
    { id: 'minesweeper_loss', name: 'Одна нога тут, другая там', description: 'Подорвитесь на мине в сапёре', icon: '💣', hidden: false },
    { id: 'minesweeper_win', name: 'Без права на ошибку', description: 'Успешно завершите игру в сапёре', icon: '💣', hidden: false },
    { id: 'minesweeper_speed', name: 'Я скорость', description: 'Завершите сапёра за ≤10 секунд', icon: '💣', hidden: true },
    { id: 'daily_7', name: 'На связи', description: 'Заходите 7 дней подряд', icon: '📅', hidden: true },
    { id: 'daily_30', name: 'Железная воля', description: 'Заходите 30 дней подряд', icon: '📅', hidden: true },
    { id: 'daily_100', name: 'Старожил', description: 'Заходите 100 раз', icon: '📅', hidden: true },

    // Морской бой
    { id: 'battleship_5games', name: 'Морской волк', description: 'Сыграйте 5 партий в «Морской бой» (Морской бой)', icon: '🚢', hidden: false },
    { id: 'battleship_first_win', name: 'Боевое крещение', description: 'Одержите первую победу (Морской бой)', icon: '⚔️', hidden: false },
    { id: 'battleship_10wins', name: 'Адмирал', description: 'Одержите 10 побед (Морской бой)', icon: '🎖️', hidden: false },
    { id: 'battleship_25wins', name: 'Флотоводец', description: 'Одержите 25 побед (Морской бой)', icon: '🏅', hidden: false },
    { id: 'battleship_streak3', name: 'В ударе', description: 'Выиграйте 3 игры подряд (Морской бой)', icon: '🔥', hidden: true },
    { id: 'battleship_streak5', name: 'Неудержимый', description: 'Выиграйте 5 игр подряд (Морской бой)', icon: '💥', hidden: true },
    { id: 'battleship_sniper', name: 'Снайпер', description: 'Победите, сделав не более 30 выстрелов (Морской бой)', icon: '🎯', hidden: true },
    { id: 'battleship_unsinkable', name: 'Непотопляемый', description: 'Победите, не потеряв ни одного корабля (Морской бой)', icon: '🛡️', hidden: true },
    { id: 'battleship_pvp_win', name: 'Дуэлянт', description: 'Победите живого игрока (Морской бой)', icon: '🤝', hidden: false },
    { id: 'battleship_pve_win', name: 'Железный человек', description: 'Победите компьютер (Морской бой)', icon: '🤖', hidden: false },
    { id: 'battleship_sunk_4deck', name: 'Истребитель авианосцев', description: 'Потопите четырёхпалубный корабль (Морской бой)', icon: '✈️', hidden: true },

    // Крестики-нолики
    { id: 'tictactoe_first_win', name: 'Первая победа', description: 'Одержите первую победу (Крестики-нолики)', icon: '❌', hidden: false },
    { id: 'tictactoe_streak3', name: 'На кураже', description: 'Выиграйте 3 игры подряд (Крестики-нолики)', icon: '🔥', hidden: true },
    { id: 'tictactoe_draw', name: 'Миротворец', description: 'Сыграйте вничью (Крестики-нолики)', icon: '🤝', hidden: true },
    { id: 'tictactoe_beat_hard', name: 'Превзойдя машину', description: 'Победите сложный ИИ (Крестики-нолики)', icon: '👑', hidden: true },
    { id: 'tictactoe_pvp_win', name: 'Дуэлянт', description: 'Победите живого игрока (Крестики-нолики)', icon: '⚔️', hidden: false },

    // Камень-ножницы-бумага
    { id: 'rps_first_win', name: 'Первая победа', description: 'Одержите первую победу (Камень-ножницы-бумага)', icon: '✊', hidden: false },
    { id: 'rps_streak3', name: 'На кураже', description: 'Выиграйте 3 игры подряд (Камень-ножницы-бумага)', icon: '🔥', hidden: true },
    { id: 'rps_beat_hard', name: 'Превзойдя машину', description: 'Победите сложный ИИ (Камень-ножницы-бумага)', icon: '👑', hidden: true },
    { id: 'rps_pvp_win', name: 'Дуэлянт', description: 'Победите живого игрока (Камень-ножницы-бумага)', icon: '⚔️', hidden: false },

    // Тетрис
    { id: 'tetris_5games', name: 'Тетрис-любитель', description: 'Сыграйте 5 игр в Тетрис', icon: '🧱', hidden: false },
    { id: 'tetris_1line', name: 'Первая линия', description: 'Соберите 1 линию в Тетрисе', icon: '📏', hidden: false },
    { id: 'tetris_tetris', name: 'Тетрис', description: 'Соберите 4 линии одновременно (Тетрис)', icon: '🔥', hidden: true },
    { id: 'tetris_20lines', name: 'Строитель', description: 'Соберите 20 линий за одну игру (Тетрис)', icon: '🏗️', hidden: true },
    { id: 'tetris_5000score', name: 'Скоростной режим', description: 'Наберите 5000 очков в Тетрисе', icon: '⚡', hidden: false },
    { id: 'tetris_10000score', name: 'Ниндзя', description: 'Наберите 10000 очков в Тетрисе', icon: '🥷', hidden: true },
    { id: 'tetris_level10', name: 'Неудержимый', description: 'Достигните 10-го уровня в Тетрисе', icon: '💪', hidden: true },

    // НОВЫЕ ПАСХАЛКИ (скрытые)
    { id: 'easter_dark_side', name: 'Тёмная сторона', description: 'Купите тёмную тему в магазине', icon: '🌑', hidden: true },
    { id: 'easter_collector', name: 'Коллекционер', description: 'Соберите 10 разных достижений', icon: '🏅', hidden: true },
    { id: 'easter_silence', name: 'В тишине', description: 'Очистите все уведомления', icon: '🔕', hidden: true },
    { id: 'easter_night_guest', name: 'Ночной гость', description: 'Зайдите на сайт с 2:00 до 4:00', icon: '🦉', hidden: true },
    { id: 'easter_conspirator', name: 'Конспиратор', description: 'Откройте консоль браузера', icon: '🕵️', hidden: true },
    { id: 'easter_selfie', name: 'Селфи', description: 'Посмотрите на себя в публичном профиле', icon: '🤳', hidden: true },
    { id: 'easter_meteorism', name: 'Метеоризм', description: 'Проиграйте в сапёра 5 раз подряд', icon: '☄️', hidden: true },
    { id: 'easter_librarian', name: 'Библиотекарь', description: 'Доскролльте страницу помощи до конца', icon: '📚', hidden: true },
    { id: 'easter_first_purchase', name: 'Первый покупатель', description: 'Совершите первую покупку в магазине', icon: '🛍️', hidden: true }
  ];
}

// Получение глобальной статистики достижения (процент игроков)
async function getAchievementStats(achievementId) {
  try {
    const snap = await db.collection('users').get();
    let total = 0;
    let unlocked = 0;
    snap.forEach(doc => {
      const d = doc.data();
      if (d.role === 'admin') return;
      total++;
      if ((d.achievements || []).includes(achievementId)) unlocked++;
    });
    if (total === 0) return 0;
    return Math.round((unlocked / total) * 100);
  } catch (e) {
    console.error('Ошибка получения статистики достижения:', e);
    return 0;
  }
}

// Асинхронная проверка достижений
async function checkAndAwardAchievements() {
  const user = auth.currentUser;
  if (!user) return;

  const userDoc = await db.collection('users').doc(user.uid).get();
  if (!userDoc.exists) return;
  const data = userDoc.data();
  let unlocked = data.achievements || [];
  const gameStats = data.gameStats || {};
  const gameHistory = data.gameHistory || [];
  const easterEggs = data.easterEggsFound || [];
  const description = data.description || '';
  const dailyLogin = data.dailyLogin || {};
  const battleshipStats = data.battleshipStats || {};
  const tictactoeStats = data.tictactoeStats || {};
  const rpsStats = data.rpsStats || {};

  const config = getAchievementsConfig();
  const newlyUnlocked = [];
  const toRemove = [];

  for (const ach of config) {
    const alreadyUnlocked = unlocked.includes(ach.id);
    let earned = false;

    switch (ach.id) {
      // Существующие
      case 'first_game': earned = gameHistory.length > 0; break;
      case 'clicker_100': earned = (gameStats.clicker?.totalClicks || 0) >= 100; break;
      case 'clicker_1000': earned = (gameStats.clicker?.totalClicks || 0) >= 1000; break;
      case 'snake_start': earned = gameStats.snake?.maxScore !== undefined; break;
      case 'snake_100': earned = (gameStats.snake?.maxScore || 0) >= 100; break;
      case 'snake_200': earned = (gameStats.snake?.maxScore || 0) >= 200; break;
      case 'snake_self': earned = gameStats.snake?.selfEaten === true; break;
      case 'snake_wall': earned = gameStats.snake?.wallCrash === true; break;
      case 'memory_first': earned = gameStats.memory?.openedFirst === true; break;
      case 'memory_complete': earned = gameStats.memory?.completed === true; break;
      case 'memory_12moves': earned = gameStats.memory?.completed && gameStats.memory.bestMoves <= 12; break;
      case 'memory_30sec': earned = gameStats.memory?.completed && gameStats.memory.bestTime <= 30; break;
      case 'memory_8moves': earned = gameStats.memory?.completed && gameStats.memory.bestMoves === 8; break;
      case 'profile_bio': earned = description.length >= 10; break;

      case 'top10':
      case 'top3': {
        const snap = await db.collection('users').get();
        const allPlayers = [];
        snap.forEach(doc => {
          const d = doc.data();
          if (d.role !== 'admin') allPlayers.push({ uid: doc.id, points: d.points || 0 });
        });
        allPlayers.sort((a, b) => b.points - a.points);
        const rank = allPlayers.findIndex(p => p.uid === user.uid) + 1;
        if (ach.id === 'top10') {
          earned = (rank > 0 && rank <= 10);
          if (!earned && alreadyUnlocked) toRemove.push(ach.id);
        }
        if (ach.id === 'top3') {
          earned = (rank > 0 && rank <= 3);
          if (!earned && alreadyUnlocked) toRemove.push(ach.id);
        }
        break;
      }

      case 'easter_logo': earned = easterEggs.includes('logo'); break;
      case 'easter_footer': earned = easterEggs.includes('footer'); break;
      case 'easter_symbol': earned = easterEggs.includes('symbol'); break;
      case 'easter_konami': earned = easterEggs.includes('konami'); break;
      case 'easter_word': earned = easterEggs.includes('word'); break;

      case '2048_512': earned = (gameStats['2048']?.maxTile || 0) >= 512; break;
      case '2048_2048': earned = (gameStats['2048']?.maxTile || 0) >= 2048; break;
      case '2048_4096': earned = (gameStats['2048']?.maxTile || 0) >= 4096; break;
      case '2048_8192': earned = (gameStats['2048']?.maxTile || 0) >= 8192; break;

      case 'minesweeper_loss': earned = gameStats.minesweeper?.loss === true; break;
      case 'minesweeper_win': earned = gameStats.minesweeper?.completed === true; break;
      case 'minesweeper_speed': earned = gameStats.minesweeper?.completed && (gameStats.minesweeper.bestTime || 999) <= 10; break;

      case 'daily_7': earned = (dailyLogin.longestStreak || 0) >= 7; break;
      case 'daily_30': earned = (dailyLogin.longestStreak || 0) >= 30; break;
      case 'daily_100': earned = (dailyLogin.totalLogins || 0) >= 100; break;

      // Морской бой
      case 'battleship_5games': earned = (gameHistory.filter(h => h.game === 'battleship').length >= 5); break;
      case 'battleship_first_win': earned = ((battleshipStats.pvpWins || 0) + (battleshipStats.pveWins || 0)) >= 1; break;
      case 'battleship_10wins': earned = ((battleshipStats.pvpWins || 0) + (battleshipStats.pveWins || 0)) >= 10; break;
      case 'battleship_25wins': earned = ((battleshipStats.pvpWins || 0) + (battleshipStats.pveWins || 0)) >= 25; break;
      case 'battleship_streak3': earned = (battleshipStats.bestWinStreak || 0) >= 3; break;
      case 'battleship_streak5': earned = (battleshipStats.bestWinStreak || 0) >= 5; break;
      case 'battleship_sniper': earned = (battleshipStats.sniperGame || false) === true; break;
      case 'battleship_unsinkable': earned = (battleshipStats.unsinkableGame || false) === true; break;
      case 'battleship_pvp_win': earned = (battleshipStats.pvpWins || 0) >= 1; break;
      case 'battleship_pve_win': earned = (battleshipStats.pveWins || 0) >= 1; break;
      case 'battleship_sunk_4deck': earned = (battleshipStats.sunk4Deck || false) === true; break;

      // Крестики-нолики
      case 'tictactoe_first_win': earned = ((tictactoeStats.pvpWins || 0) + (tictactoeStats.pveWins || 0)) >= 1; break;
      case 'tictactoe_streak3': earned = (tictactoeStats.bestWinStreak || 0) >= 3; break;
      case 'tictactoe_draw': earned = ((tictactoeStats.pvpDraws || 0) + (tictactoeStats.pveDraws || 0)) >= 1; break;
      case 'tictactoe_beat_hard': earned = (tictactoeStats.beatHardAI || false) === true; break;
      case 'tictactoe_pvp_win': earned = (tictactoeStats.pvpWins || 0) >= 1; break;

      // Камень-ножницы-бумага
      case 'rps_first_win': earned = ((rpsStats.pvpWins || 0) + (rpsStats.pveWins || 0)) >= 1; break;
      case 'rps_streak3': earned = (rpsStats.bestWinStreak || 0) >= 3; break;
      case 'rps_beat_hard': earned = (rpsStats.beatHardAI || false) === true; break;
      case 'rps_pvp_win': earned = (rpsStats.pvpWins || 0) >= 1; break;

      // Тетрис
      case 'tetris_5games': earned = (gameHistory.filter(h => h.game === 'tetris').length >= 5); break;
      case 'tetris_1line': earned = (gameStats.tetris?.maxLines || 0) >= 1 || gameHistory.some(h => h.game === 'tetris'); break;
      case 'tetris_tetris': earned = (gameStats.tetris?.tetrisCleared || false) === true; break;
      case 'tetris_20lines': earned = (gameStats.tetris?.maxLines || 0) >= 20; break;
      case 'tetris_5000score': earned = (gameStats.tetris?.maxScore || 0) >= 5000; break;
      case 'tetris_10000score': earned = (gameStats.tetris?.maxScore || 0) >= 10000; break;
      case 'tetris_level10': earned = (gameStats.tetris?.maxLevel || 0) >= 10; break;

      // НОВЫЕ ПАСХАЛКИ
      case 'easter_dark_side': earned = (easterEggs || []).includes('dark_side'); break;
      case 'easter_collector': earned = (unlocked.length >= 10); break;
      case 'easter_silence': earned = (easterEggs || []).includes('silence'); break;
      case 'easter_night_guest': earned = (easterEggs || []).includes('night_guest'); break;
      case 'easter_conspirator': earned = (easterEggs || []).includes('conspirator'); break;
      case 'easter_selfie': earned = (easterEggs || []).includes('selfie'); break;
      case 'easter_meteorism': earned = (easterEggs || []).includes('meteorism'); break;
      case 'easter_librarian': earned = (easterEggs || []).includes('librarian'); break;
      case 'easter_first_purchase': earned = (easterEggs || []).includes('first_purchase'); break;
    }

    if (earned && !alreadyUnlocked) {
      unlocked.push(ach.id);
      newlyUnlocked.push(ach);
    } else if (!earned && alreadyUnlocked && toRemove.includes(ach.id)) {
      // удалим ниже
    }
  }

  if (toRemove.length > 0) {
    unlocked = unlocked.filter(id => !toRemove.includes(id));
  }

  if (newlyUnlocked.length > 0 || toRemove.length > 0) {
    await db.collection('users').doc(user.uid).update({ achievements: unlocked });
    const current = getCurrentUser();
    if (current) {
      current.achievements = unlocked;
      setCurrentUser(current);
    }

    for (const ach of newlyUnlocked) {
      await addNotification(user.uid, `Получено достижение: ${ach.icon} ${ach.name}`, 'achievement', 'profile.html');
    }

    // Дополнительно проверяем "Коллекционера" после обновления
    if (unlocked.length >= 10 && !unlocked.includes('easter_collector')) {
      if (typeof window.checkCollector === 'function') {
        await window.checkCollector();
      }
    }
  }
}
