// netlify/functions/send-verification.js
const { getSupabase, getSupabaseAuth } = require('./utils/supabase');

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

    if (!email) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Email is required' }),
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

    if (!password || password.length < 6) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Password must be at least 6 characters' }),
      };
    }

    var supabase = getSupabase();

    // Check if email already exists in profiles
    var existingProfile = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single();

    if (existingProfile.data) {
      return {
        statusCode: 409,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'An account with this email already exists' }),
      };
    }

    // Use Supabase Auth signUp with email confirmation enabled
    // This sends a verification email automatically via Supabase
    var supabaseAuth = getSupabaseAuth();

    var signUpResult = await supabaseAuth.auth.signUp({
      email: email,
      password: password,
      options: {
        emailRedirectTo: undefined,
      },
    });

    if (signUpResult.error) {
      console.error('Supabase signUp error:', signUpResult.error.message);

      if (signUpResult.error.message.includes('already registered') ||
          signUpResult.error.message.includes('already exists')) {
        return {
          statusCode: 409,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'An account with this email already exists' }),
        };
      }

      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: signUpResult.error.message }),
      };
    }

    // Check if user was created but needs confirmation
    var user = signUpResult.data && signUpResult.data.user;

    if (user && user.identities && user.identities.length === 0) {
      // User already exists with this email
      return {
        statusCode: 409,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'An account with this email already exists' }),
      };
    }

    console.log('Verification email sent via Supabase to:', email);
    console.log('User ID:', user ? user.id : 'unknown');
    console.log('Confirmed:', user ? user.email_confirmed_at : 'no');

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Verification code sent to ' + email,
        expiresIn: 600,
      }),
    };
  } catch (err) {
    console.error('send-verification error:', err.message);
    console.error('Stack:', err.stack);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};