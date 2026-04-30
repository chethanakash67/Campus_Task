import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Circle,
  Clock,
  Copy,
  Hand,
  Info,
  Maximize2,
  MessageCircle,
  Mic,
  MicOff,
  Minimize2,
  MonitorUp,
  MoreVertical,
  PanelRightClose,
  PhoneOff,
  Plus,
  Send,
  Trash2,
  Users,
  Video,
  VideoOff,
  Wifi,
  WifiOff,
  X
} from 'lucide-react';
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

const rtcConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

const getSenderForKind = (peerConnection, kind) => (
  peerConnection.getTransceivers()
    .find((transceiver) => (
      transceiver.sender.track?.kind === kind
      || transceiver.receiver.track?.kind === kind
    ))?.sender
);

const hasLiveVideo = (stream) => (
  Boolean(stream?.getVideoTracks().some((track) => track.readyState === 'live'))
);

function MeetingVideoTile({
  stream,
  label,
  initials,
  muted = false,
  showVideo = true,
  screenSharing = false,
  status,
  micMuted = false,
  handRaised = false,
  active = false,
  local = false
}) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream || null;
    }
  }, [stream]);

  return (
    <div className={`meeting-video-tile ${showVideo ? '' : 'camera-off'} ${screenSharing ? 'screen-active' : ''} ${active ? 'active-speaker' : ''}`}>
      {stream && (
        <video
          ref={videoRef}
          autoPlay
          muted={muted}
          playsInline
          className={showVideo ? '' : 'audio-only-media'}
        />
      )}

      {!showVideo && (
        <div className="camera-placeholder compact">
          <div className="camera-initials">{initials}</div>
          <p>{status || 'Camera is off'}</p>
        </div>
      )}

      <div className="tile-status-badges">
        {micMuted && (
          <span className="tile-status-badge danger" title="Microphone muted">
            <MicOff size={14} />
          </span>
        )}
        {handRaised && (
          <span className="tile-status-badge" title="Hand raised">
            <Hand size={14} />
          </span>
        )}
      </div>

      <div className="tile-label">
        {label}{local ? ' (You)' : ''}
        {screenSharing && <span>Sharing screen</span>}
      </div>
    </div>
  );
}

