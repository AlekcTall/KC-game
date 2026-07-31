/**
 * Shop Logic (Supabase Version)
 * Загрузка товаров, покупка, история заявок
 */

let shopItems = [];
let currentUser = null;

// Инициализация магазина
document.addEventListener('DOMContentLoaded', async () => {
  // Ждем инициализации Firebase Auth
  firebase.auth().onAuthStateChanged(async (user) => {
    if (user) {
      currentUser = user;
      await loadShopItems();
      updateUserBalanceUI();
    } else {
      currentUser = null;
      document.getElementById('shop-container').innerHTML = '<p class="text-center">Для покупок необходимо войти в систему.</p>';
    }
  });
});

// 1. Загрузка товаров из Supabase
async function loadShopItems() {
  const container = document.getElementById('shop-container');
  if (!container) return;

  container.innerHTML = '<div class="text-center"><div class="spinner-border" role="status"></div><p>Загрузка товаров...</p></div>';

  try {
    // Чтение из таблицы shop_items
    const { data, error } = await supabase
      .from('shop_items')
      .select('*')
      .order('price', { ascending: true });

    if (error) throw error;

    shopItems = data || [];
    renderShop(shopItems);

  } catch (err) {
    console.error('Ошибка загрузки товаров:', err);
    container.innerHTML = `<div class="alert alert-danger">Не удалось загрузить товары: ${err.message}</div>`;
  }
}

// 2. Отрисовка товаров
function renderShop(items) {
  const container = document.getElementById('shop-container');
  if (!container) return;

  if (items.length === 0) {
    container.innerHTML = '<p class="text-center">Товары пока не доступны.</p>';
    return;
  }

  let html = '<div class="row g-4">';
  
  items.forEach(item => {
    // Безопасное получение данных из JSONB или прямых колонок
    const name = item.name || item.data?.name || 'Без названия';
    const price = item.price || 0;
    const icon = item.icon || '📦';
    const desc = item.description || '';
    const category = item.category || 'other';
    
    // Проверка: есть ли товар у пользователя (опционально, если храним в profile)
    // const isOwned = currentUser && userPurchasedItems.includes(item.id);

    html += `
      <div class="col-md-4 col-lg-3">
        <div class="card h-100 shadow-sm shop-item-card" data-id="${item.id}">
          <div class="card-body text-center d-flex flex-column">
            <div class="display-4 mb-3">${icon}</div>
            <h5 class="card-title">${name}</h5>
            <p class="card-text text-muted small flex-grow-1">${desc}</p>
            <div class="mt-auto">
              <div class="h4 text-primary mb-2">${price} <small class="fs-6">баллов</small></div>
              <button class="btn btn-success w-100" onclick="buyItem('${item.id}', '${name}', ${price})" id="btn-${item.id}">
                Купить
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  });

  html += '</div>';
  container.innerHTML = html;
}

// 3. Покупка товара
async function buyItem(itemId, itemName, itemPrice) {
  if (!currentUser) {
    alert('Сначала войдите в систему!');
    return;
  }

  const btn = document.getElementById(`btn-${itemId}`);
  if (btn) btn.disabled = true;

  try {
    // А. Проверка баланса пользователя в реальном времени
    const { data: userData, error: fetchError } = await supabase
      .from('users')
      .select('points, lokoin_balance')
      .eq('id', currentUser.uid)
      .single();

    if (fetchError) throw fetchError;

    const currentPoints = userData.points || 0;
    
    if (currentPoints < itemPrice) {
      alert(`Недостаточно баллов! У вас: ${currentPoints}, нужно: ${itemPrice}`);
      if (btn) btn.disabled = false;
      return;
    }

    // Б. Создание заявки на покупку (purchase_requests)
    // Статус 'pending' ждет подтверждения админа
    const { error: insertError } = await supabase
      .from('purchase_requests')
      .insert([{
        user_id: currentUser.uid,
        item_id: itemId,
        item_name: itemName,
        price: itemPrice,
        status: 'pending',
        created_at: new Date().toISOString()
      }]);

    if (insertError) throw insertError;

    // В. Успех
    alert(`Заявка на покупку "${itemName}" создана! Ожидайте подтверждения администратора.`);
    
    // Опционально: можно сразу списать баллы, если политика магазина позволяет без одобрения
    // Но обычно в таких системах сначала создается заявка.
    
    if (btn) {
      btn.textContent = 'Заявка отправлена';
      btn.classList.remove('btn-success');
      btn.classList.add('btn-secondary');
    }

  } catch (err) {
    console.error('Ошибка при покупке:', err);
    alert('Произошла ошибка при покупке: ' + err.message);
    if (btn) btn.disabled = false;
  }
}

// 4. Обновление отображения баланса (вызывается из auth.js или здесь)
async function updateUserBalanceUI() {
  if (!currentUser) return;

  try {
    const { data, error } = await supabase
      .from('users')
      .select('points, lokoin_balance')
      .eq('id', currentUser.uid)
      .single();

    if (error) throw error;

    // Обновляем элементы в шапке или профиле
    const pointsEl = document.getElementById('user-points');
    const lokoinEl = document.getElementById('user-lokoins');

    if (pointsEl) pointsEl.textContent = data.points || 0;
    if (lokoinEl) lokoinEl.textContent = data.lokoin_balance || 0;

  } catch (err) {
    console.error('Не удалось обновить баланс:', err);
  }
}
