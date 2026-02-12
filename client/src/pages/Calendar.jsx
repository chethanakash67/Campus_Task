// client/src/pages/Calendar.jsx - LOOMIO-STYLE UI
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Toast from '../components/Toast';
import { FaChevronLeft, FaChevronRight, FaCalendarAlt, FaClock, FaExclamationCircle } from 'react-icons/fa';
import { MdEvent, MdToday, MdDateRange } from 'react-icons/md';
import { useApp } from '../context/AppContext';
import './Dashboard.css';
import './Calendar.css';

function Calendar() {
  const navigate = useNavigate();
  const { tasks, toasts, removeToast, isAuthenticated, currentUser } = useApp();

  useEffect(() => {
    if (!isAuthenticated || !currentUser) {
      navigate('/login');
    }
  }, [isAuthenticated, currentUser, navigate]);
  const [currentDate, setCurrentDate] = useState(new Date());

  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Get tasks for specific date
  const getTasksForDate = (day) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return tasks.filter(task => task.dueDate === dateStr);
  };

  const previousMonth = () => {
    setCurrentDate(new Date(year, month - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1));
  };

  const isToday = (day) => {
    const today = new Date();
    return day === today.getDate() && 
           month === today.getMonth() && 
           year === today.getFullYear();
  };

  const calendarDays = [];
  
  // Empty cells for days before month starts
  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
  }
  
  // Actual days
  for (let day = 1; day <= daysInMonth; day++) {
    const dayTasks = getTasksForDate(day);
    calendarDays.push(
      <div key={day} className={`calendar-day ${isToday(day) ? 'today' : ''}`}>
        <span className="day-number">{day}</span>
        <div className="day-tasks">
          {dayTasks.slice(0, 3).map(task => (
            <div 
              key={task.id} 
              className={`event-badge event-${task.priority.toLowerCase()}`}
              title={task.title}
            >
              {task.title.length > 15 ? task.title.substring(0, 15) + '...' : task.title}
            </div>
          ))}
          {dayTasks.length > 3 && (
            <div className="more-tasks">+{dayTasks.length - 3} more</div>
          )}
        </div>
      </div>
    );
  }

  // Upcoming deadlines in next 7 days
  const today = new Date();
  const upcomingTasks = tasks
    .filter(task => {
      if (!task.dueDate || task.status === 'done') return false;
      const dueDate = new Date(task.dueDate);
      const diffTime = dueDate - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 7;
    })
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

  // Calculate this month's stats
  const monthStats = useMemo(() => {
    const monthTasks = tasks.filter(task => {
      if (!task.dueDate) return false;
      const dueDate = new Date(task.dueDate);
      return dueDate.getMonth() === month && dueDate.getFullYear() === year;
    });
    return {
      total: monthTasks.length,
      completed: monthTasks.filter(t => t.status === 'done').length,
      upcoming: monthTasks.filter(t => t.status !== 'done').length,
      overdue: monthTasks.filter(t => {
        const dueDate = new Date(t.dueDate);
        return dueDate < today && t.status !== 'done';
      }).length
    };
  }, [tasks, month, year]);

  if (!isAuthenticated || !currentUser) {
    return null;
  }

  return (
    <div className="dashboard-container">
      <Sidebar />
      <Toast toasts={toasts} removeToast={removeToast} />
      
      <main className="main-content">
        {/* Page Header Card */}
        <div className="page-header-card">
          <div className="page-header-content">
            <div className="page-header-icon">
              <MdEvent />
            </div>
            <div className="page-header-text">
              <h1>Calendar</h1>
              <p>View and manage your task deadlines</p>
            </div>
          </div>
          <div className="calendar-nav">
            <button className="btn btn-icon" onClick={previousMonth} title="Previous Month">
              <FaChevronLeft />
            </button>
            <button className="btn btn-secondary" onClick={() => setCurrentDate(new Date())}>
              <MdToday style={{ marginRight: '6px' }} /> Today
            </button>
            <button className="btn btn-icon" onClick={nextMonth} title="Next Month">
              <FaChevronRight />
            </button>
          </div>
        </div>

        {/* Month Title */}
        <div className="month-title-bar">
          <h2>{monthNames[month]} {year}</h2>
          <div className="month-quick-stats">
            <span className="quick-stat">
              <MdDateRange /> {monthStats.total} tasks this month
            </span>
            {monthStats.overdue > 0 && (
              <span className="quick-stat overdue">
                <FaExclamationCircle /> {monthStats.overdue} overdue
              </span>
            )}
          </div>
        </div>

        <div className="calendar-layout">
          {/* Calendar Main */}
          <div className="calendar-main-card">
            <div className="calendar-grid">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="day-header">{day}</div>
              ))}
              {calendarDays}
            </div>
          </div>

          {/* Sidebar */}
          <div className="calendar-sidebar-panel">
            {/* This Month Stats */}
            <div className="sidebar-card">
              <div className="sidebar-card-header">
                <FaCalendarAlt />
                <h3>This Month</h3>
              </div>
              <div className="month-stats-grid">
                <div className="month-stat-item">
                  <span className="stat-number">{monthStats.total}</span>
                  <span className="stat-text">Total Tasks</span>
                </div>
                <div className="month-stat-item">
                  <span className="stat-number completed">{monthStats.completed}</span>
                  <span className="stat-text">Completed</span>
                </div>
                <div className="month-stat-item">
                  <span className="stat-number upcoming">{monthStats.upcoming}</span>
                  <span className="stat-text">Upcoming</span>
                </div>
                {monthStats.overdue > 0 && (
                  <div className="month-stat-item">
                    <span className="stat-number overdue">{monthStats.overdue}</span>
                    <span className="stat-text">Overdue</span>
                  </div>
                )}
              </div>
            </div>

            {/* Upcoming Tasks */}
            <div className="sidebar-card">
              <div className="sidebar-card-header">
                <FaClock />
                <h3>Upcoming in 7 Days</h3>
              </div>
              {upcomingTasks.length === 0 ? (
                <div className="empty-upcoming">
                  <MdToday className="empty-icon" />
                  <p>No upcoming deadlines</p>
                  <span>You're all caught up!</span>
                </div>
              ) : (
                <div className="upcoming-list">
                  {upcomingTasks.map(task => {
                    const dueDate = new Date(task.dueDate);
                    const daysUntil = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
                    
                    return (
                      <div key={task.id} className="upcoming-task-item">
                        <div className="upcoming-task-left">
                          <span className={`priority-indicator ${task.priority.toLowerCase()}`}></span>
                          <div className="upcoming-task-info">
                            <h4>{task.title}</h4>
                            <span className="upcoming-meta">
                              {daysUntil === 0 ? 'Due today' : 
                               daysUntil === 1 ? 'Due tomorrow' : 
                               `Due in ${daysUntil} days`}
                            </span>
                          </div>
                        </div>
                        <span className={`days-badge ${daysUntil <= 2 ? 'urgent' : ''}`}>
                          {dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Calendar;
