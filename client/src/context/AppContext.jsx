// client/src/context/AppContext.jsx - FIXED VERSION
import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AppContext = createContext();

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};

export const AppProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [teams, setTeams] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [loading, setLoading] = useState(true);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

  // Task templates
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
        { text: 'Test fix', completed: false }
      ]
    },
    {
      name: 'Feature Development',
      description: 'New feature development',
      priority: 'Medium',
      tags: ['feature', 'development'],
      subtasks: [
        { text: 'Design mockups', completed: false },
        { text: 'Get approval', completed: false },
        { text: 'Implement feature', completed: false },
        { text: 'Code review', completed: false },
        { text: 'Deploy to production', completed: false }
      ]
    }
  ];

  // Initialize authentication state from localStorage
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const token = localStorage.getItem('campusToken');
        const user = localStorage.getItem('campusUser');

        if (token && user) {
          const parsedUser = JSON.parse(user);
          setCurrentUser(parsedUser);
          setIsAuthenticated(true);
          
          // Fetch additional data in background
          fetchUserData(token).catch(err => {
            console.error('Background fetch error:', err);
          });
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        logout();
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Fetch user data from backend
  const fetchUserData = async (token) => {
    try {
      const response = await axios.get(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCurrentUser(response.data);
      
      // Fetch teams and tasks in parallel
      await Promise.all([fetchTeams(token), fetchTasks(token)]);
    } catch (error) {
      console.error('Error fetching user data:', error);
      if (error.response?.status === 401) {
        logout();
      }
    }
  };

  // Fetch teams
  const fetchTeams = async (token) => {
    try {
      const authToken = token || localStorage.getItem('campusToken');
      const response = await axios.get(`${API_URL}/teams/my-teams`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      setTeams(response.data);
    } catch (error) {
      console.error('Error fetching teams:', error);
    }
  };

  // Fetch tasks
  const fetchTasks = async (token) => {
    try {
      const authToken = token || localStorage.getItem('campusToken');
      const response = await axios.get(`${API_URL}/tasks`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      setTasks(response.data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  // Login function - FIXED to set state immediately
  const login = (user, token) => {
    // Set state immediately (synchronous)
    setCurrentUser(user);
    setIsAuthenticated(true);
    
    // Fetch additional data in background (don't wait for it)
    fetchUserData(token).catch(err => {
      console.error('Background fetch error on login:', err);
    });
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem('campusToken');
    localStorage.removeItem('campusUser');
    setCurrentUser(null);
    setIsAuthenticated(false);
    setTasks([]);
    setTeams([]);
  };

  // Add task
  const addTask = async (taskData) => {
    try {
      const token = localStorage.getItem('campusToken');
      const response = await axios.post(`${API_URL}/tasks`, taskData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTasks([...tasks, response.data]);
      addToast('Task created successfully!', 'success');
    } catch (error) {
      console.error('Error adding task:', error);
      addToast('Failed to create task', 'error');
    }
  };

  // Move task
  const moveTask = async (taskId, newStatus) => {
    try {
      const token = localStorage.getItem('campusToken');
      await axios.put(`${API_URL}/tasks/${taskId}`, 
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      
      setTasks(tasks.map(task => 
        task.id === taskId ? { ...task, status: newStatus } : task
      ));
      addToast('Task updated!', 'success');
    } catch (error) {
      console.error('Error moving task:', error);
      addToast('Failed to update task', 'error');
    }
  };

  // Duplicate task
  const duplicateTask = (taskId) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      const duplicated = {
        ...task,
        id: Date.now(),
        title: `${task.title} (Copy)`,
        status: 'todo'
      };
      addTask(duplicated);
    }
  };

  // Add team
  const addTeam = async (teamData) => {
    try {
      const token = localStorage.getItem('campusToken');
      const response = await axios.post(`${API_URL}/teams`, teamData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTeams([...teams, response.data]);
      addToast('Team created successfully!', 'success');
    } catch (error) {
      console.error('Error adding team:', error);
      addToast(error.response?.data?.error || 'Failed to create team', 'error');
    }
  };

  // Update team
const updateTeam = async (teamId, teamData) => {
  try {
    const token = localStorage.getItem('campusToken');
    console.log('Updating team:', teamId, teamData); // Debug log
    
    const response = await axios.put(`${API_URL}/teams/${teamId}`, teamData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('Update response:', response.data); // Debug log
    
    // Refresh teams list from server
    await fetchTeams(token);
    addToast('Team updated!', 'success');
  } catch (error) {
    console.error('Error updating team:', error);
    console.error('Error details:', error.response?.data); // More detailed error
    addToast(error.response?.data?.error || 'Failed to update team', 'error');
    throw error; // Re-throw to handle in component
  }
};
  // Delete team
  const deleteTeam = async (teamId) => {
    try {
      const token = localStorage.getItem('campusToken');
      await axios.delete(`${API_URL}/teams/${teamId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setTeams(teams.filter(team => team.id !== teamId));
      addToast('Team deleted', 'success');
    } catch (error) {
      console.error('Error deleting team:', error);
      addToast('Failed to delete team', 'error');
    }
  };

  // Toast management
  const addToast = (message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => removeToast(id), 3000);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  // Get user's teams
  const getMyTeams = () => {
    return teams;
  };

  // Get all team members
  const getAllTeamMembers = () => {
    const members = [];
    teams.forEach(team => {
      team.members?.forEach(member => {
        if (!members.find(m => m.id === member.id)) {
          members.push(member);
        }
      });
    });
    return members;
  };

  const value = {
    currentUser,
    isAuthenticated,
    tasks,
    teams,
    toasts,
    loading,
    taskTemplates,
    login,
    logout,
    addTask,
    moveTask,
    duplicateTask,
    addTeam,
    updateTeam,
    deleteTeam,
    addToast,
    removeToast,
    getMyTeams,
    getAllTeamMembers,
    fetchTeams,
    fetchTasks
  };

  if (loading) {
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

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};