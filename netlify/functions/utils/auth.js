
// // netlify/functions/utils/auth.js
// // Fully migrated to Supabase Auth — no JWT, no bcrypt
// const { getSupabase } = require('./supabase');

// // ────────────────────────────────────────
// // Verify Supabase access token from Authorization header
// // Returns { userId, email } on success
// // Returns { error, status } on failure
// // ────────────────────────────────────────
// async function verifyAuth(event) {
//   var header =
//     event.headers.authorization || event.headers.Authorization || '';

//   if (!header.startsWith('Bearer ')) {
//     return { error: 'No authorization token provided', status: 401 };
//   }

//   var token = header.replace('Bearer ', '').trim();

//   try {
//     var supabase = getSupabase();

//     // Use service client to verify the JWT and get user
//     var result = await supabase.auth.getUser(token);

//     if (result.error || !result.data || !result.data.user) {
//       return { error: 'Invalid or expired token. Please log in again.', status: 401 };
//     }

//     var user = result.data.user;

//     return {
//       userId: user.id,
//       email: user.email,
//     };
//   } catch (err) {
//     console.error('Auth verification error:', err.message);
//     return { error: 'Authentication failed', status: 401 };
//   }
// }

// // ────────────────────────────────────────
// // Heart regeneration: 1 heart per 30 minutes since last loss
// // (unchanged logic — works with profiles table data)
// // ────────────────────────────────────────
// function regenHearts(profile) {
//   var maxHearts = profile.max_hearts || 5;
//   var currentHearts = profile.hearts != null ? profile.hearts : maxHearts;

//   if (currentHearts >= maxHearts) return maxHearts;
//   if (!profile.last_heart_loss) return maxHearts;

//   var elapsed = Date.now() - profile.last_heart_loss;
//   var regained = Math.floor(elapsed / (30 * 60 * 1000));
//   if (regained < 1) return currentHearts;

//   return Math.min(maxHearts, currentHearts + regained);
// }

// // ────────────────────────────────────────
// // Streak computation
// // (unchanged logic — works with profiles table data)
// // ────────────────────────────────────────
// function computeStreak(profile, isNewCompletion) {
//   var now = new Date();
//   var todayStr = now.toISOString().split('T')[0];

//   if (!profile.last_active_date) {
//     return isNewCompletion ? 1 : 0;
//   }

//   if (profile.last_active_date === todayStr) {
//     return profile.streak || (isNewCompletion ? 1 : 0);
//   }

//   var todayUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
//   var parts = profile.last_active_date.split('-');
//   var lastUTC = Date.UTC(
//     parseInt(parts[0], 10),
//     parseInt(parts[1], 10) - 1,
//     parseInt(parts[2], 10)
//   );
//   var diffDays = Math.floor((todayUTC - lastUTC) / 86400000);

//   if (diffDays === 1) {
//     return isNewCompletion
//       ? (profile.streak || 0) + 1
//       : (profile.streak || 0);
//   }

//   if (diffDays > 1) {
//     return isNewCompletion ? 1 : 0;
//   }

//   return profile.streak || 0;
// }

// // ────────────────────────────────────────
// // Sanitize profile for client response
// // (removes any sensitive fields, ensures clean output)
// // ────────────────────────────────────────
// function sanitizeProfile(profile) {
//   if (!profile) return null;

//   return {
//     id: profile.id,
//     email: profile.email,
//     xp: profile.xp || 0,
//     hearts: profile.hearts != null ? profile.hearts : 5,
//     maxHearts: profile.max_hearts || 5,
//     streak: profile.streak || 0,
//     longestStreak: profile.longest_streak || 0,
//     lastActiveDate: profile.last_active_date || null,
//     achievements: profile.achievements || [],
//     totalCorrect: profile.total_correct || 0,
//     totalAnswered: profile.total_answered || 0,
//     createdAt: profile.created_at,
//   };
// }

// module.exports = {
//   verifyAuth,
//   regenHearts,
//   computeStreak,
//   sanitizeProfile,
// };


// netlify/functions/utils/auth.js
const { getSupabase } = require('./supabase');

async function verifyAuth(event) {
  var header =
    event.headers.authorization || event.headers.Authorization || '';

  if (!header.startsWith('Bearer ')) {
    return { error: 'No authorization token provided', status: 401 };
  }

  var token = header.replace('Bearer ', '').trim();

  try {
    var supabase = getSupabase();
    var result = await supabase.auth.getUser(token);

    if (result.error || !result.data || !result.data.user) {
      return { error: 'Invalid or expired token. Please log in again.', status: 401 };
    }

    var user = result.data.user;
    return { userId: user.id, email: user.email };
  } catch (err) {
    console.error('Auth verification error:', err.message);
    return { error: 'Authentication failed', status: 401 };
  }
}

function regenHearts(profile) {
  var maxHearts = profile.max_hearts || 5;
  var currentHearts = profile.hearts != null ? profile.hearts : maxHearts;

  if (currentHearts >= maxHearts) return maxHearts;
  if (!profile.last_heart_loss) return maxHearts;

  var elapsed = Date.now() - profile.last_heart_loss;
  var regained = Math.floor(elapsed / (15 * 60 * 1000));
  if (regained < 1) return currentHearts;

  return Math.min(maxHearts, currentHearts + regained);
}

function computeStreak(profile, isNewCompletion) {
  var now = new Date();
  var todayStr = now.toISOString().split('T')[0];

  if (!profile.last_active_date) {
    return isNewCompletion ? 1 : 0;
  }

  if (profile.last_active_date === todayStr) {
    return profile.streak || (isNewCompletion ? 1 : 0);
  }

  var todayUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  var parts = profile.last_active_date.split('-');
  var lastUTC = Date.UTC(
    parseInt(parts[0], 10),
    parseInt(parts[1], 10) - 1,
    parseInt(parts[2], 10)
  );
  var diffDays = Math.floor((todayUTC - lastUTC) / 86400000);

  if (diffDays === 1) {
    return isNewCompletion
      ? (profile.streak || 0) + 1
      : (profile.streak || 0);
  }

  if (diffDays > 1) {
    return isNewCompletion ? 1 : 0;
  }

  return profile.streak || 0;
}

function sanitizeProfile(profile) {
  if (!profile) return null;

  return {
    id: profile.id,
    email: profile.email,
    xp: profile.xp || 0,
    hearts: profile.hearts != null ? profile.hearts : 5,
    maxHearts: profile.max_hearts || 5,
    streak: profile.streak || 0,
    longestStreak: profile.longest_streak || 0,
    lastActiveDate: profile.last_active_date || null,
    achievements: profile.achievements || [],
    totalCorrect: profile.total_correct || 0,
    totalAnswered: profile.total_answered || 0,
    plan: profile.plan || 'free',
    isByok: profile.is_byok || false,
    hasByokKey: !!(profile.groq_api_key && profile.groq_api_key.trim().length > 0),
    createdAt: profile.created_at,
  };
}

module.exports = {
  verifyAuth,
  regenHearts,
  computeStreak,
  sanitizeProfile,
};