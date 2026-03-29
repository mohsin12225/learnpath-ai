// netlify/functions/delete-path.js
const { getSupabase } = require('./utils/supabase');
const { verifyAuth } = require('./utils/auth');

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

  var auth = await verifyAuth(event);
  if (auth.error) {
    return {
      statusCode: auth.status,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: auth.error }),
    };
  }

  try {
    var body = JSON.parse(event.body || '{}');
    var pathId = body.pathId;

    if (!pathId) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'pathId is required' }),
      };
    }

    var supabase = getSupabase();

    // Verify the path belongs to this user
    var pathResult = await supabase
      .from('paths')
      .select('id')
      .eq('id', pathId)
      .eq('user_id', auth.userId)
      .single();

    if (pathResult.error || !pathResult.data) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Path not found' }),
      };
    }

    // Delete everything associated with this path
    // Order: dependent data first, then the path itself

    // 1. Delete wrong_mcqs for this path
    var r1 = await supabase
      .from('wrong_mcqs')
      .delete()
      .eq('user_id', auth.userId)
      .eq('path_id', pathId);
    if (r1.error) {
      console.error('Delete wrong_mcqs failed:', r1.error.message);
    }

    // 2. Delete areas_to_review for this path
    var r2 = await supabase
      .from('areas_to_review')
      .delete()
      .eq('user_id', auth.userId)
      .eq('path_id', pathId);
    if (r2.error) {
      console.error('Delete areas_to_review failed:', r2.error.message);
    }

    // 3. Delete lessons for this path
    var r3 = await supabase
      .from('lessons')
      .delete()
      .eq('path_id', pathId);
    if (r3.error) {
      console.error('Delete lessons failed:', r3.error.message);
    }

    // 4. Delete the path itself
    var r4 = await supabase
      .from('paths')
      .delete()
      .eq('id', pathId)
      .eq('user_id', auth.userId);
    if (r4.error) {
      console.error('Delete path failed:', r4.error.message);
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Failed to delete path' }),
      };
    }

    console.log('Deleted path', pathId, 'for user', auth.userId);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true }),
    };
  } catch (err) {
    console.error('delete-path error:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};