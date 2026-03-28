
// src/components/ProgressView.jsx
import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';
import { useLearning } from '../context/LearningContext';
import {
  BarChart3, BookOpen, Target, Star, Flame, TrendingUp,
  AlertTriangle, Loader2,
} from 'lucide-react';

export default function ProgressView() {
  var auth = useAuth();
  var user = auth.user;
  var learning = useLearning();
  var selectedPath = learning.selectedPath;
  var getPathReview = learning.getPathReview;

  var [reviewData, setReviewData] = useState(null);
  var [reviewLoading, setReviewLoading] = useState(true);

  // Load path-specific review data
  useEffect(function () {
    if (!selectedPath) return;

    var cancelled = false;

    async function loadReview() {
      setReviewLoading(true);
      try {
        var data = await getPathReview();
        if (!cancelled) setReviewData(data);
      } catch (err) {
        console.error('Failed to load review data:', err);
      } finally {
        if (!cancelled) setReviewLoading(false);
      }
    }

    loadReview();
    return function () { cancelled = true; };
  }, [selectedPath]);

  var totalLessons = selectedPath?.lessons?.length || 0;
  var completed = selectedPath?.progress?.completedLessons?.length || 0;
  var accuracy = (user?.totalAnswered || 0) > 0
    ? Math.round(((user?.totalCorrect || 0) / user.totalAnswered) * 100)
    : 0;

  var dayStats = {};
  if (selectedPath && selectedPath.lessons) {
    selectedPath.lessons.forEach(function (l) {
      if (!dayStats[l.day]) dayStats[l.day] = { total: 0, completed: 0 };
      dayStats[l.day].total++;
      if (selectedPath.progress?.completedLessons?.indexOf(l.id) !== -1) {
        dayStats[l.day].completed++;
      }
    });
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content page-content">
        <h1 className="page-title">
          <BarChart3 className="page-title-icon" size={24} /> Your Progress
        </h1>

        <div className="stats-grid">
          <div className="big-stat-card">
            <div className="big-stat-icon"><BookOpen size={24} /></div>
            <span className="big-stat-value">{completed}/{totalLessons}</span>
            <span className="big-stat-label">Lessons Completed</span>
          </div>
          <div className="big-stat-card">
            <div className="big-stat-icon"><Target size={24} /></div>
            <span className="big-stat-value">{accuracy}%</span>
            <span className="big-stat-label">Accuracy</span>
          </div>
          <div className="big-stat-card">
            <div className="big-stat-icon"><Star size={24} /></div>
            <span className="big-stat-value">{user?.xp || 0}</span>
            <span className="big-stat-label">Total XP</span>
          </div>
          <div className="big-stat-card">
            <div className="big-stat-icon"><Flame size={24} /></div>
            <span className="big-stat-value">{user?.longestStreak || 0}</span>
            <span className="big-stat-label">Best Streak</span>
          </div>
        </div>

        <h2 className="section-heading"><TrendingUp size={20} /> Daily Breakdown</h2>
        <div className="day-progress-list">
          {Object.entries(dayStats).map(function (entry) {
            var day = entry[0];
            var stats = entry[1];
            return (
              <div key={day} className="day-progress-item">
                <span className="day-progress-label">Day {day}</span>
                <div className="day-progress-bar-bg">
                  <div
                    className="day-progress-bar-fill"
                    style={{ width: (stats.completed / stats.total) * 100 + '%' }}
                  />
                </div>
                <span className="day-progress-count">{stats.completed}/{stats.total}</span>
              </div>
            );
          })}
        </div>

        {/* PATH-SPECIFIC Areas to Review */}
        <h2 className="section-heading">
          <AlertTriangle size={20} /> Areas to Review
          {selectedPath && (
            <span className="section-heading-badge">
              {selectedPath.topic}
            </span>
          )}
        </h2>

        {reviewLoading ? (
          <div className="review-loading">
            <Loader2 size={20} style={{ animation: 'spin 1s linear infinite', color: 'var(--primary)' }} />
            <span>Loading review data...</span>
          </div>
        ) : reviewData ? (
          <>
            {reviewData.wrongQuestionCount > 0 && (
              <p className="review-count-badge">
                <AlertTriangle size={14} />
                {reviewData.wrongQuestionCount} questions answered incorrectly in this path
              </p>
            )}

            {reviewData.areasToReview && reviewData.areasToReview.length > 0 ? (
              <div className="weak-concepts">
                {reviewData.areasToReview.map(function (area) {
                  return (
                    <div key={area._id} className="weak-concept-tag">
                      <AlertTriangle size={14} /> {area.topic}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="no-review-msg">
                No areas to review for this path. Keep up the great work!
              </p>
            )}
          </>
        ) : (
          <p className="no-review-msg">Could not load review data.</p>
        )}
      </main>
    </div>
  );
}