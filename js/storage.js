// js/storage.js

// ================== ТЕКУЩИЙ ПОЛЬЗОВАТЕЛЬ (кеш) ==================
function getCurrentUser() {
  const data = localStorage.getItem('krugames_currentUser');
  return data ? JSON.parse(data) : null;
}

function setCurrentUser(user) {
  if (user) {
    localStorage.setItem('krugames_currentUser', JSON.stringify(user));
  } else {
    localStorage.removeItem('krugames_currentUser');
  }
}
