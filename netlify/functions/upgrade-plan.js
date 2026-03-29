// netlify/functions/upgrade-plan.js
// TEMPORARY: For testing subscription flow
// Replace with real payment integration later
const { getSupabase } = require('./utils/supabase');
const { verifyAuth, sanitizeProfile } = require('./utils/auth');

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, body: '' };
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  var auth = await verifyAuth(event);
  if (auth.error) {
    return { statusCode: auth.status, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: auth.error }) };
  }

  try {
    var body = JSON.parse(event.body || '{}');
    var plan = body.plan;

    if (plan !== 'free' && plan !== 'pro') {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Plan must be "free" or "pro"' }),
      };
    }

    var supabase = getSupabase();

    var updates = { plan: plan };

    // If downgrading to free, disable BYOK but keep the key
    if (plan === 'free') {
      updates.is_byok = false;
    }

    await supabase
      .from('profiles')
      .update(updates)
      .eq('id', auth.userId);

    // Fetch updated profile
    var profileResult = await supabase
      .from('profiles')
      .select('*')
      .eq('id', auth.userId)
      .single();

    console.log('Plan changed to ' + plan + ' for user ' + auth.userId);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        message: plan === 'pro' ? 'Welcome to Pro!' : 'Switched to Free plan.',
        user: sanitizeProfile(profileResult.data),
      }),
    };
  } catch (err) {
    console.error('upgrade-plan error:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};