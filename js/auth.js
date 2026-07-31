// js/auth.js
// Аутентификация через Supabase Auth + работа с профилем в Supabase DB
// Этот файл заменяет старый firebase-auth.js

// ============================================================
// SHIM для совместимости со старым кодом
// Эмулирует интерфейс Firebase Auth, чтобы остальные файлы
// продолжали работать с auth.currentUser и auth.onAuthStateChanged
// ============================================================
window.auth = {
  currentUser: null,

  onAuthStateChanged: function(callback) {
    const { data: { subscription } } = supa.auth.onAuthStateChange(async (event, session) => {
      const supaUser = session?.user || null;
      // Эмулируем emailVerified и методы Firebase User
      if (supaUser) {
        supaUser.emailVerified = !!supaUser.email_confirmed_at;
        supaUser.sendEmailVerification = () =>
          supa.auth.resend({ type: 'signup', email: supaUser.email });
        supaUser.updatePassword = (newPassword) =>
          supa.auth.updateUser({ password: newPassword });
        supaUser.updateProfile = async ({ displayName }) => {
          // displayName → username в data
          const { data: row } = await supa.from('users').select('data').eq('id', supaUser.id).single();
          const newData = { ...(row?.data || {}), username: displayName };
          await supa.from('users').update({ data: newData, updated_at: new Date().toISOString() }).eq('id', supaUser.id);
          const c = getCurrentUser();
          if (c) { c.username = displayName; c._rawData = newData; setCurrentUser(c); }
        };
        supaUser.reauthenticateWithCredential = async (credential) => {
          // В Supabase нет прямой аналогии. Проверяем старый пароль через signIn
          const { error } = await supa.auth.signInWithPassword({
            email: credential.email,
            password: credential.password
          });
          if (error) throw error;
          return { user: supaUser };
        };
        supaUser.delete = async () => {
          // На клиенте удалить себя нельзя (нужен service_role).
          // Просто выходим.
          await supa.auth.signOut();
        };
      }
      auth.currentUser = supaUser;
      callback(supaUser);
    });
    // Возвращаем функцию отписки, как в Firebase
    return () => subscription.unsubscribe();
  },

  signOut: () => supa.auth.signOut(),

  signInWithEmailAndPassword: async (email, password) => {
    const { data, error } = await supa.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return { user: data.user };
  },

  createUserWithEmailAndPassword: async (email, password) => {
    const { data, error } = await supa.auth.signUp({ email, password });
    if (error) throw error;
    return { user: data.user };
  },

  sendPasswordResetEmail: async (email, options) => {
    const { error } = await supa.auth.resetPasswordForEmail(email, {
      redirectTo: options?.url || (window.location.origin + '/login.html')
    });
    if (error) throw error;
  },

  // Эмуляция EmailAuthProvider для смены пароля в profile.html
  EmailAuthProvider: {
    credential: (email, password) => ({ email, password })
  }
};

// Обнуляем db, чтобы старые вызовы падали явно (а не работали с Firebase)
window.db = null;

// ============================================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ДЛЯ РАБОТЫ С ДАННЫМИ
// ============================================================

// Распаковка строки БД в плоский объект (как в старом Firebase-коде)
function unpackUserData(row) {
  if (!row) return null;
  const data = row.data || {};
  return {
    uid: row.id,
    id: row.id,
    email: row.email,
    username: data.username || '',
    department: data.department || '',
    points: data.points || 0,
    lokoin_balance: data.lokoin_balance || 0,
    purchasedItems: data.purchasedItems || [],
    role: data.role || 'user',
    description: data.description || '',
    achievements: data.achievements || [],
    easterEggsFound: data.easterEggsFound || [],
    completedGames: data.completedGames || [],
    disabled: data.disabled || false,
    dailyLogin: data.dailyLogin || { lastLoginDate: null, streak: 0, longestStreak: 0, totalLogins: 0, loginHistory: [] },
    activeEffects: data.activeEffects || {},
    gameStats: data.gameStats || {},
    gameHistory: data.gameHistory || [],
    battleshipStats: data.battleshipStats || {},
    tictactoeStats: data.tictactoeStats || {},
    rpsStats: data.rpsStats || {},
    ownedAvatars: data.ownedAvatars || [],
    avatarEmoji: data.avatarEmoji || null,
    activeTheme: data.activeTheme || 'light',
    customStatus: data.customStatus || '',
    showGoldFrame: data.showGoldFrame !== false,
    showAnimatedAvatar: data.showAnimatedAvatar !== false,
    // Сырой JSONB для обратной упаковки
    _rawData: data
  };
}

