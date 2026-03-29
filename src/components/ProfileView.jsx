
// // src/components/ProfileView.jsx
// import { useState } from 'react';
// import Sidebar from './Sidebar';
// import { useAuth } from '../context/AuthContext';
// import { useLearning } from '../context/LearningContext';
// import { useModal } from '../context/ModalContext';
// import { api } from '../api';
// import {
//   User, BookOpen, LogOut, Key, Shield, ShieldCheck,
//   Loader2, CheckCircle, XCircle, Trash2, Crown,
// } from 'lucide-react';

// export default function ProfileView() {
//   var auth = useAuth();
//   var user = auth.user;
//   var logout = auth.logout;
//   var refreshUser = auth.refreshUser;
//   var updateUserLocal = auth.updateUserLocal;
//   var learning = useLearning();
//   var selectedPath = learning.selectedPath;
//   var modal = useModal();

//   var [apiKeyInput, setApiKeyInput] = useState('');
//   var [byokLoading, setByokLoading] = useState(false);
//   var [byokStatus, setByokStatus] = useState(null); // { type: 'success'|'error', message }
//   var [removeLoading, setRemoveLoading] = useState(false);

//   var isPro = user && user.plan === 'pro';
//   var hasByokKey = user && user.hasByokKey;
//   var isByok = user && user.isByok;

//   function handleLogout() {
//     modal.showConfirm('Are you sure you want to log out?', {
//       title: 'Log Out',
//       type: 'info',
//       confirmLabel: 'Log Out',
//       confirmVariant: 'danger',
//       cancelLabel: 'Stay',
//       onConfirm: function () {
//         logout();
//       },
//     });
//   }

//   async function handleSaveApiKey() {
//     var key = apiKeyInput.trim();

//     if (!key) {
//       setByokStatus({ type: 'error', message: 'Please enter an API key.' });
//       return;
//     }

//     if (!key.startsWith('gsk_')) {
//       setByokStatus({ type: 'error', message: 'Invalid format. Groq API keys start with "gsk_".' });
//       return;
//     }

//     setByokLoading(true);
//     setByokStatus(null);

//     try {
//       var result = await api('save-api-key', {
//         method: 'POST',
//         body: JSON.stringify({ apiKey: key }),
//       });

//       setByokStatus({ type: 'success', message: result.message || 'API key saved successfully!' });
//       setApiKeyInput('');
//       updateUserLocal({ isByok: true, hasByokKey: true });
//       refreshUser();
//     } catch (err) {
//       setByokStatus({
//         type: 'error',
//         message: err.message || 'Failed to save API key.',
//       });
//     } finally {
//       setByokLoading(false);
//     }
//   }

//   async function handleRemoveApiKey() {
//     modal.showConfirm(
//       'Remove your API key? The app will use the default AI service instead.',
//       {
//         title: 'Remove API Key',
//         type: 'warning',
//         confirmLabel: 'Remove',
//         confirmVariant: 'danger',
//         cancelLabel: 'Keep',
//         onConfirm: async function () {
//           setRemoveLoading(true);
//           setByokStatus(null);

//           try {
//             var result = await api('remove-api-key', {
//               method: 'POST',
//               body: JSON.stringify({}),
//             });

//             setByokStatus({ type: 'success', message: result.message || 'API key removed.' });
//             updateUserLocal({ isByok: false, hasByokKey: false });
//             refreshUser();
//           } catch (err) {
//             setByokStatus({
//               type: 'error',
//               message: err.message || 'Failed to remove API key.',
//             });
//           } finally {
//             setRemoveLoading(false);
//           }
//         },
//       }
//     );
//   }

//   return (
//     <div className="app-layout">
//       <Sidebar />
//       <main className="main-content page-content">
//         <h1 className="page-title">
//           <User className="page-title-icon" size={24} /> Profile
//         </h1>

