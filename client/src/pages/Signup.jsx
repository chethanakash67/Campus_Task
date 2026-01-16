// client/src/pages/Signup.jsx - UPDATED
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import './Signup.css';

function Signup() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const navigate = useNavigate();
    const { register, loading } = useApp();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        
        if (!name || !email || !password) {
            setError("Please fill in all fields");
            return;
        }
        
        if (password.length < 6) {
            setError("Password must be at least 6 characters long");
            return;
        }
        
        try {
            const result = await register(name, email, password);
            if (result && result.user && result.token) {
                setTimeout(() => {
                    navigate('/dashboard', { replace: true });
                }, 200);
            }
        } catch (err) {
            console.error('Signup error:', err);
            let errorMessage = "Registration failed. Please try again.";
            
            if (err.code === 'ECONNREFUSED' || 
                err.message?.includes('Network Error') || 
                err.message?.includes('network') ||
                !err.response) {
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
    const handleGoogleSignup = () => {
        alert('Google OAuth is not configured yet. Please use email/password signup or set up Google OAuth in your backend.');
        // TODO: Implement Google OAuth
        // window.location.href = 'http://localhost:5001/api/auth/google';
    };

    return (
        <div className="auth-container">
            <div className="auth-box">
                <div className="back-link-container">
                    <Link to="/" className="back-link">← Back</Link>
                </div>

                <h2>Create Account</h2>
                <p className="auth-subtitle">Join your team on CampusTasks</p>

                <button className="btn-google" onClick={handleGoogleSignup} type="button">
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
                        <label>Full Name</label>
                        <input 
                            type="text" 
                            placeholder="John Doe" 
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            disabled={loading}
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
                            disabled={loading}
                            required
                        />
                    </div>
                    <div className="input-group">
                        <label>Password</label>
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
                    <button type="submit" className="btn btn-full" disabled={loading}>
                        {loading ? "Signing up..." : "Sign Up"}
                    </button>
                </form>

                <p className="auth-switch">
                    Already have an account? <Link to="/login">Login here</Link>
                </p>
            </div>
        </div>
    );
}

export default Signup;