// Упаковка плоского объекта обратно в JSONB для Supabase
function packUserData(user) {
  const data = user._rawData ? { ...user._rawData } : {};
  const fields = [
    'username', 'department', 'points', 'lokoin_balance', 'purchasedItems',
    'role', 'description', 'achievements', 'easterEggsFound', 'completedGames',
    'disabled', 'dailyLogin', 'activeEffects', 'gameStats', 'gameHistory',
    'battleshipStats', 'tictactoeStats', 'rpsStats', 'ownedAvatars',
    'avatarEmoji', 'activeTheme', 'customStatus', 'showGoldFrame', 'showAnimatedAvatar'
  ];
  for (const field of fields) {
    if (user[field] !== undefined) data[field] = user[field];
  }
  return data;
}

// Получить профиль пользователя по ID
async function fetchUserById(uid) {
  const { data, error } = await supa
    .from('users')
    .select('id, email, data')
    .eq('id', uid)
    .maybeSingle();
  if (error) throw error;
  return unpackUserData(data);
}

// ============================================================
// ОСНОВНЫЕ ФУНКЦИИ (с алиасами для совместимости)
// ============================================================

async function registerUser(email, password, username, department) {
  const { data: authData, error: authError } = await supa.auth.signUp({ email, password });
  if (authError) throw authError;
  const user = authData.user;
  if (!user) throw new Error('Не удалось создать пользователя');

  // Создаём запись в public.users
  const { error: dbError } = await supa.from('users').upsert([{
    id: user.id,
    email: user.email,
    data: {
      username,
      department,
      points: 0,
      lokoin_balance: 0,
      purchasedItems: [],
      role: 'user',
      description: '',
      achievements: [],
      easterEggsFound: [],
      completedGames: [],
      disabled: false,
      dailyLogin: { lastLoginDate: null, streak: 0, longestStreak: 0, totalLogins: 0, loginHistory: [] },
      activeEffects: {},
      gameStats: {},
      gameHistory: [],
      battleshipStats: {},
      tictactoeStats: {},
      rpsStats: {},
      ownedAvatars: [],
      activeTheme: 'light'
    }
  }]);
  if (dbError) throw dbError;

  const userData = await fetchUserById(user.id);
  setCurrentUser(userData);
  updateAuthUI(user);
  return userData;
}

async function loginUser(email, password) {
  const { data: authData, error: authError } = await supa.auth.signInWithPassword({ email, password });
  if (authError) throw authError;
  const user = authData.user;

  if (!user.email_confirmed_at) {
    await supa.auth.signOut();
    await supa.auth.resend({ type: 'signup', email: user.email });
    throw new Error('Email не подтверждён. Новое письмо отправлено.');
  }

  const userData = await fetchUserById(user.id);
  if (!userData) {
    await supa.auth.signOut();
    throw new Error('Профиль не найден');
  }
  if (userData.disabled) {
    await supa.auth.signOut();
    throw new Error('Учётная запись заблокирована.');
  }

  setCurrentUser(userData);
  updateAuthUI(user);
  await updateLastActive(user.id);
  const loginResult = await processDailyLogin(user.id);
  if (loginResult) {
    userData._dailyReward = loginResult;
    setCurrentUser(userData);
  }
  return userData;
}

function logoutUser() {
  supa.auth.signOut().then(() => {
    localStorage.removeItem('krugames_currentUser');
    updateAuthUI(null);
    window.location.href = 'index.html';
  }).catch(e => console.error(e));
}

