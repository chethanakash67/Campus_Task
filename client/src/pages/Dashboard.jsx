// client/src/pages/Dashboard.jsx - ENHANCED WITH PERSONAL & TEAM TASKS
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import TaskDetailModal from '../components/TaskDetailModal';
import Toast from '../components/Toast';
import { FaPlus, FaEllipsisH, FaTimes, FaUsers, FaUser, FaSearch, FaFilter, FaCopy, FaFileImport } from 'react-icons/fa';
import { useApp } from '../context/AppContext';
import './Dashboard.css';

function Dashboard() {
  const navigate = useNavigate();
  const { 
    tasks, 
    addTask, 
    moveTask, 
    duplicateTask,
    toasts, 
    removeToast,
    addToast,
    currentUser,
    isAuthenticated,
    getMyTeams,
    getAllTeamMembers,
    taskTemplates
  } = useApp();

  const [showModal, setShowModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [draggedTask, setDraggedTask] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterAssignee, setFilterAssignee] = useState('all');
  const [activeTab, setActiveTab] = useState('personal'); // 'personal' or 'team'
  const [selectedTeamFilter, setSelectedTeamFilter] = useState('all');
  
  // Redirect to login if not authenticated (check after state initialization)
  useEffect(() => {
    // Small delay to ensure state is loaded from localStorage
    const timer = setTimeout(() => {
      if (!isAuthenticated || !currentUser) {
        navigate('/login', { replace: true });
      }
    }, 50);
    
    return () => clearTimeout(timer);
  }, [isAuthenticated, currentUser, navigate]);

  // New Task Form State
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    priority: "Medium",
    dueDate: "",
    tags: [],
    assignees: [],
    status: "todo",
    taskType: "personal",
    teamId: null,
    newTag: ""
  });

  // Show loading or redirect if not authenticated
  if (!isAuthenticated || !currentUser) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '1.2rem',
        color: '#666'
      }}>
        Loading...
      </div>
    );
  }

  const myTeams = getMyTeams();
  const allMembers = getAllTeamMembers();

  // Filtered tasks based on tab and filters
  const filteredTasks = useMemo(() => {
    let filtered = tasks;

    // Filter by tab (Personal or Team)
    if (activeTab === 'personal') {
      filtered = filtered.filter(task => 
        task.taskType === 'personal' && 
        task.assignees?.some(a => a.id === currentUser?.id)
      );
    } else {
      filtered = filtered.filter(task => task.taskType === 'team');
      
      // Filter by selected team
      if (selectedTeamFilter !== 'all') {
        filtered = filtered.filter(task => task.teamId === parseInt(selectedTeamFilter));
      }
    }

    // Search filter
    filtered = filtered.filter(task => {
      const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesPriority = filterPriority === 'all' || task.priority.toLowerCase() === filterPriority;
      const matchesAssignee = filterAssignee === 'all' || task.assignees?.some(a => a.id === filterAssignee);
      
      return matchesSearch && matchesPriority && matchesAssignee;
    });

    return filtered;
  }, [tasks, searchQuery, filterPriority, filterAssignee, activeTab, selectedTeamFilter, currentUser?.id]);

  // Statistics
  const stats = useMemo(() => {
    const relevantTasks = activeTab === 'personal' 
      ? tasks.filter(t => t.taskType === 'personal' && t.assignees?.some(a => a.id === currentUser?.id))
      : tasks.filter(t => t.taskType === 'team' && (selectedTeamFilter === 'all' || t.teamId === parseInt(selectedTeamFilter)));

    return {
      total: relevantTasks.length,
      todo: relevantTasks.filter(t => t.status === 'todo').length,
      inProgress: relevantTasks.filter(t => t.status === 'in-progress').length,
      done: relevantTasks.filter(t => t.status === 'done').length,
      overdue: relevantTasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done').length
    };
  }, [tasks, activeTab, selectedTeamFilter, currentUser?.id]);

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewTask({ ...newTask, [name]: value });
  };

  // Handle task type change
  const handleTaskTypeChange = (type) => {
    setNewTask({ 
      ...newTask, 
      taskType: type,
      teamId: type === 'personal' ? null : newTask.teamId,
      assignees: type === 'personal' && currentUser ? [{ id: currentUser.id, name: currentUser.name, type: 'user' }] : []
    });
  };

  // Handle team selection
  const handleTeamSelect = (e) => {
    const teamId = e.target.value ? parseInt(e.target.value) : null;
    const team = myTeams.find(t => t.id === teamId);
    
    setNewTask({ 
      ...newTask, 
      teamId,
      assignees: team ? team.members.slice(0, 1).map(m => ({ ...m, type: 'user' })) : []
    });
  };

  // Toggle assignee
  const toggleAssignee = (member) => {
    const isSelected = newTask.assignees.some(a => a.id === member.id);
    if (isSelected) {
      setNewTask({
        ...newTask,
        assignees: newTask.assignees.filter(a => a.id !== member.id)
      });
    } else {
      setNewTask({
        ...newTask,
        assignees: [...newTask.assignees, { ...member, type: 'user' }]
      });
    }
  };

  // Add task from template
  const applyTemplate = (template) => {
    setNewTask({
      ...newTask,
      title: template.name,
      description: template.description,
      priority: template.priority,
      tags: [...template.tags],
      subtasks: template.subtasks.map((st, idx) => ({ id: idx + 1, ...st }))
    });
  };

  // Handle adding task
  const handleAddTask = (e) => {
    e.preventDefault();
    if (!newTask.title) return;

    // Ensure at least one assignee for team tasks
    if (newTask.taskType === 'team' && newTask.assignees.length === 0) {
      addToast('Please assign at least one team member', 'error');
      return;
    }

    // Ensure team is selected for team tasks
    if (newTask.taskType === 'team' && !newTask.teamId) {
      addToast('Please select a team', 'error');
      return;
    }

    const taskToAdd = {
      title: newTask.title,
      description: newTask.description,
      priority: newTask.priority,
      status: newTask.status,
      dueDate: newTask.dueDate,
      tags: newTask.tags,
      assignees: newTask.assignees,
      taskType: newTask.taskType,
      teamId: newTask.teamId,
      subtasks: newTask.subtasks || []
    };

    addTask(taskToAdd);
    setShowModal(false);
    resetForm();
  };

  const resetForm = () => {
    setNewTask({ 
      title: "", 
      description: "",
      priority: "Medium", 
      dueDate: "",
      tags: [],
      assignees: [],
      status: "todo",
      taskType: "personal",
      teamId: null,
      newTag: "",
      subtasks: []
    });
  };

  // Drag and Drop
  const handleDragStart = (e, task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, newStatus) => {
    e.preventDefault();
    if (draggedTask && draggedTask.status !== newStatus) {
      moveTask(draggedTask.id, newStatus);
    }
    setDraggedTask(null);
  };

  const handleDragEnd = () => {
    setDraggedTask(null);
  };

  // Tag management
  const addTag = () => {
    if (newTask.newTag.trim() && !newTask.tags.includes(newTask.newTag.trim())) {
      setNewTask({ 
        ...newTask, 
        tags: [...newTask.tags, newTask.newTag.trim()],
        newTag: ""
      });
    }
  };

  const removeTag = (tagToRemove) => {
    setNewTask({
      ...newTask,
      tags: newTask.tags.filter(tag => tag !== tagToRemove)
    });
  };

  // Quick actions
  const handleQuickDuplicate = (task) => {
    duplicateTask(task.id);
  };

  // Get available assignees based on task type
  const getAvailableAssignees = () => {
    if (newTask.taskType === 'personal' && currentUser) {
      return [{ id: currentUser.id, name: currentUser.name, email: currentUser.email, role: 'You' }];
    } else if (newTask.teamId) {
      const team = myTeams.find(t => t.id === newTask.teamId);
      return team ? team.members : [];
    }
    return [];
  };

  return (
    <div className="dashboard-container">
      <Sidebar />
      <main className="main-content">
        <Toast toasts={toasts} removeToast={removeToast} />

        {/* Header */}
        <header className="top-bar">
          <div className="page-title">
            <h1>Dashboard</h1>
            <p>Manage your tasks and projects</p>
          </div>
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            <FaPlus style={{ marginRight: '8px' }} /> New Task
          </button>
        </header>

        {/* Tab Navigation */}
        <div className="tabs-container">
          <div className="tabs">
            <button 
              className={`tab ${activeTab === 'personal' ? 'active' : ''}`}
              onClick={() => setActiveTab('personal')}
            >
              <FaUser /> Personal Tasks
            </button>
            <button 
              className={`tab ${activeTab === 'team' ? 'active' : ''}`}
              onClick={() => setActiveTab('team')}
            >
              <FaUsers /> Team Tasks
            </button>
          </div>
          
          {/* Team filter for team tasks */}
          {activeTab === 'team' && myTeams.length > 0 && (
            <select 
              className="team-filter-select"
              value={selectedTeamFilter}
              onChange={(e) => setSelectedTeamFilter(e.target.value)}
            >
              <option value="all">All Teams</option>
              {myTeams.map(team => (
                <option key={team.id} value={team.id}>{team.name}</option>
              ))}
            </select>
          )}
        </div>

        {/* Stats Cards */}
        <div className="stats-container">
          <div className="stat-card">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total Tasks</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.todo}</div>
            <div className="stat-label">To Do</div>
          </div>
          <div className="stat-card stat-primary">
            <div className="stat-value">{stats.inProgress}</div>
            <div className="stat-label">In Progress</div>
          </div>
          <div className="stat-card stat-success">
            <div className="stat-value">{stats.done}</div>
            <div className="stat-label">Completed</div>
          </div>
          {stats.overdue > 0 && (
            <div className="stat-card stat-danger">
              <div className="stat-value">{stats.overdue}</div>
              <div className="stat-label">Overdue</div>
            </div>
          )}
        </div>

        {/* Search and Filter */}
        <div className="filter-bar">
          <div className="search-box">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="filter-group">
            <FaFilter className="filter-icon" />
            <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
              <option value="all">All Priorities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <select value={filterAssignee} onChange={(e) => setFilterAssignee(e.target.value)}>
              <option value="all">All Assignees</option>
              {allMembers.map(member => (
                <option key={member.id} value={member.id}>{member.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Kanban Board */}
        <div className="board-grid">
          {['todo', 'in-progress', 'done'].map(status => (
            <div 
              className="board-column" 
              key={status}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, status)}
            >
              <div className="column-header">
                <span className={`status-dot ${status === 'todo' ? 'grey' : status === 'in-progress' ? 'blue' : 'green'}`}></span>
                <h2>{status === 'todo' ? 'To Do' : status === 'in-progress' ? 'In Progress' : 'Done'}</h2>
                <span className="count">{filteredTasks.filter(t => t.status === status).length}</span>
              </div>
              <div className="task-list">
                {filteredTasks.filter(t => t.status === status).length === 0 ? (
                  <div className="empty-state">
                    <p>No tasks here</p>
                    <span>Drag tasks or create new ones</span>
                  </div>
                ) : (
                  filteredTasks.filter(t => t.status === status).map(task => (
                    <TaskCard 
                      key={task.id} 
                      task={task} 
                      onDragStart={handleDragStart}
                      onDragEnd={handleDragEnd}
                      onClick={() => setSelectedTask(task)}
                      onDuplicate={handleQuickDuplicate}
                    />
                  ))
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Create Task Modal */}
        {showModal && (
          <div className="modal-overlay">
            <div className="modal-content modal-create-task">
              <div className="modal-header">
                <h2>Create New Task</h2>
                <button className="close-btn" onClick={() => { setShowModal(false); resetForm(); }}>
                  <FaTimes />
                </button>
              </div>
              
              <form onSubmit={handleAddTask}>
                {/* Task Type Selection */}
                <div className="form-group">
                  <label>Task Type *</label>
                  <div className="task-type-selector">
                    <button
                      type="button"
                      className={`task-type-btn ${newTask.taskType === 'personal' ? 'active' : ''}`}
                      onClick={() => handleTaskTypeChange('personal')}
                    >
                      <FaUser /> Personal Task
                    </button>
                    <button
                      type="button"
                      className={`task-type-btn ${newTask.taskType === 'team' ? 'active' : ''}`}
                      onClick={() => handleTaskTypeChange('team')}
                    >
                      <FaUsers /> Team Task
                    </button>
                  </div>
                </div>

                {/* Team Selection (only for team tasks) */}
                {newTask.taskType === 'team' && (
                  <div className="form-group">
                    <label>Select Team *</label>
                    <select 
                      value={newTask.teamId || ''} 
                      onChange={handleTeamSelect}
                      required
                    >
                      <option value="">Choose a team...</option>
                      {myTeams.map(team => (
                        <option key={team.id} value={team.id}>{team.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Template Selection */}
                <div className="form-group">
                  <label>Use Template (Optional)</label>
                  <div className="template-selector">
                    {taskTemplates.map((template, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className="template-btn"
                        onClick={() => applyTemplate(template)}
                        title={template.description}
                      >
                        <FaFileImport /> {template.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label>Task Title *</label>
                  <input 
                    type="text" 
                    name="title" 
                    placeholder="e.g., Fix Navigation Bug" 
                    value={newTask.title} 
                    onChange={handleInputChange} 
                    autoFocus 
                    required 
                  />
                </div>

                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    name="description"
                    placeholder="Add more details about this task..."
                    value={newTask.description}
                    onChange={handleInputChange}
                    rows={3}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Priority</label>
                    <select name="priority" value={newTask.priority} onChange={handleInputChange}>
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Due Date</label>
                    <input
                      type="date"
                      name="dueDate"
                      value={newTask.dueDate}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="form-group">
                    <label>Status</label>
                    <select name="status" value={newTask.status} onChange={handleInputChange}>
                      <option value="todo">To Do</option>
                      <option value="in-progress">In Progress</option>
                      <option value="done">Done</option>
                    </select>
                  </div>
                </div>

                {/* Assignees */}
                <div className="form-group">
                  <label>
                    Assign To {newTask.taskType === 'team' && '*'}
                    <span className="label-info">
                      ({newTask.assignees.length} selected)
                    </span>
                  </label>
                  <div className="assignee-selector-enhanced">
                    {getAvailableAssignees().map(member => (
                      <div 
                        key={member.id} 
                        className={`assignee-option ${newTask.assignees.some(a => a.id === member.id) ? 'selected' : ''}`}
                        onClick={() => newTask.taskType !== 'personal' && toggleAssignee(member)}
                        style={{ cursor: newTask.taskType === 'personal' ? 'not-allowed' : 'pointer' }}
                      >
                        <div className="mini-avatar">{member.id}</div>
                        <div className="assignee-info">
                          <div className="assignee-name">{member.name}</div>
                          <div className="assignee-role">{member.role}</div>
                        </div>
                      </div>
                    ))}
                    {getAvailableAssignees().length === 0 && (
                      <div className="no-assignees">
                        {newTask.taskType === 'team' 
                          ? 'Please select a team first' 
                          : 'Personal tasks are assigned to you'}
                      </div>
                    )}
                  </div>
                </div>

                {/* Tags */}
                <div className="form-group">
                  <label>Tags</label>
                  <div className="tags-input">
                    <div className="tags-display">
                      {newTask.tags.map((tag, idx) => (
                        <span key={idx} className="tag">
                          {tag}
                          <button type="button" onClick={() => removeTag(tag)}>×</button>
                        </span>
                      ))}
                    </div>
                    <div className="tag-input-row">
                      <input
                        type="text"
                        name="newTag"
                        placeholder="Add a tag..."
                        value={newTask.newTag}
                        onChange={handleInputChange}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                      />
                      <button type="button" className="btn-add-tag" onClick={addTag}>
                        Add
                      </button>
                    </div>
                  </div>
                </div>

                <button type="submit" className="btn btn-full">Create Task</button>
              </form>
            </div>
          </div>
        )}

        {/* Task Detail Modal */}
        {selectedTask && (
          <TaskDetailModal 
            task={selectedTask} 
            onClose={() => setSelectedTask(null)} 
          />
        )}
      </main>
    </div>
  );
}

// Enhanced Task Card Component
function TaskCard({ task, onDragStart, onDragEnd, onClick, onDuplicate }) {
  const [showQuickActions, setShowQuickActions] = useState(false);
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done';
  const completedSubtasks = task.subtasks?.filter(st => st.completed).length || 0;
  const totalSubtasks = task.subtasks?.length || 0;

  return (
    <div 
      className={`task-card ${isOverdue ? 'overdue-card' : ''} ${task.taskType === 'team' ? 'team-task-card' : 'personal-task-card'}`}
      draggable
      onDragStart={(e) => onDragStart(e, task)}
      onDragEnd={onDragEnd}
      onClick={onClick}
      onMouseEnter={() => setShowQuickActions(true)}
      onMouseLeave={() => setShowQuickActions(false)}
    >
      {/* Task Type Badge */}
      {task.taskType === 'team' && (
        <div className="task-type-badge">
          <FaUsers /> Team
        </div>
      )}

      <div className="task-header">
        <span className={`priority-tag ${task.priority.toLowerCase()}`}>{task.priority}</span>
        <div className="task-actions">
          {showQuickActions && (
            <button 
              className="quick-action-btn" 
              onClick={(e) => { e.stopPropagation(); onDuplicate(task); }}
              title="Duplicate task"
            >
              <FaCopy />
            </button>
          )}
          <button className="more-options" onClick={(e) => e.stopPropagation()}>
            <FaEllipsisH />
          </button>
        </div>
      </div>
      
      <h3>{task.title}</h3>
      
      {task.description && (
        <p className="task-excerpt">{task.description.substring(0, 60)}...</p>
      )}

      {task.tags && task.tags.length > 0 && (
        <div className="task-tags">
          {task.tags.slice(0, 2).map((tag, idx) => (
            <span key={idx} className="mini-tag">{tag}</span>
          ))}
          {task.tags.length > 2 && <span className="mini-tag">+{task.tags.length - 2}</span>}
        </div>
      )}

      {totalSubtasks > 0 && (
        <div className="task-progress">
          <div className="progress-mini">
            <div 
              className="progress-mini-fill" 
              style={{ width: `${(completedSubtasks / totalSubtasks) * 100}%` }}
            ></div>
          </div>
          <span className="progress-text">{completedSubtasks}/{totalSubtasks}</span>
        </div>
      )}

      <div className="task-footer">
        <div className="assignees">
          {task.assignees.slice(0, 3).map((assignee, index) => (
            <span key={index} className="mini-avatar" title={assignee.name}>{assignee.id}</span>
          ))}
          {task.assignees.length > 3 && (
            <span className="mini-avatar more-assignees">+{task.assignees.length - 3}</span>
          )}
        </div>
        {task.dueDate && (
          <span className={`due-date ${isOverdue ? 'overdue' : ''}`}>
            {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        )}
      </div>
    </div>
  );
}

export default Dashboard;