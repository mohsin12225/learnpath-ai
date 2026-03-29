
// // src/context/LearningContext.jsx
// import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
// import { api } from '../api';
// import { useAuth } from './AuthContext';

// var LearningContext = createContext(null);
// var PATH_KEY = 'learnpath_selected_path';
// var LESSON_CACHE_PREFIX = 'lp_lesson_';
// var LESSON_CACHE_TTL = 86400000; // 24 hours

// var ACHIEVEMENTS_DEF = [
//   { id: 'first_lesson', title: 'First Step', desc: 'Complete your first lesson', iconName: 'Target' },
//   { id: 'perfect_quiz', title: 'Perfect Score', desc: 'Get 100% on a quiz', iconName: 'Award' },
//   { id: 'streak_3', title: 'On Fire', desc: 'Reach a 3-day streak', iconName: 'Flame' },
//   { id: 'streak_7', title: 'Streak Legend', desc: '7-day streak', iconName: 'Zap' },
//   { id: 'xp_100', title: 'XP Hunter', desc: 'Earn 100 XP', iconName: 'Star' },
//   { id: 'xp_500', title: 'XP Master', desc: 'Earn 500 XP', iconName: 'Sparkles' },
//   { id: 'halfway', title: 'Halfway There', desc: 'Complete 50% of lessons', iconName: 'Mountain' },
//   { id: 'graduate', title: 'Graduate', desc: 'Complete all lessons', iconName: 'GraduationCap' },
//   { id: 'no_hearts_lost', title: 'Flawless', desc: 'Complete a quiz losing no hearts', iconName: 'Gem' },
// ];

// function computeStatuses(lessons, completedLessons) {
//   if (!lessons || !lessons.length) return [];

//   // Separate regular lessons/quizzes from the final test
//   var regularLessons = [];
//   var finalTestEntry = null;

//   for (var s = 0; s < lessons.length; s++) {
//     if (lessons[s].type === 'final_quiz') {
//       finalTestEntry = lessons[s];
//     } else {
//       regularLessons.push(lessons[s]);
//     }
//   }

//   var result = [];

//   // Process regular lessons sequentially
//   for (var i = 0; i < regularLessons.length; i++) {
//     var lesson = regularLessons[i];

//     if (completedLessons.indexOf(lesson.id) !== -1) {
//       result.push(Object.assign({}, lesson, { status: 'completed' }));
//     } else if (i === 0 || completedLessons.indexOf(regularLessons[i - 1].id) !== -1) {
//       result.push(Object.assign({}, lesson, { status: 'unlocked' }));
//     } else {
//       result.push(Object.assign({}, lesson, { status: 'locked' }));
//     }
//   }

//   // Process final test — unlocks ONLY when ALL regular lessons are completed
//   if (finalTestEntry) {
//     var allRegularCompleted = true;
//     for (var j = 0; j < regularLessons.length; j++) {
//       if (completedLessons.indexOf(regularLessons[j].id) === -1) {
//         allRegularCompleted = false;
//         break;
//       }
//     }

//     if (completedLessons.indexOf(finalTestEntry.id) !== -1) {
//       result.push(Object.assign({}, finalTestEntry, { status: 'completed' }));
//     } else if (allRegularCompleted) {
//       result.push(Object.assign({}, finalTestEntry, { status: 'unlocked' }));
//     } else {
//       result.push(Object.assign({}, finalTestEntry, { status: 'locked' }));
//     }
//   }

//   return result;

// } 

//   useEffect(function () {
//     if (isAuthenticated) {
//       loadPaths();
//     } else {
//       setPaths([]);
//       setSelectedPath(null);
//     }
//   }, [isAuthenticated]);

//   useEffect(function () {
//     if (paths.length > 0 && !selectedPath) {
//       var savedId = localStorage.getItem(PATH_KEY);
//       if (savedId) {
//         var found = null;
//         for (var i = 0; i < paths.length; i++) {
//           if (paths[i]._id === savedId) {
//             found = paths[i];
//             break;
//           }
//         }
//         if (found) selectPathLocal(found);
//       }
//     }
//   }, [paths]);

