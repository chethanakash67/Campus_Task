// client/src/pages/Signup.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom'; // <--- ADD useNavigate HERE
import './Signup.css';

function Signup() {
    const navigate = useNavigate(); 

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log("Signing up...");
        navigate('/dashboard');
    };

    return (
        <div className="auth-container">
            <div className="auth-box">
                <div className="back-link-container">
                    <Link to="/" className="back-link">← Back</Link>
                </div>

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

                {/* Added onSubmit handler here */}
                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label>Full Name</label>
                        <input type="text" placeholder="John Doe" />
                    </div>
                    <div className="input-group">
                        <label>Email Address</label>
                        <input type="email" placeholder="john@example.com" />
                    </div>
                    <div className="input-group">
                        <label>Password</label>
                        <input type="password" placeholder="••••••••" />
                    </div>
                    <button type="submit" className="btn btn-full">Sign Up</button>
                </form>

                <p className="auth-switch">
                    Already have an account? <Link to="/login">Login here</Link>
                </p>
            </div>
        </div>
    );
}

export default Signup;