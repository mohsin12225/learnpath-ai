
// netlify/functions/generate-quiz.js
const { verifyAuth } = require('./utils/auth');
const { getSupabase, resolveGroqKey } = require('./utils/supabase');

// ════════════════════════════════════════
// UTILITY FUNCTIONS
// ════════════════════════════════════════

function shuffleArray(arr) {
  var shuffled = arr.slice();
  for (var i = shuffled.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var temp = shuffled[i];
    shuffled[i] = shuffled[j];
    shuffled[j] = temp;
  }
  return shuffled;
}

function getBalancedPositions(count) {
  var positions = [];
  var base = Math.floor(count / 4);
  var remainder = count % 4;
  for (var pos = 0; pos < 4; pos++) {
    var qty = base + (pos < remainder ? 1 : 0);
    for (var q = 0; q < qty; q++) positions.push(pos);
  }
  return shuffleArray(positions);
}

function shuffleAndLabel(correctAnswer, wrongAnswers, targetPosition) {
  var wrongs = wrongAnswers.slice(0, 3);
  while (wrongs.length < 3) wrongs.push('(No answer)');
  var shuffledWrongs = shuffleArray(wrongs);
  var options = [];
  var wrongIdx = 0;
  for (var i = 0; i < 4; i++) {
    if (i === targetPosition) options.push(correctAnswer);
    else { options.push(shuffledWrongs[wrongIdx]); wrongIdx++; }
  }
  var labels = ['A', 'B', 'C', 'D'];
  var optionsMap = {};
  for (var k = 0; k < 4; k++) optionsMap[labels[k]] = options[k];
  return { options: optionsMap, correctLetter: labels[targetPosition] };
}

// ════════════════════════════════════════
// TEXT ANALYSIS FUNCTIONS
// ════════════════════════════════════════

function normalizeText(text) {
  if (typeof text !== 'string') return '';
  return text.toLowerCase().trim()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ');
}

function textsAreSimilar(a, b) {
  var na = normalizeText(a);
  var nb = normalizeText(b);
  if (na.length < 2 || nb.length < 2) return false;
  if (na === nb) return true;

  if (na.length > 4 && nb.length > 4) {
    if (na.indexOf(nb) !== -1 || nb.indexOf(na) !== -1) return true;
  }

  var wordsA = na.split(' ').filter(function (w) { return w.length > 2; });
  var wordsB = nb.split(' ').filter(function (w) { return w.length > 2; });
  if (wordsA.length < 2 || wordsB.length < 2) return na === nb;

  var overlap = 0;
  for (var i = 0; i < wordsA.length; i++) {
    for (var j = 0; j < wordsB.length; j++) {
      if (wordsA[i] === wordsB[j]) { overlap++; break; }
    }
  }

  var ratio = overlap / Math.min(wordsA.length, wordsB.length);
  return ratio > 0.75;
}

function answerExistsInLesson(answer, lessonText) {
  var normAnswer = normalizeText(answer);
  var normLesson = normalizeText(lessonText);

  if (normAnswer.length < 3) return false;

  if (normLesson.indexOf(normAnswer) !== -1) return true;

  var answerWords = normAnswer.split(' ').filter(function (w) { return w.length > 3; });
  if (answerWords.length === 0) return false;

  var foundCount = 0;
  for (var i = 0; i < answerWords.length; i++) {
    if (normLesson.indexOf(answerWords[i]) !== -1) foundCount++;
  }

  return (foundCount / answerWords.length) >= 0.7;
}

// ════════════════════════════════════════
// GROQ API CALL
// ════════════════════════════════════════

async function callGroq(apiKey, messages, options) {
  var model = (options && options.model) || 'llama-3.3-70b-versatile';
  var temperature = options && options.temperature !== undefined ? options.temperature : 0.2;
  var maxTokens = (options && options.maxTokens) || 4000;

  var response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: model,
      messages: messages,
      temperature: temperature,
      max_tokens: maxTokens,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    var errText = await response.text();
    console.error('Groq API error (' + response.status + '):', errText);
    throw new Error('AI API error: ' + response.status);
  }

  var data = await response.json();
  var content = '';
  if (data.choices && data.choices[0] && data.choices[0].message) {
    content = data.choices[0].message.content || '';
  }
  return JSON.parse(content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim());
}

