
// // src/components/PathSelector.jsx
// import { useState } from 'react';
// import { useNavigate } from 'react-router-dom';
// import { useAuth } from '../context/AuthContext';
// import { useLearning } from '../context/LearningContext';
// import { useModal } from '../context/ModalContext';
// import {
//   GraduationCap,
//   Plus,
//   Trash2,
//   BookOpen,
//   Search,
//   Clock,
//   FileText,
//   ArrowRight,
//   ArrowLeft,
//   Loader2,
//   AlertCircle,
//   Sparkles,
//   ChevronRight,
//   Calendar,
//   LogOut,
// } from 'lucide-react';

// var SUGGESTED_TOPICS = [
//   'Python Programming',
//   'Photosynthesis',
//   'World War II',
//   'Calculus',
//   'Machine Learning',
//   'Music Theory',
//   'Organic Chemistry',
//   'Creative Writing',
//   'Astronomy',
//   'Economics',
//   'Human Anatomy',
//   'Philosophy',
// ];

// export default function PathSelector() {
//   var auth = useAuth();
//   var user = auth.user;
//   var logout = auth.logout;
//   var learning = useLearning();
//   var paths = learning.paths;
//   var createPath = learning.createPath;
//   var deletePath = learning.deletePath;
//   var selectPath = learning.selectPath;
//   var pathsLoading = learning.pathsLoading;
//   var modal = useModal();
//   var navigate = useNavigate();

//   var [showCreate, setShowCreate] = useState(false);
//   var [topic, setTopic] = useState('');
//   var [days, setDays] = useState(7);
//   var [creating, setCreating] = useState(false);
//   var [deleting, setDeleting] = useState(null);
//   var [error, setError] = useState('');

//   async function handleCreate() {
//     if (!topic.trim()) return setError('Please enter a topic');
//     setError('');
//     setCreating(true);

//     try {
//       await createPath(topic.trim(), days);
//       navigate('/');
//     } catch (err) {
//       if (err.code === 'PATH_LIMIT_REACHED') {
//         modal.showWarning(
//           'You can only create 3 learning paths. Delete one to create a new one.',
//           { title: 'Path Limit Reached' }
//         );
//       } else {
//         setError(err.message);
//       }
//     } finally {
//       setCreating(false);
//     }
//   }

//   function handleDelete(pathId) {
//     modal.showConfirm(
//       'Delete this learning path? All progress and saved lessons will be permanently removed.',
//       {
//         title: 'Delete Learning Path',
//         type: 'warning',
//         confirmLabel: 'Delete',
//         confirmVariant: 'danger',
//         cancelLabel: 'Keep',
//         onConfirm: async function () {
//           setDeleting(pathId);
//           try {
//             await deletePath(pathId);
//           } catch (err) {
//             modal.showError(err.message);
//           } finally {
//             setDeleting(null);
//           }
//         },
//       }
//     );
//   }

//   function handleSelect(pathId) {
//     selectPath(pathId);
//     navigate('/');
//   }

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

//   var canCreateMore = paths.length < 3;

//   return (
//     <div className="path-selector-page">
//       <div className="path-selector-header">
//         <div className="ps-header-left">
//           <div className="logo-mark">
//             <div className="logo-icon">
//               <img src="src/imgs/logo.png" alt="LearnPath Logo" />
//             </div>
//             <h1>
//               Learn<span>Path</span>
//             </h1>
//           </div>
//         </div>
//         <div className="ps-header-right">
//           <span className="ps-user-email">
//             {user && user.email}
//           </span>
//           <button className="btn-logout" onClick={handleLogout}>
//             <LogOut size={16} /> Log Out
//           </button>
//         </div>
//       </div>

//       <div className="path-selector-content">
//         <div className="ps-title-section">
//           <h2>Your Learning Paths</h2>
//           <p>{paths.length}/3 paths created</p>
//         </div>

//         {error && (
//           <div
//             className="error-msg"
//             style={{ maxWidth: 600, margin: '0 auto 20px' }}
//           >
//             <AlertCircle size={16} /> {error}
//           </div>
//         )}

//         {pathsLoading ? (
//           <div className="ps-loading">
//             <Loader2
//               size={32}
//               style={{
//                 animation: 'spin 1s linear infinite',
//                 color: 'var(--primary)',
//               }}
//             />
//             <p>Loading your paths...</p>
//           </div>
//         ) : (
//           <>
//             <div className="paths-grid">
//               {paths.map(function (path) {
//                 var total = path.lessons ? path.lessons.length : 0;
//                 var completed =
//                   path.progress && path.progress.completedLessons
//                     ? path.progress.completedLessons.length
//                     : 0;
//                 var percent =
//                   total > 0 ? Math.round((completed / total) * 100) : 0;

