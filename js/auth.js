/**
 * Auth & Profile Logic (Supabase Version)
 * Firebase Auth используется только для входа/регистрации.
 * Все данные профиля хранятся и читаются из Supabase.
 */

document.addEventListener('DOMContentLoaded', async () => {
    // Ждем инициализации Firebase
    await new Promise(resolve => {
        const checkAuth = setInterval(() => {
            if (typeof firebase !== 'undefined' && firebase.auth().currentUser !== null) {
                clearInterval(checkAuth);
                resolve();
            } else if (firebase.auth().currentUser) {
                clearInterval(checkAuth);
                resolve();
            }
        }, 100);
        // Таймаут на случай если пользователь уже вошел
        setTimeout(resolve, 1000);
    });

    const user = firebase.auth().currentUser;
    
    // Элементы UI
    const balanceEl = document.getElementById('nav-balance');
    const pointsEl = document.getElementById('nav-points');
    const logoutBtn = document.getElementById('logout-btn');

    if (user) {
        // Пользователь авторизован -> загружаем профиль из Supabase
        loadUserProfile(user.uid);
        
        // Подписка на изменения баланса в реальном времени (опционально, для игр)
        subscribeToBalanceChanges(user.uid);
    } else {
        // Пользователь не вошел
        if (balanceEl) balanceEl.textContent = '0 💰';
        if (pointsEl) pointsEl.textContent = '0 XP';
    }

    // Кнопка выхода
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            firebase.auth().signOut().then(() => {
                window.location.reload();
            });
        });
    }
});

/**
 * Загрузка профиля пользователя из Supabase
 */
async function loadUserProfile(uid) {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', uid)
            .single();

        if (error || !data) {
            console.warn('Профиль не найден, создаем новый...', error);
            // Если профиля нет (новый юзер), создаем запись
            await createNewUser(uid);
            return;
        }

        // Обновляем UI
        updateAuthUI(data);

    } catch (err) {
        console.error('Ошибка загрузки профиля:', err);
    }
}

/**
 * Создание нового пользователя в Supabase при первой регистрации
 */
async function createNewUser(uid) {
    const user = firebase.auth().currentUser;
    if (!user) return;

    const newUser = {
        id: uid,
        email: user.email,
        created_at: new Date(),
        data: {
            username: user.displayName || user.email.split('@')[0],
            points: 0,
            lokoin_balance: 100, // Стартовый бонус
            department: 'Новичок',
            avatarUrl: null,
            achievements: [],
            gameStats: { played: 0, wins: 0, losses: 0 }
        }
    };

    const { error } = await supabase.from('users').insert([newUser]);
    if (error) console.error('Ошибка создания профиля:', error);
    else {
        console.log('Профиль создан');
        updateAuthUI(newUser);
    }
}

/**
 * Обновление интерфейса (баланс, очки, имя)
 */
function updateAuthUI(userData) {
    const data = userData.data || {};
    
    const balanceEl = document.getElementById('nav-balance');
    const pointsEl = document.getElementById('nav-points');
    const usernameEls = document.querySelectorAll('.user-username-display');

    if (balanceEl) balanceEl.textContent = `${data.lokoin_balance || 0} 💰`;
    if (pointsEl) pointsEl.textContent = `${data.points || 0} XP`;
    
    usernameEls.forEach(el => {
        el.textContent = data.username || 'Игрок';
    });

    // Сохраняем данные в sessionStorage для быстрого доступа в других скриптах
    sessionStorage.setItem('userProfile', JSON.stringify(data));
}

/**
 * Real-time подписка на изменения баланса (для игр и магазина)
 */
function subscribeToBalanceChanges(uid) {
    const channel = supabase
        .channel(`user-balance-${uid}`)
        .on(
            'postgres_changes',
            {
                event: 'UPDATE',
                schema: 'public',
                table: 'users',
                filter: `id=eq.${uid}`
            },
            (payload) => {
                const newData = payload.new.data;
                updateAuthUI({ data: newData });
                
                // Диспатчим событие для других скриптов (магазин, игры)
                window.dispatchEvent(new CustomEvent('userBalanceUpdated', { detail: newData }));
            }
        )
        .subscribe();

    // Сохраняем канал, чтобы отписаться при выходе
    window.authChannel = channel;
}

// Глобальные функции для вызова из других файлов (например, при покупке)

/**
 * Начисление баллов (XP)
 */
window.addPoints = async (amount) => {
    const user = firebase.auth().currentUser;
    if (!user) return false;

    // Получаем текущие данные
    const { data: currentUser } = await supabase.from('users').select('data').eq('id', user.uid).single();
    const currentPoints = (currentUser.data?.points || 0);
    
    // Проверка на активный эффект "Двойной опыт"
    let finalAmount = amount;
    const activeEffects = currentUser.data?.activeEffects || {};
    if (activeEffects.double_xp && activeEffects.double_xp.expiresAt > Date.now()) {
        finalAmount *= 2;
    }

    const newPoints = currentPoints + finalAmount;

    const { error } = await supabase
        .from('users')
        .update({ 
            data: { ...currentUser.data, points: newPoints } 
        })
        .eq('id', user.uid);

    if (error) {
        console.error('Ошибка начисления баллов:', error);
        return false;
    }
    
    // Обновляем лидерборд (в идеале это должен делать триггер в БД, но пока так)
    updateLeaderboardEntry(user.uid, newPoints);

    return true;
};

/**
 * Списывание локоинов
 */
window.spendLokoins = async (amount) => {
    const user = firebase.auth().currentUser;
    if (!user) return false;

    const { data: currentUser } = await supabase.from('users').select('data').eq('id', user.uid).single();
    const currentBalance = currentUser.data?.lokoin_balance || 0;

    if (currentBalance < amount) {
        alert('Недостаточно локоинов!');
        return false;
    }

    const { error } = await supabase
        .from('users')
        .update({ 
            data: { ...currentUser.data, lokoin_balance: currentBalance - amount } 
        })
        .eq('id', user.uid);

    return !error;
};

/**
 * Обновление записи в лидерборде (упрощенно)
 */
async function updateLeaderboardEntry(uid, points) {
    // Проверяем, есть ли запись
    const { data: existing } = await supabase.from('leaderboards').select('user_id').eq('user_id', uid).single();
    
    if (existing) {
        await supabase.from('leaderboards').update({ points, updated_at: new Date() }).eq('user_id', uid);
    } else {
        await supabase.from('leaderboards').insert([{ user_id: uid, points, mode: 'global' }]);
    }
}