// ════════════════════════════════════════
// BUILD LESSON CONTEXT
// ════════════════════════════════════════

function buildExplanationText(savedLesson, path, lessonMeta) {
  var parts = [];
  parts.push('TOPIC: ' + path.topic);
  parts.push('LESSON: ' + (lessonMeta.title || ''));
  if (lessonMeta.description) parts.push('DESCRIPTION: ' + lessonMeta.description);

  if (savedLesson && savedLesson.introduction && typeof savedLesson.introduction === 'string') {
    parts.push('');
    parts.push('INTRODUCTION:');
    parts.push(savedLesson.introduction);
  }

  if (savedLesson && savedLesson.sections && Array.isArray(savedLesson.sections)) {
    for (var i = 0; i < savedLesson.sections.length; i++) {
      var section = savedLesson.sections[i];
      var sTitle = section.title || 'Section ' + (i + 1);
      var sContent = '';
      if (typeof section.content === 'string') sContent = section.content;
      else if (Array.isArray(section.content)) {
        sContent = section.content.map(function (item) {
          return typeof item === 'string' ? item : String(item);
        }).join('\n');
      }
      if (sContent.trim().length > 0) {
        parts.push('');
        parts.push('--- ' + sTitle.toUpperCase() + ' ---');
        parts.push(sContent);
      }
    }
  }

  var text = parts.join('\n');
  return text.length > 3500 ? text.substring(0, 3500) + '\n[Content truncated]' : text;
}

// ════════════════════════════════════════
// PASS 1: GENERATE QUESTIONS
// Fixed: uses 'count' parameter correctly
// ════════════════════════════════════════

async function generateQuestions(apiKey, explanationText, count) {
  var prompt =
    'You are an expert educational assessment designer.\n\n' +
    'Create ' + count + ' quiz questions based STRICTLY on the lesson content below.\n\n' +
    '=== LESSON CONTENT (ONLY SOURCE OF TRUTH) ===\n' +
    explanationText +
    '\n=== END LESSON CONTENT ===\n\n' +
    'CRITICAL RULES:\n' +
    '1. Every question MUST be answerable from the lesson content above.\n' +
    '2. The correct answer MUST be explicitly stated or directly supported by the lesson.\n' +
    '3. Do NOT ask about anything not covered in the lesson.\n' +
    '4. Do NOT create ambiguous, inference, or opinion questions.\n' +
    '5. Each wrong answer must be clearly wrong according to the lesson.\n' +
    '6. Do NOT use "all of the above" or "none of the above".\n' +
    '7. Wrong answers must NOT be partially correct or closely related concepts.\n' +
    '8. All 4 options must be similar in length and grammatical structure.\n\n' +
    'IMPORTANT FORMAT INSTRUCTION:\n' +
    'Return the correct answer and wrong answers SEPARATELY.\n' +
    'Do NOT label them A/B/C/D. The system will shuffle and label them.\n\n' +
    'Return JSON:\n' +
    '{\n' +
    '  "questions": [\n' +
    '    {\n' +
    '      "id": "q1",\n' +
    '      "question": "Clear, specific question?",\n' +
    '      "correct_answer": "The one correct answer text",\n' +
    '      "wrong_answers": [\n' +
    '        "First plausible but clearly wrong answer",\n' +
    '        "Second plausible but clearly wrong answer",\n' +
    '        "Third plausible but clearly wrong answer"\n' +
    '      ],\n' +
    '      "why_correct": "2-3 sentences explaining why the correct answer is right, citing the lesson.",\n' +
    '      "why_wrong": {\n' +
    '        "wrong_1": "Why the first wrong answer is incorrect.",\n' +
    '        "wrong_2": "Why the second wrong answer is incorrect.",\n' +
    '        "wrong_3": "Why the third wrong answer is incorrect."\n' +
    '      },\n' +
    '      "source_fact": "The exact fact from the lesson that supports the correct answer."\n' +
    '    }\n' +
    '  ]\n' +
    '}\n\n' +
    'Generate exactly ' + count + ' questions. Each must have exactly 1 correct_answer and exactly 3 wrong_answers.';

  return await callGroq(apiKey, [
    {
      role: 'system',
      content: 'You create quiz questions ONLY from provided lesson content. ' +
        'Every correct answer must be a direct quote or exact fact from the lesson. ' +
        'Every wrong answer must be clearly, unambiguously wrong — never partially correct. ' +
        'Return valid JSON only.',
    },
    { role: 'user', content: prompt },
  ], { temperature: 0.15, maxTokens: 4500 });
}

