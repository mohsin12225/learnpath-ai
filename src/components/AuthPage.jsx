
// import { useState, useRef, useEffect } from 'react';
// import { useAuth } from '../context/AuthContext';
// import {
//   GraduationCap,
//   Mail,
//   Lock,
//   Eye,
//   EyeOff,
//   ArrowRight,
//   ArrowLeft,
//   Loader2,
//   AlertCircle,
//   UserPlus,
//   LogIn,
//   ShieldCheck,
//   RefreshCw,
// } from 'lucide-react';

// function GoogleIcon() {
//   return (
//     <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
//       <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
//       <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
//       <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
//       <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
//     </svg>
//   );
// }

// export default function AuthPage() {
//   var auth = useAuth();
//   var loginFn = auth.login;
//   var signupFn = auth.signup;
//   var sendVerificationFn = auth.sendVerification;
//   var loginWithGoogle = auth.loginWithGoogle;
//   var googleLoading = auth.googleLoading;

//   var [mode, setMode] = useState('login');
//   var [email, setEmail] = useState('');
//   var [password, setPassword] = useState('');
//   var [confirmPassword, setConfirmPassword] = useState('');
//   var [showPassword, setShowPassword] = useState(false);
//   var [loading, setLoading] = useState(false);
//   var [error, setError] = useState('');

//   // Verification state
//   var [verificationStep, setVerificationStep] = useState(false);
//   var [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
//   var [verifyLoading, setVerifyLoading] = useState(false);
//   var [resendCooldown, setResendCooldown] = useState(0);
//   var inputRefs = useRef([]);
//   var cooldownInterval = useRef(null);

//   // Cleanup cooldown interval
//   useEffect(function () {
//     return function () {
//       if (cooldownInterval.current) {
//         clearInterval(cooldownInterval.current);
//       }
//     };
//   }, []);

//   function startCooldown(seconds) {
//     setResendCooldown(seconds);
//     if (cooldownInterval.current) clearInterval(cooldownInterval.current);
//     cooldownInterval.current = setInterval(function () {
//       setResendCooldown(function (prev) {
//         if (prev <= 1) {
//           clearInterval(cooldownInterval.current);
//           cooldownInterval.current = null;
//           return 0;
//         }
//         return prev - 1;
//       });
//     }, 1000);
//   }

//   async function handleSubmit(e) {
//     e.preventDefault();
//     setError('');

//     if (!email.trim() || !password) {
//       return setError('All fields are required');
//     }

//     if (password.length < 6) {
//       return setError('Password must be at least 6 characters');
//     }

//     if (mode === 'login') {
//       setLoading(true);
//       try {
//         await loginFn(email, password);
//       } catch (err) {
//         setError(err.message);
//       } finally {
//         setLoading(false);
//       }
//       return;
//     }

//     // Signup mode — send verification first
//     if (password !== confirmPassword) {
//       return setError('Passwords do not match');
//     }

//     setLoading(true);
//     try {
//       await sendVerificationFn(email, password);
//       setVerificationStep(true);
//       setError('');
//       startCooldown(60);
//     } catch (err) {
//       setError(err.message);
//     } finally {
//       setLoading(false);
//     }
//   }

//   async function handleVerifyAndSignup() {
//     var code = verificationCode.join('');
//     if (code.length !== 6) {
//       return setError('Please enter the complete 6-digit code');
//     }

//     setError('');
//     setVerifyLoading(true);
//     try {
//       await signupFn(email, password, code);
//     } catch (err) {
//       setError(err.message);
//       // If code is invalid, don't go back — let them retry or resend
//     } finally {
//       setVerifyLoading(false);
//     }
//   }

//   async function handleResendCode() {
//     if (resendCooldown > 0) return;

//     setError('');
//     setLoading(true);
//     try {
//       await sendVerificationFn(email, password);
//       setVerificationCode(['', '', '', '', '', '']);
//       startCooldown(60);
//       setError('');
//     } catch (err) {
//       setError(err.message);
//     } finally {
//       setLoading(false);
//     }
//   }

