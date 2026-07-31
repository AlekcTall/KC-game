// js/notifications.js

let notificationsUnreadCount = 0;
let notificationsList = [];
let notificationDropdown = null;
let notificationsChannel = null; // Supabase Realtime канал

// Иконки для типов уведомлений
const TYPE_ICONS = {
  game: '🎮',
  achievement: '🏆',
  lokoin: '💰',
  purchase: '🛒',
  admin: '⚙️',
  system: 'ℹ️',
  gift: '🎁',
  award: '🎖️'
};

// Склонение слова "локоин" (дублируется из main.js, оставлено для автономности)
function pluralizeLokoin(n) {
  const abs = Math.abs(n);
  const lastDigit = abs % 10;
  const lastTwoDigits = abs % 100;
  if (lastTwoDigits >= 11 && lastTwoDigits <= 19) return 'ов';
  if (lastDigit === 1) return '';
  if (lastDigit >= 2 && lastDigit <= 4) return 'а';
  return 'ов';
}

// Модальное окно уведомления (создадим динамически)
let notifModal = null;

function createNotifModal() {
  if (notifModal) return;
  notifModal = document.createElement('div');
  notifModal.className = 'modal-overlay';
  notifModal.id = 'notif-modal';
  notifModal.style.display = 'none';
  notifModal.innerHTML = `
    <div class="modal notif-modal-content">
      <span class="modal-close" id="notif-modal-close">&times;</span>
      <div class="notif-detail">
        <div class="notif-detail-icon" id="notif-detail-icon"></div>
        <p class="notif-detail-message" id="notif-detail-message"></p>
        <small class="notif-detail-date" id="notif-detail-date"></small>
        <div class="notif-detail-actions" id="notif-detail-actions">
          <button class="btn" id="notif-detail-link-btn" style="display:none;">Перейти</button>
          <button class="btn btn-cancel" id="notif-detail-close-btn">Закрыть</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(notifModal);
  
  document.getElementById('notif-modal-close').addEventListener('click', closeNotifModal);
  document.getElementById('notif-detail-close-btn').addEventListener('click', closeNotifModal);
  document.getElementById('notif-detail-link-btn').addEventListener('click', () => {
    const link = notifModal.dataset.link;
    if (link) window.location.href = link;
    closeNotifModal();
  });
  window.addEventListener('click', (e) => {
    if (e.target === notifModal) closeNotifModal();
  });
}

function openNotifModal(notification) {
  createNotifModal();
  const icon = TYPE_ICONS[notification.type] || '🔔';
  document.getElementById('notif-detail-icon').textContent = icon;
  document.getElementById('notif-detail-message').textContent = notification.message;
  // timestamp теперь ISO строка (TIMESTAMPTZ) из Supabase
  const date = notification.created_at
    ? new Date(notification.created_at).toLocaleString('ru-RU')
    : '';
  document.getElementById('notif-detail-date').textContent = date;
  
  const linkBtn = document.getElementById('notif-detail-link-btn');
  if (notification.link) {
    linkBtn.style.display = 'inline-block';
    notifModal.dataset.link = notification.link;
  } else {
    linkBtn.style.display = 'none';
    delete notifModal.dataset.link;
  }
  notifModal.style.display = 'flex';
}

function closeNotifModal() {
  if (notifModal) notifModal.style.display = 'none';
}

function initNotifications() {
  const headerInner = document.querySelector('.header__inner');
  if (!headerInner) return;

  const bellContainer = document.createElement('div');
  bellContainer.className = 'notification-bell-container';
  bellContainer.innerHTML = `
    <button class="notification-bell" id="notification-bell">
      🔔
      <span class="notification-badge" id="notification-badge" style="display:none;">0</span>
    </button>
    <div class="notification-dropdown" id="notification-dropdown" style="display:none;">
      <div class="notification-list" id="notification-list"></div>
      <button class="btn-clear" id="clear-notifications-btn">Очистить все</button>
    </div>
  `;

  const authStatus = document.getElementById('auth-status');
  if (authStatus) {
    headerInner.insertBefore(bellContainer, authStatus);
  } else {
    headerInner.appendChild(bellContainer);
  }

  notificationDropdown = document.getElementById('notification-dropdown');
  const bellBtn = document.getElementById('notification-bell');
  const badge = document.getElementById('notification-badge');
  const listEl = document.getElementById('notification-list');
  const clearBtn = document.getElementById('clear-notifications-btn');

  bellBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (notificationDropdown.style.display === 'block') {
      notificationDropdown.style.display = 'none';
    } else {
      notificationDropdown.style.display = 'block';
      markAllRead();
    }
  });

  clearBtn.addEventListener('click', async () => {
    const currentUser = getCurrentUser();
    if (!currentUser || !currentUser.id) return;
    const uid = currentUser.id;
    // Удаляем все уведомления пользователя
    const { error } = await supabase
      .from('user_notifications')
      .delete()
      .eq('user_id', uid);
    if (error) console.error('Ошибка удаления уведомлений:', error);

    notificationsUnreadCount = 0;
    notificationsList = [];
    updateBadge();
    renderNotifications();
    // Пасхалка "В тишине"
    if (typeof checkSilence === 'function') {
      checkSilence();
    }
  });

  document.addEventListener('click', () => {
    if (notificationDropdown) notificationDropdown.style.display = 'none';
  });

  // Подписка на изменения аутентификации (аналог onAuthStateChanged)
  if (typeof onAuthStateChange === 'function') {
    onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        const user = session?.user ?? null;
        if (user) {
          // Отписываемся от старого канала, если был
          if (notificationsChannel) {
            supabase.removeChannel(notificationsChannel);
            notificationsChannel = null;
          }
          // Загружаем начальные уведомления
          loadInitialNotifications(user.id);
          // Подписываемся на новые уведомления через Realtime
          subscribeToNotifications(user.id);
        }
      } else if (event === 'SIGNED_OUT') {
        if (notificationsChannel) {
          supabase.removeChannel(notificationsChannel);
          notificationsChannel = null;
        }
        notificationsList = [];
        notificationsUnreadCount = 0;
        updateBadge();
        renderNotifications();
      }
    });
  }

  // Загрузка последних 20 уведомлений
  async function loadInitialNotifications(uid) {
    const { data, error } = await supabase
      .from('user_notifications')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(20);
    if (error) {
      console.error('Ошибка загрузки уведомлений:', error);
      return;
    }
    notificationsList = data || [];
    notificationsUnreadCount = notificationsList.filter(n => !n.is_read).length;
    updateBadge();
    renderNotifications();
  }

  // Подписка на вставку новых уведомлений
  function subscribeToNotifications(uid) {
    notificationsChannel = supabase
      .channel('user_notifications_channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_notifications',
          filter: `user_id=eq.${uid}`
        },
        (payload) => {
          const newNotif = payload.new;
          // Добавляем в начало списка
          notificationsList.unshift(newNotif);
          if (!newNotif.is_read) notificationsUnreadCount++;
          // Ограничиваем список 20 записями
          if (notificationsList.length > 20) notificationsList.pop();
          updateBadge();
          renderNotifications();
          // Показываем браузерное уведомление, если вкладка не активна
          if (!newNotif.is_read && document.visibilityState === 'hidden') {
            showBrowserNotification(newNotif.message || 'Новое уведомление');
          }
        }
      )
      .subscribe();
  }

  function updateBadge() {
    if (!badge) return;
    if (notificationsUnreadCount > 0) {
      badge.style.display = 'inline';
      badge.textContent = notificationsUnreadCount;
    } else {
      badge.style.display = 'none';
    }
  }

  function renderNotifications() {
    if (!listEl) return;
    if (notificationsList.length === 0) {
      listEl.innerHTML = '<div class="notification-item">Нет уведомлений</div>';
      return;
    }
    listEl.innerHTML = notificationsList.map(n => {
      const date = n.created_at
        ? new Date(n.created_at).toLocaleString('ru-RU')
        : '';
      const icon = TYPE_ICONS[n.type] || '🔔';
      const shortMsg = n.message && n.message.length > 60
        ? n.message.substring(0, 60) + '...'
        : (n.message || '');
      return `<div class="notification-item ${n.is_read ? 'read' : 'unread'}" data-id="${n.id}">
        <span class="notif-icon">${icon}</span>
        <span class="notif-message">${shortMsg}</span>
        <small class="notif-date">${date}</small>
      </div>`;
    }).join('');

    listEl.querySelectorAll('.notification-item').forEach(item => {
      item.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = item.dataset.id;
        const notification = notificationsList.find(n => n.id === id);
        if (notification) {
          if (!notification.is_read) {
            const currentUser = getCurrentUser();
            if (currentUser && currentUser.id) {
              await supabase
                .from('user_notifications')
                .update({ is_read: true })
                .eq('id', id);
            }
          }
          openNotifModal(notification);
        }
      });
    });
  }

  async function markAllRead() {
    const currentUser = getCurrentUser();
    if (!currentUser || !currentUser.id) return;
    const uid = currentUser.id;
    await supabase
      .from('user_notifications')
      .update({ is_read: true })
      .eq('user_id', uid)
      .eq('is_read', false);
  }
}

// Универсальная функция добавления уведомления с типом и ссылкой
async function addNotification(userId, message, type = 'system', link = '') {
  if (!userId) return;
  try {
    const { error } = await supabase
      .from('user_notifications')
      .insert([{
        user_id: userId,
        message,
        type,
        link,
        is_read: false
      }]);
    if (error) console.error('Ошибка добавления уведомления:', error);
  } catch (error) {
    console.error('Ошибка добавления уведомления:', error);
  }
}

// Уведомление о пополнении/списании локоинов
async function addLokoinNotification(userId, amount, comment = '') {
  if (!userId || amount === 0) return;

  // Получаем баланс пользователя из Supabase
  const { data: userData, error } = await supabase
    .from('users')
    .select('data')
    .eq('id', userId)
    .single();
  if (error || !userData) return;

  const userInfo = userData.data || {};
  const balance = userInfo.lokoin_balance || 0;
  const absAmount = Math.abs(amount);
  const plural = pluralizeLokoin(absAmount);
  const balancePlural = pluralizeLokoin(balance);
  let message;
  if (amount > 0) {
    message = `Баланс пополнен на ${absAmount} локоин${plural}`;
    if (comment) message += ` (${comment})`;
    message += `. Общий баланс: ${balance} локоин${balancePlural}.`;
  } else {
    message = `Баланс уменьшен на ${absAmount} локоин${plural}`;
    if (comment) message += ` (${comment})`;
    message += `. Общий баланс: ${balance} локоин${balancePlural}.`;
  }
  await addNotification(userId, message, 'lokoin', 'profile.html');
}

// Уведомление о покупке товара
async function addPurchaseNotification(userId, itemName, price, newBalance) {
  if (!userId) return;
  const pluralPrice = pluralizeLokoin(price);
  const pluralBalance = pluralizeLokoin(newBalance);
  const message = `Вы приобрели «${itemName}» за ${price} локоин${pluralPrice}. Общий баланс: ${newBalance} локоин${pluralBalance}.`;
  await addNotification(userId, message, 'purchase', 'shop.html');
}

function showBrowserNotification(message) {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    new Notification('КЦ-Игры', { body: message, icon: '/favicon.ico' });
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission().then(perm => {
      if (perm === 'granted') {
        new Notification('КЦ-Игры', { body: message, icon: '/favicon.ico' });
      }
    });
  }
}