// ════════════════════════════════════════
// DETERMINISTIC VALIDATION (code-based)
// ════════════════════════════════════════

function validateQuestionLocally(q, lessonText) {
  var reasons = [];

  if (!q || typeof q !== 'object') return { valid: false, reasons: ['Not an object'] };
  if (!q.question || typeof q.question !== 'string' || q.question.trim().length < 15) {
    return { valid: false, reasons: ['Question too short or missing'] };
  }
  if (!q.correct_answer || typeof q.correct_answer !== 'string' || q.correct_answer.trim().length < 1) {
    return { valid: false, reasons: ['Correct answer missing'] };
  }
  if (!Array.isArray(q.wrong_answers) || q.wrong_answers.length < 3) {
    return { valid: false, reasons: ['Need exactly 3 wrong answers'] };
  }

  var correct = q.correct_answer.trim();
  var wrongs = q.wrong_answers.map(function (w) { return (typeof w === 'string' ? w : String(w)).trim(); });

  if (!answerExistsInLesson(correct, lessonText)) {
    reasons.push('REJECT: Correct answer "' + correct.substring(0, 50) + '" not found in lesson text');
  }

  if (q.source_sentence && typeof q.source_sentence === 'string') {
    if (!answerExistsInLesson(q.source_sentence, lessonText)) {
      reasons.push('REJECT: Source sentence not found in lesson');
    }
  }

  for (var w = 0; w < wrongs.length; w++) {
    if (textsAreSimilar(correct, wrongs[w])) {
      reasons.push('REJECT: Wrong answer "' + wrongs[w].substring(0, 40) + '" is too similar to correct answer');
    }
  }

  for (var a = 0; a < wrongs.length; a++) {
    for (var b = a + 1; b < wrongs.length; b++) {
      if (textsAreSimilar(wrongs[a], wrongs[b])) {
        reasons.push('REJECT: Duplicate wrong answers');
      }
    }
  }

  for (var c = 0; c < wrongs.length; c++) {
    if (answerExistsInLesson(wrongs[c], lessonText)) {
      reasons.push('WARN: Wrong answer "' + wrongs[c].substring(0, 40) + '" appears in lesson');
    }
  }

  var normQuestion = normalizeText(q.question);
  var normCorrect = normalizeText(correct);
  if (normCorrect.length > 5 && normQuestion.indexOf(normCorrect) !== -1) {
    reasons.push('REJECT: Answer appears verbatim in question');
  }

  for (var d = 0; d < wrongs.length; d++) {
    if (wrongs[d].length < 2) {
      reasons.push('REJECT: Empty wrong answer at index ' + d);
    }
  }

  var hasReject = false;
  var warnings = [];
  for (var r = 0; r < reasons.length; r++) {
    if (reasons[r].indexOf('REJECT') === 0) hasReject = true;
    else warnings.push(reasons[r]);
  }

  return {
    valid: !hasReject,
    reasons: reasons,
    warnings: warnings,
    hasWarnings: warnings.length > 0,
  };
}

// ════════════════════════════════════════
// PASS 2: AI CROSS-CHECK
// ════════════════════════════════════════