//   function handleCodeChange(index, value) {
//     // Only allow digits
//     var digit = value.replace(/[^0-9]/g, '');
//     if (digit.length > 1) {
//       // Handle paste of multiple digits
//       var digits = value.replace(/[^0-9]/g, '').split('');
//       var newCode = verificationCode.slice();
//       for (var i = 0; i < digits.length && index + i < 6; i++) {
//         newCode[index + i] = digits[i];
//       }
//       setVerificationCode(newCode);
//       var nextIndex = Math.min(index + digits.length, 5);
//       if (inputRefs.current[nextIndex]) {
//         inputRefs.current[nextIndex].focus();
//       }
//       return;
//     }

//     var newCode = verificationCode.slice();
//     newCode[index] = digit;
//     setVerificationCode(newCode);

//     // Auto-focus next input
//     if (digit && index < 5 && inputRefs.current[index + 1]) {
//       inputRefs.current[index + 1].focus();
//     }
//   }

//   function handleCodeKeyDown(index, e) {
//     if (e.key === 'Backspace' && !verificationCode[index] && index > 0) {
//       if (inputRefs.current[index - 1]) {
//         inputRefs.current[index - 1].focus();
//       }
//     }
//     if (e.key === 'Enter') {
//       handleVerifyAndSignup();
//     }
//   }

//   function handleCodePaste(e) {
//     e.preventDefault();
//     var pasted = (e.clipboardData.getData('text') || '').replace(/[^0-9]/g, '');
//     if (!pasted) return;
//     var digits = pasted.split('').slice(0, 6);
//     var newCode = ['', '', '', '', '', ''];
//     for (var i = 0; i < digits.length; i++) {
//       newCode[i] = digits[i];
//     }
//     setVerificationCode(newCode);
//     var focusIndex = Math.min(digits.length, 5);
//     if (inputRefs.current[focusIndex]) {
//       inputRefs.current[focusIndex].focus();
//     }
//   }

//   function handleBackToSignup() {
//     setVerificationStep(false);
//     setVerificationCode(['', '', '', '', '', '']);
//     setError('');
//   }

//   async function handleGoogleLogin() {
//     setError('');
//     try {
//       await loginWithGoogle();
//     } catch (err) {
//       setError(err.message);
//     }
//   }

//   function switchMode() {
//     setMode(function (m) { return m === 'login' ? 'signup' : 'login'; });
//     setError('');
//     setConfirmPassword('');
//     setVerificationStep(false);
//     setVerificationCode(['', '', '', '', '', '']);
//   }

//   var isLoading = loading || googleLoading || verifyLoading;

//   // Verification step UI
//   if (verificationStep) {
//     return (
//       <div className="auth-page">
//         <div className="auth-bg">
//           <div className="floating-shape shape-1" />
//           <div className="floating-shape shape-2" />
//           <div className="floating-shape shape-3" />
//           <div className="floating-shape shape-4" />
//         </div>

//         <div className="auth-card">
//           <div className="auth-header">
//             <div className="logo-mark">
//               <div className="logo-icon">
//                 <img src="src/imgs/logo.png" alt="LearnPath Logo" />
//               </div>
//               <h1>Learn<span>Path</span></h1>
//             </div>
//           </div>

//           <div className="verify-section">
//             <div className="verify-icon">
//               <ShieldCheck size={40} />
//             </div>
//             <h2 className="verify-title">Check your email</h2>
//             <p className="verify-desc">
//               We sent a 6-digit verification code to
//             </p>
//             <p className="verify-email">{email}</p>

//             <div className="verify-code-inputs" onPaste={handleCodePaste}>
//               {[0, 1, 2, 3, 4, 5].map(function (i) {
//                 return (
//                   <input
//                     key={i}
//                     ref={function (el) { inputRefs.current[i] = el; }}
//                     type="text"
//                     inputMode="numeric"
//                     maxLength={1}
//                     value={verificationCode[i]}
//                     onChange={function (e) { handleCodeChange(i, e.target.value); }}
//                     onKeyDown={function (e) { handleCodeKeyDown(i, e); }}
//                     className="verify-code-input"
//                     disabled={verifyLoading}
//                     autoFocus={i === 0}
//                   />
//                 );
//               })}
//             </div>