async function updateProfile(uid, updates) {
  const { data: row, error: fetchError } = await supa
    .from('users')
    .select('data')
    .eq('id', uid)
    .single();
  if (fetchError) throw fetchError;
  const newData = { ...(row.data || {}), ...updates };
  const { error } = await supa
    .from('users')
    .update({ data: newData, updated_at: new Date().toISOString() })
    .eq('id', uid);
  if (error) throw error;
  const current = getCurrentUser();
  if (current && (current.uid === uid || current.id === uid)) {
    Object.assign(current, updates);
    current._rawData = newData;
    setCurrentUser(current);
  }
  return true;
}

// ============================================================
// НАЧИСЛЕНИЕ БАЛЛОВ
// TODO: В будущем заменить на RPC-функцию для 100% защиты от гонок данных
// ============================================================
async function addPointsToCurrentUser(points, gameId = null) {
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return { success: false };
  try {
    const { data: row, error } = await supa
      .from('users')
      .select('data')
      .eq('id', user.id)
      .single();
    if (error || !row) return { success: false };
    const data = row.data || {};

    let multiplier = 1;
    if (hasActiveEffect('double_xp')) multiplier = 2;
    const actualPoints = points * multiplier;

    const oldPoints = data.points || 0;
    const newPoints = oldPoints + actualPoints;
    const oldLokoin = Math.floor(oldPoints / 10);
    const newLokoin = Math.floor(newPoints / 10);
    const delta = newLokoin - oldLokoin;
    const currentLokoinBalance = data.lokoin_balance || 0;
    const newLokoinBalance = currentLokoinBalance + delta;

    const newData = { ...data, points: newPoints };
    if (delta > 0) newData.lokoin_balance = newLokoinBalance;

    if (gameId) {
      const completedGames = data.completedGames || [];
      if (!completedGames.includes(gameId)) {
        newData.completedGames = [...completedGames, gameId];
      }
      const gameHistory = data.gameHistory || [];
      newData.gameHistory = [...gameHistory, { game: gameId, points: actualPoints, timestamp: Date.now() }];
    }
    newData.last_active = new Date().toISOString();

    const { error: updateError } = await supa
      .from('users')
      .update({ data: newData, updated_at: new Date().toISOString() })
      .eq('id', user.id);
    if (updateError) throw updateError;

    if (delta > 0 && typeof addLokoinNotification === 'function') {
      addLokoinNotification(user.id, delta).catch(e => console.error(e));
    }
    const current = getCurrentUser();
    if (current) {
      current.points = newPoints;
      if (delta > 0) current.lokoin_balance = newLokoinBalance;
      if (newData.completedGames) current.completedGames = newData.completedGames;
      if (newData.gameHistory) current.gameHistory = newData.gameHistory;
      current._rawData = newData;
      setCurrentUser(current);
    }
    return { success: true, points: actualPoints };
  } catch (e) {
    console.error(e);
    return { success: false };
  }
}