//                 return (
//                   <div key={path._id} className="path-card">
//                     <div className="path-card-header">
//                       <div className="path-card-icon">
//                         <BookOpen size={24} />
//                       </div>
//                       <button
//                         className="path-delete-btn"
//                         onClick={function (e) {
//                           e.stopPropagation();
//                           handleDelete(path._id);
//                         }}
//                         disabled={deleting === path._id}
//                         title="Delete path"
//                       >
//                         {deleting === path._id ? (
//                           <Loader2
//                             size={16}
//                             style={{
//                               animation: 'spin 1s linear infinite',
//                             }}
//                           />
//                         ) : (
//                           <Trash2 size={16} />
//                         )}
//                       </button>
//                     </div>

//                     <h3 className="path-card-title">{path.topic}</h3>
//                     <p className="path-card-meta">
//                       <Calendar size={14} /> {path.days} days · {total}{' '}
//                       lessons
//                     </p>

//                     <div className="path-card-progress">
//                       <div className="path-progress-bar">
//                         <div
//                           className="path-progress-fill"
//                           style={{ width: percent + '%' }}
//                         />
//                       </div>
//                       <span className="path-progress-text">
//                         {completed}/{total} completed
//                       </span>
//                     </div>

//                     <button
//                       className="btn-primary btn-full path-continue-btn"
//                       onClick={function () {
//                         handleSelect(path._id);
//                       }}
//                     >
//                       {completed > 0 ? 'Continue' : 'Start'}
//                       <ChevronRight size={18} />
//                     </button>
//                   </div>
//                 );
//               })}

//               {canCreateMore && !showCreate && (
//                 <button
//                   className="path-card path-card-new"
//                   onClick={function () {
//                     setShowCreate(true);
//                   }}
//                 >
//                   <div className="new-path-icon">
//                     <Plus size={32} />
//                   </div>
//                   <h3>New Learning Path</h3>
//                   <p>Start learning a new topic</p>
//                 </button>
//               )}
//             </div>

//             {!canCreateMore && !showCreate && (
//               <p className="path-limit-msg">
//                 <AlertCircle size={16} />
//                 You have reached the 3-path limit. Delete one to create a
//                 new path.
//               </p>
//             )}
//           </>
//         )}

//         {showCreate && (
//           <div className="create-path-form fade-in">
//             <div className="cpf-header">
//               <h3>Create New Learning Path</h3>
//               <button
//                 className="btn-close-sm"
//                 onClick={function () {
//                   setShowCreate(false);
//                   setError('');
//                 }}
//               >
//                 ✕
//               </button>
//             </div>

//             <div className="topic-input-group">
//               <input
//                 type="text"
//                 value={topic}
//                 onChange={function (e) {
//                   setTopic(e.target.value);
//                 }}
//                 placeholder="What do you want to learn?"
//                 className="topic-input"
//                 autoFocus
//               />
//               <Search className="topic-input-icon" size={20} />
//             </div>

//             <div className="suggested-topics">
//               <p className="suggested-label">Suggestions</p>
//               <div className="topic-chips">
//                 {SUGGESTED_TOPICS.map(function (t) {
//                   return (
//                     <button
//                       key={t}
//                       className={
//                         'topic-chip ' + (topic === t ? 'active' : '')
//                       }
//                       onClick={function () {
//                         setTopic(t);
//                       }}
//                     >
//                       {t}
//                     </button>
//                   );
//                 })}
//               </div>
//             </div>

//             <div className="days-selector">
//               <input
//                 type="range"
//                 min="3"
//                 max="30"
//                 value={days}
//                 onChange={function (e) {
//                   setDays(Number(e.target.value));
//                 }}
//                 className="days-slider"
//               />
//               <div className="days-display">
//                 <span className="days-number">{days}</span>
//                 <span className="days-label">days</span>
//               </div>
//             </div>

//             <div className="plan-preview">
//               <div className="preview-item">
//                 <BookOpen className="preview-icon" size={18} /> ~{days * 2}{' '}
//                 lessons
//               </div>
//               <div className="preview-item">
//                 <FileText className="preview-icon" size={18} />{' '}
//                 {Math.floor(days / 3) || 1} quizzes
//               </div>
//               <div className="preview-item">
//                 <Clock className="preview-icon" size={18} /> ~{days * 20} min
//               </div>
//             </div>

