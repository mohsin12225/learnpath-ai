
// const { getSupabase } = require('./utils/supabase');
// const { sanitizeProfile } = require('./utils/auth');

// exports.handler = async function (event) {
//   if (event.httpMethod === 'OPTIONS') {
//     return { statusCode: 204, body: '' };
//   }

//   if (event.httpMethod !== 'POST') {
//     return {
//       statusCode: 405,
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({ error: 'Method not allowed' }),
//     };
//   }

//   try {
//     var body = JSON.parse(event.body || '{}');
//     var email = (body.email || '').toLowerCase().trim();
//     var password = body.password || '';
//     var code = (body.code || '').trim();

//     if (!email || !password) {
//       return {
//         statusCode: 400,
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ error: 'Email and password are required' }),
//       };
//     }

//     if (!code) {
//       return {
//         statusCode: 400,
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ error: 'Verification code is required' }),
//       };
//     }

//     var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//     if (!emailRegex.test(email)) {
//       return {
//         statusCode: 400,
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ error: 'Invalid email format' }),
//       };
//     }

//     if (password.length < 6) {
//       return {
//         statusCode: 400,
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({
//           error: 'Password must be at least 6 characters',
//         }),
//       };
//     }

//     var supabase = getSupabase();

//     // Verify the code
//     var codeResult = await supabase
//       .from('verification_codes')
//       .select('*')
//       .eq('email', email)
//       .eq('code', code)
//       .eq('used', false)
//       .order('created_at', { ascending: false })
//       .limit(1);

//     if (codeResult.error || !codeResult.data || codeResult.data.length === 0) {
//       return {
//         statusCode: 400,
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ error: 'Invalid verification code' }),
//       };
//     }

//     var verification = codeResult.data[0];

//     // Check if code is expired
//     var expiresAt = new Date(verification.expires_at).getTime();
//     if (Date.now() > expiresAt) {
//       // Mark as used
//       await supabase
//         .from('verification_codes')
//         .update({ used: true })
//         .eq('id', verification.id);

//       return {
//         statusCode: 400,
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ error: 'Verification code has expired. Please request a new one.' }),
//       };
//     }

//     // Mark code as used
//     await supabase
//       .from('verification_codes')
//       .update({ used: true })
//       .eq('id', verification.id);

//     // Sign up via Supabase Auth
//     var authResult = await supabase.auth.admin.createUser({
//       email: email,
//       password: password,
//       email_confirm: true,
//     });

//     if (authResult.error) {
//       if (authResult.error.message.includes('already been registered') ||
//           authResult.error.message.includes('already exists')) {
//         return {
//           statusCode: 409,
//           headers: { 'Content-Type': 'application/json' },
//           body: JSON.stringify({
//             error: 'An account with this email already exists',
//           }),
//         };
//       }

//       console.error('Supabase signup error:', authResult.error.message);
//       return {
//         statusCode: 400,
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ error: authResult.error.message }),
//       };
//     }

//     var authUser = authResult.data.user;

//     // Fetch or create profile
//     var profileResult = await supabase
//       .from('profiles')
//       .select('*')
//       .eq('id', authUser.id)
//       .single();

//     if (profileResult.error || !profileResult.data) {
//       await supabase.from('profiles').upsert({
//         id: authUser.id,
//         email: authUser.email,
//       });

//       profileResult = await supabase
//         .from('profiles')
//         .select('*')
//         .eq('id', authUser.id)
//         .single();
//     }

//     // Sign in to get session tokens
//     var signInResult = await supabase.auth.signInWithPassword({
//       email: email,
//       password: password,
//     });

//     if (signInResult.error) {
//       console.error('Post-signup sign-in error:', signInResult.error.message);
//       return {
//         statusCode: 500,
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ error: 'Account created but sign-in failed. Please log in manually.' }),
//       };
//     }

//     var session = signInResult.data.session;

//     // Clean up all verification codes for this email
//     await supabase
//       .from('verification_codes')
//       .delete()
//       .eq('email', email);

//     console.log('User signed up (verified): ' + authUser.email);

//     return {
//       statusCode: 201,
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({
//         access_token: session.access_token,
//         refresh_token: session.refresh_token,
//         expires_in: session.expires_in,
//         user: sanitizeProfile(profileResult.data),
//       }),
//     };
//   } catch (err) {
//     console.error('Signup error:', err);
//     return {
//       statusCode: 500,
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({ error: 'Internal server error' }),
//     };
//   }
// };
// netlify/functions/signup.js
const { getSupabase, getSupabaseAuth } = require('./utils/supabase');
const { sanitizeProfile } = require('./utils/auth');

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
    var email = (body.email || '').toLowerCase().trim();
    var password = body.password || '';
    var code = (body.code || '').trim();

    if (!email || !password) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Email and password are required' }),
      };
    }

    if (!code) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Verification code is required' }),
      };
    }

    var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Invalid email format' }),
      };
    }

    if (password.length < 6) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'Password must be at least 6 characters',
        }),
      };
    }

    // Verify OTP code via Supabase Auth
    var supabaseAuth = getSupabaseAuth();

    console.log('Verifying OTP for:', email, '| Code:', code);

    var verifyResult = await supabaseAuth.auth.verifyOtp({
      email: email,
      token: code,
      type: 'signup',
    });

    if (verifyResult.error) {
      console.error('OTP verification failed:', verifyResult.error.message);

      var errorMsg = verifyResult.error.message;

      if (errorMsg.includes('expired') || errorMsg.includes('invalid')) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Invalid or expired verification code. Please request a new one.' }),
        };
      }

      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Verification failed: ' + errorMsg }),
      };
    }

    console.log('OTP verified successfully for:', email);

    // OTP verification was successful — user is now confirmed in Supabase Auth
    var session = verifyResult.data && verifyResult.data.session;
    var user = verifyResult.data && verifyResult.data.user;

    if (!user) {
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Verification succeeded but user not found' }),
      };
    }

    console.log('User confirmed:', user.id, user.email);

    // Ensure profile exists
    var supabase = getSupabase();

    var profileResult = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileResult.error || !profileResult.data) {
      // Create profile manually if trigger hasn't fired
      await supabase.from('profiles').upsert({
        id: user.id,
        email: user.email,
      });

      profileResult = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
    }

    // If we got a session from OTP verification, use it
    if (session && session.access_token) {
      console.log('User signed up and verified:', user.email);

      return {
        statusCode: 201,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          expires_in: session.expires_in,
          user: sanitizeProfile(profileResult.data),
        }),
      };
    }

    // Fallback: sign in with password to get session
    var signInResult = await supabaseAuth.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (signInResult.error) {
      console.error('Post-verification sign-in error:', signInResult.error.message);
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Account verified but sign-in failed. Please log in manually.' }),
      };
    }

    session = signInResult.data.session;

    console.log('User signed up and verified (fallback sign-in):', user.email);

    return {
      statusCode: 201,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_in: session.expires_in,
        user: sanitizeProfile(profileResult.data),
      }),
    };
  } catch (err) {
    console.error('Signup error:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};