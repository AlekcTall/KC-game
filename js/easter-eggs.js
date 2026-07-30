// js/easter-eggs.js

// Пасхалки (easter eggs)
// Активируются только для авторизованных пользователей

function initEasterEggs() {
  if (!auth.currentUser) return;

  // 1. Клик по логотипу (3 раза)
  let logoClicks = 0;
  const logo = document.querySelector('.logo');
  if (logo) {
    logo.addEventListener('click', () => {
      logoClicks++;
      if (logoClicks >= 3) {
        logoClicks = 0;
        activateEasterEgg('logo', 'Вы нашли пасхалку в логотипе!');
      }
    });
  }

  // 2. Невидимая кнопка в футере
  const footer = document.querySelector('.footer');
  if (footer) {
    const easterBtn = document.createElement('span');
    easterBtn.className = 'footer-easter-egg';
    easterBtn.textContent = '🥚';
    easterBtn.title = 'Пасхалка';
    footer.querySelector('.container').appendChild(easterBtn);
    easterBtn.addEventListener('click', () => {
      activateEasterEgg('footer', 'Вы нашли пасхалку в подвале!');
    });
  }

  // 3. Секретный символ на главной
  const secretSymbol = document.getElementById('secret-symbol');
  if (secretSymbol) {
    secretSymbol.addEventListener('click', () => {
      activateEasterEgg('symbol', 'Вы нашли секретный символ!');
    });
  }

  // 4. Konami Code
  const konamiSequence = [38,38,40,40,37,39,37,39,66,65];
  let konamiIndex = 0;
  document.addEventListener('keydown', (e) => {
    if (e.keyCode === konamiSequence[konamiIndex]) {
      konamiIndex++;
      if (konamiIndex === konamiSequence.length) {
        konamiIndex = 0;
        activateEasterEgg('konami', 'Вы ввели Konami Code!');
      }
    } else {
      konamiIndex = 0;
    }
  });

  // 5. Секретное слово "бонус"
  let typedWord = '';
  document.addEventListener('keydown', (e) => {
    if (e.key.length === 1 && e.key.match(/[a-zA-Zа-яА-Я]/)) {
      typedWord += e.key.toLowerCase();
      if (typedWord.length > 10) typedWord = typedWord.slice(-10);
      if (typedWord.includes('бонус')) {
        typedWord = '';
        activateEasterEgg('word', 'Вы ввели секретное слово "бонус"!');
      }
    }
  });

  // 6. Проверка "Ночной гость" при загрузке страницы
  checkNightGuest();

  // 7. Проверка "Конспиратор" — отслеживаем открытие консоли
  checkConspirator();

  // 8. "Библиотекарь" — инициализируется только на странице faq.html
  if (window.location.pathname.includes('faq.html')) {
    initLibrarian();
  }

  // 9. "Селфи" — инициализируется только на странице публичного профиля
  if (window.location.pathname.includes('public-profile.html')) {
    checkSelfie();
  }
}

async function activateEasterEgg(eggId, message) {
  const user = auth.currentUser;
  if (!user) return;

  try {
    const userRef = db.collection('users').doc(user.uid);
    const doc = await userRef.get();
    if (!doc.exists) return;

    const data = doc.data();
    const easterEggs = data.easterEggsFound || [];
    if (easterEggs.includes(eggId)) {
      showToast('Вы уже нашли эту пасхалку!', 'info');
      return;
    }

    // Добавляем пасхалку
    easterEggs.push(eggId);
    await userRef.update({ easterEggsFound: easterEggs });

    // Обновляем кэш
    const current = getCurrentUser();
    if (current) {
      current.easterEggsFound = easterEggs;
      setCurrentUser(current);
    }

    // Начисляем баллы и локоины (если реализовано)
    if (typeof addPointsToCurrentUser === 'function') {
      await addPointsToCurrentUser(5, null); // 5 баллов за пасхалку
    }

    // Отправляем уведомление с типом 'achievement'
    if (typeof addNotification === 'function') {
      await addNotification(user.uid, message, 'achievement', 'profile.html');
    }

    showToast(message + ' +5 баллов!', 'success');

    // Проверяем достижения
    if (typeof checkAndAwardAchievements === 'function') {
      await checkAndAwardAchievements();
    }

  } catch (error) {
    console.error('Ошибка активации пасхалки:', error);
  }
}

// ========== НОВЫЕ ФУНКЦИИ ПАСХАЛОК ==========

function checkNightGuest() {
  if (!auth.currentUser) return;
  const now = new Date();
  const moscowHour = new Date(now.getTime() + 3 * 3600000).getHours();
  if (moscowHour >= 2 && moscowHour < 4) {
    activateEasterEgg('night_guest', 'Вы ночной гость!');
  }
}

function checkConspirator() {
  const user = getCurrentUser();
  if (user && user.easterEggsFound && user.easterEggsFound.includes('conspirator')) return;

  let devtoolsOpen = false;
  const threshold = 160;

  const checkDevTools = () => {
    if (window.outerWidth - window.innerWidth > threshold || window.outerHeight - window.innerHeight > threshold) {
      if (!devtoolsOpen) {
        devtoolsOpen = true;
        activateEasterEgg('conspirator', 'За вами наблюдают!');
      }
    }
  };
  setInterval(checkDevTools, 1000);
}

function checkSelfie() {
  if (!auth.currentUser) return;
  const params = new URLSearchParams(window.location.search);
  const userId = params.get('id');
  const currentUser = getCurrentUser();
  if (userId && currentUser && (userId === currentUser.uid || userId === currentUser.id)) {
    activateEasterEgg('selfie', 'Вы посмотрели на себя со стороны!');
  }
}

function initLibrarian() {
  let scrolledToBottom = false;
  window.addEventListener('scroll', () => {
    if (scrolledToBottom) return;
    const scrollPosition = window.innerHeight + window.scrollY;
    const documentHeight = document.documentElement.scrollHeight;
    if (scrollPosition >= documentHeight - 50) {
      scrolledToBottom = true;
      activateEasterEgg('librarian', 'Вы доскроллили страницу помощи до конца!');
    }
  });
}

// Функции, вызываемые извне (из других файлов)

async function checkDarkThemePurchase() {
  const user = getCurrentUser();
  if (user && user.purchasedItems && user.purchasedItems.includes('dark_theme')) {
    await activateEasterEgg('dark_side', 'Вы перешли на тёмную сторону!');
  }
}

async function checkSilence() {
  await activateEasterEgg('silence', 'Вы отключили все уведомления!');
}

async function checkCollector() {
  const user = getCurrentUser();
  if (user && user.achievements && user.achievements.length >= 10) {
    await activateEasterEgg('collector', 'Вы собрали 10 достижений!');
  }
}

async function checkMeteorism() {
  let losses = parseInt(sessionStorage.getItem('minesweeper_losses') || '0');
  losses++;
  sessionStorage.setItem('minesweeper_losses', losses);
  if (losses >= 5) {
    await activateEasterEgg('meteorism', 'Вы проиграли в сапёра 5 раз подряд!');
    sessionStorage.removeItem('minesweeper_losses');
  }
}

async function checkFirstPurchase() {
  const user = getCurrentUser();
  if (user && user.purchasedItems && user.purchasedItems.length === 1) {
    await activateEasterEgg('first_purchase', 'Вы совершили первую покупку!');
  }
}

// Экспорт функций для использования в других скриптах
window.checkDarkThemePurchase = checkDarkThemePurchase;
window.checkSilence = checkSilence;
window.checkCollector = checkCollector;
window.checkMeteorism = checkMeteorism;
window.checkFirstPurchase = checkFirstPurchase;