//         {/* Profile Card */}
//         <div className="profile-card">
//           <div className="profile-avatar">
//             <User size={40} />
//           </div>
//           <div className="profile-info">
//             <div className="profile-name-row">
//               <h2>{user && user.email}</h2>
//               {isPro && (
//                 <span className="plan-badge plan-badge-pro">
//                   <Crown size={12} /> PRO
//                 </span>
//               )}
//               {!isPro && (
//                 <span className="plan-badge plan-badge-free">FREE</span>
//               )}
//             </div>
//             <p className="profile-topic">
//               <BookOpen size={16} /> Studying:{' '}
//               {selectedPath ? selectedPath.topic : 'No path selected'}
//             </p>
//           </div>
//         </div>

//         {/* Stats */}
//         <div className="profile-stats">
//           <div className="profile-stat">
//             <span className="profile-stat-val">{(user && user.xp) || 0}</span>
//             <span className="profile-stat-lbl">XP Earned</span>
//           </div>
//           <div className="profile-stat">
//             <span className="profile-stat-val">
//               {selectedPath && selectedPath.progress && selectedPath.progress.completedLessons
//                 ? selectedPath.progress.completedLessons.length
//                 : 0}
//             </span>
//             <span className="profile-stat-lbl">Lessons Done</span>
//           </div>
//           <div className="profile-stat">
//             <span className="profile-stat-val">{(user && user.streak) || 0}</span>
//             <span className="profile-stat-lbl">Current Streak</span>
//           </div>
//           <div className="profile-stat">
//             <span className="profile-stat-val">
//               {user && user.achievements ? user.achievements.length : 0}
//             </span>
//             <span className="profile-stat-lbl">Achievements</span>
//           </div>
//         </div>

//         {/* BYOK Section */}
//         <div className="byok-section">
//           <div className="byok-header">
//             <Key size={20} />
//             <h3>API Key (BYOK)</h3>
//             {isByok && hasByokKey && (
//               <span className="byok-active-badge">
//                 <ShieldCheck size={14} /> Active
//               </span>
//             )}
//           </div>

//           {!isPro ? (
//             <div className="byok-locked">
//               <Shield size={32} className="byok-locked-icon" />
//               <p className="byok-locked-title">Pro Feature</p>
//               <p className="byok-locked-desc">
//                 Bring Your Own API Key is available for Pro users.
//                 Upgrade to use your own Groq API key for faster, unlimited AI responses.
//               </p>
//               <a href="/subscription" className="btn-primary byok-upgrade-btn">
//                 <Crown size={16} /> Upgrade to Pro
//               </a>
//             </div>
//           ) : (
//             <div className="byok-content">
//               <p className="byok-desc">
//                 Use your own Groq API key for AI-powered lessons and quizzes.
//                 Your key is validated before saving and stored securely.
//               </p>

//               {hasByokKey && isByok ? (
//                 <div className="byok-active-card">
//                   <div className="byok-active-info">
//                     <ShieldCheck size={20} className="byok-active-icon" />
//                     <div>
//                       <p className="byok-active-title">Your API key is active</p>
//                       <p className="byok-active-sub">All AI requests use your personal key.</p>
//                     </div>
//                   </div>
//                   <button
//                     className="btn-danger byok-remove-btn"
//                     onClick={handleRemoveApiKey}
//                     disabled={removeLoading}
//                   >
//                     {removeLoading ? (
//                       <Loader2 size={16} className="spin" />
//                     ) : (
//                       <Trash2 size={16} />
//                     )}
//                     {removeLoading ? 'Removing...' : 'Remove Key'}
//                   </button>
//                 </div>
//               ) : (
//                 <div className="byok-input-group">
//                   <div className="byok-input-row">
//                     <input
//                       type="password"
//                       className="byok-input"
//                       placeholder="gsk_xxxxxxxxxxxxxxxx"
//                       value={apiKeyInput}
//                       onChange={function (e) {
//                         setApiKeyInput(e.target.value);
//                         setByokStatus(null);
//                       }}
//                       disabled={byokLoading}
//                     />
//                     <button
//                       className="btn-primary byok-save-btn"
//                       onClick={handleSaveApiKey}
//                       disabled={byokLoading || !apiKeyInput.trim()}
//                     >
//                       {byokLoading ? (
//                         <Loader2 size={16} className="spin" />
//                       ) : (
//                         <CheckCircle size={16} />
//                       )}
//                       {byokLoading ? 'Verifying...' : 'Verify & Save'}
//                     </button>
//                   </div>
//                   <p className="byok-hint">
//                     Get your key from{' '}
//                     <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer">
//                       console.groq.com/keys
//                     </a>
//                     <h1>API Key Instructions</h1>
//                     <ol>
//                       <li>Go to the Groq Console and log in.</li>
//                       <li>Navigate to the "API Keys" section.</li>
//                       <li>Click "Create API Key" and give it a name.</li>
//                       <li>Copy the generated key (starts with "gsk_") and paste it above.</li>
//                     </ol>
//                   </p>
//                 </div>
//               )}

