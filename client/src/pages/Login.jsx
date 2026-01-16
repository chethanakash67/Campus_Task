// client/src/pages/Login.jsx - UPDATED
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import './Login.css';

function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const navigate = useNavigate();
    const { login, loading } = useApp();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        
        if (!email || !password) {
            setError("Please fill in all fields");
            return;
        }
        
        try {
            const result = await login(email, password);
            if (result && result.user && result.token) {
                setTimeout(() => {
                    navigate('/dashboard', { replace: true });
                }, 200);
            }
        } catch (err) {
            console.error('Login page error:', err);
            let errorMessage = "Login failed. Please try again.";
            
            if (err.code === 'ECONNREFUSED' || err.message?.includes('Network Error')) {
                errorMessage = "Cannot connect to server. Please make sure the server is running on port 5001.";
            } else if (err.response?.data?.error) {
                errorMessage = err.response.data.error;
            } else if (err.message) {
                errorMessage = err.message;
            }
            
            setError(errorMessage);
        }
    };

    // Google OAuth handler (placeholder - needs Google OAuth setup)
    const handleGoogleLogin = () => {
        alert('Google OAuth is not configured yet. Please use email/password login or set up Google OAuth in your backend.');
        // TODO: Implement Google OAuth
        // window.location.href = 'http://localhost:5001/api/auth/google';
    };

    return (
        <div className="auth-container">
            <div className="auth-box">
                <div className="back-link-container">
                    <Link to="/" className="back-link">← Back</Link>
                </div>

                <h2>Welcome Back</h2>
                <p className="auth-subtitle">Login to access your workspace</p>

                <button className="btn-google" onClick={handleGoogleLogin} type="button">
                    <img 
                        src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" 
                        alt="Google" 
                        className="google-icon"
                    />
                    Login with Google
                </button>

                <div className="divider">
                    <span>OR</span>
                </div>

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
                    
                    <div className="input-group">
                        <div style={{display: 'flex', justifyContent: 'space-between'}}>
                            <label>Password</label>
                            <Link to="/forgot-password" style={{fontSize: '0.85rem', color: '#646cff'}}>
                                Forgot?
                            </Link>
                        </div>
                        <input 
                            type="password" 
                            placeholder="••••••••" 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={loading}
                            required
                        />
                    </div>

                    <button type="submit" className="btn btn-full" disabled={loading}>
                        {loading ? "Logging in..." : "Login"}
                    </button>
                </form>

                <p className="auth-switch">
                    Don't have an account? <Link to="/signup">Sign up here</Link>
                </p>
            </div>
        </div>
    );
}

export default Login;