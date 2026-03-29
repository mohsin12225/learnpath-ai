
// // src/components/LessonView.jsx
// import { useState, useEffect } from 'react';
// import { useParams, useNavigate } from 'react-router-dom';
// import { useAuth } from '../context/AuthContext';
// import { useLearning } from '../context/LearningContext';
// import { useModal } from '../context/ModalContext';
// import QuizEngine from './QuizEngine';
// import Confetti from './Confetti';
// import {
//   X,
//   Heart,
//   Loader2,
//   ArrowLeft,
//   ArrowRight,
//   FileText,
//   CheckCircle2,
//   BookOpen,
//   Star,
//   AlertCircle,
//   Lightbulb,
//   Microscope,
//   ListChecks,
//   HandHeart,
//   Trophy,
//   RotateCcw,
//   RefreshCw,
//   Sparkles,
// } from 'lucide-react';

// var SECTION_CONFIG = {
//   intro: { icon: HandHeart, label: 'Introduction', className: 'intro' },
//   concept: { icon: BookOpen, label: 'Concept', className: 'concept' },
//   example: { icon: Lightbulb, label: 'Example', className: 'example' },
//   deep_dive: { icon: Microscope, label: 'Deep Dive', className: 'deep_dive' },
//   summary: { icon: ListChecks, label: 'Summary', className: 'summary' },
// };

// function contentToParagraphs(content) {
//   if (content == null) return ['(No content available)'];

//   if (typeof content === 'string') {
//     var parts = content.split('\n').filter(function (line) {
//       return line.trim().length > 0;
//     });
//     return parts.length > 0 ? parts : ['(Empty section)'];
//   }

//   if (Array.isArray(content)) {
//     var result = [];
//     for (var i = 0; i < content.length; i++) {
//       var item = content[i];
//       if (typeof item === 'string' && item.trim().length > 0) {
//         result.push(item.trim());
//       } else if (item && typeof item === 'object') {
//         var text = item.text || item.content || item.paragraph || item.description || '';
//         if (typeof text === 'string' && text.trim().length > 0) {
//           result.push(text.trim());
//         }
//       }
//     }
//     return result.length > 0 ? result : ['(Empty section)'];
//   }

//   if (typeof content === 'object') {
//     var extracted = content.text || content.body || content.value || '';
//     if (typeof extracted === 'string') return contentToParagraphs(extracted);
//     return ['(Could not display content)'];
//   }

//   return [String(content)];
// }

// function extractSections(data) {
//   if (!data) return [];
//   if (Array.isArray(data.sections) && data.sections.length > 0) return data.sections;
//   if (data.lesson && Array.isArray(data.lesson.sections)) return data.lesson.sections;
//   if (typeof data.content === 'string' && data.content.length > 50) {
//     return [{ type: 'concept', title: data.title || 'Lesson Content', content: data.content }];
//   }
//   return [];
// }

// export default function LessonView() {
//   var params = useParams();
//   var lessonId = params.lessonId;
//   var navigate = useNavigate();
//   var authCtx = useAuth();
//   var user = authCtx.user;
//   var learning = useLearning();
//   var selectedPath = learning.selectedPath;
//   var getLesson = learning.getLesson;
//   var generateQuiz = learning.generateQuiz;
//   var generateFinalTest = learning.generateFinalTest;
//   var submitQuiz = learning.submitQuiz;
//   var preGenerateQuiz = learning.preGenerateQuiz;
//   var prefetchNextLesson = learning.prefetchNextLesson;
//   var modal = useModal();

//   var [sections, setSections] = useState([]);
//   var [questions, setQuestions] = useState([]);
//   var [loading, setLoading] = useState(true);
//   var [quizLoading, setQuizLoading] = useState(false);
//   var [error, setError] = useState('');
//   var [phase, setPhase] = useState('content');
//   var [currentSection, setCurrentSection] = useState(0);
//   var [quizResult, setQuizResult] = useState(null);
//   var [submitError, setSubmitError] = useState('');
//   var [lessonType, setLessonType] = useState('lesson');
//   var [isFinalTest, setIsFinalTest] = useState(false);
//   var [finalTestData, setFinalTestData] = useState(null);
//   var [showConfetti, setShowConfetti] = useState(false);


//   var lessonMeta = null;
//   if (selectedPath && selectedPath.lessons) {
//     for (var i = 0; i < selectedPath.lessons.length; i++) {
//       if (selectedPath.lessons[i].id === lessonId) {
//         lessonMeta = selectedPath.lessons[i];
//         break;
//       }
//     }
//   }
//   // ══ OPTIMIZATION: Pre-generate quiz + pre-fetch next lesson ══
//   useEffect(function () {
//     if (phase !== 'content' || sections.length === 0) return;

//     // Pre-generate quiz while user reads (only for lesson type, not final_quiz)
//     if (lessonType === 'lesson' && !isFinalTest) {
//       preGenerateQuiz(lessonId);
//     }

