/**
 * Скрипт миграции данных из Firebase Firestore в Supabase
 * 
 * Использование: node migrate.js
 * 
 * Перед запуском убедитесь:
 * 1. Файл .env заполнен ключами Firebase и Supabase
 * 2. SQL-скрипт уже выполнен в Supabase (таблицы созданы)
 * 3. Установлены зависимости: npm install
 */

require('dotenv').config();
const admin = require('firebase-admin');
const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');

// === Инициализация Firebase Admin ===
const serviceAccount = {
  type: 'service_account',
  project_id: process.env.FIREBASE_PROJECT_ID,
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// === Инициализация Supabase ===
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey, {
  realtime: {
    transport: ws
  }
});

// === Статистика миграции ===
const stats = {
  exported: {},
  imported: {},
  errors: []
};

// === Утилиты ===

/**
 * Конвертирует Firestore Timestamp в ISO string для PostgreSQL
 */
function convertTimestamp(timestamp) {
  if (!timestamp) return null;
  if (timestamp.toDate) {
    return timestamp.toDate().toISOString();
  }
  return timestamp;
}

/**
 * Рекурсивно конвертирует все Timestamp в объекте
 */
function deepConvertTimestamps(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(item => deepConvertTimestamps(item));
  }
  
  const converted = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value && typeof value.toDate === 'function') {
      converted[key] = value.toDate().toISOString();
    } else if (value && typeof value === 'object') {
      converted[key] = deepConvertTimestamps(value);
    } else {
      converted[key] = value;
    }
  }
  return converted;
}

/**
 * Конвертирует camelCase в snake_case для имен полей
 */
function camelToSnake(str) {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

/**
 * Преобразует объект с camelCase ключами в snake_case
 */
function convertKeysToSnakeCase(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(item => convertKeysToSnakeCase(item));
  }
  
  const converted = {};
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = camelToSnake(key);
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      // Проверяем, не является ли объект специальным типом (например, GeoPoint)
      if (value.latitude !== undefined && value.longitude !== undefined) {
        converted[snakeKey] = value; // Оставляем как есть для последующей обработки
      } else {
        converted[snakeKey] = convertKeysToSnakeCase(value);
      }
    } else {
      converted[snakeKey] = value;
    }
  }
  return converted;
}

/**
 * Разбивает массив на батчи
 */
function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

// === Функции экспорта из Firestore ===

/**
 * Экспортирует все документы из коллекции
 */
async function exportCollection(collectionName) {
  console.log(`📥 Экспорт коллекции: ${collectionName}`);
  
  const snapshot = await db.collection(collectionName).get();
  const documents = [];
  
  snapshot.forEach(doc => {
    documents.push({
      id: doc.id,
      data: doc.data()
    });
  });
  
  console.log(`   Найдено документов: ${documents.length}`);
  stats.exported[collectionName] = documents.length;
  
  return documents;
}

/**
 * Экспортирует подколлекции пользователя
 */
async function exportUserSubcollections(userId) {
  const subcollections = {};
  
  // Notifications
  const notificationsSnap = await db.collection('users').doc(userId).collection('notifications').get();
  subcollections.notifications = [];
  notificationsSnap.forEach(doc => {
    subcollections.notifications.push({ id: doc.id, data: doc.data() });
  });
  
  // Awarded
  const awardedSnap = await db.collection('users').doc(userId).collection('awarded').get();
  subcollections.awarded = [];
  awardedSnap.forEach(doc => {
    subcollections.awarded.push({ id: doc.id, data: doc.data() });
  });
  
  return subcollections;
}

/**
 * Экспортирует подколлекции ивента
 */
