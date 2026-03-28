// netlify/functions/delete-account.js
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

  // Verify the user is authenticated
  var auth = await verifyAuth(event);
  if (auth.error) {
    return {
      statusCode: auth.status,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: auth.error }),
    };
  }

  var userId = auth.userId;

  try {
    // Parse request body for confirmation
    var body = {};
    try {
      body = JSON.parse(event.body || '{}');
    } catch (e) {
      // empty body is fine
    }

    if (!body.confirm) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Deletion must be confirmed' }),
      };
    }

    // getSupabase() already uses SUPABASE_SERVICE_KEY (service role)
    var supabase = getSupabase();

    // Step 1: Get all path IDs for this user (needed to delete lessons)
    var pathsResult = await supabase
      .from('paths')
      .select('id')
      .eq('user_id', userId);

    var pathIds = [];
    if (pathsResult.data && pathsResult.data.length > 0) {
      for (var i = 0; i < pathsResult.data.length; i++) {
        pathIds.push(pathsResult.data[i].id);
      }
    }

    console.log('Deleting account for user:', userId, '| Paths:', pathIds.length);

    // Step 2: Delete wrong_mcqs for this user
    var wrongMcqsResult = await supabase
      .from('wrong_mcqs')
      .delete()
      .eq('user_id', userId);
    if (wrongMcqsResult.error) {
      console.error('Error deleting wrong_mcqs:', wrongMcqsResult.error.message);
    } else {
      console.log('Deleted wrong_mcqs for user:', userId);
    }

    // Step 3: Delete areas_to_review for this user
    var areasResult = await supabase
      .from('areas_to_review')
      .delete()
      .eq('user_id', userId);
    if (areasResult.error) {
      console.error('Error deleting areas_to_review:', areasResult.error.message);
    } else {
      console.log('Deleted areas_to_review for user:', userId);
    }

    // Step 4: Delete lessons linked to user's paths (lessons use path_id, not user_id)
    if (pathIds.length > 0) {
      var lessonsResult = await supabase
        .from('lessons')
        .delete()
        .in('path_id', pathIds);
      if (lessonsResult.error) {
        console.error('Error deleting lessons:', lessonsResult.error.message);
      } else {
        console.log('Deleted lessons for', pathIds.length, 'paths');
      }
    }

    // Step 5: Delete paths
    var deletePathsResult = await supabase
      .from('paths')
      .delete()
      .eq('user_id', userId);
    if (deletePathsResult.error) {
      console.error('Error deleting paths:', deletePathsResult.error.message);
    } else {
      console.log('Deleted paths for user:', userId);
    }

    // Step 6: Delete profile
    var profileResult = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId);
    if (profileResult.error) {
      console.error('Error deleting profile:', profileResult.error.message);
    } else {
      console.log('Deleted profile for user:', userId);
    }

    // Step 7: Delete user from Supabase Auth
    // getSupabase() uses SUPABASE_SERVICE_KEY which is the service role key,
    // so it has admin privileges to delete auth users
    var deleteAuthResult = await supabase.auth.admin.deleteUser(userId);

    if (deleteAuthResult.error) {
      console.error('Error deleting auth user:', deleteAuthResult.error.message);
      // Data is already deleted, still return success
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          message: 'Account data deleted. Auth cleanup may be pending.',
        }),
      };
    }

    console.log('Successfully deleted auth user:', userId);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        message: 'Account permanently deleted.',
      }),
    };
  } catch (err) {
    console.error('delete-account error:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Failed to delete account. Please try again.' }),
    };
  }
};