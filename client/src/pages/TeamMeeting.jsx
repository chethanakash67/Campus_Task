import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import {
  FaArrowLeft,
  FaCheck,
  FaCompress,
  FaComments,
  FaCopy,
  FaDesktop,
  FaExpand,
  FaMicrophone,
  FaMicrophoneSlash,
  FaPhoneSlash,
  FaPlus,
  FaRegCircle,
  FaTrash,
  FaUserFriends,
  FaVideo,
  FaVideoSlash
} from 'react-icons/fa';
import Sidebar from '../components/Sidebar';
import Toast from '../components/Toast';
import { useApp } from '../context/AppContext';
import './Dashboard.css';
import './TeamMeeting.css';

const stopStream = (stream) => {
  stream?.getTracks()?.forEach((track) => track.stop());
};

const defaultAgendaItems = [
  { id: 1, text: 'Review blockers', done: false },
  { id: 2, text: 'Assign next actions', done: false },
  { id: 3, text: 'Confirm deadlines', done: false }
];

const getInitials = (person) => {
  const avatar = String(person?.avatar || '').trim();
  const source = avatar && !avatar.startsWith('http') && !avatar.startsWith('data:')
    ? avatar
    : person?.name || person?.email || 'ME';

  return String(source).trim().substring(0, 2).toUpperCase();
};

const readSavedMeetingState = (storageKey) => {
  try {
    const saved = localStorage.getItem(storageKey);
    return saved ? JSON.parse(saved) : {};
  } catch (error) {
    console.error('Failed to load meeting state:', error);
    return {};
  }
};

