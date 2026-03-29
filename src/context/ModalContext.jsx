// src/context/ModalContext.jsx
import { createContext, useContext, useState, useCallback } from 'react';
import GameModal from '../components/GameModal';

var ModalContext = createContext(null);

export function ModalProvider(props) {
  var [modal, setModal] = useState(null);

  var showModal = useCallback(function (config) {
    setModal(config);
  }, []);

  var hideModal = useCallback(function () {
    setModal(null);
  }, []);

  // ── Pre-built modal helpers ──

  var showNoHearts = useCallback(function (options) {
    setModal({
      type: 'no-hearts',
      title: 'Out of Hearts',
      message:
        "You've used all your hearts. Wait for them to regenerate or come back later.",
      buttons: [
        {
          label: (options && options.buttonLabel) || 'OK',
          variant: 'primary',
          onClick: function () {
            setModal(null);
            if (options && options.onClose) options.onClose();
          },
        },
      ],
      closable: true,
    });
  }, []);

  var showCourseComplete = useCallback(function (options) {
    setModal({
      type: 'trophy',
      title: 'Course Complete!',
      message:
        (options && options.message) ||
        "Congratulations! You've completed the entire course.",
      buttons: [
        {
          label: 'Continue',
          variant: 'primary',
          onClick: function () {
            setModal(null);
            if (options && options.onContinue) options.onContinue();
          },
        },
      ],
      closable: true,
    });
  }, []);

  var showLessonUnlocked = useCallback(function (options) {
    setModal({
      type: 'unlock',
      title: 'Lesson Unlocked!',
      message:
        (options && options.message) ||
        'Great job! The next lesson is now available.',
      buttons: [
        {
          label: 'Continue',
          variant: 'primary',
          onClick: function () {
            setModal(null);
            if (options && options.onContinue) options.onContinue();
          },
        },
      ],
      closable: true,
    });
  }, []);

  var showError = useCallback(function (message, options) {
    setModal({
      type: 'error',
      title: (options && options.title) || 'Error',
      message: message || 'Something went wrong.',
      buttons: [
        {
          label: 'OK',
          variant: 'primary',
          onClick: function () {
            setModal(null);
            if (options && options.onClose) options.onClose();
          },
        },
      ],
      closable: true,
    });
  }, []);

  var showWarning = useCallback(function (message, options) {
    setModal({
      type: 'warning',
      title: (options && options.title) || 'Warning',
      message: message,
      buttons: [
        {
          label: (options && options.confirmLabel) || 'OK',
          variant: 'primary',
          onClick: function () {
            setModal(null);
            if (options && options.onConfirm) options.onConfirm();
          },
        },
      ],
      closable: true,
    });
  }, []);

  var showConfirm = useCallback(function (message, options) {
    setModal({
      type: (options && options.type) || 'warning',
      title: (options && options.title) || 'Confirm',
      message: message,
      buttons: [
        {
          label: (options && options.cancelLabel) || 'Cancel',
          variant: 'secondary',
          onClick: function () {
            setModal(null);
            if (options && options.onCancel) options.onCancel();
          },
        },
        {
          label: (options && options.confirmLabel) || 'Confirm',
          variant: (options && options.confirmVariant) || 'danger',
          onClick: function () {
            setModal(null);
            if (options && options.onConfirm) options.onConfirm();
          },
        },
      ],
      closable: true,
    });
  }, []);

  var showSuccess = useCallback(function (message, options) {
    setModal({
      type: 'success',
      title: (options && options.title) || 'Success',
      message: message,
      buttons: [
        {
          label: 'OK',
          variant: 'primary',
          onClick: function () {
            setModal(null);
            if (options && options.onClose) options.onClose();
          },
        },
      ],
      closable: true,
    });
  }, []);

  return (
    <ModalContext.Provider
      value={{
        showModal: showModal,
        hideModal: hideModal,
        showNoHearts: showNoHearts,
        showCourseComplete: showCourseComplete,
        showLessonUnlocked: showLessonUnlocked,
        showError: showError,
        showWarning: showWarning,
        showConfirm: showConfirm,
        showSuccess: showSuccess,
      }}
    >
      {props.children}

      <GameModal
        isOpen={modal !== null}
        onClose={function () {
          if (modal && modal.closable !== false) {
            setModal(null);
          }
        }}
        type={modal ? modal.type : 'info'}
        title={modal ? modal.title : ''}
        message={modal ? modal.message : ''}
        buttons={modal ? modal.buttons : null}
        closable={modal ? modal.closable !== false : true}
      >
        {modal && modal.children ? modal.children : null}
      </GameModal>
    </ModalContext.Provider>
  );
}

export function useModal() {
  var ctx = useContext(ModalContext);
  if (!ctx) throw new Error('useModal must be within ModalProvider');
  return ctx;
}