import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { FaCheckCircle, FaSpinner } from 'react-icons/fa';
import { useApp } from '../context/AppContext';

function AuthSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useApp();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
  
  useEffect(() => {
    const authenticateAndRedirect = async () => {
      const token = searchParams.get('token');
      if (!token) {
        navigate('/login');
        return;
      }

      try {
        // Store token
        localStorage.setItem('campusToken', token);

        // Fetch user data
        const userResponse = await axios.get(`${API_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        const user = userResponse.data;
        localStorage.setItem('campusUser', JSON.stringify(user));
        login(user, token);

        // Check for pending invitation
        const pendingInvitation = localStorage.getItem('pendingInvitation');
        if (pendingInvitation) {
          navigate(`/accept-invitation?token=${encodeURIComponent(pendingInvitation)}`, { replace: true });
        } else {
          // No pending invitation - navigate to dashboard
          navigate('/dashboard', { replace: true });
        }
      } catch (error) {
        console.error('Auth error:', error);
        localStorage.removeItem('campusToken');
        localStorage.removeItem('campusUser');
        navigate('/login');
      }
    };

    authenticateAndRedirect();
  }, [navigate, searchParams, login]);
  
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      fontSize: '1.5rem',
      flexDirection: 'column',
      gap: '16px'
    }}>
      <FaCheckCircle size={40} color="#10b981" />
      <div>Logging you in...</div>
    </div>
  );
}

export default AuthSuccess;
