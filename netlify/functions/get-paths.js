

// netlify/functions/get-paths.js
const { getSupabase } = require('./utils/supabase');
const { verifyAuth } = require('./utils/auth');

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

    var result = await supabase
      .from('paths')
      .select('*')
      .eq('user_id', auth.userId)
      .order('created_at', { ascending: false });

    if (result.error) {
      console.error('get-paths error:', result.error.message);
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Failed to load paths' }),
      };
    }

    // Map to frontend-expected format
    var serialized = (result.data || []).map(function (p) {
      return {
        _id: p.id,
        userId: p.user_id,
        topic: p.topic,
        days: p.days,
        description: p.description,
        lessons: p.lessons,
        progress: p.progress,
        createdAt: p.created_at,
      };
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paths: serialized }),
    };
  } catch (err) {
    console.error('get-paths error:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};