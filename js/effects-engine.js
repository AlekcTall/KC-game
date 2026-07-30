// js/effects-engine.js

// Карта обработчиков эффектов
const EFFECT_HANDLERS = {
  dark_theme: {
    displayName: '🌙 Тёмная тема',
    handler: async (userId, params) => {
      await db.collection('users').doc(userId).update({ activeTheme: 'dark' });
      document.body.classList.add('dark-theme');
      return true;
    }
  },
  gold_frame: {
    displayName: '🖼️ Золотая рамка',
    handler: async (userId, params) => {
      await db.collection('users').doc(userId).update({
        purchasedItems: firebase.firestore.FieldValue.arrayUnion('gold_frame')
      });
      return true;
    }
  },
  animated_avatar: {
    displayName: '✨ Анимированный аватар',
    handler: async (userId, params) => {
      await db.collection('users').doc(userId).update({
        purchasedItems: firebase.firestore.FieldValue.arrayUnion('animated_avatar')
      });
      return true;
    }
  },
  custom_status: {
    displayName: '💬 Кастомный статус',
    handler: async (userId, params) => {
      await db.collection('users').doc(userId).update({
        purchasedItems: firebase.firestore.FieldValue.arrayUnion('custom_status')
      });
      return true;
    }
  },
  custom_avatar: {
    displayName: '🐱 Кастомный аватар',
    handler: async (userId, params) => {
      const emoji = params.avatar || '🐱';
      const userRef = db.collection('users').doc(userId);
      const doc = await userRef.get();
      const userData = doc.data() || {};
      const ownedAvatars = userData.ownedAvatars || [];
      if (!ownedAvatars.includes(emoji)) {
        ownedAvatars.push(emoji);
        const updateData = { ownedAvatars };
        if (!userData.avatarEmoji) updateData.avatarEmoji = emoji;
        await userRef.update(updateData);
      } else {
        await userRef.update({ ownedAvatars });
      }
      return true;
    }
  },
  double_xp: {
    displayName: '⚡ Двойной опыт',
    handler: async (userId, params) => {
      const durationHours = params.duration || 1;
      const userRef = db.collection('users').doc(userId);
      const doc = await userRef.get();
      const effects = doc.data().activeEffects || {};
      effects['double_xp'] = {
        activatedAt: Date.now(),
        durationHours
      };
      await userRef.update({ activeEffects: effects });
      return true;
    }
  },
  fast_cooldown: {
    displayName: '⏱️ Ускорение кулдауна',
    handler: async (userId, params) => {
      const durationHours = params.duration || 24;
      const userRef = db.collection('users').doc(userId);
      const doc = await userRef.get();
      const effects = doc.data().activeEffects || {};
      effects['fast_cooldown'] = {
        activatedAt: Date.now(),
        durationHours
      };
      await userRef.update({ activeEffects: effects });
      return true;
    }
  },
  star_rating: {
    displayName: '⭐ Звезда в рейтинге',
    handler: async (userId, params) => {
      await db.collection('users').doc(userId).update({
        purchasedItems: firebase.firestore.FieldValue.arrayUnion('star_rating')
      });
      return true;
    }
  },
  double_reactions: {
    displayName: '💯 Двойная реакция',
    handler: async (userId, params) => {
      await db.collection('users').doc(userId).update({
        purchasedItems: firebase.firestore.FieldValue.arrayUnion('double_reactions')
      });
      return true;
    }
  },
  special_reactions: {
    displayName: '🚀 Особые реакции',
    handler: async (userId, params) => {
      await db.collection('users').doc(userId).update({
        purchasedItems: firebase.firestore.FieldValue.arrayUnion('special_reactions')
      });
      return true;
    }
  },
  coffee_boss: {
    displayName: '☕ Кофе с руководителем',
    handler: async (userId, params) => { return true; }
  },
  gift_certificate: {
    displayName: '🎖️ Именная награда',
    handler: async (userId, params) => { return true; }
  },
  extra_break: {
    displayName: '☕ Дополнительный перерыв',
    handler: async (userId, params) => { return true; }
  },
  priority_vacation: {
    displayName: '🏖️ Приоритет отпуска',
    handler: async (userId, params) => { return true; }
  },
  quality_10: {
    displayName: '💯 +10 к оценке',
    handler: async (userId, params) => { return true; }
  },
  short_shift: {
    displayName: '⏰ Сокращённая смена',
    handler: async (userId, params) => { return true; }
  }
};

// Универсальная функция применения эффекта товара
async function applyItemEffect(userId, item) {
  const effectType = item.effectType || item.effect;
  if (!effectType) return false;

  const entry = EFFECT_HANDLERS[effectType];
  if (!entry) {
    console.error('Неизвестный тип эффекта:', effectType);
    return false;
  }

  try {
    const params = {
      ...(item.effectParams || {}),
      duration: item.duration || 0
    };
    await entry.handler(userId, params);
    return true;
  } catch (e) {
    console.error('Ошибка применения эффекта:', e);
    return false;
  }
}

// Получить список доступных типов эффектов (для админки)
function getAvailableEffectTypes() {
  return Object.keys(EFFECT_HANDLERS).map(key => ({
    id: key,
    name: EFFECT_HANDLERS[key].displayName || key
  }));
}

// Получить человекочитаемое название эффекта по ключу
function getEffectDisplayName(effectId) {
  return EFFECT_HANDLERS[effectId]?.displayName || effectId;
}