//             <div className="cpf-actions">
//               <button
//                 className="btn-secondary"
//                 onClick={function () {
//                   setShowCreate(false);
//                 }}
//               >
//                 <ArrowLeft size={16} /> Cancel
//               </button>
//               <button
//                 className="btn-primary btn-lg"
//                 onClick={handleCreate}
//                 disabled={creating || !topic.trim()}
//                 style={{ flex: 1 }}
//               >
//                 {creating ? (
//                   <span className="loading-content">
//                     <Loader2
//                       size={20}
//                       style={{ animation: 'spin 1s linear infinite' }}
//                     />
//                     Generating plan...
//                   </span>
//                 ) : (
//                   <>
//                     Create Path <Sparkles size={18} />
//                   </>
//                 )}
//               </button>
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }

// src/components/PathSelector.jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLearning } from '../context/LearningContext';
import { useModal } from '../context/ModalContext';
import {
  GraduationCap,
  Plus,
  Trash2,
  BookOpen,
  Search,
  Clock,
  FileText,
  ArrowRight,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Sparkles,
  ChevronRight,
  Calendar,
  LogOut,
} from 'lucide-react';

var SUGGESTED_TOPICS = [
  'Python Programming',
  'Photosynthesis',
  'World War II',
  'Calculus',
  'Machine Learning',
  'Music Theory',
  'Organic Chemistry',
  'Creative Writing',
  'Astronomy',
  'Economics',
  'Human Anatomy',
  'Philosophy',
];

