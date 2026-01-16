// client/src/components/Sidebar.jsx
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
// Importing the icons you used
import { MdDashboard, MdSettings } from 'react-icons/md';
import { FaUserFriends, FaCalendarAlt } from 'react-icons/fa';
import { FiLogOut } from 'react-icons/fi';
import '../pages/Dashboard.css'; // Ensure this points to your CSS

function Sidebar() {
  const location = useLocation();

  // Helper to highlight the active link
  const isActive = (path) => location.pathname === path ? 'active' : '';

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h3>CampusTasks</h3>
      </div>
      
      <nav className="sidebar-nav">
        <div className="nav-section">
          <h4>MENU</h4>
          
          {/* REAL LINKS using 'Link to=' instead of 'a href=' */}
          <Link to="/dashboard" className={`nav-item ${isActive('/dashboard')}`}>
            <MdDashboard className="nav-icon" /> Dashboard
          </Link>
          
          <Link to="/teams" className={`nav-item ${isActive('/teams')}`}>
            <FaUserFriends className="nav-icon" /> My Teams
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
              <div className="avatar">JD</div>
              <div className="user-info">
                  <p className="user-name">John Doe</p>
                  <Link to="/login" className="logout-link">
                      <FiLogOut style={{ marginRight: '5px' }} /> Logout
                  </Link>
              </div>
          </div>
      </div>
    </aside>
  );
}

export default Sidebar;