//             {error && (
//               <div className="error-msg" style={{ marginTop: 16 }}>
//                 <AlertCircle size={16} /> {error}
//               </div>
//             )}

//             <button
//               className="btn-primary btn-lg btn-full"
//               onClick={handleVerifyAndSignup}
//               disabled={isLoading || verificationCode.join('').length !== 6}
//               style={{ marginTop: 20 }}
//             >
//               {verifyLoading ? (
//                 <span className="loading-content">
//                   <Loader2 size={20} className="spin" />
//                   Creating account...
//                 </span>
//               ) : (
//                 <>
//                   Verify & Create Account <ArrowRight size={18} />
//                 </>
//               )}
//             </button>

//             <div className="verify-actions">
//               <button
//                 className="verify-resend-btn"
//                 onClick={handleResendCode}
//                 disabled={isLoading || resendCooldown > 0}
//               >
//                 <RefreshCw size={14} />
//                 {resendCooldown > 0
//                   ? 'Resend in ' + resendCooldown + 's'
//                   : 'Resend code'}
//               </button>

//               <button
//                 className="verify-back-btn"
//                 onClick={handleBackToSignup}
//                 disabled={isLoading}
//               >
//                 <ArrowLeft size={14} /> Change email
//               </button>
//             </div>
//           </div>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="auth-page">
//       <div className="auth-bg">
//         <div className="floating-shape shape-1" />
//         <div className="floating-shape shape-2" />
//         <div className="floating-shape shape-3" />
//         <div className="floating-shape shape-4" />
//       </div>

//       <div className="auth-card">
//         <div className="auth-header">
//           <div className="logo-mark">
//             <div className="logo-icon">
//               <img src="src/imgs/logo.png" alt="LearnPath Logo" />
//             </div>
//             <h1>Learn<span>Path</span></h1>
//           </div>
//           <p className="tagline">
//             {mode === 'login'
//               ? 'Welcome back! Log in to continue learning.'
//               : 'Create an account and start your learning journey.'}
//           </p>
//         </div>

//         {/* Google Login */}
//         <button
//           className="btn-google"
//           onClick={handleGoogleLogin}
//           disabled={isLoading}
//           type="button"
//         >
//           {googleLoading ? (
//             <Loader2 size={18} className="spin" />
//           ) : (
//             <GoogleIcon />
//           )}
//           {googleLoading ? 'Redirecting to Google...' : 'Continue with Google'}
//         </button>

//         <div className="auth-divider">
//           <div className="auth-divider-line" />
//           <span className="auth-divider-text">or</span>
//           <div className="auth-divider-line" />
//         </div>

//         <div className="auth-tabs">
//           <button
//             className={'auth-tab ' + (mode === 'login' ? 'active' : '')}
//             onClick={switchMode}
//             disabled={mode === 'login' || isLoading}
//           >
//             <LogIn size={16} /> Log In
//           </button>
//           <button
//             className={'auth-tab ' + (mode === 'signup' ? 'active' : '')}
//             onClick={switchMode}
//             disabled={mode === 'signup' || isLoading}
//           >
//             <UserPlus size={16} /> Sign Up
//           </button>
//         </div>

//         <form onSubmit={handleSubmit} className="auth-form">
//           <div className="input-group">
//             <Mail className="input-icon" size={18} />
//             <input
//               type="email"
//               value={email}
//               onChange={function (e) { setEmail(e.target.value); }}
//               placeholder="Email address"
//               className="auth-input"
//               autoComplete="email"
//               disabled={isLoading}
//             />
//           </div>

//           <div className="input-group">
//             <Lock className="input-icon" size={18} />
//             <input
//               type={showPassword ? 'text' : 'password'}
//               value={password}
//               onChange={function (e) { setPassword(e.target.value); }}
//               placeholder="Password"
//               className="auth-input"
//               autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
//               disabled={isLoading}
//             />
//             <button
//               type="button"
//               className="input-toggle"
//               onClick={function () { setShowPassword(!showPassword); }}
//               tabIndex={-1}
//             >
//               {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
//             </button>
//           </div>