//   var loadPaths = useCallback(async function () {
//     setPathsLoading(true);
//     try {
//       var result = await api('get-paths', { method: 'GET' });
//       setPaths(result.paths);
//       return result.paths;
//     } catch (err) {
//       console.error('Failed to load paths:', err);
//       return [];
//     } finally {
//       setPathsLoading(false);
//     }
//   }, []);

//   function selectPathLocal(path) {
//     var completedLessons = (path.progress && path.progress.completedLessons) || [];
//     var withStatuses = Object.assign({}, path, {
//       lessons: computeStatuses(path.lessons, completedLessons),
//     });
//     setSelectedPath(withStatuses);
//     localStorage.setItem(PATH_KEY, path._id);
//   }

//   var selectPath = useCallback(function (pathId) {
//     var found = null;
//     for (var i = 0; i < paths.length; i++) {
//       if (paths[i]._id === pathId) {
//         found = paths[i];
//         break;
//       }
//     }
//     if (found) selectPathLocal(found);
//   }, [paths]);

//   var deselectPath = useCallback(function () {
//     setSelectedPath(null);
//     localStorage.removeItem(PATH_KEY);
//   }, []);

//   var createPath = useCallback(async function (topic, days) {
//     var result = await api('create-path', {
//       method: 'POST',
//       body: JSON.stringify({ topic: topic, days: days }),
//     });
//     setPaths(function (prev) { return [result.path].concat(prev); });
//     selectPathLocal(result.path);
//     return result.path;
//   }, []);

//   var deletePath = useCallback(async function (pathId) {
//     await api('delete-path', {
//       method: 'POST',
//       body: JSON.stringify({ pathId: pathId }),
//     });

//     // ══ NEW: Clear localStorage lesson cache for this path ══
//     clearPathCache(pathId);

//     // ══ NEW: Clear in-memory quiz cache for this path ══
//     var qKeys = Object.keys(quizCacheRef.current);
//     for (var k = 0; k < qKeys.length; k++) {
//       if (qKeys[k].indexOf(pathId + '_') === 0) {
//         delete quizCacheRef.current[qKeys[k]];
//       }
//     }

//     setPaths(function (prev) {
//       return prev.filter(function (p) { return p._id !== pathId; });
//     });
//     if (selectedPath && selectedPath._id === pathId) {
//       setSelectedPath(null);
//       localStorage.removeItem(PATH_KEY);
//     }
//   }, [selectedPath]);

//   // ══ MODIFIED: Get lesson with localStorage cache (Optimization 3) ══
//   var getLesson = useCallback(async function (lessonId) {
//     if (!selectedPath) throw new Error('No path selected');
//     var pathId = selectedPath._id;
//     var cacheKey = LESSON_CACHE_PREFIX + pathId + '_' + lessonId;

//     // 1) Check localStorage cache first — instant return
//     try {
//       var cached = localStorage.getItem(cacheKey);
//       if (cached) {
//         var parsed = JSON.parse(cached);
//         if (parsed.ts && (Date.now() - parsed.ts) < LESSON_CACHE_TTL) {
//           console.log('LOCAL CACHE HIT:', lessonId);
//           return parsed.data;
//         }
//         localStorage.removeItem(cacheKey); // expired
//       }
//     } catch (e) { /* ignore corrupt cache */ }

//     // 2) Fetch from API (server checks MongoDB cache)
//     var result = await api('get-lesson', {
//       method: 'POST',
//       body: JSON.stringify({ pathId: pathId, lessonId: lessonId }),
//     });

//     console.log('Lesson loaded (server cached: ' + result.cached + '):', lessonId);

//     // 3) Save to localStorage for instant future access
//     try {
//       localStorage.setItem(cacheKey, JSON.stringify({
//         data: result.lesson,
//         ts: Date.now(),
//       }));
//     } catch (e) { /* storage full, ignore */ }

//     return result.lesson;
//   }, [selectedPath]);

