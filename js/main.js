/**
 * Main Application Logic
 * Обновлено для работы с Supabase
 */

let isMaintenanceActive = false;
let currentCacheVersion = '1.0.0';

// Проверка режима обслуживания и версии кеша
async function checkSystemStatus() {
  try {
    // Читаем настройки из Supabase
    const { data: settingsData, error } = await supabase
      .from('settings')
      .select('key, value')
      .in('key', ['maintenance', 'cacheVersion']);

    if (error) throw error;

    // Обрабатываем полученные данные
    const maintenanceSetting = settingsData.find(s => s.key === 'maintenance');
    const cacheSetting = settingsData.find(s => s.key === 'cacheVersion');

    // Режим обслуживания
    if (maintenanceSetting && maintenanceSetting.value) {
      const maintValue = typeof maintenanceSetting.value === 'string' 
        ? JSON.parse(maintenanceSetting.value) 
        : maintenanceSetting.value;
      
      isMaintenanceActive = maintValue.enabled === true;
      
      if (isMaintenanceActive) {
        showMaintenanceScreen(maintValue.message || 'Технические работы...');
        return false; // Останавливаем загрузку
      }
    }

    // Версия кеша
    if (cacheSetting) {
      currentCacheVersion = typeof cacheSetting.value === 'string' 
        ? cacheSetting.value.replace(/"/g, '') 
        : cacheSetting.value;
      
      const storedVersion = sessionStorage.getItem('cacheVersion');
      if (storedVersion !== currentCacheVersion) {
        console.log('🔄 Cache version changed. Clearing old cache...');
        sessionStorage.clear();
        localStorage.clear();
        sessionStorage.setItem('cacheVersion', currentCacheVersion);
        // Можно добавить принудительную перезагрузку при серьезном обновлении
        // window.location.reload(); 
      }
    }

    console.log('✅ System status checked:', { maintenance: isMaintenanceActive, cache: currentCacheVersion });
    return true;

  } catch (err) {
    console.error('❌ Error checking system status:', err);
    // В случае ошибки не блокируем сайт, но логируем проблему
    return true; 
  }
}

function showMaintenanceScreen(message) {
  document.body.innerHTML = `
    <div style="display:flex;justify-content:center;align-items:center;height:100vh;background:#1a1a1a;color:white;font-family:sans-serif;text-align:center;">
      <div>
        <h1>⚠️ Технические работы</h1>
        <p>${message}</p>
        <p>Пожалуйста, зайдите позже.</p>
      </div>
    </div>
  `;
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', async () => {
  // Ждем инициализации Firebase Auth и Supabase Client
  if (typeof firebase === 'undefined' || typeof supabase === 'undefined') {
    console.warn('⏳ Waiting for Firebase/Supabase initialization...');
    setTimeout(() => document.dispatchEvent(new Event('DOMContentLoaded')), 500);
    return;
  }

  const systemOk = await checkSystemStatus();
  
  if (systemOk) {
    console.log('🚀 Application started normally');
    // Здесь можно вызвать другие функции инициализации, если они есть
    // initNotifications(); 
    // loadNews();
  }
});

// Экспорт функций для использования в других модулях (если нужно)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { checkSystemStatus, isMaintenanceActive };
}
