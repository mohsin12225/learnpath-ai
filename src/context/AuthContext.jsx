
// // src/context/AuthContext.jsx
// import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
// import { api, getToken, setSession, removeToken } from '../api';
// import { createClient } from '@supabase/supabase-js';

// var AuthContext = createContext(null);

// // Frontend Supabase client — used ONLY for OAuth
// var supabaseClient = null;

// function getSupabaseClient() {
//   if (supabaseClient) return supabaseClient;

//   var url = import.meta.env.VITE_SUPABASE_URL || '';
//   var key = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

//   if (!url || !key) {
//     return null;
//   }

//   supabaseClient = createClient(url, key, {
//     auth: {
//       autoRefreshToken: true,
//       persistSession: true,
//       detectSessionInUrl: true,
//       storageKey: 'learnpath_sb_auth',
//     },
//   });

//   return supabaseClient;
// }

// export function AuthProvider({ children }) {
//   var [user, setUser] = useState(null);
//   var [loading, setLoading] = useState(true);
//   var [initialized, setInitialized] = useState(false);
//   var [googleLoading, setGoogleLoading] = useState(false);
//   var initDone = useRef(false);

//   // On mount: check for OAuth redirect first, then existing token
//   useEffect(function () {
//     if (initDone.current) return;
//     initDone.current = true;

//     async function init() {
//       try {
//         // Check if returning from OAuth redirect
//         var supabase = getSupabaseClient();
//         if (supabase) {
//           var hashHasToken = window.location.hash && window.location.hash.indexOf('access_token') !== -1;
//           var searchHasCode = window.location.search && window.location.search.indexOf('code=') !== -1;

//           if (hashHasToken || searchHasCode) {
//             // OAuth redirect — let Supabase process the callback
//             var sessionResult = await supabase.auth.getSession();
//             var session = sessionResult.data && sessionResult.data.session;

//             if (session && session.access_token) {
//               setSession({
//                 access_token: session.access_token,
//                 refresh_token: session.refresh_token,
//               });

//               // Clean URL
//               window.history.replaceState(null, '', window.location.pathname);

//               // Load profile
//               try {
//                 var profileData = await api('get-profile', { method: 'GET' });
//                 setUser(profileData.user);
//               } catch (profileErr) {
//                 console.error('OAuth profile load failed:', profileErr.message);
//                 removeToken();
//               }

//               setLoading(false);
//               setInitialized(true);
//               return;
//             }
//           }
//         }

//         // Normal init — check existing token
//         var token = getToken();
//         if (!token) {
//           // Also check if Supabase has a persisted session
//           if (supabase) {
//             var existingSession = await supabase.auth.getSession();
//             var sess = existingSession.data && existingSession.data.session;
//             if (sess && sess.access_token) {
//               setSession({
//                 access_token: sess.access_token,
//                 refresh_token: sess.refresh_token,
//               });
//               token = sess.access_token;
//             }
//           }

//           if (!token) {
//             setLoading(false);
//             setInitialized(true);
//             return;
//           }
//         }

//         var result = await api('get-profile', { method: 'GET' });
//         setUser(result.user);
//       } catch (err) {
//         console.error('Auth init error:', err.message);
//         removeToken();
//       } finally {
//         setLoading(false);
//         setInitialized(true);
//       }
//     }

//     init();
//   }, []);

//   // Listen for auth state changes (token refresh, OAuth callback)
//   useEffect(function () {
//     var supabase = getSupabaseClient();
//     if (!supabase) return;

//     var sub = supabase.auth.onAuthStateChange(function (event, session) {
//       if (event === 'TOKEN_REFRESHED' && session) {
//         setSession({
//           access_token: session.access_token,
//           refresh_token: session.refresh_token,
//         });
//       }
//     });

//     return function () {
//       if (sub && sub.data && sub.data.subscription) {
//         sub.data.subscription.unsubscribe();
//       }
//     };
//   }, []);

