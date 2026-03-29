// netlify/functions/remove-api-key.js
const { getSupabase } = require('./utils/supabase');
const { verifyAuth } = require('./utils/auth');

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
    var supabase = getSupabase();

    var updateResult = await supabase
      .from('profiles')
      .update({
        groq_api_key: null,
        is_byok: false,
      })
      .eq('id', auth.userId);

    if (updateResult.error) {
      console.error('Failed to remove API key:', updateResult.error.message);
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Failed to remove API key' }),
      };
    }

    console.log('BYOK key removed for user ' + auth.userId);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        message: 'API key removed. Using default AI service.',
        isByok: false,
        hasByokKey: false,
      }),
    };
  } catch (err) {
    console.error('remove-api-key error:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};