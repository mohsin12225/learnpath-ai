

// netlify/functions/get-path-review.js
const { getSupabase } = require('./utils/supabase');
const { verifyAuth } = require('./utils/auth');
const { countWrongQuestions, getAreasToReview } = require('./utils/wrongQuestions');

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
    var pathId = body.pathId;

    if (!pathId) {
      return { statusCode: 400, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'pathId is required' }) };
    }

    var supabase = getSupabase();

    // Verify path ownership
    var pathResult = await supabase
      .from('paths')
      .select('id')
      .eq('id', pathId)
      .eq('user_id', auth.userId)
      .single();

    if (pathResult.error || !pathResult.data) {
      return { statusCode: 404, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Path not found' }) };
    }

    // Load path-specific data
    var loaded = await Promise.all([
      getAreasToReview(supabase, auth.userId, pathId),
      countWrongQuestions(supabase, auth.userId, pathId),
    ]);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pathId: pathId,
        areasToReview: loaded[0],
        wrongQuestionCount: loaded[1],
      }),
    };
  } catch (err) {
    console.error('get-path-review error:', err);
    return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Internal server error' }) };
  }
};