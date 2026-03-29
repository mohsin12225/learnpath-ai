
// netlify/functions/get-lesson.js
const { getSupabase, resolveGroqKey } = require('./utils/supabase');
const { verifyAuth } = require('./utils/auth');

// ────────────────────────────────────────
// Difficulty-specific prompt instructions
// ────────────────────────────────────────
var DIFFICULTY_PROMPTS = {
  easy: {
    style: 'You are teaching someone encountering this subject for the very first time. ' +
      'Start with the WHY — why does this concept exist? What problem does it solve? ' +
      'Define every term the moment you introduce it, using plain everyday language. ' +
      'Use concrete, real-world analogies the student already understands (cooking, driving, building, etc). ' +
      'Explain one idea at a time — never assume prior knowledge. ' +
      'For programming topics: show simple, runnable code examples with line-by-line explanations. ' +
      'For science topics: use observable, tangible examples before abstract theory. ' +
      'For history topics: tell the story — who, what, when, and why it mattered. ' +
      'NEVER write generic filler like "X is a Y" without explaining what that means in practice. ' +
      'Focus on CORE FUNDAMENTALS — not setup, installation, or environment configuration.',
    wordTarget: '150-250 words per section',
    label: 'Beginner',
    sectionGuide: 'intro (why this matters) → concept (what it is, explained clearly) → example (concrete, practical demonstration) → summary (key points)',
  },
  medium: {
    style: 'The student understands the basics and is ready to go deeper. ' +
      'Explain HOW things work under the hood — not just what they do. ' +
      'Show the relationship between this concept and what they already learned. ' +
      'Include practical, real-world examples that demonstrate actual usage. ' +
      'For programming topics: show complete, functional code with varied examples and edge cases. ' +
      'For science topics: explain the mechanism — what causes what, and what happens step by step. ' +
      'For history topics: analyze causes, effects, and connections between events. ' +
      'Use technical vocabulary but always briefly define new terms on first use. ' +
      'Compare and contrast — show when to use X vs Y, and what happens if you choose wrong. ' +
      'NEVER give surface-level definitions — always explain the reasoning behind concepts.',
    wordTarget: '200-300 words per section',
    label: 'Intermediate',
    sectionGuide: 'intro (connect to prior knowledge) → concept (how it works in depth) → example (realistic, practical usage) → summary (key points + common pitfalls)',
  },
  hard: {
    style: 'The student has solid foundations and wants mastery-level understanding. ' +
      'Go deep — explore edge cases, trade-offs, and nuanced decisions. ' +
      'Connect this concept to the broader system — how does it interact with other concepts? ' +
      'Discuss real-world scenarios where this concept is critical. ' +
      'For programming topics: show advanced patterns, performance considerations, and production-ready code. ' +
      'For science topics: discuss exceptions, competing theories, and current research frontiers. ' +
      'For history topics: analyze multiple perspectives, long-term consequences, and historiographical debates. ' +
      'Use precise technical language without hedging. ' +
      'Challenge assumptions — explain common misconceptions and why they are wrong. ' +
      'Include "what would happen if..." thought experiments to deepen understanding.',
    wordTarget: '250-350 words per section',
    label: 'Advanced',
    sectionGuide: 'intro (why this is important at an advanced level) → concept (deep mechanics) → example (complex, real-world scenario) → deep_dive (edge cases, trade-offs, connections) → summary (key insights + advanced tips)',
  },
  very_hard: {
    style: 'Comprehensive mastery-level review. Synthesize all topics learned so far. ' +
      'Connect concepts across the entire course — show how everything fits together. ' +
      'Challenge the student to think critically and apply knowledge to novel situations. ' +
      'Discuss expert-level considerations, best practices, and professional standards.',
    wordTarget: '200-300 words per section',
    label: 'Expert',
    sectionGuide: 'intro (synthesis overview) → concept (cross-topic connections) → example (expert-level application) → summary (mastery checklist)',
  },
};

