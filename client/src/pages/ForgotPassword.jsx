import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Mail, AlertCircle, ArrowLeft, CheckCircle, Users, Calendar } from 'lucide-react';
import '../styles/auth.css';

function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email) {
      setError('Please enter your email address');
      return;
    }

    try {
      setLoading(true);
      
      await axios.post(API_URL + '/auth/forgot-password', { email: email });
      
      setSuccess('Password reset link sent! Check your email.');
      localStorage.setItem('resetEmail', email);
      
      setTimeout(() => {
        navigate('/reset-password', { state: { email: email } });
      }, 2000);
    } catch (err) {
      console.error('Forgot password error:', err);
      setError(err.response?.data?.error || 'Failed to send reset link. Please try again.');
    } finally {
      setLoading(false);
    }
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
        <Link to="/login" className="auth-back">
          <ArrowLeft className="auth-back-icon" size={18} />
          Back to Sign In
        </Link>

        <div className="auth-form-container">
          <div className="auth-mobile-logo">
            <div className="auth-mobile-logo-icon">C</div>
            <span className="auth-mobile-logo-text">
              CampusTasks<span className="auth-mobile-logo-dot">.</span>
            </span>
          </div>

          <div className="auth-header">
            <h1 className="auth-title">Forgot password?</h1>
            <p className="auth-subtitle">
              No worries, we will send you reset instructions.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            {error && (
              <div className="auth-message auth-message-error">
                <AlertCircle className="auth-message-icon" size={18} />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="auth-message auth-message-success">
                <CheckCircle className="auth-message-icon" size={18} />
                <span>{success}</span>
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

            <button 
              type="submit" 
              className={'auth-btn auth-btn-primary auth-btn-full' + (loading ? ' auth-btn-loading' : '')}
              disabled={loading}
            >
              {loading ? '' : 'Send Reset Link'}
            </button>
          </form>

          <p className="auth-footer">
            Remember your password?{' '}
            <Link to="/login" className="auth-footer-link">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;
