// client/src/pages/Signup.jsx - WITH OTP VERIFICATION
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import './Signup.css';

function Signup() {
    const navigate = useNavigate();
    const { addToast } = useApp();
    
    const [step, setStep] = useState(1); // 1 = Enter details, 2 = Verify OTP
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const [countdown, setCountdown] = useState(0);

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

    // Step 1: Request OTP
    const handleRequestOTP = async (e) => {
        e.preventDefault();
        
        if (!name || !email || !password) {
            addToast('Please fill all fields', 'error');
            return;
        }

        if (password.length < 6) {
            addToast('Password must be at least 6 characters', 'error');
            return;
        }

        try {
            setLoading(true);
            const response = await fetch(`${API_URL}/auth/request-otp-register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to send OTP');
            }

            addToast('OTP sent to your email!', 'success');
            setStep(2);
            setCountdown(600); // 10 minutes countdown
            startCountdown();
        } catch (error) {
            addToast(error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    // Step 2: Verify OTP and Register
    const handleVerifyOTP = async (e) => {
        e.preventDefault();

        if (!otp || otp.length !== 6) {
            addToast('Please enter 6-digit OTP', 'error');
            return;
        }

        try {
            setLoading(true);
            const response = await fetch(`${API_URL}/auth/verify-register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password, otp })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Invalid OTP');
            }

            // Store user and token
            localStorage.setItem('campusUser', JSON.stringify(data.user));
            localStorage.setItem('campusToken', data.token);

            addToast('Registration successful!', 'success');
            navigate('/dashboard');
        } catch (error) {
            addToast(error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    // Resend OTP
    const handleResendOTP = async () => {
        if (countdown > 0) return;

        try {
            setLoading(true);
            const response = await fetch(`${API_URL}/auth/resend-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, purpose: 'register' })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to resend OTP');
            }

            addToast('New OTP sent!', 'success');
            setCountdown(600);
            startCountdown();
        } catch (error) {
            addToast(error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    // Countdown timer
    const startCountdown = () => {
        const timer = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="auth-container">
            <div className="auth-box">
                <div className="back-link-container">
                    <Link to="/" className="back-link">← Back</Link>
                </div>

                {step === 1 ? (
                    <>
                        <h2>Create Account</h2>
                        <p className="auth-subtitle">Join your team on CampusTasks</p>

                        <button className="btn-google">
                            <img 
                                src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" 
                                alt="Google" 
                                className="google-icon"
                            />
                            Sign up with Google
                        </button>

                        <div className="divider">
                            <span>OR</span>
                        </div>

                        <form onSubmit={handleRequestOTP}>
                            <div className="input-group">
                                <label>Full Name</label>
                                <input 
                                    type="text" 
                                    placeholder="John Doe" 
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="input-group">
                                <label>Email Address</label>
                                <input 
                                    type="email" 
                                    placeholder="john@example.com" 
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="input-group">
                                <label>Password</label>
                                <input 
                                    type="password" 
                                    placeholder="Min. 6 characters" 
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    minLength={6}
                                />
                            </div>
                            <button 
                                type="submit" 
                                className="btn btn-full"
                                disabled={loading}
                            >
                                {loading ? 'Sending OTP...' : 'Continue'}
                            </button>
                        </form>

                        <p className="auth-switch">
                            Already have an account? <Link to="/login">Login here</Link>
                        </p>
                    </>
                ) : (
                    <>
                        <h2>Verify Your Email</h2>
                        <p className="auth-subtitle">
                            We sent a 6-digit code to <strong>{email}</strong>
                        </p>

                        <div className="otp-info-box">
                            <span className="otp-icon">📧</span>
                            <p>Check your inbox (and spam folder)</p>
                        </div>

                        <form onSubmit={handleVerifyOTP}>
                            <div className="input-group">
                                <label>Enter OTP Code</label>
                                <input 
                                    type="text" 
                                    placeholder="000000" 
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    required
                                    maxLength={6}
                                    className="otp-input"
                                    autoFocus
                                />
                            </div>

                            {countdown > 0 && (
                                <div className="countdown-timer">
                                    Code expires in: <strong>{formatTime(countdown)}</strong>
                                </div>
                            )}

                            <button 
                                type="submit" 
                                className="btn btn-full"
                                disabled={loading}
                            >
                                {loading ? 'Verifying...' : 'Verify & Sign Up'}
                            </button>
                        </form>

                        <div className="resend-section">
                            <p>Didn't receive the code?</p>
                            <button 
                                type="button"
                                className="btn-link"
                                onClick={handleResendOTP}
                                disabled={countdown > 0 || loading}
                            >
                                {countdown > 0 
                                    ? `Resend in ${formatTime(countdown)}` 
                                    : 'Resend OTP'}
                            </button>
                        </div>

                        <button 
                            type="button"
                            className="btn-link"
                            onClick={() => setStep(1)}
                        >
                            ← Change Email
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}

export default Signup;