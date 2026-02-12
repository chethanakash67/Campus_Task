// client/src/App.jsx - UPDATED ROUTES
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';

// Pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import VerifyOTP from './pages/VerifyOTP';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import AuthSuccess from './pages/AuthSuccess';
import AcceptInvitation from './pages/AcceptInvitation';
import AssignedTasks from './pages/AssignedTasks';
import TeamChat from './pages/TeamChat';
import Dashboard from './pages/Dashboard';
import Teams from './pages/Teams';
import Calendar from './pages/Calendar';
import Settings from './pages/Settings';
import Leaderboard from './pages/Leaderboard';

function App() {
  return (
    <AppProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/verify-otp" element={<VerifyOTP />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/auth-success" element={<AuthSuccess />} />
          <Route path="/accept-invitation" element={<AcceptInvitation />} />
          <Route path="/tasks" element={<AssignedTasks />} />
          <Route path="/assigned-tasks" element={<AssignedTasks />} />
          <Route path="/teams/:teamId/chat" element={<TeamChat />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/teams" element={<Teams />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AppProvider>
  );
}

export default App;
