/**
 * Leaderboard Logic (Optimized for Supabase)
 * Чтение из таблицы leaderboards вместо полного сканирования users
 */

document.addEventListener('DOMContentLoaded', async () => {
    await waitForAuth();

    const tbody = document.getElementById('leaderboard-body');
    const modeBtns = document.querySelectorAll('.mode-btn');
    const myRankCard = document.getElementById('current-user-rank');
    
    let currentMode = 'global';

    // 1. Загрузка рейтинга
    async function loadLeaderboard(mode) {
        showLoading();
        
        try {
            // Запрос к оптимизированной таблице leaderboards
            // В реальном проекте тут можно добавить filter .eq('mode', mode)
            const { data, error } = await supabase
                .from('leaderboards')
                .select(`
                    user_id,
                    points,
                    rank,
                    users!inner(id, data) 
                `)
                .order('points', { ascending: false })
                .limit(50); // Берем только топ-50 для скорости

            if (error) throw error;

            renderTable(data);
            renderMyRank(data);

        } catch (err) {
            console.error('Ошибка загрузки рейтинга:', err);
            tbody.innerHTML = `<tr><td colspan="5" class="error-msg">Не удалось загрузить рейтинг</td></tr>`;
        }
    }

    // 2. Рендер таблицы
    function renderTable(data) {
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5">Пока нет данных</td></tr>';
            return;
        }

        tbody.innerHTML = data.map((entry, index) => {
            const user = entry.users;
            const userData = user.data || {};
            const username = userData.username || 'Аноним';
            const department = userData.department || '-';
            const level = calculateLevel(entry.points);
            
            // Медаль для топ-3
            let rankDisplay = entry.rank || (index + 1);
            if (rankDisplay === 1) rankDisplay = '🥇';
            if (rankDisplay === 2) rankDisplay = '🥈';
            if (rankDisplay === 3) rankDisplay = '🥉';

            return `
                <tr>
                    <td class="rank-col">${rankDisplay}</td>
                    <td class="user-col">
                        <div class="user-cell">
                            <span class="username">${escapeHtml(username)}</span>
                        </div>
                    </td>
                    <td>${escapeHtml(department)}</td>
                    <td class="points-col">${Math.floor(entry.points)}</td>
                    <td class="level-col">Lvl ${level}</td>
                </tr>
            `;
        }).join('');
    }

    // 3. Рендер моего места
    function renderMyRank(data) {
        const user = firebase.auth().currentUser;
        if (!user || !data) return;

        const myEntry = data.find(row => row.user_id === user.uid);
        
        if (myEntry) {
            myRankCard.innerHTML = `
                <div class="rank-content">
                    <span>Твое место:</span>
                    <strong>#${myEntry.rank || '?'}</strong>
                    <span>Очки:</span>
                    <strong>${Math.floor(myEntry.points)}</strong>
                </div>
            `;
            myRankCard.style.display = 'block';
        } else {
            myRankCard.innerHTML = '<div class="rank-content">Вы пока не в топ-50</div>';
            myRankCard.style.display = 'block';
        }
    }

    // Обработчики кнопок
    modeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            modeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentMode = btn.dataset.mode;
            loadLeaderboard(currentMode);
        });
    });

    // Утилиты
    function showLoading() {
        tbody.innerHTML = '<tr><td colspan="5" class="loading-row"><i class="fas fa-spinner fa-spin"></i> Загрузка...</td></tr>';
    }

    function calculateLevel(points) {
        return Math.floor(Math.sqrt(points / 100)) + 1;
    }

    function escapeHtml(text) {
        if (!text) return '';
        return text.toString().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }

    async function waitForAuth() {
        return new Promise(resolve => {
            const unsubscribe = firebase.auth().onAuthStateChanged(() => {
                unsubscribe();
                resolve();
            });
        });
    }

    // Старт
    loadLeaderboard(currentMode);
});
