// client/src/components/Sidebar.jsx - LOOMIO-INSPIRED UI VERSION
import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import NotificationCenter from './NotificationCenter';
import { MdDashboard, MdSettings, MdLogout, MdLeaderboard } from 'react-icons/md';
import { FaUserFriends, FaCalendarAlt, FaTasks, FaTrophy, FaUser, FaChevronRight, FaBars } from 'react-icons/fa';
import '../pages/Dashboard.css';

function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, logout } = useApp();
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('sidebarCollapsed') === 'true';
  });

  const toggleSidebar = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('sidebarCollapsed', newState);
  };

  const isActive = (path) => location.pathname === path ? 'active' : '';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isImageAvatar = typeof currentUser?.avatar === 'string' &&
    (currentUser.avatar.startsWith('data:image/') || currentUser.avatar.startsWith('http://') || currentUser.avatar.startsWith('https://'));
  const userInitials = currentUser?.name?.substring(0, 2).toUpperCase() || 'U';
  const userName = currentUser?.name || 'User';
  const navItems = [
    { path: '/dashboard', icon: MdDashboard, label: 'Dashboard' },
    { path: '/teams', icon: FaUserFriends, label: 'Teams' },
    { path: '/tasks', icon: FaTasks, label: 'Tasks' },
    { path: '/calendar', icon: FaCalendarAlt, label: 'Calendar' },
    { path: '/leaderboard', icon: FaTrophy, label: 'Leaderboard' },
    { path: '/profile', icon: FaUser, label: 'Profile' },
    { path: '/settings', icon: MdSettings, label: 'Settings' },
  ];

  return (
    <aside className={`sidebar ${isCollapsed ? 'sidebar-collapsed' : ''}`}>
      {/* Header with Brand */}
      <div className="sidebar-header">
        <div className="sidebar-brand">
          <div className="brand-icon">CT</div>
          {!isCollapsed && (
            <div>
              <h3>CampusTasks</h3>
              <span className="sidebar-header-subtitle">Task Hub</span>
            </div>
          )}
        </div>
        <div className="sidebar-header-actions">
          {!isCollapsed && <NotificationCenter />}
          <button
            className="sidebar-toggle-btn"
            onClick={toggleSidebar}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <FaBars className="sidebar-toggle-icon" />
          </button>
        </div>
      </div>

      {/* User Profile Section (Loomio Style) */}
      {!isCollapsed && (
        <div className="sidebar-user-section">
          <div className="sidebar-user-profile">
            <div className="sidebar-user-avatar">
              {isImageAvatar ? (
                <img src={currentUser.avatar} alt={userName} className="avatar-image" />
              ) : (
                userInitials
              )}
            </div>
            <div className="sidebar-user-info">
              <p className="sidebar-user-name">{userName}</p>
              <p className="sidebar-user-role">Member</p>
              <p className="sidebar-user-points">{currentUser?.points || 0} points</p>
            </div>
          </div>
        </div>
      )}

      <nav className="sidebar-nav">
        <div className="nav-section">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-item ${isActive(item.path)}`}
              title={isCollapsed ? item.label : undefined}
            >
              <span className="nav-item-indicator" />
              <item.icon className="nav-icon" />
              {!isCollapsed && <span className="nav-label">{item.label}</span>}
              {isCollapsed && <span className="nav-tooltip">{item.label}</span>}
            </Link>
          ))}
        </div>
      </nav>

      <div className="sidebar-footer">
        <div className="user-profile">
          {isCollapsed && (
            <div className="avatar">
              {isImageAvatar ? (
                <img src={currentUser.avatar} alt={userName} className="avatar-image" />
              ) : (
                userInitials
              )}
            </div>
          )}
          {!isCollapsed && (
            <button onClick={handleLogout} className="logout-btn" aria-label="Logout">
              <MdLogout className="logout-icon" />
              <span>Logout</span>
            </button>
          )}
          {isCollapsed && (
            <button
              onClick={handleLogout}
              className="logout-btn-collapsed"
              title="Logout"
              aria-label="Logout"
            >
              <MdLogout />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
