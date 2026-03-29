
// netlify/functions/get-profile.js
const { getSupabase } = require('./utils/supabase');
const { verifyAuth, regenHearts, computeStreak, sanitizeProfile } = require('./utils/auth');

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  var auth = await verifyAuth(event);
  if (auth.error) {
    return {
      statusCode: auth.status,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: auth.error }),
    };
  }

  try {
    var supabase = getSupabase();

    var profileResult = await supabase
      .from('profiles')
      .select('*')
      .eq('id', auth.userId)
      .single();

    if (profileResult.error || !profileResult.data) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'User profile not found' }),
      };
    }

    var profile = profileResult.data;

    // Regen hearts
    var regenned = regenHearts(profile);
    var currentStreak = computeStreak(profile, false);

    var updates = {};
    if (regenned !== profile.hearts) updates.hearts = regenned;
    if (currentStreak !== (profile.streak || 0)) updates.streak = currentStreak;

    if (Object.keys(updates).length > 0) {
      await supabase
        .from('profiles')
        .update(updates)
        .eq('id', auth.userId);
    }

    profile.hearts = regenned;
    profile.streak = currentStreak;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: sanitizeProfile(profile) }),
    };
  } catch (err) {
    console.error('get-profile error:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};