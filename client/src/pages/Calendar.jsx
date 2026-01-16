// client/src/pages/Calendar.jsx
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Toast from '../components/Toast';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { useApp } from '../context/AppContext';
import './Dashboard.css';

function Calendar() {
  const navigate = useNavigate();
  const { tasks, toasts, removeToast, isAuthenticated, currentUser } = useApp();

  useEffect(() => {
    if (!isAuthenticated || !currentUser) {
      navigate('/login');
    }
  }, [isAuthenticated, currentUser, navigate]);

  if (!isAuthenticated || !currentUser) {
    return null;
  }
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

  return (
    <div className="dashboard-container">
      <Sidebar />
      <Toast toasts={toasts} removeToast={removeToast} />
      
      <main className="main-content">
        <header className="top-bar">
          <div className="page-title">
            <h1>{monthNames[month]} {year}</h1>
            <p>Upcoming Deadlines & Events</p>
          </div>
          <div className="calendar-nav">
            <button className="btn-icon" onClick={previousMonth} title="Previous Month">
              <FaChevronLeft />
            </button>
            <button className="btn btn-secondary" onClick={() => setCurrentDate(new Date())}>
              Today
            </button>
            <button className="btn-icon" onClick={nextMonth} title="Next Month">
              <FaChevronRight />
            </button>
          </div>
        </header>

        <div className="calendar-container">
          <div className="calendar-main">
            <div className="calendar-grid">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="day-header">{day}</div>
              ))}
              {calendarDays}
            </div>
          </div>

          {/* Upcoming Tasks Sidebar */}
          <div className="calendar-sidebar">
            <h3>Upcoming in 7 Days</h3>
            {upcomingTasks.length === 0 ? (
              <div className="empty-upcoming">
                <p>No upcoming deadlines</p>
                <span>You're all caught up! 🎉</span>
              </div>
            ) : (
              <div className="upcoming-list">
                {upcomingTasks.map(task => (
                  <div key={task.id} className="upcoming-task">
                    <div className="upcoming-task-header">
                      <span className={`priority-tag ${task.priority.toLowerCase()}`}>
                        {task.priority}
                      </span>
                      <span className="upcoming-date">
                        {new Date(task.dueDate).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </span>
                    </div>
                    <h4>{task.title}</h4>
                    {task.description && (
                      <p className="upcoming-desc">
                        {task.description.substring(0, 60)}...
                      </p>
                    )}
                    <div className="upcoming-assignees">
                      {task.assignees && task.assignees.slice(0, 3).map((assignee, idx) => (
                        <div key={idx} className="mini-avatar" title={assignee.name || assignee.id}>
                          {assignee.id || assignee.name?.charAt(0) || '?'}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default Calendar;