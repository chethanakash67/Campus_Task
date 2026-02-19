// client/src/pages/Teams.jsx - LOOMIO-STYLE UI VERSION
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import Sidebar from '../components/Sidebar';
import Toast from '../components/Toast';
import { FaPlus, FaTimes, FaTrash, FaEdit, FaUsers, FaTasks, FaChartLine, FaComment, FaUserPlus, FaEllipsisH, FaSearch } from 'react-icons/fa';
import { MdGroup, MdOutlineTaskAlt, MdPending, MdPlayCircle, MdGroups } from 'react-icons/md';
import { useApp } from '../context/AppContext';
import './Dashboard.css';
import './Teams.css';

function Teams() {
  const navigate = useNavigate();
  const {
    teams,
    tasks,
    addTeam,
    updateTeam,
    deleteTeam,
    addTask,
    addToast,
    toasts,
    removeToast,
    currentUser,
    isAuthenticated,
    joinTeamByCode,
    fetchJoinRequests,
    approveJoinRequest,
    rejectJoinRequest,
    joinRequests
  } = useApp();

  useEffect(() => {
    if (!isAuthenticated || !currentUser) {
      navigate('/login');
    }
  }, [isAuthenticated, currentUser, navigate]);

  const [showModal, setShowModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [selectedTeamForTask, setSelectedTeamForTask] = useState(null);
  const [expandedTeam, setExpandedTeam] = useState(null);

  const [newTeam, setNewTeam] = useState({
    name: '',
    description: '',
    color: 'purple',
    members: [],
    isPublic: true
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

  const [searchQuery, setSearchQuery] = useState('');
  const colors = ['purple', 'green', 'blue', 'red', 'yellow', 'pink'];
  const location = useLocation();

  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [standupsByTeam, setStandupsByTeam] = useState({});
  const [standupFormByTeam, setStandupFormByTeam] = useState({});
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const code = params.get('code');
    if (code) {
      setJoinCode(code);
      setShowJoinModal(true);
    }
  }, [location.search]);

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

  // Filter teams based on search
  const filteredTeams = teams.filter(team =>
    team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    team.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
      const normalizedEmail = newMember.email.trim().toLowerCase();
      if (newTeam.members.some(m => m.email?.toLowerCase() === normalizedEmail)) {
        addToast('Member already added', 'info');
        return;
      }
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

  const removeMemberFromTeam = (memberEmail) => {
    setNewTeam({
      ...newTeam,
      members: newTeam.members.filter(m => m.email?.toLowerCase() !== memberEmail?.toLowerCase())
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newTeam.name.trim()) {
      addToast('Team name is required', 'error');
      return;
    }

    try {
      if (editingTeam) {
        console.log('Submitting team update:', editingTeam.id, newTeam); // Debug
        await updateTeam(editingTeam.id, newTeam);
        resetForm();
      } else {
        await addTeam(newTeam);
        resetForm();
      }
    } catch (error) {
      console.error('Submit error:', error);
      // Don't reset form on error so user can try again
    }
  };

  const resetForm = () => {
    setShowModal(false);
    setEditingTeam(null);
    setNewTeam({
      name: '',
      description: '',
      color: 'purple',
      members: [],
      isPublic: true
    });
    setNewMember({ name: '', role: 'Member', email: '' });
  };

  const handleEdit = (team) => {
    setEditingTeam(team);
    setNewTeam({
      name: team.name,
      description: team.description,
      color: team.color,
      members: team.members || [],
      isPublic: team.is_public ?? true
    });
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
    const next = expandedTeam === teamId ? null : teamId;
    setExpandedTeam(next);
    if (next) {
      loadStandups(next);
    }
  };

  const loadStandups = async (teamId) => {
    try {
      const token = localStorage.getItem('campusToken');
      const response = await axios.get(`${API_URL}/teams/${teamId}/standups/today`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStandupsByTeam(prev => ({ ...prev, [teamId]: response.data }));
    } catch (error) {
      console.error('Load standups error:', error);
    }
  };

  const submitStandup = async (teamId) => {
    const current = standupFormByTeam[teamId] || { planToday: '', blockers: '' };
    if (!current.planToday?.trim()) {
      addToast('Stand-up plan is required', 'error');
      return;
    }
    try {
      const token = localStorage.getItem('campusToken');
      await axios.post(`${API_URL}/teams/${teamId}/standups`, {
        planToday: current.planToday,
        blockers: current.blockers
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      addToast('Stand-up saved for today', 'success');
      setStandupFormByTeam(prev => ({
        ...prev,
        [teamId]: { planToday: '', blockers: '' }
      }));
      await loadStandups(teamId);
    } catch (error) {
      console.error('Submit standup error:', error);
      addToast(error.response?.data?.error || 'Failed to submit stand-up', 'error');
    }
  };

  useEffect(() => {
    const ownerPrivateTeams = teams.filter(t => t.is_owner && !t.is_public);
    ownerPrivateTeams.forEach(team => {
      fetchJoinRequests(team.id);
    });
  }, [teams, fetchJoinRequests]);

  // Get tasks for a specific team
  const getTeamTasks = (teamId) => {
    return tasks.filter(t => t.teamId === teamId).slice(0, 5); // Show first 5 tasks
  };

  const handleJoinSubmit = async (e) => {
    e.preventDefault();
    if (!joinCode.trim()) {
      addToast('Team code is required', 'error');
      return;
    }
    try {
      setJoinLoading(true);
      await joinTeamByCode(joinCode);
      setShowJoinModal(false);
      setJoinCode('');
    } finally {
      setJoinLoading(false);
    }
  };

  const copyToClipboard = async (text, successMessage) => {
    try {
      await navigator.clipboard.writeText(text);
      addToast(successMessage, 'success');
    } catch (error) {
      console.error('Clipboard error:', error);
      addToast('Failed to copy', 'error');
    }
  };

  if (!isAuthenticated || !currentUser) {
    return null;
  }

  return (
    <div className="dashboard-container">
      <Sidebar />
      <Toast toasts={toasts} removeToast={removeToast} />

      <main className="main-content">
        {/* Page Header Card - Loomio Style */}
        <div className="page-header-card">
          <div className="page-header-content">
            <div className="page-header-icon">
              <MdGroups />
            </div>
            <div className="page-header-text">
              <h1>Teams</h1>
              <p>Collaborate with your teammates on shared projects and tasks</p>
            </div>
          </div>
          <div className="page-header-actions">
            <button className="btn btn-secondary" onClick={() => setShowJoinModal(true)}>
              <FaUserPlus style={{ marginRight: '8px' }} /> Join Team
            </button>
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
              <FaPlus style={{ marginRight: '8px' }} /> Create Team
            </button>
          </div>
        </div>

        {/* Search and Filter Section */}
        <div className="teams-filter-section">
          <div className="search-input-wrapper">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search teams..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
          <div className="teams-count">
            <span>{filteredTeams.length} {filteredTeams.length === 1 ? 'Team' : 'Teams'}</span>
          </div>
        </div>

        <div className="content-padding">
          {filteredTeams.length === 0 && searchQuery ? (
            <div className="empty-state-card">
              <FaSearch className="empty-icon" />
              <h3>No teams found</h3>
              <p>No teams match your search "{searchQuery}"</p>
              <button className="btn btn-secondary" onClick={() => setSearchQuery('')}>
                Clear Search
              </button>
            </div>
          ) : filteredTeams.length === 0 ? (
            <div className="empty-state-card">
              <MdGroups className="empty-icon" />
              <h3>No teams yet</h3>
              <p>Create your first team to start collaborating with others</p>
              <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                <FaPlus style={{ marginRight: '8px' }} /> Create Team
              </button>
            </div>
          ) : (
            <div className="teams-list">
              {filteredTeams.map(team => {
                const stats = getTeamStats(team.id);
                const teamTasks = getTeamTasks(team.id);
                const isExpanded = expandedTeam === team.id;

                return (
                  <div
                    key={team.id}
                    className={`team-list-item ${isExpanded ? 'expanded' : ''}`}
                    onClick={(e) => {
                      // Prevent navigation if clicking on action buttons or their children
                      if (e.target.closest('button') || e.target.closest('a') || e.target.closest('.tasks-toggle-btn')) return;
                      navigate(`/teams/${team.id}/chat`);
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="team-item-main">
                      <div className="team-item-left">
                        <div className={`team-avatar ${team.color}`}>
                          <MdGroups />
                        </div>
                        <div className="team-item-info">
                          <h3 className="team-item-name">{team.name}</h3>
                          <p className="team-item-desc">{team.description || 'No description'}</p>
                          <div className="team-item-meta">
                            <span className="meta-item">
                              <FaUsers /> {team.members.length} {team.members.length === 1 ? 'member' : 'members'}
                            </span>
                            <span className="meta-item">
                              <FaTasks /> {stats.total} tasks
                            </span>
                            <span className="meta-item completed">
                              <MdOutlineTaskAlt /> {stats.completed} completed
                            </span>
                            <span className={`meta-item visibility ${team.is_public ? 'public' : 'private'}`}>
                              {team.is_public ? 'Public' : 'Private'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="team-item-right">
                        <div className="team-members-avatars">
                          {team.members.slice(0, 4).map((member, idx) => (
                            <div
                              key={member.id}
                              className="member-avatar-small"
                              style={{ zIndex: 10 - idx }}
                              title={member.name}
                            >
                              {member.id}
                            </div>
                          ))}
                          {team.members.length > 4 && (
                            <div className="member-avatar-small more">
                              +{team.members.length - 4}
                            </div>
                          )}
                        </div>
                        <div className="team-item-actions">
                          <button
                            className="btn btn-icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/teams/${team.id}/chat`);
                            }}
                            title="Team Chat"
                          >
                            <FaComment />
                          </button>
                          <button
                            className="btn btn-icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCreateTaskForTeam(team);
                            }}
                            title="Create task"
                          >
                            <FaTasks />
                          </button>

                          {/* Edit allows managing members (public: any member, private: owner/lead) */}
                          {(team.is_owner || team.is_leader || team.is_public) && (
                            <button
                              className="btn btn-icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(team);
                              }}
                              title="Manage team members"
                            >
                              <FaEdit />
                            </button>
                          )}
                          {team.is_owner && (
                            <>
                              <button
                                className="btn btn-icon delete"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(team.id);
                                }}
                                title="Delete team"
                              >
                                <FaTrash />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    {
                      stats.total > 0 && (
                        <div className="team-progress-section">
                          <div className="progress-bar-container">
                            <div
                              className="progress-bar-fill"
                              style={{ width: `${(stats.completed / stats.total) * 100}%` }}
                            ></div>
                          </div>
                          <span className="progress-text">
                            {Math.round((stats.completed / stats.total) * 100)}% complete
                          </span>
                        </div>
                      )
                    }

                    {/* Expandable Tasks Preview */}
                    {
                      teamTasks.length > 0 && (
                        <div className="team-tasks-section">
                          <button
                            className="tasks-toggle-btn"
                            onClick={() => toggleExpandTeam(team.id)}
                          >
                            <span>Recent Tasks ({teamTasks.length})</span>
                            <span className="toggle-arrow">{isExpanded ? '▲' : '▼'}</span>
                          </button>

                          {isExpanded && (
                            <div className="tasks-list-compact">
                              {teamTasks.map(task => (
                                <div key={task.id} className="task-list-item-compact">
                                  <span className={`priority-dot ${task.priority.toLowerCase()}`}></span>
                                  <span className="task-title-compact">{task.title}</span>
                                  <span className={`status-badge ${task.status}`}>
                                    {task.status.replace('-', ' ')}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    }

                    {/* Team Code + Join Link */}
                    {
                      team.team_code && (
                        <div className="team-code-section">
                          <div className="team-code-info">
                            <span className="team-code-label">Team Code</span>
                            <span className="team-code-value">{team.team_code}</span>
                          </div>
                          <div className="team-code-actions">
                            <button
                              className="btn btn-secondary btn-small"
                              onClick={() => copyToClipboard(team.team_code, 'Team code copied')}
                            >
                              Copy Code
                            </button>
                            <button
                              className="btn btn-secondary btn-small"
                              onClick={() => copyToClipboard(
                                `${window.location.origin}/teams?code=${team.team_code}`,
                                'Join link copied'
                              )}
                            >
                              Copy Join Link
                            </button>
                          </div>
                        </div>
                      )
                    }

                    {/* Join Requests (Private Team Owner Only) */}
                    {
                      team.is_owner && !team.is_public && (
                        <div className="team-join-requests">
                          <div className="join-requests-header">
                            <span>Join Requests</span>
                            <span className="join-requests-count">
                              {(joinRequests[team.id] || []).length}
                            </span>
                          </div>
                          {(joinRequests[team.id] || []).length === 0 ? (
                            <div className="join-requests-empty">No pending requests</div>
                          ) : (
                            <div className="join-requests-list">
                              {(joinRequests[team.id] || []).map(req => (
                                <div key={req.id} className="join-request-item">
                                  <div className="join-request-info">
                                    <div className="join-request-name">{req.name}</div>
                                    <div className="join-request-email">{req.email}</div>
                                  </div>
                                  <div className="join-request-actions">
                                    <button
                                      className="btn btn-secondary btn-small"
                                      onClick={() => approveJoinRequest(team.id, req.id)}
                                    >
                                      Accept
                                    </button>
                                    <button
                                      className="btn btn-secondary btn-small"
                                      onClick={() => rejectJoinRequest(team.id, req.id)}
                                    >
                                      Decline
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    }

                    <div className="team-join-requests">
                      <div className="join-requests-header">
                        <span>Daily Stand-up</span>
                        <span className="join-requests-count">
                          {(standupsByTeam[team.id] || []).length}
                        </span>
                      </div>
                      <div className="form-group" style={{ marginBottom: '10px' }}>
                        <label>What will you do today?</label>
                        <input
                          type="text"
                          placeholder="Plan for today"
                          value={standupFormByTeam[team.id]?.planToday || ''}
                          onChange={(e) => setStandupFormByTeam(prev => ({
                            ...prev,
                            [team.id]: {
                              ...(prev[team.id] || { blockers: '' }),
                              planToday: e.target.value
                            }
                          }))}
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: '10px' }}>
                        <label>Any blockers?</label>
                        <input
                          type="text"
                          placeholder="Blockers (optional)"
                          value={standupFormByTeam[team.id]?.blockers || ''}
                          onChange={(e) => setStandupFormByTeam(prev => ({
                            ...prev,
                            [team.id]: {
                              ...(prev[team.id] || { planToday: '' }),
                              blockers: e.target.value
                            }
                          }))}
                        />
                      </div>
                      <div className="join-request-actions">
                        <button
                          className="btn btn-secondary btn-small"
                          onClick={() => submitStandup(team.id)}
                        >
                          Submit Stand-up
                        </button>
                        <button
                          className="btn btn-secondary btn-small"
                          onClick={() => loadStandups(team.id)}
                        >
                          Refresh
                        </button>
                      </div>
                      {(standupsByTeam[team.id] || []).length > 0 && (
                        <div className="join-requests-list">
                          {(standupsByTeam[team.id] || []).slice(0, 4).map((entry) => (
                            <div key={entry.id} className="join-request-item">
                              <div className="join-request-info">
                                <div className="join-request-name">{entry.name}</div>
                                <div className="join-request-email">{entry.plan_today}</div>
                                {entry.blockers && (
                                  <div className="join-request-email">Blocker: {entry.blockers}</div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )
          }
        </div>

        {/* Create/Edit Team Modal */}
        {
          showModal && (
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
                      disabled={!!editingTeam && !editingTeam.is_owner}
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
                      disabled={!!editingTeam && !editingTeam.is_owner}
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
                          onClick={() => {
                            if (editingTeam && !editingTeam.is_owner) return;
                            setNewTeam({ ...newTeam, color });
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Team Visibility</label>
                    <div className="visibility-toggle">
                      <button
                        type="button"
                        className={`visibility-option ${newTeam.isPublic ? 'active' : ''}`}
                        onClick={() => setNewTeam({ ...newTeam, isPublic: true })}
                        disabled={!!editingTeam && !editingTeam.is_owner}
                      >
                        Public
                      </button>
                      <button
                        type="button"
                        className={`visibility-option ${!newTeam.isPublic ? 'active' : ''}`}
                        onClick={() => setNewTeam({ ...newTeam, isPublic: false })}
                        disabled={!!editingTeam && !editingTeam.is_owner}
                      >
                        Private
                      </button>
                    </div>
                    <p className="visibility-help">
                      {newTeam.isPublic
                        ? 'Anyone with the team code can join instantly and any member can invite.'
                        : 'Join requests require owner approval. Only owner/delegated leads can invite.'}
                    </p>
                  </div>

                  <div className="form-group">
                    <label>Team Members</label>
                    <div className="members-manager">
                      {newTeam.members.map(member => (
                        <div key={member.email || member.id} className="member-tag">
                          <div className="mini-avatar">{member.id}</div>
                          <span>{member.name} - {member.role}</span>
                          {/* Owner-only removal when editing existing teams */}
                          {(!editingTeam || editingTeam.is_owner) && (
                            <button
                              type="button"
                              onClick={() => removeMemberFromTeam(member.email)}
                            >
                              ×
                            </button>
                          )}
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
                        disabled={!!editingTeam && !(editingTeam.is_public || editingTeam.is_owner || editingTeam.is_leader)}
                      />
                      <input
                        type="email"
                        name="email"
                        placeholder="Email"
                        value={newMember.email}
                        onChange={handleMemberInputChange}
                        disabled={!!editingTeam && !(editingTeam.is_public || editingTeam.is_owner || editingTeam.is_leader)}
                      />
                      <select
                        name="role"
                        value={newMember.role}
                        onChange={handleMemberInputChange}
                        disabled={!!editingTeam && !(editingTeam.is_public || editingTeam.is_owner || editingTeam.is_leader)}
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
                        disabled={!!editingTeam && !(editingTeam.is_public || editingTeam.is_owner || editingTeam.is_leader)}
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
          )
        }

        {/* Quick Create Task Modal */}
        {
          showTaskModal && selectedTeamForTask && (
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
          )
        }

        {/* Join Team Modal */}
        {
          showJoinModal && (
            <div className="modal-overlay">
              <div className="modal-content">
                <div className="modal-header">
                  <h2>Join a Team</h2>
                  <button className="close-btn" onClick={() => setShowJoinModal(false)}>
                    <FaTimes />
                  </button>
                </div>
                <form onSubmit={handleJoinSubmit}>
                  <div className="form-group">
                    <label>Team Code</label>
                    <input
                      type="text"
                      placeholder="Enter team code"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    />
                  </div>
                  <button type="submit" className="btn btn-full" disabled={joinLoading}>
                    {joinLoading ? 'Joining...' : 'Join Team'}
                  </button>
                </form>
              </div>
            </div>
          )
        }
      </main >
    </div >
  );
}

export default Teams;
