

var ACCESS_TOKEN_KEY = 'learnpath_access_token';
var REFRESH_TOKEN_KEY = 'learnpath_refresh_token';

export function getToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setToken(accessToken) {
  if (accessToken) {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  }
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setRefreshToken(refreshToken) {
  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }
}

export function setSession(session) {
  if (session && session.access_token) {
    localStorage.setItem(ACCESS_TOKEN_KEY, session.access_token);
  }
  if (session && session.refresh_token) {
    localStorage.setItem(REFRESH_TOKEN_KEY, session.refresh_token);
  }
}

export function removeToken() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export async function api(path, options) {
  if (!options) options = {};

  var token = getToken();

  var headers = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = 'Bearer ' + token;
  }

  if (options.headers) {
    var keys = Object.keys(options.headers);
    for (var i = 0; i < keys.length; i++) {
      headers[keys[i]] = options.headers[keys[i]];
    }
  }

  var config = {
    method: options.method || 'GET',
    headers: headers,
  };

  if (options.body) {
    config.body = options.body;
  }

  // var res = await fetch('/.netlify/functions/' + path, config)
var BASE_URL = import.meta.env.DEV
  ? 'http://localhost:8888/.netlify/functions/'
  : '/.netlify/functions/';

var res = await fetch(BASE_URL + path, config);
  // If 401, try refreshing the token once
  if (res.status === 401) {
    var refreshed = await tryRefreshToken();
    if (refreshed) {
      // Retry with new token
      config.headers['Authorization'] = 'Bearer ' + getToken();
      res = await fetch('/.netlify/functions/' + path, config);

      if (res.status === 401) {
        removeToken();
        window.location.reload();
        throw new Error('Session expired');
      }
    } else {
      removeToken();
      window.location.reload();
      throw new Error('Session expired');
    }
  }

  var data = await res.json();

  if (!res.ok) {
    var err = new Error(data.error || 'Request failed (' + res.status + ')');
    err.status = res.status;
    err.code = data.code;
    throw err;
  }

  return data;
}

// Refresh token using Supabase GoTrue endpoint
async function tryRefreshToken() {
  var refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  try {
    var supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    var supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) return false;

    var res = await fetch(supabaseUrl + '/auth/v1/token?grant_type=refresh_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey,
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!res.ok) return false;

    var data = await res.json();

    if (data.access_token) {
      setToken(data.access_token);
      if (data.refresh_token) setRefreshToken(data.refresh_token);
      return true;
    }

    return false;
  } catch (e) {
    return false;
  }
}