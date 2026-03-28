
const { getSupabase, resolveGroqKey } = require('./utils/supabase');
const { verifyAuth } = require('./utils/auth');
const { getWrongQuestions } = require('./utils/wrongQuestions');

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
  while (wrongs.length < 3) wrongs.push('(Invalid option)');
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

async function callGroq(apiKey, messages, options) {
  var model = (options && options.model) || 'llama-3.3-70b-versatile';
  var temperature = options && options.temperature !== undefined ? options.temperature : 0.4;
  var maxTokens = (options && options.maxTokens) || 4000;

  var response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: model, messages: messages,
      temperature: temperature, max_tokens: maxTokens,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) throw new Error('AI API error: ' + response.status);
  var data = await response.json();
  var content = data.choices[0].message.content || '';
  return JSON.parse(content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim());
}

async function buildFullCourseContext(supabase, pathId, path) {
  var result = await supabase
    .from('lessons')
    .select('*')
    .eq('path_id', pathId);

  var allLessons = result.data || [];
  var parts = ['COURSE TOPIC: ' + path.topic];

  allLessons.forEach(function (lesson) {
    if (lesson.sections && Array.isArray(lesson.sections)) {
      parts.push('\n--- ' + (lesson.title || lesson.lesson_id) + ' ---');
      lesson.sections.forEach(function (s) {
        var sContent = typeof s.content === 'string' ? s.content : '';
        if (sContent.length > 0) parts.push(s.title + ': ' + sContent.substring(0, 500));
      });
    }
  });

  var text = parts.join('\n');
  return text.length > 4000 ? text.substring(0, 4000) + '\n[truncated]' : text;
}

async function generateHardQuestions(apiKey, courseContext, count, existingQuestions) {
  var existingTexts = existingQuestions.map(function (q) { return q.question; }).join('\n- ');

  var result = await callGroq(apiKey, [
    { role: 'system', content: 'Expert exam creator. Generate challenging questions. Return correct/wrong answers separately. Valid JSON only.' },
    { role: 'user', content: 'Generate ' + count + ' HARD final exam questions.\n\n=== COURSE CONTENT ===\n' + courseContext + '\n=== END ===\n\nEXISTING (avoid duplicates):\n- ' + existingTexts + '\n\nReturn JSON: { "questions": [{ "id": "hq1", "question": "...", "correct_answer": "...", "wrong_answers": ["...","...","..."], "why_correct": "...", "why_wrong": { "wrong_1": "...", "wrong_2": "...", "wrong_3": "..." } }] }' },
  ], { temperature: 0.6, maxTokens: 4000 });

  return result.questions || [];
}

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

    if (!pathId) {
      return { statusCode: 400, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'pathId is required' }) };
    }

    var supabase = getSupabase();

    var pathResult = await supabase
      .from('paths')
      .select('*')
      .eq('id', pathId)
      .eq('user_id', auth.userId)
      .single();

    if (pathResult.error || !pathResult.data) {
      return { statusCode: 404, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Path not found' }) };
    }

    var path = pathResult.data;
    var TOTAL = 20;
    var PASS = 18;

    // ── Resolve API key FIRST (before any conditional logic) ──
    var keyInfo = await resolveGroqKey(supabase, auth.userId);
    if (!keyInfo.key) {
      return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'AI service not configured' }) };
    }
    var apiKey = keyInfo.key;

    console.log('Final test: path=' + pathId + ' [key: ' + keyInfo.source + ']');

    // Load wrong questions scoped to this path
    var pathWrongQs = await getWrongQuestions(supabase, auth.userId, pathId);

    console.log('Final test: wrong questions for this path = ' + pathWrongQs.length);

    var selectedWrongQs;
    var hardQsNeeded;

    if (pathWrongQs.length >= TOTAL) {
      selectedWrongQs = shuffleArray(pathWrongQs).slice(0, TOTAL);
      hardQsNeeded = 0;
    } else {
      selectedWrongQs = pathWrongQs.slice();
      hardQsNeeded = TOTAL - selectedWrongQs.length;
    }

    var wrongQsFormatted = selectedWrongQs.map(function (wq, idx) {
      return {
        id: 'wq' + (idx + 1),
        question: wq.question,
        options: wq.options || {},
        correct: wq.correct || 'A',
        explanation: wq.explanation || '',
        isFromWrongHistory: true,
      };
    });

    var hardQsFormatted = [];

    if (hardQsNeeded > 0) {
      var courseContext = await buildFullCourseContext(supabase, pathId, path);

      try {
        var hardRaw = await generateHardQuestions(apiKey, courseContext, hardQsNeeded, wrongQsFormatted);
        var positions = getBalancedPositions(hardRaw.length);

        for (var h = 0; h < hardRaw.length; h++) {
          var hq = hardRaw[h];
          if (!hq || !hq.correct_answer || !hq.wrong_answers || hq.wrong_answers.length < 3) continue;

          var shuffled = shuffleAndLabel(
            hq.correct_answer.trim(),
            hq.wrong_answers.slice(0, 3).map(function (w) { return typeof w === 'string' ? w.trim() : String(w); }),
            positions[h]
          );

          var explParts = [shuffled.correctLetter + ' is correct: ' + (hq.why_correct || '')];
          var labels = ['A', 'B', 'C', 'D'];
          var wIdx = 0;
          for (var li = 0; li < labels.length; li++) {
            if (labels[li] === shuffled.correctLetter) continue;
            var reason = (hq.why_wrong && hq.why_wrong['wrong_' + (wIdx + 1)]) || '';
            if (reason) explParts.push(labels[li] + ' is incorrect: ' + reason);
            wIdx++;
          }

          hardQsFormatted.push({
            id: 'hq' + (hardQsFormatted.length + 1),
            question: hq.question.trim(),
            options: shuffled.options,
            correct: shuffled.correctLetter,
            explanation: explParts.join(' '),
            isHardGenerated: true,
          });
        }
      } catch (genErr) {
        console.error('Hard question generation failed:', genErr.message);

        // If BYOK key failed, return specific error
        if (keyInfo.source === 'byok' && genErr.message && genErr.message.indexOf('401') !== -1) {
          return {
            statusCode: 502,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              error: 'Your API key is invalid or expired. Please update it in your profile settings.',
              code: 'BYOK_KEY_FAILED',
            }),
          };
        }
      }
    }

    var allQuestions = wrongQsFormatted.concat(hardQsFormatted);

    // If we still don't have enough questions, pad
    while (allQuestions.length < TOTAL && allQuestions.length > 0) {
      allQuestions.push(Object.assign(
        {},
        allQuestions[Math.floor(Math.random() * allQuestions.length)],
        { id: 'pad' + allQuestions.length }
      ));
    }

    allQuestions = shuffleArray(allQuestions.slice(0, TOTAL));
    allQuestions = allQuestions.map(function (q, idx) {
      return Object.assign({}, q, { id: 'ft' + (idx + 1) });
    });

    var wrongCount = allQuestions.filter(function (q) { return q.isFromWrongHistory; }).length;
    var hardCount = allQuestions.filter(function (q) { return q.isHardGenerated; }).length;

    console.log('Final test: ' + allQuestions.length + ' questions (' + wrongCount + ' wrong history, ' + hardCount + ' hard) [key: ' + keyInfo.source + ']');

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        questions: allQuestions,
        totalQuestions: TOTAL,
        passScore: PASS,
        meta: { fromWrongHistory: wrongCount, hardGenerated: hardCount, totalAvailableWrong: pathWrongQs.length },
      }),
    };
  } catch (err) {
    console.error('generate-final-test error:', err);
    return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Internal server error' }) };
  }
};