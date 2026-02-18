import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaBell, FaCheck, FaTimes, FaCheckDouble, FaUsers, FaClipboardList, FaComment, FaClock, FaAt } from 'react-icons/fa';
import './NotificationCenter.css';

function NotificationCenter() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

  useEffect(() => {
    fetchNotifications();
    fetchUnreadCount();
    
    const interval = setInterval(() => {
      fetchUnreadCount();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('campusToken');
      const response = await axios.get(`${API_URL}/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(response.data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const token = localStorage.getItem('campusToken');
      const response = await axios.get(`${API_URL}/notifications/unread-count`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUnreadCount(response.data.count);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  const markAsRead = async (notificationId, link = null) => {
    try {
      const token = localStorage.getItem('campusToken');
      await axios.put(`${API_URL}/notifications/${notificationId}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      fetchNotifications();
      fetchUnreadCount();
      
      if (link) {
        navigate(link);
        setShowDropdown(false);
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('campusToken');
      await axios.put(`${API_URL}/notifications/mark-all-read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      fetchNotifications();
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    } finally {
      setLoading(false);
    }
  };

  // Replace emoji icons with React Icons
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'team_invite':
        return <FaUsers className="notif-type-icon team" />;
      case 'task_assigned':
        return <FaClipboardList className="notif-type-icon task" />;
      case 'task_comment':
        return <FaComment className="notif-type-icon comment" />;
      case 'task_due_soon':
        return <FaClock className="notif-type-icon due" />;
      case 'mention':
        return <FaAt className="notif-type-icon mention" />;
      default:
        return <FaBell className="notif-type-icon default" />;
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
    return date.toLocaleDateString();
  };

  // Helper to ensure message is never undefined
  const getNotificationMessage = (notif) => {
    if (!notif.message || notif.message === 'undefined') {
      return 'You have a new notification';
    }
    return notif.message;
  };

  const getNotificationTitle = (notif) => {
    if (!notif.title || notif.title === 'undefined') {
      return 'Notification';
    }
    return notif.title;
  };

  return (
    <div className="notification-center" ref={dropdownRef}>
      <button 
        className="notification-bell"
        onClick={() => {
          setShowDropdown(!showDropdown);
          if (!showDropdown) fetchNotifications();
        }}
        aria-label="Notifications"
      >
        <FaBell />
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {showDropdown && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <h3>Notifications</h3>
            {unreadCount > 0 && (
              <button 
                className="mark-all-read"
                onClick={markAllAsRead}
                disabled={loading}
              >
                <FaCheckDouble /> Mark all read
              </button>
            )}
          </div>

          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="empty-notifications">
                <FaBell size={32} />
                <p>No notifications yet</p>
                <span>You're all caught up!</span>
              </div>
            ) : (
              notifications.map(notif => (
                <div 
                  key={notif.id}
                  className={`notification-item ${!notif.is_read ? 'unread' : ''}`}
                  onClick={() => markAsRead(notif.id, notif.link)}
                >
                  <div className="notification-icon">
                    {getNotificationIcon(notif.type)}
                  </div>
                  <div className="notification-content">
                    <div className="notification-title">{getNotificationTitle(notif)}</div>
                    <div className="notification-message">{getNotificationMessage(notif)}</div>
                    <div className="notification-time">{formatTime(notif.created_at)}</div>
                  </div>
                  {!notif.is_read && <div className="unread-dot"></div>}
                </div>
              ))
            )}
          </div>

          {notifications.length > 0 && (
            <div className="notification-footer">
              <button onClick={() => {
                navigate('/notifications?tab=notifications');
                setShowDropdown(false);
              }}>
                View All Notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default NotificationCenter;
