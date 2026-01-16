// client/src/pages/Settings.jsx
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { useApp } from '../context/AppContext';
import './Dashboard.css';

function Settings() {
  const navigate = useNavigate();
  const { currentUser, isAuthenticated } = useApp();

  useEffect(() => {
    if (!isAuthenticated || !currentUser) {
      navigate('/login');
    }
  }, [isAuthenticated, currentUser, navigate]);

  if (!isAuthenticated || !currentUser) {
    return null;
  }

  const userInitials = currentUser?.avatar || currentUser?.name?.substring(0, 2).toUpperCase() || 'JD';
  const userName = currentUser?.name || 'John Doe';

  return (
    <div className="dashboard-container">
      <Sidebar />
      <main className="main-content">
        <header className="top-bar">
          <div className="page-title">
            <h1>Settings</h1>
            <p>Manage your account preferences</p>
          </div>
        </header>

        <div className="settings-container">
          <section className="settings-section">
            <h3>Profile</h3>
            <div className="profile-edit">
                <div className="big-avatar">{userInitials}</div>
                <button className="btn btn-primary">Change Avatar</button>
            </div>
            <div className="input-group">
                <label>Display Name</label>
                <input type="text" defaultValue={userName} />
            </div>
          </section>

          <section className="settings-section">
            <h3>Preferences</h3>
            <div className="pref-item">
                <span>Dark Mode</span>
                <input type="checkbox" checked readOnly/>
            </div>
            <div className="pref-item">
                <span>Email Notifications</span>
                <input type="checkbox" checked readOnly/>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
export default Settings;