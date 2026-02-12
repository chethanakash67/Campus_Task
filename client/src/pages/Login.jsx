import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import axios from 'axios';
import { Mail, Lock, Eye, EyeOff, AlertCircle, ArrowLeft, CheckCircle, Users, Calendar } from 'lucide-react';
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
      <div className="auth-branding">
        <div className="auth-branding-content">
          <div className="auth-branding-logo">
            <div className="auth-branding-logo-icon">C</div>
            <span className="auth-branding-logo-text">
              CampusTasks<span className="auth-branding-logo-dot">.</span>
            </span>
          </div>
          
          <h1 className="auth-branding-tagline">
            Manage Tasks.<br />
            <span>Ace Your Semester.</span>
          </h1>
          
          <p className="auth-branding-description">
            The modern task management platform built for students and teams. 
            Organize assignments, track deadlines, and collaborate seamlessly.
          </p>
          
          <div className="auth-branding-features">
            <div className="auth-branding-feature">
              <div className="auth-branding-feature-icon">
                <CheckCircle size={22} />
              </div>
              <div className="auth-branding-feature-text">
                <div className="auth-branding-feature-title">Smart Task Management</div>
                <div className="auth-branding-feature-desc">Organize tasks with priorities and deadlines</div>
              </div>
            </div>
            
            <div className="auth-branding-feature">
              <div className="auth-branding-feature-icon">
                <Users size={22} />
              </div>
              <div className="auth-branding-feature-text">
                <div className="auth-branding-feature-title">Team Collaboration</div>
                <div className="auth-branding-feature-desc">Work together with classmates and groups</div>
              </div>
            </div>
            
            <div className="auth-branding-feature">
              <div className="auth-branding-feature-icon">
                <Calendar size={22} />
              </div>
              <div className="auth-branding-feature-text">
                <div className="auth-branding-feature-title">Deadline Tracking</div>
                <div className="auth-branding-feature-desc">Never miss an assignment deadline again</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="auth-form-side">
        <Link to="/" className="auth-back">
          <ArrowLeft className="auth-back-icon" size={18} />
          Back to Home
        </Link>

        <div className="auth-form-container">
          <div className="auth-mobile-logo">
            <div className="auth-mobile-logo-icon">C</div>
            <span className="auth-mobile-logo-text">
              CampusTasks<span className="auth-mobile-logo-dot">.</span>
            </span>
          </div>

          <div className="auth-header">
            <h1 className="auth-title">Welcome back</h1>
            {localStorage.getItem('pendingInvitation') ? (
              <p className="auth-subtitle" style={{ color: '#6366f1' }}>
                Sign in to accept the team invitation
              </p>
            ) : (
              <p className="auth-subtitle">Sign in to your account to continue</p>
            )}
          </div>

          <div className="auth-social">
            <button className="auth-social-btn" onClick={handleGoogleLogin} type="button">
              <img 
                src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
                alt="Google" 
                className="auth-social-icon"
              />
              Continue with Google
            </button>
          </div>

          <div className="auth-divider">
            <span className="auth-divider-line"></span>
            <span className="auth-divider-text">or</span>
            <span className="auth-divider-line"></span>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            {error && (
              <div className="auth-message auth-message-error">
                <AlertCircle className="auth-message-icon" size={18} />
                <span>{error}</span>
              </div>
            )}

            <div className="auth-field">
              <label className="auth-label">Email</label>
              <div className="auth-input-icon-wrapper">
                <Mail className="auth-input-icon" size={18} />
                <input
                  type="email"
                  className="auth-input"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  disabled={loading}
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="auth-field">
              <label className="auth-label">Password</label>
              <div className="auth-input-icon-wrapper auth-password-wrapper">
                <Lock className="auth-input-icon" size={18} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="auth-input"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  disabled={loading}
                  autoComplete="current-password"
                  style={{ paddingRight: '48px' }}
                />
                <button
                  type="button"
                  className="auth-password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <Link to="/forgot-password" className="auth-forgot-link">
              Forgot password?
            </Link>

            <button 
              type="submit" 
              className={'auth-btn auth-btn-primary auth-btn-full' + (loading ? ' auth-btn-loading' : '')}
              disabled={loading}
            >
              {loading ? '' : 'Sign In'}
            </button>
          </form>

          <p className="auth-footer">
            Do not have an account?{' '}
            <Link to="/signup" className="auth-footer-link">Create one</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
