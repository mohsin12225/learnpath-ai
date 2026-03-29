

const { getSupabase, resolveGroqKey } = require('./utils/supabase');
const { verifyAuth } = require('./utils/auth');

// ────────────────────────────────────────
// Difficulty assignment based on position in course
// ────────────────────────────────────────
function assignDifficulties(lessons, totalDays) {
  if (!lessons || lessons.length === 0) return lessons;

  // Separate by type
  var regularLessons = [];
  var quizLessons = [];

  for (var i = 0; i < lessons.length; i++) {
    if (lessons[i].type === 'quiz') {
      quizLessons.push(lessons[i]);
    } else if (lessons[i].type === 'lesson') {
      regularLessons.push(lessons[i]);
    }
  }

  var total = regularLessons.length;
  if (total === 0) return lessons;

  // Split into thirds: easy → medium → hard
  var easyEnd = Math.ceil(total * 0.35);
  var mediumEnd = Math.ceil(total * 0.7);

  for (var r = 0; r < regularLessons.length; r++) {
    if (r < easyEnd) {
      regularLessons[r].difficulty = 'easy';
    } else if (r < mediumEnd) {
      regularLessons[r].difficulty = 'medium';
    } else {
      regularLessons[r].difficulty = 'hard';
    }
  }

  // Quizzes inherit difficulty from the hardest lesson before them
  for (var q = 0; q < quizLessons.length; q++) {
    var quizDay = quizLessons[q].day;
    var hardestBefore = 'easy';

    for (var l = 0; l < regularLessons.length; l++) {
      if (regularLessons[l].day < quizDay) {
        hardestBefore = regularLessons[l].difficulty;
      }
    }

    quizLessons[q].difficulty = hardestBefore;
  }

  // Rebuild in original order
  var result = [];
  var rIdx = 0;
  var qIdx = 0;

  for (var o = 0; o < lessons.length; o++) {
    if (lessons[o].type === 'quiz') {
      if (qIdx < quizLessons.length) {
        result.push(quizLessons[qIdx]);
        qIdx++;
      }
    } else if (lessons[o].type === 'lesson') {
      if (rIdx < regularLessons.length) {
        result.push(regularLessons[rIdx]);
        rIdx++;
      }
    }
  }

  return result;
}

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  var auth = await verifyAuth(event);
  if (auth.error) {
    return {
      statusCode: auth.status,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: auth.error }),
    };
  }

  try {
    var body = JSON.parse(event.body || '{}');
    var topic = body.topic;
    var days = body.days;

    if (!topic || !days || days < 1 || days > 30) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Provide a topic (string) and days (1-30)' }),
      };
    }

    var supabase = getSupabase();

    // Enforce 3-path limit
    var countResult = await supabase
      .from('paths')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', auth.userId);

    if ((countResult.count || 0) >= 3) {
      return {
        statusCode: 403,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'You can only create 3 learning paths. Delete one to create a new one.',
          code: 'PATH_LIMIT_REACHED',
        }),
      };
    }

    // Resolve API key (BYOK or server)
    var keyInfo = await resolveGroqKey(supabase, auth.userId);
    if (!keyInfo.key) {
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'AI service not configured' }),
      };
    }

    var prompt = 'You are an expert curriculum designer. Create a learning plan for "' + topic + '" over ' + days + ' days.\n\n' +
      'PROGRESSIVE DIFFICULTY REQUIREMENTS:\n' +
      '- The course MUST follow a smooth difficulty curve:\n' +
      '  * First ~35% of lessons: EASY — introduce basic concepts, definitions, simple examples\n' +
      '  * Middle ~35% of lessons: MEDIUM — core processes, moderate complexity, some depth\n' +
      '  * Final ~30% of lessons: HARD — deep concepts, connections between topics, advanced reasoning\n' +
      '- Each day should focus on 1-2 related concepts only — do NOT overload any single day\n' +
      '- Each regular day has 2 lessons (type: "lesson")\n' +
      '- After every 3 days of lessons, add a Quiz day with 1 entry (type: "quiz")\n' +
      '- Do NOT include a final test — the system adds that automatically\n' +
      '- Each lesson needs a specific title and 1-sentence description\n\n' +
      'TOPIC DISTRIBUTION RULES:\n' +
      '- Spread concepts evenly across days — no stacking advanced topics in one day\n' +
      '- Early days: fundamentals, vocabulary, basic definitions\n' +
      '- Middle days: processes, mechanisms, relationships\n' +
      '- Later days: analysis, application, connections between concepts\n' +
      '- Save the most complex and cross-cutting topics for later lessons\n\n' +
      'Return JSON:\n{\n' +
      '  "topic": "' + topic + '",\n' +
      '  "totalDays": ' + days + ',\n' +
      '  "description": "Brief course description",\n' +
      '  "lessons": [\n' +
      '    {\n' +
      '      "id": "d1l1",\n' +
      '      "day": 1,\n' +
      '      "lesson": 1,\n' +
      '      "title": "Specific Title",\n' +
      '      "description": "What it covers",\n' +
      '      "type": "lesson"\n' +
      '    }\n' +
      '  ]\n' +
      '}\n\n' +
      'Type field MUST be either "lesson" or "quiz" only.\n' +
      'Do NOT include any entry with type "final_quiz" or "final_test".\n' +
      'Make titles specific and creative. Return ONLY valid JSON.';

    console.log('Creating path: "' + topic + '" (' + days + ' days) for user ' + auth.userId + ' [key: ' + keyInfo.source + ']');

    var aiResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + keyInfo.key,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: 'You are a curriculum designer specializing in progressive difficulty. Distribute topics evenly — easy concepts first, hard concepts last. Each day covers 1-2 related concepts only. Return valid JSON only. No markdown. Only use type "lesson" or "quiz". Do NOT include a final test entry.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 4000,
        response_format: { type: 'json_object' },
      }),
    });

    if (!aiResponse.ok) {
      var errText = await aiResponse.text();
      console.error('Groq API error (' + aiResponse.status + '):', errText);

      if (keyInfo.source === 'byok' && (aiResponse.status === 401 || aiResponse.status === 403)) {
        return {
          statusCode: 502,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            error: 'Your API key is invalid or expired. Please update it in your profile settings.',
            code: 'BYOK_KEY_FAILED',
          }),
        };
      }

      return {
        statusCode: 502,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Failed to generate learning plan' }),
      };
    }

    var aiData = await aiResponse.json();
    var content = '';
    if (aiData.choices && aiData.choices[0] && aiData.choices[0].message) {
      content = aiData.choices[0].message.content || '';
    }
    var cleaned = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

    var plan;
    try {
      plan = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error('AI returned invalid JSON:', cleaned.substring(0, 500));
      return {
        statusCode: 502,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'AI returned invalid response' }),
      };
    }

    // Build lessons array — strip any final_quiz AI may have snuck in
    var lessonsData = (plan.lessons || []).map(function (l) {
      var safeType = l.type;
      if (safeType !== 'lesson' && safeType !== 'quiz') {
        safeType = 'lesson';
      }
      return {
        id: l.id,
        day: l.day,
        lesson: l.lesson || 0,
        title: l.title,
        description: l.description || '',
        type: safeType,
      };
    }).filter(function (l) {
      return l.type === 'lesson' || l.type === 'quiz';
    });

    // ── Assign progressive difficulty ──
    lessonsData = assignDifficulties(lessonsData, days);

    // ── Append hardcoded final test ──
    var lastDay = 0;
    for (var ld = 0; ld < lessonsData.length; ld++) {
      if (lessonsData[ld].day > lastDay) lastDay = lessonsData[ld].day;
    }

    lessonsData.push({
      id: 'final_test',
      day: lastDay + 1,
      lesson: 0,
      title: 'Final Comprehensive Test',
      description: 'Prove your mastery — 20 challenging questions covering everything you learned',
      type: 'final_quiz',
      difficulty: 'very_hard',
    });

    // ── Store path in Supabase ──
    var insertResult = await supabase
      .from('paths')
      .insert({
        user_id: auth.userId,
        topic: plan.topic || topic,
        days: plan.totalDays || days,
        description: plan.description || '',
        lessons: lessonsData,
        progress: { completedLessons: [], scores: {} },
      })
      .select()
      .single();

    if (insertResult.error) {
      console.error('Path insert error:', insertResult.error.message);
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Failed to save learning path' }),
      };
    }

    var pathDoc = insertResult.data;

    // Log difficulty distribution
    var diffCounts = { easy: 0, medium: 0, hard: 0, very_hard: 0 };
    for (var dc = 0; dc < lessonsData.length; dc++) {
      var diff = lessonsData[dc].difficulty || 'unknown';
      if (diffCounts[diff] !== undefined) diffCounts[diff]++;
    }

    console.log(
      'Path created: ' + pathDoc.id +
      ' | ' + lessonsData.length + ' total entries' +
      ' | difficulty: easy=' + diffCounts.easy +
      ' medium=' + diffCounts.medium +
      ' hard=' + diffCounts.hard +
      ' very_hard=' + diffCounts.very_hard
    );

    return {
      statusCode: 201,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: {
          _id: pathDoc.id,
          userId: pathDoc.user_id,
          topic: pathDoc.topic,
          days: pathDoc.days,
          description: pathDoc.description,
          lessons: pathDoc.lessons,
          progress: pathDoc.progress,
          createdAt: pathDoc.created_at,
        },
      }),
    };
  } catch (err) {
    console.error('create-path error:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};