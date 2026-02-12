import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { FaUsers, FaClipboardList, FaCheckCircle, FaTimesCircle, FaExclamationCircle, FaInfoCircle } from 'react-icons/fa';
import '../styles/auth.css';

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
                
                // Check if user is authenticated
                const currentUser = JSON.parse(localStorage.getItem('campusUser') || '{}');
                if (!currentUser.id) {
                    // User not authenticated - store invitation and redirect to login
                    localStorage.setItem('pendingInvitation', token);
                    localStorage.setItem('invitationEmail', response.data.invitee_email);
                    setLoading(false);
                    navigate('/login?from=invitation', { replace: true });
                    return;
                }
            } catch {
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
    }, [token, navigate]);

   const handleAccept = async () => {
    try {
        setAccepting(true);
        const currentUser = JSON.parse(localStorage.getItem('campusUser') || '{}');
        
        if (!currentUser.id) {
            // User not logged in - store invitation and redirect to login
            localStorage.setItem('pendingInvitation', token);
            localStorage.setItem('invitationEmail', invitation.invitee_email);
            navigate('/login?from=invitation');
            return;
        }

        // User is logged in - accept invitation
        const authToken = localStorage.getItem('campusToken');
        const response = await axios.post(`${API_URL}/teams/accept-invitation`, 
            { token, userId: currentUser.id },
            { headers: { Authorization: `Bearer ${authToken}` }}
        );
        
        // Check if user was already a member
        if (response.data.alreadyMember) {
            alert(response.data.message);
        } else {
            alert(response.data.message);
        }
        
        // Clear pending invitation if it exists
        localStorage.removeItem('pendingInvitation');
        localStorage.removeItem('invitationEmail');
        
        navigate('/teams');
    } catch (err) {
        const errorMessage = err.response?.data?.error || 'Failed to accept invitation';
        setError(errorMessage);
        // If user email doesn't match, offer to redirect to signup
        if (errorMessage.includes('different email')) {
            setTimeout(() => {
                if (confirm('Would you like to sign up with the invitation email instead?')) {
                    localStorage.setItem('pendingInvitation', token);
                    localStorage.setItem('invitationEmail', invitation.invitee_email);
                    navigate('/signup?from=invitation');
                }
            }, 1000);
        }
    } finally {
        setAccepting(false);
    }
};

    // Updated handleDecline with API call
    const handleDecline = async () => {
        try {
            const authToken = localStorage.getItem('campusToken');
            // We only try to notify the server if the user is logged in
            if (authToken) {
                await axios.post(`${API_URL}/teams/decline-invitation`, 
                    { token },
                    { headers: { Authorization: `Bearer ${authToken}` }}
                );
            }
            alert('Invitation declined');
            navigate('/dashboard');
        } catch (err) {
            console.error("Error declining:", err);
            // Even if the API call fails, we likely still want to exit this screen,
            // but setting error lets the user know something went wrong.
            setError('Failed to decline invitation');
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
                    <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                        <FaExclamationCircle size={32} color="#ef4444" />
                    </div>
                    <h2>Error</h2>
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
                
                {invitation && (
                    <>
                        <div style={{ marginBottom: '20px' }}>
                            <p><strong>{invitation.inviter_name}</strong> has invited you to join:</p>
                            <h3 style={{ color: '#646cff', margin: '10px 0', fontSize: '1.5em' }}>
                                {invitation.team_name}
                            </h3>
                            <p>Role: <strong>{invitation.role}</strong></p>
                            
                            {invitation.team_description && (
                                <p className="team-description">{invitation.team_description}</p>
                            )}
                            
                            <div className="invitation-stats">
                                <div className="stat-item">
                                    <span className="stat-icon"><FaUsers /></span>
                                    <span>{invitation.member_count || 0} members</span>
                                </div>
                                <div className="stat-item">
                                    <span className="stat-icon"><FaClipboardList /></span>
                                    <span>{invitation.task_count || 0} active tasks</span>
                                </div>
                            </div>
                        </div>
                        
                        <button 
                            className="btn btn-full" 
                            onClick={handleAccept}
                            disabled={accepting}
                        >
                            <FaCheckCircle style={{ marginRight: '8px' }} />
                            {accepting ? 'Accepting...' : 'Accept Invitation'}
                        </button>
                        
                        <button 
                            className="btn btn-secondary" 
                            style={{ marginTop: '10px', width: '100%' }}
                            onClick={handleDecline}
                        >
                            <FaTimesCircle style={{ marginRight: '8px' }} />
                            Decline
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}

export default AcceptInvitation;
