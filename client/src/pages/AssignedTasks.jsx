import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Toast from '../components/Toast';
import TaskDetailModal from '../components/TaskDetailModal';
import { useApp } from '../context/AppContext';
import axios from 'axios';
import './Dashboard.css';

function AssignedTasks() {
  const navigate = useNavigate();
  const { toasts, removeToast, isAuthenticated, currentUser } = useApp();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

  useEffect(() => {
    if (!isAuthenticated || !currentUser) {
      navigate('/login');
      return;
    }
    
    fetchAssignedTasks();
  }, [isAuthenticated, currentUser, navigate]);

  const fetchAssignedTasks = async () => {
    try {
      const token = localStorage.getItem('campusToken');
      const response = await axios.get(`${API_URL}/tasks/assigned`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTasks(response.data);
    } catch (error) {
      console.error('Error fetching assigned tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTasks = filterStatus === 'all' 
    ? tasks 
    : tasks.filter(t => t.status === filterStatus);

  const stats = {
    total: tasks.length,
    todo: tasks.filter(t => t.status === 'todo').length,
    inProgress: tasks.filter(t => t.status === 'in-progress').length,
    done: tasks.filter(t => t.status === 'done').length,
    overdue: tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done').length
  };

  return (
    <div className="dashboard-container">
      <Sidebar />
      <Toast toasts={toasts} removeToast={removeToast} />
      
      <main className="main-content">
        <header className="top-bar">
          <div className="page-title">
            <h1>📋 Assigned Tasks</h1>
            <p>Tasks assigned to you</p>
          </div>
        </header>

        {/* Stats */}
        <div className="stats-container">
          <div className="stat-card">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total</div>
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

        {/* Filter */}
        <div className="filter-bar">
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="all">All Tasks</option>
            <option value="todo">To Do</option>
            <option value="in-progress">In Progress</option>
            <option value="done">Done</option>
          </select>
        </div>

        {/* Tasks List */}
        <div className="content-padding">
          {loading ? (
            <p>Loading...</p>
          ) : filteredTasks.length === 0 ? (
            <div className="empty-state-large">
              <h3>No assigned tasks</h3>
              <p>You don't have any tasks assigned to you yet.</p>
            </div>
          ) : (
            <div className="tasks-list-grid">
              {filteredTasks.map(task => (
                <div 
                  key={task.id} 
                  className={`task-card ${task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done' ? 'overdue-card' : ''}`}
                  onClick={() => setSelectedTask(task)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="task-header">
                    <span className={`priority-tag ${task.priority.toLowerCase()}`}>
                      {task.priority}
                    </span>
                    <span className={`status-badge status-${task.status}`}>
                      {task.status.replace('-', ' ')}
                    </span>
                  </div>
                  <h3>{task.title}</h3>
                  {task.description && (
                    <p className="task-excerpt">{task.description.substring(0, 60)}...</p>
                  )}
                  {task.team_name && (
                    <div className="team-badge">Team: {task.team_name}</div>
                  )}
                  {task.due_date && (
                    <div className="task-footer">
                      <span className={new Date(task.due_date) < new Date() && task.status !== 'done' ? 'overdue' : ''}>
                        Due: {new Date(task.due_date).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {selectedTask && (
          <TaskDetailModal 
            task={selectedTask} 
            onClose={() => {
              setSelectedTask(null);
              fetchAssignedTasks();
            }} 
          />
        )}
      </main>
    </div>
  );
}

export default AssignedTasks;