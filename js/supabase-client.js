/**
 * Supabase Client Configuration
 * Подключение к базе данных Supabase
 * Firebase Auth остается для входа, но данные берем отсюда
 */

const SUPABASE_URL = 'https://zelcomhsdguzgtzhjkhk.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_15QxH4G24K_CxK5N8JtKJA_F_v0ENyy'; // Публичный ключ (безопасно для фронта)

// Инициализация клиента
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Вспомогательная функция: Получить текущего пользователя (UID из Firebase Auth)
function getCurrentUserId() {
  const user = firebase.auth().currentUser;
  return user ? user.uid : null;
}

// Проверка подключения
async function testSupabaseConnection() {
  try {
    const { data, error } = await supabase.from('settings').select('key').limit(1);
    if (error) throw error;
    console.log('✅ Supabase connected successfully');
    return true;
  } catch (err) {
    console.error('❌ Supabase connection failed:', err);
    return false;
  }
}

// Запуск проверки при загрузке
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    // Ждем инициализации Firebase Auth перед проверкой
    setTimeout(testSupabaseConnection, 1000);
  });
}