//   // ══ NEW: Pre-generate quiz in background (Optimization 2) ══
//   var preGenerateQuiz = useCallback(function (lessonId) {
//     if (!selectedPath) return;
//     var key = selectedPath._id + '_' + lessonId;

//     // Already cached or in-flight — don't duplicate
//     if (quizCacheRef.current[key]) return;

//     // Fire-and-forget: store the promise for later retrieval
//     quizCacheRef.current[key] = api('generate-quiz', {
//       method: 'POST',
//       body: JSON.stringify({
//         pathId: selectedPath._id,
//         lessonId: lessonId,
//       }),
//     }).then(function (result) {
//       console.log('Quiz PRE-GENERATED:', lessonId, '(' + result.questions.length + 'q)');
//       return result.questions;
//     }).catch(function (e) {
//       delete quizCacheRef.current[key];
//       console.warn('Quiz pre-gen failed:', e.message);
//       return null;
//     });
//   }, [selectedPath]);

//   // ══ MODIFIED: Generate quiz — uses pre-gen cache if available (Optimization 2) ══
//   var generateQuiz = useCallback(async function (lessonId) {
//     if (!selectedPath) throw new Error('No path selected');
//     var key = selectedPath._id + '_' + lessonId;

//     // Check pre-generated cache (could be a resolved value or in-flight promise)
//     if (quizCacheRef.current[key]) {
//       var questions = await quizCacheRef.current[key];
//       delete quizCacheRef.current[key]; // single use — forces fresh on retry
//       if (questions && questions.length > 0) {
//         console.log('Using PRE-GENERATED quiz:', lessonId);
//         return questions;
//       }
//     }

//     // No cache — generate fresh
//     var result = await api('generate-quiz', {
//       method: 'POST',
//       body: JSON.stringify({
//         pathId: selectedPath._id,
//         lessonId: lessonId,
//       }),
//     });
//     console.log('Fresh quiz generated:', result.questions.length, 'questions');
//     return result.questions;
//   }, [selectedPath]);

//   // ══ NEW: Pre-fetch next lesson content (Optimization 4) ══
//   var prefetchNextLesson = useCallback(function (currentLessonId) {
//     if (!selectedPath || !selectedPath.lessons) return;

//     var lessons = selectedPath.lessons;
//     var currentIdx = -1;
//     for (var i = 0; i < lessons.length; i++) {
//       if (lessons[i].id === currentLessonId) {
//         currentIdx = i;
//         break;
//       }
//     }

//     if (currentIdx < 0 || currentIdx >= lessons.length - 1) return;

//     var nextLesson = lessons[currentIdx + 1];
//     // Silently pre-fetch — getLesson handles localStorage caching
//     getLesson(nextLesson.id).catch(function () {});
//     console.log('Pre-fetching next lesson:', nextLesson.id);
//   }, [selectedPath, getLesson]);

//   var generateFinalTest = useCallback(async function () {
//     if (!selectedPath) throw new Error('No path selected');
//     var result = await api('generate-final-test', {
//       method: 'POST',
//       body: JSON.stringify({ pathId: selectedPath._id }),
//     });
//     console.log(
//       'Final test generated: ' + result.questions.length + ' questions' +
//       ' (pass: ' + result.passScore + '/' + result.totalQuestions + ')'
//     );
//     return result;
//   }, [selectedPath]);

//   var submitQuiz = useCallback(async function (lessonId, results) {
//     if (!selectedPath) throw new Error('No path selected');

//     var response = await api('submit-quiz', {
//       method: 'POST',
//       body: JSON.stringify({
//         pathId: selectedPath._id,
//         lessonId: lessonId,
//         score: results.score,
//         totalQuestions: results.total,
//         wrongAnswers: results.wrongAnswers,
//         wrongConcepts: results.wrongConcepts,
//         wrongQuestionsList: results.wrongQuestionsList || [],
//         isFinalTest: results.isFinalTest || false,
//         finalTestPassed: results.finalTestPassed,
//       }),
//     });

//     updateUserLocal(response.user);