//           {mode === 'signup' && (
//             <div className="input-group">
//               <Lock className="input-icon" size={18} />
//               <input
//                 type={showPassword ? 'text' : 'password'}
//                 value={confirmPassword}
//                 onChange={function (e) { setConfirmPassword(e.target.value); }}
//                 placeholder="Confirm password"
//                 className="auth-input"
//                 autoComplete="new-password"
//                 disabled={isLoading}
//               />
//             </div>
//           )}

//           {error && (
//             <div className="error-msg">
//               <AlertCircle size={16} /> {error}
//             </div>
//           )}

//           <button
//             type="submit"
//             className="btn-primary btn-lg btn-full"
//             disabled={isLoading}
//           >
//             {loading ? (
//               <span className="loading-content">
//                 <Loader2 size={20} className="spin" />
//                 {mode === 'login' ? 'Logging in...' : 'Sending verification...'}
//               </span>
//             ) : (
//               <>
//                 {mode === 'login' ? 'Log In' : 'Continue'}
//                 <ArrowRight size={18} />
//               </>
//             )}
//           </button>
//         </form>

//         <p className="auth-switch">
//           {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
//           <button className="auth-switch-btn" onClick={switchMode} disabled={isLoading}>
//             {mode === 'login' ? 'Sign up' : 'Log in'}
//           </button>
//         </p>
//       </div>
//     </div>
//   );
// }

// src/components/AuthPage.jsx
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  GraduationCap,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  Loader2,
  AlertCircle,
  UserPlus,
  LogIn,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';

var CODE_LENGTH = 8;

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

function createEmptyCode() {
  var arr = [];
  for (var i = 0; i < CODE_LENGTH; i++) {
    arr.push('');
  }
  return arr;
}