export default function PathSelector() {
  var auth = useAuth();
  var user = auth.user;
  var logout = auth.logout;
  var learning = useLearning();
  var paths = learning.paths;
  var createPath = learning.createPath;
  var deletePath = learning.deletePath;
  var selectPath = learning.selectPath;
  var pathsLoading = learning.pathsLoading;
  var modal = useModal();
  var navigate = useNavigate();

  var [showCreate, setShowCreate] = useState(false);
  var [topic, setTopic] = useState('');
  var [days, setDays] = useState(7);
  var [creating, setCreating] = useState(false);
  var [deleting, setDeleting] = useState(null);
  var [error, setError] = useState('');

  async function handleCreate() {
    if (!topic.trim()) return setError('Please enter a topic');
    setError('');
    setCreating(true);

    try {
      await createPath(topic.trim(), days);
      navigate('/');
    } catch (err) {
      if (err.code === 'PATH_LIMIT_REACHED') {
        modal.showWarning(
          'You can only create 3 learning paths. Delete one to create a new one.',
          { title: 'Path Limit Reached' }
        );
      } else {
        setError(err.message);
      }
    } finally {
      setCreating(false);
    }
  }

  function handleDelete(pathId) {
    modal.showConfirm(
      'Delete this learning path? All progress and saved lessons will be permanently removed.',
      {
        title: 'Delete Learning Path',
        type: 'warning',
        confirmLabel: 'Delete',
        confirmVariant: 'danger',
        cancelLabel: 'Keep',
        onConfirm: async function () {
          setDeleting(pathId);
          try {
            await deletePath(pathId);
          } catch (err) {
            modal.showError(err.message);
          } finally {
            setDeleting(null);
          }
        },
      }
    );
  }

  function handleSelect(pathId) {
    selectPath(pathId);
    navigate('/');
  }

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

  var canCreateMore = paths.length < 3;

  return (
    <div className="path-selector-page">
      <div className="path-selector-header">
        <div className="ps-header-left">
          <div className="logo-mark">
            <div className="logo-icon">
              <img src="src/imgs/logo.png" alt="LearnPath Logo" />
            </div>
            <h1>
              Learn<span>Path</span>
            </h1>
          </div>
        </div>
        <div className="ps-header-right">
          <span className="ps-user-email">
            {user && user.email}
          </span>
          <button className="btn-logout" onClick={handleLogout}>
            <LogOut size={16} /> Log Out
          </button>
        </div>
      </div>

      <div className="path-selector-content">
        <div className="ps-title-section">
          <h2>Your Learning Paths</h2>
          <p>{paths.length}/3 paths created</p>
        </div>

        {error && (
          <div
            className="error-msg"
            style={{ maxWidth: 600, margin: '0 auto 20px' }}
          >
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {pathsLoading ? (
          <div className="ps-loading">
            <Loader2
              size={32}
              style={{
                animation: 'spin 1s linear infinite',
                color: 'var(--primary)',
              }}
            />
            <p>Loading your paths...</p>
          </div>
        ) : (
          <>
            <div className="paths-grid">
              {paths.map(function (path) {
                var total = path.lessons ? path.lessons.length : 0;
                var completed =
                  path.progress && path.progress.completedLessons
                    ? path.progress.completedLessons.length
                    : 0;
                var percent =
                  total > 0 ? Math.round((completed / total) * 100) : 0;

                return (
                  <div key={path._id} className="path-card">
                    <div className="path-card-header">
                      <div className="path-card-icon">
                        <BookOpen size={24} />
                      </div>
                      <button
                        className="path-delete-btn"
                        onClick={function (e) {
                          e.stopPropagation();
                          handleDelete(path._id);
                        }}
                        disabled={deleting === path._id}
                        title="Delete path"
                      >
                        {deleting === path._id ? (
                          <Loader2
                            size={16}
                            style={{
                              animation: 'spin 1s linear infinite',
                            }}
                          />
                        ) : (
                          <Trash2 size={16} />
                        )}
                      </button>
                    </div>

                    <h3 className="path-card-title">{path.topic}</h3>
                    <p className="path-card-meta">
                      <Calendar size={14} /> {path.days} days · {total}{' '}
                      lessons
                    </p>

                    <div className="path-card-progress">
                      <div className="path-progress-bar">
                        <div
                          className="path-progress-fill"
                          style={{ width: percent + '%' }}
                        />
                      </div>
                      <span className="path-progress-text">
                        {completed}/{total} completed
                      </span>
                    </div>

                    <button
                      className="btn-primary btn-full path-continue-btn"
                      onClick={function () {
                        handleSelect(path._id);
                      }}
                    >
                      {completed > 0 ? 'Continue' : 'Start'}
                      <ChevronRight size={18} />
                    </button>
                  </div>
                );
              })}

              {canCreateMore && !showCreate && (
                <button
                  className="path-card path-card-new"
                  onClick={function () {
                    setShowCreate(true);
                  }}
                >
                  <div className="new-path-icon">
                    <Plus size={32} />
                  </div>
                  <h3>New Learning Path</h3>
                  <p>Start learning a new topic</p>
                </button>
              )}
            </div>

            {!canCreateMore && !showCreate && (
              <p className="path-limit-msg">
                <AlertCircle size={16} />
                You have reached the 3-path limit. Delete one to create a
                new path.
              </p>
            )}
          </>
        )}

        {showCreate && (
          <div className="create-path-form fade-in">
            <div className="cpf-header">
              <h3>Create New Learning Path</h3>
              <button
                className="btn-close-sm"
                onClick={function () {
                  setShowCreate(false);
                  setError('');
                }}
              >
                ✕
              </button>
            </div>

            <div className="topic-input-group">
              <input
                type="text"
                value={topic}
                onChange={function (e) {
                  setTopic(e.target.value);
                }}
                placeholder="What do you want to learn?"
                className="topic-input"
                autoFocus
              />
              <Search className="topic-input-icon" size={20} />
            </div>

            <div className="suggested-topics">
              <p className="suggested-label">Suggestions</p>
              <div className="topic-chips">
                {SUGGESTED_TOPICS.map(function (t) {
                  return (
                    <button
                      key={t}
                      className={
                        'topic-chip ' + (topic === t ? 'active' : '')
                      }
                      onClick={function () {
                        setTopic(t);
                      }}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="days-selector">
              <input
                type="range"
                min="3"
                max="30"
                value={days}
                onChange={function (e) {
                  setDays(Number(e.target.value));
                }}
                className="days-slider"
              />
              <div className="days-display">
                <span className="days-number">{days}</span>
                <span className="days-label">days</span>
              </div>
            </div>

            <div className="plan-preview">
              <div className="preview-item">
                <BookOpen className="preview-icon" size={18} /> ~{days * 2}{' '}
                lessons
              </div>
              <div className="preview-item">
                <FileText className="preview-icon" size={18} />{' '}
                {Math.floor(days / 3) || 1} quizzes
              </div>
              <div className="preview-item">
                <Clock className="preview-icon" size={18} /> ~{days * 20} min
              </div>
            </div>

            <div className="cpf-actions">
              <button
                className="btn-secondary"
                onClick={function () {
                  setShowCreate(false);
                }}
              >
                <ArrowLeft size={16} /> Cancel
              </button>
              <button
                className="btn-primary btn-lg"
                onClick={handleCreate}
                disabled={creating || !topic.trim()}
                style={{ flex: 1 }}
              >
                {creating ? (
                  <span className="loading-content">
                    <Loader2
                      size={20}
                      style={{ animation: 'spin 1s linear infinite' }}
                    />
                    Generating plan...
                  </span>
                ) : (
                  <>
                    Create Path <Sparkles size={18} />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer with links */}
      <footer className="ps-footer">
        <div className="ps-footer-links">
          <Link to="/about" className="ps-footer-link">About Us</Link>
          <span className="ps-footer-divider">·</span>
          <Link to="/privacy" className="ps-footer-link">Privacy Policy</Link>
        </div>
        <p className="ps-footer-copy">© {new Date().getFullYear()} LearnPath.ai</p>
      </footer>
    </div>
  );
}