import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

function AuthSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      localStorage.setItem('campusToken', token);
      // Fetch user data
      setTimeout(() => navigate('/dashboard'), 1000);
    } else {
      navigate('/login');
    }
  }, [navigate, searchParams]);
  
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      fontSize: '1.5rem'
    }}>
      <div>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>✅</div>
        <div>Logging you in...</div>
      </div>
    </div>
  );
}

export default AuthSuccess;