// client/src/context/AppContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';

const AppContext = createContext();

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
  
  // Tasks with localStorage persistence
  const [tasks, setTasks] = useState(() => {
    const saved = localStorage.getItem('campusTasks');
    return saved ? JSON.parse(saved) : [
      { 
        id: 1, 
        title: "Design Login Page", 
        description: "Create wireframes and implement the login UI",
        priority: "High", 
        status: "todo", 
        assignees: ["JD"],
        dueDate: "2026-01-20",
        tags: ["UI", "Design"],
        comments: [],
        subtasks: [
          { id: 1, text: "Create wireframes", completed: true },
          { id: 2, text: "Design mockups", completed: false }
        ],
        createdAt: new Date().toISOString()
      },
      { 
        id: 2, 
        title: "Setup Node.js Server", 
        description: "Initialize Express server with basic routes",
        priority: "Medium", 
        status: "in-progress", 
        assignees: ["AS"],
        dueDate: "2026-01-18",
        tags: ["Backend"],
        comments: [
          { id: 1, author: "AS", text: "Started working on this", timestamp: new Date().toISOString() }
        ],
        subtasks: [],
        createdAt: new Date().toISOString()
      },
      { 
        id: 3, 
        title: "Database Schema", 
        description: "Design and implement MongoDB schema",
        priority: "High", 
        status: "done", 
        assignees: ["JD", "AS"],
        dueDate: "2026-01-15",
        tags: ["Database"],
        comments: [],
        subtasks: [],
        createdAt: new Date().toISOString()
      },
    ];
  });

  // Teams data
  const [teams, setTeams] = useState(() => {
    const saved = localStorage.getItem('campusTeams');
    return saved ? JSON.parse(saved) : [
      { 
        id: 1, 
        name: "Engineering Project", 
        description: "Final year capstone project for CS dept.",
        color: "purple",
        members: [
          { id: "JD", name: "John Doe", role: "Lead", email: "john@example.com" },
          { id: "AS", name: "Alice Smith", role: "Developer", email: "alice@example.com" },
          { id: "MK", name: "Mike Kon", role: "Designer", email: "mike@example.com" }
        ]
      },
      { 
        id: 2, 
        name: "Design Ops", 
        description: "UI/UX design sprint.",
        color: "green",
        members: [
          { id: "MK", name: "Mike Kon", role: "Lead", email: "mike@example.com" }
        ]
      }
    ];
  });

  // Current user
  const [currentUser, setCurrentUser] = useState({
    id: "JD",
    name: "John Doe",
    email: "john@example.com",
    avatar: "JD"
  });

  // Save to localStorage whenever tasks change
  useEffect(() => {
    localStorage.setItem('campusTasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('campusTeams', JSON.stringify(teams));
  }, [teams]);

  // Toast functions
  const addToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => removeToast(id), 3000);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  // Task functions
  const addTask = (task) => {
    const newTask = {
      ...task,
      id: tasks.length > 0 ? Math.max(...tasks.map(t => t.id)) + 1 : 1,
      comments: [],
      subtasks: [],
      createdAt: new Date().toISOString()
    };
    setTasks([...tasks, newTask]);
    addToast('Task created successfully!');
    return newTask;
  };

  const updateTask = (taskId, updates) => {
    setTasks(tasks.map(task => 
      task.id === taskId ? { ...task, ...updates } : task
    ));
    addToast('Task updated successfully!');
  };

  const deleteTask = (taskId) => {
    setTasks(tasks.filter(task => task.id !== taskId));
    addToast('Task deleted successfully!', 'info');
  };

  const moveTask = (taskId, newStatus) => {
    updateTask(taskId, { status: newStatus });
  };

  const addComment = (taskId, comment) => {
    setTasks(tasks.map(task => {
      if (task.id === taskId) {
        return {
          ...task,
          comments: [
            ...task.comments,
            {
              id: task.comments.length + 1,
              author: currentUser.name,
              authorId: currentUser.id,
              text: comment,
              timestamp: new Date().toISOString()
            }
          ]
        };
      }
      return task;
    }));
    addToast('Comment added!');
  };

  const toggleSubtask = (taskId, subtaskId) => {
    setTasks(tasks.map(task => {
      if (task.id === taskId) {
        return {
          ...task,
          subtasks: task.subtasks.map(st => 
            st.id === subtaskId ? { ...st, completed: !st.completed } : st
          )
        };
      }
      return task;
    }));
  };

  // Team functions
  const addTeam = (team) => {
    const newTeam = {
      ...team,
      id: teams.length > 0 ? Math.max(...teams.map(t => t.id)) + 1 : 1,
    };
    setTeams([...teams, newTeam]);
    addToast('Team created successfully!');
    return newTeam;
  };

  const updateTeam = (teamId, updates) => {
    setTeams(teams.map(team => 
      team.id === teamId ? { ...team, ...updates } : team
    ));
    addToast('Team updated successfully!');
  };

  const deleteTeam = (teamId) => {
    setTeams(teams.filter(team => team.id !== teamId));
    addToast('Team deleted successfully!', 'info');
  };

  const value = {
    // State
    tasks,
    teams,
    currentUser,
    toasts,
    
    // Task functions
    addTask,
    updateTask,
    deleteTask,
    moveTask,
    addComment,
    toggleSubtask,
    
    // Team functions
    addTeam,
    updateTeam,
    deleteTeam,
    
    // Toast functions
    addToast,
    removeToast,
    
    // User functions
    setCurrentUser
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};