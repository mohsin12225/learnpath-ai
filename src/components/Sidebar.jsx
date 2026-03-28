
import logo from '../imgs/logo.png';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLearning } from '../context/LearningContext';
import { useModal } from '../context/ModalContext';
import {
  GraduationCap,
  BookOpen,
  BarChart3,
  Trophy,
  User,
  ArrowLeftRight,
  LogOut,
} from 'lucide-react';

export default function Sidebar() {
  var auth = useAuth();
  var logout = auth.logout;
  var learning = useLearning();
  var selectedPath = learning.selectedPath;
  var deselectPath = learning.deselectPath;
  var modal = useModal();

  var navItems = [
    { to: '/', icon: BookOpen, label: 'Learn', end: true },
    { to: '/progress', icon: BarChart3, label: 'Progress' },
    { to: '/achievements', icon: Trophy, label: 'Achievements' },
    { to: '/profile', icon: User, label: 'Profile' },
  ];

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
        },
      }
    );
  }

  function handleLogout() {
    modal.showConfirm('Are you sure you want to log out?', {
      title: 'Log Out',
      type: 'info',
      confirmLabel: 'Log Out',
      confirmVariant: 'danger',
      cancelLabel: 'Stay',
      onConfirm: function () {
        logout();
      },
    });
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon-sm">
         <img src="src/imgs/logo.png" alt="LearnPath Logo" />
        </div>
        <span className="logo-text">
          Learn<span>Path</span>
        </span>
      </div>

      <nav className="sidebar-nav">
        {navItems.map(function (item) {
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={function (navData) {
                return 'nav-item ' + (navData.isActive ? 'active' : '');
              }}
            >
              <item.icon className="nav-icon" />
              <span className="nav-label">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="current-topic">
          <span className="topic-label">Current Topic</span>
          <span className="topic-name">
            {selectedPath && selectedPath.topic}
          </span>
        </div>
        <button className="btn-new-topic" onClick={handleSwitchPath}>
          <ArrowLeftRight size={16} /> Switch Path
        </button>
        <button
          className="btn-new-topic"
          style={{ marginTop: 8 }}
          onClick={handleLogout}
        >
          <LogOut size={16} /> Log Out
        </button>
      </div>
    </aside>
  );
}