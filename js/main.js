// js/main.js

// Функция показа тостов
function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  toast.offsetHeight;
  toast.classList.add('toast--visible');
  setTimeout(() => {
    toast.classList.remove('toast--visible');
    toast.addEventListener('transitionend', () => {
      if (toast.parentNode) toast.remove();
      if (container.children.length === 0) container.remove();
    });
  }, 3500);
}

// Инициалы и цвет
function getInitials(fullName) {
  if (!fullName) return '?';
  const parts = fullName.trim().split(/\s+/);
  return parts.length > 1
    ? (parts[0][0] + parts[parts.length-1][0]).toUpperCase()
    : fullName[0].toUpperCase();
}

function getColorFromUid(uid) {
  let hash = 0;
  for (let i = 0; i < uid.length; i++) {
    hash = uid.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash % 360);
  return `hsl(${h}, 60%, 70%)`;
}

// Поддержка extraClass для эффектов (золотая рамка, анимация)
// и кастомных аватаров (эмодзи)
function renderAvatarDiv(user, extraClass = '') {
  // Если у пользователя есть кастомный аватар – показываем эмодзи
  if (user.avatarEmoji) {
    const cls = extraClass ? 'avatar-circle avatar-emoji ' + extraClass : 'avatar-circle avatar-emoji';
    return `<div class="${cls}" title="${user.username}" style="font-size:2.5rem;">${user.avatarEmoji}</div>`;
  }
  // Стандартные инициалы
  const initials = getInitials(user.username);
  const bgColor = getColorFromUid(user.uid || user.id);
  const cls = extraClass ? 'avatar-circle ' + extraClass : 'avatar-circle';
  return `<div class="${cls}" style="background-color: ${bgColor};" title="${user.username}">${initials}</div>`;
}

// Склонение слова "локоин"
function pluralizeLokoin(n) {
  const abs = Math.abs(n);
  const lastDigit = abs % 10;
  const lastTwoDigits = abs % 100;
  if (lastTwoDigits >= 11 && lastTwoDigits <= 19) return 'ов';
  if (lastDigit === 1) return '';
  if (lastDigit >= 2 && lastDigit <= 4) return 'а';
  return 'ов';
}

