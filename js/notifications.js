// js/notifications.js

let notificationsUnreadCount = 0;
let notificationsList = [];
let notificationsListener = null;
let notificationDropdown = null;

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
  const date = notification.timestamp ? new Date(notification.timestamp.seconds * 1000).toLocaleString('ru-RU') : '';
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
    if (!currentUser || !currentUser.uid) return;
    const notifRef = db.collection('users').doc(currentUser.uid).collection('notifications');
    const snapshot = await notifRef.get();
    const batch = db.batch();
    snapshot.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
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

  if (typeof auth !== 'undefined') {
    auth.onAuthStateChanged((user) => {
      if (user) {
        if (notificationsListener) notificationsListener();
        notificationsListener = db.collection('users').doc(user.uid)
          .collection('notifications')
          .orderBy('timestamp', 'desc')
          .limit(20)
          .onSnapshot(snapshot => {
            notificationsList = [];
            notificationsUnreadCount = 0;
            snapshot.forEach(doc => {
              const data = doc.data();
              notificationsList.push({ id: doc.id, ...data });
              if (!data.read) notificationsUnreadCount++;
            });
            updateBadge();
            renderNotifications();
            const last = notificationsList[0];
            if (last && !last.read && last.timestamp) {
              showBrowserNotification(last.message || 'Новое уведомление');
            }
          });
      } else {
        if (notificationsListener) {
          notificationsListener();
          notificationsListener = null;
        }
        notificationsList = [];
        notificationsUnreadCount = 0;
        updateBadge();
        renderNotifications();
      }
    });
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
      const date = n.timestamp ? new Date(n.timestamp.seconds * 1000).toLocaleString('ru-RU') : '';
      const icon = TYPE_ICONS[n.type] || '🔔';
      const shortMsg = n.message && n.message.length > 60 ? n.message.substring(0, 60) + '...' : (n.message || '');
      return `<div class="notification-item ${n.read ? 'read' : 'unread'}" data-id="${n.id}">
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
          // Отмечаем прочитанным
          if (!notification.read) {
            const currentUser = getCurrentUser();
            if (currentUser && currentUser.uid) {
              await db.collection('users').doc(currentUser.uid)
                .collection('notifications').doc(id).update({ read: true });
            }
          }
          openNotifModal(notification);
        }
      });
    });
  }

  async function markAllRead() {
    const currentUser = getCurrentUser();
    if (!currentUser || !currentUser.uid) return;
    const notifRef = db.collection('users').doc(currentUser.uid).collection('notifications');
    const snapshot = await notifRef.where('read', '==', false).get();
    const batch = db.batch();
    snapshot.forEach(doc => batch.update(doc.ref, { read: true }));
    await batch.commit();
  }
}

// Универсальная функция добавления уведомления с типом и ссылкой
async function addNotification(userId, message, type = 'system', link = '') {
  if (!userId) return;
  try {
    await db.collection('users').doc(userId).collection('notifications').add({
      message,
      type,
      link,
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      read: false
    });
  } catch (error) {
    console.error('Ошибка добавления уведомления:', error);
  }
}

// Уведомление о пополнении/списании локоинов
async function addLokoinNotification(userId, amount, comment = '') {
  if (!userId || amount === 0) return;
  const userDoc = await db.collection('users').doc(userId).get();
  if (!userDoc.exists) return;
  const balance = userDoc.data().lokoin_balance || 0;
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
