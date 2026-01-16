// client/src/pages/Teams.jsx
import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import Toast from '../components/Toast';
import { FaPlus, FaTimes, FaTrash, FaEdit, FaUsers } from 'react-icons/fa';
import { useApp } from '../context/AppContext';
import './Dashboard.css';

function Teams() {
  const { teams, addTeam, updateTeam, deleteTeam, toasts, removeToast } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
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

  const colors = ['purple', 'green', 'blue', 'red', 'yellow', 'pink'];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewTeam({ ...newTeam, [name]: value });
  };

  const handleMemberInputChange = (e) => {
    const { name, value } = e.target;
    setNewMember({ ...newMember, [name]: value });
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
    if (window.confirm('Are you sure you want to delete this team?')) {
      deleteTeam(teamId);
    }
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
              {teams.map(team => (
                <div key={team.id} className="team-card">
                  <div className="team-card-header">
                    <div className="team-meta">
                      <span className={`dot ${team.color}`}></span>
                      <span className="member-count">
                        {team.members.length} {team.members.length === 1 ? 'Member' : 'Members'}
                      </span>
                    </div>
                    <div className="team-actions">
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
                  
                  <div className="team-members">
                    <div className="members-label">Team Members</div>
                    <div className="members-list">
                      {team.members.map(member => (
                        <div key={member.id} className="member-item">
                          <div className="mini-avatar">{member.id}</div>
                          <div className="member-info">
                            <div className="member-name">{member.name}</div>
                            <div className="member-role">{member.role}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
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
      </main>
    </div>
  );
}

export default Teams;