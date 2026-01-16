// client/src/pages/ForgotPassword.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './Login.css';

function ForgotPassword() {
    const [email, setEmail] = useState("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setMessage("");
        
        if (!email) {
            setError("Please enter your email");
            return;
        }
        
        try {
            setLoading(true);
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
            const response = await axios.post(`${API_URL}/auth/forgot-password`, { email });
            setMessage(response.data.message);
            setEmail("");
        } catch (err) {
            console.error('Forgot password error:', err);
            setError(err.response?.data?.error || 'Failed to send reset email. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-box">
                <div className="back-link-container">
                    <Link to="/login" className="back-link">← Back to Login</Link>
                </div>

                <h2>Forgot Password</h2>
                <p className="auth-subtitle">Enter your email to receive a password reset link</p>

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

                    <div className="input-group">
                        <label>Email Address</label>
                        <input 
                            type="email" 
                            placeholder="john@example.com" 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={loading}
                            required
                        />
                    </div>

                    <button type="submit" className="btn btn-full" disabled={loading}>
                        {loading ? "Sending..." : "Send Reset Link"}
                    </button>
                </form>

                <p className="auth-switch">
                    Remember your password? <Link to="/login">Login here</Link>
                </p>
            </div>
        </div>
    );
}

export default ForgotPassword;