/**
 * Firebase Auth + Supabase Profile Management
 * Вход/Регистрация через Firebase Auth
 * Данные профиля (баланс, очки, аватар) хранятся в Supabase
 */

// Глобальные переменные для кэширования профиля
let currentUserProfile = null;
let profileCacheTime = 0;
const PROFILE_CACHE_TTL = 5 * 60 * 1000; // 5 минут

/**
 * Инициализация аутентификации
 */
function initAuth() {
  firebase.auth().onAuthStateChanged(async (user) => {
    if (user) {
      console.log('🔥 User logged in:', user.uid);
      await loadUserProfile(user.uid);
      updateAuthUI(true, user);
      
      // Запуск фоновых процессов
      startBackgroundTasks();
    } else {
      console.log('❌ User logged out');
      currentUserProfile = null;
      updateAuthUI(false, null);
      stopBackgroundTasks();
    }
  });
}

/**
 * Загрузка профиля из Supabase
 */
async function loadUserProfile(uid) {
  const now = Date.now();
  
  // Проверка кэша
  if (currentUserProfile && (now - profileCacheTime) < PROFILE_CACHE_TTL) {
    console.log('💾 Loading profile from cache');
    return currentUserProfile;
  }

  try {
    console.log('📡 Fetching profile from Supabase...');
    
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', uid)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Профиль не найден - создаем новый
        console.log('📝 Creating new profile...');
        return await createNewProfile(uid);
      }
      throw error;
    }

    currentUserProfile = data;
    profileCacheTime = now;
    
    // Обновляем UI профиля
    if (typeof updateProfileUI === 'function') {
      updateProfileUI(currentUserProfile);
    }
    
    console.log('✅ Profile loaded:', currentUserProfile.username);
    return currentUserProfile;

  } catch (err) {
    console.error('❌ Error loading profile:', err);
    showError('Не удалось загрузить профиль. Попробуйте позже.');
    return null;
  }
}

/**
 * Создание нового профиля при первой регистрации
 */
async function createNewProfile(uid) {
  const user = firebase.auth().currentUser;
  if (!user) throw new Error('User not authenticated');

  const newProfile = {
    id: uid,
    email: user.email || '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    data: {
      username: user.displayName || 'Игрок',
      points: 0,
      lokoin_balance: 0,
      role: 'user',
      description: '',
      achievements: [],
      easterEggsFound: [],
      completedGames: [],
      disabled: false,
      lastActive: new Date().toISOString(),
      dailyLogin: {
        count: 0,
        lastDate: null
      },
      activeEffects: {},
      gameStats: {
        totalGames: 0,
        wins: 0,
        losses: 0
      },
      gameHistory: [],
      battleshipStats: { wins: 0, losses: 0 },
      tictactoeStats: { wins: 0, losses: 0 },
      rpsStats: { wins: 0, losses: 0 },
      ownedAvatars: ['default'],
      avatarEmoji: '😀',
      activeTheme: 'light'
    }
  };

  const { data, error } = await supabase
    .from('users')
    .insert([newProfile])
    .select()
    .single();

  if (error) throw error;

  currentUserProfile = data;
  profileCacheTime = Date.now();
  
  if (typeof updateProfileUI === 'function') {
    updateProfileUI(currentUserProfile);
  }

  console.log('✅ New profile created');
  return currentUserProfile;
}

/**
 * Регистрация пользователя
 */
