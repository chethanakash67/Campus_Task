// client/src/pages/Login.jsx - FIXED VERSION
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import axios from 'axios';
import './Login.css';

function Login() {
  const navigate = useNavigate();
  const { login } = useApp();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

  // Pre-fill email if coming from invitation
  useEffect(() => {
    const invitationEmail = localStorage.getItem('invitationEmail');
    if (invitationEmail) {
      setFormData(prev => ({ ...prev, email: invitationEmail }));
    }
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.email || !formData.password) {
      setError('Please fill in all fields');
      return;
    }

    try {
      setLoading(true);
      
      // Direct login without OTP
      const response = await axios.post(`${API_URL}/auth/login`, {
        email: formData.email,
        password: formData.password
      });

      // Store token and user data immediately
      localStorage.setItem('campusToken', response.data.token);
      localStorage.setItem('campusUser', JSON.stringify(response.data.user));

      // Update context state
      login(response.data.user, response.data.token);

      // Check for pending invitation
      const pendingInvitation = localStorage.getItem('pendingInvitation');
      if (pendingInvitation) {
        try {
          // Accept the invitation
          const inviteResponse = await axios.post(`${API_URL}/teams/accept-invitation`, 
            { token: pendingInvitation, userId: response.data.user.id },
            { headers: { Authorization: `Bearer ${response.data.token}` }}
          );
          
          // Clear pending invitation
          localStorage.removeItem('pendingInvitation');
          localStorage.removeItem('invitationEmail');
          
          // Show appropriate message
          if (inviteResponse.data.alreadyMember) {
            alert('ℹ️ ' + inviteResponse.data.message);
          } else {
            alert('✅ ' + inviteResponse.data.message);
          }
          
          navigate('/teams', { replace: true });
        } catch (inviteError) {
          console.error('Error accepting invitation:', inviteError);
          const errorMsg = inviteError.response?.data?.error || 'Failed to accept invitation';
          // If email mismatch, clear invitation and go to dashboard
          if (errorMsg.includes('different email')) {
            localStorage.removeItem('pendingInvitation');
            localStorage.removeItem('invitationEmail');
            alert('⚠️ ' + errorMsg + '\n\nYou can accept the invitation with the correct email account.');
            navigate('/dashboard', { replace: true });
          } else {
            // Other errors - still clear and go to dashboard
            localStorage.removeItem('pendingInvitation');
            localStorage.removeItem('invitationEmail');
            navigate('/dashboard', { replace: true });
          }
        }
      } else {
        // No pending invitation - navigate to dashboard
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
    window.location.href = `${API_URL.replace('/api', '')}/api/auth/google`;
  };

  return (
    <div className="auth-container">
      <div className="background-grid"></div>
      <div className="auth-box">
        <div className="back-link-container">
          <Link to="/" className="back-link">← Back to Home</Link>
        </div>

        <h2>Welcome Back</h2>
        {localStorage.getItem('pendingInvitation') ? (
          <p className="auth-subtitle" style={{ color: '#646cff' }}>
            ✨ Sign in to accept the team invitation
          </p>
        ) : (
          <p className="auth-subtitle">Sign in to your account</p>
        )}

        <button className="btn-google" onClick={handleGoogleLogin} type="button">
          <img 
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
            alt="Google" 
            className="google-icon"
          />
          Continue with Google
        </button>

        <div className="divider">
          <span>OR</span>
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <div className="error-message" style={{ 
              color: '#ff4444', 
              padding: '10px', 
              marginBottom: '15px', 
              backgroundColor: '#ffe6e6', 
              borderRadius: '4px',
              fontSize: '0.9rem'
            }}>
              {error}
            </div>
          )}

          <div className="input-group">
            <label>Email</label>
            <input 
              type="email" 
              name="email"
              placeholder="you@example.com" 
              value={formData.email}
              onChange={handleChange}
              disabled={loading}
              required
            />
          </div>

          <div className="input-group">
            <label>Password</label>
            <input 
              type="password" 
              name="password"
              placeholder="••••••••" 
              value={formData.password}
              onChange={handleChange}
              disabled={loading}
              required
            />
          </div>

          <div style={{ textAlign: 'right', marginBottom: '15px' }}>
            <Link to="/forgot-password" style={{ color: '#646cff', fontSize: '0.9rem' }}>
              Forgot Password?
            </Link>
          </div>

          <button type="submit" className="btn btn-full" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="auth-switch">
          Don't have an account? <Link to="/signup">Sign up</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;