// client/src/pages/Login.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Login.css';

function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const navigate = useNavigate(); // 2. Initialize the hook

    const handleSubmit = (e) => {
        e.preventDefault();
        // logic to check credentials would go here
        console.log("Logging in...");
        
        // 3. Redirect to Dashboard
        navigate('/dashboard'); 
    };

    return (
        <div className="auth-container">
            <div className="auth-box">
                {/* 1. Back Button */}
                <div className="back-link-container">
                    <Link to="/" className="back-link">← Back</Link>
                </div>

                <h2>Welcome Back</h2>
                <p className="auth-subtitle">Login to access your workspace</p>

                {/* 2. Google Login Button */}
                <button className="btn-google">
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

                {/* 3. Login Form */}
                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label>Email Address</label>
                        <input 
                            type="email" 
                            placeholder="john@example.com" 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                    
                    <div className="input-group">
                        <div style={{display: 'flex', justifyContent: 'space-between'}}>
                            <label>Password</label>
                            {/* Optional: Forgot Password Link */}
                            <Link to="#" style={{fontSize: '0.85rem', color: '#646cff'}}>Forgot?</Link>
                        </div>
                        <input 
                            type="password" 
                            placeholder="••••••••" 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>

                    <button type="submit" className="btn btn-full">Login</button>
                </form>

                <p className="auth-switch">
                    Don't have an account? <Link to="/signup">Sign up here</Link>
                </p>
            </div>
        </div>
    );
}

export default Login;