async function aiCrossCheck(apiKey, questions, explanationText) {
  if (!questions || questions.length === 0) return [];

  var simplified = questions.map(function (q) {
    return {
      id: q.id,
      question: q.question,
      correct_answer: q.correct_answer,
      wrong_answers: q.wrong_answers,
    };
  });

  var prompt =
    'ROLE: You are a fact-checker. Verify each question against the lesson.\n\n' +
    '=== LESSON ===\n' + explanationText + '\n=== END ===\n\n' +
    '=== QUESTIONS ===\n' + JSON.stringify(simplified, null, 2) + '\n=== END ===\n\n' +
    'For each question answer THREE yes/no checks:\n' +
    '1. correct_verified: Is the correct_answer an exact fact from the lesson?\n' +
    '2. wrongs_all_false: Are ALL wrong_answers clearly false per the lesson?\n' +
    '3. unambiguous: Does the question have exactly one possible correct answer?\n\n' +
    'Return JSON:\n' +
    '{\n' +
    '  "checks": [\n' +
    '    { "id": "q1", "correct_verified": true, "wrongs_all_false": true, "unambiguous": true, "pass": true },\n' +
    '    { "id": "q2", "correct_verified": false, "wrongs_all_false": true, "unambiguous": true, "pass": false, "issue": "Reason" }\n' +
    '  ]\n' +
    '}\n\n' +
    'Be EXTREMELY strict. If ANY check is false, set pass to false.';

  try {
    var result = await callGroq(apiKey, [
      {
        role: 'system',
        content: 'You are a strict fact-checker. Verify quiz answers against lesson content. If there is ANY doubt, mark as failed. Return valid JSON only.',
      },
      { role: 'user', content: prompt },
    ], { temperature: 0.05, maxTokens: 2000 });

    return result.checks || [];
  } catch (e) {
    console.warn('AI cross-check failed:', e.message);
    return [];
  }
}

// ════════════════════════════════════════
// BUILD EXPLANATION
// ════════════════════════════════════════

function buildExplanation(rawQ, correctLetter, optionsMap) {
  var parts = [];

  var whyCorrect = rawQ.why_correct || '';
  if (typeof whyCorrect === 'string' && whyCorrect.trim().length > 0) {
    parts.push(correctLetter + ' is correct: ' + whyCorrect.trim());
  } else {
    parts.push(correctLetter + ' ("' + optionsMap[correctLetter] + '") is the correct answer.');
  }

  var letters = ['A', 'B', 'C', 'D'];
  var whyWrong = rawQ.why_wrong || {};
  var wrongIdx = 0;
  for (var i = 0; i < letters.length; i++) {
    if (letters[i] === correctLetter) continue;
    var key = 'wrong_' + (wrongIdx + 1);
    var reason = (typeof whyWrong === 'object') ? (whyWrong[key] || '') : '';
    if (typeof reason === 'string' && reason.trim().length > 0) {
      parts.push(letters[i] + ' is incorrect: ' + reason.trim());
    } else {
      parts.push(letters[i] + ' ("' + optionsMap[letters[i]] + '") is incorrect.');
    }
    wrongIdx++;
  }

  return parts.join(' ');
}

// ════════════════════════════════════════
// ASSEMBLE FINAL QUESTIONS
// ════════════════════════════════════════

