// client/src/components/Sidebar.jsx - FIXED VERSION
import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import NotificationCenter from './NotificationCenter';
// FIXED: Added missing FaTasks import
import { MdDashboard, MdSettings } from 'react-icons/md';
import { FaUserFriends, FaCalendarAlt, FaTasks } from 'react-icons/fa';
import { FiLogOut } from 'react-icons/fi';
import '../pages/Dashboard.css';

function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, logout } = useApp();

  // Helper to highlight the active link
  const isActive = (path) => location.pathname === path ? 'active' : '';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const userInitials = currentUser?.avatar || currentUser?.name?.substring(0, 2).toUpperCase() || 'JD';
  const userName = currentUser?.name || 'John Doe';

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
  <h3>CampusTasks</h3>
  <NotificationCenter />
</div>
      <nav className="sidebar-nav">
        <div className="nav-section">
          <h4>MENU</h4>
          
          <Link to="/dashboard" className={`nav-item ${isActive('/dashboard')}`}>
            <MdDashboard className="nav-icon" /> Dashboard
          </Link>
          
          <Link to="/teams" className={`nav-item ${isActive('/teams')}`}>
            <FaUserFriends className="nav-icon" /> My Teams
          </Link>
          
          <Link to="/assigned-tasks" className={`nav-item ${isActive('/assigned-tasks')}`}>
            <FaTasks className="nav-icon" /> Assigned Tasks
          </Link>
          
          <Link to="/calendar" className={`nav-item ${isActive('/calendar')}`}>
            <FaCalendarAlt className="nav-icon" /> Calendar
          </Link>
          
          <Link to="/settings" className={`nav-item ${isActive('/settings')}`}>
            <MdSettings className="nav-icon" /> Settings
          </Link>
        </div>

        <div className="nav-section">
          <h4>TEAMS</h4>
          <div className="team-item"><span className="dot purple"></span> Engineering</div>
          <div className="team-item"><span className="dot green"></span> Design Ops</div>
        </div>
      </nav>

      <div className="sidebar-footer">
        <div className="user-profile">
          <div className="avatar">{userInitials}</div>
          <div className="user-info">
            <p className="user-name">{userName}</p>
            <button onClick={handleLogout} className="logout-link" style={{ 
              background: 'none', 
              border: 'none', 
              color: 'inherit', 
              cursor: 'pointer',
              padding: 0,
              fontSize: 'inherit',
              fontFamily: 'inherit',
              display: 'flex',
              alignItems: 'center'
            }}>
              <FiLogOut style={{ marginRight: '5px' }} /> Logout
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;