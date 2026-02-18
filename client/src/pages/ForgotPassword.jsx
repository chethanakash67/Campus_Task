import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Mail, AlertCircle, CheckCircle } from 'lucide-react';
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
      <div className="auth-card">
        <div className="auth-header">
          <Link to="/" className="auth-logo">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          </Link>
          <h1 className="auth-title">Forgot password?</h1>
          <p className="auth-subtitle">
            No worries, we will send you reset instructions.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && (
            <div className="auth-alert auth-alert-error">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {success && (
            <div className="auth-alert auth-alert-success">
              <CheckCircle size={16} />
              {success}
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

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        <div className="auth-back-row">
          <p className="auth-meta-text">
            Remember your password?
          </p>
          <Link to="/login" className="auth-inline-action">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;