//     // Pre-fetch next lesson content into localStorage
//     prefetchNextLesson(lessonId);
//   }, [phase, sections.length, lessonId, lessonType, isFinalTest]);
  
//   // ── PHASE 1: Load explanation ──
//   useEffect(function () {
//     if (!lessonMeta) {
//       navigate('/');
//       return;
//     }

//     var cancelled = false;

//     async function loadExplanation() {
//       setLoading(true);
//       setError('');
//       setSections([]);
//       setQuestions([]);
//       setPhase('content');
//       setCurrentSection(0);
//       setQuizResult(null);
//       setSubmitError('');
//       setShowConfetti(false);
//       setFinalTestData(null);

//       try {
//         var data = await getLesson(lessonId);
//         if (cancelled) return;

//         var type = data?.type || lessonMeta.type || 'lesson';
//         setLessonType(type);

//         var isFinal = type === 'final_quiz' || lessonMeta.type === 'final_quiz';
//         setIsFinalTest(isFinal);

//         var extractedSections = extractSections(data);
//         setSections(extractedSections);

//      if (type === 'quiz' || type === 'final_quiz') {
//       if (isFinal) {
//             setPhase('final-test-loading');
//           } else {
//             setPhase('quiz-loading');
//           }
//         } else if (extractedSections.length === 0) {
//           setPhase('quiz-loading');
//         } else {
//           setPhase('content');
//         }
//       } catch (err) {
//         if (!cancelled) {
//           setError(err.message || 'Failed to load lesson');
//         }
//       } finally {
//         if (!cancelled) setLoading(false);
//       }
//     }

//     loadExplanation();
//     return function () { cancelled = true; };
//   }, [lessonId]);



//   // ── Load regular quiz ──
//   useEffect(function () {
//     if (phase !== 'quiz-loading') return;
//     var cancelled = false;

//     async function loadQuiz() {
//       setQuizLoading(true);
//       try {
//         var freshQuestions = await generateQuiz(lessonId);
//         if (cancelled) return;
//         setQuestions(freshQuestions);
//         setPhase('quiz');
//       } catch (err) {
//         if (!cancelled) {
//           setError('Failed to generate quiz: ' + (err.message || ''));
//         }
//       } finally {
//         if (!cancelled) setQuizLoading(false);
//       }
//     }

//     loadQuiz();
//     return function () { cancelled = true; };
//   }, [phase]);

//   // ── Load final test ──
//   useEffect(function () {
//     if (phase !== 'final-test-loading') return;
//     var cancelled = false;

//     async function loadFinalTest() {
//       setQuizLoading(true);
//       try {
//         var result = await generateFinalTest();
//         if (cancelled) return;
//         setFinalTestData(result);
//         setQuestions(result.questions);
//         setPhase('quiz');
//       } catch (err) {
//         if (!cancelled) {
//           setError('Failed to generate final test: ' + (err.message || ''));
//         }
//       } finally {
//         if (!cancelled) setQuizLoading(false);
//       }
//     }

//     loadFinalTest();
//     return function () { cancelled = true; };
//   }, [phase]);

//   function startQuiz() {
//     if (isFinalTest) {
//       setPhase('final-test-loading');
//     } else {
//       setPhase('quiz-loading');
//     }
//   }

//   async function handleQuizComplete(results) {
//     setSubmitError('');
//     setPhase('submitting');

//     try {
//       var submitData = {
//         score: results.score,
//         total: results.total,
//         wrongAnswers: results.wrongAnswers,
//         wrongConcepts: results.wrongConcepts,
//         wrongQuestionsList: results.wrongQuestionsList || [],
//         isFinalTest: isFinalTest,
//         finalTestPassed: isFinalTest ? results.score >= 18 : undefined,
//       };

//       var response = await submitQuiz(lessonId, submitData);
//       setQuizResult(Object.assign({}, response, {
//         score: results.score,
//         totalQ: results.total,
//       }));

//       if (isFinalTest && response.passed) {
//         setShowConfetti(true);
//         setTimeout(function () { setShowConfetti(false); }, 4000);
//       }

//       setPhase('results');
//     } catch (err) {
//       setSubmitError(err.message || 'Failed to submit');

//       var pct = Math.round((results.score / Math.max(results.total, 1)) * 100);
//       setQuizResult({
//         passed: isFinalTest ? results.score >= 18 : pct >= 60,
//         percentage: pct,
//         score: results.score,
//         totalQ: results.total,
//         xpGain: 0,
//         newAchievements: [],
//         submitFailed: true,
//       });
//       setPhase('results');
//     }
//   }

//   function handleRetry() {
//     setQuestions([]);
//     setQuizResult(null);
//     setSubmitError('');
//     setShowConfetti(false);
//     if (isFinalTest) {
//       setPhase('final-test-loading');
//     } else {
//       setPhase('quiz-loading');
//     }
//   }

