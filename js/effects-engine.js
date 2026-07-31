/**
 * Effects Engine (Supabase Version)
 * Управление активными эффектами: рамки, темы, двойной опыт и т.д.
 */

const ACTIVE_EFFECTS_KEY = 'activeEffects';

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    checkActiveEffects();
    // Проверяем эффекты каждую минуту
    setInterval(checkActiveEffects, 60000);
});

/**
 * Проверка и применение активных эффектов
 */
async function checkActiveEffects() {
    const user = firebase.auth().currentUser;
    if (!user) return;

    try {
        // Читаем профиль из Supabase
        const { data, error } = await supabase
            .from('users')
            .select('data')
            .eq('id', user.uid)
            .single();

        if (error || !data) return;

        const userData = data.data || {};
        const effects = userData.activeEffects || {};
        const now = Date.now();

        let hasChanges = false;
        const activeEffectsNow = {};

        // Перебираем все эффекты
        for (const [effectId, effectData] of Object.entries(effects)) {
            const expiresAt = effectData.expiresAt || 0;

            if (expiresAt > now) {
                // Эффект еще активен -> применяем
                activeEffectsNow[effectId] = effectData;
                applyEffectVisuals(effectId, effectData);
            } else {
                // Эффект истек -> помечаем на удаление
                console.log(`Эффект ${effectId} истек`);
                hasChanges = true;
                removeEffectVisuals(effectId);
            }
        }

        // Если что-то истекло, обновляем базу
        if (hasChanges) {
            await supabase
                .from('users')
                .update({ 
                    data: { ...userData, activeEffects: activeEffectsNow } 
                })
                .eq('id', user.uid);
            
            console.log('Активные эффекты обновлены');
        }

    } catch (err) {
        console.error('Ошибка проверки эффектов:', err);
    }
}

/**
 * Применение визуальных эффектов (CSS классы, темы)
 */
function applyEffectVisuals(effectId, effectData) {
    const body = document.body;

    switch (effectId) {
        case 'dark_theme_perm':
            body.classList.add('dark-theme');
            localStorage.setItem('theme', 'dark');
            break;
        
        case 'gold_frame':
            body.classList.add('has-gold-frame');
            break;
        
        case 'double_xp':
            // Визуально можно добавить иконку рядом с балансом
            const xpBadge = document.getElementById('nav-points');
            if (xpBadge && !xpBadge.classList.contains('double-xp-active')) {
                xpBadge.classList.add('double-xp-active');
                xpBadge.title = 'Двойной опыт активен!';
            }
            break;

        case 'vip_status':
            body.classList.add('vip-user');
            break;
            
        default:
            // Кастомные эффекты из data
            if (effectData.cssClass) {
                body.classList.add(effectData.cssClass);
            }
            break;
    }
}

/**
 * Удаление визуальных эффектов
 */
function removeEffectVisuals(effectId) {
    const body = document.body;

    switch (effectId) {
        case 'dark_theme_perm':
            // Не удаляем, если пользователь сам не переключил (опционально)
            // body.classList.remove('dark-theme'); 
            break;
        
        case 'gold_frame':
            body.classList.remove('has-gold-frame');
            break;
        
        case 'double_xp':
            const xpBadge = document.getElementById('nav-points');
            if (xpBadge) {
                xpBadge.classList.remove('double-xp-active');
                xpBadge.title = '';
            }
            break;

        case 'vip_status':
            body.classList.remove('vip-user');
            break;
            
        default:
            if (effectData && effectData.cssClass) {
                body.classList.remove(effectData.cssClass);
            }
            break;
    }
}

/**
 * Активация эффекта после покупки
 * Вызывается из shop.js после успешной покупки
 */
window.activateEffect = async (itemId, itemData) => {
    const user = firebase.auth().currentUser;
    if (!user) return false;

    try {
        // Получаем текущие данные
        const { data: userDataRow, error: fetchError } = await supabase
            .from('users')
            .select('data')
            .eq('id', user.uid)
            .single();

        if (fetchError) throw fetchError;

        const currentData = userDataRow.data || {};
        const currentEffects = currentData.activeEffects || {};

        // Вычисляем время окончания
        const durationMinutes = itemData.duration || 60; // По умолчанию 1 час
        const expiresAt = Date.now() + (durationMinutes * 60 * 1000);

        // Добавляем новый эффект
        currentEffects[itemId] = {
            activatedAt: Date.now(),
            expiresAt: expiresAt,
            params: itemData.effectParams || {}
        };

        // Обновляем в базе
        const { error: updateError } = await supabase
            .from('users')
            .update({ 
                data: { ...currentData, activeEffects: currentEffects } 
            })
            .eq('id', user.uid);

        if (updateError) throw updateError;

        // Сразу применяем визуально
        applyEffectVisuals(itemId, currentEffects[itemId]);
        
        console.log(`Эффект ${itemId} активирован до ${new Date(expiresAt).toLocaleTimeString()}`);
        return true;

    } catch (err) {
        console.error('Ошибка активации эффекта:', err);
        return false;
    }
};
