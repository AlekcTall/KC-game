// js/firebase-auth.js

const auth = firebase.auth();
const db = firebase.firestore();

// ================== АВТОРИЗАЦИЯ ==================

async function firebaseRegister(email, password, username, department) {
  try {
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    const user = userCredential.user;
    await user.updateProfile({ displayName: username });
    await user.sendEmailVerification();

    const userRef = db.collection('users').doc(user.uid);
    await userRef.set({
      username: username,
      email: email,
      department: department,
      points: 0,
      lokoin_balance: 0,
      purchasedItems: [],
      role: 'user',
      description: '',
      achievements: [],
      easterEggsFound: [],
      completedGames: [],
      disabled: false,
      lastActive: firebase.firestore.FieldValue.serverTimestamp(),
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      dailyLogin: {
        lastLoginDate: null,
        streak: 0,
        longestStreak: 0,
        totalLogins: 0,
        loginHistory: []
      },
      activeEffects: {}
    });

    const doc = await userRef.get();
    if (!doc.exists) {
      await user.delete();
      throw new Error('Не удалось создать профиль. Документ не появился.');
    }

    const userData = {
      uid: user.uid, email, username, department,
      points: 0, lokoin_balance: 0, purchasedItems: [], role: 'user',
      description: '', achievements: [], easterEggsFound: [], completedGames: [],
      disabled: false,
      dailyLogin: { lastLoginDate: null, streak: 0, longestStreak: 0, totalLogins: 0, loginHistory: [] },
      activeEffects: {}
    };
    setCurrentUser(userData);
    updateAuthUI(user);
    return userData;
  } catch (error) {
    console.error('Ошибка регистрации:', error);
    if (auth.currentUser) await auth.currentUser.delete();
    throw error;
  }
}

async function firebaseLogin(email, password) {
  try {
    const userCredential = await auth.signInWithEmailAndPassword(email, password);
    const user = userCredential.user;
    if (!user.emailVerified) {
      await user.sendEmailVerification();
      await auth.signOut();
      throw new Error('Email не подтверждён. Новое письмо отправлено.');
    }
    const doc = await db.collection('users').doc(user.uid).get();
    if (doc.exists) {
      const data = doc.data();
      if (data.disabled) {
        await auth.signOut();
        throw new Error('Учётная запись заблокирована.');
      }
      const userData = {
        uid: user.uid, email: user.email, username: data.username, department: data.department,
        points: data.points || 0, lokoin_balance: data.lokoin_balance || 0,
        purchasedItems: data.purchasedItems || [], role: data.role || 'user',
        description: data.description || '', achievements: data.achievements || [],
        easterEggsFound: data.easterEggsFound || [], completedGames: data.completedGames || [],
        disabled: data.disabled || false,
        dailyLogin: data.dailyLogin || {},
        activeEffects: data.activeEffects || {}
      };
      setCurrentUser(userData);
      updateAuthUI(user);
      await updateLastActive(user.uid);
      const loginResult = await processDailyLogin(user.uid);
      if (loginResult) {
        userData._dailyReward = loginResult;
        setCurrentUser(userData);
      }
      return userData;
    } else {
      throw new Error('Документ пользователя не найден');
    }
  } catch (error) {
    console.error('Ошибка входа:', error);
    throw error;
  }
}

function firebaseLogout() {
  auth.signOut().then(() => {
    localStorage.removeItem('krugames_currentUser');
    updateAuthUI(null);
    window.location.href = 'index.html';
  }).catch(e => console.error(e));
}

// ================== ЭФФЕКТЫ ТОВАРОВ ==================

function hasActiveEffect(effectCode) {
  const current = getCurrentUser();
  if (!current || !current.activeEffects) return false;
  const effect = current.activeEffects[effectCode];
  if (!effect) return false;
  if (effect.durationHours === 0) return true;
  const elapsed = (Date.now() - effect.activatedAt) / 3600000;
  return elapsed < effect.durationHours;
}

// ================== ЕЖЕДНЕВНЫЙ ВХОД ==================

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

async function processDailyLogin(uid) {
  if (!uid) return null;
  try {
    const userRef = db.collection('users').doc(uid);
    const doc = await userRef.get();
    if (!doc.exists) return null;
    const data = doc.data();
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
    await userRef.update({ dailyLogin: newDailyLogin, points: newPoints, lokoin_balance: newLokoin });
    if (typeof addNotification === 'function') {
      await addNotification(uid, `Ежедневный вход (${reward.label}): +${reward.points} баллов, +${reward.lokoin} локоинов`, 'game', 'profile.html');
    }
    if (typeof checkAndAwardAchievements === 'function') await checkAndAwardAchievements();
    const current = getCurrentUser();
    if (current) {
      current.points = newPoints;
      current.lokoin_balance = newLokoin;
      current.dailyLogin = newDailyLogin;
      setCurrentUser(current);
    }
    return { streak: newStreak, points: reward.points, lokoin: reward.lokoin, label: reward.label };
  } catch (e) { console.error(e); return null; }
}