//   function goToDashboard() {
//     navigate('/');
//   }

//   function renderHearts() {
//     var maxH = (user && user.maxHearts) || 5;
//     var curH = (user && user.hearts) || 0;
//     var hearts = [];
//     for (var h = 0; h < maxH; h++) {
//       hearts.push(
//         <Heart
//           key={h}
//           size={20}
//           className={h < curH ? 'heart-full' : 'heart-empty'}
//           fill={h < curH ? 'currentColor' : 'none'}
//         />
//       );
//     }
//     return hearts;
//   }

//   // ── LOADING ──
//   if (loading) {
//     return (
//       <div className="lesson-loading">
//         <div className="loading-animation">
//           <Loader2 size={48} style={{ color: 'var(--primary)', animation: 'spin 1s linear infinite' }} />
//           <h2>Loading lesson...</h2>
//           <p>Fetching your personalized content</p>
//         </div>
//       </div>
//     );
//   }

//   // ── ERROR ──
//   if (error) {
//     return (
//       <div className="lesson-error">
//         <AlertCircle size={48} style={{ color: 'var(--danger)' }} />
//         <h2>Something went wrong</h2>
//         <p>{error}</p>
//         <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
//           <button className="btn-secondary" onClick={function () { window.location.reload(); }}>
//             <RefreshCw size={16} /> Retry
//           </button>
//           <button className="btn-primary" onClick={goToDashboard}>
//             <ArrowLeft size={16} /> Dashboard
//           </button>
//         </div>
//       </div>
//     );
//   }

//   // ── LOADING QUIZ / FINAL TEST ──
//   if (phase === 'quiz-loading' || phase === 'final-test-loading' || quizLoading) {
//     return (
//       <div className="lesson-loading">
//         <div className="loading-animation">
//           <Loader2 size={48} style={{ color: 'var(--primary)', animation: 'spin 1s linear infinite' }} />
//           {isFinalTest ? (
//             <>
//               <div className="final-test-badge">
//                 <Trophy size={16} /> Final Test
//               </div>
//               <h2>Preparing your Final Test...</h2>
//               <p>Building 20 questions from your learning journey</p>
//             </>
//           ) : (
//             <>
//               <h2>Generating quiz questions...</h2>
//               <p>Creating fresh questions just for you</p>
//             </>
//           )}
//         </div>
//       </div>
//     );
//   }

//   // ── SUBMITTING ──
//   if (phase === 'submitting') {
//     return (
//       <div className="lesson-loading">
//         <div className="loading-animation">
//           <Loader2 size={48} style={{ color: 'var(--primary)', animation: 'spin 1s linear infinite' }} />
//           <h2>Submitting results...</h2>
//         </div>
//       </div>
//     );
//   }

//   // ── RESULTS ──
//   if (phase === 'results' && quizResult) {
//     var passed = quizResult.passed;
//     var percentage = quizResult.percentage;
//     var xpGain = quizResult.xpGain || 0;
//     var newAchievements = quizResult.newAchievements || [];
//     var resultScore = quizResult.score || 0;
//     var resultTotal = quizResult.totalQ || 20;

//     var isFinTestPassed = isFinalTest && passed;
//     var isFinTestFailed = isFinalTest && !passed;

//     return (
//       <div className="lesson-results">
//         <Confetti active={showConfetti} duration={3500} particleCount={100} />

//         <div className="results-card">
//           {isFinTestPassed ? (
//             <>
//               <div className="results-icon pass final-pass">
//                 <Trophy size={48} />
//               </div>
//               <h2 className="final-congrats-title">Congratulations!</h2>
//               <p className="final-congrats-subtitle">You passed the Final Test!</p>
//               <div className="results-score">
//                 <span className="score-value final-score">{resultScore}/{resultTotal}</span>
//                 <span className="score-label">Score</span>
//               </div>

//               {xpGain > 0 && (
//                 <div className="results-rewards">
//                   <div className="reward-item"><Star size={20} /> +{xpGain} XP</div>
//                 </div>
//               )}

//               {newAchievements.length > 0 && (
//                 <div className="results-rewards">
//                   {newAchievements.map(function (a) {
//                     return (
//                       <div key={a} className="reward-item">
//                         <Trophy size={16} /> {a.replace(/_/g, ' ')}
//                       </div>
//                     );
//                   })}
//                 </div>
//               )}

