
import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useModal } from '../context/ModalContext';
import { BookOpen, HelpCircle, Lock, Check, Trophy } from 'lucide-react';

var DIFFICULTY_CONFIG = {
  easy: { label: 'Easy', className: 'diff-easy' },
  medium: { label: 'Medium', className: 'diff-medium' },
  hard: { label: 'Hard', className: 'diff-hard' },
  very_hard: { label: 'Expert', className: 'diff-very-hard' },
};

function LessonNode(props) {
  var lesson = props.lesson;
  var score = props.score;

  var navigate = useNavigate();
  var auth = useAuth();
  var user = auth.user;
  var modal = useModal();

  var isCompleted = lesson.status === 'completed';
  var isUnlocked = lesson.status === 'unlocked';
  var isLocked = lesson.status === 'locked';
  var isCurrent = isUnlocked && !isCompleted;
  var isQuiz = lesson.type === 'quiz' || lesson.type === 'final_quiz';
  var isFinalTest = lesson.type === 'final_quiz';

  var difficulty = lesson.difficulty || null;
  var diffConfig = difficulty ? DIFFICULTY_CONFIG[difficulty] : null;

  var nodeClass = [
    'lesson-node',
    isCompleted ? 'node-completed' : '',
    isCurrent ? 'node-current node-unlocked' : '',
    isUnlocked && !isCurrent ? 'node-unlocked' : '',
    isLocked ? 'node-locked' : '',
    isQuiz ? 'node-quiz' : '',
    isFinalTest ? 'node-final-test' : '',
  ]
    .filter(Boolean)
    .join(' ');

  function handleClick() {
    if (isLocked) return;

    var hearts = (user && user.hearts) || 0;

    if (hearts <= 0) {
      modal.showNoHearts({
        onClose: function () {},
      });
      return;
    }

    navigate('/lesson/' + lesson.id);
  }

  function getIcon() {
    if (isCompleted) return <Check className="node-icon-svg" />;
    if (isLocked) return <Lock className="node-icon-svg" />;
    if (lesson.type === 'final_quiz')
      return <Trophy className="node-icon-svg" />;
    if (lesson.type === 'quiz')
      return <HelpCircle className="node-icon-svg" />;
    return <BookOpen className="node-icon-svg" />;
  }

  return (
    <div className={nodeClass} onClick={handleClick} title={lesson.title}>
      <div className="node-circle">
        <div className="node-circle-inner">{getIcon()}</div>
        {isCurrent && (
          <div className="node-pulse-container">
            <div className="node-pulse-ring" />
            <div className="node-pulse-ring-outer" />
          </div>
        )}
      </div>
      <div className="node-label">
        <span className="node-title">{lesson.title}</span>
        <div className="node-meta">
          {diffConfig && !isQuiz && (
            <span className={'node-difficulty ' + diffConfig.className}>
              {diffConfig.label}
            </span>
          )}
          {isFinalTest && (
            <span className="node-difficulty diff-very-hard">Expert</span>
          )}
          {score !== undefined && (
            <span className="node-score">{score}%</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(LessonNode, function areEqual(prev, next) {
  return (
    prev.lesson.id === next.lesson.id &&
    prev.lesson.status === next.lesson.status &&
    prev.lesson.type === next.lesson.type &&
    prev.lesson.title === next.lesson.title &&
    prev.lesson.difficulty === next.lesson.difficulty &&
    prev.score === next.score
  );
});