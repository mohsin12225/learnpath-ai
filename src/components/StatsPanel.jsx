
// src/components/StatsPanel.jsx
import { useAuth } from '../context/AuthContext';
import { useLearning } from '../context/LearningContext';
import {
  Flame,
  Star,
  Heart,
  BarChart3,
  Trophy,
  Zap,
  Target,
} from 'lucide-react';

export default function StatsPanel() {
  const { user } = useAuth();
  const { selectedPath } = useLearning();

  if (!user || !selectedPath) return null;

  const totalLessons = selectedPath.lessons?.length || 0;
  const completed = selectedPath.progress?.completedLessons?.length || 0;
  const progress = totalLessons > 0 ? Math.round((completed / totalLessons) * 100) : 0;

  return (
    <aside className="stats-panel">
      <span className="stats-panel-title">Your Stats</span>

      <div className="stat-card streak-card">
        <div className="stat-icon-wrapper streak">
          <Flame size={22} />
        </div>
        <div className="stat-info">
          <span className="stat-value">{user.streak || 0}</span>
          <span className="stat-label">Day Streak</span>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-icon-wrapper xp">
          <Star size={22} />
        </div>
        <div className="stat-info">
          <span className="stat-value">{user.xp || 0}</span>
          <span className="stat-label">Total XP</span>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-icon-wrapper hearts">
          <Heart size={22} />
        </div>
        <div className="stat-info">
          <div className="hearts-display">
            {Array.from({ length: user.maxHearts || 5 }).map((_, i) => (
              <Heart
                key={i}
                size={20}
                className={`heart-icon ${i < (user.hearts || 0) ? 'full' : 'empty'}`}
                fill={i < (user.hearts || 0) ? 'currentColor' : 'none'}
              />
            ))}
          </div>
          <span className="stat-label">
            {user.hearts || 0}/{user.maxHearts || 5} Lives
          </span>
        </div>
      </div>

      <div className="stat-card progress-card">
        <div className="stat-header">
          <div className="stat-header-left">
            <BarChart3 size={16} /> Progress
          </div>
          <span className="progress-pct">{progress}%</span>
        </div>
        <div className="progress-bar-container">
          <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
        </div>
        <div className="progress-detail">
          <span>{completed}/{totalLessons} lessons</span>
        </div>
      </div>

      {(user.streak || 0) > 0 && (
        <div className="stat-card motivation-card">
          <p className="motivation-text">
            {user.streak >= 7 ? <><Trophy size={16} /> Unstoppable!</> :
             user.streak >= 3 ? <><Zap size={16} /> Great consistency!</> :
             <><Target size={16} /> Keep it going!</>}
          </p>
        </div>
      )}
    </aside>
  );
}