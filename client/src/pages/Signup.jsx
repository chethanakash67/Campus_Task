// client/src/pages/Signup.jsx - WITH OTP VERIFICATION
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Signup.css';

function Signup() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: Form, 2: OTP Verification
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(600); // 10 minutes in seconds
  const [timerActive, setTimerActive] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

  // Countdown timer
  useEffect(() => {
    if (timerActive && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      setError('OTP has expired. Please request a new one.');
      setTimerActive(false);
    }
  }, [countdown, timerActive]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleOtpChange = (element, index) => {
    if (isNaN(element.value)) return false;

    setOtp([...otp.map((d, idx) => (idx === index ? element.value : d))]);

    // Focus next input
    if (element.value !== '' && element.nextSibling) {
      element.nextSibling.focus();
    }
  };

  const handleOtpKeyDown = (e, index) => {
    if (e.key === 'Backspace' && !otp[index] && e.target.previousSibling) {
      e.target.previousSibling.focus();
    }
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    // Validation
    if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post(`${API_URL}/auth/request-otp-register`, {
        name: formData.name,
        email: formData.email,
        password: formData.password
      });

      if (response.data.devMode) {
        setMessage(`OTP sent! (Dev Mode: ${response.data.otp})`);
      } else {
        setMessage('OTP sent to your email! Please check your inbox.');
      }

      setStep(2);
      setCountdown(600);
      setTimerActive(true);
    } catch (err) {
      console.error('Registration error:', err);
      setError(err.response?.data?.error || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    const otpValue = otp.join('');
    if (otpValue.length !== 6) {
      setError('Please enter the complete 6-digit OTP');
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post(`${API_URL}/auth/verify-register`, {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        otp: otpValue
      });

      // Store token and user
      localStorage.setItem('campusToken', response.data.token);
      localStorage.setItem('campusUser', JSON.stringify(response.data.user));

      setMessage('Registration successful! Redirecting...');
      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 1000);
    } catch (err) {
      console.error('OTP verification error:', err);
      setError(err.response?.data?.error || 'Invalid OTP. Please try again.');
      setOtp(['', '', '', '', '', '']);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    try {
      setResending(true);
      setError('');
      setMessage('');

      const response = await axios.post(`${API_URL}/auth/resend-otp`, {
        email: formData.email,
        purpose: 'register'
      });

      if (response.data.devMode) {
        setMessage(`New OTP sent! (Dev Mode: ${response.data.otp})`);
      } else {
        setMessage('New OTP sent to your email!');
      }

      setOtp(['', '', '', '', '', '']);
      setCountdown(600);
      setTimerActive(true);
    } catch (err) {
      setError('Failed to resend OTP. Please try again.');
    } finally {
      setResending(false);
    }
  };

  const handleGoogleSignup = () => {
    window.location.href = `${API_URL}/auth/google`;
  };

  if (step === 2) {
    return (
      <div className="auth-container">
        <div className="background-grid"></div>
        <div className="auth-box">
          <h2>Verify Your Email</h2>
          <p className="auth-subtitle">
            We've sent a 6-digit code to <strong>{formData.email}</strong>
          </p>

          <div className="otp-info-box">
            <span className="otp-icon">📧</span>
            <p>Enter the verification code from your email</p>
          </div>

          {timerActive && countdown > 0 && (
            <div className="countdown-timer">
              OTP expires in: <strong>{formatTime(countdown)}</strong>
            </div>
          )}

          <form onSubmit={handleVerifyOtp}>
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

            {message && (
              <div className="success-message" style={{
                color: '#00aa00',
                padding: '10px',
                marginBottom: '15px',
                backgroundColor: '#e6ffe6',
                borderRadius: '4px',
                fontSize: '0.9rem'
              }}>
                {message}
              </div>
            )}

            <div style={{
              display: 'flex',
              gap: '10px',
              justifyContent: 'center',
              marginBottom: '20px'
            }}>
              {otp.map((data, index) => (
                <input
                  key={index}
                  type="text"
                  maxLength="1"
                  value={data}
                  onChange={(e) => handleOtpChange(e.target, index)}
                  onKeyDown={(e) => handleOtpKeyDown(e, index)}
                  onFocus={(e) => e.target.select()}
                  disabled={loading}
                  style={{
                    width: '50px',
                    height: '60px',
                    fontSize: '24px',
                    textAlign: 'center',
                    border: '2px solid #ddd',
                    borderRadius: '8px',
                    outline: 'none',
                    backgroundColor: '#2a2a2a',
                    color: 'white'
                  }}
                />
              ))}
            </div>

            <button
              type="submit"
              className="btn btn-full"
              disabled={loading || otp.join('').length !== 6}
            >
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>
          </form>

          <div className="resend-section">
            <p>Didn't receive the code?</p>
            <button
              onClick={handleResendOtp}
              disabled={resending || countdown > 540}
              className="btn-link"
            >
              {resending ? 'Resending...' : 'Resend OTP'}
            </button>
          </div>

          <button
            onClick={() => {
              setStep(1);
              setOtp(['', '', '', '', '', '']);
              setError('');
              setMessage('');
              setTimerActive(false);
            }}
            className="btn btn-secondary"
            style={{ width: '100%', marginTop: '10px' }}
          >
            ← Back to Signup
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="background-grid"></div>
      <div className="auth-box">
        <div className="back-link-container">
          <Link to="/" className="back-link">← Back to Home</Link>
        </div>

        <h2>Create Account</h2>
        <p className="auth-subtitle">Join CampusTasks today</p>

        <button className="btn-google" onClick={handleGoogleSignup} type="button">
          <img
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
            alt="Google"
            className="google-icon"
          />
          Sign up with Google
        </button>

        <div className="divider">
          <span>OR</span>
        </div>

        <form onSubmit={handleSubmitForm}>
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
            <label>Full Name</label>
            <input
              type="text"
              name="name"
              placeholder="John Doe"
              value={formData.name}
              onChange={handleChange}
              disabled={loading}
              required
            />
          </div>

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
              minLength={6}
            />
          </div>

          <div className="input-group">
            <label>Confirm Password</label>
            <input
              type="password"
              name="confirmPassword"
              placeholder="••••••••"
              value={formData.confirmPassword}
              onChange={handleChange}
              disabled={loading}
              required
              minLength={6}
            />
          </div>

          <button type="submit" className="btn btn-full" disabled={loading}>
            {loading ? 'Creating Account...' : 'Continue to Verification'}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}

export default Signup;