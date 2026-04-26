import React, { useEffect, useState } from 'react';
import { FaBolt, FaCalendarAlt, FaFlag, FaTimes } from 'react-icons/fa';
import { useApp } from '../context/AppContext';
import './GlobalQuickAdd.css';

function GlobalQuickAdd() {
  const { addTask, addToast, isAuthenticated } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: '',
    dueDate: '',
    priority: 'Medium',
    tags: ''
  });

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!isAuthenticated) return;

      const isShortcut = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k';
      if (!isShortcut) return;

      const target = event.target;
      const isTypingTarget = target instanceof HTMLElement && (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      );

      if (isTypingTarget) return;

      event.preventDefault();
      setIsOpen(true);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const closeModal = () => {
    setIsOpen(false);
    setForm({
      title: '',
      dueDate: '',
      priority: 'Medium',
      tags: ''
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.title.trim()) return;

    try {
      setIsSubmitting(true);
      const normalizedTags = form.tags
        .split(',')
        .map(tag => tag.trim())
        .filter(Boolean);

      await addTask({
        title: form.title.trim(),
        description: '',
        priority: form.priority,
        dueDate: form.dueDate || null,
        tags: normalizedTags,
        taskType: 'personal'
      });

      addToast('Task captured', 'success');
      closeModal();
    } catch (error) {
      addToast(error.response?.data?.error || 'Failed to capture task', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="quick-add-overlay" onClick={closeModal}>
      <div className="quick-add-modal" onClick={(event) => event.stopPropagation()}>
        <div className="quick-add-header">
          <div>
            <p className="quick-add-eyebrow">Quick Capture</p>
            <h2>What needs to get done?</h2>
          </div>
          <button
            type="button"
            className="quick-add-close"
            onClick={closeModal}
            aria-label="Close quick add"
          >
            <FaTimes />
          </button>
        </div>

        <form className="quick-add-form" onSubmit={handleSubmit}>
          <label className="quick-add-field quick-add-title-field">
            <span>Task</span>
            <div className="quick-add-input-shell">
              <FaBolt className="quick-add-field-icon" />
              <input
                type="text"
                placeholder="Finish database lab, submit SEPM notes, revise Unit 4..."
                value={form.title}
                onChange={(event) => setForm(prev => ({ ...prev, title: event.target.value }))}
                autoFocus
              />
            </div>
          </label>

          <div className="quick-add-row">
            <label className="quick-add-field">
              <span>Due date</span>
              <div className="quick-add-input-shell">
                <FaCalendarAlt className="quick-add-field-icon" />
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={(event) => setForm(prev => ({ ...prev, dueDate: event.target.value }))}
                />
              </div>
            </label>

            <label className="quick-add-field">
              <span>Priority</span>
              <div className="quick-add-input-shell">
                <FaFlag className="quick-add-field-icon" />
                <select
                  value={form.priority}
                  onChange={(event) => setForm(prev => ({ ...prev, priority: event.target.value }))}
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>
            </label>
          </div>

          <label className="quick-add-field">
            <span>Tags</span>
            <div className="quick-add-input-shell">
              <input
                type="text"
                placeholder="sepm, lab, exam"
                value={form.tags}
                onChange={(event) => setForm(prev => ({ ...prev, tags: event.target.value }))}
              />
            </div>
          </label>

          <div className="quick-add-footer">
            <p>Open this from anywhere with `Ctrl/Cmd + K`.</p>
            <button type="submit" className="quick-add-submit" disabled={isSubmitting || !form.title.trim()}>
              {isSubmitting ? 'Saving...' : 'Save task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default GlobalQuickAdd;