//     if (response.passed) {
//       setSelectedPath(function (prev) {
//         if (!prev) return prev;
//         var updatedLessons = computeStatuses(
//           prev.lessons.map(function (l) {
//             return Object.assign({}, l, { status: undefined });
//           }),
//           response.progress.completedLessons
//         );
//         return Object.assign({}, prev, {
//           lessons: updatedLessons,
//           progress: response.progress,
//         });
//       });

//       setPaths(function (prev) {
//         return prev.map(function (p) {
//           if (p._id === selectedPath._id) {
//             return Object.assign({}, p, { progress: response.progress });
//           }
//           return p;
//         });
//       });
//     }

//     return response;
//   }, [selectedPath, updateUserLocal]);

//   var loseHeartLocal = useCallback(function () {
//     updateUserLocal({
//       hearts: Math.max(0, ((user && user.hearts) || 0) - 1),
//     });
//   }, [user, updateUserLocal]);

//   var addXpLocal = useCallback(function (amount) {
//     updateUserLocal({
//       xp: ((user && user.xp) || 0) + amount,
//     });
//   }, [user, updateUserLocal]);

//   return (
//     <LearningContext.Provider
//       value={{
//         paths: paths,
//         selectedPath: selectedPath,
//         pathsLoading: pathsLoading,
//         ACHIEVEMENTS_DEF: ACHIEVEMENTS_DEF,
//         loadPaths: loadPaths,
//         selectPath: selectPath,
//         deselectPath: deselectPath,
//         createPath: createPath,
//         deletePath: deletePath,
//         getLesson: getLesson,
//         generateQuiz: generateQuiz,
//         generateFinalTest: generateFinalTest,
//         submitQuiz: submitQuiz,
//         loseHeartLocal: loseHeartLocal,
//         addXpLocal: addXpLocal,
//         getPathReview: getPathReview,         // BUG FIX: was missing
//         preGenerateQuiz: preGenerateQuiz,     // NEW
//         prefetchNextLesson: prefetchNextLesson, // NEW
//       }}
//     >
//       {props.children}
//     </LearningContext.Provider>
//   );
// }

// export function useLearning() {
//   var ctx = useContext(LearningContext);
//   if (!ctx) throw new Error('useLearning must be within LearningProvider');
//   return ctx;
// }

// src/context/LearningContext.jsx
import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { api } from '../api';
import { useAuth } from './AuthContext';

var LearningContext = createContext(null);
var PATH_KEY = 'learnpath_selected_path';
var LESSON_CACHE_PREFIX = 'lp_lesson_';
var LESSON_CACHE_TTL = 86400000; // 24 hours

var ACHIEVEMENTS_DEF = [
  { id: 'first_lesson', title: 'First Step', desc: 'Complete your first lesson', iconName: 'Target' },
  { id: 'perfect_quiz', title: 'Perfect Score', desc: 'Get 100% on a quiz', iconName: 'Award' },
  { id: 'streak_3', title: 'On Fire', desc: 'Reach a 3-day streak', iconName: 'Flame' },
  { id: 'streak_7', title: 'Streak Legend', desc: '7-day streak', iconName: 'Zap' },
  { id: 'xp_100', title: 'XP Hunter', desc: 'Earn 100 XP', iconName: 'Star' },
  { id: 'xp_500', title: 'XP Master', desc: 'Earn 500 XP', iconName: 'Sparkles' },
  { id: 'halfway', title: 'Halfway There', desc: 'Complete 50% of lessons', iconName: 'Mountain' },
  { id: 'graduate', title: 'Graduate', desc: 'Complete all lessons', iconName: 'GraduationCap' },
  { id: 'no_hearts_lost', title: 'Flawless', desc: 'Complete a quiz losing no hearts', iconName: 'Gem' },
];

