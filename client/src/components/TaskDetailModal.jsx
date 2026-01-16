// client/src/components/TaskDetailModal.jsx
import React, { useState } from 'react';
import { FaTimes, FaTrash, FaCalendar, FaTag, FaCheckCircle, FaComment, FaPaperclip } from 'react-icons/fa';
import { useApp } from '../context/AppContext';
import './TaskDetailModal.css';

function TaskDetailModal({ task, onClose }) {
  const { updateTask, deleteTask, addComment, toggleSubtask, currentUser } = useApp();
  
  const [editMode, setEditMode] = useState(false);
  const [editedTask, setEditedTask] = useState(task);
  const [newComment, setNewComment] = useState('');
  const [newSubtask, setNewSubtask] = useState('');

  const handleSave = () => {
    updateTask(task.id, editedTask);
    setEditMode(false);
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      deleteTask(task.id);
      onClose();
    }
  };

  const handleAddComment = (e) => {
    e.preventDefault();
    if (newComment.trim()) {
      addComment(task.id, newComment);
      setNewComment('');
    }
  };

  const handleAddSubtask = (e) => {
    e.preventDefault();
    if (newSubtask.trim()) {
      const newSubtasks = [
        ...editedTask.subtasks,
        { id: Date.now(), text: newSubtask, completed: false }
      ];
      setEditedTask({ ...editedTask, subtasks: newSubtasks });
      updateTask(task.id, { subtasks: newSubtasks });
      setNewSubtask('');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No due date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const isOverdue = (dateString) => {
    if (!dateString) return false;
    return new Date(dateString) < new Date() && task.status !== 'done';
  };

  const completedSubtasks = task.subtasks.filter(st => st.completed).length;
  const totalSubtasks = task.subtasks.length;
  const progress = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-detail" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-detail-header">
          <div className="header-left">
            <span className={`priority-tag ${task.priority.toLowerCase()}`}>
              {task.priority}
            </span>
            <span className={`status-badge status-${task.status}`}>
              {task.status.replace('-', ' ')}
            </span>
          </div>
          <div className="header-actions">
            <button className="icon-btn" onClick={() => setEditMode(!editMode)} title="Edit">
              ✏️
            </button>
            <button className="icon-btn delete" onClick={handleDelete} title="Delete">
              <FaTrash />
            </button>
            <button className="icon-btn" onClick={onClose}>
              <FaTimes />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="modal-detail-body">
          {/* Title */}
          {editMode ? (
            <input
              type="text"
              className="title-input"
              value={editedTask.title}
              onChange={(e) => setEditedTask({ ...editedTask, title: e.target.value })}
            />
          ) : (
            <h2 className="task-title">{task.title}</h2>
          )}

          {/* Description */}
          <div className="detail-section">
            <label>Description</label>
            {editMode ? (
              <textarea
                className="description-input"
                value={editedTask.description || ''}
                onChange={(e) => setEditedTask({ ...editedTask, description: e.target.value })}
                placeholder="Add a description..."
                rows={4}
              />
            ) : (
              <p className="task-description">{task.description || 'No description provided.'}</p>
            )}
          </div>

          {/* Metadata */}
          <div className="task-metadata">
            <div className="metadata-item">
              <FaCalendar className="meta-icon" />
              <div>
                <label>Due Date</label>
                {editMode ? (
                  <input
                    type="date"
                    className="date-input"
                    value={editedTask.dueDate || ''}
                    onChange={(e) => setEditedTask({ ...editedTask, dueDate: e.target.value })}
                  />
                ) : (
                  <span className={isOverdue(task.dueDate) ? 'overdue' : ''}>
                    {formatDate(task.dueDate)}
                  </span>
                )}
              </div>
            </div>

            <div className="metadata-item">
              <FaTag className="meta-icon" />
              <div>
                <label>Tags</label>
                <div className="tag-list">
                  {task.tags?.map((tag, idx) => (
                    <span key={idx} className="tag">{tag}</span>
                  ))}
                  {(!task.tags || task.tags.length === 0) && <span className="text-muted">No tags</span>}
                </div>
              </div>
            </div>

            <div className="metadata-item">
              <div className="assignees-list">
                <label>Assigned to</label>
                <div className="avatar-group">
                  {task.assignees.map((initial, idx) => (
                    <div key={idx} className="mini-avatar" title={initial}>{initial}</div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          {totalSubtasks > 0 && (
            <div className="progress-section">
              <div className="progress-header">
                <span>Progress</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progress}%` }}></div>
              </div>
            </div>
          )}

          {/* Subtasks */}
          <div className="detail-section">
            <label className="section-label">
              <FaCheckCircle /> Subtasks ({completedSubtasks}/{totalSubtasks})
            </label>
            <div className="subtask-list">
              {task.subtasks.map((subtask) => (
                <div key={subtask.id} className="subtask-item">
                  <input
                    type="checkbox"
                    checked={subtask.completed}
                    onChange={() => toggleSubtask(task.id, subtask.id)}
                  />
                  <span className={subtask.completed ? 'completed' : ''}>
                    {subtask.text}
                  </span>
                </div>
              ))}
            </div>
            <form onSubmit={handleAddSubtask} className="add-subtask-form">
              <input
                type="text"
                placeholder="Add a subtask..."
                value={newSubtask}
                onChange={(e) => setNewSubtask(e.target.value)}
              />
              <button type="submit" className="btn-add">Add</button>
            </form>
          </div>

          {/* Comments */}
          <div className="detail-section">
            <label className="section-label">
              <FaComment /> Comments ({task.comments.length})
            </label>
            <div className="comments-list">
              {task.comments.map((comment) => (
                <div key={comment.id} className="comment-item">
                  <div className="comment-avatar">{comment.authorId}</div>
                  <div className="comment-content">
                    <div className="comment-header">
                      <span className="comment-author">{comment.author}</span>
                      <span className="comment-time">
                        {new Date(comment.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="comment-text">{comment.text}</p>
                  </div>
                </div>
              ))}
            </div>
            <form onSubmit={handleAddComment} className="add-comment-form">
              <input
                type="text"
                placeholder="Write a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
              />
              <button type="submit" className="btn-add">Post</button>
            </form>
          </div>
        </div>

        {/* Footer */}
        {editMode && (
          <div className="modal-detail-footer">
            <button className="btn btn-secondary" onClick={() => setEditMode(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleSave}>
              Save Changes
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default TaskDetailModal;