
import { useState, useEffect } from 'react';
import { useLearning } from '../context/LearningContext';
import {
  Check,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Star,
  AlertCircle,
} from 'lucide-react';

var LABELS = ['A', 'B', 'C', 'D'];

function sanitizeQuestions(raw) {
  if (!raw || !Array.isArray(raw)) return [];

  var result = [];

  for (var i = 0; i < raw.length; i++) {
    var q = raw[i];
    if (!q || typeof q !== 'object') continue;

    var questionText = q.question || q.text || '';
    if (typeof questionText !== 'string' || questionText.trim().length < 5) continue;

    var optionsArray = [];

    if (q.options && typeof q.options === 'object' && !Array.isArray(q.options)) {
      for (var li = 0; li < LABELS.length; li++) {
        var label = LABELS[li];
        if (q.options[label] !== undefined) {
          var optText = q.options[label];
          optionsArray.push(typeof optText === 'string' ? optText : String(optText));
        }
      }
    } else if (Array.isArray(q.options)) {
      for (var ai = 0; ai < q.options.length && ai < 4; ai++) {
        var item = q.options[ai];
        var cleaned = typeof item === 'string' ? item : String(item || '');
        cleaned = cleaned.replace(/^\(?[A-Da-d][.):\s]+\s*/g, '').trim();
        optionsArray.push(cleaned);
      }
    }

    if (optionsArray.length < 2) continue;

    var correctIndex = 0;
    var correct = q.correct;

    if (typeof correct === 'string') {
      var upper = correct.trim().toUpperCase();
      var letterMap = { A: 0, B: 1, C: 2, D: 3 };
      if (letterMap[upper] !== undefined) {
        correctIndex = letterMap[upper];
      } else if (/^[0-3]$/.test(upper)) {
        correctIndex = parseInt(upper, 10);
      }
    } else if (typeof correct === 'number') {
      correctIndex = correct;
    }

    if (correctIndex < 0 || correctIndex >= optionsArray.length) {
      correctIndex = 0;
    }

    var explanation = q.explanation || '';
    if (typeof explanation !== 'string') explanation = String(explanation || '');

    result.push({
      id: q.id || 'q' + (result.length + 1),
      question: questionText.trim(),
      options: optionsArray,
      correctIndex: correctIndex,
      correctLetter: LABELS[correctIndex] || 'A',
      explanation: explanation.trim(),
    });
  }

  return result;
}

