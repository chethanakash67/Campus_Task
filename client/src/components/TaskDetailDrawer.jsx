// client/src/components/TaskDetailDrawer.jsx
import React, { useState, useEffect } from 'react';
import {
  FaTimes, FaCalendarAlt, FaFlag, FaUser, FaUsers, FaClock,
  FaCheckCircle, FaExclamationTriangle, FaHistory, FaEdit, FaTrash,
  FaPaperclip, FaComment, FaSave, FaSpinner
} from 'react-icons/fa';
import { useApp } from '../context/AppContext';
import axios from 'axios';
import './TaskDetailDrawer.css';

function TaskDetailDrawer({ task, onClose, onTaskUpdate }) {
  const { currentUser, teams, updateTask, deleteTask, addToast } = useApp();
  const [activeTab, setActiveTab] = useState('details');
  const [progress, setProgress] = useState(task?.progress || 0);
  const [updateNote, setUpdateNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activityLog, setActivityLog] = useState([]);
  const [loadingActivity, setLoadingActivity] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSavingDetails, setIsSavingDetails] = useState(false);
  const [isDeletingTask, setIsDeletingTask] = useState(false);
  const [editedTask, setEditedTask] = useState({
    title: task?.title || '',
    description: task?.description || '',
    priority: task?.priority || 'Medium',
    dueDate: task?.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
    assignees: task?.assignees || []
  });

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

  // Check if current user is assigned to this task
  const isAssigned = task?.assignees?.some(
    a => a.id === currentUser?.id || a.email === currentUser?.email
  );
  const isCreator = Number(task?.createdBy) === Number(currentUser?.id);
  const teamMembers = task?.teamId
    ? (teams.find(team => Number(team.id) === Number(task.teamId))?.members || [])
    : [];

  useEffect(() => {
    if (task?.id) {
      fetchActivityLog();
      setProgress(task.progress || 0);
      setIsEditing(false);
      setEditedTask({
        title: task.title || '',
        description: task.description || '',
        priority: task.priority || 'Medium',
        dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
        assignees: task.assignees || []
      });
    }
  }, [task?.id]);

  useEffect(() => {
    if (task?.id) {
      setEditedTask({
        title: task.title || '',
        description: task.description || '',
        priority: task.priority || 'Medium',
        dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
        assignees: task.assignees || []
      });
      setProgress(task.progress || 0);
    }
  }, [task]);

  const fetchActivityLog = async () => {
    try {
      setLoadingActivity(true);
      const token = localStorage.getItem('campusToken');
      const response = await axios.get(`${API_URL}/tasks/${task.id}/activity`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setActivityLog(response.data || []);
    } catch (error) {
      console.error('Error fetching activity:', error);
      setActivityLog([]);
    } finally {
      setLoadingActivity(false);
    }
  };

  const handleProgressUpdate = async () => {
    if (!isAssigned) return;

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('campusToken');
      await axios.post(`${API_URL}/tasks/${task.id}/progress`, {
        progress: progress,
        note: updateNote
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setUpdateNote('');
      fetchActivityLog();
      if (onTaskUpdate) {
        onTaskUpdate({ ...task, progress });
      }
    } catch (error) {
      console.error('Error updating progress:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatRelativeTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(dateString);
  };

  const getStatusInfo = () => {
    switch (task?.status) {
      case 'done':
        return { label: 'Completed', color: '#10b981', icon: <FaCheckCircle /> };
      case 'completed_late':
        return { label: 'Submitted Late', color: '#f59e0b', icon: <FaExclamationTriangle /> };
      case 'in-progress':
        return { label: 'In Progress', color: '#3b82f6', icon: <FaClock /> };
      default:
        return { label: 'To Do', color: '#6b7280', icon: <FaClock /> };
    }
  };

  const getPriorityInfo = () => {
    switch (task?.priority?.toLowerCase()) {
      case 'high':
        return { label: 'High', color: '#dc2626' };
      case 'medium':
        return { label: 'Medium', color: '#f59e0b' };
      default:
        return { label: 'Low', color: '#10b981' };
    }
  };

  const isOverdue = () => {
    if (!task?.dueDate || task?.status === 'done' || task?.status === 'completed_late') return false;
    const dueDate = new Date(task.dueDate);
    dueDate.setHours(23, 59, 59, 999);
    return new Date() > dueDate;
  };

  const handleAssigneeToggle = (member) => {
    setEditedTask(prev => {
      const isSelected = prev.assignees.some(assignee => Number(assignee.id) === Number(member.id));
      return {
        ...prev,
        assignees: isSelected
          ? prev.assignees.filter(assignee => Number(assignee.id) !== Number(member.id))
          : [...prev.assignees, member]
      };
    });
  };

  const handleSaveDetails = async () => {
    if (!editedTask.title.trim()) {
      addToast('Task title is required', 'error');
      return;
    }

    setIsSavingDetails(true);
    try {
      const updatedTask = await updateTask(task.id, {
        title: editedTask.title.trim(),
        description: editedTask.description.trim(),
        priority: editedTask.priority,
        dueDate: editedTask.dueDate || null,
        assignees: task.taskType === 'team' ? editedTask.assignees : undefined
      });
      setIsEditing(false);
      addToast('Task updated successfully', 'success');
      onTaskUpdate?.(updatedTask);
    } catch (error) {
      addToast(error.response?.data?.error || 'Failed to update task', 'error');
    } finally {
      setIsSavingDetails(false);
    }
  };

  const handleDeleteTask = async () => {
    if (!window.confirm(`Delete task "${task.title}"?`)) return;

    setIsDeletingTask(true);
    try {
      await deleteTask(task.id);
      onClose();
    } catch (error) {
      // Toast handled in context
    } finally {
      setIsDeletingTask(false);
    }
  };

  if (!task) return null;

  const statusInfo = getStatusInfo();
  const priorityInfo = getPriorityInfo();

  return (
    <div className="task-drawer-overlay" onClick={onClose}>
      <div className="task-drawer" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="drawer-header">
          <div className="drawer-header-top">
            <div className="header-badges">
              <span
                className="status-badge"
                style={{ backgroundColor: `${statusInfo.color}20`, color: statusInfo.color }}
              >
                {statusInfo.icon}
                {statusInfo.label}
              </span>
              <span
                className="priority-badge"
                style={{ backgroundColor: `${priorityInfo.color}20`, color: priorityInfo.color }}
              >
                <FaFlag />
                {priorityInfo.label}
              </span>
              {isOverdue() && (
                <span className="overdue-badge">
                  <FaExclamationTriangle />
                  Overdue
                </span>
              )}
            </div>
            <button className="drawer-close" onClick={onClose}>
              <span>×</span>
            </button>
          </div>
          <h2 className="drawer-title">{task.title}</h2>
          {isCreator && (
            <div className="drawer-header-actions">
              <button
                className={`drawer-action-btn ${isEditing ? 'active' : ''}`}
                onClick={() => setIsEditing(prev => !prev)}
                type="button"
              >
                <FaEdit />
                {isEditing ? 'Cancel Edit' : 'Edit Task'}
              </button>
              <button
                className="drawer-action-btn danger"
                onClick={handleDeleteTask}
                type="button"
                disabled={isDeletingTask}
              >
                {isDeletingTask ? <FaSpinner className="spinner" /> : <FaTrash />}
                Delete
              </button>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="drawer-tabs">
          <button
            className={`drawer-tab ${activeTab === 'details' ? 'active' : ''}`}
            onClick={() => setActiveTab('details')}
          >
            Details
          </button>
          <button
            className={`drawer-tab ${activeTab === 'progress' ? 'active' : ''}`}
            onClick={() => setActiveTab('progress')}
          >
            Progress
          </button>
          <button
            className={`drawer-tab ${activeTab === 'activity' ? 'active' : ''}`}
            onClick={() => setActiveTab('activity')}
          >
            Activity
          </button>
        </div>

        {/* Content */}
        <div className="drawer-content">
          {/* Details Tab */}
          {activeTab === 'details' && (
            <div className="tab-content details-tab">
              {/* Progress Overview */}
              <div className="progress-overview">
                <div className="progress-header">
                  <span className="progress-label">Task Progress</span>
                  <span className="progress-value">{task.progress || 0}%</span>
                </div>
                <div className="progress-bar-container">
                  <div
                    className="progress-bar-fill"
                    style={{ width: `${task.progress || 0}%` }}
                  />
                </div>
              </div>

              {/* Description */}
              <div className="detail-section">
                <h4 className="section-label">Description</h4>
                {isEditing ? (
                  <textarea
                    className="drawer-textarea"
                    value={editedTask.description}
                    onChange={(e) => setEditedTask(prev => ({ ...prev, description: e.target.value }))}
                    rows={4}
                    placeholder="Add more details..."
                  />
                ) : (
                  <p className="description-text">{task.description || 'No description provided.'}</p>
                )}
              </div>

              {/* Info Grid */}
              <div className="info-grid">
                <div className="info-item">
                  <FaUser className="info-icon" />
                  <div className="info-content">
                    <span className="info-label">Created by</span>
                    <span className="info-value">{task.creatorName || 'Unknown'}</span>
                  </div>
                </div>

                <div className="info-item">
                  <FaCalendarAlt className="info-icon" />
                  <div className="info-content">
                    <span className="info-label">Due Date</span>
                    {isEditing ? (
                      <input
                        type="date"
                        className="drawer-input"
                        value={editedTask.dueDate}
                        onChange={(e) => setEditedTask(prev => ({ ...prev, dueDate: e.target.value }))}
                      />
                    ) : (
                      <span className={`info-value ${isOverdue() ? 'overdue' : ''}`}>
                        {task.dueDate ? formatDate(task.dueDate).split(',')[0] : 'Not set'}
                      </span>
                    )}
                  </div>
                </div>

                {task.teamName && (
                  <div className="info-item">
                    <FaUsers className="info-icon" />
                    <div className="info-content">
                      <span className="info-label">Team</span>
                      <span className="info-value">{task.teamName}</span>
                    </div>
                  </div>
                )}

                <div className="info-item">
                  {isEditing ? <FaFlag className="info-icon" /> : <FaClock className="info-icon" />}
                  <div className="info-content">
                    <span className="info-label">{isEditing ? 'Priority' : 'Created'}</span>
                    {isEditing ? (
                      <select
                        className="drawer-input"
                        value={editedTask.priority}
                        onChange={(e) => setEditedTask(prev => ({ ...prev, priority: e.target.value }))}
                      >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                      </select>
                    ) : (
                      <span className="info-value">{formatRelativeTime(task.createdAt)}</span>
                    )}
                  </div>
                </div>
              </div>

              {isEditing && (
                <div className="detail-section">
                  <h4 className="section-label">Task Title</h4>
                  <input
                    type="text"
                    className="drawer-input"
                    value={editedTask.title}
                    onChange={(e) => setEditedTask(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Task title"
                  />
                </div>
              )}

              {/* Assignees */}
              <div className="detail-section">
                <h4 className="section-label">Assigned to</h4>
                {isEditing && task.taskType === 'team' ? (
                  <div className="editable-assignees-grid">
                    {teamMembers.length > 0 ? (
                      teamMembers.map(member => {
                        const isSelected = editedTask.assignees.some(assignee => Number(assignee.id) === Number(member.id));
                        return (
                          <button
                            key={member.id}
                            type="button"
                            className={`editable-assignee-chip ${isSelected ? 'selected' : ''}`}
                            onClick={() => handleAssigneeToggle(member)}
                          >
                            <div className="assignee-avatar">
                              {member.name?.charAt(0).toUpperCase() || 'U'}
                            </div>
                            <span className="assignee-name">
                              {member.name || 'Unknown'}
                              {member.id === currentUser?.id && ' (You)'}
                            </span>
                          </button>
                        );
                      })
                    ) : (
                      <span className="no-assignees">No team members available</span>
                    )}
                  </div>
                ) : (
                  <div className="assignees-list">
                    {task.assignees && task.assignees.length > 0 ? (
                      task.assignees.map(assignee => (
                        <div key={assignee.id} className="assignee-item">
                          <div className="assignee-avatar">
                            {assignee.name?.charAt(0).toUpperCase() || 'U'}
                          </div>
                          <span className="assignee-name">
                            {assignee.name || 'Unknown'}
                            {assignee.id === currentUser?.id && ' (You)'}
                          </span>
                        </div>
                      ))
                    ) : (
                      <span className="no-assignees">No assignees</span>
                    )}
                  </div>
                )}
              </div>

              {/* Tags */}
              {task.tags && task.tags.length > 0 && (
                <div className="detail-section">
                  <h4 className="section-label">Tags</h4>
                  <div className="tags-list">
                    {task.tags.map(tag => (
                      <span key={tag} className="tag-chip">{tag}</span>
                    ))}
                  </div>
                </div>
              )}

              {isEditing && (
                <div className="detail-actions">
                  <button
                    type="button"
                    className="detail-action-btn secondary"
                    onClick={() => {
                      setIsEditing(false);
                      setEditedTask({
                        title: task.title || '',
                        description: task.description || '',
                        priority: task.priority || 'Medium',
                        dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
                        assignees: task.assignees || []
                      });
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="detail-action-btn primary"
                    onClick={handleSaveDetails}
                    disabled={isSavingDetails}
                  >
                    {isSavingDetails ? <FaSpinner className="spinner" /> : <FaSave />}
                    Save Changes
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Progress Tab */}
          {activeTab === 'progress' && (
            <div className="tab-content progress-tab">
              <div className="progress-update-section">
                <h4 className="section-title">Update Progress</h4>

                {isAssigned ? (
                  <>
                    <div className="progress-slider-section">
                      <div className="slider-header">
                        <span>Progress</span>
                        <span className="slider-value">{progress}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={progress}
                        onChange={(e) => setProgress(parseInt(e.target.value))}
                        className="progress-slider"
                      />
                      <div className="slider-labels">
                        <span>0%</span>
                        <span>50%</span>
                        <span>100%</span>
                      </div>
                    </div>

                    <div className="update-note-section">
                      <label>Update Note (optional)</label>
                      <textarea
                        placeholder="Add a note about this update..."
                        value={updateNote}
                        onChange={(e) => setUpdateNote(e.target.value)}
                        rows={3}
                      />
                    </div>

                    <button
                      className="submit-update-btn"
                      onClick={handleProgressUpdate}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <FaSpinner className="spinner" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <FaSave />
                          Save Progress
                        </>
                      )}
                    </button>
                  </>
                ) : (
                  <div className="read-only-notice">
                    <FaExclamationTriangle />
                    <p>Only assigned members can update progress.</p>
                  </div>
                )}

                {/* Current Progress Display */}
                <div className="current-progress-display">
                  <h4>Current Progress</h4>
                  <div className="large-progress-bar">
                    <div
                      className="large-progress-fill"
                      style={{ width: `${task.progress || 0}%` }}
                    />
                  </div>
                  <div className="progress-stats">
                    <span>{task.progress || 0}% Complete</span>
                    {task.lastProgressUpdate && (
                      <span className="last-updated">
                        Last updated: {formatRelativeTime(task.lastProgressUpdate)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Activity Tab */}
          {activeTab === 'activity' && (
            <div className="tab-content activity-tab">
              <h4 className="section-title">Activity Timeline</h4>

              {loadingActivity ? (
                <div className="loading-activity">
                  <FaSpinner className="spinner" />
                  <span>Loading activity...</span>
                </div>
              ) : activityLog.length > 0 ? (
                <div className="activity-timeline">
                  {activityLog.map((activity, index) => (
                    <div key={index} className="activity-item">
                      <div className="activity-dot" />
                      <div className="activity-content">
                        <div className="activity-header">
                          <span className="activity-user">{activity.userName || 'System'}</span>
                          <span className="activity-time">
                            {formatRelativeTime(activity.createdAt)}
                          </span>
                        </div>
                        <p className="activity-text">{activity.message}</p>
                        {activity.note && (
                          <p className="activity-note">"{activity.note}"</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-activity">
                  <FaHistory />
                  <p>No activity yet</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TaskDetailDrawer;
