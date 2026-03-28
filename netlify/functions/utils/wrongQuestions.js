// // netlify/functions/utils/wrongQuestions.js
// //
// // Centralized logic for saving and loading wrong questions
// // Always scoped to a specific userId + pathId
// //

// const { ObjectId } = require('mongodb');

// // Simple hash to detect duplicate questions
// function hashQuestion(questionText) {
//   var hash = 0;
//   var str = (questionText || '').toLowerCase().trim();
//   for (var i = 0; i < str.length; i++) {
//     var char = str.charCodeAt(i);
//     hash = ((hash << 5) - hash) + char;
//     hash = hash & hash; // Convert to 32-bit integer
//   }
//   return 'qh_' + Math.abs(hash).toString(36);
// }

// // ── Save wrong questions for a specific path ──
// async function saveWrongQuestions(db, userId, pathId, wrongQuestionsList) {
//   if (!wrongQuestionsList || wrongQuestionsList.length === 0) return 0;

//   var userObjId = typeof userId === 'string' ? new ObjectId(userId) : userId;
//   var pathIdStr = typeof pathId === 'string' ? pathId : pathId.toString();
//   var now = new Date();
//   var savedCount = 0;

//   for (var i = 0; i < wrongQuestionsList.length; i++) {
//     var wq = wrongQuestionsList[i];
//     if (!wq || !wq.question) continue;

//     var qHash = hashQuestion(wq.question);

//     var doc = {
//       userId: userObjId,
//       pathId: pathIdStr,
//       questionHash: qHash,
//       question: wq.question || '',
//       options: wq.options || {},
//       correct: wq.correct || 'A',
//       explanation: wq.explanation || '',
//       lessonId: wq.lessonId || '',
//       createdAt: now,
//     };

//     try {
//       await db.collection('wrong_mcqs').insertOne(doc);
//       savedCount++;
//     } catch (err) {
//       if (err.code === 11000) {
//         // Duplicate — same question already saved for this path
//         // This is expected and correct behavior
//       } else {
//         console.error('Error saving wrong question:', err.message);
//       }
//     }
//   }

//   return savedCount;
// }

// // ── Load wrong questions for a specific path ──
// async function getWrongQuestions(db, userId, pathId) {
//   var userObjId = typeof userId === 'string' ? new ObjectId(userId) : userId;
//   var pathIdStr = typeof pathId === 'string' ? pathId : pathId.toString();

//   var questions = await db
//     .collection('wrong_mcqs')
//     .find({
//       userId: userObjId,
//       pathId: pathIdStr,
//     })
//     .sort({ createdAt: -1 })
//     .toArray();

//   // Convert ObjectIds to strings for JSON
//   return questions.map(function (q) {
//     return {
//       _id: q._id.toString(),
//       pathId: q.pathId,
//       question: q.question,
//       options: q.options,
//       correct: q.correct,
//       explanation: q.explanation,
//       lessonId: q.lessonId || '',
//       createdAt: q.createdAt,
//     };
//   });
// }

// // ── Clear wrong questions for a path (when user passes final test) ──
// async function clearWrongQuestions(db, userId, pathId) {
//   var userObjId = typeof userId === 'string' ? new ObjectId(userId) : userId;
//   var pathIdStr = typeof pathId === 'string' ? pathId : pathId.toString();

//   var result = await db.collection('wrong_mcqs').deleteMany({
//     userId: userObjId,
//     pathId: pathIdStr,
//   });

//   return result.deletedCount;
// }

// // ── Count wrong questions for a path ──
// async function countWrongQuestions(db, userId, pathId) {
//   var userObjId = typeof userId === 'string' ? new ObjectId(userId) : userId;
//   var pathIdStr = typeof pathId === 'string' ? pathId : pathId.toString();

//   return await db.collection('wrong_mcqs').countDocuments({
//     userId: userObjId,
//     pathId: pathIdStr,
//   });
// }

