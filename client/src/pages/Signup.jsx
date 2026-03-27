import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { MdVisibility, MdVisibilityOff } from 'react-icons/md';
import '../styles/auth.css';

function Signup() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

  const handleGoogleSignup = () => {
    window.location.href = `${API_URL.replace('/api', '')}/api/auth/google`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name || !email || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      setLoading(true);

      localStorage.setItem('pendingPassword', password);
      localStorage.setItem('pendingName', name);

      await axios.post(`${API_URL}/auth/request-otp-register`, {
        name,
        email,
        password,
      });

      localStorage.setItem('pendingVerificationEmail', email);
      navigate('/verify-otp', { state: { email, fromSignup: true } });
    } catch (err) {
      console.error('Signup error:', err);
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-layout">
        <section className="auth-hero-panel">
          <div className="auth-hero-copy">
            <Link to="/" className="auth-hero-back">
              <ArrowLeft size={16} />
              Back
            </Link>
            <Link to="/" className="auth-brand">
              Campus Tasks
            </Link>
            <div className="auth-hero-text">
              <h1>Manage Tasks.</h1>
              <h1>Ace Your Semester.</h1>
            </div>
            <p>
              The modern task management platform built for students and teams.
              Organize assignments, track deadlines, and collaborate seamlessly.
            </p>
          </div>
        </section>

        <section className="auth-form-panel">
          <div className="auth-form-shell">
            <header className="auth-header auth-header-compact">
              <h2 className="auth-title">Create Account</h2>
              <p className="auth-subtitle">Sign up to start organizing your semester</p>
            </header>

            <button
              type="button"
              className="auth-google-btn auth-google-btn-muted"
              onClick={handleGoogleSignup}
              disabled={loading}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.38-1.04 2.55-2.22 3.34v2.77h3.6c2.1-1.94 3.3-4.8 3.3-8.12z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.64l-3.6-2.77c-.99.66-2.26 1.06-3.68 1.06-2.83 0-5.22-1.91-6.08-4.47H2.2v2.84C4.01 20.62 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.92 14.18A6.98 6.98 0 0 1 5.58 12c0-.76.14-1.5.34-2.18V6.98H2.2A10.99 10.99 0 0 0 1 12c0 1.77.42 3.45 1.2 5.02l3.72-2.84z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.35c1.62 0 3.06.56 4.2 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 4.01 3.38 2.2 6.98l3.72 2.84c.86-2.56 3.25-4.47 6.08-4.47z"
                  fill="#EA4335"
                />
              </svg>
              Continue with Google
            </button>

            <div className="auth-divider auth-divider-minimal">
              <span>or</span>
            </div>

            <form onSubmit={handleSubmit} className="auth-form auth-form-minimal">
              {error && (
                <div className="auth-alert auth-alert-error">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}

              <label className="auth-field">
                <span className="auth-label">Full Name</span>
                <input
                  type="text"
                  className="auth-input auth-input-minimal"
                  placeholder="Enter your Full name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setError('');
                  }}
                  disabled={loading}
                />
              </label>

              <label className="auth-field">
                <span className="auth-label">Email</span>
                <input
                  type="email"
                  className="auth-input auth-input-minimal"
                  placeholder="Enter your Email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError('');
                  }}
                  disabled={loading}
                />
              </label>

              <label className="auth-field">
                <span className="auth-label">Password</span>
                <div className="auth-password-wrapper">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="auth-input auth-input-minimal"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError('');
                    }}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="auth-password-toggle"
                    onClick={() => setShowPassword((current) => !current)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <MdVisibilityOff size={18} /> : <MdVisibility size={18} />}
                  </button>
                </div>
              </label>

              <label className="auth-field">
                <span className="auth-label">Confirm Password</span>
                <div className="auth-password-wrapper">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    className="auth-input auth-input-minimal"
                    placeholder="Confirm your Password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setError('');
                    }}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="auth-password-toggle"
                    onClick={() => setShowConfirmPassword((current) => !current)}
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  >
                    {showConfirmPassword ? <MdVisibilityOff size={18} /> : <MdVisibility size={18} />}
                  </button>
                </div>
              </label>

              <button type="submit" className="auth-btn auth-btn-minimal" disabled={loading}>
                {loading ? 'Creating Account...' : 'Continue'}
              </button>
            </form>

            <p className="auth-footer auth-footer-inline">
              Already have an account? <Link to="/login" className="auth-link">Sign In</Link>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

export default Signup;
