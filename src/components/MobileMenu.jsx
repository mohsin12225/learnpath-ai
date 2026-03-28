import { useState, useEffect, useRef } from 'react';
import { Menu, X, ArrowLeftRight, Flame, Star, Heart, BarChart3, Trophy, Zap, Target } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLearning } from '../context/LearningContext';
import { useModal } from '../context/ModalContext';

export default function MobileMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();
  const { selectedPath, deselectPath } = useLearning();
  const modal = useModal();
  const menuRef = useRef(null);

  useEffect(function () {
    function handleResize() {
      if (window.innerWidth >= 1200) setIsOpen(false);
    }
    window.addEventListener('resize', handleResize);
    return function () { window.removeEventListener('resize', handleResize); };
  }, []);

  useEffect(function () {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setIsOpen(false);
    }
    if (isOpen) document.addEventListener('mousedown', handleClick);
    return function () { document.removeEventListener('mousedown', handleClick); };
  }, [isOpen]);

  useEffect(function () {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return function () { document.body.style.overflow = ''; };
  }, [isOpen]);

  function handleSwitchPath() {
    modal.showConfirm(
      'Switch to a different learning path? Your progress is saved.',
      {
        title: 'Switch Path',
        type: 'info',
        confirmLabel: 'Switch',
        confirmVariant: 'primary',
        cancelLabel: 'Stay',
        onConfirm: function () {
          deselectPath();
          setIsOpen(false);
        },
      }
    );
  }

  if (!user || !selectedPath) return null;

  var totalLessons = selectedPath.lessons?.length || 0;
  var completed = selectedPath.progress?.completedLessons?.length || 0;
  var progress = totalLessons > 0 ? Math.round((completed / totalLessons) * 100) : 0;

  return (
    <div className="mobile-menu-wrapper" ref={menuRef}>
      <button
        className="hamburger-btn"
        onClick={function () { setIsOpen(!isOpen); }}
        aria-label="Toggle menu"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {isOpen && <div className="mobile-menu-backdrop" onClick={function () { setIsOpen(false); }} />}

      <div className={'mobile-menu-panel' + (isOpen ? ' open' : '')}>
        {/* Switch Path */}
        <div className="current-topic">
          <span className="topic-label">Current Topic</span>
          <span className="topic-name">{selectedPath.topic}</span>
        </div>
        <button className="btn-new-topic" onClick={handleSwitchPath}>
          <ArrowLeftRight size={16} /> Switch Path
        </button>

        <div className="mobile-menu-divider" />

        {/* Stats */}
        <span className="stats-panel-title">Your Stats</span>

        <div className="stat-card streak-card">
          <div className="stat-icon-wrapper streak"><Flame size={22} /></div>
          <div className="stat-info">
            <span className="stat-value">{user.streak || 0}</span>
            <span className="stat-label">Day Streak</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper xp"><Star size={22} /></div>
          <div className="stat-info">
            <span className="stat-value">{user.xp || 0}</span>
            <span className="stat-label">Total XP</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper hearts"><Heart size={22} /></div>
          <div className="stat-info">
            <div className="hearts-display">
              {Array.from({ length: user.maxHearts || 5 }).map(function (_, i) {
                return (
                  <Heart
                    key={i}
                    size={20}
                    className={'heart-icon ' + (i < (user.hearts || 0) ? 'full' : 'empty')}
                    fill={i < (user.hearts || 0) ? 'currentColor' : 'none'}
                  />
                );
              })}
            </div>
            <span className="stat-label">{user.hearts || 0}/{user.maxHearts || 5} Lives</span>
          </div>
        </div>

        <div className="stat-card progress-card">
          <div className="stat-header">
            <div className="stat-header-left"><BarChart3 size={16} /> Progress</div>
            <span className="progress-pct">{progress}%</span>
          </div>
          <div className="progress-bar-container">
            <div className="progress-bar-fill" style={{ width: progress + '%' }} />
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
      </div>
    </div>
  );
}