export default function AuthPage() {
  var auth = useAuth();
  var loginFn = auth.login;
  var signupFn = auth.signup;
  var sendVerificationFn = auth.sendVerification;
  var loginWithGoogle = auth.loginWithGoogle;
  var googleLoading = auth.googleLoading;

  var [mode, setMode] = useState('login');
  var [email, setEmail] = useState('');
  var [password, setPassword] = useState('');
  var [confirmPassword, setConfirmPassword] = useState('');
  var [showPassword, setShowPassword] = useState(false);
  var [loading, setLoading] = useState(false);
  var [error, setError] = useState('');

  // Verification state
  var [verificationStep, setVerificationStep] = useState(false);
  var [verificationCode, setVerificationCode] = useState(createEmptyCode());
  var [verifyLoading, setVerifyLoading] = useState(false);
  var [resendCooldown, setResendCooldown] = useState(0);
  var inputRefs = useRef([]);
  var cooldownInterval = useRef(null);

  useEffect(function () {
    return function () {
      if (cooldownInterval.current) {
        clearInterval(cooldownInterval.current);
      }
    };
  }, []);

  function startCooldown(seconds) {
    setResendCooldown(seconds);
    if (cooldownInterval.current) clearInterval(cooldownInterval.current);
    cooldownInterval.current = setInterval(function () {
      setResendCooldown(function (prev) {
        if (prev <= 1) {
          clearInterval(cooldownInterval.current);
          cooldownInterval.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      return setError('All fields are required');
    }

    if (password.length < 6) {
      return setError('Password must be at least 6 characters');
    }

    if (mode === 'login') {
      setLoading(true);
      try {
        await loginFn(email, password);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
      return;
    }

    if (password !== confirmPassword) {
      return setError('Passwords do not match');
    }

    setLoading(true);
    try {
      await sendVerificationFn(email, password);
      setVerificationStep(true);
      setError('');
      startCooldown(60);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyAndSignup() {
    var code = verificationCode.join('');
    if (code.length !== CODE_LENGTH) {
      return setError('Please enter the complete ' + CODE_LENGTH + '-digit code');
    }

    setError('');
    setVerifyLoading(true);
    try {
      await signupFn(email, password, code);
    } catch (err) {
      setError(err.message);
    } finally {
      setVerifyLoading(false);
    }
  }

  async function handleResendCode() {
    if (resendCooldown > 0) return;

    setError('');
    setLoading(true);
    try {
      await sendVerificationFn(email, password);
      setVerificationCode(createEmptyCode());
      startCooldown(60);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleCodeChange(index, value) {
    var digit = value.replace(/[^0-9]/g, '');
    if (digit.length > 1) {
      var digits = value.replace(/[^0-9]/g, '').split('');
      var newCode = verificationCode.slice();
      for (var i = 0; i < digits.length && index + i < CODE_LENGTH; i++) {
        newCode[index + i] = digits[i];
      }
      setVerificationCode(newCode);
      var nextIndex = Math.min(index + digits.length, CODE_LENGTH - 1);
      if (inputRefs.current[nextIndex]) {
        inputRefs.current[nextIndex].focus();
      }
      return;
    }

    var newCode = verificationCode.slice();
    newCode[index] = digit;
    setVerificationCode(newCode);

    if (digit && index < CODE_LENGTH - 1 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1].focus();
    }
  }

  function handleCodeKeyDown(index, e) {
    if (e.key === 'Backspace' && !verificationCode[index] && index > 0) {
      if (inputRefs.current[index - 1]) {
        inputRefs.current[index - 1].focus();
      }
    }
    if (e.key === 'Enter') {
      handleVerifyAndSignup();
    }
  }

  function handleCodePaste(e) {
    e.preventDefault();
    var pasted = (e.clipboardData.getData('text') || '').replace(/[^0-9]/g, '');
    if (!pasted) return;
    var digits = pasted.split('').slice(0, CODE_LENGTH);
    var newCode = createEmptyCode();
    for (var i = 0; i < digits.length; i++) {
      newCode[i] = digits[i];
    }
    setVerificationCode(newCode);
    var focusIndex = Math.min(digits.length, CODE_LENGTH - 1);
    if (inputRefs.current[focusIndex]) {
      inputRefs.current[focusIndex].focus();
    }
  }

  function handleBackToSignup() {
    setVerificationStep(false);
    setVerificationCode(createEmptyCode());
    setError('');
  }

  async function handleGoogleLogin() {
    setError('');
    try {
      await loginWithGoogle();
    } catch (err) {
      setError(err.message);
    }
  }

  function switchMode() {
    setMode(function (m) { return m === 'login' ? 'signup' : 'login'; });
    setError('');
    setConfirmPassword('');
    setVerificationStep(false);
    setVerificationCode(createEmptyCode());
  }

  var isLoading = loading || googleLoading || verifyLoading;

  // Build code input indexes array
  var codeIndexes = [];
  for (var ci = 0; ci < CODE_LENGTH; ci++) {
    codeIndexes.push(ci);
  }

  if (verificationStep) {
    return (
      <div className="auth-page">
        <div className="auth-bg">
          <div className="floating-shape shape-1" />
          <div className="floating-shape shape-2" />
          <div className="floating-shape shape-3" />
          <div className="floating-shape shape-4" />
        </div>

        <div className="auth-card">
          <div className="auth-header">
            <div className="logo-mark">
              <div className="logo-icon">
                <img src="src/imgs/logo.png" alt="LearnPath Logo" />
              </div>
              <h1>Learn<span>Path</span></h1>
            </div>
          </div>

          <div className="verify-section">
            <div className="verify-icon">
              <ShieldCheck size={40} />
            </div>
            <h2 className="verify-title">Check your email</h2>
            <p className="verify-desc">
              We sent a {CODE_LENGTH}-digit verification code to
            </p>
            <p className="verify-email">{email}</p>

            <div className="verify-code-inputs" onPaste={handleCodePaste}>
              {codeIndexes.map(function (i) {
                return (
                  <input
                    key={i}
                    ref={function (el) { inputRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={verificationCode[i]}
                    onChange={function (e) { handleCodeChange(i, e.target.value); }}
                    onKeyDown={function (e) { handleCodeKeyDown(i, e); }}
                    className="verify-code-input"
                    disabled={verifyLoading}
                    autoFocus={i === 0}
                  />
                );
              })}
            </div>

            {error && (
              <div className="error-msg" style={{ marginTop: 16 }}>
                <AlertCircle size={16} /> {error}
              </div>
            )}

            <button
              className="btn-primary btn-lg btn-full"
              onClick={handleVerifyAndSignup}
              disabled={isLoading || verificationCode.join('').length !== CODE_LENGTH}
              style={{ marginTop: 20 }}
            >
              {verifyLoading ? (
                <span className="loading-content">
                  <Loader2 size={20} className="spin" />
                  Creating account...
                </span>
              ) : (
                <>
                  Verify & Create Account <ArrowRight size={18} />
                </>
              )}
            </button>

            <div className="verify-actions">
              <button
                className="verify-resend-btn"
                onClick={handleResendCode}
                disabled={isLoading || resendCooldown > 0}
              >
                <RefreshCw size={14} />
                {resendCooldown > 0
                  ? 'Resend in ' + resendCooldown + 's'
                  : 'Resend code'}
              </button>

              <button
                className="verify-back-btn"
                onClick={handleBackToSignup}
                disabled={isLoading}
              >
                <ArrowLeft size={14} /> Change email
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-bg">
        <div className="floating-shape shape-1" />
        <div className="floating-shape shape-2" />
        <div className="floating-shape shape-3" />
        <div className="floating-shape shape-4" />
      </div>

      <div className="auth-card">
        <div className="auth-header">
          <div className="logo-mark">
            <div className="logo-icon">
              <img src="src/imgs/logo.png" alt="LearnPath Logo" />
            </div>
            <h1>Learn<span>Path</span></h1>
          </div>
          <p className="tagline">
            {mode === 'login'
              ? 'Welcome back! Log in to continue learning.'
              : 'Create an account and start your learning journey.'}
          </p>
        </div>

        <button
          className="btn-google"
          onClick={handleGoogleLogin}
          disabled={isLoading}
          type="button"
        >
          {googleLoading ? (
            <Loader2 size={18} className="spin" />
          ) : (
            <GoogleIcon />
          )}
          {googleLoading ? 'Redirecting to Google...' : 'Continue with Google'}
        </button>

        <div className="auth-divider">
          <div className="auth-divider-line" />
          <span className="auth-divider-text">or</span>
          <div className="auth-divider-line" />
        </div>

        <div className="auth-tabs">
          <button
            className={'auth-tab ' + (mode === 'login' ? 'active' : '')}
            onClick={switchMode}
            disabled={mode === 'login' || isLoading}
          >
            <LogIn size={16} /> Log In
          </button>
          <button
            className={'auth-tab ' + (mode === 'signup' ? 'active' : '')}
            onClick={switchMode}
            disabled={mode === 'signup' || isLoading}
          >
            <UserPlus size={16} /> Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="input-group">
            <Mail className="input-icon" size={18} />
            <input
              type="email"
              value={email}
              onChange={function (e) { setEmail(e.target.value); }}
              placeholder="Email address"
              className="auth-input"
              autoComplete="email"
              disabled={isLoading}
            />
          </div>

          <div className="input-group">
            <Lock className="input-icon" size={18} />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={function (e) { setPassword(e.target.value); }}
              placeholder="Password"
              className="auth-input"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              disabled={isLoading}
            />
            <button
              type="button"
              className="input-toggle"
              onClick={function () { setShowPassword(!showPassword); }}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {mode === 'signup' && (
            <div className="input-group">
              <Lock className="input-icon" size={18} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={function (e) { setConfirmPassword(e.target.value); }}
                placeholder="Confirm password"
                className="auth-input"
                autoComplete="new-password"
                disabled={isLoading}
              />
            </div>
          )}

          {error && (
            <div className="error-msg">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <button
            type="submit"
            className="btn-primary btn-lg btn-full"
            disabled={isLoading}
          >
            {loading ? (
              <span className="loading-content">
                <Loader2 size={20} className="spin" />
                {mode === 'login' ? 'Logging in...' : 'Sending verification...'}
              </span>
            ) : (
              <>
                {mode === 'login' ? 'Log In' : 'Continue'}
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <p className="auth-switch">
          {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
          <button className="auth-switch-btn" onClick={switchMode} disabled={isLoading}>
            {mode === 'login' ? 'Sign up' : 'Log in'}
          </button>
        </p>
      </div>
    </div>
  );
}