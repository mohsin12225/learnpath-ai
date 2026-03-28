

// netlify/functions/submit-quize.js
const { getSupabase } = require('./utils/supabase');
const { verifyAuth, regenHearts, computeStreak, sanitizeProfile } = require('./utils/auth');
const { saveWrongQuestions, saveAreasToReview, clearWrongQuestions, clearAreasToReview } = require('./utils/wrongQuestions');

function checkAchievements(profile, totalLessonsInPath) {
  var earned = [];
  var has = function (id) { return (profile.achievements || []).indexOf(id) !== -1; };
  var count = profile._completedCount || 0;

  if (!has('first_lesson') && count >= 1) earned.push('first_lesson');
  if (!has('streak_3') && profile.streak >= 3) earned.push('streak_3');
  if (!has('streak_7') && profile.streak >= 7) earned.push('streak_7');
  if (!has('xp_100') && profile.xp >= 100) earned.push('xp_100');
  if (!has('xp_500') && profile.xp >= 500) earned.push('xp_500');
  if (!has('halfway') && count >= Math.floor(totalLessonsInPath / 2)) earned.push('halfway');
  if (!has('graduate') && count >= totalLessonsInPath) earned.push('graduate');
  return earned;
}

function uniqueArray(arr) {
  var seen = {};
  return arr.filter(function (item) { if (seen[item]) return false; seen[item] = true; return true; });
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
    var lessonId = body.lessonId;
    var score = body.score;
    var totalQuestions = body.totalQuestions;
    var wrongAnswerCount = body.wrongAnswers || 0;
    var wrongConcepts = body.wrongConcepts || [];
    var wrongQuestionsList = body.wrongQuestionsList || [];
    var isFinalTest = body.isFinalTest || false;

    if (!pathId || !lessonId || score === undefined || !totalQuestions) {
      return { statusCode: 400, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Missing required fields' }) };
    }

    var supabase = getSupabase();

    // Load path and profile in parallel
    var loaded = await Promise.all([
      supabase.from('paths').select('*').eq('id', pathId).eq('user_id', auth.userId).single(),
      supabase.from('profiles').select('*').eq('id', auth.userId).single(),
    ]);

    var path = loaded[0].data;
    var profile = loaded[1].data;

    if (!path || !profile) {
      return { statusCode: 404, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Path or profile not found' }) };
    }

    var percentage = Math.round((score / totalQuestions) * 100);
    var passed = isFinalTest ? percentage >= 90 : percentage >= 60;
    var isPerfect = wrongAnswerCount === 0 && score === totalQuestions;
    var completedLessons = (path.progress && path.progress.completedLessons) || [];
    var alreadyCompleted = completedLessons.indexOf(lessonId) !== -1;

    // ── Hearts ──
    var currentHearts = regenHearts(profile);
    var lastHeartLoss = profile.last_heart_loss;
    var heartsToLose = Math.min(wrongAnswerCount, currentHearts);
    currentHearts = Math.max(0, currentHearts - heartsToLose);
    if (heartsToLose > 0) lastHeartLoss = Date.now();

    // ── XP ──
    var xpGain = 0;
    if (passed && !alreadyCompleted) {
      xpGain = isFinalTest
        ? 200 + Math.round((score / totalQuestions) * 100)
        : 50 + Math.round((score / totalQuestions) * 50);
    }

    // ── Streak ──
    var today = new Date().toISOString().split('T')[0];
    var streak = profile.streak || 0;
    var longestStreak = profile.longest_streak || 0;
    if (passed && !alreadyCompleted) {
      streak = computeStreak(profile, true);
      if (streak > longestStreak) longestStreak = streak;
    }

    // ── Save wrong questions (path-scoped) ──
    if (wrongQuestionsList.length > 0) {
      var questionsToSave = wrongQuestionsList.map(function (wq) {
        return {
          question: wq.question || '',
          options: wq.options || {},
          correct: wq.correct || 'A',
          explanation: wq.explanation || '',
          lessonId: lessonId,
        };
      });
      var savedCount = await saveWrongQuestions(supabase, auth.userId, pathId, questionsToSave);
      console.log('Saved ' + savedCount + ' wrong questions to path ' + pathId);
    }

    // ── Save areas to review (path-scoped) ──
    if (wrongConcepts.length > 0) {
      await saveAreasToReview(supabase, auth.userId, pathId, wrongConcepts);
    }

    // ── Clear on final test pass ──
    if (isFinalTest && passed) {
      await Promise.all([
        clearWrongQuestions(supabase, auth.userId, pathId),
        clearAreasToReview(supabase, auth.userId, pathId),
      ]);
      console.log('Final test passed! Cleared wrong questions for path ' + pathId);
    }

    // ── Update completed lessons ──
    var updatedCompletedLessons = completedLessons.slice();
    if (passed && !alreadyCompleted) {
      updatedCompletedLessons.push(lessonId);
    }

    // ── Achievements ──
    var profileForAch = {
      achievements: profile.achievements || [],
      xp: (profile.xp || 0) + xpGain,
      streak: streak,
      _completedCount: updatedCompletedLessons.length,
    };
    var newAchievements = checkAchievements(profileForAch, (path.lessons || []).length);
    if (isPerfect) {
      if ((profile.achievements || []).indexOf('perfect_quiz') === -1) newAchievements.push('perfect_quiz');
      if ((profile.achievements || []).indexOf('no_hearts_lost') === -1) newAchievements.push('no_hearts_lost');
    }
    if (isFinalTest && passed && (profile.achievements || []).indexOf('graduate') === -1) {
      newAchievements.push('graduate');
    }
    var allAchievements = uniqueArray((profile.achievements || []).concat(newAchievements));

    // ── Update path progress ──
    if (passed && !alreadyCompleted) {
      var updatedScores = Object.assign({}, (path.progress && path.progress.scores) || {});
      updatedScores[lessonId] = percentage;

      await supabase
        .from('paths')
        .update({
          progress: {
            completedLessons: updatedCompletedLessons,
            scores: updatedScores,
          },
        })
        .eq('id', pathId);
    }

    // ── Update profile ──
    await supabase
      .from('profiles')
      .update({
        xp: (profile.xp || 0) + xpGain,
        hearts: currentHearts,
        last_heart_loss: lastHeartLoss,
        streak: streak,
        longest_streak: longestStreak,
        last_active_date: passed && !alreadyCompleted ? today : profile.last_active_date,
        achievements: allAchievements,
        total_correct: (profile.total_correct || 0) + score,
        total_answered: (profile.total_answered || 0) + totalQuestions,
      })
      .eq('id', auth.userId);

    var responseUser = {
      id: auth.userId,
      email: profile.email,
      xp: (profile.xp || 0) + xpGain,
      hearts: currentHearts,
      maxHearts: profile.max_hearts || 5,
      streak: streak,
      longestStreak: longestStreak,
      achievements: allAchievements,
      totalCorrect: (profile.total_correct || 0) + score,
      totalAnswered: (profile.total_answered || 0) + totalQuestions,
    };

    var responseScores = Object.assign({}, (path.progress && path.progress.scores) || {});
    if (passed) responseScores[lessonId] = percentage;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        passed: passed,
        percentage: percentage,
        xpGain: xpGain,
        isPerfect: isPerfect,
        isFinalTest: isFinalTest,
        finalTestPassed: isFinalTest ? passed : undefined,
        newAchievements: newAchievements,
        user: responseUser,
        progress: {
          completedLessons: updatedCompletedLessons,
          scores: responseScores,
        },
      }),
    };
  } catch (err) {
    console.error('submit-quiz error:', err);
    return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Internal server error' }) };
  }
};