//               <div className="results-actions">
//                 <button
//                   className="btn-primary btn-lg"
//                   onClick={function () { learning.deselectPath(); }}
//                 >
//                   <Sparkles size={18} /> Start Another Learning Path
//                 </button>
//               </div>
//             </>
//           ) : isFinTestFailed ? (
//             <>
//               <div className="results-icon fail">
//                 <BookOpen size={40} />
//               </div>
//               <h2>Almost There!</h2>
//               <div className="results-score">
//                 <span className="score-value">{resultScore}/20</span>
//                 <span className="score-label">You need 18/20 to pass</span>
//               </div>
//               <p className="results-hint">
//                 Don't worry! Review the concepts you missed and try again.
//                 The test will include your weak areas plus new challenging questions.
//               </p>
//               <div className="results-actions">
//                 <button className="btn-primary btn-lg" onClick={handleRetry}>
//                   <RotateCcw size={18} /> Retake Final Test
//                 </button>
//                 <button className="btn-secondary" onClick={goToDashboard}>
//                   <ArrowLeft size={16} /> Review Lessons
//                 </button>
//               </div>
//             </>
//           ) : (
//             <>
//               <div className={'results-icon ' + (passed ? 'pass' : 'fail')}>
//                 {passed ? <CheckCircle2 size={40} /> : <BookOpen size={40} />}
//               </div>
//               <h2>{passed ? 'Lesson Complete!' : 'Keep Practicing!'}</h2>
//               <div className="results-score">
//                 <span className="score-value">{percentage}%</span>
//                 <span className="score-label">Score</span>
//               </div>

//               {passed && xpGain > 0 && (
//                 <div className="results-rewards">
//                   <div className="reward-item"><Star size={20} /> +{xpGain} XP</div>
//                 </div>
//               )}

//               {newAchievements.length > 0 && (
//                 <div className="results-rewards">
//                   {newAchievements.map(function (a) {
//                     return (
//                       <div key={a} className="reward-item">
//                         <Trophy size={16} /> {a.replace(/_/g, ' ')}
//                       </div>
//                     );
//                   })}
//                 </div>
//               )}

//               {submitError && (
//                 <div className="error-msg" style={{ maxWidth: 360, margin: '0 auto 16px' }}>
//                   <AlertCircle size={16} /> {submitError}
//                 </div>
//               )}

//               {!passed && (
//                 <p className="results-hint">
//                   You need at least 60% to pass. Try again — the questions will be different!
//                 </p>
//               )}

//               <div className="results-actions">
//                 <button className="btn-primary btn-lg" onClick={goToDashboard}>
//                   {passed
//                     ? <><ArrowRight size={18} /> Continue Learning</>
//                     : <><ArrowLeft size={18} /> Back to Dashboard</>
//                   }
//                 </button>
//                 {!passed && (
//                   <button className="btn-secondary" onClick={handleRetry}>
//                     <RotateCcw size={16} /> Try Again
//                   </button>
//                 )}
//               </div>
//             </>
//           )}
//         </div>
//       </div>
//     );
//   }

//   // ── QUIZ PHASE ──
//   if (phase === 'quiz') {
//     return (
//       <div className="lesson-page">
//         <div className="lesson-top-bar">
//           <button className="btn-close" onClick={goToDashboard}><X size={20} /></button>
//           <div className="lesson-progress-bar">
//             <div className="progress-fill quiz-progress" style={{ width: '100%' }} />
//           </div>
//           {isFinalTest && (
//             <span className="quiz-final-badge"><Trophy size={12} /> Final</span>
//           )}
//           <div className="hearts-inline">{renderHearts()}</div>
//         </div>
//         {isFinalTest && (
//           <div className="pass-requirement">
//             <AlertCircle size={16} />
//             You need 18/20 correct answers to pass the Final Test
//           </div>
//         )}
//         <QuizEngine questions={questions} onComplete={handleQuizComplete} />
//       </div>
//     );
//   }

//   // ── CONTENT PHASE ──
//   if (sections.length === 0) {
//     startQuiz();
//     return (
//       <div className="lesson-loading">
//         <div className="loading-animation">
//           <Loader2 size={48} style={{ color: 'var(--primary)', animation: 'spin 1s linear infinite' }} />
//           <h2>Loading quiz...</h2>
//         </div>
//       </div>
//     );
//   }

//   var safeIdx = Math.max(0, Math.min(currentSection, sections.length - 1));
//   var section = sections[safeIdx];
//   var isLastSection = safeIdx >= sections.length - 1;
//   var sectionConfig = SECTION_CONFIG[section?.type] || SECTION_CONFIG.concept;
//   var SectionIcon = sectionConfig.icon;
//   var sectionTitle = (section && section.title) || 'Section ' + (safeIdx + 1);
//   var paragraphs = contentToParagraphs(section ? section.content : null);

//   return (
//     <div className="lesson-page">
//       <div className="lesson-top-bar">
//         <button className="btn-close" onClick={goToDashboard}><X size={20} /></button>
//         <div className="lesson-progress-bar">
//           <div
//             className="progress-fill"
//             style={{ width: ((safeIdx + 1) / (sections.length + 1)) * 100 + '%' }}
//           />
//         </div>
//         <div className="hearts-inline">{renderHearts()}</div>
//       </div>