// ============================================================
// ЕЖЕДНЕВНЫЙ ВХОД
// TODO: В будущем заменить на RPC-функцию
// ============================================================
async function processDailyLogin(uid) {
  if (!uid) return null;
  try {
    const { data: row, error } = await supa
      .from('users')
      .select('data')
      .eq('id', uid)
      .single();
    if (error || !row) return null;
    const data = row.data || {};
    const dailyLogin = data.dailyLogin || { lastLoginDate: null, streak: 0, longestStreak: 0, totalLogins: 0, loginHistory: [] };
    const today = getMoscowDate();
    const yesterday = getYesterdayMoscow();
    if (dailyLogin.lastLoginDate === today) return null;

    let newStreak = dailyLogin.streak || 0;
    if (dailyLogin.lastLoginDate === yesterday) newStreak += 1;
    else newStreak = 1;
    const reward = getDailyReward(newStreak);

    const loginHistory = dailyLogin.loginHistory || [];
    loginHistory.push(today);
    const newDailyLogin = {
      lastLoginDate: today,
      streak: newStreak,
      longestStreak: Math.max(dailyLogin.longestStreak || 0, newStreak),
      totalLogins: (dailyLogin.totalLogins || 0) + 1,
      loginHistory: loginHistory.slice(-60)
    };

    const oldPoints = data.points || 0;
    const newPoints = oldPoints + reward.points;
    const oldLokoin = data.lokoin_balance || 0;
    const newLokoin = oldLokoin + reward.lokoin;

    const newData = { ...data, dailyLogin: newDailyLogin, points: newPoints, lokoin_balance: newLokoin };
    const { error: updateError } = await supa
      .from('users')
      .update({ data: newData, updated_at: new Date().toISOString() })
      .eq('id', uid);
    if (updateError) throw updateError;

    if (typeof addNotification === 'function') {
      await addNotification(uid, `Ежедневный вход (${reward.label}): +${reward.points} баллов, +${reward.lokoin} локоинов`, 'game', 'profile.html');
    }
    if (typeof checkAndAwardAchievements === 'function') await checkAndAwardAchievements();

    const current = getCurrentUser();
    if (current) {
      current.points = newPoints;
      current.lokoin_balance = newLokoin;
      current.dailyLogin = newDailyLogin;
      current._rawData = newData;
      setCurrentUser(current);
    }
    return { streak: newStreak, points: reward.points, lokoin: reward.lokoin, label: reward.label };
  } catch (e) {
    console.error(e);
    return null;
  }
}

// ============================================================
// СИНХРОНИЗАЦИЯ
// ============================================================
async function syncEasterEggs(easterEggs) {
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return;
  try {
    const { data: row } = await supa.from('users').select('data').eq('id', user.id).single();
    const newData = { ...(row?.data || {}), easterEggsFound: easterEggs };
    await supa.from('users').update({ data: newData, updated_at: new Date().toISOString() }).eq('id', user.id);
    const c = getCurrentUser();
    if (c) { c.easterEggsFound = easterEggs; c._rawData = newData; setCurrentUser(c); }
  } catch (e) { console.error(e); }
}

async function syncAchievements(achievements) {
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return;
  try {
    const { data: row } = await supa.from('users').select('data').eq('id', user.id).single();
    const newData = { ...(row?.data || {}), achievements };
    await supa.from('users').update({ data: newData, updated_at: new Date().toISOString() }).eq('id', user.id);
    const c = getCurrentUser();
    if (c) { c.achievements = achievements; c._rawData = newData; setCurrentUser(c); }
  } catch (e) { console.error(e); }
}

async function syncGameStats(gameId, stats) {
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return;
  try {
    const { data: row } = await supa.from('users').select('data').eq('id', user.id).single();
    if (!row) return;
    const data = row.data || {};
    const gameStats = data.gameStats || {};
    const currentStats = gameStats[gameId] || {};
    const merged = { ...currentStats };

    if (stats.totalClicks !== undefined) merged.totalClicks = Math.max(currentStats.totalClicks || 0, stats.totalClicks);
    if (stats.maxScore !== undefined) merged.maxScore = Math.max(currentStats.maxScore || 0, stats.maxScore);
    if (stats.bestMoves !== undefined) merged.bestMoves = currentStats.bestMoves ? Math.min(currentStats.bestMoves, stats.bestMoves) : stats.bestMoves;
    if (stats.bestTime !== undefined) merged.bestTime = currentStats.bestTime ? Math.min(currentStats.bestTime, stats.bestTime) : stats.bestTime;
    if (stats.maxTile !== undefined) merged.maxTile = Math.max(currentStats.maxTile || 0, stats.maxTile);
    if (stats.maxLines !== undefined) merged.maxLines = Math.max(currentStats.maxLines || 0, stats.maxLines);
    if (stats.maxLevel !== undefined) merged.maxLevel = Math.max(currentStats.maxLevel || 0, stats.maxLevel);
    if (stats.selfEaten) merged.selfEaten = true;
    if (stats.wallCrash) merged.wallCrash = true;
    if (stats.openedFirst) merged.openedFirst = true;
    if (stats.completed) merged.completed = true;
    if (stats.loss) merged.loss = true;
    if (stats.tetrisCleared) merged.tetrisCleared = true;
    if (stats.sniperGame) merged.sniperGame = true;
    if (stats.unsinkableGame) merged.unsinkableGame = true;
    if (stats.sunk4Deck) merged.sunk4Deck = true;
    if (stats.beatHardAI) merged.beatHardAI = true;

    const newData = { ...data, gameStats: { ...gameStats, [gameId]: merged } };
    await supa.from('users').update({ data: newData, updated_at: new Date().toISOString() }).eq('id', user.id);
    const c = getCurrentUser();
    if (c) {
      if (!c.gameStats) c.gameStats = {};
      c.gameStats[gameId] = merged;
      c._rawData = newData;
      setCurrentUser(c);
    }
    return true;
  } catch (e) { console.error(e); return false; }
}