function MeetingControl({ active = false, danger = false, muted = false, label, icon, onClick, title }) {
  return (
    <button
      className={`meeting-control ${active ? 'active' : ''} ${danger ? 'leave' : ''} ${muted ? 'off' : ''}`}
      onClick={onClick}
      title={title || label}
      type="button"
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

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
  const [displayName, setDisplayName] = useState(() => currentUser?.name || currentUser?.email || '');
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(!audioOnly);
  const [screenOn, setScreenOn] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activePanel, setActivePanel] = useState(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [mediaError, setMediaError] = useState('');
  const [rtcError, setRtcError] = useState('');
  const [remoteStreams, setRemoteStreams] = useState({});
  const [connectionStates, setConnectionStates] = useState({});
  const [localMediaVersion, setLocalMediaVersion] = useState(0);
  const [previewMediaVersion, setPreviewMediaVersion] = useState(0);
  const [meetingMessages, setMeetingMessages] = useState([]);
  const [meetingMessage, setMeetingMessage] = useState('');
  const [activeSpeakerId, setActiveSpeakerId] = useState(null);
  const [notes, setNotes] = useState(() => savedMeetingState.notes || '');
  const [agendaItems, setAgendaItems] = useState(() => (
    Array.isArray(savedMeetingState.agendaItems)
      ? savedMeetingState.agendaItems
      : defaultAgendaItems
  ));
  const [newAgendaItem, setNewAgendaItem] = useState('');

  const meetingStageRef = useRef(null);
  const localStreamRef = useRef(null);
  const previewStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const peerConnectionsRef = useRef(new Map());
  const pendingIceCandidatesRef = useRef(new Map());
  const offeredPeersRef = useRef(new Set());
  const lastSignalIdRef = useRef(0);
  const isLeavingRef = useRef(false);
  const audioMonitorCleanupRef = useRef(new Map());
  const audioContextRef = useRef(null);
  const activeSpeakerTimerRef = useRef(null);
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
  const canonicalMeetingPath = `/teams/${teamId}/meeting/${roomId}${audioOnly ? '?mode=audio' : ''}`;
  const canonicalMeetingUrl = `${window.location.origin}${canonicalMeetingPath}`;

  const team = useMemo(
    () => teams.find((item) => Number(item.id) === Number(teamId)),
    [teams, teamId]
  );

  const cleanDisplayName = displayName.trim() || currentUser?.name || currentUser?.email || 'You';

  const remoteParticipants = useMemo(
    () => participants
      .filter((member) => Number(member.id) !== Number(currentUser?.id))
      .sort((a, b) => {
        if (a.screenOn !== b.screenOn) return a.screenOn ? -1 : 1;
        return String(a.name || a.email || '').localeCompare(String(b.name || b.email || ''));
      }),
    [currentUser?.id, participants]
  );

  const participantTotal = remoteParticipants.length + (hasJoined ? 1 : 0);
  const visibleTileCount = participantTotal + (screenOn ? 1 : 0);

  const connectionStatus = useMemo(() => {
    if (!hasJoined) return { label: 'Lobby', level: 'idle', icon: <Wifi size={16} /> };
    if (rtcError) return { label: 'Connection issue', level: 'bad', icon: <WifiOff size={16} /> };

    const states = Object.values(connectionStates);
    if (states.some((state) => ['failed', 'disconnected'].includes(state))) {
      return { label: 'Reconnecting', level: 'bad', icon: <WifiOff size={16} /> };
    }
    if (states.some((state) => ['new', 'connecting'].includes(state))) {
      return { label: 'Connecting', level: 'warn', icon: <Wifi size={16} /> };
    }

    return { label: 'Connected', level: 'good', icon: <Wifi size={16} /> };
  }, [connectionStates, hasJoined, rtcError]);

  const formattedTime = useMemo(() => (
    now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  ), [now]);

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

  const sendSignal = useCallback(async (type, to, payload = {}) => {
    await axios.post(
      `${API_URL}/teams/${teamId}/meetings/${roomId}/signals`,
      { type, to, payload },
      getAuthConfig()
    );
  }, [API_URL, getAuthConfig, roomId, teamId]);

  const getOutgoingVideoTrack = useCallback(() => {
    const screenTrack = screenStreamRef.current?.getVideoTracks()?.[0];
    if (screenTrack && screenTrack.readyState === 'live') return screenTrack;

    const cameraTrack = localStreamRef.current?.getVideoTracks()?.[0];
    return cameraTrack && cameraTrack.readyState === 'live' ? cameraTrack : null;
  }, []);

  const syncPeerSenders = useCallback(async (peerConnection) => {
    if (!peerConnection || peerConnection.connectionState === 'closed') return;

    const audioTrack = localStreamRef.current?.getAudioTracks()?.[0] || null;
    const videoTrack = getOutgoingVideoTrack();
    const audioSender = getSenderForKind(peerConnection, 'audio');
    const videoSender = getSenderForKind(peerConnection, 'video');

    try {
      if (audioSender) await audioSender.replaceTrack(audioTrack);
      if (videoSender) await videoSender.replaceTrack(videoTrack);
    } catch (error) {
      console.error('Failed to sync meeting tracks:', error);
    }
  }, [getOutgoingVideoTrack]);

  const syncAllPeerSenders = useCallback(() => {
    peerConnectionsRef.current.forEach((peerConnection) => {
      syncPeerSenders(peerConnection);
    });
  }, [syncPeerSenders]);

  const addMeetingMessage = useCallback((message) => {
    if (!message?.id || !message?.text) return;

    setMeetingMessages((messages) => {
      if (messages.some((item) => item.id === message.id)) return messages;
      return [...messages, message].slice(-80);
    });
  }, []);

  const cleanupPeer = useCallback((peerId) => {
    const peerKey = String(peerId);
    const peerConnection = peerConnectionsRef.current.get(peerKey);

    if (peerConnection) {
      peerConnection.onicecandidate = null;
      peerConnection.ontrack = null;
      peerConnection.onconnectionstatechange = null;
      peerConnection.close();
      peerConnectionsRef.current.delete(peerKey);
    }

    pendingIceCandidatesRef.current.delete(peerKey);
    offeredPeersRef.current.delete(peerKey);
    setRemoteStreams((streams) => {
      const next = { ...streams };
      delete next[peerKey];
      return next;
    });
    setConnectionStates((states) => {
      const next = { ...states };
      delete next[peerKey];
      return next;
    });
  }, []);

  const flushPendingIceCandidates = useCallback(async (peerId, peerConnection) => {
    const peerKey = String(peerId);
    const pending = pendingIceCandidatesRef.current.get(peerKey) || [];
    if (!pending.length || !peerConnection.remoteDescription) return;

    pendingIceCandidatesRef.current.delete(peerKey);

    for (const candidate of pending) {
      try {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.error('Failed to add queued ICE candidate:', error);
      }
    }
  }, []);

  const createPeerConnection = useCallback((peerId) => {
    const peerKey = String(peerId);
    const existing = peerConnectionsRef.current.get(peerKey);
    if (existing) return existing;

    const peerConnection = new RTCPeerConnection(rtcConfig);
    peerConnection.addTransceiver('audio', { direction: 'sendrecv' });
    peerConnection.addTransceiver('video', { direction: 'sendrecv' });

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal('ice-candidate', Number(peerId), event.candidate.toJSON()).catch((error) => {
          console.error('Failed to send ICE candidate:', error);
        });
      }
    };

    peerConnection.ontrack = (event) => {
      setRemoteStreams((streams) => {
        const existingStream = streams[peerKey];
        const nextStream = event.streams?.[0] || new MediaStream(existingStream?.getTracks() || []);

        if (!nextStream.getTracks().some((track) => track.id === event.track.id)) {
          nextStream.addTrack(event.track);
        }

        return {
          ...streams,
          [peerKey]: nextStream
        };
      });
    };

    peerConnection.onconnectionstatechange = () => {
      setConnectionStates((states) => ({
        ...states,
        [peerKey]: peerConnection.connectionState
      }));

      if (['failed', 'closed', 'disconnected'].includes(peerConnection.connectionState)) {
        setTimeout(() => {
          if (peerConnection.connectionState !== 'connected') {
            cleanupPeer(peerKey);
          }
        }, 5000);
      }
    };

    peerConnectionsRef.current.set(peerKey, peerConnection);
    syncPeerSenders(peerConnection);
    return peerConnection;
  }, [cleanupPeer, sendSignal, syncPeerSenders]);

  const createOfferForPeer = useCallback(async (peerId, force = false) => {
    const peerKey = String(peerId);
    if (!force && offeredPeersRef.current.has(peerKey)) return;

    const peerConnection = createPeerConnection(peerId);
    if (peerConnection.signalingState !== 'stable') return;

    try {
      offeredPeersRef.current.add(peerKey);
      await syncPeerSenders(peerConnection);
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      await sendSignal('offer', Number(peerId), peerConnection.localDescription);
    } catch (error) {
      offeredPeersRef.current.delete(peerKey);
      console.error('Failed to create meeting offer:', error);
      setRtcError('Could not connect to one participant. Try rejoining the meeting.');
    }
  }, [createPeerConnection, sendSignal, syncPeerSenders]);

  const handleSignal = useCallback(async (signal) => {
    const fromId = Number(signal.from);
    if (!fromId || fromId === Number(currentUser?.id)) return;

    if (signal.type === 'peer-left') {
      cleanupPeer(fromId);
      return;
    }

    if (signal.type === 'chat-message') {
      addMeetingMessage({
        id: signal.payload?.id || `${signal.id}`,
        senderId: fromId,
        senderName: signal.payload?.senderName || 'Teammate',
        text: signal.payload?.text || '',
        createdAt: signal.payload?.createdAt || signal.createdAt
      });
      return;
    }

    const peerConnection = createPeerConnection(fromId);

    try {
      if (signal.type === 'offer') {
        if (peerConnection.signalingState !== 'stable') {
          await peerConnection.setLocalDescription({ type: 'rollback' }).catch(() => {});
        }

        await peerConnection.setRemoteDescription(new RTCSessionDescription(signal.payload));
        await flushPendingIceCandidates(fromId, peerConnection);
        await syncPeerSenders(peerConnection);
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        await sendSignal('answer', fromId, peerConnection.localDescription);
      } else if (signal.type === 'answer') {
        if (peerConnection.signalingState !== 'stable') {
          await peerConnection.setRemoteDescription(new RTCSessionDescription(signal.payload));
          await flushPendingIceCandidates(fromId, peerConnection);
        }
      } else if (signal.type === 'ice-candidate') {
        if (peerConnection.remoteDescription) {
          await peerConnection.addIceCandidate(new RTCIceCandidate(signal.payload));
        } else {
          const peerKey = String(fromId);
          const pending = pendingIceCandidatesRef.current.get(peerKey) || [];
          pending.push(signal.payload);
          pendingIceCandidatesRef.current.set(peerKey, pending);
        }
      } else if (signal.type === 'renegotiate') {
        await createOfferForPeer(fromId, true);
      }
    } catch (error) {
      console.error('Meeting signal handling failed:', error);
      setRtcError('A media connection failed. Ask the teammate to rejoin if their tile stays blank.');
    }
  }, [
    addMeetingMessage,
    cleanupPeer,
    createOfferForPeer,
    createPeerConnection,
    currentUser?.id,
    flushPendingIceCandidates,
    sendSignal,
    syncPeerSenders
  ]);

  const stopAudioMonitor = useCallback((speakerId) => {
    const cleanup = audioMonitorCleanupRef.current.get(String(speakerId));
    if (cleanup) cleanup();
    audioMonitorCleanupRef.current.delete(String(speakerId));
  }, []);

  const startAudioMonitor = useCallback((speakerId, stream) => {
    const speakerKey = String(speakerId);
    stopAudioMonitor(speakerKey);

    const audioTrack = stream?.getAudioTracks?.()[0];
    if (!audioTrack || audioTrack.readyState !== 'live') return;

    try {
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new AudioContext();
      }

      const audioContext = audioContextRef.current;
      const source = audioContext.createMediaStreamSource(new MediaStream([audioTrack]));
      const analyser = audioContext.createAnalyser();
      const data = new Uint8Array(analyser.frequencyBinCount);
      let rafId;

      analyser.fftSize = 256;
      source.connect(analyser);

      const readLevel = () => {
        analyser.getByteFrequencyData(data);
        const average = data.reduce((sum, value) => sum + value, 0) / data.length;

        if (average > 18) {
          setActiveSpeakerId(speakerKey);
          clearTimeout(activeSpeakerTimerRef.current);
          activeSpeakerTimerRef.current = setTimeout(() => {
            setActiveSpeakerId((current) => (current === speakerKey ? null : current));
          }, 1500);
        }

        rafId = requestAnimationFrame(readLevel);
      };

      readLevel();
      audioMonitorCleanupRef.current.set(speakerKey, () => {
        cancelAnimationFrame(rafId);
        source.disconnect();
        analyser.disconnect();
      });
    } catch (error) {
      console.error('Audio speaker detection failed:', error);
    }
  }, [stopAudioMonitor]);

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
    if (!displayName && currentUser) {
      setDisplayName(currentUser.name || currentUser.email || '');
    }
  }, [currentUser, displayName]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !currentUser) return undefined;

    fetchParticipants();
    const interval = setInterval(fetchParticipants, hasJoined ? 3000 : 7000);
    return () => clearInterval(interval);
  }, [currentUser, fetchParticipants, hasJoined, isAuthenticated]);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify({ notes, agendaItems }));
  }, [agendaItems, notes, storageKey]);

  useEffect(() => {
    let cancelled = false;

    const startPreview = async () => {
      stopStream(previewStreamRef.current);
      previewStreamRef.current = null;
      setPreviewMediaVersion((version) => version + 1);

      if (hasJoined || (!micOn && !cameraOn)) return;

      if (!navigator.mediaDevices?.getUserMedia) {
        setMediaError('Camera and microphone are not available in this browser.');
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: micOn,
          video: cameraOn
            ? {
              width: { ideal: 960 },
              height: { ideal: 540 }
            }
            : false
        });

        if (cancelled) {
          stopStream(stream);
          return;
        }

        previewStreamRef.current = stream;
        setPreviewMediaVersion((version) => version + 1);
      } catch (error) {
        console.error('Preview media error:', error);
        setMediaError('Camera or microphone access is blocked. Check browser permissions.');
      }
    };

    startPreview();

    return () => {
      cancelled = true;
      stopStream(previewStreamRef.current);
      previewStreamRef.current = null;
    };
  }, [cameraOn, hasJoined, micOn]);

  useEffect(() => {
    let cancelled = false;

    const startLocalMedia = async () => {
      stopStream(localStreamRef.current);
      localStreamRef.current = null;
      setMediaError('');

      if (!hasJoined) {
        return;
      }

      if (!micOn && !cameraOn) {
        syncAllPeerSenders();
        setLocalMediaVersion((version) => version + 1);
        return;
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        setMediaError('Camera and microphone are not available in this browser.');
        syncAllPeerSenders();
        setLocalMediaVersion((version) => version + 1);
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
        syncAllPeerSenders();
        setLocalMediaVersion((version) => version + 1);
      } catch (error) {
        console.error('Meeting media error:', error);
        setMediaError('Camera or microphone access is blocked. Check browser permissions.');
        syncAllPeerSenders();
        setLocalMediaVersion((version) => version + 1);
      }
    };

    startLocalMedia();

    return () => {
      cancelled = true;
    };
  }, [cameraOn, hasJoined, micOn, syncAllPeerSenders]);

  useEffect(() => {
    if (!hasJoined) return undefined;

    const sendHeartbeat = async () => {
      try {
        const response = await axios.post(
          `${API_URL}/teams/${teamId}/meetings/${roomId}/heartbeat`,
          { micOn, cameraOn, screenOn, handRaised, displayName: cleanDisplayName },
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
    cleanDisplayName,
    getAuthConfig,
    handRaised,
    hasJoined,
    micOn,
    roomId,
    screenOn,
    teamId,
    updateParticipants
  ]);

  useEffect(() => {
    if (!hasJoined || !currentUser?.id) return undefined;

    startAudioMonitor(currentUser.id, localStreamRef.current);
    return () => stopAudioMonitor(currentUser.id);
  }, [currentUser?.id, hasJoined, localMediaVersion, startAudioMonitor, stopAudioMonitor]);

  useEffect(() => {
    if (!hasJoined) return undefined;

    Object.entries(remoteStreams).forEach(([peerId, stream]) => {
      startAudioMonitor(peerId, stream);
    });

    return () => {
      Object.keys(remoteStreams).forEach((peerId) => stopAudioMonitor(peerId));
    };
  }, [hasJoined, remoteStreams, startAudioMonitor, stopAudioMonitor]);

  useEffect(() => {
    if (!hasJoined || !currentUser?.id) return;

    const myId = Number(currentUser.id);
    const livePeerIds = new Set(remoteParticipants.map((member) => String(member.id)));

    peerConnectionsRef.current.forEach((_, peerId) => {
      if (!livePeerIds.has(peerId)) {
        cleanupPeer(peerId);
      }
    });

    remoteParticipants.forEach((member) => {
      const peerId = Number(member.id);
      createPeerConnection(peerId);

      if (myId < peerId) {
        createOfferForPeer(peerId);
      }
    });
  }, [
    cleanupPeer,
    createOfferForPeer,
    createPeerConnection,
    currentUser?.id,
    hasJoined,
    remoteParticipants
  ]);

  useEffect(() => {
    if (!hasJoined) return undefined;

    let cancelled = false;

    const pollSignals = async () => {
      try {
        const response = await axios.get(
          `${API_URL}/teams/${teamId}/meetings/${roomId}/signals`,
          {
            ...getAuthConfig(),
            params: { after: lastSignalIdRef.current }
          }
        );

        const signals = Array.isArray(response.data?.signals) ? response.data.signals : [];
        for (const signal of signals) {
          if (cancelled) return;
          lastSignalIdRef.current = Math.max(lastSignalIdRef.current, Number(signal.id || 0));
          await handleSignal(signal);
        }

        if (typeof response.data?.latestId === 'number') {
          lastSignalIdRef.current = Math.max(lastSignalIdRef.current, response.data.latestId);
        }
      } catch (error) {
        if (!isLeavingRef.current) {
          console.error('Meeting signal polling failed:', error);
        }
      }
    };

    pollSignals();
    const interval = setInterval(pollSignals, 1200);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [API_URL, getAuthConfig, handleSignal, hasJoined, roomId, teamId]);

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
      peerConnectionsRef.current.forEach((peerConnection) => peerConnection.close());
      peerConnectionsRef.current.clear();
      pendingIceCandidatesRef.current.clear();
      offeredPeersRef.current.clear();
      audioMonitorCleanupRef.current.forEach((cleanup) => cleanup());
      audioMonitorCleanupRef.current.clear();
      audioContextRef.current?.close?.();
      clearTimeout(activeSpeakerTimerRef.current);
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

  const togglePanel = (panel) => {
    setActivePanel((current) => (current === panel ? null : panel));
    setMoreOpen(false);
  };

  const sendMeetingMessage = async () => {
    const text = meetingMessage.trim();
    if (!text) return;

    const message = {
      id: `${currentUser?.id || 'me'}-${Date.now()}`,
      senderId: Number(currentUser?.id),
      senderName: cleanDisplayName,
      text,
      createdAt: new Date().toISOString()
    };

    addMeetingMessage(message);
    setMeetingMessage('');

    try {
      await sendSignal('chat-message', null, message);
    } catch (error) {
      console.error('Send meeting message failed:', error);
      addToast('Message could not be sent in meeting chat', 'error');
    }
  };

  const joinMeeting = async () => {
    if (joining) return;

    setJoining(true);
    setJoinError('');

    try {
      const response = await axios.post(
        `${API_URL}/teams/${teamId}/meetings/${roomId}/join`,
        { micOn, cameraOn, screenOn, handRaised, displayName: cleanDisplayName },
        getAuthConfig()
      );

      updateParticipants(response.data);
      lastSignalIdRef.current = Number(response.data?.signalCursor || 0);
      setHasJoined(true);
      setRtcError('');

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
      syncAllPeerSenders();
      setLocalMediaVersion((version) => version + 1);
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
      syncAllPeerSenders();
      setLocalMediaVersion((version) => version + 1);

      stream.getVideoTracks()[0].onended = () => {
        screenStreamRef.current = null;
        setScreenOn(false);
        syncAllPeerSenders();
        setLocalMediaVersion((version) => version + 1);
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
    isLeavingRef.current = true;
    await leaveMeetingPresence();
    await cancelPendingMeetingEmail();
    stopStream(localStreamRef.current);
    stopStream(screenStreamRef.current);
    localStreamRef.current = null;
    screenStreamRef.current = null;
    peerConnectionsRef.current.forEach((peerConnection) => peerConnection.close());
    peerConnectionsRef.current.clear();
    pendingIceCandidatesRef.current.clear();
    offeredPeersRef.current.clear();
    audioMonitorCleanupRef.current.forEach((cleanup) => cleanup());
    audioMonitorCleanupRef.current.clear();
    clearTimeout(activeSpeakerTimerRef.current);
    setRemoteStreams({});
    setConnectionStates({});
    setActiveSpeakerId(null);
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
    <div className="dashboard-container meeting-shell">
      <Toast toasts={toasts} removeToast={removeToast} />

      <main className="meeting-main">
        <header className="meeting-topbar">
          <button className="meeting-back-btn" onClick={leaveMeeting} type="button">
            <ArrowLeft size={17} /> Chat
          </button>
          <div className="meeting-title-block">
            <h1>{team?.name || 'Team'} Meeting</h1>
            <p>{roomId}</p>
          </div>
          <div className="meeting-top-meta">
            <span><Clock size={16} /> {formattedTime}</span>
            <span className={`connection-pill ${connectionStatus.level}`}>
              {connectionStatus.icon} {connectionStatus.label}
            </span>
          </div>
        </header>

        <section className={`meeting-layout ${activePanel ? 'with-panel' : ''}`}>
          <div className="meeting-stage" ref={meetingStageRef}>
            {!hasJoined ? (
              <div className="meeting-prejoin">
                <div className="prejoin-preview-card">
                  <MeetingVideoTile
                    key={`preview-${previewMediaVersion}`}
                    stream={previewStreamRef.current}
                    muted
                    showVideo={cameraOn && hasLiveVideo(previewStreamRef.current)}
                    label={cleanDisplayName}
                    initials={getInitials({ name: cleanDisplayName, email: currentUser?.email })}
                    micMuted={!micOn}
                    status={cameraOn ? 'Camera preview' : 'Camera is off'}
                    local
                  />

                  <div className="prejoin-preview-controls">
                    <button
                      className={`round-prejoin-control ${micOn ? '' : 'off'}`}
                      onClick={() => setMicOn((value) => !value)}
                      type="button"
                      title={micOn ? 'Mute microphone' : 'Unmute microphone'}
                    >
                      {micOn ? <Mic size={20} /> : <MicOff size={20} />}
                    </button>
                    <button
                      className={`round-prejoin-control ${cameraOn ? '' : 'off'}`}
                      onClick={() => setCameraOn((value) => !value)}
                      type="button"
                      title={cameraOn ? 'Turn camera off' : 'Turn camera on'}
                    >
                      {cameraOn ? <Video size={20} /> : <VideoOff size={20} />}
                    </button>
                  </div>
                </div>

                <div className="meeting-lobby-card">
                  <div className="lobby-room-badge">{team?.name || 'Team'} room</div>
                  <h2>Ready to join?</h2>
                  <p>Check your camera and microphone before entering the meeting.</p>

                  <label className="prejoin-name-field">
                    <span>Your display name</span>
                    <input
                      value={displayName}
                      onChange={(event) => setDisplayName(event.target.value)}
                      placeholder="Enter your name"
                    />
                  </label>

                  {participants.length > 0 && (
                    <div className="lobby-live-count">{participants.length} already in this meeting</div>
                  )}

                  {joinError && <div className="lobby-error">{joinError}</div>}

                  <button className="join-meeting-btn" onClick={joinMeeting} disabled={joining} type="button">
                    {joining ? 'Joining...' : 'Join meeting'}
                  </button>
                </div>
              </div>
            ) : (
              <>
                {screenOn && (
                  <div className="presenting-banner">
                    <MonitorUp size={16} />
                    You are presenting
                  </div>
                )}

                <div className={`meeting-video-grid count-${Math.min(visibleTileCount, 6)}`}>
                  {screenOn && (
                    <MeetingVideoTile
                      key={`local-screen-${localMediaVersion}`}
                      stream={screenStreamRef.current}
                      muted
                      showVideo={hasLiveVideo(screenStreamRef.current)}
                      label={`${currentUser?.name || 'You'} screen`}
                      initials={getInitials(currentUser)}
                      screenSharing
                      local
                      micMuted={!micOn}
                      handRaised={handRaised}
                      active={activeSpeakerId === String(currentUser?.id)}
                      status="Sharing screen"
                    />
                  )}

                  <MeetingVideoTile
                    key={`local-camera-${localMediaVersion}`}
                    stream={localStreamRef.current}
                    muted
                    showVideo={cameraOn && hasLiveVideo(localStreamRef.current)}
                    label={`${currentUser?.name || 'You'}${screenOn ? ' camera' : ''}`}
                    initials={getInitials(currentUser)}
                    local
                    micMuted={!micOn}
                    handRaised={handRaised}
                    active={activeSpeakerId === String(currentUser?.id)}
                    status={micOn ? 'Camera is off' : 'Mic and camera are off'}
                  />

                  {remoteParticipants.map((member) => {
                    const peerKey = String(member.id);
                    const remoteStream = remoteStreams[peerKey];
                    const connectionState = connectionStates[peerKey];
                    const showRemoteVideo = Boolean((member.cameraOn || member.screenOn) && hasLiveVideo(remoteStream));

                    return (
                      <MeetingVideoTile
                        key={peerKey}
                        stream={remoteStream}
                        showVideo={showRemoteVideo}
                        label={member.name || member.email || 'Teammate'}
                        initials={getInitials(member)}
                        screenSharing={Boolean(member.screenOn)}
                        micMuted={!member.micOn}
                        handRaised={Boolean(member.handRaised)}
                        active={activeSpeakerId === peerKey}
                        status={
                          connectionState === 'connecting'
                            ? 'Connecting...'
                            : member.cameraOn || member.screenOn
                              ? 'Waiting for video'
                              : member.micOn
                                ? 'Audio only'
                                : 'Muted'
                        }
                      />
                    );
                  })}
                </div>

                {mediaError && (
                  <div className="meeting-alert">{mediaError}</div>
                )}
                {rtcError && (
                  <div className="meeting-alert">{rtcError}</div>
                )}
              </>
            )}
          </div>

          {activePanel && (
            <aside className="meeting-side-panel">
              <div className="meeting-panel-header">
                <div className="meeting-panel-tabs">
                  <button
                    className={activePanel === 'chat' ? 'active' : ''}
                    onClick={() => setActivePanel('chat')}
                    type="button"
                  >
                    <MessageCircle size={16} /> Chat
                  </button>
                  <button
                    className={activePanel === 'participants' ? 'active' : ''}
                    onClick={() => setActivePanel('participants')}
                    type="button"
                  >
                    <Users size={16} /> People
                  </button>
                  <button
                    className={activePanel === 'details' ? 'active' : ''}
                    onClick={() => setActivePanel('details')}
                    type="button"
                  >
                    <Info size={16} /> Details
                  </button>
                </div>
                <button className="panel-close-btn" onClick={() => setActivePanel(null)} type="button">
                  <PanelRightClose size={18} />
                </button>
              </div>

              {activePanel === 'chat' && (
                <section className="meeting-card meeting-chat-panel">
                  <div className="meeting-card-header">
                    <h2><MessageCircle size={17} /> Meeting chat</h2>
                  </div>
                  <div className="meeting-chat-list">
                    {meetingMessages.length === 0 && (
                      <div className="participant-empty">No meeting messages yet.</div>
                    )}
                    {meetingMessages.map((message) => (
                      <div
                        key={message.id}
                        className={`meeting-chat-message ${Number(message.senderId) === Number(currentUser?.id) ? 'mine' : ''}`}
                      >
                        <div className="meeting-chat-meta">
                          <strong>{Number(message.senderId) === Number(currentUser?.id) ? 'You' : message.senderName}</strong>
                          <span>{new Date(message.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
                        </div>
                        <p>{message.text}</p>
                      </div>
                    ))}
                  </div>
                  <div className="meeting-chat-compose">
                    <input
                      value={meetingMessage}
                      onChange={(event) => setMeetingMessage(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') sendMeetingMessage();
                      }}
                      placeholder="Send a message"
                    />
                    <button onClick={sendMeetingMessage} type="button">
                      <Send size={16} />
                    </button>
                  </div>
                </section>
              )}

              {activePanel === 'participants' && (
                <section className="meeting-card">
                  <div className="meeting-card-header">
                    <h2><Users size={17} /> Participants</h2>
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
                              {member.micOn ? <Mic size={11} /> : <MicOff size={11} />}
                              {member.micOn ? 'Mic' : 'Muted'}
                            </span>
                            <span className={`participant-device-status ${member.cameraOn ? '' : 'off'}`}>
                              {member.cameraOn ? <Video size={11} /> : <VideoOff size={11} />}
                              {member.cameraOn ? 'Camera' : 'No video'}
                            </span>
                            {member.handRaised && (
                              <span className="participant-device-status sharing">
                                <Hand size={11} /> Raised
                              </span>
                            )}
                            {member.screenOn && (
                              <span className="participant-device-status sharing">
                                <MonitorUp size={11} /> Sharing
                              </span>
                            )}
                          </div>
                        </div>
                        {Number(member.id) === Number(currentUser?.id) && <span className="participant-you">You</span>}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {activePanel === 'details' && (
                <section className="meeting-card meeting-details-panel">
                  <div className="meeting-card-header">
                    <h2><Info size={17} /> Meeting details</h2>
                  </div>
                  <div className="meeting-detail-row">
                    <span>Team</span>
                    <strong>{team?.name || 'Team'}</strong>
                  </div>
                  <div className="meeting-detail-row">
                    <span>Room code</span>
                    <strong>{roomId}</strong>
                  </div>
                  <button className="meeting-detail-copy" onClick={copyMeetingLink} type="button">
                    <Copy size={16} /> Copy meeting link
                  </button>

                  <div className="details-divider" />

                  <div className="meeting-card-header compact">
                    <h2>Agenda</h2>
                  </div>
                  <div className="agenda-list">
                    {agendaItems.map((item) => (
                      <div key={item.id} className={`agenda-item ${item.done ? 'done' : ''}`}>
                        <button onClick={() => toggleAgendaItem(item.id)} type="button">
                          {item.done ? <Check size={14} /> : <Circle size={14} />}
                        </button>
                        <span>{item.text}</span>
                        <button className="agenda-delete" onClick={() => removeAgendaItem(item.id)} type="button">
                          <Trash2 size={14} />
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
                    <button onClick={addAgendaItem} type="button">
                      <Plus size={14} />
                    </button>
                  </div>

                  <div className="details-divider" />

                  <div className="meeting-card-header compact">
                    <h2>Notes</h2>
                  </div>
                  <textarea
                    className="meeting-notes-input"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Write meeting notes, decisions, and follow-ups..."
                  />
                </section>
              )}
            </aside>
          )}
        </section>

        {hasJoined && (
          <footer className="meeting-bottom-bar">
            <div className="meeting-bottom-left">
              <span>{formattedTime}</span>
              <button onClick={copyMeetingLink} type="button">
                <Copy size={15} /> {roomId}
              </button>
            </div>

            <div className="meeting-controls" aria-label="Meeting controls">
              <MeetingControl
                muted={!micOn}
                label={micOn ? 'Mute' : 'Unmute'}
                icon={micOn ? <Mic size={21} /> : <MicOff size={21} />}
                onClick={() => setMicOn((value) => !value)}
              />
              <MeetingControl
                muted={!cameraOn}
                label={cameraOn ? 'Camera' : 'Camera Off'}
                icon={cameraOn ? <Video size={21} /> : <VideoOff size={21} />}
                onClick={() => setCameraOn((value) => !value)}
              />
              <MeetingControl
                active={screenOn}
                label={screenOn ? 'Presenting' : 'Present'}
                icon={<MonitorUp size={21} />}
                onClick={toggleScreenShare}
              />
              <MeetingControl
                active={handRaised}
                label={handRaised ? 'Lower Hand' : 'Raise Hand'}
                icon={<Hand size={21} />}
                onClick={() => setHandRaised((value) => !value)}
              />
              <MeetingControl
                active={activePanel === 'chat'}
                label="Chat"
                icon={<MessageCircle size={21} />}
                onClick={() => togglePanel('chat')}
              />
              <MeetingControl
                active={activePanel === 'participants'}
                label="People"
                icon={<Users size={21} />}
                onClick={() => togglePanel('participants')}
              />
              <div className="meeting-more-wrap">
                <MeetingControl
                  active={moreOpen}
                  label="More"
                  icon={<MoreVertical size={21} />}
                  onClick={() => setMoreOpen((value) => !value)}
                />
                {moreOpen && (
                  <div className="meeting-more-menu">
                    <button onClick={toggleFullscreen} type="button">
                      {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                      {isFullscreen ? 'Exit full screen' : 'Full screen'}
                    </button>
                    <button onClick={() => togglePanel('details')} type="button">
                      <Info size={16} /> Meeting details
                    </button>
                    <button onClick={copyMeetingLink} type="button">
                      <Copy size={16} /> Copy link
                    </button>
                  </div>
                )}
              </div>
              <MeetingControl
                danger
                label="Leave"
                icon={<PhoneOff size={21} />}
                onClick={leaveMeeting}
              />
            </div>

            <div className="meeting-bottom-right">
              <button
                className={activePanel ? 'active' : ''}
                onClick={() => setActivePanel((panel) => (panel ? null : 'participants'))}
                type="button"
              >
                {activePanel ? <X size={18} /> : <ChevronDown size={18} />}
              </button>
            </div>
          </footer>
        )}
      </main>
    </div>
  );
}

export default TeamMeeting;