//   var signup = useCallback(async function (email, password) {
//     var data = await api('signup', {
//       method: 'POST',
//       body: JSON.stringify({ email: email, password: password }),
//     });

//     setSession({
//       access_token: data.access_token,
//       refresh_token: data.refresh_token,
//     });

//     setUser(data.user);
//     return data.user;
//   }, []);

//   var login = useCallback(async function (email, password) {
//     var data = await api('login', {
//       method: 'POST',
//       body: JSON.stringify({ email: email, password: password }),
//     });

//     setSession({
//       access_token: data.access_token,
//       refresh_token: data.refresh_token,
//     });

//     setUser(data.user);
//     return data.user;
//   }, []);

//   var loginWithGoogle = useCallback(async function () {
//     var supabase = getSupabaseClient();
//     if (!supabase) {
//       throw new Error('Google login is not available. Check environment configuration.');
//     }

//     setGoogleLoading(true);

//     try {
//       var result = await supabase.auth.signInWithOAuth({
//         provider: 'google',
//         options: {
//           redirectTo: window.location.origin,
//         },
//       });

//       if (result.error) {
//         setGoogleLoading(false);
//         throw new Error(result.error.message || 'Google login failed');
//       }

//       // User will be redirected to Google
//       // googleLoading stays true until redirect happens
//     } catch (err) {
//       setGoogleLoading(false);
//       throw err;
//     }
//   }, []);

//   var logout = useCallback(function () {
//     var supabase = getSupabaseClient();
//     if (supabase) {
//       supabase.auth.signOut().catch(function () {});
//     }

//     removeToken();
//     setUser(null);
//     localStorage.removeItem('learnpath_selected_path');
//   }, []);

//   var refreshUser = useCallback(async function () {
//     try {
//       var result = await api('get-profile', { method: 'GET' });
//       setUser(result.user);
//       return result.user;
//     } catch (err) {
//       return null;
//     }
//   }, []);

//   var updateUserLocal = useCallback(function (updates) {
//     setUser(function (prev) {
//       return prev ? Object.assign({}, prev, updates) : prev;
//     });
//   }, []);

//   return (
//     <AuthContext.Provider
//       value={{
//         user: user,
//         setUser: setUser,
//         loading: loading,
//         initialized: initialized,
//         isAuthenticated: !!user,
//         googleLoading: googleLoading,
//         signup: signup,
//         login: login,
//         loginWithGoogle: loginWithGoogle,
//         logout: logout,
//         refreshUser: refreshUser,
//         updateUserLocal: updateUserLocal,
//       }}
//     >
//       {children}
//     </AuthContext.Provider>
//   );
// }

// export function useAuth() {
//   var ctx = useContext(AuthContext);
//   if (!ctx) throw new Error('useAuth must be within AuthProvider');
//   return ctx;
// }




















// src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { api, getToken, setSession, removeToken } from '../api';
import { createClient } from '@supabase/supabase-js';

var AuthContext = createContext(null);

var supabaseClient = null;

function getSupabaseClient() {
  if (supabaseClient) return supabaseClient;

  var url = import.meta.env.VITE_SUPABASE_URL || '';
  var key = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  if (!url || !key) {
    return null;
  }

  supabaseClient = createClient(url, key, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storageKey: 'learnpath_sb_auth',
    },
  });

  return supabaseClient;
}