export default function QuizEngine(props) {
  var rawQuestions = props.questions;
  var onComplete = props.onComplete;

  var learning = useLearning();
  var loseHeartLocal = learning.loseHeartLocal;
  var addXpLocal = learning.addXpLocal;

  var [questions, setQuestions] = useState([]);
  var [current, setCurrent] = useState(0);
  var [selected, setSelected] = useState(null);
  var [showResult, setShowResult] = useState(false);
  var [score, setScore] = useState(0);
  var [wrongConcepts, setWrongConcepts] = useState([]);
  var [wrongAnswers, setWrongAnswers] = useState(0);
  var [wrongQuestionsList, setWrongQuestionsList] = useState([]);
  var [hasError, setHasError] = useState(false);

  useEffect(function () {
    try {
      var cleaned = sanitizeQuestions(rawQuestions);
      setQuestions(cleaned);
      setCurrent(0);
      setSelected(null);
      setShowResult(false);
      setScore(0);
      setWrongConcepts([]);
      setWrongAnswers(0);
      setWrongQuestionsList([]);
      setHasError(false);
    } catch (err) {
      console.error('QuizEngine sanitization error:', err);
      setHasError(true);
    }
  }, [rawQuestions]);

  if (hasError) {
    return (
      <div className="quiz-empty">
        <AlertCircle size={48} style={{ color: 'var(--danger)', marginBottom: 16 }} />
        <h3>Quiz Error</h3>
        <p>There was a problem loading the quiz questions.</p>
        <button
          className="btn-primary"
          style={{ marginTop: 20 }}
          onClick={function () {
            onComplete({ score: 0, total: 1, wrongAnswers: 0, wrongConcepts: [], wrongQuestionsList: [] });
          }}
        >
          Skip & Continue <ArrowRight size={16} />
        </button>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="quiz-empty">
        <CheckCircle2 size={48} style={{ color: 'var(--primary)', marginBottom: 16 }} />
        <h3>No Quiz Questions</h3>
        <p>This lesson will be marked as complete.</p>
        <button
          className="btn-primary"
          style={{ marginTop: 20 }}
          onClick={function () {
            onComplete({ score: 1, total: 1, wrongAnswers: 0, wrongConcepts: [], wrongQuestionsList: [] });
          }}
        >
          Continue <ArrowRight size={16} />
        </button>
      </div>
    );
  }

  if (current >= questions.length) {
    return null;
  }

  var question = questions[current];

  if (!question || !question.options || question.options.length < 2) {
    return (
      <div className="quiz-empty">
        <AlertCircle size={48} style={{ color: 'var(--warning)', marginBottom: 16 }} />
        <p>Invalid question data.</p>
        <button
          className="btn-primary"
          style={{ marginTop: 20 }}
          onClick={function () {
            onComplete({
              score: score,
              total: Math.max(questions.length, 1),
              wrongAnswers: wrongAnswers,
              wrongConcepts: wrongConcepts,
              wrongQuestionsList: wrongQuestionsList,
            });
          }}
        >
          Continue <ArrowRight size={16} />
        </button>
      </div>
    );
  }

  var isCorrect = selected === question.correctIndex;
  var isLast = current >= questions.length - 1;

  function handleSelect(optionIndex) {
    if (showResult) return;
    setSelected(optionIndex);
  }

  function handleCheck() {
    if (selected === null) return;
    setShowResult(true);

    if (selected === question.correctIndex) {
      setScore(function (s) { return s + 1; });
      try { addXpLocal(10); } catch (e) { /* */ }
    } else {
      try { loseHeartLocal(); } catch (e) { /* */ }
      setWrongAnswers(function (w) { return w + 1; });
      setWrongConcepts(function (wc) {
        return wc.concat([question.question || 'Unknown']);
      });
      setWrongQuestionsList(function (wql) {
        var optionsObj = {};
        for (var oi = 0; oi < question.options.length; oi++) {
          optionsObj[LABELS[oi]] = question.options[oi];
        }
        return wql.concat([{
          question: question.question,
          options: optionsObj,
          correct: question.correctLetter,
          explanation: question.explanation,
        }]);
      });
    }
  }

  function handleNext() {
    if (isLast) {
      onComplete({
        score: score,
        total: questions.length,
        wrongAnswers: wrongAnswers,
        wrongConcepts: wrongConcepts,
        wrongQuestionsList: wrongQuestionsList,
      });
    } else {
      setCurrent(function (c) { return c + 1; });
      setSelected(null);
      setShowResult(false);
    }
  }

  // Recalculate isCorrect with current state for render
  var selectedIsCorrect = selected === question.correctIndex;

  return (
    <div className="quiz-engine">
      <div className="quiz-progress-info">
        <span>Question {current + 1} of {questions.length}</span>
        <span className="quiz-score">
          <Star size={14} /> {score}/{current + (showResult ? 1 : 0)}
        </span>
      </div>

      <div className="quiz-question fade-in" key={'q-' + current}>
        <h3 className="question-text">{question.question}</h3>

        <div className="quiz-options">
          {question.options.map(function (opt, i) {
            var cls = 'quiz-option';

            if (showResult) {
              if (i === question.correctIndex) {
                cls += ' correct';
              } else if (i === selected && !selectedIsCorrect) {
                cls += ' incorrect';
              }
            } else if (i === selected) {
              cls += ' selected';
            }

            return (
              <button
                key={i}
                className={cls}
                onClick={function () { handleSelect(i); }}
                disabled={showResult}
              >
                <span className="option-letter">{LABELS[i] || '?'}</span>
                <span className="option-text">{opt}</span>
                {showResult && i === question.correctIndex && (
                  <span className="option-icon"><CheckCircle2 size={22} /></span>
                )}
                {showResult && i === selected && !selectedIsCorrect && i !== question.correctIndex && (
                  <span className="option-icon"><XCircle size={22} /></span>
                )}
              </button>
            );
          })}
        </div>

        {showResult && (
          <div className={'quiz-feedback fade-in ' + (selectedIsCorrect ? 'feedback-correct' : 'feedback-incorrect')}>
            <div className="feedback-header">
              {selectedIsCorrect
                ? <><CheckCircle2 size={20} /> Correct!</>
                : <><XCircle size={20} /> Incorrect</>
              }
            </div>
            {question.explanation && (
              <p className="feedback-explanation">{question.explanation}</p>
            )}
            {!selectedIsCorrect && (
              <p className="feedback-correct-was">
                <strong>
                  Correct answer: {question.correctLetter}. {question.options[question.correctIndex]}
                </strong>
              </p>
            )}
          </div>
        )}
      </div>

      <div className="quiz-actions">
        {!showResult ? (
          <button
            className="btn-primary btn-lg btn-full"
            disabled={selected === null}
            onClick={handleCheck}
          >
            <Check size={18} /> Check Answer
          </button>
        ) : (
          <button className="btn-primary btn-lg btn-full" onClick={handleNext}>
            {isLast
              ? 'See Results'
              : <><ArrowRight size={18} /> Next Question</>
            }
          </button>
        )}
      </div>
    </div>
  );
}