function assembleQuestions(rawQuestions, aiChecks, lessonText) {
  var candidates = [];

  for (var i = 0; i < rawQuestions.length; i++) {
    var q = rawQuestions[i];

    var localResult = validateQuestionLocally(q, lessonText);
    if (!localResult.valid) {
      console.log('LOCAL REJECT ' + (q.id || i) + ': ' + localResult.reasons.join('; '));
      continue;
    }

    if (localResult.hasWarnings) {
      console.log('LOCAL WARN ' + (q.id || i) + ': ' + localResult.warnings.join('; '));
    }

    if (aiChecks && aiChecks.length > 0) {
      var aiResult = null;
      for (var c = 0; c < aiChecks.length; c++) {
        if (aiChecks[c].id === q.id) { aiResult = aiChecks[c]; break; }
      }

      if (aiResult && aiResult.pass === false) {
        console.log('AI REJECT ' + q.id + ': ' + (aiResult.issue || 'failed checks'));
        continue;
      }
    }

    candidates.push(q);
  }

  if (candidates.length === 0) return [];

  var positions = getBalancedPositions(candidates.length);
  var final = [];

  for (var f = 0; f < candidates.length; f++) {
    var raw = candidates[f];
    var correctText = raw.correct_answer.trim();
    var wrongTexts = raw.wrong_answers.slice(0, 3).map(function (w) {
      return (typeof w === 'string' ? w : String(w)).trim();
    });

    var shuffled = shuffleAndLabel(correctText, wrongTexts, positions[f]);

    if (shuffled.options[shuffled.correctLetter] !== correctText) {
      console.error('SHUFFLE INTEGRITY FAILURE on ' + raw.id);
      continue;
    }

    var optionValues = [
      shuffled.options.A,
      shuffled.options.B,
      shuffled.options.C,
      shuffled.options.D,
    ];
    var uniqueCheck = true;
    for (var ua = 0; ua < optionValues.length; ua++) {
      for (var ub = ua + 1; ub < optionValues.length; ub++) {
        if (textsAreSimilar(optionValues[ua], optionValues[ub])) {
          uniqueCheck = false;
          break;
        }
      }
      if (!uniqueCheck) break;
    }
    if (!uniqueCheck) continue;

    var explanation = buildExplanation(raw, shuffled.correctLetter, shuffled.options);

    final.push({
      id: 'q' + (final.length + 1),
      question: raw.question.trim(),
      options: shuffled.options,
      correct: shuffled.correctLetter,
      explanation: explanation,
    });
  }

  return final;
}