// Универсальное модальное окно подтверждения
function showConfirmModal(message, onConfirm, onCancel) {
  const existing = document.getElementById('confirm-action-modal');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'confirm-action-modal';
  overlay.style.display = 'flex';

  overlay.innerHTML = `
    <div class="modal" style="max-width:400px; text-align:center;">
      <p style="margin-bottom:1.5rem; font-size:1.1rem;">${message}</p>
      <div style="display:flex; gap:0.5rem; justify-content:center;">
        <button class="btn" id="confirm-yes-btn">Да</button>
        <button class="btn btn-cancel" id="confirm-no-btn">Отмена</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const close = () => { overlay.remove(); };

  overlay.querySelector('#confirm-yes-btn').addEventListener('click', () => {
    close();
    if (onConfirm) onConfirm();
  });

  overlay.querySelector('#confirm-no-btn').addEventListener('click', () => {
    close();
    if (onCancel) onCancel();
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      close();
      if (onCancel) onCancel();
    }
  });
}

// Обновление статуса в шапке
function updateAuthUI(authUser) {
  const statusEl = document.getElementById('auth-status');
  if (!statusEl) return;
  if (authUser) {
    const current = getCurrentUser();
    const name = current ? current.username : 'Пользователь';
    statusEl.innerHTML = `👤 <span class="auth-greeting">${name}</span> | <a href="#" id="logout-link">Выйти</a>`;
    const logoutLink = document.getElementById('logout-link');
    if (logoutLink) {
      logoutLink.addEventListener('click', (e) => {
        e.preventDefault();
        if (typeof logoutUser === 'function') {
          logoutUser();
        }
      });
    }
  } else {
    const currentPage = window.location.pathname + window.location.search;
    statusEl.innerHTML = `<a href="login.html?redirect=${encodeURIComponent(currentPage)}">Войти</a>`;
  }
}

// Проверка режима обслуживания (без длительного кеша, мгновенное применение)
async function checkMaintenanceMode() {
  try {
    // Всегда запрашиваем актуальный статус из Supabase, кеш не используем
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'maintenance')
      .single();

    if (error) throw error;

    const maintenanceData = data ? (typeof data.value === 'string' ? JSON.parse(data.value) : data.value) : { enabled: false };

    // Сохраняем в кеш для возможного использования в рамках сессии, но не полагаемся на него
    sessionStorage.setItem('krugames_maintenance_cache', JSON.stringify({ timestamp: Date.now(), data: maintenanceData }));

    if (!maintenanceData.enabled) {
      // Убираем баннер, если он был
      const banner = document.getElementById('maintenance-banner');
      if (banner) banner.remove();
      return false;
    }

    // Режим включен
    const currentUser = getCurrentUser();
    const isAdmin = currentUser && currentUser.role === 'admin';

    if (!isAdmin) {
      // Не-админ видит заглушку
      document.body.innerHTML = `
        <div style="display:flex; align-items:center; justify-content:center; min-height:100vh; background:#1a1a2e; color:#fff; font-family:'Segoe UI',sans-serif; text-align:center;">
          <div style="max-width:500px; padding:2rem;">
            <div style="font-size:3rem; margin-bottom:1rem;">🔧</div>
            <h2 style="margin-bottom:1rem;">Техническое обслуживание</h2>
            <p style="font-size:1.1rem; margin-bottom:1.5rem; opacity:0.8;">${maintenanceData.message || 'Сайт на техническом обслуживании. Попробуйте зайти позже.'}</p>
            <a href="login.html" style="color:#4a9eff;">Войти как администратор</a>
          </div>
        </div>
      `;
      return true;
    } else {
      // Админ видит баннер
      let banner = document.getElementById('maintenance-banner');
      if (!banner) {
        banner = document.createElement('div');
        banner.id = 'maintenance-banner';
        banner.style.cssText = 'background:#f39c12; color:#000; text-align:center; padding:0.5rem; font-weight:600; position:sticky; top:0; z-index:9999;';
        banner.textContent = '⚠️ Включён режим обслуживания. Обычные пользователи не видят сайт.';
        document.body.prepend(banner);
      } else {
        // Обновляем текст на случай изменения сообщения
        banner.textContent = '⚠️ Включён режим обслуживания. Обычные пользователи не видят сайт.';
      }
    }
    return false;
  } catch (e) {
    console.error('Ошибка проверки режима обслуживания:', e);
    return false;
  }
}

// Проверка версии кеша с кешированием на 10 минут (оставлено без изменений)
async function checkCacheVersion() {
  try {
    const CACHE_KEY = 'krugames_cache_version_check';
    const CACHE_TTL = 10 * 60 * 1000; // 10 минут
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Date.now() - parsed.timestamp < CACHE_TTL) {
        const localVersion = localStorage.getItem('krugames_cache_version');
        if (!localVersion || String(parsed.version) !== String(localVersion)) {
          const sessionKeys = Object.keys(sessionStorage).filter(k => k.startsWith('krugames_'));
          sessionKeys.forEach(k => sessionStorage.removeItem(k));
          const localKeys = Object.keys(localStorage).filter(k => k.startsWith('krugames_') && k !== 'krugames_cache_version');
          localKeys.forEach(k => localStorage.removeItem(k));
          localStorage.setItem('krugames_cache_version', parsed.version);
        }
        return;
      }
    }

    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'cacheVersion')
      .single();

    if (error) throw error;

    const serverVersion = data ? (typeof data.value === 'string' ? data.value.replace(/"/g, '') : String(data.value)) : null;
    if (!serverVersion) return;

    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), version: serverVersion }));

    const localVersion = localStorage.getItem('krugames_cache_version');
    if (!localVersion || String(serverVersion) !== String(localVersion)) {
      const sessionKeys = Object.keys(sessionStorage).filter(k => k.startsWith('krugames_'));
      sessionKeys.forEach(k => sessionStorage.removeItem(k));
      const localKeys = Object.keys(localStorage).filter(k => k.startsWith('krugames_') && k !== 'krugames_cache_version');
      localKeys.forEach(k => localStorage.removeItem(k));
      localStorage.setItem('krugames_cache_version', serverVersion);
    }
  } catch (e) {
    console.error('Ошибка проверки версии кеша:', e);
  }
}

/**
 * Возвращает массив активных эффектов с информацией для отображения
 */
function getActiveEffectsInfo(user) {
  if (!user || !user.activeEffects) return [];
  const now = Date.now();
  const result = [];
  for (const [effectId, effectData] of Object.entries(user.activeEffects)) {
    if (!effectData || !effectData.activatedAt) continue;
    const durationMs = (effectData.durationHours || 0) * 3600000;
    if (durationMs === 0) continue;
    const expiresAt = effectData.activatedAt + durationMs;
    const remainingMs = Math.max(0, expiresAt - now);
    if (remainingMs <= 0) continue;
    const hours = Math.floor(remainingMs / 3600000);
    const minutes = Math.floor((remainingMs % 3600000) / 60000);
    let remainingText;
    if (hours > 0) {
      remainingText = `${hours} ч ${minutes} мин`;
    } else {
      remainingText = `${minutes} мин`;
    }
    const displayName = typeof getEffectDisplayName === 'function'
      ? getEffectDisplayName(effectId)
      : effectId;
    result.push({
      id: effectId,
      name: displayName,
      remainingMs,
      remainingText
    });
  }
  return result;
}

// Обновление времени последней активности пользователя в Supabase
async function updateLastActive(uid) {
  if (!uid) return;
  try {
    await supabase.from('users').update({ last_active: new Date().toISOString() }).eq('id', uid);
  } catch (e) {
    console.error('Ошибка обновления last_active:', e);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  // Проверяем обслуживание (теперь без кеша, мгновенно)
  const isMaintenance = await checkMaintenanceMode();
  if (isMaintenance) return;

  await checkCacheVersion();

  // Добавляем favicon, если отсутствует
  if (!document.querySelector('link[rel="icon"]')) {
    const link = document.createElement('link');
    link.rel = 'icon';
    link.type = 'image/svg+xml';
    link.href = 'img/favicon.svg';
    document.head.appendChild(link);
  }

  // Бургер-меню
  const burgerBtn = document.getElementById('burger-btn');
  const mainNav = document.getElementById('main-nav');
  if (burgerBtn && mainNav) {
    burgerBtn.addEventListener('click', () => {
      mainNav.classList.toggle('nav--open');
    });
  }

  // Добавляем ссылку на FAQ в навигацию (если отсутствует)
  const navList = document.querySelector('.nav__list');
  if (navList && !navList.querySelector('a[href="faq.html"]')) {
    const helpLi = document.createElement('li');
    helpLi.innerHTML = '<a href="faq.html" class="nav__link">Помощь</a>';
    navList.appendChild(helpLi);
  }

  // Активация аккордеонов FAQ
  document.querySelectorAll('.faq-item__question').forEach(btn => {
    btn.addEventListener('click', () => {
      const faqItem = btn.parentElement;
      faqItem.classList.toggle('active');
    });
  });

  // Инициализация систем (если модули уже загружены)
  if (typeof initFeedback === 'function') {
    initFeedback();
  }

  if (typeof initNotifications === 'function') {
    initNotifications();
  }

  // Слушатель изменений аутентификации Supabase
  if (typeof onAuthStateChange === 'function') {
    onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        const authUser = session?.user ?? null;
        updateAuthUI(authUser);
        if (authUser && typeof initEasterEggs === 'function') {
          initEasterEggs();
        }
        const cu = getCurrentUser();
        if (cu && cu.activeTheme === 'dark') {
          document.body.classList.add('dark-theme');
        } else {
          document.body.classList.remove('dark-theme');
        }
        if (authUser) {
          await updateLastActive(authUser.id);
        }
      } else if (event === 'SIGNED_OUT') {
        updateAuthUI(null);
        document.body.classList.remove('dark-theme');
      }
    });
  } else {
    // Если onAuthStateChange не определён (ошибка загрузки auth.js), отображаем состояние без входа
    updateAuthUI(null);
    document.body.classList.remove('dark-theme');
  }

  // Обновление last_active при возвращении на вкладку
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible' && typeof supabase !== 'undefined') {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) await updateLastActive(user.id);
    }
  });
});
