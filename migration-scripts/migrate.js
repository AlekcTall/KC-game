/**
 * MIGRATION SCRIPT: Firestore -> Supabase
 * 
 * Инструкция:
 * 1. Убедитесь, что файлы .env и firebase-service-account.json (если используется) настроены.
 * 2. Запустите: node migrate.js
 * 
 * Примечание: Скрипт использует SERVICE_ROLE ключ Supabase, поэтому обходит RLS.
 * Убедитесь, что никто не пишет в базу во время миграции (режим maintenance).
 */

require('dotenv').config();
const admin = require('firebase-admin');
const { createClient } = require('@supabase/supabase-js');

// --- КОНФИГУРАЦИЯ FIREBASE ---
const serviceAccount = {
  type: "service_account",
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: "ea4671fcb6dc57bf8797b615854592db4657c2b4",
  private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: "107295273166450262394",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_CLIENT_EMAIL}`
};

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}
const db = admin.firestore();

// --- КОНФИГУРАЦИЯ SUPABASE ---
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Ошибка: Не указаны SUPABASE_URL или SUPABASE_SERVICE_ROLE_KEY в .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// --- УТИЛИТЫ ---

// Конвертация типов Firestore в стандартные JS типы
function convertValue(value) {
  if (value === null || value === undefined) return null;
  
  // Timestamp -> ISO String
  if (value instanceof admin.firestore.Timestamp) {
    return value.toDate().toISOString();
  }
  
  // DocumentReference -> ID
  if (value instanceof admin.firestore.DocumentReference) {
    return value.id;
  }
  
  // GeoPoint -> { latitude, longitude }
  if (value instanceof admin.firestore.GeoPoint) {
    return { latitude: value.latitude, longitude: value.longitude };
  }
  
  // Blob -> Base64 (если нужно, иначе null)
  if (value instanceof admin.firestore.Blob) {
    console.warn('⚠️ Обнаружен Blob, конвертация в base64 может быть тяжелой. Пропускаем или обрабатываем отдельно.');
    return null; 
  }

  // Рекурсивная обработка массивов и объектов
  if (Array.isArray(value)) {
    return value.map(convertValue);
  }
  
  if (typeof value === 'object') {
    const newObj = {};
    for (const key in value) {
      newObj[key] = convertValue(value[key]);
    }
    return newObj;
  }
  
  return value;
}

// Преобразование документа Firestore в формат для Supabase
function prepareDocument(doc, collectionName) {
  const data = doc.data();
  const convertedData = convertValue(data);
  
  const id = doc.id;
  let record = { id };
  
  if (collectionName === 'users') {
    record.email = convertedData.email || null;
    record.data = convertedData;
  } 
  else if (collectionName === 'settings') {
    record.key = id;
    record.value = convertedData;
  }
  else if (collectionName === 'shopItems' || collectionName === 'departments' || collectionName === 'games' || collectionName === 'awards') {
    record.data = convertedData;
    
    if (collectionName === 'shopItems') {
        record.name = convertedData.name;
        record.price = convertedData.price;
        record.category = convertedData.category;
        record.icon = convertedData.icon;
    }
    if (collectionName === 'departments') {
        record.name = convertedData.name;
    }
    if (collectionName === 'games') {
        record.title = convertedData.title;
        record.url = convertedData.url;
        record.hidden = convertedData.hidden || false;
    }
    if (collectionName === 'awards') {
        record.name = convertedData.name;
        record.lokoin_reward = convertedData.lokoinReward;
    }
  }
  else if (collectionName === 'announcements') {
      record.title = convertedData.title;
      record.content = convertedData.content;
      record.author_id = convertedData.authorId;
      record.publish_at = convertedData.publishAt;
      record.expire_at = convertedData.expireAt;
      record.data = convertedData;
  }
  else if (collectionName === 'events') {
      record.title = convertedData.title;
      record.type = convertedData.type;
      record.status = convertedData.status;
      record.start_time = convertedData.startTime;
      record.end_time = convertedData.endTime;
      record.health = convertedData.health;
      record.data = convertedData;
  }
  else if (collectionName === 'battles' || collectionName === 'tictactoe_games' || collectionName === 'rps_games') {
      record.status = convertedData.status;
      record.winner = convertedData.winner;
      if (convertedData.turn) record.turn = convertedData.turn;
      record.data = convertedData;
  }
  else {
    record.data = convertedData;
    if (convertedData.userId) record.user_id = convertedData.userId;
    if (convertedData.eventId) record.event_id = convertedData.eventId;
  }

  return record;
}

// Функция для батчевой вставки в Supabase
async function insertBatch(table, records) {
  if (records.length === 0) return;
  
  const batchSize = 100;
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    
    let query = supabase.from(table).insert(batch);
    
    if (table === 'settings') {
      query = query.onConflict('key'); 
    } else {
      query = query.onConflict('id');
    }

    const { data, error } = await query.select();
    
    if (error) {
      console.error(`❌ Ошибка вставки в ${table} (пакет ${i}-${i+batchSize}):`, error.message);
    } else {
      console.log(`✅ Вставлено ${batch.length} записей в ${table}`);
    }
  }
}

// --- ОСНОВНАЯ ЛОГИКА МИГРАЦИИ ---

async function migrateCollection(collectionName, tableName) {
  console.log(`\n🚀 Начало миграции коллекции: ${collectionName} -> ${tableName}`);
  
  const query = db.collection(collectionName);
  const snapshot = await query.get();
  
  if (snapshot.empty) {
    console.log(`⚪ Коллекция ${collectionName} пуста.`);
    return;
  }

  console.log(`📦 Найдено документов: ${snapshot.size}`);
  
  const records = [];
  snapshot.forEach(doc => {
    try {
      const record = prepareDocument(doc, collectionName);
      records.push(record);
    } catch (err) {
      console.error(`❌ Ошибка обработки документа ${doc.id}:`, err);
    }
  });
  
  await insertBatch(tableName, records);
  console.log(`✅ Миграция коллекции ${collectionName} завершена.`);
}

// Специальная функция для подколлекций users/{uid}/notifications
async function migrateUserSubcollections() {
  console.log(`\n🚀 Начало миграции подколлекций пользователей...`);
  
  const usersSnapshot = await db.collection('users').get();
  let processedDocs = 0;
  
  const notificationsBatch = [];
  const awardedBatch = [];
  
  for (const userDoc of usersSnapshot.docs) {
    const userId = userDoc.id;
    
    // Notifications
    const notifSnapshot = await userDoc.ref.collection('notifications').get();
    notifSnapshot.forEach(doc => {
      const data = convertValue(doc.data());
      notificationsBatch.push({
        id: doc.id,
        user_id: userId,
        message: data.message,
        type: data.type,
        link: data.link,
        is_read: data.read || false,
        created_at: data.timestamp,
        data: data
      });
    });
    
    // Awarded
    const awardedSnapshot = await userDoc.ref.collection('awarded').get();
    awardedSnapshot.forEach(doc => {
      const data = convertValue(doc.data());
      awardedBatch.push({
        id: doc.id,
        user_id: userId,
        award_id: data.awardId,
        awarded_at: data.awardedAt,
        comment: data.comment,
        given_by: data.givenBy,
        data: data
      });
    });
    
    processedDocs++;
    if (processedDocs % 50 === 0) {
        console.log(`Обработано пользователей: ${processedDocs}/${usersSnapshot.size}`);
    }
  }
  
  console.log(`📦 Найдено поддокументов: notifications=${notificationsBatch.length}, awarded=${awardedBatch.length}`);
  
  await insertBatch('user_notifications', notificationsBatch);
  await insertBatch('user_awarded', awardedBatch);
  
  console.log(`✅ Миграция подколлекций пользователей завершена.`);
}

// Специальная функция для подколлекций events/{eventId}/...
async function migrateEventSubcollections() {
  console.log(`\n🚀 Начало миграции подколлекций ивентов...`);
  
  const eventsSnapshot = await db.collection('events').get();
  let totalQuestions = 0;
  let totalActivity = 0;
  let totalAdminEvents = 0;
  
  const questionsBatch = [];
  const activityBatch = [];
  const adminEventsBatch = [];
  
  for (const eventDoc of eventsSnapshot.docs) {
    const eventId = eventDoc.id;
    
    // Questions (quiz)
    const qSnapshot = await eventDoc.ref.collection('questions').get();
    qSnapshot.forEach(doc => {
      const data = convertValue(doc.data());
      questionsBatch.push({
        id: doc.id,
        event_id: eventId,
        question: data.question,
        options: data.options,
        correct_index: data.correctIndex,
        order_index: data.order,
        data: data
      });
      totalQuestions++;
    });
    
    // Activity (tree/pixel)
    const actSnapshot = await eventDoc.ref.collection('activity').get();
    actSnapshot.forEach(doc => {
      const data = convertValue(doc.data());
      activityBatch.push({
        id: doc.id,
        event_id: eventId,
        user_id: data.userId,
        username: data.username,
        action_key: data.actionKey,
        health_boost: data.healthBoost,
        points_reward: data.pointsReward,
        cost_lokoin: data.costLokoin,
        created_at: data.timestamp,
        data: data
      });
      totalActivity++;
    });
    
    // Events (admin events for tree)
    const adminEvSnapshot = await eventDoc.ref.collection('events').get();
    adminEvSnapshot.forEach(doc => {
      const data = convertValue(doc.data());
      adminEventsBatch.push({
        id: doc.id,
        event_id: eventId,
        type: data.type,
        name: data.name,
        icon: data.icon,
        health_change: data.healthChange,
        duration: data.duration,
        applied_by: data.appliedBy,
        created_at: data.timestamp,
        data: data
      });
      totalAdminEvents++;
    });
  }
  
  console.log(`📦 Найдено поддокументов: questions=${totalQuestions}, activity=${totalActivity}, admin_events=${totalAdminEvents}`);
  
  await insertBatch('event_questions', questionsBatch);
  await insertBatch('event_activity', activityBatch);
  await insertBatch('event_admin_events', adminEventsBatch);
  
  console.log(`✅ Миграция подколлекций ивентов завершена.`);
}

// Специальная функция для feedback replies
async function migrateFeedbackReplies() {
  console.log(`\n🚀 Начало миграции ответов на обращения...`);
  
  const feedbackSnapshot = await db.collection('feedback').get();
  let totalReplies = 0;
  const repliesBatch = [];
  
  for (const fbDoc of feedbackSnapshot.docs) {
    const feedbackId = fbDoc.id;
    const replySnapshot = await fbDoc.ref.collection('replies').get();
    
    replySnapshot.forEach(doc => {
      const data = convertValue(doc.data());
      repliesBatch.push({
        id: doc.id,
        feedback_id: feedbackId,
        author_id: data.authorId,
        text: data.text,
        is_admin: data.isAdmin || false,
        created_at: data.timestamp,
        data: data
      });
      totalReplies++;
    });
  }
  
  console.log(`📦 Найдено ответов: ${totalReplies}`);
  await insertBatch('feedback_replies', repliesBatch);
  console.log(`✅ Миграция ответов завершена.`);
}

// Специальная функция для announcement reactions
async function migrateAnnouncementReactions() {
  console.log(`\n🚀 Начало миграции реакций на новости...`);
  
  const annSnapshot = await db.collection('announcements').get();
  let totalReactions = 0;
  const reactionsBatch = [];
  
  for (const annDoc of annSnapshot.docs) {
    const annId = annDoc.id;
    const reactSnapshot = await annDoc.ref.collection('reactions').get();
    
    reactSnapshot.forEach(doc => {
      const data = convertValue(doc.data());
      reactionsBatch.push({
        id: doc.id,
        announcement_id: annId,
        user_id: data.userId,
        emoji: data.emoji,
        created_at: data.timestamp,
        data: data
      });
      totalReactions++;
    });
  }
  
  console.log(`📦 Найдено реакций: ${totalReactions}`);
  await insertBatch('announcement_reactions', reactionsBatch);
  console.log(`✅ Миграция реакций завершена.`);
}

// --- ЗАПУСК ---

(async () => {
  console.log('🔥 START MIGRATION PROCESS 🔥');
  console.log('Target Supabase:', supabaseUrl);
  
  try {
    // 1. Основные коллекции
    await migrateCollection('users', 'users');
    await migrateCollection('feedback', 'feedback');
    await migrateCollection('shopItems', 'shop_items');
    await migrateCollection('purchaseRequests', 'purchase_requests');
    await migrateCollection('departments', 'departments');
    await migrateCollection('announcements', 'announcements');
    await migrateCollection('games', 'games');
    await migrateCollection('awards', 'awards');
    await migrateCollection('events', 'events');
    await migrateCollection('battles', 'battles');
    await migrateCollection('tictactoe_games', 'tictactoe_games');
    await migrateCollection('rps_games', 'rps_games');
    await migrateCollection('settings', 'settings');
    
    // 2. Подколлекции
    await migrateUserSubcollections();
    await migrateEventSubcollections();
    await migrateFeedbackReplies();
    await migrateAnnouncementReactions();
    
    console.log('\n🎉 MIGRATION COMPLETED SUCCESSFULLY! 🎉');
    console.log('Проверьте данные в Supabase Table Editor.');
    
  } catch (error) {
    console.error('\n💀 CRITICAL ERROR DURING MIGRATION:', error);
    process.exit(1);
  }
})();
