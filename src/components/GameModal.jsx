// src/components/GameModal.jsx
import { useEffect, useRef } from 'react';
import {
  HeartCrack,
  Trophy,
  Unlock,
  XCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
  Star,
  Clock,
} from 'lucide-react';

var ICON_MAP = {
  'no-hearts': HeartCrack,
  'hearts': HeartCrack,
  'trophy': Trophy,
  'complete': Trophy,
  'unlock': Unlock,
  'unlocked': Unlock,
  'wrong': XCircle,
  'error': XCircle,
  'warning': AlertTriangle,
  'success': CheckCircle2,
  'info': Info,
  'star': Star,
  'time': Clock,
};

var COLOR_MAP = {
  'no-hearts': 'danger',
  'hearts': 'danger',
  'trophy': 'success',
  'complete': 'success',
  'unlock': 'primary',
  'unlocked': 'primary',
  'wrong': 'danger',
  'error': 'danger',
  'warning': 'warning',
  'success': 'success',
  'info': 'primary',
  'star': 'primary',
  'time': 'warning',
};

export default function GameModal(props) {
  var isOpen = props.isOpen;
  var onClose = props.onClose;
  var title = props.title || 'Notice';
  var message = props.message || '';
  var type = props.type || 'info';
  var buttons = props.buttons || null;
  var closable = props.closable !== false;
  var children = props.children;

  var overlayRef = useRef(null);
  var modalRef = useRef(null);
  var previousFocus = useRef(null);

  // Lock body scroll and manage focus
  useEffect(function () {
    if (isOpen) {
      previousFocus.current = document.activeElement;
      document.body.style.overflow = 'hidden';

      // Focus the modal after animation
      setTimeout(function () {
        if (modalRef.current) {
          var focusable = modalRef.current.querySelector(
            'button, [tabindex]:not([tabindex="-1"])'
          );
          if (focusable) focusable.focus();
        }
      }, 100);
    } else {
      document.body.style.overflow = '';
      if (previousFocus.current && typeof previousFocus.current.focus === 'function') {
        previousFocus.current.focus();
      }
    }

    return function () {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(function () {
    if (!isOpen || !closable) return;

    function handleKey(e) {
      if (e.key === 'Escape') {
        onClose();
      }
    }

    document.addEventListener('keydown', handleKey);
    return function () {
      document.removeEventListener('keydown', handleKey);
    };
  }, [isOpen, closable, onClose]);

  if (!isOpen) return null;

  var IconComponent = ICON_MAP[type] || Info;
  var colorClass = COLOR_MAP[type] || 'primary';

  function handleOverlayClick(e) {
    if (closable && e.target === overlayRef.current) {
      onClose();
    }
  }

  // Default button if none provided
  var modalButtons = buttons;
  if (!modalButtons) {
    modalButtons = [
      {
        label: 'OK',
        variant: 'primary',
        onClick: onClose,
      },
    ];
  }

  return (
    <div
      className="game-modal-overlay"
      ref={overlayRef}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="game-modal-title"
    >
      <div className="game-modal" ref={modalRef}>
        {closable && (
          <button
            className="game-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        )}

        <div className={'game-modal-icon-wrapper game-modal-icon-' + colorClass}>
          <IconComponent size={32} />
        </div>

        <h2 className="game-modal-title" id="game-modal-title">
          {title}
        </h2>

        {message && (
          <p className="game-modal-message">{message}</p>
        )}

        {children && (
          <div className="game-modal-content">{children}</div>
        )}

        <div className="game-modal-buttons">
          {modalButtons.map(function (btn, idx) {
            var btnClass = 'game-modal-btn';
            if (btn.variant === 'primary') {
              btnClass += ' game-modal-btn-primary';
            } else if (btn.variant === 'danger') {
              btnClass += ' game-modal-btn-danger';
            } else {
              btnClass += ' game-modal-btn-secondary';
            }

            return (
              <button
                key={idx}
                className={btnClass}
                onClick={btn.onClick || onClose}
              >
                {btn.icon && <btn.icon size={18} />}
                {btn.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}