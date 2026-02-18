import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { AlertCircle, ArrowLeft, CheckCircle, Clock } from 'lucide-react';
import '../styles/auth.css';

function VerifyOTP() {
  const navigate = useNavigate();
  const location = useLocation();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const inputRefs = useRef([]);

  const email = location.state?.email || localStorage.getItem('pendingVerificationEmail') || '';
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

  useEffect(() => {
    if (!email) {
      navigate('/signup');
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

  const handleChange = (index, value) => {
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    const otpValue = otp.join('');

    if (otpValue.length !== 6) {
      setError('Please enter the complete 6-digit code');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Get stored password and name from signup
      const pendingPassword = localStorage.getItem('pendingPassword');
      const pendingName = localStorage.getItem('pendingName');

      await axios.post(API_URL + '/auth/verify-register', {
        email: email,
        otp: otpValue,
        name: pendingName,
        password: pendingPassword
      });

      setSuccess('Email verified successfully!');
      localStorage.removeItem('pendingVerificationEmail');
      localStorage.removeItem('pendingPassword');
      localStorage.removeItem('pendingName');

      setTimeout(() => {
        navigate('/login', { state: { verified: true } });
      }, 1500);
    } catch (err) {
      console.error('Verification error:', err);
      setError(err.response?.data?.error || 'Invalid OTP. Please try again.');
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (countdown > 0) return;

    try {
      setResendLoading(true);
      setError('');

      await axios.post(API_URL + '/auth/resend-otp', { email: email });

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
      <div className="auth-split-container">
        {/* Left Side - Security Info */}
        <div className="auth-left">
          <div className="auth-left-content">
            <h1>Secure Your Account</h1>
            <p>
              We take security seriously. Verifying your email ensures
              your account remains protected and recoverable.
            </p>
            {/* Security SVG Illustration */}
            <svg
              viewBox="0 0 400 300"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              style={{ width: '100%', marginTop: '40px', opacity: 0.8 }}
            >
              <rect x="50" y="50" width="300" height="200" rx="20" fill="url(#paint0_linear)" fillOpacity="0.1" stroke="url(#paint0_linear)" strokeWidth="2" />
              <circle cx="200" cy="150" r="50" stroke="#111827" strokeWidth="4" />
              <path d="M180 150L195 165L220 135" stroke="#6b7280" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
              <defs>
                <linearGradient id="paint0_linear" x1="50" y1="50" x2="350" y2="250" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#111827" />
                  <stop offset="1" stopColor="#9ca3af" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>

        {/* Right Side - OTP Form */}
        <div className="auth-right">
          <div className="auth-form-wrapper">
            <div className="auth-header">
              <Link to="/" className="auth-logo">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
              </Link>
              <h1 className="auth-title">Verify your email</h1>
              <p className="auth-subtitle">
                We sent a 6-digit code to <strong>{email}</strong>
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

              <div className="otp-inputs" onPaste={handlePaste}>
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => (inputRefs.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    className="otp-input"
                    value={digit}
                    onChange={(e) => handleChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    disabled={loading}
                  />
                ))}
              </div>

              <button
                type="submit"
                className="auth-btn"
                disabled={loading || otp.join('').length !== 6}
              >
                {loading ? 'Verifying...' : 'Verify Email'}
              </button>
            </form>

            <div className="auth-meta-row">
              {countdown > 0 ? (
                <div className="auth-countdown">
                  <Clock size={16} />
                  <span>Resend code in {countdown}s</span>
                </div>
              ) : (
                <p>
                  Did not receive the code?{' '}
                  <button
                    onClick={handleResendOTP}
                    disabled={resendLoading}
                    className="auth-inline-action"
                  >
                    {resendLoading ? 'Sending...' : 'Resend'}
                  </button>
                </p>
              )}
            </div>

            <div className="auth-back-row">
              <Link to="/signup" className="auth-secondary-link">
                <ArrowLeft size={14} /> Back to Sign Up
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default VerifyOTP;
