import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Toast from '../components/Toast';
import { useApp } from '../context/AppContext';
import axios from 'axios';
import {
    FaClock, FaTrophy, FaCalendarCheck, FaExclamationCircle,
    FaPlay, FaPause, FaRedo, FaMedal, FaFire, FaBolt,
    FaCheckCircle, FaRegCalendarAlt, FaStar
} from 'react-icons/fa';
import {
    MdTimer, MdEmojiEvents, MdSchedule, MdNotificationsActive,
    MdTrendingUp, MdAccessTime
} from 'react-icons/md';
import './Dashboard.css';
import './Productivity.css';

function Productivity() {
    const POMODORO_SECONDS = 25 * 60;
    const navigate = useNavigate();
    const { toasts, removeToast, isAuthenticated, currentUser, addToast } = useApp();

    // All tasks
    const [allTasks, setAllTasks] = useState([]);
    const [loading, setLoading] = useState(true);

    // Focus Timer state
    const [timerSeconds, setTimerSeconds] = useState(POMODORO_SECONDS);
    const [timerRunning, setTimerRunning] = useState(false);
    const [focusTaskId, setFocusTaskId] = useState('');
    const [focusHistory, setFocusHistory] = useState({});

    // Gamification
    const [gamification, setGamification] = useState(null);

    // Smart Scheduling
    const [smartSchedule, setSmartSchedule] = useState([]);
    const [scheduleLoading, setScheduleLoading] = useState(false);

    // Stalled Tasks
    const [stalledTasks, setStalledTasks] = useState([]);

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

    useEffect(() => {
        if (!isAuthenticated || !currentUser) {
            navigate('/login');
            return;
        }
        const storedHistory = localStorage.getItem(`focusHistory_${currentUser.id}`);
        if (storedHistory) {
            try {
                setFocusHistory(JSON.parse(storedHistory));
            } catch {
                setFocusHistory({});
            }
        }
        fetchData();
    }, [isAuthenticated, currentUser, navigate]);

    // Pomodoro timer
    useEffect(() => {
        if (!timerRunning) return undefined;
        const interval = setInterval(() => {
            setTimerSeconds(prev => {
                if (prev <= 1) {
                    clearInterval(interval);
                    setTimerRunning(false);
                    const today = new Date().toISOString().slice(0, 10);
                    setFocusHistory(prevHistory => {
                        const updated = {
                            ...prevHistory,
                            [today]: (prevHistory[today] || 0) + 1
                        };
                        if (currentUser?.id) {
                            localStorage.setItem(`focusHistory_${currentUser.id}`, JSON.stringify(updated));
                        }
                        return updated;
                    });
                    addToast('Focus session complete. Great work!', 'success');
                    return POMODORO_SECONDS;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [timerRunning, addToast, currentUser, POMODORO_SECONDS]);

    const fetchData = async () => {
        try {
            const token = localStorage.getItem('campusToken');
            const [assignedRes, createdRes] = await Promise.all([
                axios.get(`${API_URL}/tasks/assigned`, {
                    headers: { Authorization: `Bearer ${token}` }
                }),
                axios.get(`${API_URL}/tasks/created`, {
                    headers: { Authorization: `Bearer ${token}` }
                })
            ]);

            const taskMap = new Map();
            assignedRes.data.forEach(t => taskMap.set(t.id, t));
            createdRes.data.forEach(t => { if (!taskMap.has(t.id)) taskMap.set(t.id, t); });
            setAllTasks(Array.from(taskMap.values()));

            // Fetch productivity features
            try {
                const [gamificationRes, scheduleRes, stalledRes] = await Promise.all([
                    axios.get(`${API_URL}/gamification/me`, {
                        headers: { Authorization: `Bearer ${token}` }
                    }),
                    axios.get(`${API_URL}/tasks/schedule`, {
                        headers: { Authorization: `Bearer ${token}` }
                    }),
                    axios.get(`${API_URL}/tasks/stalled`, {
                        headers: { Authorization: `Bearer ${token}` }
                    })
                ]);
                setGamification(gamificationRes.data);
                setSmartSchedule(scheduleRes.data || []);
                setStalledTasks(stalledRes.data || []);
            } catch (error) {
                console.error('Error fetching productivity features:', error);
            }
        } catch (error) {
            console.error('Error fetching tasks:', error);
        } finally {
            setLoading(false);
        }
    };

    const generateSmartSchedule = async (persist = false) => {
        try {
            setScheduleLoading(true);
            const token = localStorage.getItem('campusToken');
            const endpoint = persist
                ? `${API_URL}/tasks/smart-schedule/apply`
                : `${API_URL}/tasks/smart-schedule/preview`;
            const response = await axios.post(
                endpoint,
                { days: 7, dailyHours: 3 },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const scheduleData = response.data.schedule;
            const flattened = (scheduleData || []).flatMap(day =>
                (day.items || []).map(item => ({
                    ...item,
                    plan_date: day.date,
                    planned_hours: item.hours
                }))
            );
            setSmartSchedule(flattened);
            addToast(persist ? 'Smart schedule saved' : 'Smart schedule generated', 'success');
        } catch (error) {
            console.error('Error generating smart schedule:', error);
            addToast('Failed to generate smart schedule', 'error');
        } finally {
            setScheduleLoading(false);
        }
    };

    const todayKey = new Date().toISOString().slice(0, 10);
    const todaysFocusSessions = focusHistory[todayKey] || 0;

    const focusStreak = useMemo(() => {
        let streak = 0;
        const d = new Date();
        while (true) {
            const key = d.toISOString().slice(0, 10);
            if ((focusHistory[key] || 0) > 0) {
                streak += 1;
                d.setDate(d.getDate() - 1);
            } else {
                break;
            }
        }
        return streak;
    }, [focusHistory]);

    const focusTask = allTasks.find(t => String(t.id) === String(focusTaskId));
    const pendingTasks = allTasks.filter(t => t.status !== 'done' && t.status !== 'completed_late');

    const formatTimer = (seconds) => {
        const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
        const secs = (seconds % 60).toString().padStart(2, '0');
        return `${mins}:${secs}`;
    };

    const timerProgress = ((POMODORO_SECONDS - timerSeconds) / POMODORO_SECONDS) * 100;

    if (!isAuthenticated || !currentUser) return null;

    return (
        <div className="dashboard-container">
            <Sidebar />
            <Toast toasts={toasts} removeToast={removeToast} />

            <main className="main-content">
                {/* Page Header */}
                <div className="page-header-card">
                    <div className="page-header-content">
                        <div className="page-header-icon">
                            <MdTrendingUp />
                        </div>
                        <div className="page-header-text">
                            <h1>Productivity</h1>
                            <p>Focus tools, streaks, and smart scheduling</p>
                        </div>
                    </div>
                </div>

                <div className="productivity-page">
                    {/* ====== FOCUS TIMER SECTION ====== */}
                    <section className="prod-section prod-timer-section">
                        <div className="prod-section-header">
                            <div className="prod-section-icon timer">
                                <MdTimer />
                            </div>
                            <div>
                                <h2>Focus Timer</h2>
                                <p>Pomodoro technique — 25 minute focused work sessions</p>
                            </div>
                        </div>

                        <div className="timer-container">
                            <div className="timer-display">
                                <svg className="timer-ring" viewBox="0 0 120 120">
                                    <circle className="timer-ring-bg" cx="60" cy="60" r="54" />
                                    <circle
                                        className="timer-ring-progress"
                                        cx="60" cy="60" r="54"
                                        style={{
                                            strokeDasharray: `${2 * Math.PI * 54}`,
                                            strokeDashoffset: `${2 * Math.PI * 54 * (1 - timerProgress / 100)}`
                                        }}
                                    />
                                </svg>
                                <div className="timer-time">{formatTimer(timerSeconds)}</div>
                                <div className="timer-label">{timerRunning ? 'Focusing...' : 'Ready'}</div>
                            </div>

                            <div className="timer-controls">
                                <select
                                    value={focusTaskId}
                                    onChange={(e) => setFocusTaskId(e.target.value)}
                                    className="timer-task-select"
                                >
                                    <option value="">Select a task to focus on...</option>
                                    {pendingTasks.map(t => (
                                        <option key={t.id} value={t.id}>{t.title}</option>
                                    ))}
                                </select>

                                {focusTask && (
                                    <div className="timer-focus-task">
                                        <FaBolt className="focus-bolt" />
                                        <span>Focusing on: <strong>{focusTask.title}</strong></span>
                                    </div>
                                )}

                                <div className="timer-buttons">
                                    <button
                                        className={`timer-btn primary ${timerRunning ? 'running' : ''}`}
                                        onClick={() => setTimerRunning(prev => !prev)}
                                    >
                                        {timerRunning ? <><FaPause /> Pause</> : <><FaPlay /> Start</>}
                                    </button>
                                    <button
                                        className="timer-btn secondary"
                                        onClick={() => {
                                            setTimerRunning(false);
                                            setTimerSeconds(POMODORO_SECONDS);
                                        }}
                                    >
                                        <FaRedo /> Reset
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="timer-stats-row">
                            <div className="timer-stat">
                                <FaCheckCircle className="stat-icon" />
                                <div>
                                    <span className="stat-num">{todaysFocusSessions}</span>
                                    <span className="stat-label">Sessions Today</span>
                                </div>
                            </div>
                            <div className="timer-stat">
                                <FaFire className="stat-icon streak" />
                                <div>
                                    <span className="stat-num">{focusStreak}</span>
                                    <span className="stat-label">Day Streak</span>
                                </div>
                            </div>
                            <div className="timer-stat">
                                <FaClock className="stat-icon" />
                                <div>
                                    <span className="stat-num">{Math.round(todaysFocusSessions * 25)}m</span>
                                    <span className="stat-label">Focus Time Today</span>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* ====== STREAKS & BADGES SECTION ====== */}
                    <section className="prod-section prod-streaks-section">
                        <div className="prod-section-header">
                            <div className="prod-section-icon badge">
                                <MdEmojiEvents />
                            </div>
                            <div>
                                <h2>Streaks & Badges</h2>
                                <p>Track your consistency and earn achievements</p>
                            </div>
                        </div>

                        <div className="streaks-grid">
                            <div className="streak-card">
                                <FaFire className="streak-card-icon fire" />
                                <span className="streak-card-value">{gamification?.streak?.current_streak || 0}</span>
                                <span className="streak-card-label">Current Streak (days)</span>
                            </div>
                            <div className="streak-card">
                                <FaStar className="streak-card-icon star" />
                                <span className="streak-card-value">{gamification?.streak?.longest_streak || 0}</span>
                                <span className="streak-card-label">Longest Streak (days)</span>
                            </div>
                            <div className="streak-card">
                                <FaCheckCircle className="streak-card-icon check" />
                                <span className="streak-card-value">{gamification?.streak?.on_time_completions || 0}</span>
                                <span className="streak-card-label">On-Time Completions</span>
                            </div>
                        </div>

                        {(gamification?.badges || []).length > 0 ? (
                            <div className="badges-list">
                                <h3>Your Badges</h3>
                                <div className="badges-grid">
                                    {(gamification.badges || []).map(badge => (
                                        <div key={badge.code} className="badge-card">
                                            <FaMedal className="badge-medal" />
                                            <span className="badge-name">{badge.name}</span>
                                            {badge.description && <span className="badge-desc">{badge.description}</span>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="badges-empty">
                                <FaTrophy className="badges-empty-icon" />
                                <p>Complete tasks on time to earn badges!</p>
                            </div>
                        )}
                    </section>

                    {/* ====== SMART SCHEDULING SECTION ====== */}
                    <section className="prod-section prod-schedule-section">
                        <div className="prod-section-header">
                            <div className="prod-section-icon schedule">
                                <MdSchedule />
                            </div>
                            <div>
                                <h2>Smart Scheduling</h2>
                                <p>AI-powered 7-day work plan based on your tasks</p>
                            </div>
                        </div>

                        <div className="schedule-actions">
                            <button
                                className="schedule-btn"
                                onClick={() => generateSmartSchedule(false)}
                                disabled={scheduleLoading}
                            >
                                <FaRegCalendarAlt />
                                {scheduleLoading ? 'Planning...' : 'Preview 7-Day Plan'}
                            </button>
                            <button
                                className="schedule-btn primary"
                                onClick={() => generateSmartSchedule(true)}
                                disabled={scheduleLoading}
                            >
                                <FaCalendarCheck />
                                Save Plan
                            </button>
                        </div>

                        {smartSchedule.length > 0 ? (
                            <div className="schedule-list">
                                {smartSchedule.map((slot, idx) => (
                                    <div key={`${slot.taskId || slot.task_id}-${slot.plan_date}-${idx}`} className="schedule-item">
                                        <div className="schedule-date">
                                            <MdAccessTime />
                                            {new Date(slot.plan_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                        </div>
                                        <div className="schedule-task-name">{slot.title}</div>
                                        <div className="schedule-hours">{slot.planned_hours || slot.hours}h</div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="schedule-empty">
                                <MdSchedule className="schedule-empty-icon" />
                                <p>No schedule generated yet. Click "Preview 7-Day Plan" to get started.</p>
                            </div>
                        )}
                    </section>

                    {/* ====== STALLED TASKS SECTION ====== */}
                    <section className="prod-section prod-stalled-section">
                        <div className="prod-section-header">
                            <div className="prod-section-icon stalled">
                                <MdNotificationsActive />
                            </div>
                            <div>
                                <h2>Stalled Task Nudges</h2>
                                <p>Tasks that haven't been updated recently</p>
                            </div>
                        </div>

                        {stalledTasks.length > 0 ? (
                            <div className="stalled-list">
                                {stalledTasks.map(task => (
                                    <div key={task.id} className="stalled-item" onClick={() => navigate('/tasks')}>
                                        <div className="stalled-info">
                                            <FaExclamationCircle className="stalled-icon" />
                                            <div>
                                                <span className="stalled-title">{task.title}</span>
                                                <span className="stalled-days">{task.stale_days} days inactive</span>
                                            </div>
                                        </div>
                                        <span className="stalled-action">View →</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="stalled-empty">
                                <FaCheckCircle className="stalled-empty-icon" />
                                <p>All tasks are active — great work!</p>
                            </div>
                        )}
                    </section>
                </div>
            </main>
        </div>
    );
}

export default Productivity;