async function firebaseRegister(email, password, username) {
  try {
    const credential = await firebase.auth().createUserWithEmailAndPassword(email, password);
    await credential.user.updateProfile({ displayName: username });
    
    // Профиль создастся автоматически в onAuthStateChanged
    console.log('✅ Registration successful');
    return { success: true };
  } catch (error) {
    console.error('❌ Registration error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Вход пользователя
 */
async function firebaseLogin(email, password) {
  try {
    await firebase.auth().signInWithEmailAndPassword(email, password);
    console.log('✅ Login successful');
    return { success: true };
  } catch (error) {
    console.error('❌ Login error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Выход
 */
async function firebaseLogout() {
  try {
    await firebase.auth().signOut();
    console.log('👋 Logged out');
  } catch (error) {
    console.error('❌ Logout error:', error);
  }
}

/**
 * Обновление профиля (имя, описание, аватар)
 */
async function firebaseUpdateProfile(updates) {
  if (!currentUserProfile) return { success: false, error: 'No profile loaded' };

  try {
    // Объединяем старые данные с новыми
    const updatedData = {
      ...currentUserProfile.data,
      ...updates
    };

    const { data, error } = await supabase
      .from('users')
      .update({ 
        data: updatedData,
        updated_at: new Date().toISOString()
      })
      .eq('id', currentUserProfile.id)
      .select()
      .single();

    if (error) throw error;

    currentUserProfile = data;
    profileCacheTime = Date.now();
    
    if (typeof updateProfileUI === 'function') {
      updateProfileUI(currentUserProfile);
    }

    console.log('✅ Profile updated');
    return { success: true };
  } catch (err) {
    console.error('❌ Profile update error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Начисление баллов (с учетом эффектов двойного опыта)
 * @param {number} points - Количество очков
 * @returns {Promise<{success: boolean, points: number}>}
 */
async function addPointsToCurrentUser(points) {
  if (!currentUserProfile) return { success: false, points: 0 };

  let finalPoints = points;
  
  // Проверка эффекта двойного опыта
  const activeEffects = currentUserProfile.data.activeEffects || {};
  if (activeEffects.double_xp && activeEffects.double_xp.expires > Date.now()) {
    finalPoints *= 2;
    console.log('⚡ Double XP active! Points doubled.');
  }

  try {
    const newTotal = (currentUserProfile.data.points || 0) + finalPoints;
    
    const { data, error } = await supabase
      .from('users')
      .update({ 
        data: { 
          ...currentUserProfile.data, 
          points: newTotal 
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', currentUserProfile.id)
      .select()
      .single();

    if (error) throw error;

    currentUserProfile = data;
    profileCacheTime = Date.now();
    
    if (typeof updateProfileUI === 'function') {
      updateProfileUI(currentUserProfile);
    }

    console.log(`✅ Added ${finalPoints} points (base: ${points})`);
    return { success: true, points: finalPoints };
  } catch (err) {
    console.error('❌ Add points error:', err);
    return { success: false, points: 0 };
  }
}

/**
 * Начисление локоинов
 */
async function addLokoins(amount) {
  if (!currentUserProfile) return { success: false };

  try {
    const newBalance = (currentUserProfile.data.lokoin_balance || 0) + amount;
    
    const { data, error } = await supabase
      .from('users')
      .update({ 
        data: { 
          ...currentUserProfile.data, 
          lokoin_balance: newBalance 
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', currentUserProfile.id)
      .select()
      .single();

    if (error) throw error;

    currentUserProfile = data;
    profileCacheTime = Date.now();
    
    if (typeof updateProfileUI === 'function') {
      updateProfileUI(currentUserProfile);
    }

    // Уведомление
    if (typeof addLokoinNotification === 'function') {
      addLokoinNotification(amount);
    }

    console.log(`✅ Added ${amount} Lokoins`);
    return { success: true, balance: newBalance };
  } catch (err) {
    console.error('❌ Add Lokoins error:', err);
    return { success: false, balance: 0 };
  }
}

/**
 * Ежедневный вход
 */
async function processDailyLogin() {
  if (!currentUserProfile) return;

  const today = new Date().toDateString();
  const lastDate = currentUserProfile.data.dailyLogin?.lastDate;

  if (lastDate === today) {
    console.log('ℹ️ Daily login already claimed today');
    return;
  }

  try {
    const newCount = (currentUserProfile.data.dailyLogin.count || 0) + 1;
    const reward = Math.min(10 * newCount, 100); // Бонус растет до 100

    const updatedData = {
      ...currentUserProfile.data,
      points: (currentUserProfile.data.points || 0) + reward,
      dailyLogin: {
        count: newCount,
        lastDate: today
      }
    };

    const { data, error } = await supabase
      .from('users')
      .update({ 
        data: updatedData,
        updated_at: new Date().toISOString()
      })
      .eq('id', currentUserProfile.id)
      .select()
      .single();

    if (error) throw error;

    currentUserProfile = data;
    profileCacheTime = Date.now();
    
    if (typeof updateProfileUI === 'function') {
      updateProfileUI(currentUserProfile);
    }

    showNotification(`Ежедневный бонус: +${reward} очков!`, 'success');
    console.log(`✅ Daily login: Day ${newCount}, Reward ${reward}`);
  } catch (err) {
    console.error('❌ Daily login error:', err);
  }
}

/**
 * Обновление последней активности
 */
async function updateLastActive() {
  if (!currentUserProfile) return;

  try {
    await supabase
      .from('users')
      .update({ 
        data: { 
          ...currentUserProfile.data, 
          lastActive: new Date().toISOString() 
        }
      })
      .eq('id', currentUserProfile.id);
      
    // Не обновляем кэш, чтобы не триггерить UI лишний раз
  } catch (err) {
    console.error('❌ Update last active error:', err);
  }
}

/**
 * Синхронизация пасхалок
 */
async function syncEasterEggsToFirestore(eggId) {
  if (!currentUserProfile) return;

  try {
    const eggs = currentUserProfile.data.easterEggsFound || [];
    if (eggs.includes(eggId)) return; // Уже найдена

    const updatedEggs = [...eggs, eggId];
    
    const { error } = await supabase
      .from('users')
      .update({ 
        data: { 
          ...currentUserProfile.data, 
          easterEggsFound: updatedEggs 
        }
      })
      .eq('id', currentUserProfile.id);

    if (error) throw error;
    
    console.log(`✅ Easter egg synced: ${eggId}`);
  } catch (err) {
    console.error('❌ Sync easter egg error:', err);
  }
}

/**
 * Синхронизация достижений
 */
async function syncAchievementsToFirestore(achievementId) {
  if (!currentUserProfile) return;

  try {
    const achievements = currentUserProfile.data.achievements || [];
    if (achievements.includes(achievementId)) return;

    const updatedAchievements = [...achievements, achievementId];
    
    const { error } = await supabase
      .from('users')
      .update({ 
        data: { 
          ...currentUserProfile.data, 
          achievements: updatedAchievements 
        }
      })
      .eq('id', currentUserProfile.id);

    if (error) throw error;
    
    console.log(`✅ Achievement synced: ${achievementId}`);
  } catch (err) {
    console.error('❌ Sync achievement error:', err);
  }
}

/**
 * Синхронизация игровой статистики
 */
async function syncGameStats(gameType, result) {
  if (!currentUserProfile) return;

  try {
    const stats = currentUserProfile.data.gameStats || { totalGames: 0, wins: 0, losses: 0 };
    stats.totalGames++;
    if (result === 'win') stats.wins++;
    else if (result === 'loss') stats.losses++;

    // Специфичная статистика по играм
    const specificStats = currentUserProfile.data[`${gameType}Stats`] || { wins: 0, losses: 0 };
    if (result === 'win') specificStats.wins++;
    else if (result === 'loss') specificStats.losses++;

    const { error } = await supabase
      .from('users')
      .update({ 
        data: { 
          ...currentUserProfile.data, 
          gameStats: stats,
          [`${gameType}Stats`]: specificStats
        }
      })
      .eq('id', currentUserProfile.id);

    if (error) throw error;
    
    console.log(`✅ Game stats synced: ${gameType} - ${result}`);
  } catch (err) {
    console.error('❌ Sync game stats error:', err);
  }
}

/**
 * Фоновые задачи
 */
let activityInterval;

function startBackgroundTasks() {
  // Обновление активности каждые 2 минуты
  activityInterval = setInterval(updateLastActive, 2 * 60 * 1000);
  
  // Проверка ежедневного входа через 5 сек после загрузки
  setTimeout(processDailyLogin, 5000);
}

function stopBackgroundTasks() {
  if (activityInterval) clearInterval(activityInterval);
}

// Экспорт функций для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    initAuth,
    firebaseRegister,
    firebaseLogin,
    firebaseLogout,
    firebaseUpdateProfile,
    addPointsToCurrentUser,
    addLokoins,
    processDailyLogin,
    updateLastActive,
    syncEasterEggsToFirestore,
    syncAchievementsToFirestore,
    syncGameStats,
    getCurrentUserProfile: () => currentUserProfile
  };
}