// ============================================================
// UI И ВСПОМОГАТЕЛЬНЫЕ
// ============================================================
async function updateAuthUI(supaUser) {
  const statusEl = document.getElementById('auth-status');
  if (!statusEl) return;
  if (supaUser) {
    let current = getCurrentUser();
    if (!current || !current.username) {
      try {
        current = await fetchUserById(supaUser.id);
        if (current) setCurrentUser(current);
      } catch (e) { console.error('updateAuthUI load error:', e); }
    }
    const displayName = current?.username || supaUser.email;
    statusEl.innerHTML = `👤 <span class="auth-greeting">${displayName}</span> | <a href="#" id="logout-link">Выйти</a>`;
    document.getElementById('logout-link')?.addEventListener('click', e => { e.preventDefault(); logoutUser(); });
    statusEl.style.display = '';
  } else {
    const currentPage = window.location.pathname + window.location.search;
    statusEl.innerHTML = `<a href="login.html?redirect=${encodeURIComponent(currentPage)}">Войти</a>`;
    statusEl.style.display = '';
  }
}

function syncUserToLocal(userData) { setCurrentUser(userData); }

async function updateLastActive(uid) {
  if (!uid) return;
  try {
    await supa.from('users').update({ updated_at: new Date().toISOString() }).eq('id', uid);
  } catch (e) {}
}

function hasActiveEffect(effectCode) {
  const current = getCurrentUser();
  if (!current || !current.activeEffects) return false;
  const effect = current.activeEffects[effectCode];
  if (!effect) return false;
  if (effect.durationHours === 0) return true;
  const elapsed = (Date.now() - effect.activatedAt) / 3600000;
  return elapsed < effect.durationHours;
}

function getDailyReward(day) {
  const rewards = {
    1: { points: 2, lokoin: 1, label: 'День 1' },
    2: { points: 3, lokoin: 1, label: 'День 2' },
    3: { points: 5, lokoin: 2, label: 'День 3' },
    4: { points: 5, lokoin: 2, label: 'День 4' },
    5: { points: 8, lokoin: 3, label: 'День 5' },
    6: { points: 8, lokoin: 3, label: 'День 6' },
    7: { points: 12, lokoin: 5, label: 'День 7' }
  };
  if (day > 7) return { points: 12, lokoin: 5, label: `День ${day}` };
  return rewards[day] || rewards[1];
}

function getMoscowDate() {
  const now = new Date();
  return new Date(now.getTime() + 3 * 3600000).toISOString().slice(0, 10);
}

function getYesterdayMoscow() {
  const d = new Date(Date.now() + 3 * 3600000);
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

// ============================================================
// АЛИАСЫ ДЛЯ СОВМЕСТИМОСТИ СО СТАРЫМ КОДОМ
// Пока остальные файлы не переписаны, они продолжают работать
// ============================================================
window.firebaseRegister = registerUser;
window.firebaseLogin = loginUser;
window.firebaseLogout = logoutUser;
window.firebaseUpdateProfile = updateProfile;
window.syncEasterEggsToFirestore = syncEasterEggs;
window.syncAchievementsToFirestore = syncAchievements;

// Глобальная функция onAuthStateChange для совместимости с новыми модулями
window.onAuthStateChange = function(callback) {
  const { data: { subscription } } = supa.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
  return () => subscription.unsubscribe();
};
