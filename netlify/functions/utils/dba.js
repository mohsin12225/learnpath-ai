// // netlify/functions/utils/db.js
// const { MongoClient } = require('mongodb');

// let cachedClient = null;
// let cachedDb = null;

// async function connectToDatabase() {
//   if (cachedDb && cachedClient) {
//     try {
//       await cachedClient.db('admin').command({ ping: 1 });
//       return cachedDb;
//     } catch (e) {
//       console.log('MongoDB connection stale, reconnecting...');
//       cachedClient = null;
//       cachedDb = null;
//     }
//   }

//   const uri = process.env.MONGODB_URI;
//   if (!uri) {
//     throw new Error(
//       'MONGODB_URI is not set. Add it to .env or Netlify environment variables.'
//     );
//   }

//   console.log('Connecting to MongoDB...');

//   const client = new MongoClient(uri, {
//     maxPoolSize: 10,
//     serverSelectionTimeoutMS: 5000,
//     socketTimeoutMS: 45000,
//   });

//   await client.connect();
//   console.log('MongoDB connected successfully');

//   cachedClient = client;
//   cachedDb = client.db('learnpath');

//   // Create indexes (idempotent — safe to call every time)
//   try {
//     await cachedDb
//       .collection('users')
//       .createIndex({ email: 1 }, { unique: true });
//     await cachedDb.collection('paths').createIndex({ userId: 1 });
//     await cachedDb
//       .collection('lessons')
//       .createIndex({ pathId: 1, lessonId: 1 }, { unique: true });
//   } catch (e) {
//     // Indexes already exist
//   }

//   return cachedDb;
// }

// module.exports = { connectToDatabase };

// netlify/functions/utils/db.js
const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

function loadEnvFallback() {
  if (process.env.MONGODB_URI) return;
  try {
    var envPath = path.resolve(__dirname, '../../../.env');
    if (fs.existsSync(envPath)) {
      var content = fs.readFileSync(envPath, 'utf-8');
      content.split('\n').forEach(function (line) {
        var trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return;
        var eqIndex = trimmed.indexOf('=');
        if (eqIndex === -1) return;
        var key = trimmed.substring(0, eqIndex).trim();
        var value = trimmed.substring(eqIndex + 1).trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) process.env[key] = value;
      });
    }
  } catch (e) { /* ignore */ }
}

var cachedClient = null;
var cachedDb = null;

async function connectToDatabase() {
  if (cachedDb && cachedClient) {
    try {
      await cachedClient.db('admin').command({ ping: 1 });
      return cachedDb;
    } catch (e) {
      cachedClient = null;
      cachedDb = null;
    }
  }

  loadEnvFallback();

  var uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not set');
  }

  var client = new MongoClient(uri, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
  });

  await client.connect();
  cachedClient = client;
  cachedDb = client.db('learnpath');

  // Create all indexes
  try {
    // Existing indexes
    await cachedDb.collection('users').createIndex({ email: 1 }, { unique: true });
    await cachedDb.collection('paths').createIndex({ userId: 1 });
    await cachedDb.collection('lessons').createIndex(
      { pathId: 1, lessonId: 1 },
      { unique: true }
    );

    // NEW: Wrong MCQs — compound index for fast path-specific queries
    await cachedDb.collection('wrong_mcqs').createIndex(
      { userId: 1, pathId: 1 }
    );
    // Unique constraint: same user, same path, same question text = no duplicates
    await cachedDb.collection('wrong_mcqs').createIndex(
      { userId: 1, pathId: 1, questionHash: 1 },
      { unique: true }
    );

    // NEW: Areas to review — per user per path
    await cachedDb.collection('areas_to_review').createIndex(
      { userId: 1, pathId: 1 }
    );
    await cachedDb.collection('areas_to_review').createIndex(
      { userId: 1, pathId: 1, topic: 1 },
      { unique: true }
    );

  } catch (e) {
    // Indexes already exist
  }

  return cachedDb;
}

module.exports = { connectToDatabase };