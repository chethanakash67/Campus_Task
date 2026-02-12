import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Lock, Eye, EyeOff, AlertCircle, ArrowLeft, CheckCircle, Users, Calendar, Clock } from 'lucide-react';
import '../styles/auth.css';

function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [resendLoading, setResendLoading] = useState(false);
  const inputRefs = useRef([]);

  const email = location.state?.email || localStorage.getItem('resetEmail') || '';
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

  useEffect(() => {
    if (!email) {
      navigate('/forgot-password');
    }
  }, [email, navigate]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    setError('');

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pastedData.length === 6) {
      const newOtp = pastedData.split('');
      setOtp(newOtp);
      inputRefs.current[5]?.focus();
    }
  };

  const getPasswordStrength = () => {
    if (!password) return null;
    if (password.length < 6) return 'weak';
    if (password.length < 10 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) return 'medium';
    return 'strong';
  };

  const passwordStrength = getPasswordStrength();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const otpValue = otp.join('');
    
    if (otpValue.length !== 6) {
      setError('Please enter the complete 6-digit code');
      return;
    }

    if (!password || !confirmPassword) {
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
      setError('');
      
      await axios.post(API_URL + '/auth/reset-password', {
        email: email,
        otp: otpValue,
        newPassword: password
      });

      setSuccess('Password reset successful!');
      localStorage.removeItem('resetEmail');
      
      setTimeout(() => {
        navigate('/login', { state: { passwordReset: true } });
      }, 1500);
    } catch (err) {
      console.error('Reset password error:', err);
      setError(err.response?.data?.error || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (countdown > 0) return;
    
    try {
      setResendLoading(true);
      setError('');
      
      await axios.post(API_URL + '/auth/forgot-password', { email: email });
      
      setSuccess('New OTP sent to your email');
      setCountdown(60);
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Resend error:', err);
      setError(err.response?.data?.error || 'Failed to resend OTP');
    } finally {
      setResendLoading(false);
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
        <Link to="/forgot-password" className="auth-back">
          <ArrowLeft className="auth-back-icon" size={18} />
          Back
        </Link>

        <div className="auth-form-container">
          <div className="auth-mobile-logo">
            <div className="auth-mobile-logo-icon">C</div>
            <span className="auth-mobile-logo-text">
              CampusTasks<span className="auth-mobile-logo-dot">.</span>
            </span>
          </div>

          <div className="auth-header">
            <h1 className="auth-title">Reset password</h1>
            <p className="auth-subtitle">
              Enter the code sent to <strong>{email}</strong> and create a new password.
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
              <label className="auth-label">Verification Code</label>
              <div className="auth-otp-container" onPaste={handlePaste}>
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => (inputRefs.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    className={'auth-otp-input' + (digit ? ' filled' : '')}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    disabled={loading}
                  />
                ))}
              </div>
            </div>

            <div className="auth-field">
              <label className="auth-label">New Password</label>
              <div className="auth-input-icon-wrapper auth-password-wrapper">
                <Lock className="auth-input-icon" size={18} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="auth-input"
                  placeholder="Enter new password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  disabled={loading}
                  autoComplete="new-password"
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
              {passwordStrength && (
                <div className="auth-password-strength">
                  <div className="auth-password-strength-bar">
                    <div className={'auth-password-strength-fill ' + passwordStrength}></div>
                  </div>
                  <span className={'auth-password-strength-text ' + passwordStrength}>
                    {passwordStrength === 'weak' && 'Weak password'}
                    {passwordStrength === 'medium' && 'Medium password'}
                    {passwordStrength === 'strong' && 'Strong password'}
                  </span>
                </div>
              )}
            </div>

            <div className="auth-field">
              <label className="auth-label">Confirm Password</label>
              <div className="auth-input-icon-wrapper auth-password-wrapper">
                <Lock className="auth-input-icon" size={18} />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  className="auth-input"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                  disabled={loading}
                  autoComplete="new-password"
                  style={{ paddingRight: '48px' }}
                />
                <button
                  type="button"
                  className="auth-password-toggle"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              className={'auth-btn auth-btn-primary auth-btn-full' + (loading ? ' auth-btn-loading' : '')}
              disabled={loading}
            >
              {loading ? '' : 'Reset Password'}
            </button>
          </form>

          <div className="auth-resend">
            {countdown > 0 ? (
              <div className="auth-timer">
                <Clock size={16} />
                <span>Resend code in {countdown}s</span>
              </div>
            ) : (
              <p className="auth-resend-text">
                Did not receive the code?{' '}
                <button 
                  className="auth-resend-btn" 
                  onClick={handleResendOTP}
                  disabled={resendLoading}
                >
                  {resendLoading ? 'Sending...' : 'Resend'}
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ResetPassword;