function TeamMeeting() {
  const { teamId, roomId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const {
    teams,
    fetchTeams,
    currentUser,
    isAuthenticated,
    addToast,
    toasts,
    removeToast
  } = useApp();

  const audioOnly = searchParams.get('mode') === 'audio';
  const isStarter = searchParams.get('starter') === '1';
  const storageKey = `campusMeeting:${teamId}:${roomId}`;
  const savedMeetingState = readSavedMeetingState(storageKey);
  const [hasJoined, setHasJoined] = useState(false);
  const [joining, setJoining] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [joinError, setJoinError] = useState('');
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(!audioOnly);
  const [screenOn, setScreenOn] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mediaError, setMediaError] = useState('');
  const [notes, setNotes] = useState(() => savedMeetingState.notes || '');
  const [agendaItems, setAgendaItems] = useState(() => (
    Array.isArray(savedMeetingState.agendaItems)
      ? savedMeetingState.agendaItems
      : defaultAgendaItems
  ));
  const [newAgendaItem, setNewAgendaItem] = useState('');

  const localVideoRef = useRef(null);
  const screenVideoRef = useRef(null);
  const meetingStageRef = useRef(null);
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
  const canonicalMeetingPath = `/teams/${teamId}/meeting/${roomId}${audioOnly ? '?mode=audio' : ''}`;
  const canonicalMeetingUrl = `${window.location.origin}${canonicalMeetingPath}`;

  const team = useMemo(
    () => teams.find((item) => Number(item.id) === Number(teamId)),
    [teams, teamId]
  );

  const getAuthConfig = useCallback(() => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('campusToken')}` }
  }), []);

  const updateParticipants = useCallback((data) => {
    if (Array.isArray(data?.participants)) {
      setParticipants(data.participants);
    }
  }, []);

  const fetchParticipants = useCallback(async () => {
    try {
      const response = await axios.get(
        `${API_URL}/teams/${teamId}/meetings/${roomId}/participants`,
        getAuthConfig()
      );
      updateParticipants(response.data);
    } catch (error) {
      if (![401, 403].includes(error.response?.status)) {
        console.error('Fetch meeting participants failed:', error);
      }
    }
  }, [API_URL, getAuthConfig, roomId, teamId, updateParticipants]);

  const scheduleMeetingEmail = useCallback(async () => {
    try {
      const response = await axios.post(
        `${API_URL}/teams/${teamId}/meetings`,
        {
          roomId,
          meetingUrl: canonicalMeetingUrl,
          mode: audioOnly ? 'audio' : 'video'
        },
        getAuthConfig()
      );

      if (response.data?.alreadyScheduled) {
        return;
      }

      addToast('Email invite will send in 1 minute if the meeting stays open.', 'success');
    } catch (error) {
      console.error('Schedule meeting email failed:', error);
      addToast('Joined, but the email invite could not be scheduled.', 'error');
    }
  }, [API_URL, addToast, audioOnly, canonicalMeetingUrl, getAuthConfig, roomId, teamId]);

  useEffect(() => {
    if (!isAuthenticated || !currentUser) {
      navigate('/login');
      return;
    }

    if (!team) {
      fetchTeams();
    }
  }, [currentUser, fetchTeams, isAuthenticated, navigate, team]);

  useEffect(() => {
    if (!isAuthenticated || !currentUser) return undefined;

    fetchParticipants();
    const interval = setInterval(fetchParticipants, 7000);
    return () => clearInterval(interval);
  }, [currentUser, fetchParticipants, isAuthenticated]);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify({ notes, agendaItems }));
  }, [agendaItems, notes, storageKey]);

  useEffect(() => {
    let cancelled = false;

    const startLocalMedia = async () => {
      stopStream(localStreamRef.current);
      localStreamRef.current = null;
      setMediaError('');

      if (!hasJoined) {
        if (localVideoRef.current) localVideoRef.current.srcObject = null;
        return;
      }

      if (!micOn && !cameraOn) {
        if (localVideoRef.current) localVideoRef.current.srcObject = null;
        return;
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        setMediaError('Camera and microphone are not available in this browser.');
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: micOn,
          video: cameraOn
            ? {
              width: { ideal: 1280 },
              height: { ideal: 720 }
            }
            : false
        });

        if (cancelled) {
          stopStream(stream);
          return;
        }

        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('Meeting media error:', error);
        setMediaError('Camera or microphone access is blocked. Check browser permissions.');
      }
    };

    startLocalMedia();

    return () => {
      cancelled = true;
    };
  }, [cameraOn, hasJoined, micOn]);

  useEffect(() => {
    if (!hasJoined) return undefined;

    const sendHeartbeat = async () => {
      try {
        const response = await axios.post(
          `${API_URL}/teams/${teamId}/meetings/${roomId}/heartbeat`,
          { micOn, cameraOn, screenOn },
          getAuthConfig()
        );
        updateParticipants(response.data);
      } catch (error) {
        console.error('Meeting heartbeat failed:', error);
      }
    };

    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 5000);
    return () => clearInterval(interval);
  }, [
    API_URL,
    cameraOn,
    getAuthConfig,
    hasJoined,
    micOn,
    roomId,
    screenOn,
    teamId,
    updateParticipants
  ]);

  useEffect(() => {
    if (!hasJoined) return undefined;

    const handlePageHide = () => {
      const token = localStorage.getItem('campusToken');
      if (!token) return;

      fetch(`${API_URL}/teams/${teamId}/meetings/${roomId}/leave`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: '{}',
        keepalive: true
      }).catch(() => {});
    };

    window.addEventListener('pagehide', handlePageHide);
    return () => window.removeEventListener('pagehide', handlePageHide);
  }, [API_URL, hasJoined, roomId, teamId]);

  useEffect(() => (
    () => {
      stopStream(localStreamRef.current);
      stopStream(screenStreamRef.current);
    }
  ), []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const copyMeetingLink = async () => {
    try {
      await navigator.clipboard.writeText(canonicalMeetingUrl);
      addToast('Meeting link copied', 'success');
    } catch (error) {
      console.error('Copy meeting link failed:', error);
      addToast('Failed to copy meeting link', 'error');
    }
  };

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await meetingStageRef.current?.requestFullscreen();
      }
    } catch (error) {
      console.error('Fullscreen error:', error);
      addToast('Fullscreen is not available in this browser', 'error');
    }
  };

  const joinMeeting = async () => {
    if (joining) return;

    setJoining(true);
    setJoinError('');

    try {
      const response = await axios.post(
        `${API_URL}/teams/${teamId}/meetings/${roomId}/join`,
        { micOn, cameraOn, screenOn },
        getAuthConfig()
      );

      updateParticipants(response.data);
      setHasJoined(true);

      if (isStarter) {
        await scheduleMeetingEmail();
      }
    } catch (error) {
      const message = error.response?.data?.error || 'Could not join this meeting.';
      console.error('Join meeting failed:', error);
      setJoinError(message);
      addToast(message, 'error');
    } finally {
      setJoining(false);
    }
  };

  const leaveMeetingPresence = async () => {
    if (!hasJoined) return;

    try {
      const response = await axios.post(
        `${API_URL}/teams/${teamId}/meetings/${roomId}/leave`,
        {},
        getAuthConfig()
      );
      updateParticipants(response.data);
    } catch (error) {
      console.error('Leave meeting presence failed:', error);
    }
  };

  const toggleScreenShare = async () => {
    if (!hasJoined) {
      addToast('Join the meeting before sharing your screen.', 'info');
      return;
    }

    if (screenOn) {
      stopStream(screenStreamRef.current);
      screenStreamRef.current = null;
      setScreenOn(false);
      return;
    }

    if (!navigator.mediaDevices?.getDisplayMedia) {
      addToast('Screen share is not available in this browser.', 'error');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      screenStreamRef.current = stream;
      setScreenOn(true);

      if (screenVideoRef.current) {
        screenVideoRef.current.srcObject = stream;
      }

      stream.getVideoTracks()[0].onended = () => {
        screenStreamRef.current = null;
        setScreenOn(false);
      };
    } catch (error) {
      console.error('Screen share error:', error);
      addToast('Screen share was cancelled', 'info');
    }
  };

  const addAgendaItem = () => {
    const text = newAgendaItem.trim();
    if (!text) return;

    setAgendaItems((items) => [
      ...items,
      { id: Date.now(), text, done: false }
    ]);
    setNewAgendaItem('');
  };

  const toggleAgendaItem = (itemId) => {
    setAgendaItems((items) => (
      items.map((item) => (
        item.id === itemId ? { ...item, done: !item.done } : item
      ))
    ));
  };

  const removeAgendaItem = (itemId) => {
    setAgendaItems((items) => items.filter((item) => item.id !== itemId));
  };

  const cancelPendingMeetingEmail = async () => {
    try {
      const token = localStorage.getItem('campusToken');
      await axios.post(
        `${API_URL}/teams/${teamId}/meetings/${roomId}/cancel`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (error) {
      if (error.response?.status !== 403) {
        console.error('Cancel pending meeting email failed:', error);
      }
    }
  };

  const leaveMeeting = async () => {
    await leaveMeetingPresence();
    await cancelPendingMeetingEmail();
    stopStream(localStreamRef.current);
    stopStream(screenStreamRef.current);
    localStreamRef.current = null;
    screenStreamRef.current = null;
    setHasJoined(false);
    setScreenOn(false);

    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch (error) {
        console.error('Exit fullscreen failed:', error);
      }
    }

    navigate(`/teams/${teamId}/chat`);
  };

  if (!isAuthenticated || !currentUser) {
    return null;
  }

  return (
    <div className="dashboard-container">
      <Sidebar />
      <Toast toasts={toasts} removeToast={removeToast} />

      <main className="meeting-main">
        <header className="meeting-header">
          <button className="meeting-back-btn" onClick={leaveMeeting}>
            <FaArrowLeft /> Chat
          </button>
          <div className="meeting-title-block">
            <h1>{team?.name || 'Team'} Meeting</h1>
            <p>CampusTasks room: {roomId}</p>
          </div>
          <div className="meeting-header-actions">
            <button className="meeting-secondary-btn" onClick={copyMeetingLink}>
              <FaCopy /> Copy Link
            </button>
            <button className="meeting-secondary-btn" onClick={toggleFullscreen}>
              {isFullscreen ? <FaCompress /> : <FaExpand />}
              {isFullscreen ? 'Exit Full Screen' : 'Full Screen'}
            </button>
            <button className="meeting-secondary-btn" onClick={leaveMeeting}>
              <FaComments /> Team Chat
            </button>
          </div>
        </header>

        <section className="meeting-grid">
          <div className="meeting-stage" ref={meetingStageRef}>
            {!hasJoined ? (
              <div className="meeting-lobby">
                <div className="meeting-lobby-card">
                  <div className="lobby-room-badge">{team?.name || 'Team'} room</div>
                  <div className="lobby-avatar">{getInitials(currentUser)}</div>
                  <h2>Ready to join?</h2>
                  <p>
                    Choose your mic and camera settings before entering. You will appear in
                    participants only after you join.
                  </p>

                  {participants.length > 0 && (
                    <div className="lobby-live-count">
                      {participants.length} already in this meeting
                    </div>
                  )}

                  <div className="lobby-toggles">
                    <button
                      className={`lobby-toggle ${micOn ? '' : 'off'}`}
                      onClick={() => setMicOn((value) => !value)}
                      type="button"
                    >
                      {micOn ? <FaMicrophone /> : <FaMicrophoneSlash />}
                      <span>{micOn ? 'Mic on' : 'Mic off'}</span>
                    </button>
                    <button
                      className={`lobby-toggle ${cameraOn ? '' : 'off'}`}
                      onClick={() => setCameraOn((value) => !value)}
                      type="button"
                    >
                      {cameraOn ? <FaVideo /> : <FaVideoSlash />}
                      <span>{cameraOn ? 'Camera on' : 'Camera off'}</span>
                    </button>
                  </div>

                  {joinError && <div className="lobby-error">{joinError}</div>}

                  <button
                    className="join-meeting-btn"
                    onClick={joinMeeting}
                    disabled={joining}
                    type="button"
                  >
                    {joining ? 'Joining...' : 'Join meeting'}
                  </button>
                </div>
              </div>
            ) : (
              <>
                {screenOn && (
                  <div className="screen-share-tile">
                    <video ref={screenVideoRef} autoPlay muted playsInline />
                    <div className="tile-label">Screen Share</div>
                  </div>
                )}

                <div className={`local-video-tile ${cameraOn ? '' : 'camera-off'}`}>
                  {cameraOn ? (
                    <video ref={localVideoRef} autoPlay muted playsInline />
                  ) : (
                    <div className="camera-placeholder">
                      <div className="camera-initials">
                        {getInitials(currentUser)}
                      </div>
                      <p>Camera is off</p>
                    </div>
                  )}
                  <div className="tile-label">{currentUser?.name || 'You'}</div>
                </div>

                {mediaError && (
                  <div className="meeting-alert">{mediaError}</div>
                )}

                <div className="meeting-controls" aria-label="Meeting controls">
                  <button
                    className={`meeting-control ${micOn ? '' : 'off'}`}
                    onClick={() => setMicOn((value) => !value)}
                    title={micOn ? 'Mute microphone' : 'Unmute microphone'}
                  >
                    {micOn ? <FaMicrophone /> : <FaMicrophoneSlash />}
                    <span>{micOn ? 'Mute' : 'Unmute'}</span>
                  </button>
                  <button
                    className={`meeting-control ${cameraOn ? '' : 'off'}`}
                    onClick={() => setCameraOn((value) => !value)}
                    title={cameraOn ? 'Turn camera off' : 'Turn camera on'}
                  >
                    {cameraOn ? <FaVideo /> : <FaVideoSlash />}
                    <span>{cameraOn ? 'Camera' : 'Camera Off'}</span>
                  </button>
                  <button
                    className={`meeting-control ${screenOn ? 'active' : ''}`}
                    onClick={toggleScreenShare}
                    title={screenOn ? 'Stop sharing screen' : 'Share screen'}
                  >
                    <FaDesktop />
                    <span>{screenOn ? 'Sharing' : 'Share'}</span>
                  </button>
                  <button className="meeting-control leave" onClick={leaveMeeting} title="Leave meeting">
                    <FaPhoneSlash />
                    <span>Leave</span>
                  </button>
                </div>
              </>
            )}
          </div>

          <aside className="meeting-side-panel">
            <section className="meeting-card">
              <div className="meeting-card-header">
                <h2><FaUserFriends /> Participants</h2>
                <span>{participants.length}</span>
              </div>
              <div className="meeting-participant-list">
                {participants.length === 0 && (
                  <div className="participant-empty">No one has joined this meeting yet.</div>
                )}

                {participants.map((member) => (
                  <div key={member.email || member.id} className="meeting-participant">
                    <div className="participant-avatar">{getInitials(member)}</div>
                    <div className="participant-details">
                      <div className="participant-name">{member.name || member.email || 'Teammate'}</div>
                      <div className="participant-role">{member.role || 'Member'}</div>
                      <div className="participant-status-row">
                        <span className={`participant-device-status ${member.micOn ? '' : 'off'}`}>
                          {member.micOn ? <FaMicrophone /> : <FaMicrophoneSlash />}
                          {member.micOn ? 'Mic' : 'Muted'}
                        </span>
                        <span className={`participant-device-status ${member.cameraOn ? '' : 'off'}`}>
                          {member.cameraOn ? <FaVideo /> : <FaVideoSlash />}
                          {member.cameraOn ? 'Camera' : 'No video'}
                        </span>
                        {member.screenOn && (
                          <span className="participant-device-status sharing">
                            <FaDesktop /> Sharing
                          </span>
                        )}
                      </div>
                    </div>
                    {Number(member.id) === Number(currentUser?.id) && <span className="participant-you">You</span>}
                  </div>
                ))}
              </div>
            </section>

            <section className="meeting-card">
              <div className="meeting-card-header">
                <h2>Agenda</h2>
              </div>
              <div className="agenda-list">
                {agendaItems.map((item) => (
                  <div key={item.id} className={`agenda-item ${item.done ? 'done' : ''}`}>
                    <button onClick={() => toggleAgendaItem(item.id)}>
                      {item.done ? <FaCheck /> : <FaRegCircle />}
                    </button>
                    <span>{item.text}</span>
                    <button className="agenda-delete" onClick={() => removeAgendaItem(item.id)}>
                      <FaTrash />
                    </button>
                  </div>
                ))}
              </div>
              <div className="agenda-add-row">
                <input
                  value={newAgendaItem}
                  onChange={(e) => setNewAgendaItem(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') addAgendaItem();
                  }}
                  placeholder="Add agenda item"
                />
                <button onClick={addAgendaItem}>
                  <FaPlus />
                </button>
              </div>
            </section>

            <section className="meeting-card meeting-notes-card">
              <div className="meeting-card-header">
                <h2>Notes</h2>
              </div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Write meeting notes, decisions, and follow-ups..."
              />
            </section>
          </aside>
        </section>
      </main>
    </div>
  );
}

export default TeamMeeting;
