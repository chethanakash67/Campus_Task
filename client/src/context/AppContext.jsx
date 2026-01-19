// client/src/context/AppContext.jsx - FIXED LOGIN FUNCTION
import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AppContext = createContext();

export function AppProvider({ children }) {
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

  // Check localStorage on mount
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('campusUser');
    return saved ? JSON.parse(saved) : null;
  });

  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return !!localStorage.getItem('campusToken');
  });

  const [tasks, setTasks] = useState([]);
  const [teams, setTeams] = useState([]);
  const [toasts, setToasts] = useState([]);

  // Fetch user data on mount if authenticated
  useEffect(() => {
    const token = localStorage.getItem('campusToken');
    if (token && !currentUser) {
      fetchUserData();
    }
    if (isAuthenticated) {
      fetchTasks();
      fetchTeams();
    }
  }, [isAuthenticated]);

  const fetchUserData = async () => {
    try {
      const token = localStorage.getItem('campusToken');
      const response = await axios.get(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCurrentUser(response.data);
      localStorage.setItem('campusUser', JSON.stringify(response.data));
    } catch (error) {
      console.error('Failed to fetch user data:', error);
      // If token is invalid, logout
      if (error.response?.status === 401 || error.response?.status === 403) {
        logout();
      }
    }
  };

  const fetchTasks = async () => {
    try {
      const token = localStorage.getItem('campusToken');
      const response = await axios.get(`${API_URL}/tasks`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTasks(response.data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  const fetchTeams = async () => {
    try {
      const token = localStorage.getItem('campusToken');
      const response = await axios.get(`${API_URL}/teams/my-teams`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTeams(response.data);
    } catch (error) {
      console.error('Error fetching teams:', error);
    }
  };

  // FIXED LOGIN FUNCTION - Direct login without OTP
  const login = async (email, password) => {
    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        email,
        password
      });

      const { token, user } = response.data;
      
      // Store in localStorage
      localStorage.setItem('campusToken', token);
      localStorage.setItem('campusUser', JSON.stringify(user));
      
      // Update state
      setCurrentUser(user);
      setIsAuthenticated(true);
      
      // Fetch user's data
      await fetchTasks();
      await fetchTeams();
      
      addToast('Login successful!', 'success');
      return response.data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('campusToken');
    localStorage.removeItem('campusUser');
    setCurrentUser(null);
    setIsAuthenticated(false);
    setTasks([]);
    setTeams([]);
    addToast('Logged out successfully', 'success');
  };

  // Task Management
  const addTask = async (task) => {
    try {
      const token = localStorage.getItem('campusToken');
      const response = await axios.post(`${API_URL}/tasks`, task, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTasks([...tasks, response.data]);
      addToast('Task created successfully', 'success');
    } catch (error) {
      console.error('Error creating task:', error);
      addToast('Failed to create task', 'error');
    }
  };

  const updateTask = async (taskId, updates) => {
    try {
      const token = localStorage.getItem('campusToken');
      const response = await axios.put(`${API_URL}/tasks/${taskId}`, updates, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTasks(tasks.map(t => t.id === taskId ? response.data : t));
      addToast('Task updated', 'success');
    } catch (error) {
      console.error('Error updating task:', error);
      addToast('Failed to update task', 'error');
    }
  };

  const deleteTask = async (taskId) => {
    try {
      const token = localStorage.getItem('campusToken');
      await axios.delete(`${API_URL}/tasks/${taskId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTasks(tasks.filter(t => t.id !== taskId));
      addToast('Task deleted', 'success');
    } catch (error) {
      console.error('Error deleting task:', error);
      addToast('Failed to delete task', 'error');
    }
  };

  const moveTask = async (taskId, newStatus) => {
    try {
      const token = localStorage.getItem('campusToken');
      const response = await axios.put(`${API_URL}/tasks/${taskId}`, 
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      setTasks(tasks.map(t => t.id === taskId ? response.data : t));
    } catch (error) {
      console.error('Error moving task:', error);
      addToast('Failed to move task', 'error');
    }
  };

  const duplicateTask = async (taskId) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      const newTask = {
        ...task,
        title: `${task.title} (Copy)`,
        status: 'todo'
      };
      delete newTask.id;
      await addTask(newTask);
    }
  };

  const addComment = async (taskId, text) => {
    try {
      const token = localStorage.getItem('campusToken');
      const response = await axios.post(`${API_URL}/tasks/${taskId}/comments`, 
        { text },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      setTasks(tasks.map(t => t.id === taskId ? response.data : t));
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const toggleSubtask = async (taskId, subtaskId) => {
    try {
      const token = localStorage.getItem('campusToken');
      const response = await axios.put(`${API_URL}/tasks/${taskId}/subtasks/${subtaskId}`, 
        {},
        { headers: { Authorization: `Bearer ${token}` }}
      );
      setTasks(tasks.map(t => t.id === taskId ? response.data : t));
    } catch (error) {
      console.error('Error toggling subtask:', error);
    }
  };

  // Team Management
  const addTeam = async (team) => {
    try {
      const token = localStorage.getItem('campusToken');
      const response = await axios.post(`${API_URL}/teams`, team, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTeams([...teams, response.data]);
      addToast('Team created successfully', 'success');
    } catch (error) {
      console.error('Error creating team:', error);
      addToast('Failed to create team', 'error');
    }
  };

  const updateTeam = async (teamId, updates) => {
    try {
      const token = localStorage.getItem('campusToken');
      const response = await axios.put(`${API_URL}/teams/${teamId}`, updates, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTeams(teams.map(t => t.id === teamId ? response.data : t));
      addToast('Team updated', 'success');
    } catch (error) {
      console.error('Error updating team:', error);
      addToast('Failed to update team', 'error');
    }
  };

  const deleteTeam = async (teamId) => {
    try {
      const token = localStorage.getItem('campusToken');
      await axios.delete(`${API_URL}/teams/${teamId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTeams(teams.filter(t => t.id !== teamId));
      setTasks(tasks.map(t => t.teamId === teamId ? { ...t, taskType: 'personal', teamId: null } : t));
      addToast('Team deleted', 'success');
    } catch (error) {
      console.error('Error deleting team:', error);
      addToast('Failed to delete team', 'error');
    }
  };

  // Helpers
  const getMyTeams = () => teams;

  const getAllTeamMembers = () => {
    const membersMap = new Map();
    teams.forEach(team => {
      team.members?.forEach(member => {
        if (!membersMap.has(member.id)) {
          membersMap.set(member.id, member);
        }
      });
    });
    return Array.from(membersMap.values());
  };

  const taskTemplates = [
    {
      name: 'Bug Fix',
      description: 'Standard bug fix template',
      priority: 'High',
      tags: ['bug', 'urgent'],
      subtasks: [
        { text: 'Reproduce the bug', completed: false },
        { text: 'Identify root cause', completed: false },
        { text: 'Implement fix', completed: false },
        { text: 'Test solution', completed: false }
      ]
    },
    {
      name: 'Feature Development',
      description: 'New feature implementation',
      priority: 'Medium',
      tags: ['feature', 'development'],
      subtasks: [
        { text: 'Design feature', completed: false },
        { text: 'Get approval', completed: false },
        { text: 'Implement feature', completed: false },
        { text: 'Write tests', completed: false },
        { text: 'Documentation', completed: false }
      ]
    }
  ];

  // Toast Management
  const addToast = (message, type = 'info') => {
    const id = Date.now();
    setToasts([...toasts, { id, message, type }]);
    setTimeout(() => removeToast(id), 3000);
  };

  const removeToast = (id) => {
    setToasts(toasts.filter(t => t.id !== id));
  };

  const value = {
    currentUser,
    isAuthenticated,
    tasks,
    teams,
    toasts,
    login,
    logout,
    addTask,
    updateTask,
    deleteTask,
    moveTask,
    duplicateTask,
    addComment,
    toggleSubtask,
    addTeam,
    updateTeam,
    deleteTeam,
    getMyTeams,
    getAllTeamMembers,
    taskTemplates,
    addToast,
    removeToast,
    fetchTasks,
    fetchTeams
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  return useContext(AppContext);
}