function computeStatuses(lessons, completedLessons) {
  if (!lessons || !lessons.length) return [];

  // Separate regular lessons/quizzes from the final test
  var regularLessons = [];
  var finalTestEntry = null;

  for (var s = 0; s < lessons.length; s++) {
    if (lessons[s].type === 'final_quiz') {
      finalTestEntry = lessons[s];
    } else {
      regularLessons.push(lessons[s]);
    }
  }

  var result = [];

  // Process regular lessons sequentially
  for (var i = 0; i < regularLessons.length; i++) {
    var lesson = regularLessons[i];

    if (completedLessons.indexOf(lesson.id) !== -1) {
      result.push(Object.assign({}, lesson, { status: 'completed' }));
    } else if (i === 0 || completedLessons.indexOf(regularLessons[i - 1].id) !== -1) {
      result.push(Object.assign({}, lesson, { status: 'unlocked' }));
    } else {
      result.push(Object.assign({}, lesson, { status: 'locked' }));
    }
  }

  // Process final test — unlocks ONLY when ALL regular lessons are completed
  if (finalTestEntry) {
    var allRegularCompleted = true;
    for (var j = 0; j < regularLessons.length; j++) {
      if (completedLessons.indexOf(regularLessons[j].id) === -1) {
        allRegularCompleted = false;
        break;
      }
    }

    if (completedLessons.indexOf(finalTestEntry.id) !== -1) {
      result.push(Object.assign({}, finalTestEntry, { status: 'completed' }));
    } else if (allRegularCompleted) {
      result.push(Object.assign({}, finalTestEntry, { status: 'unlocked' }));
    } else {
      result.push(Object.assign({}, finalTestEntry, { status: 'locked' }));
    }
  }

  return result;
}

// Helper: clear all localStorage lesson caches for a specific path
function clearPathCache(pathId) {
  try {
    var prefix = LESSON_CACHE_PREFIX + pathId + '_';
    var keysToRemove = [];
    for (var i = 0; i < localStorage.length; i++) {
      var key = localStorage.key(i);
      if (key && key.indexOf(prefix) === 0) {
        keysToRemove.push(key);
      }
    }
    for (var j = 0; j < keysToRemove.length; j++) {
      localStorage.removeItem(keysToRemove[j]);
    }
  } catch (e) { /* ignore */ }
}

