// client/src/pages/ResetPassword.jsx
import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import './Login.css';

function ResetPassword() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');
    
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        
        if (!password || !confirmPassword) {
            setError("Please fill in all fields");
            return;
        }
        
        if (password.length < 6) {
            setError("Password must be at least 6 characters long");
            return;
        }
        
        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }
        
        if (!token) {
            setError("Invalid reset link");
            return;
        }
        
        try {
            setLoading(true);
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
            await axios.post(`${API_URL}/auth/reset-password`, { 
                token, 
                newPassword: password 
            });
            
            alert('Password reset successful! You can now log in with your new password.');
            navigate('/login');
        } catch (err) {
            console.error('Reset password error:', err);
            setError(err.response?.data?.error || 'Failed to reset password. The link may be expired.');
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

                <h2>Reset Password</h2>
                <p className="auth-subtitle">Enter your new password</p>

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

                    <div className="input-group">
                        <label>New Password</label>
                        <input 
                            type="password" 
                            placeholder="••••••••" 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={loading}
                            required
                            minLength={6}
                        />
                    </div>
                    
                    <div className="input-group">
                        <label>Confirm Password</label>
                        <input 
                            type="password" 
                            placeholder="••••••••" 
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            disabled={loading}
                            required
                            minLength={6}
                        />
                    </div>

                    <button type="submit" className="btn btn-full" disabled={loading}>
                        {loading ? "Resetting..." : "Reset Password"}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default ResetPassword;