// ════════════════════════════════════════
// MAIN HANDLER
// ════════════════════════════════════════

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, body: '' };
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  var auth = await verifyAuth(event);
  if (auth.error) {
    return { statusCode: auth.status, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: auth.error }) };
  }

  try {
    var body = JSON.parse(event.body || '{}');
    var pathId = body.pathId;
    var lessonId = body.lessonId;

    if (!pathId || !lessonId) {
      return { statusCode: 400, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'pathId and lessonId are required' }) };
    }

    var supabase = getSupabase();

    var results = await Promise.all([
      supabase.from('paths').select('*').eq('id', pathId).eq('user_id', auth.userId).single(),
      supabase.from('lessons').select('*').eq('path_id', pathId).eq('lesson_id', lessonId).single(),
    ]);

    var path = results[0].data;
    var savedLesson = results[1].data;

    if (!path) {
      return { statusCode: 404, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Path not found' }) };
    }

    var lessonMeta = null;
    var pathLessons = path.lessons || [];
    for (var i = 0; i < pathLessons.length; i++) {
      if (pathLessons[i].id === lessonId) { lessonMeta = pathLessons[i]; break; }
    }

    if (!lessonMeta) {
      return { statusCode: 404, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Lesson not found' }) };
    }

    var keyInfo = await resolveGroqKey(supabase, auth.userId);
    if (!keyInfo.key) {
      return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'AI service not configured' }) };
    }
    var apiKey = keyInfo.key;

    var explanationText = buildExplanationText(savedLesson, path, lessonMeta);
    var targetCount = lessonMeta.type === 'final_quiz' ? 8 : lessonMeta.type === 'quiz' ? 6 : 5;
    var generateCount = targetCount + 4;

    console.log('Quiz | lesson: ' + lessonId + ' | target: ' + targetCount + ' | generating: ' + generateCount + ' [key: ' + keyInfo.source + ']');

    // ═══════════════════════════════════════
    // ATTEMPT 1
    // ═══════════════════════════════════════
    var attempt1Questions = [];
    try {
      var genResult = await generateQuestions(apiKey, explanationText, generateCount);
      var rawQs = genResult.questions || [];
      console.log('Attempt 1 generated: ' + rawQs.length + ' raw questions');

      var aiChecks = [];
      if (rawQs.length > 0) {
        aiChecks = await aiCrossCheck(apiKey, rawQs, explanationText);
        console.log('AI cross-check: ' + aiChecks.length + ' results');
      }

      attempt1Questions = assembleQuestions(rawQs, aiChecks, explanationText);
      console.log('Attempt 1 result: ' + attempt1Questions.length + ' valid questions');
    } catch (err) {
      console.error('Attempt 1 failed:', err.message);
    }

    // ═══════════════════════════════════════
    // ATTEMPT 2: If not enough
    // ═══════════════════════════════════════
    var finalQuestions = attempt1Questions.slice();

    if (finalQuestions.length < targetCount) {
      var needed = targetCount - finalQuestions.length + 3;
      console.log('Attempt 2: need ' + needed + ' more questions');

      try {
        var existingTexts = finalQuestions.map(function (q) { return q.question; });
        var avoidPrompt = existingTexts.length > 0
          ? '\n\nDO NOT duplicate these existing questions:\n- ' + existingTexts.join('\n- ') + '\n'
          : '';

        var gen2Result = await generateQuestions(apiKey, explanationText + avoidPrompt, needed);
        var raw2 = gen2Result.questions || [];
        console.log('Attempt 2 generated: ' + raw2.length + ' raw questions');

        var ai2Checks = [];
        if (raw2.length > 0) {
          ai2Checks = await aiCrossCheck(apiKey, raw2, explanationText);
        }

        var attempt2Questions = assembleQuestions(raw2, ai2Checks, explanationText);
        console.log('Attempt 2 result: ' + attempt2Questions.length + ' valid questions');

        for (var a2 = 0; a2 < attempt2Questions.length && finalQuestions.length < targetCount; a2++) {
          var isDupe = false;
          for (var ex = 0; ex < finalQuestions.length; ex++) {
            if (textsAreSimilar(attempt2Questions[a2].question, finalQuestions[ex].question)) {
              isDupe = true;
              break;
            }
          }
          if (!isDupe) {
            attempt2Questions[a2].id = 'q' + (finalQuestions.length + 1);
            finalQuestions.push(attempt2Questions[a2]);
          }
        }
      } catch (err2) {
        console.warn('Attempt 2 failed:', err2.message);
      }
    }

    // ═══════════════════════════════════════
    // TRIM
    // ═══════════════════════════════════════
    if (finalQuestions.length > targetCount) {
      finalQuestions = finalQuestions.slice(0, targetCount);
      for (var tn = 0; tn < finalQuestions.length; tn++) {
        finalQuestions[tn].id = 'q' + (tn + 1);
      }
    }

    // ═══════════════════════════════════════
    // FINAL SAFETY CHECK
    // ═══════════════════════════════════════
    var safeQuestions = [];
    for (var sq = 0; sq < finalQuestions.length; sq++) {
      var fq = finalQuestions[sq];

      if (!fq.options || !fq.correct || !fq.options[fq.correct]) {
        console.log('FINAL SAFETY REJECT ' + fq.id + ': broken mapping');
        continue;
      }

      var opts = [fq.options.A, fq.options.B, fq.options.C, fq.options.D];
      var allExist = true;
      for (var oe = 0; oe < opts.length; oe++) {
        if (!opts[oe] || opts[oe].trim().length < 1) { allExist = false; break; }
      }
      if (!allExist) {
        console.log('FINAL SAFETY REJECT ' + fq.id + ': missing option');
        continue;
      }

      safeQuestions.push(fq);
    }

    finalQuestions = safeQuestions;

    if (finalQuestions.length === 0) {
      return {
        statusCode: 502,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Could not generate valid quiz questions. The lesson content may be too short.' }),
      };
    }

    var dist = { A: 0, B: 0, C: 0, D: 0 };
    for (var d = 0; d < finalQuestions.length; d++) dist[finalQuestions[d].correct]++;
    console.log('FINAL: ' + finalQuestions.length + '/' + targetCount + ' | dist: ' + JSON.stringify(dist) + ' [' + keyInfo.source + ']');

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        questions: finalQuestions,
        meta: {
          target: targetCount,
          validated: finalQuestions.length,
          distribution: dist,
        },
      }),
    };
  } catch (err) {
    console.error('generate-quiz error:', err);
    return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Internal server error' }) };
  }
};