//       <div className="lesson-content">
//         <div className="section-card fade-in" key={'sec-' + safeIdx}>
//           <div className={'section-type-badge ' + sectionConfig.className}>
//             <SectionIcon size={14} />
//             {sectionConfig.label}
//           </div>
//           <h2 className="section-title">{sectionTitle}</h2>
//           <div className="section-body">
//             {paragraphs.map(function (para, idx) {
//               return <p key={idx}>{para}</p>;
//             })}
//           </div>
//         </div>

//         <div className="section-nav">
//           {safeIdx > 0 && (
//             <button
//               className="btn-secondary"
//               onClick={function () { setCurrentSection(function (s) { return Math.max(0, s - 1); }); }}
//             >
//               <ArrowLeft size={16} /> Previous
//             </button>
//           )}
//           <button
//             className="btn-primary btn-lg"
//             onClick={function () {
//               if (isLastSection) {
//                 startQuiz();
//               } else {
//                 setCurrentSection(function (s) { return s + 1; });
//               }
//             }}
//           >
//             {isLastSection
//               ? <><FileText size={18} /> Start Quiz</>
//               : <>Continue <ArrowRight size={18} /></>
//             }
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }
// src/components/LessonView.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLearning } from '../context/LearningContext';
import { useModal } from '../context/ModalContext';
import QuizEngine from './QuizEngine';
import Confetti from './Confetti';
import SpeakableSection from './SpeakableSection';
import {
  X,
  Heart,
  Loader2,
  ArrowLeft,
  ArrowRight,
  FileText,
  CheckCircle2,
  BookOpen,
  Star,
  AlertCircle,
  Lightbulb,
  Microscope,
  ListChecks,
  HandHeart,
  Trophy,
  RotateCcw,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

var SECTION_CONFIG = {
  intro: { icon: HandHeart, label: 'Introduction', className: 'intro' },
  concept: { icon: BookOpen, label: 'Concept', className: 'concept' },
  example: { icon: Lightbulb, label: 'Example', className: 'example' },
  deep_dive: { icon: Microscope, label: 'Deep Dive', className: 'deep_dive' },
  summary: { icon: ListChecks, label: 'Summary', className: 'summary' },
};

function contentToParagraphs(content) {
  if (content == null) return ['(No content available)'];

  if (typeof content === 'string') {
    // Clean up inline bullet symbols and split
    var cleaned = content
      .replace(/•\s*/g, '\n')
      .replace(/^\s*[-–—]\s*/gm, '\n');
    var parts = cleaned.split('\n').filter(function (line) {
      return line.trim().length > 0;
    });
    return parts.length > 0 ? parts : ['(Empty section)'];
  }

  if (Array.isArray(content)) {
    var result = [];
    for (var i = 0; i < content.length; i++) {
      var item = content[i];
      if (typeof item === 'string' && item.trim().length > 0) {
        // Clean bullet symbols from individual items too
        var clean = item.trim().replace(/^[•\-–—]\s*/, '');
        if (clean.length > 0) result.push(clean);
      } else if (item && typeof item === 'object') {
        var text = item.text || item.content || item.paragraph || item.description || '';
        if (typeof text === 'string' && text.trim().length > 0) {
          result.push(text.trim().replace(/^[•\-–—]\s*/, ''));
        }
      }
    }
    return result.length > 0 ? result : ['(Empty section)'];
  }

  if (typeof content === 'object') {
    var extracted = content.text || content.body || content.value || '';
    if (typeof extracted === 'string') return contentToParagraphs(extracted);
    return ['(Could not display content)'];
  }

  return [String(content)];
}

function extractSections(data) {
  if (!data) return [];
  if (Array.isArray(data.sections) && data.sections.length > 0) return data.sections;
  if (data.lesson && Array.isArray(data.lesson.sections)) return data.lesson.sections;
  if (typeof data.content === 'string' && data.content.length > 50) {
    return [{ type: 'concept', title: data.title || 'Lesson Content', content: data.content }];
  }
  return [];
}

export default function LessonView() {
  var params = useParams();
  var lessonId = params.lessonId;
  var navigate = useNavigate();
  var authCtx = useAuth();
  var user = authCtx.user;
  var learning = useLearning();
  var selectedPath = learning.selectedPath;
  var getLesson = learning.getLesson;
  var generateQuiz = learning.generateQuiz;
  var generateFinalTest = learning.generateFinalTest;
  var submitQuiz = learning.submitQuiz;
  var preGenerateQuiz = learning.preGenerateQuiz;
  var prefetchNextLesson = learning.prefetchNextLesson;
  var modal = useModal();

  var [sections, setSections] = useState([]);
  var [questions, setQuestions] = useState([]);
  var [loading, setLoading] = useState(true);
  var [quizLoading, setQuizLoading] = useState(false);
  var [error, setError] = useState('');
  var [phase, setPhase] = useState('content');
  var [currentSection, setCurrentSection] = useState(0);
  var [quizResult, setQuizResult] = useState(null);
  var [submitError, setSubmitError] = useState('');
  var [lessonType, setLessonType] = useState('lesson');
  var [isFinalTest, setIsFinalTest] = useState(false);
  var [finalTestData, setFinalTestData] = useState(null);
  var [showConfetti, setShowConfetti] = useState(false);

  var lessonMeta = null;
  if (selectedPath && selectedPath.lessons) {
    for (var i = 0; i < selectedPath.lessons.length; i++) {
      if (selectedPath.lessons[i].id === lessonId) {
        lessonMeta = selectedPath.lessons[i];
        break;
      }
    }
  }

  // Stop speech when section changes or component unmounts
  useEffect(function () {
    return function () {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [currentSection, lessonId]);

  useEffect(function () {
    if (phase !== 'content' || sections.length === 0) return;
    if (lessonType === 'lesson' && !isFinalTest) {
      preGenerateQuiz(lessonId);
    }
    prefetchNextLesson(lessonId);
  }, [phase, sections.length, lessonId, lessonType, isFinalTest]);

  useEffect(function () {
    if (!lessonMeta) {
      navigate('/');
      return;
    }

    var cancelled = false;

    async function loadExplanation() {
      // Stop any ongoing speech
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }

      setLoading(true);
      setError('');
      setSections([]);
      setQuestions([]);
      setPhase('content');
      setCurrentSection(0);
      setQuizResult(null);
      setSubmitError('');
      setShowConfetti(false);
      setFinalTestData(null);

      try {
        var data = await getLesson(lessonId);
        if (cancelled) return;

        var type = data?.type || lessonMeta.type || 'lesson';
        setLessonType(type);

        var isFinal = type === 'final_quiz' || lessonMeta.type === 'final_quiz';
        setIsFinalTest(isFinal);

        var extractedSections = extractSections(data);
        setSections(extractedSections);

        if (type === 'quiz' || type === 'final_quiz') {
          if (isFinal) {
            setPhase('final-test-loading');
          } else {
            setPhase('quiz-loading');
          }
        } else if (extractedSections.length === 0) {
          setPhase('quiz-loading');
        } else {
          setPhase('content');
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Failed to load lesson');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadExplanation();
    return function () { cancelled = true; };
  }, [lessonId]);

  useEffect(function () {
    if (phase !== 'quiz-loading') return;
    var cancelled = false;

    async function loadQuiz() {
      setQuizLoading(true);
      try {
        var freshQuestions = await generateQuiz(lessonId);
        if (cancelled) return;
        setQuestions(freshQuestions);
        setPhase('quiz');
      } catch (err) {
        if (!cancelled) {
          setError('Failed to generate quiz: ' + (err.message || ''));
        }
      } finally {
        if (!cancelled) setQuizLoading(false);
      }
    }

    loadQuiz();
    return function () { cancelled = true; };
  }, [phase]);

  useEffect(function () {
    if (phase !== 'final-test-loading') return;
    var cancelled = false;

    async function loadFinalTest() {
      setQuizLoading(true);
      try {
        var result = await generateFinalTest();
        if (cancelled) return;
        setFinalTestData(result);
        setQuestions(result.questions);
        setPhase('quiz');
      } catch (err) {
        if (!cancelled) {
          setError('Failed to generate final test: ' + (err.message || ''));
        }
      } finally {
        if (!cancelled) setQuizLoading(false);
      }
    }

    loadFinalTest();
    return function () { cancelled = true; };
  }, [phase]);

  function startQuiz() {
    // Stop any ongoing speech before quiz
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (isFinalTest) {
      setPhase('final-test-loading');
    } else {
      setPhase('quiz-loading');
    }
  }

  async function handleQuizComplete(results) {
    setSubmitError('');
    setPhase('submitting');

    try {
      var submitData = {
        score: results.score,
        total: results.total,
        wrongAnswers: results.wrongAnswers,
        wrongConcepts: results.wrongConcepts,
        wrongQuestionsList: results.wrongQuestionsList || [],
        isFinalTest: isFinalTest,
        finalTestPassed: isFinalTest ? results.score >= 18 : undefined,
      };

      var response = await submitQuiz(lessonId, submitData);
      setQuizResult(Object.assign({}, response, {
        score: results.score,
        totalQ: results.total,
      }));

      if (isFinalTest && response.passed) {
        setShowConfetti(true);
        setTimeout(function () { setShowConfetti(false); }, 4000);
      }

      setPhase('results');
    } catch (err) {
      setSubmitError(err.message || 'Failed to submit');

      var pct = Math.round((results.score / Math.max(results.total, 1)) * 100);
      setQuizResult({
        passed: isFinalTest ? results.score >= 18 : pct >= 60,
        percentage: pct,
        score: results.score,
        totalQ: results.total,
        xpGain: 0,
        newAchievements: [],
        submitFailed: true,
      });
      setPhase('results');
    }
  }

  function handleRetry() {
    setQuestions([]);
    setQuizResult(null);
    setSubmitError('');
    setShowConfetti(false);
    if (isFinalTest) {
      setPhase('final-test-loading');
    } else {
      setPhase('quiz-loading');
    }
  }

  function goToDashboard() {
    // Stop speech before leaving
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    navigate('/');
  }

  function renderHearts() {
    var maxH = (user && user.maxHearts) || 5;
    var curH = (user && user.hearts) || 0;
    var hearts = [];
    for (var h = 0; h < maxH; h++) {
      hearts.push(
        <Heart
          key={h}
          size={20}
          className={h < curH ? 'heart-full' : 'heart-empty'}
          fill={h < curH ? 'currentColor' : 'none'}
        />
      );
    }
    return hearts;
  }

  if (loading) {
    return (
      <div className="lesson-loading">
        <div className="loading-animation">
          <Loader2 size={48} style={{ color: 'var(--primary)', animation: 'spin 1s linear infinite' }} />
          <h2>Loading lesson...</h2>
          <p>Fetching your personalized content</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="lesson-error">
        <AlertCircle size={48} style={{ color: 'var(--danger)' }} />
        <h2>Something went wrong</h2>
        <p>{error}</p>
        <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
          <button className="btn-secondary" onClick={function () { window.location.reload(); }}>
            <RefreshCw size={16} /> Retry
          </button>
          <button className="btn-primary" onClick={goToDashboard}>
            <ArrowLeft size={16} /> Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'quiz-loading' || phase === 'final-test-loading' || quizLoading) {
    return (
      <div className="lesson-loading">
        <div className="loading-animation">
          <Loader2 size={48} style={{ color: 'var(--primary)', animation: 'spin 1s linear infinite' }} />
          {isFinalTest ? (
            <>
              <div className="final-test-badge">
                <Trophy size={16} /> Final Test
              </div>
              <h2>Preparing your Final Test...</h2>
              <p>Building 20 questions from your learning journey</p>
            </>
          ) : (
            <>
              <h2>Generating quiz questions...</h2>
              <p>Creating fresh questions just for you</p>
            </>
          )}
        </div>
      </div>
    );
  }

  if (phase === 'submitting') {
    return (
      <div className="lesson-loading">
        <div className="loading-animation">
          <Loader2 size={48} style={{ color: 'var(--primary)', animation: 'spin 1s linear infinite' }} />
          <h2>Submitting results...</h2>
        </div>
      </div>
    );
  }

  if (phase === 'results' && quizResult) {
    var passed = quizResult.passed;
    var percentage = quizResult.percentage;
    var xpGain = quizResult.xpGain || 0;
    var newAchievements = quizResult.newAchievements || [];
    var resultScore = quizResult.score || 0;
    var resultTotal = quizResult.totalQ || 20;

    var isFinTestPassed = isFinalTest && passed;
    var isFinTestFailed = isFinalTest && !passed;

    return (
      <div className="lesson-results">
        <Confetti active={showConfetti} duration={3500} particleCount={100} />

        <div className="results-card">
          {isFinTestPassed ? (
            <>
              <div className="results-icon pass final-pass">
                <Trophy size={48} />
              </div>
              <h2 className="final-congrats-title">Congratulations!</h2>
              <p className="final-congrats-subtitle">You passed the Final Test!</p>
              <div className="results-score">
                <span className="score-value final-score">{resultScore}/{resultTotal}</span>
                <span className="score-label">Score</span>
              </div>

              {xpGain > 0 && (
                <div className="results-rewards">
                  <div className="reward-item"><Star size={20} /> +{xpGain} XP</div>
                </div>
              )}

              {newAchievements.length > 0 && (
                <div className="results-rewards">
                  {newAchievements.map(function (a) {
                    return (
                      <div key={a} className="reward-item">
                        <Trophy size={16} /> {a.replace(/_/g, ' ')}
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="results-actions">
                <button
                  className="btn-primary btn-lg"
                  onClick={function () { learning.deselectPath(); }}
                >
                  <Sparkles size={18} /> Start Another Learning Path
                </button>
              </div>
            </>
          ) : isFinTestFailed ? (
            <>
              <div className="results-icon fail">
                <BookOpen size={40} />
              </div>
              <h2>Almost There!</h2>
              <div className="results-score">
                <span className="score-value">{resultScore}/20</span>
                <span className="score-label">You need 18/20 to pass</span>
              </div>
              <p className="results-hint">
                Don't worry! Review the concepts you missed and try again.
                The test will include your weak areas plus new challenging questions.
              </p>
              <div className="results-actions">
                <button className="btn-primary btn-lg" onClick={handleRetry}>
                  <RotateCcw size={18} /> Retake Final Test
                </button>
                <button className="btn-secondary" onClick={goToDashboard}>
                  <ArrowLeft size={16} /> Review Lessons
                </button>
              </div>
            </>
          ) : (
            <>
              <div className={'results-icon ' + (passed ? 'pass' : 'fail')}>
                {passed ? <CheckCircle2 size={40} /> : <BookOpen size={40} />}
              </div>
              <h2>{passed ? 'Lesson Complete!' : 'Keep Practicing!'}</h2>
              <div className="results-score">
                <span className="score-value">{percentage}%</span>
                <span className="score-label">Score</span>
              </div>

              {passed && xpGain > 0 && (
                <div className="results-rewards">
                  <div className="reward-item"><Star size={20} /> +{xpGain} XP</div>
                </div>
              )}

              {newAchievements.length > 0 && (
                <div className="results-rewards">
                  {newAchievements.map(function (a) {
                    return (
                      <div key={a} className="reward-item">
                        <Trophy size={16} /> {a.replace(/_/g, ' ')}
                      </div>
                    );
                  })}
                </div>
              )}

              {submitError && (
                <div className="error-msg" style={{ maxWidth: 360, margin: '0 auto 16px' }}>
                  <AlertCircle size={16} /> {submitError}
                </div>
              )}

              {!passed && (
                <p className="results-hint">
                  You need at least 60% to pass. Try again — the questions will be different!
                </p>
              )}

              <div className="results-actions">
                <button className="btn-primary btn-lg" onClick={goToDashboard}>
                  {passed
                    ? <><ArrowRight size={18} /> Continue Learning</>
                    : <><ArrowLeft size={18} /> Back to Dashboard</>
                  }
                </button>
                {!passed && (
                  <button className="btn-secondary" onClick={handleRetry}>
                    <RotateCcw size={16} /> Try Again
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  if (phase === 'quiz') {
    return (
      <div className="lesson-page">
        <div className="lesson-top-bar">
          <button className="btn-close" onClick={goToDashboard}><X size={20} /></button>
          <div className="lesson-progress-bar">
            <div className="progress-fill quiz-progress" style={{ width: '100%' }} />
          </div>
          {isFinalTest && (
            <span className="quiz-final-badge"><Trophy size={12} /> Final</span>
          )}
          <div className="hearts-inline">{renderHearts()}</div>
        </div>
        {isFinalTest && (
          <div className="pass-requirement">
            <AlertCircle size={16} />
            You need 18/20 correct answers to pass the Final Test
          </div>
        )}
        <QuizEngine questions={questions} onComplete={handleQuizComplete} />
      </div>
    );
  }

  if (sections.length === 0) {
    startQuiz();
    return (
      <div className="lesson-loading">
        <div className="loading-animation">
          <Loader2 size={48} style={{ color: 'var(--primary)', animation: 'spin 1s linear infinite' }} />
          <h2>Loading quiz...</h2>
        </div>
      </div>
    );
  }

  var safeIdx = Math.max(0, Math.min(currentSection, sections.length - 1));
  var section = sections[safeIdx];
  var isLastSection = safeIdx >= sections.length - 1;
  var sectionConfig = SECTION_CONFIG[section?.type] || SECTION_CONFIG.concept;
  var SectionIcon = sectionConfig.icon;
  var sectionTitle = (section && section.title) || 'Section ' + (safeIdx + 1);
  var paragraphs = contentToParagraphs(section ? section.content : null);

  return (
    <div className="lesson-page">
      <div className="lesson-top-bar">
        <button className="btn-close" onClick={goToDashboard}><X size={20} /></button>
        <div className="lesson-progress-bar">
          <div
            className="progress-fill"
            style={{ width: ((safeIdx + 1) / (sections.length + 1)) * 100 + '%' }}
          />
        </div>
        <div className="hearts-inline">{renderHearts()}</div>
      </div>

      <div className="lesson-content">
        <div className="section-card fade-in" key={'sec-' + safeIdx}>
          <div className={'section-type-badge ' + sectionConfig.className}>
            <SectionIcon size={14} />
            {sectionConfig.label}
          </div>
          <h2 className="section-title">{sectionTitle}</h2>

          <SpeakableSection
            paragraphs={paragraphs}
            sectionId={lessonId + '-' + safeIdx}
            sectionType={section ? section.type : 'concept'}
          />
        </div>

        <div className="section-nav">
          {safeIdx > 0 && (
            <button
              className="btn-secondary"
              onClick={function () {
                if (window.speechSynthesis) window.speechSynthesis.cancel();
                setCurrentSection(function (s) { return Math.max(0, s - 1); });
              }}
            >
              <ArrowLeft size={16} /> Previous
            </button>
          )}
          <button
            className="btn-primary btn-lg"
            onClick={function () {
              if (window.speechSynthesis) window.speechSynthesis.cancel();
              if (isLastSection) {
                startQuiz();
              } else {
                setCurrentSection(function (s) { return s + 1; });
              }
            }}
          >
            {isLastSection
              ? <><FileText size={18} /> Start Quiz</>
              : <>Continue <ArrowRight size={18} /></>
            }
          </button>
        </div>
      </div>
    </div>
  );
}