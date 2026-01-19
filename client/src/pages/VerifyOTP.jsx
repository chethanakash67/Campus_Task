// client/src/pages/VerifyOTP.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import './Login.css';

function VerifyOTP() {
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    
    const userId = location.state?.userId;
    const email = location.state?.email;

    useEffect(() => {
        if (!userId || !email) {
            navigate('/signup');
        }
    }, [userId, email, navigate]);

    const handleChange = (element, index) => {
        if (isNaN(element.value)) return false;

        setOtp([...otp.map((d, idx) => (idx === index ? element.value : d))]);

        // Focus next input
        if (element.value !== '' && element.nextSibling) {
            element.nextSibling.focus();
        }
    };

    const handleKeyDown = (e, index) => {
        if (e.key === 'Backspace' && !otp[index] && e.target.previousSibling) {
            e.target.previousSibling.focus();
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        
        const otpValue = otp.join('');
        if (otpValue.length !== 6) {
            setError('Please enter complete OTP');
            return;
        }
        
        try {
            setLoading(true);
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
            const response = await axios.post(`${API_URL}/auth/verify-otp`, {
                userId,
                otp: otpValue
            });
            
            // Store token and user
            localStorage.setItem('campusToken', response.data.token);
            localStorage.setItem('campusUser', JSON.stringify(response.data.user));
            
            setMessage('Verification successful! Redirecting...');
            setTimeout(() => {
                navigate('/dashboard', { replace: true });
            }, 1000);
        } catch (err) {
            console.error('OTP verification error:', err);
            setError(err.response?.data?.error || 'Invalid OTP. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleResendOTP = async () => {
        try {
            setResending(true);
            setError('');
            setMessage('');
            
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
            await axios.post(`${API_URL}/auth/resend-otp`, { userId });
            
            setMessage('OTP resent successfully! Check your email.');
            setOtp(['', '', '', '', '', '']);
        } catch (err) {
            setError('Failed to resend OTP. Please try again.');
        } finally {
            setResending(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-box">
                <h2>Verify Your Email</h2>
                <p className="auth-subtitle">
                    We've sent a 6-digit code to <strong>{email}</strong>
                </p>

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
                                onChange={(e) => handleChange(e.target, index)}
                                onKeyDown={(e) => handleKeyDown(e, index)}
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

                <div style={{ 
                    marginTop: '20px', 
                    textAlign: 'center',
                    fontSize: '0.9rem'
                }}>
                    <p>Didn't receive the code?</p>
                    <button 
                        onClick={handleResendOTP}
                        disabled={resending}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#646cff',
                            cursor: 'pointer',
                            textDecoration: 'underline',
                            fontSize: '0.9rem'
                        }}
                    >
                        {resending ? 'Resending...' : 'Resend OTP'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default VerifyOTP;