export function AuthProvider({ children }) {
  var [user, setUser] = useState(null);
  var [loading, setLoading] = useState(true);
  var [initialized, setInitialized] = useState(false);
  var [googleLoading, setGoogleLoading] = useState(false);
  var initDone = useRef(false);

  useEffect(function () {
    if (initDone.current) return;
    initDone.current = true;

    async function init() {
      try {
        var supabase = getSupabaseClient();
        if (supabase) {
          var hashHasToken = window.location.hash && window.location.hash.indexOf('access_token') !== -1;
          var searchHasCode = window.location.search && window.location.search.indexOf('code=') !== -1;

          if (hashHasToken || searchHasCode) {
            var sessionResult = await supabase.auth.getSession();
            var session = sessionResult.data && sessionResult.data.session;

            if (session && session.access_token) {
              setSession({
                access_token: session.access_token,
                refresh_token: session.refresh_token,
              });

              window.history.replaceState(null, '', window.location.pathname);

              try {
                var profileData = await api('get-profile', { method: 'GET' });
                setUser(profileData.user);
              } catch (profileErr) {
                console.error('OAuth profile load failed:', profileErr.message);
                removeToken();
              }

              setLoading(false);
              setInitialized(true);
              return;
            }
          }
        }

        var token = getToken();
        if (!token) {
          if (supabase) {
            var existingSession = await supabase.auth.getSession();
            var sess = existingSession.data && existingSession.data.session;
            if (sess && sess.access_token) {
              setSession({
                access_token: sess.access_token,
                refresh_token: sess.refresh_token,
              });
              token = sess.access_token;
            }
          }

          if (!token) {
            setLoading(false);
            setInitialized(true);
            return;
          }
        }

        var result = await api('get-profile', { method: 'GET' });
        setUser(result.user);
      } catch (err) {
        console.error('Auth init error:', err.message);
        removeToken();
      } finally {
        setLoading(false);
        setInitialized(true);
      }
    }

    init();
  }, []);

  useEffect(function () {
    var supabase = getSupabaseClient();
    if (!supabase) return;

    var sub = supabase.auth.onAuthStateChange(function (event, session) {
      if (event === 'TOKEN_REFRESHED' && session) {
        setSession({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        });
      }
    });

    return function () {
      if (sub && sub.data && sub.data.subscription) {
        sub.data.subscription.unsubscribe();
      }
    };
  }, []);

  var sendVerification = useCallback(async function (email, password) {
    var data = await api('send-verification', {
      method: 'POST',
      body: JSON.stringify({ email: email, password: password }),
    });
    return data;
  }, []);

  var signup = useCallback(async function (email, password, code) {
    var data = await api('signup', {
      method: 'POST',
      body: JSON.stringify({ email: email, password: password, code: code }),
    });

    setSession({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
    });

    setUser(data.user);
    return data.user;
  }, []);

  var login = useCallback(async function (email, password) {
    var data = await api('login', {
      method: 'POST',
      body: JSON.stringify({ email: email, password: password }),
    });

    setSession({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
    });

    setUser(data.user);
    return data.user;
  }, []);

  var loginWithGoogle = useCallback(async function () {
    var supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error('Google login is not available. Check environment configuration.');
    }

    setGoogleLoading(true);

    try {
      var result = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });

      if (result.error) {
        setGoogleLoading(false);
        throw new Error(result.error.message || 'Google login failed');
      }
    } catch (err) {
      setGoogleLoading(false);
      throw err;
    }
  }, []);

  var logout = useCallback(function () {
    var supabase = getSupabaseClient();
    if (supabase) {
      supabase.auth.signOut().catch(function () {});
    }

    removeToken();
    setUser(null);
    localStorage.removeItem('learnpath_selected_path');
  }, []);

  var refreshUser = useCallback(async function () {
    try {
      var result = await api('get-profile', { method: 'GET' });
      setUser(result.user);
      return result.user;
    } catch (err) {
      return null;
    }
  }, []);

  var updateUserLocal = useCallback(function (updates) {
    setUser(function (prev) {
      return prev ? Object.assign({}, prev, updates) : prev;
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user: user,
        setUser: setUser,
        loading: loading,
        initialized: initialized,
        isAuthenticated: !!user,
        googleLoading: googleLoading,
        sendVerification: sendVerification,
        signup: signup,
        login: login,
        loginWithGoogle: loginWithGoogle,
        logout: logout,
        refreshUser: refreshUser,
        updateUserLocal: updateUserLocal,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  var ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be within AuthProvider');
  return ctx;
}

