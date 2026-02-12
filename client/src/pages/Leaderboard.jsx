// client/src/pages/Leaderboard.jsx - LOOMIO-INSPIRED UI
import React, { useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Toast from '../components/Toast';
import { FaTrophy, FaMedal } from 'react-icons/fa';
import { useApp } from '../context/AppContext';
import './Dashboard.css';
import './Leaderboard.css';

function Leaderboard() {
  const navigate = useNavigate();
  const { toasts, removeToast, currentUser, isAuthenticated, getAllTeamMembers, tasks } = useApp();

  const leaderboardData = useMemo(() => {
    if (!isAuthenticated || !currentUser) return [];

    const members = getAllTeamMembers();
    const memberStats = members.map(member => {
      const memberTasks = tasks.filter(t => 
        t.assignees?.some(a => a.id === member.id)
      );
      const completedTasks = memberTasks.filter(t => t.status === 'done').length;
      const points = completedTasks * 10; // 10 points per completed task
      
      return {
        id: member.id,
        name: member.name,
        email: member.email,
        points,
        tasksCompleted: completedTasks,
        avatar: member.name?.substring(0, 2).toUpperCase() || 'U'
      };
    });

    // Add current user if not in members
    if (!memberStats.find(m => m.id === currentUser.id)) {
      const userTasks = tasks.filter(t => 
        t.assignees?.some(a => a.id === currentUser.id)
      );
      const completedTasks = userTasks.filter(t => t.status === 'done').length;
      memberStats.push({
        id: currentUser.id,
        name: currentUser.name,
        email: currentUser.email,
        points: completedTasks * 10,
        tasksCompleted: completedTasks,
        avatar: currentUser.name?.substring(0, 2).toUpperCase() || 'U'
      });
    }

    // Sort by points descending
    memberStats.sort((a, b) => b.points - a.points);
    return memberStats;
  }, [isAuthenticated, currentUser, tasks, getAllTeamMembers]);

  useEffect(() => {
    if (!isAuthenticated || !currentUser) {
      navigate('/login', { replace: true });
    }
  }, [isAuthenticated, currentUser, navigate]);

  if (!isAuthenticated || !currentUser) {
    return null;
  }

  const currentUserRank = leaderboardData.findIndex(m => m.id === currentUser.id) + 1;
  const currentUserData = leaderboardData.find(m => m.id === currentUser.id);
  const topThree = leaderboardData.slice(0, 3);
  const rest = leaderboardData.slice(3);
  const totalPoints = leaderboardData.reduce((sum, u) => sum + (u.points || 0), 0);
  const totalCompleted = leaderboardData.reduce((sum, u) => sum + (u.tasksCompleted || 0), 0);

  const getRankIcon = (rank) => {
    if (rank === 1) return <FaTrophy className="rank-icon gold" />;
    if (rank === 2) return <FaMedal className="rank-icon silver" />;
    if (rank === 3) return <FaMedal className="rank-icon bronze" />;
    return <span className="rank-number">#{rank}</span>;
  };

  return (
    <div className="dashboard-container">
      <Sidebar />
      <main className="main-content">
        <Toast toasts={toasts} removeToast={removeToast} />

        {/* Page Header Card */}
        <div className="page-header-card leaderboard-header">
          <div className="page-header-content">
            <h1>Leaderboard</h1>
            <p>See how you rank among your teammates</p>
          </div>
          <div className="page-header-icon">
            <FaTrophy />
          </div>
        </div>

        <div className="content-padding">
          {/* Summary + Your Rank */}
          <div className="leaderboard-hero">
            <div className="your-rank-card">
              <div className="your-rank-badge">
                <span className="rank-position">#{currentUserRank || '-'}</span>
              </div>
              <div className="your-rank-info">
                <span className="your-rank-label">Your Rank</span>
                <h2 className="your-rank-name">{currentUser?.name}</h2>
                <span className="your-rank-points">{currentUserData?.points || 0} points</span>
              </div>
            </div>
            <div className="leaderboard-summary">
              <div className="summary-card">
                <span className="summary-label">Members</span>
                <span className="summary-value">{leaderboardData.length}</span>
              </div>
              <div className="summary-card">
                <span className="summary-label">Total Points</span>
                <span className="summary-value">{totalPoints}</span>
              </div>
              <div className="summary-card">
                <span className="summary-label">Tasks Completed</span>
                <span className="summary-value">{totalCompleted}</span>
              </div>
            </div>
          </div>

          {/* Podium */}
          {topThree.length > 0 && (
            <div className="podium">
              {topThree.map((user, index) => (
                <div key={user.id} className={`podium-card rank-${index + 1}`}>
                  <div className="podium-rank">{index + 1}</div>
                  <div className="podium-avatar">{user.avatar}</div>
                  <div className="podium-name">{user.name}</div>
                  <div className="podium-points">{user.points} pts</div>
                </div>
              ))}
            </div>
          )}

          {/* Leaderboard List */}
          <div className="leaderboard-card">
            <div className="leaderboard-list">
              {leaderboardData.length === 0 ? (
                <div className="empty-leaderboard">
                  <FaTrophy size={48} />
                  <p>No rankings yet</p>
                  <span>Complete tasks to earn points and climb the leaderboard!</span>
                </div>
              ) : rest.length === 0 ? (
                <div className="empty-leaderboard">
                  <FaTrophy size={32} />
                  <p>No more rankings yet</p>
                  <span>Invite teammates or complete tasks to expand the board.</span>
                </div>
              ) : (
                rest.map((user, index) => (
                  <div 
                    key={user.id} 
                    className={`leaderboard-item ${user.id === currentUser?.id ? 'current-user' : ''}`}
                  >
                    <div className="leaderboard-rank">
                      {getRankIcon(index + 4)}
                    </div>
                    <div className="leaderboard-avatar">
                      {user.avatar}
                    </div>
                    <div className="leaderboard-info">
                      <span className="leaderboard-name">
                        {user.name}
                      </span>
                      <span className="leaderboard-email">{user.email}</span>
                    </div>
                    <div className="leaderboard-stats">
                      <div className="stat-column">
                        <span className="stat-label">Points</span>
                        <span className="stat-value points">{user.points}</span>
                      </div>
                      <div className="stat-column">
                        <span className="stat-label">Tasks</span>
                        <span className="stat-value">{user.tasksCompleted}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Leaderboard;
