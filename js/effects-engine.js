// js/effects-engine.js

// Карта обработчиков эффектов
const EFFECT_HANDLERS = {
  dark_theme: {
    displayName: '🌙 Тёмная тема',
    handler: async (userId, params) => {
      const { data: row } = await supabase.from('users').select('data').eq('id', userId).single();
      const newData = { ...(row?.data || {}), activeTheme: 'dark' };
      await supabase.from('users').update({ data: newData }).eq('id', userId);
      document.body.classList.add('dark-theme');
      return true;
    }
  },
  gold_frame: {
    displayName: '🖼️ Золотая рамка',
    handler: async (userId, params) => {
      const { data: row } = await supabase.from('users').select('data').eq('id', userId).single();
      const purchased = Array.isArray(row?.data?.purchasedItems) ? row.data.purchasedItems : [];
      purchased.push('gold_frame');
      const newData = { ...(row?.data || {}), purchasedItems: purchased };
      await supabase.from('users').update({ data: newData }).eq('id', userId);
      return true;
    }
  },
  animated_avatar: {
    displayName: '✨ Анимированный аватар',
    handler: async (userId, params) => {
      const { data: row } = await supabase.from('users').select('data').eq('id', userId).single();
      const purchased = Array.isArray(row?.data?.purchasedItems) ? row.data.purchasedItems : [];
      purchased.push('animated_avatar');
      const newData = { ...(row?.data || {}), purchasedItems: purchased };
      await supabase.from('users').update({ data: newData }).eq('id', userId);
      return true;
    }
  },
  custom_status: {
    displayName: '💬 Кастомный статус',
    handler: async (userId, params) => {
      const { data: row } = await supabase.from('users').select('data').eq('id', userId).single();
      const purchased = Array.isArray(row?.data?.purchasedItems) ? row.data.purchasedItems : [];
      purchased.push('custom_status');
      const newData = { ...(row?.data || {}), purchasedItems: purchased };
      await supabase.from('users').update({ data: newData }).eq('id', userId);
      return true;
    }
  },
  custom_avatar: {
    displayName: '🐱 Кастомный аватар',
    handler: async (userId, params) => {
      const emoji = params.avatar || '🐱';
      const { data: row } = await supabase.from('users').select('data').eq('id', userId).single();
      const userData = row?.data || {};
      const ownedAvatars = Array.isArray(userData.ownedAvatars) ? userData.ownedAvatars : [];
      if (!ownedAvatars.includes(emoji)) {
        ownedAvatars.push(emoji);
      }
      const newData = { ...userData, ownedAvatars: ownedAvatars };
      if (!userData.avatarEmoji) newData.avatarEmoji = emoji;
      await supabase.from('users').update({ data: newData }).eq('id', userId);
      return true;
    }
  },
  double_xp: {
    displayName: '⚡ Двойной опыт',
    handler: async (userId, params) => {
      const durationHours = params.duration || 1;
      const { data: row } = await supabase.from('users').select('data').eq('id', userId).single();
      const userData = row?.data || {};
      const effects = userData.activeEffects || {};
      effects['double_xp'] = { activatedAt: Date.now(), durationHours };
      const newData = { ...userData, activeEffects: effects };
      await supabase.from('users').update({ data: newData }).eq('id', userId);
      return true;
    }
  },
  fast_cooldown: {
    displayName: '⏱️ Ускорение кулдауна',
    handler: async (userId, params) => {
      const durationHours = params.duration || 24;
      const { data: row } = await supabase.from('users').select('data').eq('id', userId).single();
      const userData = row?.data || {};
      const effects = userData.activeEffects || {};
      effects['fast_cooldown'] = { activatedAt: Date.now(), durationHours };
      const newData = { ...userData, activeEffects: effects };
      await supabase.from('users').update({ data: newData }).eq('id', userId);
      return true;
    }
  },
  star_rating: {
    displayName: '⭐ Звезда в рейтинге',
    handler: async (userId, params) => {
      const { data: row } = await supabase.from('users').select('data').eq('id', userId).single();
      const purchased = Array.isArray(row?.data?.purchasedItems) ? row.data.purchasedItems : [];
      purchased.push('star_rating');
      const newData = { ...(row?.data || {}), purchasedItems: purchased };
      await supabase.from('users').update({ data: newData }).eq('id', userId);
      return true;
    }
  },
  double_reactions: {
    displayName: '💯 Двойная реакция',
    handler: async (userId, params) => {
      const { data: row } = await supabase.from('users').select('data').eq('id', userId).single();
      const purchased = Array.isArray(row?.data?.purchasedItems) ? row.data.purchasedItems : [];
      purchased.push('double_reactions');
      const newData = { ...(row?.data || {}), purchasedItems: purchased };
      await supabase.from('users').update({ data: newData }).eq('id', userId);
      return true;
    }
  },
  special_reactions: {
    displayName: '🚀 Особые реакции',
    handler: async (userId, params) => {
      const { data: row } = await supabase.from('users').select('data').eq('id', userId).single();
      const purchased = Array.isArray(row?.data?.purchasedItems) ? row.data.purchasedItems : [];
      purchased.push('special_reactions');
      const newData = { ...(row?.data || {}), purchasedItems: purchased };
      await supabase.from('users').update({ data: newData }).eq('id', userId);
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
  const effectType = item.effect_type || item.effect;
  if (!effectType) return false;

  const entry = EFFECT_HANDLERS[effectType];
  if (!entry) {
    console.error('Неизвестный тип эффекта:', effectType);
    return false;
  }

  try {
    const params = {
      ...(item.effect_params || {}),
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
