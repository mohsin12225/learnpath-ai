
// src/components/AchievementsView.jsx
import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';
import { useLearning } from '../context/LearningContext';
import {
  Trophy, Target, Award, Flame, Zap, Star,
  Sparkles, Mountain, GraduationCap, Gem, Check,
} from 'lucide-react';

const ICONS = {
  first_lesson: Target,
  perfect_quiz: Award,
  streak_3: Flame,
  streak_7: Zap,
  xp_100: Star,
  xp_500: Sparkles,
  halfway: Mountain,
  graduate: GraduationCap,
  no_hearts_lost: Gem,
};

export default function AchievementsView() {
  const { user } = useAuth();
  const { ACHIEVEMENTS_DEF } = useLearning();

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content page-content">
        <h1 className="page-title">
          <Trophy className="page-title-icon" size={24} /> Achievements
        </h1>
        <div className="achievements-grid">
          {ACHIEVEMENTS_DEF.map((ach) => {
            const earned = user?.achievements?.includes(ach.id);
            const Icon = ICONS[ach.id] || Star;
            return (
              <div key={ach.id} className={`achievement-card ${earned ? 'earned' : 'locked'}`}>
                <div className="achievement-icon-wrapper"><Icon size={28} /></div>
                <h3>{ach.title}</h3>
                <p>{ach.desc}</p>
                {earned && (
                  <div className="achievement-badge">
                    <Check size={12} /> Earned
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}