// // ── Save area to review for a specific path ──
// async function saveAreaToReview(db, userId, pathId, topic) {
//   if (!topic || typeof topic !== 'string' || topic.trim().length === 0) return;

//   var userObjId = typeof userId === 'string' ? new ObjectId(userId) : userId;
//   var pathIdStr = typeof pathId === 'string' ? pathId : pathId.toString();

//   try {
//     await db.collection('areas_to_review').insertOne({
//       userId: userObjId,
//       pathId: pathIdStr,
//       topic: topic.trim(),
//       createdAt: new Date(),
//     });
//   } catch (err) {
//     if (err.code !== 11000) {
//       console.error('Error saving area to review:', err.message);
//     }
//     // 11000 = duplicate, already saved
//   }
// }

// // ── Save multiple areas to review ──
// async function saveAreasToReview(db, userId, pathId, topics) {
//   if (!topics || !Array.isArray(topics)) return;

//   for (var i = 0; i < topics.length; i++) {
//     await saveAreaToReview(db, userId, pathId, topics[i]);
//   }
// }

// // ── Get areas to review for a specific path ──
// async function getAreasToReview(db, userId, pathId) {
//   var userObjId = typeof userId === 'string' ? new ObjectId(userId) : userId;
//   var pathIdStr = typeof pathId === 'string' ? pathId : pathId.toString();

//   var areas = await db
//     .collection('areas_to_review')
//     .find({
//       userId: userObjId,
//       pathId: pathIdStr,
//     })
//     .sort({ createdAt: -1 })
//     .limit(30)
//     .toArray();

//   return areas.map(function (a) {
//     return {
//       _id: a._id.toString(),
//       topic: a.topic,
//       createdAt: a.createdAt,
//     };
//   });
// }

// // ── Clear areas to review for a path ──
// async function clearAreasToReview(db, userId, pathId) {
//   var userObjId = typeof userId === 'string' ? new ObjectId(userId) : userId;
//   var pathIdStr = typeof pathId === 'string' ? pathId : pathId.toString();

//   var result = await db.collection('areas_to_review').deleteMany({
//     userId: userObjId,
//     pathId: pathIdStr,
//   });

//   return result.deletedCount;
// }

// module.exports = {
//   saveWrongQuestions: saveWrongQuestions,
//   getWrongQuestions: getWrongQuestions,
//   clearWrongQuestions: clearWrongQuestions,
//   countWrongQuestions: countWrongQuestions,
//   saveAreaToReview: saveAreaToReview,
//   saveAreasToReview: saveAreasToReview,
//   getAreasToReview: getAreasToReview,
//   clearAreasToReview: clearAreasToReview,
//   hashQuestion: hashQuestion,
// };

// netlify/functions/utils/wrongQuestions.js
// Fully migrated to Supabase — no ObjectId, uses UUID strings

