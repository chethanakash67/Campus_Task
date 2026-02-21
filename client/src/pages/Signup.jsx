import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { User, Mail, Lock, Eye, EyeOff, AlertCircle, ArrowLeft } from 'lucide-react';
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
    window.location.href = API_URL.replace('/api', '') + '/api/auth/google';
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

      // Store password temporarily for verification step
      localStorage.setItem('pendingPassword', password);
      localStorage.setItem('pendingName', name);

      await axios.post(API_URL + '/auth/request-otp-register', {
        name: name,
        email: email,
        password: password
      });

      localStorage.setItem('pendingVerificationEmail', email);
      navigate('/verify-otp', { state: { email: email, fromSignup: true } });
    } catch (err) {
      console.error('Signup error:', err);
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-split-container">
        {/* Left Side - Brand & Info */}
        <div className="auth-left">
          <div className="auth-left-content">
            <h1>Join CampusTasks</h1>
            <p style={{ marginBottom: '24px' }}>
              Collaborate and manage projects effortlessly.
              Join thousands of students and educators today.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', textAlign: 'left', marginBottom: '30px' }}>
              <div>
                <h3 style={{ color: '#000000', marginBottom: '5px', fontSize: '1.1rem' }}>Organize</h3>
                <p style={{ fontSize: '0.9rem', color: '#666666' }}>Keep all your assignments in one place.</p>
              </div>
              <div>
                <h3 style={{ color: '#000000', marginBottom: '5px', fontSize: '1.1rem' }}>Collaborate</h3>
                <p style={{ fontSize: '0.9rem', color: '#666666' }}>Work together with real-time chat.</p>
              </div>
              <div>
                <h3 style={{ color: '#000000', marginBottom: '5px', fontSize: '1.1rem' }}>Track</h3>
                <p style={{ fontSize: '0.9rem', color: '#666666' }}>Visual dashboards for productivity.</p>
              </div>
              <div>
                <h3 style={{ color: '#000000', marginBottom: '5px', fontSize: '1.1rem' }}>Achieve</h3>
                <p style={{ fontSize: '0.9rem', color: '#666666' }}>Hit your deadlines with ease.</p>
              </div>
            </div>

            {/* Minimal SVG Illustration */}
            <svg
              viewBox="0 0 400 300"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              style={{ width: '100%', marginTop: '40px', opacity: 0.8 }}
            >
              <rect x="50" y="50" width="300" height="200" rx="20" fill="url(#paint0_linear)" fillOpacity="0.1" stroke="url(#paint0_linear)" strokeWidth="2" />
              <circle cx="200" cy="150" r="40" fill="#9ca3af" fillOpacity="0.45" />
              <path d="M150 150H250" stroke="#000000" strokeWidth="4" strokeLinecap="round" />
              <path d="M200 100V200" stroke="#000000" strokeWidth="4" strokeLinecap="round" />
              <defs>
                <linearGradient id="paint0_linear" x1="50" y1="50" x2="350" y2="250" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#94a3b8" />
                  <stop offset="1" stopColor="#cbd5e1" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>

        {/* Right Side - Signup Form */}
        <div className="auth-right">
          <div className="auth-form-wrapper">
            <div className="auth-header">
              <Link to="/" className="auth-logo">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
              </Link>
              <h1 className="auth-title">Create account</h1>
              <p className="auth-subtitle">Get started for free</p>
            </div>

            <form onSubmit={handleSubmit} className="auth-form">
              {error && (
                <div className="auth-alert auth-alert-error">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}

              <div className="form-group">
                <label>Full Name</label>
                <div className="input-wrapper">
                  <input
                    type="text"
                    className="auth-input"
                    placeholder="Enter your name"
                    value={name}
                    onChange={(e) => { setName(e.target.value); setError(''); }}
                    disabled={loading}
                  />
                  <User className="input-icon" size={18} />
                </div>
              </div>

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
                    placeholder="Create a password"
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
              </div>

              <div className="form-group">
                <label>Confirm Password</label>
                <div className="input-wrapper has-right-action">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    className="auth-input"
                    placeholder="Confirm password"
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                    disabled={loading}
                  />
                  <Lock className="input-icon" size={18} />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button type="submit" className="auth-btn" disabled={loading}>
                {loading ? 'Creating account...' : 'Create Account'}
              </button>
            </form>

            <div className="auth-divider">
              <span>or</span>
            </div>

            <button
              type="button"
              className="auth-google-btn"
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

            <div className="auth-footer">
              Already have an account?
              <Link to="/login" className="auth-link">Sign in</Link>
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

export default Signup;
