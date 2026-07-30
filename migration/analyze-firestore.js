/**
 * Скрипт для анализа структуры данных в Firestore
 */

require('dotenv').config();
const admin = require('firebase-admin');

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

async function analyzeCollection(collectionName, limit = 1) {
  console.log(`\n📊 АНАЛИЗ КОЛЛЕКЦИИ: ${collectionName}`);
  console.log('=' .repeat(50));
  
  const snapshot = await db.collection(collectionName).limit(limit).get();
  
  if (snapshot.empty) {
    console.log('   Коллекция пуста');
    return;
  }
  
  snapshot.forEach(doc => {
    console.log(`\nДокумент ID: ${doc.id}`);
    console.log('Поля:');
    
    const data = doc.data();
    for (const [key, value] of Object.entries(data)) {
      let valueType = typeof value;
      if (value && typeof value.toDate === 'function') {
        valueType = 'Timestamp';
      } else if (Array.isArray(value)) {
        valueType = `Array[${value.length}]`;
      } else if (value && typeof value === 'object') {
        valueType = `Object{${Object.keys(value).length} keys}`;
      }
      
      console.log(`   - ${key}: ${valueType}`);
    }
    
    // Выводим полный JSON для первого документа
    if (limit === 1) {
      console.log('\nПолная структура (JSON):');
      console.log(JSON.stringify(data, null, 2));
    }
  });
}

async function main() {
  console.log('🔍 АНАЛИЗ СТРУКТУРЫ FIRESTORE\n');
  
  const collections = [
    'users',
    'shopItems',
    'departments',
    'awards',
    'games',
    'purchaseRequests',
    'announcements',
    'feedback',
    'events',
    'settings',
    'battles',
    'tictactoe_games',
    'rps_games'
  ];
  
  for (const col of collections) {
    await analyzeCollection(col, 1);
  }
  
  // Анализ подколлекций
  console.log('\n\n🔍 АНАЛИЗ ПОДКОЛЛЕКЦИЙ\n');
  
  // Пользователи
  const usersSnap = await db.collection('users').limit(1).get();
  if (!usersSnap.empty) {
    const userId = usersSnap.docs[0].id;
    console.log(`\n📁 users/${userId}/notifications`);
    const notifs = await db.collection('users').doc(userId).collection('notifications').limit(1).get();
    notifs.forEach(doc => {
      console.log(`   Поля: ${Object.keys(doc.data()).join(', ')}`);
    });
    
    console.log(`\n📁 users/${userId}/awarded`);
    const awarded = await db.collection('users').doc(userId).collection('awarded').limit(1).get();
    awarded.forEach(doc => {
      console.log(`   Поля: ${Object.keys(doc.data()).join(', ')}`);
    });
  }
  
  // Ивенты
  const eventsSnap = await db.collection('events').limit(1).get();
  if (!eventsSnap.empty) {
    const eventId = eventsSnap.docs[0].id;
    console.log(`\n📁 events/${eventId}/questions`);
    const questions = await db.collection('events').doc(eventId).collection('questions').limit(1).get();
    questions.forEach(doc => {
      console.log(`   Поля: ${Object.keys(doc.data()).join(', ')}`);
    });
    
    console.log(`\n📁 events/${eventId}/activity`);
    const activity = await db.collection('events').doc(eventId).collection('activity').limit(1).get();
    activity.forEach(doc => {
      console.log(`   Поля: ${Object.keys(doc.data()).join(', ')}`);
    });
    
    console.log(`\n📁 events/${eventId}/events`);
    const adminEvents = await db.collection('events').doc(eventId).collection('events').limit(1).get();
    adminEvents.forEach(doc => {
      console.log(`   Поля: ${Object.keys(doc.data()).join(', ')}`);
    });
  }
  
  // Новости
  const announcementsSnap = await db.collection('announcements').limit(1).get();
  if (!announcementsSnap.empty) {
    const newsId = announcementsSnap.docs[0].id;
    console.log(`\n📁 announcements/${newsId}/reactions`);
    const reactions = await db.collection('announcements').doc(newsId).collection('reactions').limit(1).get();
    reactions.forEach(doc => {
      console.log(`   Поля: ${Object.keys(doc.data()).join(', ')}`);
    });
  }
  
  // Feedback
  const feedbackSnap = await db.collection('feedback').limit(1).get();
  if (!feedbackSnap.empty) {
    const fbId = feedbackSnap.docs[0].id;
    console.log(`\n📁 feedback/${fbId}/replies`);
    const replies = await db.collection('feedback').doc(fbId).collection('replies').limit(1).get();
    replies.forEach(doc => {
      console.log(`   Поля: ${Object.keys(doc.data()).join(', ')}`);
    });
  }
  
  console.log('\n✅ Анализ завершен\n');
}

main().catch(console.error);
