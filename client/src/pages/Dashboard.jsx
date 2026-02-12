import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Toast from '../components/Toast';
import TaskDetailDrawer from '../components/TaskDetailDrawer';
import { useApp } from '../context/AppContext';
import { 
  FaArrowUp, FaArrowDown, FaExclamationTriangle, FaCalendarAlt,
  FaClock, FaCheckCircle, FaChartLine, FaArrowRight, FaPlus,
  FaTasks, FaFire, FaFlag, FaUsers, FaTrophy, FaTimes, FaUser,
  FaUserFriends, FaTag, FaClipboardList
} from 'react-icons/fa';
import { 
  MdDashboard, MdTrendingUp, MdAccessTime, MdWarning,
  MdOutlineInsights, MdSpeed, MdTimeline
} from 'react-icons/md';
import './Dashboard.css';

function Dashboard() {
  const navigate = useNavigate();
  const { 
    tasks, 
    toasts, 
    removeToast,
    currentUser,
    isAuthenticated,
    getMyTeams,
    addTask
  } = useApp();

  // Create Task Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [taskType, setTaskType] = useState('personal'); // 'personal' or 'team'
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [selectedAssignees, setSelectedAssignees] = useState([]);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'Medium',
    dueDate: '',
    tags: []
  });
  const [tagInput, setTagInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Task Detail Drawer State
  const [selectedTaskForDrawer, setSelectedTaskForDrawer] = useState(null);

  // Reset form when modal closes or task type changes
  const resetForm = () => {
    setNewTask({
      title: '',
      description: '',
      priority: 'Medium',
      dueDate: '',
      tags: []
    });
    setSelectedTeam(null);
    setSelectedAssignees([]);
    setTagInput('');
    setTaskType('personal');
  };

  // Handle modal close
  const handleCloseModal = () => {
    setShowCreateModal(false);
    resetForm();
  };

  // Handle task type change
  const handleTaskTypeChange = (type) => {
    setTaskType(type);
    setSelectedTeam(null);
    setSelectedAssignees([]);
  };

  // Handle team selection
  const handleTeamSelect = (teamId) => {
    const team = myTeams.find(t => t.id === parseInt(teamId));
    setSelectedTeam(team);
    setSelectedAssignees([]);
  };

  // Handle assignee toggle
  const handleAssigneeToggle = (member) => {
    setSelectedAssignees(prev => {
      const isSelected = prev.some(a => a.id === member.id);
      if (isSelected) {
        return prev.filter(a => a.id !== member.id);
      } else {
        return [...prev, member];
      }
    });
  };

  // Handle tag add
  const handleAddTag = (e) => {
    e.preventDefault();
    if (tagInput.trim() && !newTask.tags.includes(tagInput.trim())) {
      setNewTask(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  // Handle tag remove
  const handleRemoveTag = (tagToRemove) => {
    setNewTask(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  // Handle task creation
  const handleCreateTask = async (e) => {
    e.preventDefault();
    
    if (!newTask.title.trim()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const taskData = {
        title: newTask.title.trim(),
        description: newTask.description.trim(),
        priority: newTask.priority,
        status: 'todo',
        dueDate: newTask.dueDate || null,
        tags: newTask.tags,
        taskType: taskType,
        teamId: taskType === 'team' && selectedTeam ? selectedTeam.id : null,
        assignees: taskType === 'team' ? selectedAssignees : []
      };

      await addTask(taskData);
      handleCloseModal();
    } catch (error) {
      console.error('Error creating task:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated || !currentUser) {
      navigate('/login', { replace: true });
    }
  }, [isAuthenticated, currentUser, navigate]);

  const myTeams = getMyTeams();

  // Helper functions
  const isTaskOverdue = (task) => {
    if (!task.dueDate || task.status === 'done' || task.status === 'completed_late') return false;
    const dueDate = new Date(task.dueDate);
    const today = new Date();
    dueDate.setHours(23, 59, 59, 999);
    today.setHours(0, 0, 0, 0);
    return dueDate < today;
  };

  const isCompletedLate = (task) => task.status === 'completed_late';
  
  const isDueToday = (task) => {
    if (!task.dueDate || task.status === 'done' || task.status === 'completed_late') return false;
    const dueDate = new Date(task.dueDate);
    const today = new Date();
    return dueDate.toDateString() === today.toDateString();
  };

  const isDueThisWeek = (task) => {
    if (!task.dueDate || task.status === 'done' || task.status === 'completed_late') return false;
    const dueDate = new Date(task.dueDate);
    const today = new Date();
    const weekFromNow = new Date(today);
    weekFromNow.setDate(weekFromNow.getDate() + 7);
    return dueDate >= today && dueDate <= weekFromNow;
  };

  // Get user's tasks
  const userTasks = useMemo(() => {
    return tasks.filter(t => 
      t.assignees?.some(a => a.id === currentUser?.id || a.email === currentUser?.email) ||
      t.createdBy === currentUser?.id ||
      t.createdBy === currentUser?.email
    );
  }, [tasks, currentUser]);

  // Statistics
  const stats = useMemo(() => {
    const total = userTasks.length;
    const completed = userTasks.filter(t => t.status === 'done').length;
    const completedLate = userTasks.filter(t => isCompletedLate(t)).length;
    const overdue = userTasks.filter(t => isTaskOverdue(t)).length;
    const dueToday = userTasks.filter(t => isDueToday(t)).length;
    const dueThisWeek = userTasks.filter(t => isDueThisWeek(t)).length;
    const pending = userTasks.filter(t => t.status !== 'done' && t.status !== 'completed_late').length;
    const inProgress = userTasks.filter(t => t.status === 'in-progress').length;
    
    const completionRate = total > 0 ? Math.round(((completed + completedLate) / total) * 100) : 0;
    const onTimeRate = (completed + completedLate) > 0 
      ? Math.round((completed / (completed + completedLate)) * 100) 
      : 100;

    return {
      total,
      completed,
      completedLate,
      overdue,
      dueToday,
      dueThisWeek,
      pending,
      inProgress,
      completionRate,
      onTimeRate
    };
  }, [userTasks]);

  // Get productivity data for last 7 days
  const productivityData = useMemo(() => {
    const last7Days = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const completedOnDay = userTasks.filter(t => {
        if (t.status !== 'done' && t.status !== 'completed_late') return false;
        const completedDate = t.completedAt || t.updatedAt;
        if (!completedDate) return false;
        return new Date(completedDate).toDateString() === date.toDateString();
      }).length;

      const lateOnDay = userTasks.filter(t => {
        if (t.status !== 'completed_late') return false;
        const completedDate = t.completedAt || t.updatedAt;
        if (!completedDate) return false;
        return new Date(completedDate).toDateString() === date.toDateString();
      }).length;

      last7Days.push({
        date: date.toLocaleDateString('en-US', { weekday: 'short' }),
        fullDate: dateStr,
        completed: completedOnDay,
        late: lateOnDay,
        onTime: completedOnDay - lateOnDay
      });
    }
    
    return last7Days;
  }, [userTasks]);

  // Get top priority tasks
  const priorityTasks = useMemo(() => {
    return userTasks
      .filter(t => t.status !== 'done' && t.status !== 'completed_late')
      .sort((a, b) => {
        // Sort by overdue first, then by due date, then by priority
        const aOverdue = isTaskOverdue(a);
        const bOverdue = isTaskOverdue(b);
        if (aOverdue && !bOverdue) return -1;
        if (!aOverdue && bOverdue) return 1;
        
        // Then by due date
        if (a.dueDate && b.dueDate) {
          return new Date(a.dueDate) - new Date(b.dueDate);
        }
        if (a.dueDate) return -1;
        if (b.dueDate) return 1;
        
        // Then by priority
        const priorityOrder = { High: 0, Medium: 1, Low: 2 };
        return (priorityOrder[a.priority] || 1) - (priorityOrder[b.priority] || 1);
      })
      .slice(0, 3);
  }, [userTasks]);

  // Team stats
  const teamStats = useMemo(() => {
    if (!myTeams || myTeams.length === 0) return [];
    
    return myTeams.map(team => {
      const teamTasks = userTasks.filter(t => t.teamId === team.id);
      const pending = teamTasks.filter(t => t.status !== 'done' && t.status !== 'completed_late').length;
      const overdue = teamTasks.filter(t => isTaskOverdue(t)).length;
      const completed = teamTasks.filter(t => t.status === 'done' || t.status === 'completed_late').length;
      
      return {
        id: team.id,
        name: team.name,
        total: teamTasks.length,
        pending,
        overdue,
        completed,
        completionRate: teamTasks.length > 0 ? Math.round((completed / teamTasks.length) * 100) : 0
      };
    }).filter(t => t.total > 0);
  }, [myTeams, userTasks]);

  const maxProductivity = Math.max(...productivityData.map(d => d.completed), 1);

  const navigateToTasks = (filter) => {
    navigate('/tasks', { state: { activeFilter: filter } });
  };

  if (!isAuthenticated || !currentUser) {
    return null;
  }

  return (
    <div className="dashboard-container">
      <Sidebar />
      <main className="main-content dashboard-insights">
        <Toast toasts={toasts} removeToast={removeToast} />

        {/* Dashboard Header */}
        <div className="dashboard-header">
          <div className="header-greeting">
            <h1>Welcome back, {currentUser?.name?.split(' ')[0] || 'User'}</h1>
            <p className="header-date">
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>
          <div className="header-actions">
            <button className="btn btn-secondary" onClick={() => navigate('/tasks')}>
              <FaTasks style={{ marginRight: '8px' }} /> View Tasks
            </button>
            <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
              <FaPlus style={{ marginRight: '8px' }} /> Create Task
            </button>
          </div>
        </div>

        {/* Hero Insight Cards */}
        <div className="insight-cards-grid">
          <div 
            className={`insight-card ${stats.overdue > 0 ? 'urgent' : ''}`}
            onClick={() => navigateToTasks('overdue')}
          >
            <div className="insight-card-icon urgent">
              <FaExclamationTriangle />
            </div>
            <div className="insight-card-content">
              <span className="insight-label">Overdue Tasks</span>
              <span className="insight-value">{stats.overdue}</span>
              {stats.overdue > 0 && (
                <span className="insight-badge urgent">Needs attention</span>
              )}
            </div>
            <FaArrowRight className="insight-arrow" />
          </div>

          <div 
            className={`insight-card ${stats.dueToday > 0 ? 'warning' : ''}`}
            onClick={() => navigateToTasks('pending')}
          >
            <div className="insight-card-icon warning">
              <FaCalendarAlt />
            </div>
            <div className="insight-card-content">
              <span className="insight-label">Due Today</span>
              <span className="insight-value">{stats.dueToday}</span>
              <span className="insight-subtext">{stats.dueThisWeek} this week</span>
            </div>
            <FaArrowRight className="insight-arrow" />
          </div>

          <div 
            className={`insight-card ${stats.completedLate > 0 ? 'late' : ''}`}
            onClick={() => navigateToTasks('completed')}
          >
            <div className="insight-card-icon late">
              <FaClock />
            </div>
            <div className="insight-card-content">
              <span className="insight-label">Late Submissions</span>
              <span className="insight-value">{stats.completedLate}</span>
              <span className="insight-subtext">{stats.onTimeRate}% on-time rate</span>
            </div>
            <FaArrowRight className="insight-arrow" />
          </div>

          <div 
            className="insight-card success"
            onClick={() => navigateToTasks('completed')}
          >
            <div className="insight-card-icon success">
              <FaCheckCircle />
            </div>
            <div className="insight-card-content">
              <span className="insight-label">Completion Rate</span>
              <span className="insight-value">{stats.completionRate}%</span>
              <span className="insight-subtext">{stats.completed + stats.completedLate} of {stats.total} tasks</span>
            </div>
            <FaArrowRight className="insight-arrow" />
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="dashboard-content-grid">
          {/* Productivity Timeline */}
          <div className="dashboard-section productivity-section">
            <div className="section-header">
              <div className="section-title">
                <MdTimeline className="section-icon" />
                <h2>Productivity Timeline</h2>
              </div>
              <span className="section-subtitle">Last 7 days</span>
            </div>
            <div className="productivity-chart">
              {productivityData.map((day, index) => (
                <div className="chart-bar-container" key={index}>
                  <div className="chart-bar-wrapper">
                    <div 
                      className="chart-bar on-time"
                      style={{ height: `${(day.onTime / maxProductivity) * 100}%` }}
                    >
                      {day.onTime > 0 && <span className="bar-value">{day.onTime}</span>}
                    </div>
                    <div 
                      className="chart-bar late"
                      style={{ height: `${(day.late / maxProductivity) * 100}%` }}
                    >
                      {day.late > 0 && <span className="bar-value">{day.late}</span>}
                    </div>
                  </div>
                  <span className="chart-label">{day.date}</span>
                </div>
              ))}
            </div>
            <div className="chart-legend">
              <div className="legend-item">
                <span className="legend-dot on-time"></span>
                <span>On Time</span>
              </div>
              <div className="legend-item">
                <span className="legend-dot late"></span>
                <span>Late</span>
              </div>
            </div>
          </div>

          {/* Priority Focus Panel */}
          <div className="dashboard-section priority-section">
            <div className="section-header">
              <div className="section-title">
                <FaFire className="section-icon priority" />
                <h2>Priority Focus</h2>
              </div>
              <span className="section-subtitle">Most urgent tasks</span>
            </div>
            <div className="priority-list">
              {priorityTasks.length === 0 ? (
                <div className="empty-priority">
                  <FaTrophy className="empty-icon" />
                  <p>All caught up! No urgent tasks.</p>
                </div>
              ) : (
                priorityTasks.map((task, index) => (
                  <div 
                    className={`priority-item ${isTaskOverdue(task) ? 'overdue' : ''}`}
                    key={task.id}
                    onClick={() => setSelectedTaskForDrawer(task)}
                  >
                    <span className="priority-rank">{index + 1}</span>
                    <div className="priority-content">
                      <h4>{task.title}</h4>
                      <div className="priority-meta">
                        {task.dueDate && (
                          <span className={`due-tag ${isTaskOverdue(task) ? 'overdue' : isDueToday(task) ? 'today' : ''}`}>
                            <FaCalendarAlt />
                            {isTaskOverdue(task) 
                              ? 'Overdue' 
                              : isDueToday(task) 
                                ? 'Due Today'
                                : new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                            }
                          </span>
                        )}
                        <span className={`priority-tag ${task.priority.toLowerCase()}`}>
                          <FaFlag /> {task.priority}
                        </span>
                      </div>
                    </div>
                    <FaArrowRight className="priority-arrow" />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Team Snapshot */}
        {teamStats.length > 0 && (
          <div className="dashboard-section team-section">
            <div className="section-header">
              <div className="section-title">
                <FaUsers className="section-icon team" />
                <h2>Team Snapshot</h2>
              </div>
              <button className="section-link" onClick={() => navigate('/teams')}>
                View Teams <FaArrowRight />
              </button>
            </div>
            <div className="team-cards-grid">
              {teamStats.map(team => (
                <div className="team-stat-card" key={team.id}>
                  <div className="team-stat-header">
                    <h4>{team.name}</h4>
                    <span className="team-completion">{team.completionRate}%</span>
                  </div>
                  <div className="team-stat-bars">
                    <div className="stat-bar-row">
                      <span className="stat-bar-label">Pending</span>
                      <div className="stat-bar-track">
                        <div 
                          className="stat-bar-fill pending"
                          style={{ width: `${team.total > 0 ? (team.pending / team.total) * 100 : 0}%` }}
                        ></div>
                      </div>
                      <span className="stat-bar-value">{team.pending}</span>
                    </div>
                    <div className="stat-bar-row">
                      <span className="stat-bar-label">Overdue</span>
                      <div className="stat-bar-track">
                        <div 
                          className="stat-bar-fill overdue"
                          style={{ width: `${team.total > 0 ? (team.overdue / team.total) * 100 : 0}%` }}
                        ></div>
                      </div>
                      <span className="stat-bar-value">{team.overdue}</span>
                    </div>
                    <div className="stat-bar-row">
                      <span className="stat-bar-label">Completed</span>
                      <div className="stat-bar-track">
                        <div 
                          className="stat-bar-fill completed"
                          style={{ width: `${team.total > 0 ? (team.completed / team.total) * 100 : 0}%` }}
                        ></div>
                      </div>
                      <span className="stat-bar-value">{team.completed}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions CTA */}
        <div className="dashboard-cta-section">
          <div className="cta-card" onClick={() => navigate('/tasks')}>
            <FaTasks className="cta-icon" />
            <div className="cta-content">
              <h3>View All Tasks</h3>
              <p>Manage and organize your work</p>
            </div>
            <FaArrowRight className="cta-arrow" />
          </div>
          <div className="cta-card primary" onClick={() => setShowCreateModal(true)}>
            <FaPlus className="cta-icon" />
            <div className="cta-content">
              <h3>Create New Task</h3>
              <p>Add a new task to your list</p>
            </div>
            <FaArrowRight className="cta-arrow" />
          </div>
          {stats.overdue > 0 && (
            <div className="cta-card urgent" onClick={() => navigateToTasks('overdue')}>
              <FaExclamationTriangle className="cta-icon" />
              <div className="cta-content">
                <h3>Review Overdue</h3>
                <p>{stats.overdue} tasks need attention</p>
              </div>
              <FaArrowRight className="cta-arrow" />
            </div>
          )}
        </div>

      </main>

      {/* Create Task Modal */}
      {showCreateModal && (
        <div className="create-task-modal-overlay" onClick={handleCloseModal}>
          <div className="create-task-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2><FaPlus /> Create New Task</h2>
              <button 
                type="button"
                className="modal-close" 
                onClick={handleCloseModal}
                aria-label="Close modal"
                title="Close"
              >
                <span className="close-icon">×</span>
              </button>
            </div>

            <form onSubmit={handleCreateTask}>
              {/* Task Type Toggle */}
              <div className="task-type-toggle">
                <button
                  type="button"
                  className={`type-btn ${taskType === 'personal' ? 'active' : ''}`}
                  onClick={() => handleTaskTypeChange('personal')}
                >
                  <FaUser /> Personal Task
                </button>
                <button
                  type="button"
                  className={`type-btn ${taskType === 'team' ? 'active' : ''}`}
                  onClick={() => handleTaskTypeChange('team')}
                >
                  <FaUserFriends /> Team Task
                </button>
              </div>

              {/* Team Selection (only for team tasks) */}
              {taskType === 'team' && (
                <div className="form-group">
                  <label><FaUsers /> Select Team</label>
                  <select
                    value={selectedTeam?.id || ''}
                    onChange={(e) => handleTeamSelect(e.target.value)}
                    required={taskType === 'team'}
                  >
                    <option value="">Choose a team...</option>
                    {myTeams.map(team => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Assignees (only for team tasks with team selected) */}
              {taskType === 'team' && selectedTeam && selectedTeam.members && (
                <div className="form-group">
                  <label><FaUserFriends /> Assign to Team Members</label>
                  <p className="form-hint">Selected members will receive an email notification</p>
                  <div className="assignees-grid">
                    {selectedTeam.members
                      .map(member => (
                        <div
                          key={member.id}
                          className={`assignee-chip ${selectedAssignees.some(a => a.id === member.id) ? 'selected' : ''}`}
                          onClick={() => handleAssigneeToggle(member)}
                        >
                          <div className="assignee-avatar">
                            {member.name?.charAt(0).toUpperCase() || 'U'}
                          </div>
                          <span className="assignee-name">
                            {member.name}
                            {member.id === currentUser?.id && ' (You)'}
                          </span>
                          {selectedAssignees.some(a => a.id === member.id) && (
                            <FaCheckCircle className="check-icon" />
                          )}
                        </div>
                      ))}
                  </div>
                  {selectedTeam.members.length === 0 && (
                    <p className="no-members">No members in this team to assign</p>
                  )}
                </div>
              )}

              {/* Task Title */}
              <div className="form-group">
                <label><FaClipboardList /> Task Title *</label>
                <input
                  type="text"
                  placeholder="What needs to be done?"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  required
                  autoFocus
                />
              </div>

              {/* Task Description */}
              <div className="form-group">
                <label>Description</label>
                <textarea
                  placeholder="Add more details about this task..."
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  rows={3}
                />
              </div>

              {/* Priority and Due Date Row */}
              <div className="form-row">
                <div className="form-group">
                  <label><FaFlag /> Priority</label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
                <div className="form-group">
                  <label><FaCalendarAlt /> Due Date</label>
                  <input
                    type="date"
                    value={newTask.dueDate}
                    onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>

              {/* Tags */}
              <div className="form-group">
                <label><FaTag /> Tags</label>
                <div className="tags-input-wrapper">
                  <div className="tags-display">
                    {newTask.tags.map(tag => (
                      <span key={tag} className="tag-chip">
                        {tag}
                        <button type="button" onClick={() => handleRemoveTag(tag)}>
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="tag-input-row">
                    <input
                      type="text"
                      placeholder="Add a tag..."
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddTag(e)}
                    />
                    <button type="button" onClick={handleAddTag} className="add-tag-btn">
                      Add
                    </button>
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={isSubmitting || !newTask.title.trim()}
                >
                  {isSubmitting ? 'Creating...' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Detail Drawer */}
      {selectedTaskForDrawer && (
        <TaskDetailDrawer
          task={selectedTaskForDrawer}
          onClose={() => setSelectedTaskForDrawer(null)}
          onTaskUpdate={(updatedTask) => {
            setSelectedTaskForDrawer(updatedTask);
          }}
        />
      )}
    </div>
  );
}

export default Dashboard;