async function exportEventSubcollections(eventId) {
  const subcollections = {};
  
  // Questions
  const questionsSnap = await db.collection('events').doc(eventId).collection('questions').get();
  subcollections.questions = [];
  questionsSnap.forEach(doc => {
    subcollections.questions.push({ id: doc.id, data: doc.data() });
  });
  
  // Tasks (для бинго)
  const tasksSnap = await db.collection('events').doc(eventId).collection('tasks').get();
  subcollections.tasks = [];
  tasksSnap.forEach(doc => {
    subcollections.tasks.push({ id: doc.id, data: doc.data() });
  });
  
  // Events (админ-события для дерева)
  const eventsSnap = await db.collection('events').doc(eventId).collection('events').get();
  subcollections.adminEvents = [];
  eventsSnap.forEach(doc => {
    subcollections.adminEvents.push({ id: doc.id, data: doc.data() });
  });
  
  // Activity
  const activitySnap = await db.collection('events').doc(eventId).collection('activity').get();
  subcollections.activity = [];
  activitySnap.forEach(doc => {
    subcollections.activity.push({ id: doc.id, data: doc.data() });
  });
  
  return subcollections;
}

/**
 * Экспортирует подколлекции новости
 */
async function exportAnnouncementSubcollections(announcementId) {
  const subcollections = {};
  
  // Reactions
  const reactionsSnap = await db.collection('announcements').doc(announcementId).collection('reactions').get();
  subcollections.reactions = [];
  reactionsSnap.forEach(doc => {
    subcollections.reactions.push({ id: doc.id, data: doc.data() });
  });
  
  return subcollections;
}

/**
 * Экспортирует подколлекции обращения
 */
async function exportFeedbackSubcollections(feedbackId) {
  const subcollections = {};
  
  // Replies
  const repliesSnap = await db.collection('feedback').doc(feedbackId).collection('replies').get();
  subcollections.replies = [];
  repliesSnap.forEach(doc => {
    subcollections.replies.push({ id: doc.id, data: doc.data() });
  });
  
  return subcollections;
}

// === Функции импорта в Supabase ===

/**
 * Импортирует пользователей
 */