function getDifficultyPrompt(difficulty) {
  return DIFFICULTY_PROMPTS[difficulty] || DIFFICULTY_PROMPTS.medium;
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
    var pathId = body.pathId;
    var lessonId = body.lessonId;

    if (!pathId || !lessonId) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'pathId and lessonId are required' }),
      };
    }

    var supabase = getSupabase();

    var pathResult = await supabase
      .from('paths')
      .select('*')
      .eq('id', pathId)
      .eq('user_id', auth.userId)
      .single();

    if (pathResult.error || !pathResult.data) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Path not found' }),
      };
    }

    var path = pathResult.data;

    var lessonMeta = null;
    var lessons = path.lessons || [];
    for (var i = 0; i < lessons.length; i++) {
      if (lessons[i].id === lessonId) {
        lessonMeta = lessons[i];
        break;
      }
    }

    if (!lessonMeta) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Lesson not found in this path' }),
      };
    }

    // Check cache
    var cachedResult = await supabase
      .from('lessons')
      .select('*')
      .eq('path_id', pathId)
      .eq('lesson_id', lessonId)
      .single();

    if (cachedResult.data) {
      console.log('CACHE HIT: lesson ' + lessonId + ' in path ' + pathId);
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lesson: {
            title: cachedResult.data.title,
            type: cachedResult.data.type,
            sections: cachedResult.data.sections || null,
            introduction: cachedResult.data.introduction || null,
          },
          cached: true,
        }),
      };
    }

    console.log('CACHE MISS: generating lesson ' + lessonId + ' in path ' + pathId);

    // Resolve API key (BYOK or server)
    var keyInfo = await resolveGroqKey(supabase, auth.userId);
    if (!keyInfo.key) {
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'AI service not configured' }),
      };
    }

    var lessonType = lessonMeta.type;
    var title = lessonMeta.title;
    var description = lessonMeta.description || '';
    var day = lessonMeta.day;
    var lessonNum = lessonMeta.lesson;
    var difficulty = lessonMeta.difficulty || 'medium';
    var diffInfo = getDifficultyPrompt(difficulty);

    console.log('Lesson generation | ' + lessonId + ' | difficulty: ' + difficulty + ' [key: ' + keyInfo.source + ']');

    var prompt;

    if (lessonType === 'quiz' || lessonType === 'final_quiz') {
      prompt =
        'You are preparing a student for a ' +
        (lessonType === 'final_quiz' ? 'comprehensive final exam' : 'review quiz') +
        ' on "' + path.topic + '".\n' +
        'This is Day ' + day + ', titled "' + title + '".\n' +
        'Difficulty level: ' + diffInfo.label + '\n\n' +
        'Write a motivating, substantive review overview that:\n' +
        '- Reminds the student of the KEY concepts they should know\n' +
        '- Highlights the most important ideas, terms, or processes to review\n' +
        '- Gives them confidence but also tells them what to focus on\n' +
        '- Feels like a real teacher preparing them, not a generic summary\n\n' +
        'Return JSON with ONLY the introduction (NO quiz questions):\n' +
        '{\n  "title": "' + title + '",\n  "type": "' + lessonType + '",\n' +
        '  "introduction": "A substantive 4-6 sentence overview that reviews key concepts and prepares the student."\n}\n\n' +
        'Return ONLY valid JSON. Do NOT include any questions.';
    } else {
      var isFirstLesson = (day === 1 && lessonNum === 1);

      var introRequirement = isFirstLesson
        ? 'INTRODUCTION REQUIREMENTS (THIS IS THE FIRST LESSON):\n' +
          'The introduction section MUST include ALL of the following:\n' +
          '1. A clear, simple explanation of what "' + path.topic + '" is\n' +
          '2. Why it matters — real-world importance and relevance\n' +
          '3. Key foundational facts: who created/discovered it, when, where, and why\n' +
          '4. The main purpose or problem it solves\n' +
          '5. A brief mention of what the student will learn in this lesson\n\n' +
          'Structure the intro as: Hook → What it is → Why it matters → Key facts → What you will learn\n' +
          'Include SPECIFIC facts (names, dates, numbers) — NOT vague statements.\n' +
          'These facts WILL be tested in the quiz, so they must be explicitly stated.\n\n'
        : 'INTRODUCTION REQUIREMENTS:\n' +
          'Start with a brief connection to what was learned previously.\n' +
          'Clearly state what this lesson covers and why it matters.\n' +
          'Include 1-2 specific facts or definitions that set up the main content.\n\n';

      var quizAlignmentRule =
        'CRITICAL — QUIZ ALIGNMENT RULE:\n' +
        'After this lesson, the student will be quizzed ONLY on facts explicitly stated here.\n' +
        'Therefore, you MUST:\n' +
        '- State important facts EXPLICITLY (names, definitions, processes, comparisons)\n' +
        '- Do NOT assume the student knows anything not written in this lesson\n' +
        '- Include specific, concrete, testable information — not vague generalities\n' +
        '- Every key concept must be DEFINED and EXPLAINED, not just mentioned\n' +
        '- If something is important, write it out clearly so it can be tested\n\n';

      prompt =
        'Create a detailed educational lesson explanation for the topic "' + path.topic + '".\n' +
        'Lesson title: "' + title + '"\n' +
        'Description: "' + description + '"\n' +
        'Day ' + day + ', Lesson ' + lessonNum + '\n\n' +
        introRequirement +
        quizAlignmentRule +
        'Return JSON with ONLY the explanation (NO quiz questions):\n' +
        '{\n' +
        '  "title": "' + title + '",\n' +
        '  "type": "lesson",\n' +
        '  "sections": [\n' +
        '    {\n' +
        '      "type": "intro",\n' +
        '      "title": "Introduction",\n' +
        '      "content": "Write 2-3 detailed paragraphs. Include specific facts, names, dates, definitions. This content will be tested in quizzes."\n' +
        '    },\n' +
        '    {\n' +
        '      "type": "concept",\n' +
        '      "title": "Core Concept Name",\n' +
        '      "content": "Write 2-4 detailed paragraphs. Define every term clearly. State facts explicitly. Include comparisons and specific details."\n' +
        '    },\n' +
        '    {\n' +
        '      "type": "example",\n' +
        '      "title": "Practical Example",\n' +
        '      "content": "Write 2-3 paragraphs with concrete examples. Show how concepts work in practice with specific details."\n' +
        '    },\n' +
        '    {\n' +
        '      "type": "deep_dive",\n' +
        '      "title": "Going Deeper",\n' +
        '      "content": "Write 2-3 paragraphs of advanced detail. Include important facts, edge cases, and nuances."\n' +
        '    },\n' +
        '    {\n' +
         '    {\n' +
        '      "type": "summary",\n' +
        '      "title": "Key Takeaways",\n' +
        '      "content": ["Each takeaway as a separate string in this array", "One clear fact per item", "Include every key name, definition, and concept from the lesson", "Return 5-8 takeaways covering all important facts"]\n' +
        '    }\n' +
        '  ]\n' +
        '}\n\n' +
        'IMPORTANT RULES:\n' +

        '- Each section "content" must be a STRING, EXCEPT for "summary" type which must be an ARRAY of strings\n'
        '- Write rich, detailed explanations (each section ' + diffInfo.wordTarget + ')\n' +
        '- Include SPECIFIC, TESTABLE facts — not vague descriptions\n' +
        '- The summary must list ALL key facts as bullet points\n' +
        '- Do NOT include any quiz questions\n' +
        '- Return ONLY valid JSON';
    }
    // if (lessonType === 'quiz' || lessonType === 'final_quiz') {
    //   prompt =
    //     'You are preparing a student for a ' +
    //     (lessonType === 'final_quiz' ? 'comprehensive final exam' : 'review quiz') +
    //     ' on "' + path.topic + '".\n' +
    //     'This is Day ' + day + ', titled "' + title + '".\n' +
    //     'Difficulty level: ' + diffInfo.label + '\n\n' +
    //     'Write a motivating, substantive review overview that:\n' +
    //     '- Reminds the student of the KEY concepts they should know\n' +
    //     '- Highlights the most important ideas, terms, or processes to review\n' +
    //     '- Gives them confidence but also tells them what to focus on\n' +
    //     '- Feels like a real teacher preparing them, not a generic summary\n\n' +
    //     'Return JSON with ONLY the introduction (NO quiz questions):\n' +
    //     '{\n  "title": "' + title + '",\n  "type": "' + lessonType + '",\n' +
    //     '  "introduction": "A substantive 4-6 sentence overview that reviews key concepts and prepares the student."\n}\n\n' +
    //     'Return ONLY valid JSON. Do NOT include any questions.';
    // } else {
    //   prompt =
    //     'Create a detailed educational lesson explanation for the topic "' + path.topic + '".\n' +
    //     'Lesson title: "' + title + '"\n' +
    //     'Description: "' + description + '"\n' +
    //     'Day ' + day + ', Lesson ' + lessonNum + '\n' +
    //     '\nReturn JSON with ONLY the explanation (NO quiz questions):\n' +
    //     '{\n' +
    //     '  "title": "' + title + '",\n' +
    //     '  "type": "lesson",\n' +
    //     '  "sections": [\n' +
    //     '    {\n' +
    //     '      "type": "intro",\n' +
    //     '      "title": "Introduction",\n' +
    //     '      "content": "Write 2-3 detailed paragraphs as a single string."\n' +
    //     '    },\n' +
    //     '    {\n' +
    //     '      "type": "concept",\n' +
    //     '      "title": "Core Concept Name",\n' +
    //     '      "content": "Write 2-4 detailed paragraphs as a single string."\n' +
    //     '    },\n' +
    //     '    {\n' +
    //     '      "type": "example",\n' +
    //     '      "title": "Practical Example",\n' +
    //     '      "content": "Write 2-3 paragraphs with concrete examples as a single string."\n' +
    //     '    },\n' +
    //     '    {\n' +
    //     '      "type": "deep_dive",\n' +
    //     '      "title": "Going Deeper",\n' +
    //     '      "content": "Write 2-3 paragraphs of advanced detail as a single string."\n' +
    //     '    },\n' +
    //     '    {\n' +
    //     '      "type": "summary",\n' +
    //     '      "title": "Key Takeaways",\n' +
    //     '      "content": "Write bullet points as a single string, like: • Point 1\\n• Point 2"\n' +
    //     '    }\n' +
    //     '  ]\n' +
    //     '}\n\n' +
    //     'IMPORTANT RULES:\n' +
    //     '- Each section "content" must be a STRING, not an array\n' +
    //     '- Write rich, detailed explanations (each section 150-300 words)\n' +
    //     '- Do NOT include any quiz questions\n' +
    //     '- Return ONLY valid JSON';
    // }

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
            content: '' + difficulty.toUpperCase() + '. ' +
              diffInfo.style + ' ' +
              'Return valid JSON only. No markdown. Every "content" field must be a string, never an array. No quiz questions.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 2500,
        response_format: { type: 'json_object' },
      }),
    });

    if (!aiResponse.ok) {
      var errText = await aiResponse.text();
      console.error('Groq error (' + aiResponse.status + '):', errText);

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
        body: JSON.stringify({ error: 'AI generation failed' }),
      };
    }

    var aiData = await aiResponse.json();
    var aiContent = '';
    if (aiData.choices && aiData.choices[0] && aiData.choices[0].message) {
      aiContent = aiData.choices[0].message.content || '';
    }

    var cleanedContent = aiContent.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

    var lessonContent;
    try {
      lessonContent = JSON.parse(cleanedContent);
    } catch (parseErr) {
      console.error('AI JSON parse error:', cleanedContent.substring(0, 500));
      return {
        statusCode: 502,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'AI returned invalid content' }),
      };
    }

    // Sanitize sections
    // if (lessonContent.sections && Array.isArray(lessonContent.sections)) {
    //   lessonContent.sections = lessonContent.sections.map(function (s) {
    //     var sContent = s.content;
    //     if (Array.isArray(sContent)) {
    //       sContent = sContent.map(function (item) {
    //         if (typeof item === 'string') return item;
    //         if (item && typeof item === 'object') return item.text || item.content || JSON.stringify(item);
    //         return String(item);
    //       }).join('\n\n');
    //     }
    //     if (sContent && typeof sContent === 'object' && !Array.isArray(sContent)) {
    //       sContent = sContent.text || sContent.body || sContent.value || JSON.stringify(sContent);
    //     }
    //     if (typeof sContent !== 'string') sContent = sContent != null ? String(sContent) : '';
    //     return { type: s.type || 'concept', title: s.title || 'Section', content: sContent };
    //   });
    // }
    if (lessonContent.sections && Array.isArray(lessonContent.sections)) {
      lessonContent.sections = lessonContent.sections.map(function (s) {
        var sContent = s.content;
        var sType = s.type || 'concept';

        // For summary type, keep as array if it's already an array
        if (sType === 'summary' && Array.isArray(sContent)) {
          // Clean each item
          sContent = sContent.filter(function (item) {
            return typeof item === 'string' && item.trim().length > 0;
          }).map(function (item) {
            return item.trim().replace(/^[•\-–—]\s*/, '');
          });
          if (sContent.length === 0) sContent = ['No takeaways available'];
          return { type: sType, title: s.title || 'Key Takeaways', content: sContent };
        }

        // For non-summary sections, convert to string as before
        if (Array.isArray(sContent)) {
          sContent = sContent.map(function (item) {
            if (typeof item === 'string') return item;
            if (item && typeof item === 'object') return item.text || item.content || JSON.stringify(item);
            return String(item);
          }).join('\n\n');
        }
        if (sContent && typeof sContent === 'object' && !Array.isArray(sContent)) {
          sContent = sContent.text || sContent.body || sContent.value || JSON.stringify(sContent);
        }
        if (typeof sContent !== 'string') sContent = sContent != null ? String(sContent) : '';
        return { type: sType, title: s.title || 'Section', content: sContent };
      });
    }

    delete lessonContent.questions;
    delete lessonContent.quiz;
    delete lessonContent.quiz_questions;

    // Save to cache
    var insertLessonResult = await supabase
      .from('lessons')
      .insert({
        path_id: pathId,
        lesson_id: lessonId,
        type: lessonContent.type || lessonType,
        title: lessonContent.title || title,
        sections: lessonContent.sections || null,
        introduction: lessonContent.introduction || null,
      });

    if (insertLessonResult.error) {
      if (insertLessonResult.error.code === '23505') {
        console.log('Lesson already saved by concurrent request');
      } else {
        console.error('Failed to cache lesson:', insertLessonResult.error.message);
      }
    } else {
      console.log('SAVED lesson ' + lessonId + ' | difficulty: ' + difficulty + ' [key: ' + keyInfo.source + ']');
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lesson: {
          title: lessonContent.title || title,
          type: lessonContent.type || lessonType,
          sections: lessonContent.sections || null,
          introduction: lessonContent.introduction || null,
        },
        cached: false,
      }),
    };
  } catch (err) {
    console.error('get-lesson error:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};