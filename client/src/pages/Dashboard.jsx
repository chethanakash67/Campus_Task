// client/src/pages/Dashboard.jsx
import React, { useState, useMemo } from 'react';
import Sidebar from '../components/Sidebar';
import TaskDetailModal from '../components/TaskDetailModal';
import Toast from '../components/Toast';
import { FaPlus, FaEllipsisH, FaTimes, FaUserPlus, FaSearch, FaFilter } from 'react-icons/fa';
import { useApp } from '../context/AppContext';
import './Dashboard.css';

function Dashboard() {
  const { tasks, addTask, moveTask, toasts, removeToast, currentUser } = useApp();
  
  const [showModal, setShowModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [draggedTask, setDraggedTask] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterAssignee, setFilterAssignee] = useState('all');

  // New Task Form State
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    priority: "Medium",
    dueDate: "",
    tags: [],
    assignees: [currentUser.id],
    status: "todo",
    newPersonName: "",
    newTag: ""
  });

  // Available Team Members (Mock Data)
  const teamMembers = [
    { id: "JD", name: "John Doe" },
    { id: "AS", name: "Alice Smith" },
    { id: "MK", name: "Mike Kon" }
  ];

  // Filtered tasks based on search and filters
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesPriority = filterPriority === 'all' || task.priority.toLowerCase() === filterPriority;
      const matchesAssignee = filterAssignee === 'all' || task.assignees.includes(filterAssignee);
      
      return matchesSearch && matchesPriority && matchesAssignee;
    });
  }, [tasks, searchQuery, filterPriority, filterAssignee]);

  // Statistics
  const stats = {
    total: tasks.length,
    todo: tasks.filter(t => t.status === 'todo').length,
    inProgress: tasks.filter(t => t.status === 'in-progress').length,
    done: tasks.filter(t => t.status === 'done').length,
    overdue: tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done').length
  };

  // Handle Text Inputs
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewTask({ ...newTask, [name]: value });
  };

  // Handle Toggling Existing Members
  const toggleAssignee = (initial) => {
    let updatedAssignees;
    if (newTask.assignees.includes(initial)) {
      updatedAssignees = newTask.assignees.filter(a => a !== initial);
    } else {
      updatedAssignees = [...newTask.assignees, initial];
    }
    setNewTask({ ...newTask, assignees: updatedAssignees });
  };

  // Handle Adding Task
  const handleAddTask = (e) => {
    e.preventDefault();
    if (!newTask.title) return;

    let finalAssignees = [...newTask.assignees];
    if (newTask.newPersonName.trim()) {
      const initials = newTask.newPersonName.substring(0, 2).toUpperCase();
      finalAssignees.push(initials);
    }

    const taskToAdd = {
      title: newTask.title,
      description: newTask.description,
      priority: newTask.priority,
      status: newTask.status,
      dueDate: newTask.dueDate,
      tags: newTask.tags,
      assignees: finalAssignees
    };

    addTask(taskToAdd);
    setShowModal(false);
    setNewTask({ 
      title: "", 
      description: "",
      priority: "Medium", 
      dueDate: "",
      tags: [],
      assignees: [currentUser.id], 
      status: "todo",
      newPersonName: "",
      newTag: ""
    });
  };

  // Drag and Drop Handlers
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

  // Add tag to new task
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

  return (
    <div className="dashboard-container">
      <Sidebar />
      <main className="main-content">
        {/* Toast Notifications */}
        <Toast toasts={toasts} removeToast={removeToast} />

        {/* Header with Stats */}
        <header className="top-bar">
          <div className="page-title">
            <h1>Engineering Project</h1>
            <p>Sprint 4 • Due Oct 24</p>
          </div>
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            <FaPlus style={{ marginRight: '8px' }} /> New Task
          </button>
        </header>

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

        {/* Search and Filter Bar */}
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
              {teamMembers.map(member => (
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
            <div className="modal-content">
              <div className="modal-header">
                <h2>Create New Task</h2>
                <button className="close-btn" onClick={() => setShowModal(false)}>
                  <FaTimes />
                </button>
              </div>
              
              <form onSubmit={handleAddTask}>
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

                <div className="form-group">
                  <label>Assign To</label>
                  <div className="assignee-selector">
                    {teamMembers.map(member => (
                      <div 
                        key={member.id} 
                        className={`assignee-option ${newTask.assignees.includes(member.id) ? 'selected' : ''}`}
                        onClick={() => toggleAssignee(member.id)}
                      >
                        <div className="mini-avatar">{member.id}</div>
                        <span>{member.name}</span>
                      </div>
                    ))}
                  </div>
                  <div className="add-person-input">
                    <FaUserPlus className="input-icon" />
                    <input 
                      type="text" 
                      name="newPersonName"
                      placeholder="Or type name to invite..." 
                      value={newTask.newPersonName}
                      onChange={handleInputChange}
                    />
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

function TaskCard({ task, onDragStart, onDragEnd, onClick }) {
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done';
  const completedSubtasks = task.subtasks?.filter(st => st.completed).length || 0;
  const totalSubtasks = task.subtasks?.length || 0;

  return (
    <div 
      className={`task-card ${isOverdue ? 'overdue-card' : ''}`}
      draggable
      onDragStart={(e) => onDragStart(e, task)}
      onDragEnd={onDragEnd}
      onClick={onClick}
    >
      <div className="task-header">
        <span className={`priority-tag ${task.priority.toLowerCase()}`}>{task.priority}</span>
        <button className="more-options" onClick={(e) => e.stopPropagation()}>
          <FaEllipsisH />
        </button>
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
          {task.assignees.map((initial, index) => (
            <span key={index} className="mini-avatar" title={initial}>{initial}</span>
          ))}
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