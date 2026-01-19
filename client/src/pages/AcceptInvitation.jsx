import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import './Login.css';

function AcceptInvitation() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [invitation, setInvitation] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [accepting, setAccepting] = useState(false);
    
    const token = searchParams.get('token');
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

    useEffect(() => {
        const fetchInvitation = async () => {
            try {
                const response = await axios.get(`${API_URL}/teams/invitation/${token}`);
                setInvitation(response.data);
            } catch (err) {
                setError('Invalid or expired invitation link');
            } finally {
                setLoading(false);
            }
        };

        if (token) {
            fetchInvitation();
        } else {
            setError('No invitation token found');
            setLoading(false);
        }
    }, [token]);

    const handleAccept = async () => {
        try {
            setAccepting(true);
            const currentUser = JSON.parse(localStorage.getItem('campusUser') || '{}');
            
            if (!currentUser.id) {
                // Redirect to signup/login
                localStorage.setItem('pendingInvitation', token);
                navigate('/signup');
                return;
            }

            const authToken = localStorage.getItem('campusToken');
            await axios.post(`${API_URL}/teams/accept-invitation`, 
                { token, userId: currentUser.id },
                { headers: { Authorization: `Bearer ${authToken}` }}
            );
            
            alert('Successfully joined the team!');
            navigate('/teams');
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to accept invitation');
        } finally {
            setAccepting(false);
        }
    };

    if (loading) {
        return (
            <div className="auth-container">
                <div className="auth-box">
                    <p>Loading invitation...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="auth-container">
                <div className="auth-box">
                    <h2>❌ Error</h2>
                    <p>{error}</p>
                    <button className="btn btn-full" onClick={() => navigate('/')}>
                        Go to Home
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="auth-container">
            <div className="auth-box">
                <h2>Team Invitation</h2>
                <div style={{ marginBottom: '20px' }}>
                    <p><strong>{invitation.inviter_name}</strong> has invited you to join:</p>
                    <h3 style={{ color: '#646cff', margin: '10px 0' }}>
                        {invitation.team_name}
                    </h3>
                    <p>Role: <strong>{invitation.role}</strong></p>
                </div>
                
                <button 
                    className="btn btn-full" 
                    onClick={handleAccept}
                    disabled={accepting}
                >
                    {accepting ? 'Accepting...' : 'Accept Invitation'}
                </button>
                
                <button 
                    className="btn btn-secondary" 
                    style={{ marginTop: '10px', width: '100%' }}
                    onClick={() => navigate('/')}
                >
                    Decline
                </button>
            </div>
        </div>
    );
}

export default AcceptInvitation;