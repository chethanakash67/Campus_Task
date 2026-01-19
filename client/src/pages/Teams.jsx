// client/src/pages/Teams.jsx - ENHANCED WITH TASK CREATION AND CHAT
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Toast from '../components/Toast';
// 1. Added FaComment to imports
import { FaPlus, FaTimes, FaTrash, FaEdit, FaUsers, FaTasks, FaChartLine, FaComment } from 'react-icons/fa';
import { useApp } from '../context/AppContext';
import './Dashboard.css';

function Teams() {
  const navigate = useNavigate();
  const { 
    teams, 
    tasks,
    addTeam, 
    updateTeam, 
    deleteTeam, 
    addTask,
    toasts, 
    removeToast,
    currentUser,
    isAuthenticated
  } = useApp();

  useEffect(() => {
    if (!isAuthenticated || !currentUser) {
      navigate('/login');
    }
  }, [isAuthenticated, currentUser, navigate]);

  if (!isAuthenticated || !currentUser) {
    return null;
  }
  
  const [showModal, setShowModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [selectedTeamForTask, setSelectedTeamForTask] = useState(null);
  const [expandedTeam, setExpandedTeam] = useState(null);
  
  const [newTeam, setNewTeam] = useState({
    name: '',
    description: '',
    color: 'purple',
    members: []
  });
  
  const [newMember, setNewMember] = useState({
    name: '',
    role: 'Member',
    email: ''
  });

  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'Medium',
    dueDate: '',
    assignees: []
  });

  const colors = ['purple', 'green', 'blue', 'red', 'yellow', 'pink'];

  // Get team statistics
  const getTeamStats = (teamId) => {
    const teamTasks = tasks.filter(t => t.teamId === teamId);
    return {
      total: teamTasks.length,
      completed: teamTasks.filter(t => t.status === 'done').length,
      inProgress: teamTasks.filter(t => t.status === 'in-progress').length,
      pending: teamTasks.filter(t => t.status === 'todo').length
    };
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewTeam({ ...newTeam, [name]: value });
  };

  const handleMemberInputChange = (e) => {
    const { name, value } = e.target;
    setNewMember({ ...newMember, [name]: value });
  };

  const handleTaskInputChange = (e) => {
    const { name, value } = e.target;
    setNewTask({ ...newTask, [name]: value });
  };

  const addMemberToTeam = () => {
    if (newMember.name.trim() && newMember.email.trim()) {
      const memberToAdd = {
        id: newMember.name.substring(0, 2).toUpperCase(),
        ...newMember
      };
      setNewTeam({
        ...newTeam,
        members: [...newTeam.members, memberToAdd]
      });
      setNewMember({ name: '', role: 'Member', email: '' });
    }
  };

  const removeMemberFromTeam = (memberId) => {
    setNewTeam({
      ...newTeam,
      members: newTeam.members.filter(m => m.id !== memberId)
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newTeam.name.trim()) return;

    if (editingTeam) {
      updateTeam(editingTeam.id, newTeam);
    } else {
      addTeam(newTeam);
    }
    
    resetForm();
  };

  const resetForm = () => {
    setShowModal(false);
    setEditingTeam(null);
    setNewTeam({
      name: '',
      description: '',
      color: 'purple',
      members: []
    });
    setNewMember({ name: '', role: 'Member', email: '' });
  };

  const handleEdit = (team) => {
    setEditingTeam(team);
    setNewTeam(team);
    setShowModal(true);
  };

  const handleDelete = (teamId) => {
    if (window.confirm('Are you sure you want to delete this team? Team tasks will become personal tasks.')) {
      deleteTeam(teamId);
    }
  };

  // Handle quick task creation from team
  const handleCreateTaskForTeam = (team) => {
    setSelectedTeamForTask(team);
    setNewTask({
      title: '',
      description: '',
      priority: 'Medium',
      dueDate: '',
      assignees: team.members.slice(0, 1) // Pre-select first member
    });
    setShowTaskModal(true);
  };

  const toggleTaskAssignee = (member) => {
    const isSelected = newTask.assignees.some(a => a.id === member.id);
    if (isSelected) {
      setNewTask({
        ...newTask,
        assignees: newTask.assignees.filter(a => a.id !== member.id)
      });
    } else {
      setNewTask({
        ...newTask,
        assignees: [...newTask.assignees, member]
      });
    }
  };

  const handleTaskSubmit = (e) => {
    e.preventDefault();
    if (!newTask.title.trim()) return;

    if (newTask.assignees.length === 0) {
      addToast('Please assign at least one team member', 'error');
      return;
    }

    const taskToAdd = {
      title: newTask.title,
      description: newTask.description,
      priority: newTask.priority,
      status: 'todo',
      dueDate: newTask.dueDate,
      tags: [],
      assignees: newTask.assignees.map(a => ({ ...a, type: 'user' })),
      taskType: 'team',
      teamId: selectedTeamForTask.id,
      subtasks: []
    };

    addTask(taskToAdd);
    setShowTaskModal(false);
    setNewTask({
      title: '',
      description: '',
      priority: 'Medium',
      dueDate: '',
      assignees: []
    });
    setSelectedTeamForTask(null);
  };

  const toggleExpandTeam = (teamId) => {
    setExpandedTeam(expandedTeam === teamId ? null : teamId);
  };

  // Get tasks for a specific team
  const getTeamTasks = (teamId) => {
    return tasks.filter(t => t.teamId === teamId).slice(0, 5); // Show first 5 tasks
  };

  return (
    <div className="dashboard-container">
      <Sidebar />
      <Toast toasts={toasts} removeToast={removeToast} />
      
      <main className="main-content">
        <header className="top-bar">
          <div className="page-title">
            <h1>My Teams</h1>
            <p>Manage your collaborators and projects</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <FaPlus style={{ marginRight: '8px' }} /> Create Team
          </button>
        </header>

        <div className="content-padding">
          {teams.length === 0 ? (
            <div className="empty-state-large">
              <FaUsers className="empty-icon" />
              <h3>No teams yet</h3>
              <p>Create your first team to start collaborating</p>
              <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                <FaPlus style={{ marginRight: '8px' }} /> Create Team
              </button>
            </div>
          ) : (
            <div className="teams-grid">
              {teams.map(team => {
                const stats = getTeamStats(team.id);
                const teamTasks = getTeamTasks(team.id);
                const isExpanded = expandedTeam === team.id;
                
                return (
                  <div key={team.id} className={`team-card ${isExpanded ? 'expanded' : ''}`}>
                    <div className="team-card-header">
                      <div className="team-meta">
                        <span className={`dot ${team.color}`}></span>
                        <span className="member-count">
                          {team.members.length} {team.members.length === 1 ? 'Member' : 'Members'}
                        </span>
                      </div>
                      <div className="team-actions">
                        {/* 2. Added Team Chat Button */}
                        <button 
                          className="icon-btn" 
                          onClick={() => navigate(`/teams/${team.id}/chat`)}
                          title="Team Chat"
                        >
                          <FaComment />
                        </button>
                        
                        <button 
                          className="icon-btn" 
                          onClick={() => handleCreateTaskForTeam(team)}
                          title="Create task for team"
                        >
                          <FaTasks />
                        </button>
                        <button 
                          className="icon-btn" 
                          onClick={() => handleEdit(team)}
                          title="Edit team"
                        >
                          <FaEdit />
                        </button>
                        <button 
                          className="icon-btn delete" 
                          onClick={() => handleDelete(team.id)}
                          title="Delete team"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </div>
                    
                    <h2>{team.name}</h2>
                    <p className="team-desc">{team.description}</p>

                    {/* Team Statistics */}
                    <div className="team-stats">
                      <div className="team-stat">
                        <div className="stat-value">{stats.total}</div>
                        <div className="stat-label">Total</div>
                      </div>
                      <div className="team-stat">
                        <div className="stat-value stat-pending">{stats.pending}</div>
                        <div className="stat-label">Pending</div>
                      </div>
                      <div className="team-stat">
                        <div className="stat-value stat-progress">{stats.inProgress}</div>
                        <div className="stat-label">Active</div>
                      </div>
                      <div className="team-stat">
                        <div className="stat-value stat-done">{stats.completed}</div>
                        <div className="stat-label">Done</div>
                      </div>
                    </div>

                    {/* Team Members */}
                    <div className="team-members">
                      <div className="members-label">Team Members</div>
                      <div className="members-list">
                        {team.members.slice(0, 3).map(member => (
                          <div key={member.id} className="member-item">
                            <div className="mini-avatar">{member.id}</div>
                            <div className="member-info">
                              <div className="member-name">{member.name}</div>
                              <div className="member-role">{member.role}</div>
                            </div>
                          </div>
                        ))}
                        {team.members.length > 3 && (
                          <div className="member-item more-members">
                            +{team.members.length - 3} more members
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Recent Tasks Preview */}
                    {teamTasks.length > 0 && (
                      <div className="team-tasks-preview">
                        <button 
                          className="preview-toggle"
                          onClick={() => toggleExpandTeam(team.id)}
                        >
                          <FaChartLine /> Recent Tasks ({teamTasks.length})
                          <span className="toggle-icon">{isExpanded ? '▲' : '▼'}</span>
                        </button>
                        
                        {isExpanded && (
                          <div className="tasks-preview-list">
                            {teamTasks.map(task => (
                              <div key={task.id} className="preview-task-item">
                                <span className={`priority-indicator ${task.priority.toLowerCase()}`}></span>
                                <div className="preview-task-info">
                                  <div className="preview-task-title">{task.title}</div>
                                  <div className="preview-task-meta">
                                    <span className={`status-mini ${task.status}`}>
                                      {task.status.replace('-', ' ')}
                                    </span>
                                    {task.dueDate && (
                                      <span className="due-mini">
                                        Due: {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Create/Edit Team Modal */}
        {showModal && (
          <div className="modal-overlay">
            <div className="modal-content modal-large">
              <div className="modal-header">
                <h2>{editingTeam ? 'Edit Team' : 'Create New Team'}</h2>
                <button className="close-btn" onClick={resetForm}>
                  <FaTimes />
                </button>
              </div>
              
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>Team Name *</label>
                  <input 
                    type="text" 
                    name="name" 
                    placeholder="e.g., Engineering Team" 
                    value={newTeam.name} 
                    onChange={handleInputChange} 
                    required 
                  />
                </div>

                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    name="description"
                    placeholder="What is this team working on?"
                    value={newTeam.description}
                    onChange={handleInputChange}
                    rows={3}
                  />
                </div>

                <div className="form-group">
                  <label>Team Color</label>
                  <div className="color-selector">
                    {colors.map(color => (
                      <div
                        key={color}
                        className={`color-option ${color} ${newTeam.color === color ? 'selected' : ''}`}
                        onClick={() => setNewTeam({ ...newTeam, color })}
                      />
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label>Team Members</label>
                  <div className="members-manager">
                    {newTeam.members.map(member => (
                      <div key={member.id} className="member-tag">
                        <div className="mini-avatar">{member.id}</div>
                        <span>{member.name} - {member.role}</span>
                        <button 
                          type="button" 
                          onClick={() => removeMemberFromTeam(member.id)}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                  
                  <div className="add-member-form">
                    <input
                      type="text"
                      name="name"
                      placeholder="Member name"
                      value={newMember.name}
                      onChange={handleMemberInputChange}
                    />
                    <input
                      type="email"
                      name="email"
                      placeholder="Email"
                      value={newMember.email}
                      onChange={handleMemberInputChange}
                    />
                    <select
                      name="role"
                      value={newMember.role}
                      onChange={handleMemberInputChange}
                    >
                      <option value="Lead">Lead</option>
                      <option value="Developer">Developer</option>
                      <option value="Designer">Designer</option>
                      <option value="Member">Member</option>
                    </select>
                    <button 
                      type="button" 
                      className="btn-add" 
                      onClick={addMemberToTeam}
                    >
                      Add
                    </button>
                  </div>
                </div>

                <button type="submit" className="btn btn-full">
                  {editingTeam ? 'Update Team' : 'Create Team'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Quick Create Task Modal */}
        {showTaskModal && selectedTeamForTask && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h2>Create Task for {selectedTeamForTask.name}</h2>
                <button className="close-btn" onClick={() => {
                  setShowTaskModal(false);
                  setSelectedTeamForTask(null);
                }}>
                  <FaTimes />
                </button>
              </div>
              
              <form onSubmit={handleTaskSubmit}>
                <div className="form-group">
                  <label>Task Title *</label>
                  <input 
                    type="text" 
                    name="title" 
                    placeholder="What needs to be done?" 
                    value={newTask.title} 
                    onChange={handleTaskInputChange} 
                    required 
                  />
                </div>

                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    name="description"
                    placeholder="Add details..."
                    value={newTask.description}
                    onChange={handleTaskInputChange}
                    rows={3}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Priority</label>
                    <select name="priority" value={newTask.priority} onChange={handleTaskInputChange}>
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
                      onChange={handleTaskInputChange}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Assign To *</label>
                  <div className="assignee-selector">
                    {selectedTeamForTask.members.map(member => (
                      <div 
                        key={member.id} 
                        className={`assignee-option ${newTask.assignees.some(a => a.id === member.id) ? 'selected' : ''}`}
                        onClick={() => toggleTaskAssignee(member)}
                      >
                        <div className="mini-avatar">{member.id}</div>
                        <span>{member.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button type="submit" className="btn btn-full">Create Task</button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default Teams;