// ================== ОБНОВЛЕНИЕ ПРОФИЛЯ ==================

async function firebaseUpdateProfile(uid, data) {
  try {
    await db.collection('users').doc(uid).update(data);
    const current = getCurrentUser();
    if (current && (current.uid === uid || current.id === uid)) {
      Object.assign(current, data);
      setCurrentUser(current);
    }
    return true;
  } catch (error) { console.error(error); throw error; }
}

// ================== НАЧИСЛЕНИЕ БАЛЛОВ ==================

async function addPointsToCurrentUser(points, gameId = null) {
  const user = auth.currentUser;
  if (!user) return { success: false };
  try {
    const userRef = db.collection('users').doc(user.uid);
    const doc = await userRef.get();
    if (!doc.exists) return { success: false };
    const data = doc.data();
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
    const updateData = { points: newPoints };
    if (gameId) {
      const completedGames = data.completedGames || [];
      if (!completedGames.includes(gameId)) {
        completedGames.push(gameId);
        updateData.completedGames = completedGames;
      }
      const gameHistory = data.gameHistory || [];
      gameHistory.push({ game: gameId, points: actualPoints, timestamp: Date.now() });
      updateData.gameHistory = gameHistory;
    }
    if (delta > 0) updateData.lokoin_balance = newLokoinBalance;
    updateData.lastActive = firebase.firestore.FieldValue.serverTimestamp();
    await userRef.update(updateData);
    if (delta > 0 && typeof addLokoinNotification === 'function') {
      addLokoinNotification(user.uid, delta).catch(e => console.error(e));
    }
    const current = getCurrentUser();
    if (current) {
      current.points = newPoints;
      if (delta > 0) current.lokoin_balance = newLokoinBalance;
      if (updateData.completedGames) current.completedGames = updateData.completedGames;
      if (updateData.gameHistory) current.gameHistory = updateData.gameHistory;
      setCurrentUser(current);
    }
    return { success: true, points: actualPoints };
  } catch (error) { console.error(error); return { success: false }; }
}

// ================== СИНХРОНИЗАЦИЯ ==================

async function syncEasterEggsToFirestore(easterEggs) {
  const user = auth.currentUser;
  if (!user) return;
  try {
    await db.collection('users').doc(user.uid).update({ easterEggsFound: easterEggs });
    const c = getCurrentUser();
    if (c) { c.easterEggsFound = easterEggs; setCurrentUser(c); }
  } catch (e) { console.error(e); }
}

async function syncAchievementsToFirestore(achievements) {
  const user = auth.currentUser;
  if (!user) return;
  try {
    await db.collection('users').doc(user.uid).update({ achievements: achievements });
    const c = getCurrentUser();
    if (c) { c.achievements = achievements; setCurrentUser(c); }
  } catch (e) { console.error(e); }
}

async function syncGameStats(gameId, stats) {
  const user = auth.currentUser;
  if (!user) return;
  try {
    const userRef = db.collection('users').doc(user.uid);
    const doc = await userRef.get();
    if (!doc.exists) return;
    const data = doc.data();
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

    gameStats[gameId] = merged;
    await userRef.update({ gameStats });
    const c = getCurrentUser();
    if (c) { if (!c.gameStats) c.gameStats = {}; c.gameStats[gameId] = merged; setCurrentUser(c); }
    return true;
  } catch (e) { console.error(e); return false; }
}

// ================== ВСПОМОГАТЕЛЬНЫЕ ==================

async function updateAuthUI(firebaseUser) {
  const statusEl = document.getElementById('auth-status');
  if (!statusEl) return;
  if (firebaseUser) {
    let current = getCurrentUser();
    if (!current || !current.username) {
      try {
        const doc = await db.collection('users').doc(firebaseUser.uid).get();
        if (doc.exists) {
          const data = doc.data();
          current = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            username: data.username || firebaseUser.displayName || firebaseUser.email,
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
            dailyLogin: data.dailyLogin || {},
            activeEffects: data.activeEffects || {}
          };
          setCurrentUser(current);
        }
      } catch (e) { console.error('updateAuthUI load error:', e); }
    }
    const displayName = current?.username || firebaseUser.displayName || firebaseUser.email;
    statusEl.innerHTML = `👤 <span class="auth-greeting">${displayName}</span> | <a href="#" id="logout-link">Выйти</a>`;
    document.getElementById('logout-link')?.addEventListener('click', e => { e.preventDefault(); firebaseLogout(); });
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
    const userRef = db.collection('users').doc(uid);
    const doc = await userRef.get();
    if (doc.exists) {
      await userRef.update({ lastActive: Date.now() });
    }
  } catch (e) {
    // Игнорируем
  }
}
