
// src/components/LessonPath.jsx
import { useEffect, useRef, useMemo, memo } from 'react';
import { useLearning } from '../context/LearningContext';
import LessonNode from './LessonNode';
import { Calendar, FileText, Trophy, Flag } from 'lucide-react';

function LessonPath() {
  const { selectedPath } = useLearning();
  const pathRef = useRef(null);
  const lessons = selectedPath?.lessons || [];

  const days = useMemo(() => {
    const result = [];
    let currentDay = null;
    lessons.forEach((lesson) => {
      // Final test gets its own group regardless of day number
      if (lesson.type === 'final_quiz') {
        result.push({ day: lesson.day, lessons: [lesson], isFinalTest: true });
        return;
      }

      if (lesson.day !== currentDay) {
        currentDay = lesson.day;
        result.push({ day: currentDay, lessons: [] });
      }
      result[result.length - 1].lessons.push(lesson);
    });
    return result;
  }, [lessons]);

  useEffect(() => {
    const el = document.querySelector('.node-current');
    if (el && pathRef.current) {
      setTimeout(() => {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 400);
    }
  }, [selectedPath]);

  const getZigZagOffset = (index) => {
    const pattern = [0, 70, 100, 70, 0, -70, -100, -70];
    return pattern[index % pattern.length];
  };

  let globalIndex = 0;

  return (
    <div className="lesson-path" ref={pathRef}>
      <div className="path-container">
        {days.map((dayGroup) => {
          const isFinalTest = dayGroup.isFinalTest || false;
          const firstLesson = dayGroup.lessons[0];
          const isQuizDay = !isFinalTest && firstLesson?.type === 'quiz';

          let badgeClass = 'day-badge';
          if (isQuizDay) badgeClass += ' day-badge-quiz';
          if (isFinalTest) badgeClass += ' day-badge-final';

          return (
            <div key={isFinalTest ? 'final-test' : dayGroup.day} className="day-group">
              <div className="day-divider">
                <div className="day-divider-line" />
                <span className={badgeClass}>
                  {isFinalTest ? (
                    <><Trophy className="day-badge-icon" size={16} /> Final Test</>
                  ) : isQuizDay ? (
                    <><FileText className="day-badge-icon" size={16} /> Quiz</>
                  ) : (
                    <><Calendar className="day-badge-icon" size={16} /> Day {dayGroup.day}</>
                  )}
                </span>
                <div className="day-divider-line" />
              </div>
              <div className="day-nodes">
                {dayGroup.lessons.map((lesson) => {
                  const idx = globalIndex++;
                  const offset = isFinalTest ? 0 : getZigZagOffset(idx);
                  const isCompleted = lesson.status === 'completed';
                  const isUnlocked = lesson.status === 'unlocked';
                  const connectorClass = isCompleted
                    ? 'completed'
                    : isUnlocked ? 'active' : 'locked';

                  return (
                    <div key={lesson.id}>
                      {idx > 0 && <div className={`path-connector ${connectorClass}`} />}
                      <div
                        className="node-wrapper"
                        style={{ transform: `translateX(${offset}px)` }}
                      >
                        <LessonNode
                          lesson={lesson}
                          score={selectedPath?.progress?.scores?.[lesson.id]}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        <div className="path-end">
          <Flag className="finish-icon" size={48} />
          <p>Course Complete!</p>
        </div>
      </div>
    </div>
  );
}

export default memo(LessonPath);