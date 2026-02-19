// client/src/pages/Settings.jsx - LOOMIO-STYLE UI
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import Sidebar from '../components/Sidebar';
import { useApp } from '../context/AppContext';
import { FaUser, FaBell, FaShieldAlt, FaPalette, FaCheck, FaCamera } from 'react-icons/fa';
import { MdSettings, MdEmail, MdNotifications, MdSecurity, MdEdit, MdSchool } from 'react-icons/md';
import './Dashboard.css';
import './Settings.css';

function Settings() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, isAuthenticated, tasks, updateCurrentUserProfile } = useApp();
  const [activeTab, setActiveTab] = useState('profile');
  const [savingProfile, setSavingProfile] = useState(false);
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [gradeItems, setGradeItems] = useState([]);
  const [gradeProjection, setGradeProjection] = useState(null);
  const [courseForm, setCourseForm] = useState({
    name: '',
    code: '',
    semester: '',
    targetGrade: 85,
    credits: 3
  });
  const [gradeForm, setGradeForm] = useState({
    title: '',
    category: '',
    weight: '',
    maxScore: 100,
    score: '',
    dueDate: ''
  });
  const [profileForm, setProfileForm] = useState({
    name: '',
    bio: '',
    avatar: ''
  });
  const fileInputRef = useRef(null);
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
  const [notifications, setNotifications] = useState({
    emailTaskAssigned: true,
    emailTaskComplete: true,
    emailTeamInvite: true,
    emailReminders: false,
    pushNewTask: true,
    pushComments: true,
    pushDeadlines: true
  });

  useEffect(() => {
    if (!isAuthenticated || !currentUser) {
      navigate('/login');
    }
  }, [isAuthenticated, currentUser, navigate]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab && ['profile', 'notifications', 'security', 'academics'].includes(tab)) {
      setActiveTab(tab);
    } else if (location.pathname === '/notifications') {
      setActiveTab('notifications');
    }
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!currentUser) return;
    setProfileForm({
      name: currentUser.name || '',
      bio: currentUser.bio || '',
      avatar: currentUser.avatar || ''
    });
  }, [currentUser]);

  useEffect(() => {
    if (isAuthenticated && currentUser) {
      loadCourses();
    }
  }, [isAuthenticated, currentUser]);

  useEffect(() => {
    loadGradesAndProjection(selectedCourseId);
  }, [selectedCourseId]);

  if (!isAuthenticated || !currentUser) {
    return null;
  }

  const displayedAvatar = profileForm.avatar ?? currentUser?.avatar;
  const isImageAvatar = typeof displayedAvatar === 'string' &&
    (displayedAvatar.startsWith('data:image/') ||
      displayedAvatar.startsWith('http://') ||
      displayedAvatar.startsWith('https://'));
  const userInitials = currentUser?.name?.substring(0, 2).toUpperCase() || 'JD';
  const userName = currentUser?.name || 'John Doe';
  const userEmail = currentUser?.email || 'user@example.com';

  // Calculate user stats
  const userTasks = tasks.filter(t =>
    t.assignees?.some(a => a.email === currentUser?.email)
  );
  const completedTasks = userTasks.filter(t => t.status === 'done').length;
  const points = currentUser?.points || 0;

  const handleNotificationChange = (key) => {
    setNotifications(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleProfileInput = (e) => {
    const { name, value } = e.target;
    setProfileForm(prev => ({ ...prev, [name]: value }));
  };

  const handleProfileAvatarUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setProfileForm(prev => ({ ...prev, avatar: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const removeProfileAvatar = () => {
    setProfileForm(prev => ({ ...prev, avatar: null }));
  };

  const submitProfile = async () => {
    try {
      setSavingProfile(true);
      await updateCurrentUserProfile({
        name: profileForm.name,
        bio: profileForm.bio,
        avatar: profileForm.avatar
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const loadCourses = async () => {
    try {
      const token = localStorage.getItem('campusToken');
      const response = await axios.get(`${API_URL}/courses`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCourses(response.data || []);
      if (!selectedCourseId && response.data?.length) {
        setSelectedCourseId(String(response.data[0].id));
      }
    } catch (error) {
      console.error('Load courses error:', error);
    }
  };

  const loadGradesAndProjection = async (courseId) => {
    if (!courseId) {
      setGradeItems([]);
      setGradeProjection(null);
      return;
    }
    try {
      const token = localStorage.getItem('campusToken');
      const [gradesRes, projectionRes] = await Promise.all([
        axios.get(`${API_URL}/courses/${courseId}/grades`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/courses/${courseId}/projection`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      setGradeItems(gradesRes.data || []);
      setGradeProjection(projectionRes.data || null);
    } catch (error) {
      console.error('Load grade data error:', error);
    }
  };

  const createCourse = async () => {
    if (!courseForm.name.trim()) return;
    try {
      const token = localStorage.getItem('campusToken');
      await axios.post(`${API_URL}/courses`, courseForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCourseForm({ name: '', code: '', semester: '', targetGrade: 85, credits: 3 });
      await loadCourses();
    } catch (error) {
      console.error('Create course error:', error);
    }
  };

  const createGradeItem = async () => {
    if (!selectedCourseId || !gradeForm.title.trim() || !gradeForm.weight) return;
    try {
      const token = localStorage.getItem('campusToken');
      await axios.post(`${API_URL}/courses/${selectedCourseId}/grades`, gradeForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGradeForm({ title: '', category: '', weight: '', maxScore: 100, score: '', dueDate: '' });
      await loadGradesAndProjection(selectedCourseId);
    } catch (error) {
      console.error('Create grade item error:', error);
    }
  };

  const deleteGradeItem = async (gradeId) => {
    try {
      const token = localStorage.getItem('campusToken');
      await axios.delete(`${API_URL}/grades/${gradeId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await loadGradesAndProjection(selectedCourseId);
    } catch (error) {
      console.error('Delete grade item error:', error);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: FaUser },
    { id: 'notifications', label: 'Notifications', icon: MdNotifications },
    { id: 'security', label: 'Security', icon: MdSecurity },
    { id: 'academics', label: 'Academics', icon: MdSchool }
  ];

  return (
    <div className="dashboard-container">
      <Sidebar />
      <main className="main-content">
        {/* Page Header */}
        <div className="page-header-card">
          <div className="page-header-content">
            <div className="page-header-icon">
              <MdSettings />
            </div>
            <div className="page-header-text">
              <h1>Settings</h1>
              <p>Manage your account and preferences</p>
            </div>
          </div>
        </div>

        {/* Settings Layout */}
        <div className="settings-layout">
          {/* Settings Sidebar / Tabs */}
          <div className="settings-sidebar">
            <nav className="settings-nav">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  className={`settings-nav-item ${activeTab === tab.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <tab.icon />
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Settings Content */}
          <div className="settings-content">
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="settings-panel">
                <div className="settings-panel-header">
                  <h2>Profile Settings</h2>
                  <p>Manage your personal information</p>
                </div>

                {/* Profile Card */}
                <div className="profile-card">
                  <div className="profile-card-header">
                    <div className="profile-avatar-section">
                      <div className="profile-avatar-large">
                        {isImageAvatar ? (
                          <img src={displayedAvatar} alt={userName} className="avatar-image" />
                        ) : (
                          userInitials
                        )}
                      </div>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleProfileAvatarUpload}
                        style={{ display: 'none' }}
                        accept="image/*"
                      />
                      <button type="button" className="avatar-change-text-btn" onClick={() => fileInputRef.current?.click()}>
                        <FaCamera /> Change
                      </button>
                      {isImageAvatar && (
                        <button type="button" className="avatar-change-text-btn" onClick={removeProfileAvatar}>
                          Remove
                        </button>
                      )}
                    </div>
                    <div className="profile-info-section">
                      <h3>{userName}</h3>
                      <p>{userEmail}</p>
                      <div className="profile-stats">
                        <div className="profile-stat">
                          <span className="stat-value">{points}</span>
                          <span className="stat-label">Points</span>
                        </div>
                        <div className="profile-stat">
                          <span className="stat-value">{completedTasks}</span>
                          <span className="stat-label">Tasks Done</span>
                        </div>
                        <div className="profile-stat">
                          <span className="stat-value">{userTasks.length}</span>
                          <span className="stat-label">Total Tasks</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Profile Form */}
                <div className="settings-form-card">
                  <h3>Personal Information</h3>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Display Name</label>
                      <input
                        type="text"
                        name="name"
                        value={profileForm.name}
                        onChange={handleProfileInput}
                      />
                    </div>
                    <div className="form-group">
                      <label>Email Address</label>
                      <input type="email" defaultValue={userEmail} disabled />
                      <span className="form-hint">Email cannot be changed</span>
                    </div>
                    <div className="form-group full-width">
                      <label>Bio</label>
                      <textarea
                        name="bio"
                        placeholder="Tell us about yourself..."
                        rows={3}
                        value={profileForm.bio}
                        onChange={handleProfileInput}
                      ></textarea>
                    </div>
                  </div>
                  <div className="form-actions">
                    <button type="button" className="btn btn-primary" onClick={submitProfile} disabled={savingProfile}>
                      <FaCheck style={{ marginRight: '8px' }} />
                      {savingProfile ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <div className="settings-panel">
                <div className="settings-panel-header">
                  <h2>Notification Settings</h2>
                  <p>Choose how you want to be notified</p>
                </div>

                {/* Email Notifications */}
                <div className="settings-form-card">
                  <div className="card-header-with-icon">
                    <MdEmail className="card-icon" />
                    <div>
                      <h3>Email Notifications</h3>
                      <p>Manage email notification preferences</p>
                    </div>
                  </div>

                  <div className="notification-options">
                    <div className="notification-option">
                      <div className="option-info">
                        <span className="option-title">Task Assignments</span>
                        <span className="option-desc">Get notified when you're assigned to a task</span>
                      </div>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={notifications.emailTaskAssigned}
                          onChange={() => handleNotificationChange('emailTaskAssigned')}
                        />
                        <span className="toggle-slider"></span>
                      </label>
                    </div>

                    <div className="notification-option">
                      <div className="option-info">
                        <span className="option-title">Task Completions</span>
                        <span className="option-desc">Get notified when tasks are completed</span>
                      </div>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={notifications.emailTaskComplete}
                          onChange={() => handleNotificationChange('emailTaskComplete')}
                        />
                        <span className="toggle-slider"></span>
                      </label>
                    </div>

                    <div className="notification-option">
                      <div className="option-info">
                        <span className="option-title">Team Invitations</span>
                        <span className="option-desc">Get notified when you're invited to a team</span>
                      </div>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={notifications.emailTeamInvite}
                          onChange={() => handleNotificationChange('emailTeamInvite')}
                        />
                        <span className="toggle-slider"></span>
                      </label>
                    </div>

                    <div className="notification-option">
                      <div className="option-info">
                        <span className="option-title">Due Date Reminders</span>
                        <span className="option-desc">Receive reminders before task deadlines</span>
                      </div>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={notifications.emailReminders}
                          onChange={() => handleNotificationChange('emailReminders')}
                        />
                        <span className="toggle-slider"></span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Push Notifications */}
                <div className="settings-form-card">
                  <div className="card-header-with-icon">
                    <FaBell className="card-icon" />
                    <div>
                      <h3>In-App Notifications</h3>
                      <p>Control in-app notification preferences</p>
                    </div>
                  </div>

                  <div className="notification-options">
                    <div className="notification-option">
                      <div className="option-info">
                        <span className="option-title">New Tasks</span>
                        <span className="option-desc">Show notification for new task assignments</span>
                      </div>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={notifications.pushNewTask}
                          onChange={() => handleNotificationChange('pushNewTask')}
                        />
                        <span className="toggle-slider"></span>
                      </label>
                    </div>

                    <div className="notification-option">
                      <div className="option-info">
                        <span className="option-title">Comments & Mentions</span>
                        <span className="option-desc">Get notified when someone comments or mentions you</span>
                      </div>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={notifications.pushComments}
                          onChange={() => handleNotificationChange('pushComments')}
                        />
                        <span className="toggle-slider"></span>
                      </label>
                    </div>

                    <div className="notification-option">
                      <div className="option-info">
                        <span className="option-title">Upcoming Deadlines</span>
                        <span className="option-desc">Show reminders for approaching deadlines</span>
                      </div>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={notifications.pushDeadlines}
                          onChange={() => handleNotificationChange('pushDeadlines')}
                        />
                        <span className="toggle-slider"></span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'academics' && (
              <div className="settings-panel">
                <div className="settings-panel-header">
                  <h2>Academics</h2>
                  <p>Group tasks by course/semester and track grades</p>
                </div>

                <div className="settings-form-card">
                  <h3>Add Course</h3>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Course Name</label>
                      <input
                        type="text"
                        value={courseForm.name}
                        onChange={(e) => setCourseForm(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Algorithms"
                      />
                    </div>
                    <div className="form-group">
                      <label>Course Code</label>
                      <input
                        type="text"
                        value={courseForm.code}
                        onChange={(e) => setCourseForm(prev => ({ ...prev, code: e.target.value }))}
                        placeholder="CS301"
                      />
                    </div>
                    <div className="form-group">
                      <label>Semester</label>
                      <input
                        type="text"
                        value={courseForm.semester}
                        onChange={(e) => setCourseForm(prev => ({ ...prev, semester: e.target.value }))}
                        placeholder="Semester 6"
                      />
                    </div>
                    <div className="form-group">
                      <label>Target Grade (%)</label>
                      <input
                        type="number"
                        value={courseForm.targetGrade}
                        onChange={(e) => setCourseForm(prev => ({ ...prev, targetGrade: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="form-actions">
                    <button type="button" className="btn btn-primary" onClick={createCourse}>
                      Add Course
                    </button>
                  </div>
                </div>

                <div className="settings-form-card">
                  <h3>Courses</h3>
                  <div className="form-group">
                    <label>Select Course</label>
                    <select
                      value={selectedCourseId}
                      onChange={(e) => setSelectedCourseId(e.target.value)}
                    >
                      <option value="">Select a course</option>
                      {courses.map(course => (
                        <option key={course.id} value={course.id}>
                          {course.name} {course.semester ? `(${course.semester})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {gradeProjection && (
                    <div className="profile-stats" style={{ marginTop: '12px' }}>
                      <div className="profile-stat">
                        <span className="stat-value">{gradeProjection.currentAverage}%</span>
                        <span className="stat-label">Current Avg</span>
                      </div>
                      <div className="profile-stat">
                        <span className="stat-value">{gradeProjection.projectedFinal}%</span>
                        <span className="stat-label">Projected Final</span>
                      </div>
                      <div className="profile-stat">
                        <span className="stat-value">{gradeProjection.neededAverageOnRemaining}%</span>
                        <span className="stat-label">Needed Next</span>
                      </div>
                    </div>
                  )}
                </div>

                {selectedCourseId && (
                  <div className="settings-form-card">
                    <h3>Add Grade Item</h3>
                    <div className="form-grid">
                      <div className="form-group">
                        <label>Title</label>
                        <input
                          type="text"
                          value={gradeForm.title}
                          onChange={(e) => setGradeForm(prev => ({ ...prev, title: e.target.value }))}
                          placeholder="Quiz 1"
                        />
                      </div>
                      <div className="form-group">
                        <label>Category</label>
                        <input
                          type="text"
                          value={gradeForm.category}
                          onChange={(e) => setGradeForm(prev => ({ ...prev, category: e.target.value }))}
                          placeholder="Quiz"
                        />
                      </div>
                      <div className="form-group">
                        <label>Weight (%)</label>
                        <input
                          type="number"
                          value={gradeForm.weight}
                          onChange={(e) => setGradeForm(prev => ({ ...prev, weight: e.target.value }))}
                        />
                      </div>
                      <div className="form-group">
                        <label>Score</label>
                        <input
                          type="number"
                          value={gradeForm.score}
                          onChange={(e) => setGradeForm(prev => ({ ...prev, score: e.target.value }))}
                        />
                      </div>
                      <div className="form-group">
                        <label>Max Score</label>
                        <input
                          type="number"
                          value={gradeForm.maxScore}
                          onChange={(e) => setGradeForm(prev => ({ ...prev, maxScore: e.target.value }))}
                        />
                      </div>
                      <div className="form-group">
                        <label>Due Date</label>
                        <input
                          type="date"
                          value={gradeForm.dueDate}
                          onChange={(e) => setGradeForm(prev => ({ ...prev, dueDate: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="form-actions">
                      <button type="button" className="btn btn-primary" onClick={createGradeItem}>
                        Add Grade Item
                      </button>
                    </div>

                    <div className="notification-options" style={{ marginTop: '12px' }}>
                      {gradeItems.length === 0 && (
                        <div className="notification-option">
                          <div className="option-info">
                            <span className="option-title">No grade items yet</span>
                          </div>
                        </div>
                      )}
                      {gradeItems.map(item => (
                        <div className="notification-option" key={item.id}>
                          <div className="option-info">
                            <span className="option-title">{item.title}</span>
                            <span className="option-desc">
                              {item.category || 'General'} | {item.weight}% | {item.score ?? '-'} / {item.max_score}
                            </span>
                          </div>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => deleteGradeItem(item.id)}
                          >
                            Delete
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <div className="settings-panel">
                <div className="settings-panel-header">
                  <h2>Security Settings</h2>
                  <p>Manage your account security</p>
                </div>

                {/* Change Password */}
                <div className="settings-form-card">
                  <div className="card-header-with-icon">
                    <FaShieldAlt className="card-icon" />
                    <div>
                      <h3>Change Password</h3>
                      <p>Update your account password</p>
                    </div>
                  </div>

                  <div className="form-grid">
                    <div className="form-group full-width">
                      <label>Current Password</label>
                      <input type="password" placeholder="Enter current password" />
                    </div>
                    <div className="form-group">
                      <label>New Password</label>
                      <input type="password" placeholder="Enter new password" />
                    </div>
                    <div className="form-group">
                      <label>Confirm New Password</label>
                      <input type="password" placeholder="Confirm new password" />
                    </div>
                  </div>
                  <div className="form-actions">
                    <button className="btn btn-primary">Update Password</button>
                  </div>
                </div>

                {/* Account Actions */}
                <div className="settings-form-card danger-zone">
                  <h3>Danger Zone</h3>
                  <p>Irreversible account actions</p>
                  <div className="danger-actions">
                    <button className="btn btn-outline-danger">
                      Delete Account
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
export default Settings;
