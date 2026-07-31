/**
 * Main Application Logic
 * Обновлен для работы с Supabase вместо Firestore
 */

// Глобальные переменные
let isMaintenanceEnabled = false;
let currentCacheVersion = '1.0.0';

// --- ФУНКЦИИ РАБОТЫ С SUPABASE ---

/**
 * Проверка режима обслуживания
 * Читает из таблицы settings ключ 'maintenance'
 */
async function checkMaintenanceMode() {
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'maintenance')
      .single();

    if (error) throw error;

    if (data && data.value) {
      const maintenanceData = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
      isMaintenanceEnabled = maintenanceData.enabled || false;
      
      if (isMaintenanceEnabled) {
        showMaintenanceScreen(maintenanceData.message || 'Сайт находится на техническом обслуживании.');
        return true;
      }
    }
    return false;
  } catch (err) {
    console.error('Ошибка проверки maintenance:', err);
    return false;
  }
}

/**
 * Проверка версии кеша
 * Читает из таблицы settings ключ 'cacheVersion'
 */
async function checkCacheVersion() {
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'cacheVersion')
      .single();

    if (error) throw error;

    if (data && data.value) {
      // Если значение строка в JSON, парсим, иначе берем как есть
      const version = typeof data.value === 'string' ? data.value.replace(/"/g, '') : String(data.value);
      currentCacheVersion = version;

      const storedVersion = sessionStorage.getItem('cacheVersion');
      
      if (storedVersion !== currentCacheVersion) {
        console.log(`🔄 Новая версия кеша: ${currentCacheVersion}. Очистка...`);
        sessionStorage.clear();
        sessionStorage.setItem('cacheVersion', currentCacheVersion);
        // Можно добавить принудительную перезагрузку, если нужно
        // window.location.reload(); 
      }
    }
  } catch (err) {
    console.error('Ошибка проверки cacheVersion:', err);
  }
}

/**
 * Показ экрана обслуживания
 */
function showMaintenanceScreen(message) {
  document.body.innerHTML = `
    <div style="display:flex;justify-content:center;align-items:center;height:100vh;background:#1a1a1a;color:white;font-family:sans-serif;text-align:center;">
      <div>
        <h1>⚠️ Техническое обслуживание</h1>
        <p>${message}</p>
        <p>Попробуйте позже.</p>
      </div>
    </div>
  `;
  // Блокируем взаимодействие
  document.body.style.pointerEvents = 'none';
}

// --- ИНИЦИАЛИЗАЦИЯ ---

document.addEventListener('DOMContentLoaded', async () => {
  // Ждем инициализации Firebase Auth (если нужно)
  // Проверка настроек
  const isMaintenance = await checkMaintenanceMode();
  
  if (!isMaintenance) {
    await checkCacheVersion();
    console.log('✅ Приложение запущено в обычном режиме');
    
    // Здесь можно вызвать другие функции инициализации
    // initNotifications(); 
    // loadNews();
  }
});
