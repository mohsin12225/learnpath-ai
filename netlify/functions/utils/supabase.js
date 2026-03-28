// // netlify/functions/utils/supabase.js
// const { createClient } = require('@supabase/supabase-js');
// const fs = require('fs');
// const path = require('path');

// // ────────────────────────────────────────
// // Fallback .env loader for local development
// // ────────────────────────────────────────
// function loadEnvFallback() {
//   if (process.env.SUPABASE_URL) return;
//   try {
//     var envPath = path.resolve(__dirname, '../../../.env');
//     if (fs.existsSync(envPath)) {
//       var content = fs.readFileSync(envPath, 'utf-8');
//       content.split('\n').forEach(function (line) {
//         var trimmed = line.trim();
//         if (!trimmed || trimmed.startsWith('#')) return;
//         var eqIndex = trimmed.indexOf('=');
//         if (eqIndex === -1) return;
//         var key = trimmed.substring(0, eqIndex).trim();
//         var value = trimmed.substring(eqIndex + 1).trim().replace(/^["']|["']$/g, '');
//         if (!process.env[key]) process.env[key] = value;
//       });
//     }
//   } catch (e) { /* ignore */ }
// }

// // ────────────────────────────────────────
// // Service client (full DB access — for serverless functions)
// // ────────────────────────────────────────
// var cachedServiceClient = null;

// function getSupabase() {
//   if (cachedServiceClient) return cachedServiceClient;

//   loadEnvFallback();

//   var url = process.env.SUPABASE_URL;
//   var key = process.env.SUPABASE_SERVICE_KEY;

//   if (!url || !key) {
//     throw new Error(
//       'SUPABASE_URL and SUPABASE_SERVICE_KEY must be set.'
//     );
//   }

//   cachedServiceClient = createClient(url, key, {
//     auth: {
//       autoRefreshToken: false,
//       persistSession: false,
//       detectSessionInUrl: false,
//     },
//   });

//   return cachedServiceClient;
// }

// // ────────────────────────────────────────
// // Auth client (uses anon key — for verifying user tokens)
// // ────────────────────────────────────────
// var cachedAnonClient = null;

// function getSupabaseAuth() {
//   if (cachedAnonClient) return cachedAnonClient;

//   loadEnvFallback();

//   var url = process.env.SUPABASE_URL;
//   var key = process.env.SUPABASE_ANON_KEY;

//   if (!url || !key) {
//     throw new Error(
//       'SUPABASE_URL and SUPABASE_ANON_KEY must be set.'
//     );
//   }

//   cachedAnonClient = createClient(url, key, {
//     auth: {
//       autoRefreshToken: false,
//       persistSession: false,
//       detectSessionInUrl: false,
//     },
//   });

//   return cachedAnonClient;
// }

// module.exports = { getSupabase, getSupabaseAuth };













// netlify/functions/utils/supabase.js
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

function loadEnvFallback() {
  if (process.env.SUPABASE_URL) return;
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

var cachedServiceClient = null;

function getSupabase() {
  if (cachedServiceClient) return cachedServiceClient;

  loadEnvFallback();

  var url = process.env.SUPABASE_URL;
  var key = process.env.SUPABASE_SERVICE_KEY;

  if (!url || !key) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY must be set.');
  }

  cachedServiceClient = createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });

  return cachedServiceClient;
}

var cachedAnonClient = null;

function getSupabaseAuth() {
  if (cachedAnonClient) return cachedAnonClient;

  loadEnvFallback();

  var url = process.env.SUPABASE_URL;
  var key = process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY must be set.');
  }

  cachedAnonClient = createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });

  return cachedAnonClient;
}

// ────────────────────────────────────────
// Resolve which Groq API key to use
// Priority: User's BYOK key (if Pro + enabled + valid) → Main server key
// ────────────────────────────────────────
async function resolveGroqKey(supabase, userId) {
  var mainKey = (process.env.GROQ_API_KEY || '').trim();

  if (!userId) {
    return { key: mainKey, source: 'server' };
  }

  try {
    var result = await supabase
      .from('profiles')
      .select('plan, is_byok, groq_api_key')
      .eq('id', userId)
      .single();

    if (result.error || !result.data) {
      return { key: mainKey, source: 'server' };
    }

    var profile = result.data;

    if (
      profile.plan === 'pro' &&
      profile.is_byok === true &&
      profile.groq_api_key &&
      profile.groq_api_key.trim().length > 0
    ) {
      return { key: profile.groq_api_key.trim(), source: 'byok' };
    }
  } catch (e) {
    console.error('resolveGroqKey error:', e.message);
  }

  return { key: mainKey, source: 'server' };
}

module.exports = { getSupabase, getSupabaseAuth, resolveGroqKey };
