async function importUsers(documents) {
  console.log(`📤 Импорт пользователей: ${documents.length}`);
  
  if (documents.length === 0) return;
  
  const batches = chunkArray(documents, 100);
  let importedCount = 0;
  
  for (const batch of batches) {
    const records = batch.map(doc => {
      const data = deepConvertTimestamps(doc.data);
      const converted = convertKeysToSnakeCase(data);
      
      return {
        uid: doc.id,
        ...converted,
        created_at: data.createdAt?.toISOString?.() || converted.created_at,
        last_active: data.lastActive?.toISOString?.() || converted.last_active
      };
    });
    
    const { error } = await supabase
      .from('users')
      .upsert(records, { onConflict: 'uid' });
    
    if (error) {
      console.error(`   ❌ Ошибка импорта пользователей:`, error);
      stats.errors.push({ collection: 'users', error: error.message });
    } else {
      importedCount += records.length;
    }
    
    // Пауза между батчами
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  stats.imported['users'] = importedCount;
  console.log(`   ✅ Импортировано: ${importedCount}`);
}

/**
 * Импортирует уведомления пользователей
 */
async function importUserNotifications(usersData) {
  console.log(`📤 Импорт уведомлений пользователей...`);
  
  let totalImported = 0;
  
  for (const userDoc of usersData) {
    const subcollections = await exportUserSubcollections(userDoc.id);
    
    if (subcollections.notifications.length > 0) {
      const records = subcollections.notifications.map(notif => {
        const data = deepConvertTimestamps(notif.data);
        const converted = convertKeysToSnakeCase(data);
        
        return {
          id: notif.id,
          user_id: userDoc.id,
          ...converted,
          timestamp: data.timestamp?.toISOString?.() || converted.timestamp
        };
      });
      
      const { error } = await supabase
        .from('user_notifications')
        .upsert(records, { onConflict: 'id' });
      
      if (error) {
        console.error(`   ❌ Ошибка импорта уведомлений для ${userDoc.id}:`, error);
      } else {
        totalImported += records.length;
      }
    }
    
    // Небольшая пауза
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  stats.imported['user_notifications'] = totalImported;
  console.log(`   ✅ Импортировано уведомлений: ${totalImported}`);
}

/**
 * Импортирует выданные награды пользователей
 */
async function importUserAwarded(usersData) {
  console.log(`📤 Импорт выданных наград пользователей...`);
  
  let totalImported = 0;
  
  for (const userDoc of usersData) {
    const subcollections = await exportUserSubcollections(userDoc.id);
    
    if (subcollections.awarded.length > 0) {
      const records = subcollections.awarded.map(award => {
        const data = deepConvertTimestamps(award.data);
        const converted = convertKeysToSnakeCase(data);
        
        return {
          id: award.id,
          user_id: userDoc.id,
          ...converted,
          awarded_at: data.awardedAt?.toISOString?.() || converted.awarded_at
        };
      });
      
      const { error } = await supabase
        .from('user_awarded')
        .upsert(records, { onConflict: 'id' });
      
      if (error) {
        console.error(`   ❌ Ошибка импорта наград для ${userDoc.id}:`, error);
      } else {
        totalImported += records.length;
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  stats.imported['user_awarded'] = totalImported;
  console.log(`   ✅ Импортировано наград: ${totalImported}`);
}

/**
 * Импортирует товары магазина
 */
async function importShopItems(documents) {
  console.log(`📤 Импорт товаров магазина: ${documents.length}`);
  
  if (documents.length === 0) return;
  
  const records = documents.map(doc => {
    const data = deepConvertTimestamps(doc.data);
    const converted = convertKeysToSnakeCase(data);
    
    return {
      id: doc.id,
      ...converted
    };
  });
  
  const { error } = await supabase
    .from('shop_items')
    .upsert(records, { onConflict: 'id' });
  
  if (error) {
    console.error(`   ❌ Ошибка импорта товаров:`, error);
    stats.errors.push({ collection: 'shop_items', error: error.message });
  } else {
    stats.imported['shop_items'] = records.length;
    console.log(`   ✅ Импортировано: ${records.length}`);
  }
}

/**
 * Импортирует заявки на покупку
 */
async function importPurchaseRequests(documents) {
  console.log(`📤 Импорт заявок на покупку: ${documents.length}`);
  
  if (documents.length === 0) return;
  
  const records = documents.map(doc => {
    const data = deepConvertTimestamps(doc.data);
    const converted = convertKeysToSnakeCase(data);
    
    return {
      id: doc.id,
      ...converted,
      created_at: data.createdAt?.toISOString?.() || converted.created_at,
      done_at: data.doneAt?.toISOString?.() || converted.done_at
    };
  });
  
  const { error } = await supabase
    .from('purchase_requests')
    .upsert(records, { onConflict: 'id' });
  
  if (error) {
    console.error(`   ❌ Ошибка импорта заявок:`, error);
    stats.errors.push({ collection: 'purchase_requests', error: error.message });
  } else {
    stats.imported['purchase_requests'] = records.length;
    console.log(`   ✅ Импортировано: ${records.length}`);
  }
}

/**
 * Импортирует отделы
 */
async function importDepartments(documents) {
  console.log(`📤 Импорт отделов: ${documents.length}`);
  
  if (documents.length === 0) return;
  
  const records = documents.map(doc => ({
    id: doc.id,
    name: doc.data.name
  }));
  
  const { error } = await supabase
    .from('departments')
    .upsert(records, { onConflict: 'id' });
  
  if (error) {
    console.error(`   ❌ Ошибка импорта отделов:`, error);
    stats.errors.push({ collection: 'departments', error: error.message });
  } else {
    stats.imported['departments'] = records.length;
    console.log(`   ✅ Импортировано: ${records.length}`);
  }
}

/**
 * Импортирует новости
 */
async function importAnnouncements(documents) {
  console.log(`📤 Импорт новостей: ${documents.length}`);
  
  if (documents.length === 0) return;
  
  const records = documents.map(doc => {
    const data = deepConvertTimestamps(doc.data);
    const converted = convertKeysToSnakeCase(data);
    
    return {
      id: doc.id,
      ...converted,
      created_at: data.createdAt?.toISOString?.() || converted.created_at,
      publish_at: data.publishAt?.toISOString?.() || converted.publish_at,
      expire_at: data.expireAt?.toISOString?.() || converted.expire_at
    };
  });
  
  const { error } = await supabase
    .from('announcements')
    .upsert(records, { onConflict: 'id' });
  
  if (error) {
    console.error(`   ❌ Ошибка импорта новостей:`, error);
    stats.errors.push({ collection: 'announcements', error: error.message });
  } else {
    stats.imported['announcements'] = records.length;
    console.log(`   ✅ Импортировано: ${records.length}`);
  }
  
  // Импортируем реакции
  await importAnnouncementReactions(documents);
}

/**
 * Импортирует реакции на новости
 */
async function importAnnouncementReactions(documents) {
  console.log(`📤 Импорт реакций на новости...`);
  
  let totalImported = 0;
  
  for (const doc of documents) {
    const subcollections = await exportAnnouncementSubcollections(doc.id);
    
    if (subcollections.reactions.length > 0) {
      const records = subcollections.reactions.map(reaction => {
        const data = deepConvertTimestamps(reaction.data);
        const converted = convertKeysToSnakeCase(data);
        
        return {
          id: reaction.id,
          announcement_id: doc.id,
          ...converted,
          timestamp: data.timestamp?.toISOString?.() || converted.timestamp
        };
      });
      
      const { error } = await supabase
        .from('announcement_reactions')
        .upsert(records, { onConflict: 'id' });
      
      if (error) {
        console.error(`   ❌ Ошибка импорта реакций для ${doc.id}:`, error);
      } else {
        totalImported += records.length;
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  stats.imported['announcement_reactions'] = totalImported;
  console.log(`   ✅ Импортировано реакций: ${totalImported}`);
}

/**
 * Импортирует каталог игр
 */
async function importGames(documents) {
  console.log(`📤 Импорт каталога игр: ${documents.length}`);
  
  if (documents.length === 0) return;
  
  const records = documents.map(doc => ({
    id: doc.id,
    ...doc.data
  }));
  
  const { error } = await supabase
    .from('games')
    .upsert(records, { onConflict: 'id' });
  
  if (error) {
    console.error(`   ❌ Ошибка импорта игр:`, error);
    stats.errors.push({ collection: 'games', error: error.message });
  } else {
    stats.imported['games'] = records.length;
    console.log(`   ✅ Импортировано: ${records.length}`);
  }
}

/**
 * Импортирует награды
 */
async function importAwards(documents) {
  console.log(`📤 Импорт наград: ${documents.length}`);
  
  if (documents.length === 0) return;
  
  const records = documents.map(doc => {
    const data = deepConvertTimestamps(doc.data);
    const converted = convertKeysToSnakeCase(data);
    
    return {
      id: doc.id,
      ...converted
    };
  });
  
  const { error } = await supabase
    .from('awards')
    .upsert(records, { onConflict: 'id' });
  
  if (error) {
    console.error(`   ❌ Ошибка импорта наград:`, error);
    stats.errors.push({ collection: 'awards', error: error.message });
  } else {
    stats.imported['awards'] = records.length;
    console.log(`   ✅ Импортировано: ${records.length}`);
  }
}

/**
 * Импортирует ивенты
 */
async function importEvents(documents) {
  console.log(`📤 Импорт ивентов: ${documents.length}`);
  
  if (documents.length === 0) return;
  
  const records = documents.map(doc => {
    const data = deepConvertTimestamps(doc.data);
    const converted = convertKeysToSnakeCase(data);
    
    return {
      id: doc.id,
      ...converted,
      start_time: data.startTime?.toISOString?.() || converted.start_time,
      end_time: data.endTime?.toISOString?.() || converted.end_time
    };
  });
  
  const { error } = await supabase
    .from('events')
    .upsert(records, { onConflict: 'id' });
  
  if (error) {
    console.error(`   ❌ Ошибка импорта ивентов:`, error);
    stats.errors.push({ collection: 'events', error: error.message });
  } else {
    stats.imported['events'] = records.length;
    console.log(`   ✅ Импортировано: ${records.length}`);
  }
  
  // Импортируем подколлекции
  await importEventSubcollections(documents);
}

/**
 * Импортирует подколлекции ивентов
 */
async function importEventSubcollections(documents) {
  console.log(`📤 Импорт подколлекций ивентов...`);
  
  let totalQuestions = 0;
  let totalTasks = 0;
  let totalAdminEvents = 0;
  let totalActivity = 0;
  
  for (const doc of documents) {
    const subcollections = await exportEventSubcollections(doc.id);
    
    // Questions
    if (subcollections.questions.length > 0) {
      const records = subcollections.questions.map(q => ({
        id: q.id,
        event_id: doc.id,
        question: q.data.question,
        options: q.data.options,
        correct_index: q.data.correctIndex,
        order: q.data.order
      }));
      
      const { error } = await supabase
        .from('event_questions')
        .upsert(records, { onConflict: 'id' });
      
      if (error) {
        console.error(`   ❌ Ошибка импорта вопросов для ${doc.id}:`, error);
      } else {
        totalQuestions += records.length;
      }
    }
    
    // Tasks
    if (subcollections.tasks.length > 0) {
      const records = subcollections.tasks.map(t => {
        const data = deepConvertTimestamps(t.data);
        return {
          id: t.id,
          event_id: doc.id,
          ...convertKeysToSnakeCase(data)
        };
      });
      
      const { error } = await supabase
        .from('event_tasks')
        .upsert(records, { onConflict: 'id' });
      
      if (error) {
        console.error(`   ❌ Ошибка импорта задач для ${doc.id}:`, error);
      } else {
        totalTasks += records.length;
      }
    }
    
    // Admin Events
    if (subcollections.adminEvents.length > 0) {
      const records = subcollections.adminEvents.map(e => {
        const data = deepConvertTimestamps(e.data);
        return {
          id: e.id,
          event_id: doc.id,
          ...convertKeysToSnakeCase(data),
          timestamp: data.timestamp?.toISOString?.() || convertKeysToSnakeCase(data).timestamp
        };
      });
      
      const { error } = await supabase
        .from('event_admin_events')
        .upsert(records, { onConflict: 'id' });
      
      if (error) {
        console.error(`   ❌ Ошибка импорта админ-событий для ${doc.id}:`, error);
      } else {
        totalAdminEvents += records.length;
      }
    }
    
    // Activity
    if (subcollections.activity.length > 0) {
      const records = subcollections.activity.map(a => {
        const data = deepConvertTimestamps(a.data);
        return {
          id: a.id,
          event_id: doc.id,
          ...convertKeysToSnakeCase(data),
          timestamp: data.timestamp?.toISOString?.() || convertKeysToSnakeCase(data).timestamp
        };
      });
      
      const { error } = await supabase
        .from('event_activity')
        .upsert(records, { onConflict: 'id' });
      
      if (error) {
        console.error(`   ❌ Ошибка импорта активности для ${doc.id}:`, error);
      } else {
        totalActivity += records.length;
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  stats.imported['event_questions'] = totalQuestions;
  stats.imported['event_tasks'] = totalTasks;
  stats.imported['event_admin_events'] = totalAdminEvents;
  stats.imported['event_activity'] = totalActivity;
  
  console.log(`   ✅ Вопросы: ${totalQuestions}, Задачи: ${totalTasks}, Админ-события: ${totalAdminEvents}, Активность: ${totalActivity}`);
}

/**
 * Импортирует настройки
 */
async function importSettings(documents) {
  console.log(`📤 Импорт настроек: ${documents.length}`);
  
  if (documents.length === 0) return;
  
  const records = documents.map(doc => ({
    key: doc.id,
    value: JSON.stringify(doc.data)
  }));
  
  const { error } = await supabase
    .from('settings')
    .upsert(records, { onConflict: 'key' });
  
  if (error) {
    console.error(`   ❌ Ошибка импорта настроек:`, error);
    stats.errors.push({ collection: 'settings', error: error.message });
  } else {
    stats.imported['settings'] = records.length;
    console.log(`   ✅ Импортировано: ${records.length}`);
  }
}

/**
 * Импортирует обращения
 */
async function importFeedback(documents) {
  console.log(`📤 Импорт обращений: ${documents.length}`);
  
  if (documents.length === 0) return;
  
  const records = documents.map(doc => {
    const data = deepConvertTimestamps(doc.data);
    const converted = convertKeysToSnakeCase(data);
    
    return {
      id: doc.id,
      ...converted,
      created_at: data.createdAt?.toISOString?.() || converted.created_at
    };
  });
  
  const { error } = await supabase
    .from('feedback')
    .upsert(records, { onConflict: 'id' });
  
  if (error) {
    console.error(`   ❌ Ошибка импорта обращений:`, error);
    stats.errors.push({ collection: 'feedback', error: error.message });
  } else {
    stats.imported['feedback'] = records.length;
    console.log(`   ✅ Импортировано: ${records.length}`);
  }
  
  // Импортируем ответы
  await importFeedbackReplies(documents);
}

/**
 * Импортирует ответы на обращения
 */
async function importFeedbackReplies(documents) {
  console.log(`📤 Импорт ответов на обращения...`);
  
  let totalImported = 0;
  
  for (const doc of documents) {
    const subcollections = await exportFeedbackSubcollections(doc.id);
    
    if (subcollections.replies.length > 0) {
      const records = subcollections.replies.map(reply => {
        const data = deepConvertTimestamps(reply.data);
        const converted = convertKeysToSnakeCase(data);
        
        return {
          id: reply.id,
          feedback_id: doc.id,
          ...converted,
          timestamp: data.timestamp?.toISOString?.() || converted.timestamp
        };
      });
      
      const { error } = await supabase
        .from('feedback_replies')
        .upsert(records, { onConflict: 'id' });
      
      if (error) {
        console.error(`   ❌ Ошибка импорта ответов для ${doc.id}:`, error);
      } else {
        totalImported += records.length;
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  stats.imported['feedback_replies'] = totalImported;
  console.log(`   ✅ Импортировано ответов: ${totalImported}`);
}

/**
 * Импортирует PvP игры (морской бой)
 */
async function importBattles(documents) {
  console.log(`📤 Импорт игр Морской бой: ${documents.length}`);
  
  if (documents.length === 0) return;
  
  const records = documents.map(doc => {
    const data = deepConvertTimestamps(doc.data);
    const converted = convertKeysToSnakeCase(data);
    
    return {
      id: doc.id,
      ...converted,
      created_at: data.createdAt?.toISOString?.() || converted.created_at
    };
  });
  
  const { error } = await supabase
    .from('battles')
    .upsert(records, { onConflict: 'id' });
  
  if (error) {
    console.error(`   ❌ Ошибка импорта морского боя:`, error);
    stats.errors.push({ collection: 'battles', error: error.message });
  } else {
    stats.imported['battles'] = records.length;
    console.log(`   ✅ Импортировано: ${records.length}`);
  }
}

/**
 * Импортирует PvP игры (крестики-нолики)
 */
async function importTictactoeGames(documents) {
  console.log(`📤 Импорт игр Крестики-нолики: ${documents.length}`);
  
  if (documents.length === 0) return;
  
  const records = documents.map(doc => {
    const data = deepConvertTimestamps(doc.data);
    const converted = convertKeysToSnakeCase(data);
    
    return {
      id: doc.id,
      ...converted,
      created_at: data.createdAt?.toISOString?.() || converted.created_at
    };
  });
  
  const { error } = await supabase
    .from('tictactoe_games')
    .upsert(records, { onConflict: 'id' });
  
  if (error) {
    console.error(`   ❌ Ошибка импорта крестиков-ноликов:`, error);
    stats.errors.push({ collection: 'tictactoe_games', error: error.message });
  } else {
    stats.imported['tictactoe_games'] = records.length;
    console.log(`   ✅ Импортировано: ${records.length}`);
  }
}

/**
 * Импортирует PvP игры (камень-ножницы-бумага)
 */
async function importRpsGames(documents) {
  console.log(`📤 Импорт игр Камень-ножницы-бумага: ${documents.length}`);
  
  if (documents.length === 0) return;
  
  const records = documents.map(doc => {
    const data = deepConvertTimestamps(doc.data);
    const converted = convertKeysToSnakeCase(data);
    
    return {
      id: doc.id,
      ...converted,
      created_at: data.createdAt?.toISOString?.() || converted.created_at
    };
  });
  
  const { error } = await supabase
    .from('rps_games')
    .upsert(records, { onConflict: 'id' });
  
  if (error) {
    console.error(`   ❌ Ошибка импорта RPS:`, error);
    stats.errors.push({ collection: 'rps_games', error: error.message });
  } else {
    stats.imported['rps_games'] = records.length;
    console.log(`   ✅ Импортировано: ${records.length}`);
  }
}

// === Основная функция миграции ===

async function runMigration() {
  console.log('🚀 Запуск миграции данных из Firebase в Supabase\n');
  console.log(`Firebase Project: ${process.env.FIREBASE_PROJECT_ID}`);
  console.log(`Supabase URL: ${process.env.SUPABASE_URL}\n`);
  
  try {
    // 1. Экспорт и импорт пользователей (основная коллекция)
    const usersData = await exportCollection('users');
    await importUsers(usersData);
    
    // 2. Подколлекции пользователей (требуют данные пользователей)
    await importUserNotifications(usersData);
    await importUserAwarded(usersData);
    
    // 3. Статические справочники
    const shopItemsData = await exportCollection('shopItems');
    await importShopItems(shopItemsData);
    
    const departmentsData = await exportCollection('departments');
    await importDepartments(departmentsData);
    
    const awardsData = await exportCollection('awards');
    await importAwards(awardsData);
    
    const gamesData = await exportCollection('games');
    await importGames(gamesData);
    
    // 4. Динамические коллекции
    const purchaseRequestsData = await exportCollection('purchaseRequests');
    await importPurchaseRequests(purchaseRequestsData);
    
    const announcementsData = await exportCollection('announcements');
    await importAnnouncements(announcementsData);
    
    const feedbackData = await exportCollection('feedback');
    await importFeedback(feedbackData);
    
    const eventsData = await exportCollection('events');
    await importEvents(eventsData);
    
    const settingsData = await exportCollection('settings');
    await importSettings(settingsData);
    
    // 5. PvP игры
    const battlesData = await exportCollection('battles');
    await importBattles(battlesData);
    
    const tictactoeData = await exportCollection('tictactoe_games');
    await importTictactoeGames(tictactoeData);
    
    const rpsData = await exportCollection('rps_games');
    await importRpsGames(rpsData);
    
    // Вывод статистики
    console.log('\n========================================');
    console.log('📊 СТАТИСТИКА МИГРАЦИИ');
    console.log('========================================');
    
    console.log('\nЭКСПОРТ ИЗ FIREBASE:');
    for (const [collection, count] of Object.entries(stats.exported)) {
      console.log(`   ${collection}: ${count}`);
    }
    
    console.log('\nИМПОРТ В SUPABASE:');
    for (const [table, count] of Object.entries(stats.imported)) {
      console.log(`   ${table}: ${count}`);
    }
    
    if (stats.errors.length > 0) {
      console.log('\n❌ ОШИБКИ:');
      stats.errors.forEach((err, i) => {
        console.log(`   ${i + 1}. ${err.collection}: ${err.error}`);
      });
    } else {
      console.log('\n✅ Ошибок нет!');
    }
    
    console.log('\n========================================');
    console.log('🎉 Миграция завершена!');
    console.log('========================================\n');
    
  } catch (error) {
    console.error('\n❌ КРИТИЧЕСКАЯ ОШИБКА:', error);
    process.exit(1);
  }
}

// Запуск
runMigration();
