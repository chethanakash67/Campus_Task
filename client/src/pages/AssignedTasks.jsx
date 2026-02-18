import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Toast from '../components/Toast';
import TaskDetailDrawer from '../components/TaskDetailDrawer';
import { useApp } from '../context/AppContext';
import axios from 'axios';
import { 
  FaSearch, FaSpinner, FaUsers, FaExclamationTriangle, FaEdit, FaTrash,
  FaCalendarAlt, FaFlag, FaArrowRight, FaCheck, FaHourglass 
} from 'react-icons/fa';
import { 
  MdOutlineTaskAlt, MdPendingActions, MdPlayCircleOutline, 
  MdAssignment, MdWarning, MdAccessTime, MdPerson,
  MdGroup, MdSchedule, MdDone, MdError
} from 'react-icons/md';
import './Dashboard.css';
import './AssignedTasks.css';

function AssignedTasks() {
  const navigate = useNavigate();
  const { toasts, removeToast, isAuthenticated, currentUser, addToast } = useApp();
  const [assignedToMeTasks, setAssignedToMeTasks] = useState([]);
  const [createdByMeTasks, setCreatedByMeTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [focusMode, setFocusMode] = useState(false);
  const [draggedTask, setDraggedTask] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTaskData, setEditTaskData] = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

  useEffect(() => {
    if (!isAuthenticated || !currentUser) {
      navigate('/login');
      return;
    }
    fetchAllTasks();
  }, [isAuthenticated, currentUser, navigate]);

  const fetchAllTasks = async () => {
    try {
      const token = localStorage.getItem('campusToken');
      const [assignedRes, createdRes] = await Promise.all([
        axios.get(`${API_URL}/tasks/assigned`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/tasks/created`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      setAssignedToMeTasks(assignedRes.data);
      setCreatedByMeTasks(createdRes.data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const allTasks = useMemo(() => {
    const taskMap = new Map();
    assignedToMeTasks.forEach(t => taskMap.set(t.id, { ...t, source: 'assigned' }));
    createdByMeTasks.forEach(t => {
      if (!taskMap.has(t.id)) {
        taskMap.set(t.id, { ...t, source: 'created' });
      }
    });
    return Array.from(taskMap.values());
  }, [assignedToMeTasks, createdByMeTasks]);

  const isTaskOverdue = (task) => {
    if (!task.due_date) return false;
    if (task.status === 'completed_late') return true;
    if (task.status === 'done') return false;
    const dueDate = new Date(task.due_date);
    const today = new Date();
    dueDate.setHours(23, 59, 59, 999);
    today.setHours(0, 0, 0, 0);
    return dueDate < today;
  };

  const isCompletedOnTime = (task) => task.status === 'done';
  const isCompletedLate = (task) => task.status === 'completed_late';
  const isCompleted = (task) => task.status === 'done' || task.status === 'completed_late';

  const isDueSoon = (task, days = 7) => {
    if (!task.due_date || isCompleted(task)) return false;
    const dueDate = new Date(task.due_date);
    dueDate.setHours(23, 59, 59, 999);
    const now = new Date();
    const diffMs = dueDate - now;
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= days;
  };
  
  const isTaskPending = (task) => {
    if (task.status === 'done' || task.status === 'completed_late') return false;
    return !isTaskOverdue(task);
  };

  const getSubmissionStatus = (task) => {
    if (task.status === 'completed_late') return 'late';
    if (task.status === 'done') return 'completed';
    if (isTaskOverdue(task)) return 'overdue';
    return 'pending';
  };

  const updateTaskStatus = async (taskId, newStatus) => {
    const task = allTasks.find(t => t.id === taskId);
    let effectiveStatus = newStatus;
    const completionProgress = (newStatus === 'done') ? 100 : (task?.progress ?? 0);
    
    if (newStatus === 'done' && task?.due_date) {
      const dueDate = new Date(task.due_date);
      dueDate.setHours(23, 59, 59, 999);
      if (new Date() > dueDate) {
        effectiveStatus = 'completed_late';
      }
    }
    
    setAssignedToMeTasks(prev => prev.map(t => 
      t.id === taskId ? { ...t, status: effectiveStatus, progress: completionProgress } : t
    ));
    setCreatedByMeTasks(prev => prev.map(t => 
      t.id === taskId ? { ...t, status: effectiveStatus, progress: completionProgress } : t
    ));
    
    try {
      const token = localStorage.getItem('campusToken');
      const response = await axios.put(`${API_URL}/tasks/${taskId}`, 
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      
      const updatedTask = response.data;
      setAssignedToMeTasks(prev => prev.map(t => t.id === taskId ? updatedTask : t));
      setCreatedByMeTasks(prev => prev.map(t => t.id === taskId ? updatedTask : t));
      
      if (response.data.status === 'completed_late') {
        addToast('Task marked as submitted late (past due date)', 'warning');
      } else {
        addToast('Task status updated successfully', 'success');
      }
    } catch (error) {
      console.error('Error updating task:', error);
      addToast('Failed to update task status', 'error');
      fetchAllTasks();
    }
  };

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
      updateTaskStatus(draggedTask.id, newStatus);
    }
    setDraggedTask(null);
  };

  const handleDragEnd = () => setDraggedTask(null);

  const openEditModal = (task) => {
    setEditTaskData({
      id: task.id,
      title: task.title || '',
      description: task.description || '',
      priority: task.priority || 'Medium',
      dueDate: task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : ''
    });
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditTaskData(null);
  };

  const submitEditTask = async (e) => {
    e.preventDefault();
    if (!editTaskData?.title?.trim()) return;

    try {
      setEditLoading(true);
      const token = localStorage.getItem('campusToken');
      await axios.put(`${API_URL}/tasks/${editTaskData.id}`, {
        title: editTaskData.title,
        description: editTaskData.description,
        priority: editTaskData.priority,
        dueDate: editTaskData.dueDate || null
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      addToast('Task updated successfully', 'success');
      closeEditModal();
      await fetchAllTasks();
    } catch (error) {
      console.error('Error editing task:', error);
      addToast(error.response?.data?.error || 'Failed to update task', 'error');
    } finally {
      setEditLoading(false);
    }
  };

  const deleteTask = async (task) => {
    if (!window.confirm(`Delete task "${task.title}"?`)) return;
    try {
      const token = localStorage.getItem('campusToken');
      await axios.delete(`${API_URL}/tasks/${task.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      addToast('Task deleted successfully', 'success');
      await fetchAllTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
      addToast(error.response?.data?.error || 'Failed to delete task', 'error');
    }
  };

  const stats = useMemo(() => ({
    total: allTasks.length,
    assignedToMe: assignedToMeTasks.length,
    assignedByMe: createdByMeTasks.length,
    pending: allTasks.filter(t => isTaskPending(t)).length,
    dueSoon: allTasks.filter(t => isDueSoon(t, 7)).length,
    completedOnTime: allTasks.filter(t => isCompletedOnTime(t)).length,
    completedLate: allTasks.filter(t => isCompletedLate(t)).length,
    overdue: allTasks.filter(t => isTaskOverdue(t)).length,
    todo: allTasks.filter(t => t.status === 'todo').length,
    inProgress: allTasks.filter(t => t.status === 'in-progress').length
  }), [allTasks, assignedToMeTasks, createdByMeTasks]);

  const getGlobalFilteredTasks = useMemo(() => {
    let filtered = [];
    
    switch (activeTab) {
      case 'all':
        filtered = allTasks;
        break;
      case 'assigned-to-me':
        filtered = assignedToMeTasks;
        break;
      case 'assigned-by-me':
        filtered = createdByMeTasks;
        break;
      case 'pending':
        filtered = allTasks.filter(t => isTaskPending(t));
        break;
      case 'due-soon':
        filtered = allTasks.filter(t => isDueSoon(t, 7));
        break;
      case 'completed':
        filtered = allTasks.filter(t => isCompletedOnTime(t));
        break;
      case 'overdue':
        filtered = allTasks.filter(t => isTaskOverdue(t));
        break;
      default:
        filtered = allTasks;
    }
    
    if (searchQuery) {
      filtered = filtered.filter(task => 
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    if (focusMode) {
      filtered = filtered.filter(task => {
        if (isCompleted(task)) return false;
        const highPriority = task.priority?.toLowerCase() === 'high';
        const urgentDue = isDueSoon(task, 2);
        return highPriority || urgentDue;
      });
    }

    const priorityScore = { high: 3, medium: 2, low: 1 };
    const safeDueTime = (task) => task.due_date ? new Date(task.due_date).getTime() : Number.MAX_SAFE_INTEGER;
    const safeUpdatedTime = (task) => task.updated_at ? new Date(task.updated_at).getTime() : 0;

    if (sortBy === 'due-date') {
      filtered = [...filtered].sort((a, b) => safeDueTime(a) - safeDueTime(b));
    } else if (sortBy === 'priority') {
      filtered = [...filtered].sort((a, b) => {
        const pa = priorityScore[a.priority?.toLowerCase()] || 0;
        const pb = priorityScore[b.priority?.toLowerCase()] || 0;
        return pb - pa;
      });
    } else if (sortBy === 'oldest') {
      filtered = [...filtered].sort((a, b) => safeUpdatedTime(a) - safeUpdatedTime(b));
    } else {
      filtered = [...filtered].sort((a, b) => safeUpdatedTime(b) - safeUpdatedTime(a));
    }
    
    return filtered;
  }, [allTasks, assignedToMeTasks, createdByMeTasks, searchQuery, activeTab, sortBy, focusMode]);

  const getColumnTasks = (status) => {
    if (status === 'done') {
      return getGlobalFilteredTasks.filter(t => t.status === 'done' || t.status === 'completed_late');
    }
    return getGlobalFilteredTasks.filter(t => t.status === status);
  };

  const getFilterViewInfo = () => {
    switch (activeTab) {
      case 'assigned-to-me':
        return {
          title: 'Assigned to Me',
          subtitle: 'Tasks assigned to you by others',
          icon: <MdPerson />,
          emptyMessage: 'No tasks have been assigned to you yet'
        };
      case 'assigned-by-me':
        return {
          title: 'Assigned Tasks',
          subtitle: 'Tasks you created and assigned to others',
          icon: <MdGroup />,
          emptyMessage: "You haven't assigned any tasks to others yet"
        };
      case 'pending':
        return {
          title: 'Pending Tasks',
          subtitle: 'Tasks that require action and are not yet submitted',
          icon: <MdSchedule />,
          emptyMessage: 'No pending tasks - great job!'
        };
      case 'completed':
        return {
          title: 'Completed Tasks',
          subtitle: 'Tasks successfully completed on time',
          icon: <MdDone />,
          emptyMessage: 'No completed tasks yet'
        };
      case 'due-soon':
        return {
          title: 'Due Soon',
          subtitle: 'Tasks due in the next 7 days',
          icon: <MdSchedule />,
          emptyMessage: 'No upcoming due tasks in the next 7 days'
        };
      case 'overdue':
        return {
          title: 'Overdue Tasks',
          subtitle: 'Tasks that missed their deadline, including late submissions',
          icon: <MdError />,
          emptyMessage: "No overdue tasks - you're on track!"
        };
      default:
        return null;
    }
  };

  const filterViewInfo = getFilterViewInfo();
  const isKanbanView = activeTab === 'all';

  return (
    <div className="dashboard-container">
      <Sidebar />
      <Toast toasts={toasts} removeToast={removeToast} />
      
      <main className="main-content">
        <div className="page-header-card">
          <div className="page-header-content">
            <div className="page-header-icon">
              <MdAssignment />
            </div>
            <div className="page-header-text">
              <h1>Tasks</h1>
              <p>Manage your tasks and achieve your goals</p>
            </div>
          </div>
        </div>

        <div className="tasks-tabs-container">
          <div className="tasks-tabs">
            <button 
              className={`tasks-tab ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => setActiveTab('all')}
            >
              All Tasks
              <span className="tab-count">{stats.total}</span>
            </button>
            <button 
              className={`tasks-tab ${activeTab === 'assigned-to-me' ? 'active' : ''}`}
              onClick={() => setActiveTab('assigned-to-me')}
            >
              Assigned to Me
              <span className="tab-count">{stats.assignedToMe}</span>
            </button>
            <button 
              className={`tasks-tab ${activeTab === 'assigned-by-me' ? 'active' : ''}`}
              onClick={() => setActiveTab('assigned-by-me')}
            >
              Assigned Tasks
              <span className="tab-count">{stats.assignedByMe}</span>
            </button>
            <button 
              className={`tasks-tab ${activeTab === 'pending' ? 'active' : ''}`}
              onClick={() => setActiveTab('pending')}
            >
              Pending
              <span className="tab-count">{stats.pending}</span>
            </button>
            <button
              className={`tasks-tab ${activeTab === 'due-soon' ? 'active' : ''}`}
              onClick={() => setActiveTab('due-soon')}
            >
              Due Soon
              <span className="tab-count">{stats.dueSoon}</span>
            </button>
            <button 
              className={`tasks-tab ${activeTab === 'completed' ? 'active' : ''}`}
              onClick={() => setActiveTab('completed')}
            >
              Completed
              <span className="tab-count">{stats.completedOnTime}</span>
            </button>
            {stats.overdue > 0 && (
              <button 
                className={`tasks-tab overdue ${activeTab === 'overdue' ? 'active' : ''}`}
                onClick={() => setActiveTab('overdue')}
              >
                <FaExclamationTriangle style={{ marginRight: '6px' }} />
                Overdue
                <span className="tab-count overdue">{stats.overdue}</span>
              </button>
            )}
          </div>
        </div>

        <div className="assigned-filter-bar">
          <div className="search-input-wrapper">
            <FaSearch className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <select
            className="tasks-sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="newest">Sort: Newest</option>
            <option value="oldest">Sort: Oldest</option>
            <option value="due-date">Sort: Due Date</option>
            <option value="priority">Sort: Priority</option>
          </select>
          <button
            type="button"
            className={`focus-mode-btn ${focusMode ? 'active' : ''}`}
            onClick={() => setFocusMode(prev => !prev)}
            title="Show only high-priority or due-in-2-days tasks"
          >
            Focus Mode
          </button>
        </div>

        {loading ? (
          <div className="loading-state">
            <FaSpinner className="spinner" />
            <p>Loading your tasks...</p>
          </div>
        ) : allTasks.length === 0 ? (
          <div className="content-padding">
            <div className="empty-state-card">
              <MdAssignment className="empty-icon" />
              <h3>No tasks yet</h3>
              <p>You don't have any tasks assigned to you or created by you yet.</p>
            </div>
          </div>
        ) : isKanbanView ? (
          <div className="board-grid">
            {['todo', 'in-progress', 'done'].map(status => {
              const columnTasks = getColumnTasks(status);
              return (
                <div 
                  className="board-column" 
                  key={status}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, status)}
                >
                  <div className="column-header">
                    <span className={`status-dot ${status === 'todo' ? 'grey' : status === 'in-progress' ? 'blue' : 'green'}`}></span>
                    <h2>{status === 'todo' ? 'To Do' : status === 'in-progress' ? 'In Progress' : 'Done'}</h2>
                    <span className="count">{columnTasks.length}</span>
                  </div>
                  <div className="task-list">
                    {columnTasks.length === 0 ? (
                      <div className="empty-state">
                        <p>No tasks here</p>
                        <span>Drag tasks to update status</span>
                      </div>
                    ) : (
                      columnTasks.map(task => (
                        <KanbanTaskCard 
                          key={task.id} 
                          task={task} 
                          currentUser={currentUser}
                          onDragStart={handleDragStart}
                          onDragEnd={handleDragEnd}
                          onClick={() => setSelectedTask(task)}
                          onStatusChange={updateTaskStatus}
                          onEdit={openEditModal}
                          onDelete={deleteTask}
                        />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="filtered-view-container">
            {filterViewInfo && (
              <div className="filter-view-header">
                <div className="filter-view-icon">{filterViewInfo.icon}</div>
                <div className="filter-view-text">
                  <h2>{filterViewInfo.title}</h2>
                  <p>{filterViewInfo.subtitle}</p>
                </div>
                <div className="filter-view-count">
                  <span className="count-number">{getGlobalFilteredTasks.length}</span>
                  <span className="count-label">tasks</span>
                </div>
              </div>
            )}

            {getGlobalFilteredTasks.length === 0 ? (
              <div className="filtered-empty-state">
                <div className="empty-icon-wrapper">
                  {filterViewInfo?.icon}
                </div>
                <h3>{filterViewInfo?.emptyMessage || 'No tasks found'}</h3>
                <p>Try adjusting your search or check back later</p>
              </div>
            ) : (
              <div className="filtered-task-list">
                {getGlobalFilteredTasks.map(task => (
                  <DetailedTaskCard 
                    key={task.id}
                    task={task}
                    currentUser={currentUser}
                    onClick={() => setSelectedTask(task)}
                    onStatusChange={updateTaskStatus}
                    getSubmissionStatus={getSubmissionStatus}
                    onEdit={openEditModal}
                    onDelete={deleteTask}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {showEditModal && editTaskData && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h2>Edit Task</h2>
                <button className="close-btn" onClick={closeEditModal}>×</button>
              </div>
              <form onSubmit={submitEditTask}>
                <div className="form-group">
                  <label>Title</label>
                  <input
                    type="text"
                    value={editTaskData.title}
                    onChange={(e) => setEditTaskData(prev => ({ ...prev, title: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    rows="3"
                    value={editTaskData.description}
                    onChange={(e) => setEditTaskData(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Priority</label>
                    <select
                      value={editTaskData.priority}
                      onChange={(e) => setEditTaskData(prev => ({ ...prev, priority: e.target.value }))}
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Due Date</label>
                    <input
                      type="date"
                      value={editTaskData.dueDate}
                      onChange={(e) => setEditTaskData(prev => ({ ...prev, dueDate: e.target.value }))}
                    />
                  </div>
                </div>
                <button type="submit" className="btn btn-full" disabled={editLoading}>
                  {editLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </form>
            </div>
          </div>
        )}

        {selectedTask && (
          <TaskDetailDrawer 
            task={selectedTask} 
            onClose={() => {
              setSelectedTask(null);
              fetchAllTasks();
            }}
            onTaskUpdate={() => fetchAllTasks()}
          />
        )}
      </main>
    </div>
  );
}

function KanbanTaskCard({ task, currentUser, onDragStart, onDragEnd, onClick, onStatusChange, onEdit, onDelete }) {
  const isCompletedLate = task.status === 'completed_late';
  const isOverdue = !isCompletedLate && task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done';
  const isCompleted = task.status === 'done' || isCompletedLate;
  const canManage = task.created_by === currentUser?.id;

  return (
    <div 
      className={`task-card ${isOverdue ? 'overdue-card' : ''} ${isCompletedLate ? 'late-submission-card' : ''} ${task.task_type === 'team' ? 'team-task-card' : 'personal-task-card'}`}
      draggable
      onDragStart={(e) => onDragStart(e, task)}
      onDragEnd={onDragEnd}
      onClick={onClick}
    >
      {task.team_name && (
        <div className="task-type-badge">
          <FaUsers className="badge-icon" /> {task.team_name}
        </div>
      )}

      {isCompletedLate && (
        <div className="late-submission-badge">
          <MdWarning className="badge-icon" /> Submitted Late
        </div>
      )}

      <div className="task-header">
        <span className={`priority-tag ${task.priority.toLowerCase()}`}>{task.priority}</span>
        {isCompleted && (
          <span className={`status-label ${isCompletedLate ? 'late' : 'on-time'}`}>
            {isCompletedLate ? 'Late' : 'Completed'}
          </span>
        )}
      </div>
      
      <h3>{task.title}</h3>
      
      {task.description && (
        <p className="task-excerpt">{task.description.substring(0, 60)}...</p>
      )}

      <div className="quick-status-buttons" onClick={(e) => e.stopPropagation()}>
        {task.status !== 'todo' && task.status !== 'completed_late' && (
          <button 
            className="status-btn todo"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onStatusChange(task.id, 'todo'); }}
            title="Move to To Do"
          >
            <MdPendingActions />
          </button>
        )}
        {task.status !== 'in-progress' && task.status !== 'completed_late' && (
          <button 
            className="status-btn in-progress"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onStatusChange(task.id, 'in-progress'); }}
            title="Move to In Progress"
          >
            <MdPlayCircleOutline />
          </button>
        )}
        {task.status !== 'done' && task.status !== 'completed_late' && (
          <button 
            className="status-btn done"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onStatusChange(task.id, 'done'); }}
            title="Mark as Done"
          >
            <MdOutlineTaskAlt />
          </button>
        )}
      </div>

      <div className="task-footer">
        {task.due_date && (
          <span className={`due-date ${isOverdue ? 'overdue' : ''} ${isCompletedLate ? 'late' : ''}`}>
            {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        )}
        {canManage && (
          <div className="task-actions-inline" onClick={(e) => e.stopPropagation()}>
            <button
              className="action-btn edit"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(task); }}
              title="Edit task"
            >
              <FaEdit />
            </button>
            <button
              className="action-btn delete"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(task); }}
              title="Delete task"
            >
              <FaTrash />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function DetailedTaskCard({ task, currentUser, onClick, onStatusChange, getSubmissionStatus, onEdit, onDelete }) {
  const submissionStatus = getSubmissionStatus(task);
  const isCompleted = task.status === 'done' || task.status === 'completed_late';
  
  const statusConfig = {
    pending: { label: 'Pending', icon: <FaHourglass />, className: 'status-pending' },
    completed: { label: 'Completed', icon: <FaCheck />, className: 'status-completed' },
    late: { label: 'Submitted Late', icon: <MdWarning />, className: 'status-late' },
    overdue: { label: 'Overdue', icon: <FaExclamationTriangle />, className: 'status-overdue' }
  };

  const currentStatus = statusConfig[submissionStatus];
  const isCreatedByMe = task.created_by === currentUser?.id;

  return (
    <div className={`detailed-task-card ${currentStatus.className}`} onClick={onClick}>
      <div className={`task-status-indicator ${submissionStatus}`}>
        {currentStatus.icon}
      </div>

      <div className="task-main-content">
        <div className="task-top-row">
          <h3 className="task-title">{task.title}</h3>
          <span className={`priority-badge ${task.priority.toLowerCase()}`}>
            <FaFlag /> {task.priority}
          </span>
        </div>

        {task.description && (
          <p className="task-description">{task.description.substring(0, 120)}...</p>
        )}

        <div className="task-meta-row">
          {task.team_name && (
            <div className="meta-item team">
              <FaUsers className="meta-icon" />
              <span>{task.team_name}</span>
            </div>
          )}

          {task.due_date && (
            <div className={`meta-item due-date ${submissionStatus === 'overdue' || submissionStatus === 'late' ? 'danger' : ''}`}>
              <FaCalendarAlt className="meta-icon" />
              <span>Due: {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </div>
          )}

          {!isCompleted && (
            <div className="meta-item current-status">
              <span className={`status-chip ${task.status}`}>
                {task.status === 'in-progress' ? 'In Progress' : task.status === 'todo' ? 'To Do' : task.status}
              </span>
            </div>
          )}
        </div>

        <div className="task-assignment-row">
          {isCreatedByMe ? (
            <div className="assignment-info created">
              <MdPerson className="assignment-icon" />
              <span>Created by you</span>
              {task.assignees && task.assignees.length > 0 && (
                <>
                  <FaArrowRight className="arrow-icon" />
                  <span className="assignee-names">
                    Assigned to: {task.assignees.map(a => a.name).join(', ')}
                  </span>
                </>
              )}
            </div>
          ) : (
            <div className="assignment-info assigned">
              <MdGroup className="assignment-icon" />
              <span>Assigned to you</span>
            </div>
          )}
        </div>
      </div>

      <div className="task-right-section">
        <div className={`submission-status-badge ${submissionStatus}`}>
          {currentStatus.icon}
          <span>{currentStatus.label}</span>
        </div>

        {isCompleted && task.updated_at && (
          <div className="completion-time">
            <MdAccessTime />
            <span>
              {submissionStatus === 'late' ? 'Submitted' : 'Completed'}: {new Date(task.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          </div>
        )}

        {!isCompleted && (
          <div className="quick-actions" onClick={(e) => e.stopPropagation()}>
            <button 
              className="action-btn complete"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onStatusChange(task.id, 'done'); }}
              title="Mark as Complete"
            >
              <MdOutlineTaskAlt />
              <span>Complete</span>
            </button>
          </div>
        )}
        {isCreatedByMe && (
          <div className="quick-actions" onClick={(e) => e.stopPropagation()}>
            <button
              className="action-btn edit"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(task); }}
              title="Edit task"
            >
              <FaEdit />
              <span>Edit</span>
            </button>
            <button
              className="action-btn delete"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(task); }}
              title="Delete task"
            >
              <FaTrash />
              <span>Delete</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default AssignedTasks;