//               {byokStatus && (
//                 <div className={'byok-status byok-status-' + byokStatus.type}>
//                   {byokStatus.type === 'success' ? (
//                     <CheckCircle size={16} />
//                   ) : (
//                     <XCircle size={16} />
//                   )}
//                   <span>{byokStatus.message}</span>
//                 </div>
//               )}
//             </div>
//           )}
//         </div>

//         {/* Actions */}
//         <div className="profile-actions">
//           <button className="btn-danger" onClick={handleLogout}>
//             <LogOut size={16} /> Log Out
//           </button>
//         </div>
//       </main>
//     </div>
//   );
// }
// src/components/ProfileView.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';
import { useLearning } from '../context/LearningContext';
import { useModal } from '../context/ModalContext';
import { api } from '../api';
import {
  User, BookOpen, LogOut, Key, Shield, ShieldCheck,
  Loader2, CheckCircle, XCircle, Trash2, Crown, AlertTriangle,
} from 'lucide-react';

export default function ProfileView() {
  var auth = useAuth();
  var user = auth.user;
  var logout = auth.logout;
  var refreshUser = auth.refreshUser;
  var updateUserLocal = auth.updateUserLocal;
  var learning = useLearning();
  var selectedPath = learning.selectedPath;
  var modal = useModal();
  var navigate = useNavigate();

  var [apiKeyInput, setApiKeyInput] = useState('');
  var [byokLoading, setByokLoading] = useState(false);
  var [byokStatus, setByokStatus] = useState(null);
  var [removeLoading, setRemoveLoading] = useState(false);
  var [deleteLoading, setDeleteLoading] = useState(false);

  var isPro = user && user.plan === 'pro';
  var hasByokKey = user && user.hasByokKey;
  var isByok = user && user.isByok;

  function handleLogout() {
    modal.showConfirm('Are you sure you want to log out?', {
      title: 'Log Out',
      type: 'info',
      confirmLabel: 'Log Out',
      confirmVariant: 'danger',
      cancelLabel: 'Stay',
      onConfirm: function () {
        logout();
      },
    });
  }

  function handleDeleteAccount() {
    modal.showConfirm(
      'Are you sure you want to delete your account? This action is permanent and cannot be undone. All your learning paths, progress, lessons, and data will be permanently removed.',
      {
        title: 'Delete Account',
        type: 'warning',
        confirmLabel: 'Delete My Account',
        confirmVariant: 'danger',
        cancelLabel: 'Cancel',
        onConfirm: async function () {
          setDeleteLoading(true);
          try {
            await api('delete-account', {
              method: 'POST',
              body: JSON.stringify({ confirm: true }),
            });

            // Clear everything and log out
            logout();
            navigate('/');
          } catch (err) {
            modal.showError(
              err.message || 'Failed to delete account. Please try again.'
            );
          } finally {
            setDeleteLoading(false);
          }
        },
      }
    );
  }

  async function handleSaveApiKey() {
    var key = apiKeyInput.trim();

    if (!key) {
      setByokStatus({ type: 'error', message: 'Please enter an API key.' });
      return;
    }

    if (!key.startsWith('gsk_')) {
      setByokStatus({ type: 'error', message: 'Invalid format. Groq API keys start with "gsk_".' });
      return;
    }

    setByokLoading(true);
    setByokStatus(null);

    try {
      var result = await api('save-api-key', {
        method: 'POST',
        body: JSON.stringify({ apiKey: key }),
      });

      setByokStatus({ type: 'success', message: result.message || 'API key saved successfully!' });
      setApiKeyInput('');
      updateUserLocal({ isByok: true, hasByokKey: true });
      refreshUser();
    } catch (err) {
      setByokStatus({
        type: 'error',
        message: err.message || 'Failed to save API key.',
      });
    } finally {
      setByokLoading(false);
    }
  }

  async function handleRemoveApiKey() {
    modal.showConfirm(
      'Remove your API key? The app will use the default AI service instead.',
      {
        title: 'Remove API Key',
        type: 'warning',
        confirmLabel: 'Remove',
        confirmVariant: 'danger',
        cancelLabel: 'Keep',
        onConfirm: async function () {
          setRemoveLoading(true);
          setByokStatus(null);

          try {
            var result = await api('remove-api-key', {
              method: 'POST',
              body: JSON.stringify({}),
            });

            setByokStatus({ type: 'success', message: result.message || 'API key removed.' });
            updateUserLocal({ isByok: false, hasByokKey: false });
            refreshUser();
          } catch (err) {
            setByokStatus({
              type: 'error',
              message: err.message || 'Failed to remove API key.',
            });
          } finally {
            setRemoveLoading(false);
          }
        },
      }
    );
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content page-content">
        <h1 className="page-title">
          <User className="page-title-icon" size={24} /> Profile
        </h1>

        {/* Profile Card */}
        <div className="profile-card">
          <div className="profile-avatar">
            <User size={40} />
          </div>
          <div className="profile-info">
            <div className="profile-name-row">
              <h2>{user && user.email}</h2>
              {isPro && (
                <span className="plan-badge plan-badge-pro">
                  <Crown size={12} /> PRO
                </span>
              )}
              {!isPro && (
                <span className="plan-badge plan-badge-free">FREE</span>
              )}
            </div>
            <p className="profile-topic">
              <BookOpen size={16} /> Studying:{' '}
              {selectedPath ? selectedPath.topic : 'No path selected'}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="profile-stats">
          <div className="profile-stat">
            <span className="profile-stat-val">{(user && user.xp) || 0}</span>
            <span className="profile-stat-lbl">XP Earned</span>
          </div>
          <div className="profile-stat">
            <span className="profile-stat-val">
              {selectedPath && selectedPath.progress && selectedPath.progress.completedLessons
                ? selectedPath.progress.completedLessons.length
                : 0}
            </span>
            <span className="profile-stat-lbl">Lessons Done</span>
          </div>
          <div className="profile-stat">
            <span className="profile-stat-val">{(user && user.streak) || 0}</span>
            <span className="profile-stat-lbl">Current Streak</span>
          </div>
          <div className="profile-stat">
            <span className="profile-stat-val">
              {user && user.achievements ? user.achievements.length : 0}
            </span>
            <span className="profile-stat-lbl">Achievements</span>
          </div>
        </div>

        {/* BYOK Section */}
        <div className="byok-section">
          <div className="byok-header">
            <Key size={20} />
            <h3>API Key (BYOK)</h3>
            {isByok && hasByokKey && (
              <span className="byok-active-badge">
                <ShieldCheck size={14} /> Active
              </span>
            )}
          </div>

          {!isPro ? (
            <div className="byok-locked">
              <Shield size={32} className="byok-locked-icon" />
              <p className="byok-locked-title">Pro Feature</p>
              <p className="byok-locked-desc">
                Bring Your Own API Key is available for Pro users.
                Upgrade to use your own Groq API key for faster, unlimited AI responses.
              </p>
              <a href="/subscription" className="btn-primary byok-upgrade-btn">
                <Crown size={16} /> Upgrade to Pro
              </a>
            </div>
          ) : (
            <div className="byok-content">
              <p className="byok-desc">
                Use your own Groq API key for AI-powered lessons and quizzes.
                Your key is validated before saving and stored securely.
              </p>

              {hasByokKey && isByok ? (
                <div className="byok-active-card">
                  <div className="byok-active-info">
                    <ShieldCheck size={20} className="byok-active-icon" />
                    <div>
                      <p className="byok-active-title">Your API key is active</p>
                      <p className="byok-active-sub">All AI requests use your personal key.</p>
                    </div>
                  </div>
                  <button
                    className="btn-danger byok-remove-btn"
                    onClick={handleRemoveApiKey}
                    disabled={removeLoading}
                  >
                    {removeLoading ? (
                      <Loader2 size={16} className="spin" />
                    ) : (
                      <Trash2 size={16} />
                    )}
                    {removeLoading ? 'Removing...' : 'Remove Key'}
                  </button>
                </div>
              ) : (
                <div className="byok-input-group">
                  <div className="byok-input-row">
                    <input
                      type="password"
                      className="byok-input"
                      placeholder="gsk_xxxxxxxxxxxxxxxx"
                      value={apiKeyInput}
                      onChange={function (e) {
                        setApiKeyInput(e.target.value);
                        setByokStatus(null);
                      }}
                      disabled={byokLoading}
                    />
                    <button
                      className="btn-primary byok-save-btn"
                      onClick={handleSaveApiKey}
                      disabled={byokLoading || !apiKeyInput.trim()}
                    >
                      {byokLoading ? (
                        <Loader2 size={16} className="spin" />
                      ) : (
                        <CheckCircle size={16} />
                      )}
                      {byokLoading ? 'Verifying...' : 'Verify & Save'}
                    </button>
                  </div>
                  <p className="byok-hint">
                    Get your key from{' '}
                    <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer">
                      console.groq.com/keys
                    </a>
                    <h1>API Key Instructions</h1>
                    <ol>
                      <li>Go to the Groq Console and log in.</li>
                      <li>Navigate to the "API Keys" section.</li>
                      <li>Click "Create API Key" and give it a name.</li>
                      <li>Copy the generated key (starts with "gsk_") and paste it above.</li>
                    </ol>
                  </p>
                </div>
              )}

              {byokStatus && (
                <div className={'byok-status byok-status-' + byokStatus.type}>
                  {byokStatus.type === 'success' ? (
                    <CheckCircle size={16} />
                  ) : (
                    <XCircle size={16} />
                  )}
                  <span>{byokStatus.message}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="profile-actions">
          <button className="btn-danger" onClick={handleLogout}>
            <LogOut size={16} /> Log Out
          </button>
        </div>

        {/* Danger Zone - Delete Account */}
        <div className="danger-zone">
          <div className="danger-zone-header">
            <AlertTriangle size={20} />
            <h3>Danger Zone</h3>
          </div>
          <p className="danger-zone-desc">
            Permanently delete your account and all associated data. This action cannot be undone.
          </p>
          <button
            className="btn-delete-account"
            onClick={handleDeleteAccount}
            disabled={deleteLoading}
          >
            {deleteLoading ? (
              <>
                <Loader2 size={16} className="spin" /> Deleting...
              </>
            ) : (
              <>
                <Trash2 size={16} /> Delete Account
              </>
            )}
          </button>
        </div>
      </main>
    </div>
  );
}