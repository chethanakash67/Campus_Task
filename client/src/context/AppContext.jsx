// client/src/context/AppContext.jsx - INTEGRATED WITH BACKEND API
import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AppContext = createContext();

// Configure axios defaults
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
console.log('🔗 API URL configured:', API_URL);
axios.defaults.baseURL = API_URL;
axios.defaults.timeout = 10000; // 10 second timeout

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};

export const AppProvider = ({ children }) => {
  // Toast notifications
  const [toasts, setToasts] = useState([]);
  
  // Auth state
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('campusUser');
    return saved ? JSON.parse(saved) : null;
  });

  const [token, setToken] = useState(() => {
    return localStorage.getItem('campusToken') || null;
  });

  // Data state
  const [teams, setTeams] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);

  // Task templates for quick creation
  const [taskTemplates] = useState([
    { 
      name: "Bug Fix",
      description: "Fix a reported bug",
      priority: "High",
      tags: ["Bug", "Fix"],
      subtasks: [
        { text: "Reproduce the bug", completed: false },
        { text: "Identify root cause", completed: false },
        { text: "Implement fix", completed: false },
        { text: "Test fix", completed: false }
      ]
    },
    { 
      name: "Feature Development",
      description: "Develop a new feature",
      priority: "Medium",
      tags: ["Feature", "Development"],
      subtasks: [
        { text: "Design specification", completed: false },
        { text: "Implementation", completed: false },
        { text: "Testing", completed: false },
        { text: "Documentation", completed: false }
      ]
    },
    { 
      name: "Code Review",
      description: "Review pull request",
      priority: "Medium",
      tags: ["Review", "Code"],
      subtasks: []
    },
    { 
      name: "Meeting Preparation",
      description: "Prepare for upcoming meeting",
      priority: "Low",
      tags: ["Meeting", "Preparation"],
      subtasks: [
        { text: "Review agenda", completed: false },
        { text: "Prepare materials", completed: false },
        { text: "Send invites", completed: false }
      ]
    }
  ]);

  // Set auth token in axios headers
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      localStorage.setItem('campusToken', token);
    } else {
      delete axios.defaults.headers.common['Authorization'];
      localStorage.removeItem('campusToken');
    }
  }, [token]);

  // Save user to localStorage
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('campusUser', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('campusUser');
    }
  }, [currentUser]);

  // Fetch initial data
  useEffect(() => {
    if (token && currentUser) {
      fetchTeams();
      fetchTasks();
    }
  }, [token, currentUser]);

  // ==================== TOAST FUNCTIONS ====================
  const addToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => removeToast(id), 3000);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  // ==================== AUTH FUNCTIONS ====================
  const register = async (name, email, password) => {
    try {
      setLoading(true);
      const response = await axios.post('/auth/register', { name, email, password });
      setCurrentUser(response.data.user);
      setToken(response.data.token);
      addToast('Registration successful!');
      return response.data;
    } catch (error) {
      console.error('Registration error:', error);
      let message = 'Registration failed. Please try again.';
      
      if (error.code === 'ECONNREFUSED' || error.message.includes('Network Error')) {
        message = 'Cannot connect to server. Please make sure the server is running on port 5001.';
      } else if (error.response) {
        // Server responded with error
        message = error.response.data?.error || `Registration failed: ${error.response.status}`;
      } else if (error.request) {
        // Request made but no response
        message = 'Server did not respond. Please check if the server is running.';
      } else {
        message = error.message || 'Registration failed. Please try again.';
      }
      
      addToast(message, 'error');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      setLoading(true);
      const response = await axios.post('/auth/login', { email, password });
      setCurrentUser(response.data.user);
      setToken(response.data.token);
      addToast('Login successful!');
      return response.data;
    } catch (error) {
      console.error('Login error:', error);
      let message = 'Login failed. Please try again.';
      
      if (error.code === 'ECONNREFUSED' || error.message.includes('Network Error')) {
        message = 'Cannot connect to server. Please make sure the server is running on port 5001.';
      } else if (error.response) {
        // Server responded with error
        message = error.response.data?.error || `Login failed: ${error.response.status}`;
      } else if (error.request) {
        // Request made but no response
        message = 'Server did not respond. Please check if the server is running.';
      } else {
        message = error.message || 'Login failed. Please try again.';
      }
      
      addToast(message, 'error');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setCurrentUser(null);
    setToken(null);
    setTeams([]);
    setTasks([]);
    addToast('Logged out successfully', 'info');
  };

  // ==================== TEAM FUNCTIONS ====================
  const fetchTeams = async () => {
    try {
      const response = await axios.get('/teams/my-teams');
      setTeams(response.data);
    } catch (error) {
      console.error('Fetch teams error:', error);
      addToast('Failed to load teams', 'error');
    }
  };

  const addTeam = async (team) => {
    try {
      setLoading(true);
      const response = await axios.post('/teams', team);
      setTeams([...teams, response.data]);
      addToast('Team created successfully!');
      return response.data;
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to create team';
      addToast(message, 'error');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateTeam = async (teamId, updates) => {
    try {
      setLoading(true);
      const response = await axios.put(`/teams/${teamId}`, updates);
      setTeams(teams.map(team => team.id === teamId ? response.data : team));
      addToast('Team updated successfully!');
      return response.data;
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to update team';
      addToast(message, 'error');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const deleteTeam = async (teamId) => {
    try {
      setLoading(true);
      await axios.delete(`/teams/${teamId}`);
      setTeams(teams.filter(team => team.id !== teamId));
      // Update tasks that belonged to this team
      setTasks(tasks.map(task => 
        task.teamId === teamId ? { ...task, teamId: null, taskType: 'personal' } : task
      ));
      addToast('Team deleted successfully!', 'info');
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to delete team';
      addToast(message, 'error');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // ==================== TASK FUNCTIONS ====================
  const fetchTasks = async (filters = {}) => {
    try {
      const params = new URLSearchParams(filters).toString();
      const response = await axios.get(`/tasks?${params}`);
      setTasks(response.data);
    } catch (error) {
      console.error('Fetch tasks error:', error);
      addToast('Failed to load tasks', 'error');
    }
  };

  const addTask = async (task) => {
    try {
      setLoading(true);
      const response = await axios.post('/tasks', task);
      setTasks([...tasks, response.data]);
      addToast(`${task.taskType === 'team' ? 'Team' : 'Personal'} task created successfully!`);
      return response.data;
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to create task';
      addToast(message, 'error');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateTask = async (taskId, updates) => {
    try {
      const response = await axios.put(`/tasks/${taskId}`, updates);
      setTasks(tasks.map(task => task.id === taskId ? response.data : task));
      addToast('Task updated successfully!');
      return response.data;
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to update task';
      addToast(message, 'error');
      throw error;
    }
  };

  const deleteTask = async (taskId) => {
    try {
      await axios.delete(`/tasks/${taskId}`);
      setTasks(tasks.filter(task => task.id !== taskId));
      addToast('Task deleted successfully!', 'info');
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to delete task';
      addToast(message, 'error');
      throw error;
    }
  };

  const moveTask = async (taskId, newStatus) => {
    return updateTask(taskId, { status: newStatus });
  };

  const addComment = async (taskId, comment) => {
    try {
      const response = await axios.post(`/tasks/${taskId}/comments`, { text: comment });
      setTasks(tasks.map(task => task.id === taskId ? response.data : task));
      addToast('Comment added!');
      return response.data;
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to add comment';
      addToast(message, 'error');
      throw error;
    }
  };

  const toggleSubtask = async (taskId, subtaskId) => {
    try {
      const response = await axios.put(`/tasks/${taskId}/subtasks/${subtaskId}`);
      setTasks(tasks.map(task => task.id === taskId ? response.data : task));
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to toggle subtask';
      addToast(message, 'error');
      throw error;
    }
  };

  const duplicateTask = async (taskId) => {
    const taskToDuplicate = tasks.find(t => t.id === taskId);
    if (taskToDuplicate) {
      const newTask = {
        ...taskToDuplicate,
        title: `${taskToDuplicate.title} (Copy)`,
        status: 'todo',
        subtasks: taskToDuplicate.subtasks?.map(st => ({ ...st, completed: false })) || []
      };
      delete newTask.id;
      delete newTask.comments;
      
      return addTask(newTask);
    }
  };

  // ==================== GETTER FUNCTIONS ====================
  const getPersonalTasks = () => {
    return tasks.filter(task => task.taskType === 'personal' && 
      task.assignees?.some(a => a.id === currentUser?.id));
  };

  const getTeamTasks = (teamId = null) => {
    if (teamId) {
      return tasks.filter(task => task.teamId === teamId);
    }
    return tasks.filter(task => task.taskType === 'team');
  };

  const getMyTasks = () => {
    return tasks.filter(task => 
      task.assignees?.some(a => a.id === currentUser?.id)
    );
  };

  const getMyTeams = () => {
    if (!currentUser) return [];
    return teams.filter(team => 
      team.members?.some(m => m.id === currentUser.id)
    );
  };

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

  const value = {
    // Auth state
    currentUser,
    token,
    isAuthenticated: !!token,
    
    // Data state
    tasks,
    teams,
    loading,
    toasts,
    taskTemplates,
    
    // Auth functions
    register,
    login,
    logout,
    setCurrentUser,
    
    // Task functions
    fetchTasks,
    addTask,
    updateTask,
    deleteTask,
    moveTask,
    addComment,
    toggleSubtask,
    duplicateTask,
    
    // Team functions
    fetchTeams,
    addTeam,
    updateTeam,
    deleteTeam,
    
    // Getter functions
    getPersonalTasks,
    getTeamTasks,
    getMyTasks,
    getMyTeams,
    getAllTeamMembers,
    
    // Toast functions
    addToast,
    removeToast
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};