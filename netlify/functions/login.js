
// netlify/functions/login.js
const { getSupabase } = require('./utils/supabase');
const { regenHearts, computeStreak, sanitizeProfile } = require('./utils/auth');

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    var body = JSON.parse(event.body || '{}');
    var email = body.email;
    var password = body.password;

    if (!email || !password) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Email and password are required' }),
      };
    }

    var supabase = getSupabase();

    // Sign in via Supabase Auth
    var signInResult = await supabase.auth.signInWithPassword({
      email: email.toLowerCase().trim(),
      password: password,
    });

    if (signInResult.error) {
      return {
        statusCode: 401,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Invalid email or password' }),
      };
    }

    var session = signInResult.data.session;
    var authUser = signInResult.data.user;

    // Load profile
    var profileResult = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .single();

    if (profileResult.error || !profileResult.data) {
      // Profile missing — create it (edge case recovery)
      await supabase.from('profiles').upsert({
        id: authUser.id,
        email: authUser.email,
      });

      profileResult = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();
    }

    var profile = profileResult.data;

    // Regen hearts + recalculate streak on login
    var regenned = regenHearts(profile);
    var currentStreak = computeStreak(profile, false);

    var updates = {};
    if (regenned !== profile.hearts) updates.hearts = regenned;
    if (currentStreak !== (profile.streak || 0)) updates.streak = currentStreak;

    if (Object.keys(updates).length > 0) {
      await supabase
        .from('profiles')
        .update(updates)
        .eq('id', authUser.id);
    }

    profile.hearts = regenned;
    profile.streak = currentStreak;

    console.log('User logged in: ' + authUser.email);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_in: session.expires_in,
        user: sanitizeProfile(profile),
      }),
    };
  } catch (err) {
    console.error('Login error:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};