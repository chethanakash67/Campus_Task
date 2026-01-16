// client/src/components/Toast.jsx
import React from 'react';
import { FaCheckCircle, FaInfoCircle, FaExclamationTriangle, FaTimes } from 'react-icons/fa';
import './Toast.css';

function Toast({ toasts, removeToast }) {
  const getIcon = (type) => {
    switch (type) {
      case 'success': return <FaCheckCircle />;
      case 'error': return <FaExclamationTriangle />;
      case 'info': return <FaInfoCircle />;
      default: return <FaCheckCircle />;
    }
  };

  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <div key={toast.id} className={`toast toast-${toast.type}`}>
          <div className="toast-icon">{getIcon(toast.type)}</div>
          <div className="toast-message">{toast.message}</div>
          <button className="toast-close" onClick={() => removeToast(toast.id)}>
            <FaTimes />
          </button>
        </div>
      ))}
    </div>
  );
}

export default Toast;