export function LearningProvider(props) {
  var authCtx = useAuth();
  var user = authCtx.user;
  var updateUserLocal = authCtx.updateUserLocal;
  var isAuthenticated = authCtx.isAuthenticated;

  var [paths, setPaths] = useState([]);
  var [selectedPath, setSelectedPath] = useState(null);
  var [pathsLoading, setPathsLoading] = useState(false);

  var quizCacheRef = useRef({});

  var getPathReview = useCallback(async function () {
    if (!selectedPath) throw new Error('No path selected');
    var result = await api('get-path-review', {
      method: 'POST',
      body: JSON.stringify({ pathId: selectedPath._id }),
    });
    return result;
  }, [selectedPath]);

  useEffect(function () {
    if (isAuthenticated) {
      loadPaths();
    } else {
      setPaths([]);
      setSelectedPath(null);
    }
  }, [isAuthenticated]);

  useEffect(function () {
    if (paths.length > 0 && !selectedPath) {
      var savedId = localStorage.getItem(PATH_KEY);
      if (savedId) {
        var found = null;
        for (var i = 0; i < paths.length; i++) {
          if (paths[i]._id === savedId) {
            found = paths[i];
            break;
          }
        }
        if (found) selectPathLocal(found);
      }
    }
  }, [paths]);

  var loadPaths = useCallback(async function () {
    setPathsLoading(true);
    try {
      var result = await api('get-paths', { method: 'GET' });
      setPaths(result.paths);
      return result.paths;
    } catch (err) {
      console.error('Failed to load paths:', err);
      return [];
    } finally {
      setPathsLoading(false);
    }
  }, []);

  function selectPathLocal(path) {
    var completedLessons = (path.progress && path.progress.completedLessons) || [];
    var withStatuses = Object.assign({}, path, {
      lessons: computeStatuses(path.lessons, completedLessons),
    });
    setSelectedPath(withStatuses);
    localStorage.setItem(PATH_KEY, path._id);
  }

  var selectPath = useCallback(function (pathId) {
    var found = null;
    for (var i = 0; i < paths.length; i++) {
      if (paths[i]._id === pathId) {
        found = paths[i];
        break;
      }
    }
    if (found) selectPathLocal(found);
  }, [paths]);

  var deselectPath = useCallback(function () {
    setSelectedPath(null);
    localStorage.removeItem(PATH_KEY);
  }, []);

  var createPath = useCallback(async function (topic, days) {
    var result = await api('create-path', {
      method: 'POST',
      body: JSON.stringify({ topic: topic, days: days }),
    });
    setPaths(function (prev) { return [result.path].concat(prev); });
    selectPathLocal(result.path);
    return result.path;
  }, []);

  var deletePath = useCallback(async function (pathId) {
    await api('delete-path', {
      method: 'POST',
      body: JSON.stringify({ pathId: pathId }),
    });

    clearPathCache(pathId);

    var qKeys = Object.keys(quizCacheRef.current);
    for (var k = 0; k < qKeys.length; k++) {
      if (qKeys[k].indexOf(pathId + '_') === 0) {
        delete quizCacheRef.current[qKeys[k]];
      }
    }

    setPaths(function (prev) {
      return prev.filter(function (p) { return p._id !== pathId; });
    });
    if (selectedPath && selectedPath._id === pathId) {
      setSelectedPath(null);
      localStorage.removeItem(PATH_KEY);
    }
  }, [selectedPath]);

  var getLesson = useCallback(async function (lessonId) {
    if (!selectedPath) throw new Error('No path selected');
    var pathId = selectedPath._id;
    var cacheKey = LESSON_CACHE_PREFIX + pathId + '_' + lessonId;

    try {
      var cached = localStorage.getItem(cacheKey);
      if (cached) {
        var parsed = JSON.parse(cached);
        if (parsed.ts && (Date.now() - parsed.ts) < LESSON_CACHE_TTL) {
          console.log('LOCAL CACHE HIT:', lessonId);
          return parsed.data;
        }
        localStorage.removeItem(cacheKey);
      }
    } catch (e) { /* ignore */ }

    var result = await api('get-lesson', {
      method: 'POST',
      body: JSON.stringify({ pathId: pathId, lessonId: lessonId }),
    });

    console.log('Lesson loaded (server cached: ' + result.cached + '):', lessonId);

    try {
      localStorage.setItem(cacheKey, JSON.stringify({
        data: result.lesson,
        ts: Date.now(),
      }));
    } catch (e) { /* storage full */ }

    return result.lesson;
  }, [selectedPath]);

  var preGenerateQuiz = useCallback(function (lessonId) {
    if (!selectedPath) return;
    var key = selectedPath._id + '_' + lessonId;

    if (quizCacheRef.current[key]) return;

    quizCacheRef.current[key] = api('generate-quiz', {
      method: 'POST',
      body: JSON.stringify({
        pathId: selectedPath._id,
        lessonId: lessonId,
      }),
    }).then(function (result) {
      console.log('Quiz PRE-GENERATED:', lessonId, '(' + result.questions.length + 'q)');
      return result.questions;
    }).catch(function (e) {
      delete quizCacheRef.current[key];
      console.warn('Quiz pre-gen failed:', e.message);
      return null;
    });
  }, [selectedPath]);

  var generateQuiz = useCallback(async function (lessonId) {
    if (!selectedPath) throw new Error('No path selected');
    var key = selectedPath._id + '_' + lessonId;

    if (quizCacheRef.current[key]) {
      var questions = await quizCacheRef.current[key];
      delete quizCacheRef.current[key];
      if (questions && questions.length > 0) {
        console.log('Using PRE-GENERATED quiz:', lessonId);
        return questions;
      }
    }

    var result = await api('generate-quiz', {
      method: 'POST',
      body: JSON.stringify({
        pathId: selectedPath._id,
        lessonId: lessonId,
      }),
    });
    console.log('Fresh quiz generated:', result.questions.length, 'questions');
    return result.questions;
  }, [selectedPath]);

  var prefetchNextLesson = useCallback(function (currentLessonId) {
    if (!selectedPath || !selectedPath.lessons) return;

    var lessons = selectedPath.lessons;
    var currentIdx = -1;
    for (var i = 0; i < lessons.length; i++) {
      if (lessons[i].id === currentLessonId) {
        currentIdx = i;
        break;
      }
    }

    if (currentIdx < 0 || currentIdx >= lessons.length - 1) return;

    var nextLesson = lessons[currentIdx + 1];
    // Don't prefetch the final test — it doesn't use get-lesson
    if (nextLesson.type === 'final_quiz') return;

    getLesson(nextLesson.id).catch(function () {});
    console.log('Pre-fetching next lesson:', nextLesson.id);
  }, [selectedPath, getLesson]);

  var generateFinalTest = useCallback(async function () {
    if (!selectedPath) throw new Error('No path selected');
    var result = await api('generate-final-test', {
      method: 'POST',
      body: JSON.stringify({ pathId: selectedPath._id }),
    });
    console.log(
      'Final test generated: ' + result.questions.length + ' questions' +
      ' (pass: ' + result.passScore + '/' + result.totalQuestions + ')'
    );
    return result;
  }, [selectedPath]);

  var submitQuiz = useCallback(async function (lessonId, results) {
    if (!selectedPath) throw new Error('No path selected');

    var response = await api('submit-quiz', {
      method: 'POST',
      body: JSON.stringify({
        pathId: selectedPath._id,
        lessonId: lessonId,
        score: results.score,
        totalQuestions: results.total,
        wrongAnswers: results.wrongAnswers,
        wrongConcepts: results.wrongConcepts,
        wrongQuestionsList: results.wrongQuestionsList || [],
        isFinalTest: results.isFinalTest || false,
        finalTestPassed: results.finalTestPassed,
      }),
    });

    updateUserLocal(response.user);

    if (response.passed) {
      setSelectedPath(function (prev) {
        if (!prev) return prev;
        var updatedLessons = computeStatuses(
          prev.lessons.map(function (l) {
            return Object.assign({}, l, { status: undefined });
          }),
          response.progress.completedLessons
        );
        return Object.assign({}, prev, {
          lessons: updatedLessons,
          progress: response.progress,
        });
      });

      setPaths(function (prev) {
        return prev.map(function (p) {
          if (p._id === selectedPath._id) {
            return Object.assign({}, p, { progress: response.progress });
          }
          return p;
        });
      });
    }

    return response;
  }, [selectedPath, updateUserLocal]);

  var loseHeartLocal = useCallback(function () {
    updateUserLocal({
      hearts: Math.max(0, ((user && user.hearts) || 0) - 1),
    });
  }, [user, updateUserLocal]);

  var addXpLocal = useCallback(function (amount) {
    updateUserLocal({
      xp: ((user && user.xp) || 0) + amount,
    });
  }, [user, updateUserLocal]);

  return (
    <LearningContext.Provider
      value={{
        paths: paths,
        selectedPath: selectedPath,
        pathsLoading: pathsLoading,
        ACHIEVEMENTS_DEF: ACHIEVEMENTS_DEF,
        loadPaths: loadPaths,
        selectPath: selectPath,
        deselectPath: deselectPath,
        createPath: createPath,
        deletePath: deletePath,
        getLesson: getLesson,
        generateQuiz: generateQuiz,
        generateFinalTest: generateFinalTest,
        submitQuiz: submitQuiz,
        loseHeartLocal: loseHeartLocal,
        addXpLocal: addXpLocal,
        getPathReview: getPathReview,
        preGenerateQuiz: preGenerateQuiz,
        prefetchNextLesson: prefetchNextLesson,
      }}
    >
      {props.children}
    </LearningContext.Provider>
  );
}

export function useLearning() {
  var ctx = useContext(LearningContext);
  if (!ctx) throw new Error('useLearning must be within LearningProvider');
  return ctx;
}