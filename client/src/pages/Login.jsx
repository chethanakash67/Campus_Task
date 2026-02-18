import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import axios from 'axios';
import { Mail, Lock, Eye, EyeOff, AlertCircle, ArrowLeft } from 'lucide-react';
import '../styles/auth.css';

function Login() {
  const navigate = useNavigate();
  const { login } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

  useEffect(() => {
    const invitationEmail = localStorage.getItem('invitationEmail');
    if (invitationEmail) {
      setEmail(invitationEmail);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    try {
      setLoading(true);

      const response = await axios.post(API_URL + '/auth/login', {
        email: email,
        password: password
      });

      localStorage.setItem('campusToken', response.data.token);
      localStorage.setItem('campusUser', JSON.stringify(response.data.user));
      login(response.data.user, response.data.token);

      const pendingInvitation = localStorage.getItem('pendingInvitation');
      if (pendingInvitation) {
        try {
          const inviteResponse = await axios.post(
            API_URL + '/teams/accept-invitation',
            { token: pendingInvitation, userId: response.data.user.id },
            { headers: { Authorization: 'Bearer ' + response.data.token } }
          );

          localStorage.removeItem('pendingInvitation');
          localStorage.removeItem('invitationEmail');
          alert(inviteResponse.data.message);
          navigate('/teams', { replace: true });
        } catch (inviteError) {
          console.error('Error accepting invitation:', inviteError);
          localStorage.removeItem('pendingInvitation');
          localStorage.removeItem('invitationEmail');
          navigate('/dashboard', { replace: true });
        }
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err.response?.data?.error || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = API_URL.replace('/api', '') + '/api/auth/google';
  };

  return (
    <div className="auth-page">
      <div className="auth-split-container">
        {/* Left Side - Brand & Info */}
        <div className="auth-left">
          <div className="auth-left-content">
            <h1>CampusTasks</h1>
            <p style={{ marginBottom: '24px' }}>
              Your all-in-one platform for managing academic projects,
              coordinating with teams, and staying top of your assignments.
            </p>

            <ul style={{ listStyle: 'none', padding: 0, textAlign: 'left', display: 'inline-block' }}>
              <li style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ background: 'rgba(17, 24, 39, 0.1)', padding: '5px', borderRadius: '50%' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
                </div>
                Manage Tasks & Deadlines
              </li>
              <li style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ background: 'rgba(17, 24, 39, 0.1)', padding: '5px', borderRadius: '50%' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
                </div>
                Collaborate with Teams
              </li>
              <li style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ background: 'rgba(17, 24, 39, 0.1)', padding: '5px', borderRadius: '50%' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
                </div>
                Track Progress Visualizations
              </li>
            </ul>

            {/* Minimal SVG Illustration */}
            <svg
              viewBox="0 0 400 300"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              style={{ width: '100%', marginTop: '40px', opacity: 0.8 }}
            >
              <rect x="50" y="50" width="300" height="200" rx="20" fill="url(#paint0_linear)" fillOpacity="0.1" stroke="url(#paint0_linear)" strokeWidth="2" />
              <circle cx="350" cy="50" r="20" fill="#000000" fillOpacity="0.1" />
              <circle cx="50" cy="250" r="30" fill="#000000" fillOpacity="0.1" />
              <path d="M100 120H300" stroke="rgba(0,0,0,0.2)" strokeWidth="10" strokeLinecap="round" />
              <path d="M100 160H250" stroke="rgba(0,0,0,0.2)" strokeWidth="10" strokeLinecap="round" />
              <path d="M100 200H200" stroke="rgba(0,0,0,0.2)" strokeWidth="10" strokeLinecap="round" />
              <defs>
                <linearGradient id="paint0_linear" x1="50" y1="50" x2="350" y2="250" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#94a3b8" />
                  <stop offset="1" stopColor="#cbd5e1" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="auth-right">
          <div className="auth-form-wrapper">
            <div className="auth-header">
              <Link to="/" className="auth-logo">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
              </Link>
              <h1 className="auth-title">Welcome back</h1>
              <p className="auth-subtitle">
                {localStorage.getItem('pendingInvitation')
                  ? 'Sign in to accept your invitation'
                  : 'Sign in to access your workspace'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="auth-form">
              {error && (
                <div className="auth-alert auth-alert-error">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}

              <div className="form-group">
                <label>Email</label>
                <div className="input-wrapper">
                  <input
                    type="email"
                    className="auth-input"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(''); }}
                    disabled={loading}
                  />
                  <Mail className="input-icon" size={18} />
                </div>
              </div>

              <div className="form-group">
                <label>Password</label>
                <div className="input-wrapper has-right-action">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="auth-input"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(''); }}
                    disabled={loading}
                  />
                  <Lock className="input-icon" size={18} />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <Link to="/forgot-password" className="forgot-password-link">Forgot password?</Link>
              </div>

              <button type="submit" className="auth-btn" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            <div className="auth-footer">
              Don't have an account?
              <Link to="/signup" className="auth-link">Create one</Link>
            </div>

            <div className="auth-back-row">
              <Link to="/" className="auth-secondary-link">
                <ArrowLeft size={14} /> Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
