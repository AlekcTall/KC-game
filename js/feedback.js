// js/feedback.js

let feedbackModal = null;

function initFeedback() {
  const fab = document.createElement('button');
  fab.className = 'feedback-fab';
  fab.innerHTML = '💬';
  fab.title = 'Обратная связь';
  fab.addEventListener('click', openFeedbackModal);
  document.body.appendChild(fab);

  const modal = document.createElement('div');
  modal.className = 'feedback-modal-overlay';
  modal.style.display = 'none';
  modal.innerHTML = `
    <div class="feedback-modal">
      <div class="feedback-modal-header">
        <h3>Обратная связь</h3>
        <button class="feedback-modal-close" id="feedback-close-btn">✖</button>
      </div>
      <form id="feedback-form">
        <div class="form-group">
          <label for="fb-name">Ваше имя</label>
          <input type="text" id="fb-name" placeholder="Необязательно">
        </div>
        <div class="form-group">
          <label for="fb-topic">Тема</label>
          <input type="text" id="fb-topic" required placeholder="Предложение, ошибка...">
        </div>
        <div class="form-group">
          <label for="fb-message">Сообщение</label>
          <textarea id="fb-message" rows="4" required placeholder="Опишите идею или проблему"></textarea>
        </div>
        <button type="submit" class="btn" id="feedback-submit-btn">Отправить</button>
      </form>
      <p id="feedback-message" class="auth-message"></p>
    </div>
  `;
  document.body.appendChild(modal);
  feedbackModal = modal;

  document.getElementById('feedback-close-btn').addEventListener('click', closeFeedbackModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeFeedbackModal();
  });

  document.getElementById('feedback-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('fb-name').value.trim();
    const topic = document.getElementById('fb-topic').value.trim();
    const message = document.getElementById('fb-message').value.trim();
    if (!topic || !message) {
      document.getElementById('feedback-message').textContent = 'Заполните тему и сообщение.';
      return;
    }
    const submitBtn = document.getElementById('feedback-submit-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Отправка...';
    try {
      // Добавляем userId, если пользователь авторизован
      const userId = auth.currentUser ? auth.currentUser.uid : null;
      await db.collection('feedback').add({
        name: name || 'Аноним',
        topic,
        message,
        userId: userId || null,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        status: 'new'
      });
      document.getElementById('feedback-message').textContent = '✅ Спасибо! Ваше сообщение отправлено.';
      document.getElementById('feedback-form').reset();
      setTimeout(closeFeedbackModal, 1500);
    } catch (error) {
      console.error('Ошибка отправки:', error);
      document.getElementById('feedback-message').textContent = 'Ошибка отправки. Попробуйте позже.';
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Отправить';
    }
  });
}

function openFeedbackModal() {
  if (feedbackModal) {
    feedbackModal.style.display = 'flex';
    document.getElementById('feedback-message').textContent = '';
  }
}

function closeFeedbackModal() {
  if (feedbackModal) feedbackModal.style.display = 'none';
}
