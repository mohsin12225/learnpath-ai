
// const { getSupabase } = require('./utils/supabase');
// const { verifyAuth } = require('./utils/auth');
// const { clearWrongQuestions, clearAreasToReview } = require('./utils/wrongQuestions');

// exports.handler = async function (event) {
//   if (event.httpMethod === 'OPTIONS') return { statusCode: 204, body: '' };
//   if (event.httpMethod !== 'POST') {
//     return { statusCode: 405, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Method not allowed' }) };
//   }

//   var auth = await verifyAuth(event);
//   if (auth.error) {
//     return { statusCode: auth.status, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: auth.error }) };
//   }

//   try {
//     var body = JSON.parse(event.body || '{}');
//     var pathId = body.pathId;

//     if (!pathId) {
//       return { statusCode: 400, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'pathId is required' }) };
//     }

//     var supabase = getSupabase();

//     // Verify path ownership
//     var pathResult = await supabase
//       .from('paths')
//       .select('id')
//       .eq('id', pathId)
//       .eq('user_id', auth.userId)
//       .single();

//     if (pathResult.error || !pathResult.data) {
//       return { statusCode: 404, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Path not found' }) };
//     }

//     // Delete path (CASCADE will delete lessons automatically)
//     // But we need to manually clear wrong_mcqs and areas_to_review
//     // because they reference path_id as text, not foreign key
//     var results = await Promise.all([
//       supabase.from('paths').delete().eq('id', pathId),
//       clearWrongQuestions(supabase, auth.userId, pathId),
//       clearAreasToReview(supabase, auth.userId, pathId),
//     ]);

//     console.log('Deleted path ' + pathId);

//     return {
//       statusCode: 200,
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({ success: true }),
//     };
//   } catch (err) {
//     console.error('delete-path error:', err);
//     return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Internal server error' }) };
//   }
// };

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
    var body = {};
    try {
      body = JSON.parse(event.body || '{}');
    } catch (e) {}

    if (!body.confirm) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Deletion must be confirmed' }),
      };
    }

    var supabase = getSupabase();

    console.log('=== ACCOUNT DELETION STARTED ===');
    console.log('User ID:', userId);
    console.log('Email:', auth.email);

    // Step 1: Get all path IDs for this user
    var pathsQuery = await supabase
      .from('paths')
      .select('id')
      .eq('user_id', userId);

    var pathIds = [];
    if (pathsQuery.data && pathsQuery.data.length > 0) {
      for (var i = 0; i < pathsQuery.data.length; i++) {
        pathIds.push(pathsQuery.data[i].id);
      }
    }
    console.log('Found', pathIds.length, 'paths to delete');

    var errors = [];

    // Step 2: Delete wrong_mcqs
    var r1 = await supabase.from('wrong_mcqs').delete().eq('user_id', userId);
    if (r1.error) {
      console.error('Delete wrong_mcqs failed:', r1.error.message);
      errors.push('wrong_mcqs: ' + r1.error.message);
    } else {
      console.log('Deleted wrong_mcqs');
    }

    // Step 3: Delete areas_to_review
    var r2 = await supabase.from('areas_to_review').delete().eq('user_id', userId);
    if (r2.error) {
      console.error('Delete areas_to_review failed:', r2.error.message);
      errors.push('areas_to_review: ' + r2.error.message);
    } else {
      console.log('Deleted areas_to_review');
    }

    // Step 4: Delete lessons (via path_id)
    if (pathIds.length > 0) {
      var r3 = await supabase.from('lessons').delete().in('path_id', pathIds);
      if (r3.error) {
        console.error('Delete lessons failed:', r3.error.message);
        errors.push('lessons: ' + r3.error.message);
      } else {
        console.log('Deleted lessons for', pathIds.length, 'paths');
      }
    }

    // Step 5: Delete verification_codes (if table exists)
    var r4 = await supabase.from('verification_codes').delete().eq('email', auth.email);
    if (r4.error) {
      console.log('Delete verification_codes skipped:', r4.error.message);
      // Not critical, table may not exist
    } else {
      console.log('Deleted verification_codes');
    }

    // Step 6: Delete paths
    var r5 = await supabase.from('paths').delete().eq('user_id', userId);
    if (r5.error) {
      console.error('Delete paths failed:', r5.error.message);
      errors.push('paths: ' + r5.error.message);
    } else {
      console.log('Deleted paths');
    }

    // Step 7: Delete profile
    var r6 = await supabase.from('profiles').delete().eq('id', userId);
    if (r6.error) {
      console.error('Delete profile failed:', r6.error.message);
      errors.push('profiles: ' + r6.error.message);
    } else {
      console.log('Deleted profile');
    }

    // Step 8: Delete from Supabase Auth — THIS IS THE CRITICAL PART
    console.log('Attempting to delete auth user:', userId);

    var authDeleteResult = await supabase.auth.admin.deleteUser(userId);

    if (authDeleteResult.error) {
      console.error('=== AUTH DELETE FAILED ===');
      console.error('Error:', authDeleteResult.error.message);
      console.error('Error details:', JSON.stringify(authDeleteResult.error));

      // If admin delete fails, the account still exists in auth
      // Return an error so the user knows
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'Failed to fully delete account. Please contact support.',
          details: authDeleteResult.error.message,
        }),
      };
    }

    console.log('=== AUTH USER DELETED SUCCESSFULLY ===');
    console.log('User', auth.email, '(' + userId + ') fully deleted');

    if (errors.length > 0) {
      console.log('Non-critical errors during deletion:', errors.join('; '));
    }

    console.log('=== ACCOUNT DELETION COMPLETE ===');

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        message: 'Your account and all data have been permanently deleted.',
      }),
    };
  } catch (err) {
    console.error('=== ACCOUNT DELETION CRASHED ===');
    console.error('Error:', err.message);
    console.error('Stack:', err.stack);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Failed to delete account. Please try again.' }),
    };
  }
};