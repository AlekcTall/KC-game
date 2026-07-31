/**
 * Profile Page Logic
 * Загрузка данных профиля из Supabase
 */

document.addEventListener('DOMContentLoaded', async () => {
    // Ждем инициализации Auth
    await waitForAuth();

    const user = firebase.auth().currentUser;
    if (!user) {
        window.location.href = 'index.html';
        return;
    }

    const uid = user.uid;
    const profileDataEl = document.getElementById('profile-data');
    const awardsGridEl = document.getElementById('awards-grid');
    const historyListEl = document.getElementById('history-list');
    const saveBtn = document.getElementById('save-profile-btn');
    const descInput = document.getElementById('profile-description');

    // 1. Загрузка основного профиля
    async function loadProfile() {
        showLoading(profileDataEl);
        
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', uid)
                .single();

            if (error || !data) throw error;

            const userData = data.data || {}; // Основные поля внутри JSONB
            
            // Заполнение полей
            document.getElementById('profile-username').textContent = userData.username || 'Без имени';
            document.getElementById('profile-email').textContent = user.email;
            document.getElementById('profile-department').textContent = userData.department || 'Не указан';
            document.getElementById('profile-points').textContent = userData.points || 0;
            document.getElementById('profile-lokoins').textContent = userData.lokoin_balance || 0;
            
            // Статистика игр
            const stats = userData.gameStats || {};
            document.getElementById('stat-games-played').textContent = stats.played || 0;
            document.getElementById('stat-wins').textContent = stats.wins || 0;
            document.getElementById('stat-losses').textContent = stats.losses || 0;

            // Описание
            descInput.value = userData.description || '';

            // Аватар
            const avatarUrl = userData.avatarUrl || 'https://ui-avatars.com/api/?name=' + (userData.username || 'User');
            document.getElementById('profile-avatar').src = avatarUrl;

            // Достижения (массив ID)
            renderAwards(userData.achievements || []);

            hideLoading(profileDataEl);

        } catch (err) {
            console.error('Ошибка загрузки профиля:', err);
            profileDataEl.innerHTML = '<p class="error-msg">Не удалось загрузить профиль.</p>';
        }
    }

    // 2. Рендер наград
    async function renderAwards(userAchievementIds) {
        if (!awardsGridEl) return;
        awardsGridEl.innerHTML = '<div class="loading">Загрузка наград...</div>';

        try {
            // Получаем все награды, чтобы сопоставить ID с названиями
            const { data: allAwards, error } = await supabase
                .from('awards')
                .select('*');

            if (error) throw error;

            if (userAchievementIds.length === 0) {
                awardsGridEl.innerHTML = '<p>Пока нет наград.</p>';
                return;
            }

            // Фильтруем только полученные пользователем
            const userAwards = allAwards.filter(award => userAchievementIds.includes(award.id));

            if (userAwards.length === 0) {
                awardsGridEl.innerHTML = '<p>Пока нет наград.</p>';
                return;
            }

            awardsGridEl.innerHTML = userAwards.map(award => `
                <div class="award-card">
                    <div class="award-icon">${award.icon_url || '🏆'}</div>
                    <div class="award-name">${award.name}</div>
                    <div class="award-desc">${award.description}</div>
                </div>
            `).join('');

        } catch (err) {
            console.error('Ошибка наград:', err);
            awardsGridEl.innerHTML = '<p>Ошибка загрузки наград.</p>';
        }
    }

    // 3. Сохранение описания
    if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
            const newDesc = descInput.value.trim();
            saveBtn.disabled = true;
            saveBtn.textContent = 'Сохранение...';

            try {
                const { error } = await supabase
                    .from('users')
                    .update({ 
                        data: firebase.firestore.FieldValue ? 
                            // Если вдруг остался старый код, но мы используем JSONB merge через RPC или update
                            // В Supabase просто обновляем JSONB поле:
                            null // Логика ниже
                         : null 
                    })
                    .eq('id', uid);
                
                // Правильный способ обновления JSONB поля в Supabase JS v2:
                // Нам нужно получить текущий data, изменить его и отправить целиком, 
                // ИЛИ использовать RPC функцию. Для простоты сделаем "чтение-изменение-запись":
                
                const { data: currentUser } = await supabase.from('users').select('data').eq('id', uid).single();
                const currentData = currentUser.data || {};
                currentData.description = newDesc;

                const { error: updateError } = await supabase
                    .from('users')
                    .update({ data: currentData })
                    .eq('id', uid);

                if (updateError) throw updateError;

                alert('Описание сохранено!');
            } catch (err) {
                console.error('Ошибка сохранения:', err);
                alert('Ошибка при сохранении.');
            } finally {
                saveBtn.disabled = false;
                saveBtn.textContent = 'Сохранить';
            }
        });
    }

    // Запуск
    loadProfile();
});

// Утилиты
function showLoading(el) {
    if(el) el.classList.add('loading');
}
function hideLoading(el) {
    if(el) el.classList.remove('loading');
}
async function waitForAuth() {
    return new Promise(resolve => {
        const unsubscribe = firebase.auth().onAuthStateChanged(() => {
            unsubscribe();
            resolve();
        });
    });
}