function hashQuestion(questionText) {
  var hash = 0;
  var str = (questionText || '').toLowerCase().trim();
  for (var i = 0; i < str.length; i++) {
    var char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return 'qh_' + Math.abs(hash).toString(36);
}

// ── Save wrong questions for a specific path ──
async function saveWrongQuestions(supabase, userId, pathId, wrongQuestionsList) {
  if (!wrongQuestionsList || wrongQuestionsList.length === 0) return 0;

  var savedCount = 0;

  for (var i = 0; i < wrongQuestionsList.length; i++) {
    var wq = wrongQuestionsList[i];
    if (!wq || !wq.question) continue;

    var qHash = hashQuestion(wq.question);

    var result = await supabase
      .from('wrong_mcqs')
      .upsert(
        {
          user_id: userId,
          path_id: pathId,
          question_hash: qHash,
          question: wq.question || '',
          options: wq.options || {},
          correct: wq.correct || 'A',
          explanation: wq.explanation || '',
          lesson_id: wq.lessonId || '',
        },
        {
          onConflict: 'user_id,path_id,question_hash',
          ignoreDuplicates: true,
        }
      );

    if (!result.error) {
      savedCount++;
    } else if (result.error.code !== '23505') {
      console.error('Error saving wrong question:', result.error.message);
    }
  }

  return savedCount;
}

// ── Load wrong questions for a specific path ──
async function getWrongQuestions(supabase, userId, pathId) {
  var result = await supabase
    .from('wrong_mcqs')
    .select('*')
    .eq('user_id', userId)
    .eq('path_id', pathId)
    .order('created_at', { ascending: false });

  if (result.error) {
    console.error('Error loading wrong questions:', result.error.message);
    return [];
  }

  return (result.data || []).map(function (q) {
    return {
      id: q.id,
      pathId: q.path_id,
      question: q.question,
      options: q.options,
      correct: q.correct,
      explanation: q.explanation,
      lessonId: q.lesson_id || '',
      createdAt: q.created_at,
    };
  });
}

// ── Clear wrong questions for a path ──
async function clearWrongQuestions(supabase, userId, pathId) {
  var result = await supabase
    .from('wrong_mcqs')
    .delete()
    .eq('user_id', userId)
    .eq('path_id', pathId);

  if (result.error) {
    console.error('Error clearing wrong questions:', result.error.message);
    return 0;
  }

  // Supabase delete doesn't return count easily, return 1 to indicate success
  return 1;
}

// ── Count wrong questions for a path ──
async function countWrongQuestions(supabase, userId, pathId) {
  var result = await supabase
    .from('wrong_mcqs')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('path_id', pathId);

  return result.count || 0;
}

// ── Save area to review ──
async function saveAreaToReview(supabase, userId, pathId, topic) {
  if (!topic || typeof topic !== 'string' || topic.trim().length === 0) return;

  var result = await supabase
    .from('areas_to_review')
    .upsert(
      {
        user_id: userId,
        path_id: pathId,
        topic: topic.trim(),
      },
      {
        onConflict: 'user_id,path_id,topic',
        ignoreDuplicates: true,
      }
    );

  if (result.error && result.error.code !== '23505') {
    console.error('Error saving area to review:', result.error.message);
  }
}

// ── Save multiple areas to review ──
async function saveAreasToReview(supabase, userId, pathId, topics) {
  if (!topics || !Array.isArray(topics)) return;

  for (var i = 0; i < topics.length; i++) {
    await saveAreaToReview(supabase, userId, pathId, topics[i]);
  }
}

// ── Get areas to review for a specific path ──
async function getAreasToReview(supabase, userId, pathId) {
  var result = await supabase
    .from('areas_to_review')
    .select('*')
    .eq('user_id', userId)
    .eq('path_id', pathId)
    .order('created_at', { ascending: false })
    .limit(30);

  if (result.error) {
    console.error('Error loading areas to review:', result.error.message);
    return [];
  }

  return (result.data || []).map(function (a) {
    return {
      id: a.id,
      topic: a.topic,
      createdAt: a.created_at,
    };
  });
}

// ── Clear areas to review for a path ──
async function clearAreasToReview(supabase, userId, pathId) {
  var result = await supabase
    .from('areas_to_review')
    .delete()
    .eq('user_id', userId)
    .eq('path_id', pathId);

  if (result.error) {
    console.error('Error clearing areas to review:', result.error.message);
    return 0;
  }

  return 1;
}

module.exports = {
  saveWrongQuestions: saveWrongQuestions,
  getWrongQuestions: getWrongQuestions,
  clearWrongQuestions: clearWrongQuestions,
  countWrongQuestions: countWrongQuestions,
  saveAreaToReview: saveAreaToReview,
  saveAreasToReview: saveAreasToReview,
  getAreasToReview: getAreasToReview,
  clearAreasToReview: clearAreasToReview,
  hashQuestion: hashQuestion,
};