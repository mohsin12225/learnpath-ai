// netlify/functions/save-api-key.js
const { getSupabase } = require('./utils/supabase');
const { verifyAuth } = require('./utils/auth');

// Validate a Groq API key by making a minimal test request
async function validateGroqKey(apiKey) {
  try {
    var response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'user', content: 'Say "ok" in one word.' },
        ],
        max_tokens: 5,
        temperature: 0,
      }),
    });

    if (response.ok) {
      return { valid: true };
    }

    var errData;
    try {
      errData = await response.json();
    } catch (e) {
      errData = { error: { message: 'Unknown error' } };
    }

    if (response.status === 401) {
      return { valid: false, reason: 'Invalid API key. Please check and try again.' };
    }

    if (response.status === 403) {
      return { valid: false, reason: 'API key is expired or revoked.' };
    }

    if (response.status === 429) {
      // Rate limited but key is valid
      return { valid: true };
    }

    return {
      valid: false,
      reason: (errData.error && errData.error.message) || 'API key validation failed (status ' + response.status + ')',
    };
  } catch (err) {
    return { valid: false, reason: 'Could not connect to Groq API: ' + err.message };
  }
}

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
    var apiKey = (body.apiKey || '').trim();

    if (!apiKey) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'API key is required' }),
      };
    }

    // Basic format check
    if (!apiKey.startsWith('gsk_')) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Invalid Groq API key format. Keys start with "gsk_".' }),
      };
    }

    var supabase = getSupabase();

    // Check user's plan
    var profileResult = await supabase
      .from('profiles')
      .select('plan')
      .eq('id', auth.userId)
      .single();

    if (profileResult.error || !profileResult.data) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Profile not found' }),
      };
    }

    if (profileResult.data.plan !== 'pro') {
      return {
        statusCode: 403,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'BYOK is available for Pro users only. Please upgrade your plan.',
          code: 'PRO_REQUIRED',
        }),
      };
    }

    // Validate the key with Groq
    console.log('Validating Groq API key for user ' + auth.userId);
    var validation = await validateGroqKey(apiKey);

    if (!validation.valid) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: validation.reason || 'Invalid API key',
          code: 'INVALID_KEY',
        }),
      };
    }

    // Save the key
    var updateResult = await supabase
      .from('profiles')
      .update({
        groq_api_key: apiKey,
        is_byok: true,
      })
      .eq('id', auth.userId);

    if (updateResult.error) {
      console.error('Failed to save API key:', updateResult.error.message);
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Failed to save API key' }),
      };
    }

    console.log('BYOK key saved for user ' + auth.userId);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        message: 'API key verified and saved successfully.',
        isByok: true,
        hasByokKey: true,
      }),
    };
  } catch (err) {
    console.error('save-api-key error:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};