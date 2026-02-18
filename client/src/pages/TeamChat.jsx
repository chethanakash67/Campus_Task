// client/src/pages/TeamChat.jsx - COMPLETE ENHANCED VERSION
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Toast from '../components/Toast';
import axios from 'axios';
import { 
  FaPaperPlane, FaArrowLeft, FaUsers, FaFile, 
  FaSmile, FaEllipsisV, FaReply, FaTrash, FaEdit, FaDownload, FaPhone, FaVideo, FaBookmark, FaSearch,
  FaComments
} from 'react-icons/fa';
import { useApp } from '../context/AppContext';
import './Dashboard.css';
import './TeamChat.css';

function TeamChat() {
  const { teamId } = useParams();
  const navigate = useNavigate();
  const { toasts, removeToast, currentUser, isAuthenticated, addToast } = useApp();
  
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [typing] = useState([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [team, setTeam] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [bookmarkedMessageIds, setBookmarkedMessageIds] = useState([]);
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const messageRefs = useRef({});
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
  
  // Emojis kept for chat reactions - this is intentional functionality
  const emojis = ['😀', '😂', '❤️', '👍', '🎉', '🔥', '💯', '✅', '🚀', '👏', '😍', '🤔'];

  useEffect(() => {
    if (!isAuthenticated || !currentUser) {
      navigate('/login');
      return;
    }
    
    fetchTeamData();
    fetchMessages();
    
    // Poll for new messages every 3 seconds
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [teamId, isAuthenticated, currentUser]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const storageKey = `chatBookmarks_${teamId}`;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setBookmarkedMessageIds(parsed);
      } catch (error) {
        console.error('Failed to parse saved bookmarks:', error);
      }
    }
  }, [teamId]);

  // Simulated typing indicator
  useEffect(() => {
    if (newMessage.trim()) {
      const timeout = setTimeout(() => {
        // In real app, emit typing event to socket
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [newMessage]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchTeamData = async () => {
    try {
      const token = localStorage.getItem('campusToken');
      const response = await axios.get(`${API_URL}/teams/my-teams`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const currentTeam = response.data.find(t => t.id === parseInt(teamId));
      setTeam(currentTeam);
      
      // Set online users (in real app, use WebSocket)
      if (currentTeam) {
        setOnlineUsers(currentTeam.members.map(m => ({
          ...m,
          status: Math.random() > 0.5 ? 'online' : 'offline'
        })));
      }
    } catch (error) {
      console.error('Error fetching team:', error);
    }
  };

  const fetchMessages = async () => {
    try {
      const token = localStorage.getItem('campusToken');
      const response = await axios.get(`${API_URL}/chat/team/${teamId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Add reactions to messages (extend your backend to support this)
      const messagesWithReactions = response.data.map(msg => ({
        ...msg,
        reactions: msg.reactions || {},
        isEdited: msg.is_edited || false,
        replyTo: msg.reply_to || null,
        attachments: msg.attachments || []
      }));
      
      setMessages(messagesWithReactions);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim() && !selectedFile) return;
    if (sending) return;

    try {
      setSending(true);
      const token = localStorage.getItem('campusToken');
      
      const messageData = {
        message: newMessage,
        replyTo: replyingTo?.id || null,
        attachments: selectedFile ? [selectedFile.name] : []
      };

      await axios.post(`${API_URL}/chat/team/${teamId}`, 
        messageData,
        { headers: { Authorization: `Bearer ${token}` }}
      );
      
      setNewMessage('');
      setReplyingTo(null);
      setSelectedFile(null);
      fetchMessages();
      
      // Parse @mentions and send notifications
      const mentions = newMessage.match(/@(\w+)/g);
      if (mentions) {
        addToast(`Mentioned ${mentions.length} team member(s)`, 'info');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      addToast('Failed to send message', 'error');
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (editingMessage) {
        handleEditMessage();
      } else {
        handleSend();
      }
    }
  };

  const addReaction = async (messageId, emoji) => {
    try {
      const token = localStorage.getItem('campusToken');
      const response = await axios.post(`${API_URL}/chat/team/${teamId}/react`, 
        { messageId, emoji },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      
      // Update locally
      setMessages(prev => prev.map(msg => {
        if (msg.id === messageId) {
          return { ...msg, reactions: response.data.reactions || {} };
        }
        return msg;
      }));
    } catch (error) {
      console.error('Error adding reaction:', error);
    }
  };

  const toggleBookmark = (messageId) => {
    setBookmarkedMessageIds(prev => {
      const next = prev.includes(messageId)
        ? prev.filter(id => id !== messageId)
        : [...prev, messageId];
      localStorage.setItem(`chatBookmarks_${teamId}`, JSON.stringify(next));
      return next;
    });
  };

  const jumpToMessage = (messageId) => {
    const target = messageRefs.current[messageId];
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      target.classList.add('message-highlight');
      setTimeout(() => target.classList.remove('message-highlight'), 1200);
    }
  };

  const handleExportTranscript = () => {
    try {
      const lines = messages.map(msg => {
        const ts = new Date(msg.created_at).toLocaleString();
        return `[${ts}] ${msg.user_name}: ${msg.message}`;
      });
      const content = `Team: ${team?.name || 'Team Chat'}\n\n${lines.join('\n')}`;
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${team?.name || 'team'}-chat-transcript.txt`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      addToast('Chat transcript exported', 'success');
    } catch (error) {
      console.error('Export failed:', error);
      addToast('Failed to export transcript', 'error');
    }
  };

  const postSystemLinkMessage = async (label, url) => {
    const token = localStorage.getItem('campusToken');
    await axios.post(
      `${API_URL}/chat/team/${teamId}`,
      { message: `${label}\n${url}` },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    await fetchMessages();
  };

  const handleStartMeet = async () => {
    try {
      const room = `campustasks-${teamId}-${Date.now()}`;
      const meetUrl = `https://meet.jit.si/${room}`;
      window.open(meetUrl, '_blank', 'noopener,noreferrer');
      await postSystemLinkMessage(`🎥 ${currentUser?.name || 'A teammate'} started a video meeting:`, meetUrl);
      addToast('Meet link shared in chat', 'success');
    } catch (error) {
      console.error('Error starting meeting:', error);
      addToast('Failed to create meet link', 'error');
    }
  };

  const handleStartCall = async () => {
    try {
      const room = `campustasks-audio-${teamId}-${Date.now()}`;
      const callUrl = `https://meet.jit.si/${room}#config.startWithVideoMuted=true&config.startAudioOnly=true`;
      window.open(callUrl, '_blank', 'noopener,noreferrer');
      await postSystemLinkMessage(`📞 ${currentUser?.name || 'A teammate'} started an audio call:`, callUrl);
      addToast('Call link shared in chat', 'success');
    } catch (error) {
      console.error('Error starting call:', error);
      addToast('Failed to create call link', 'error');
    }
  };

  const handleEditMessage = async () => {
    if (!editingMessage || !newMessage.trim()) return;
    
    try {
      const token = localStorage.getItem('campusToken');
      await axios.put(`${API_URL}/chat/team/${teamId}/message/${editingMessage.id}`, 
        { message: newMessage },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      
      setNewMessage('');
      setEditingMessage(null);
      fetchMessages();
    } catch (error) {
      console.error('Error editing message:', error);
      addToast('Failed to edit message', 'error');
    }
  };

  const handleDeleteMessage = async (messageId) => {
    if (!window.confirm('Delete this message?')) return;
    
    try {
      const token = localStorage.getItem('campusToken');
      await axios.delete(`${API_URL}/chat/team/${teamId}/message/${messageId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      fetchMessages();
      addToast('Message deleted', 'success');
    } catch (error) {
      console.error('Error deleting message:', error);
      addToast('Failed to delete message', 'error');
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        addToast('File size must be less than 10MB', 'error');
        return;
      }
      setSelectedFile(file);
      addToast(`File selected: ${file.name}`, 'info');
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const renderMessage = (msg, idx) => {
    const isCurrentUser = msg.user_id === currentUser?.id;
    const showAvatar = idx === 0 || messages[idx - 1].user_id !== msg.user_id;
    const replyToMsg = msg.replyTo ? messages.find(m => m.id === msg.replyTo) : null;
    const hasImageAvatar = typeof msg.avatar === 'string' &&
      (msg.avatar.startsWith('data:image/') || msg.avatar.startsWith('http://') || msg.avatar.startsWith('https://'));

    return (
      <div
        key={msg.id}
        className={`chat-message ${isCurrentUser ? 'own-message' : ''}`}
        ref={(el) => { messageRefs.current[msg.id] = el; }}
      >
        {!isCurrentUser && showAvatar && (
          <div className="message-avatar">
            {hasImageAvatar ? (
              <img src={msg.avatar} alt={msg.user_name} className="avatar-image" />
            ) : (
              msg.avatar || msg.user_name?.substring(0, 2).toUpperCase()
            )}
          </div>
        )}

        <div className="message-content-wrapper">
          {!isCurrentUser && showAvatar && (
            <div className="message-author">{msg.user_name}</div>
          )}
          
          {replyToMsg && (
            <div className="message-reply-preview">
              <FaReply style={{ fontSize: '0.7rem' }} />
              <span>Replying to {replyToMsg.user_name}: </span>
              <span className="reply-text">{replyToMsg.message.substring(0, 50)}...</span>
            </div>
          )}
          
          <div className="message-bubble">
            {msg.message}
            {msg.isEdited && <span className="edited-badge">(edited)</span>}
          </div>

          {/* Attachments */}
          {msg.attachments && msg.attachments.length > 0 && (
            <div className="message-attachments">
              {msg.attachments.map((file, idx) => (
                <div key={idx} className="attachment-item">
                  <FaFile />
                  <span>{file}</span>
                  <FaDownload style={{ cursor: 'pointer' }} />
                </div>
              ))}
            </div>
          )}

          {/* Reactions */}
          {Object.keys(msg.reactions || {}).length > 0 && (
            <div className="message-reactions">
              {Object.entries(msg.reactions).map(([emoji, count]) => (
                <div 
                  key={emoji} 
                  className="reaction-badge"
                  onClick={() => addReaction(msg.id, emoji)}
                >
                  <span>{emoji}</span>
                  <span className="reaction-count">{count}</span>
                </div>
              ))}
            </div>
          )}

          <div className="message-meta">
            <span className="message-time">{formatTime(msg.created_at)}</span>
            <FaBookmark
              onClick={() => toggleBookmark(msg.id)}
              title={bookmarkedMessageIds.includes(msg.id) ? 'Remove bookmark' : 'Bookmark message'}
              className={bookmarkedMessageIds.includes(msg.id) ? 'bookmark-icon active' : 'bookmark-icon'}
            />
            
            {isCurrentUser && (
              <div className="message-actions">
                <FaEdit 
                  onClick={() => {
                    setEditingMessage(msg);
                    setNewMessage(msg.message);
                  }}
                  title="Edit message"
                />
                <FaTrash 
                  onClick={() => handleDeleteMessage(msg.id)}
                  title="Delete message"
                />
              </div>
            )}
            
            {!isCurrentUser && (
              <FaReply 
                onClick={() => setReplyingTo(msg)}
                title="Reply to message"
                style={{ cursor: 'pointer', marginLeft: '10px' }}
              />
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <Sidebar />
        <div className="main-content">
          <p>Loading chat...</p>
        </div>
      </div>
    );
  }

  const filteredMessages = messages.filter((msg) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      msg.message?.toLowerCase().includes(q) ||
      msg.user_name?.toLowerCase().includes(q)
    );
  });

  const bookmarkedMessages = messages.filter(msg => bookmarkedMessageIds.includes(msg.id));

  return (
    <div className="dashboard-container">
      <Sidebar />
      <Toast toasts={toasts} removeToast={removeToast} />
      
      <div className="chat-layout">
        {/* Chat Sidebar */}
        <div className="chat-sidebar">
          <div className="chat-sidebar-header">
            <button onClick={() => navigate('/teams')} className="back-button">
              <FaArrowLeft /> Back
            </button>
            <h3>{team?.name || 'Team Chat'}</h3>
          </div>

          <div className="online-members-section">
            <div className="section-header">
              <FaUsers />
              <span>Members ({onlineUsers.length})</span>
            </div>
            
            {onlineUsers.map(user => (
              <div key={user.id} className="member-item">
                <div className="member-avatar-wrapper">
                  <div className="member-avatar">
                    {user.id}
                  </div>
                  <div className={`status-dot ${user.status}`} />
                </div>
                <div className="member-info">
                  <div className="member-name">{user.name}</div>
                  <div className="member-status">
                    {user.status === 'online' ? 'Active now' : 'Offline'}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="chat-tips">
            <div className="tip-header">💡 Tips</div>
            <ul>
              <li>Use @name to mention someone</li>
              <li>React with emojis to messages</li>
              <li>Share files up to 10MB</li>
            </ul>
          </div>

          {bookmarkedMessages.length > 0 && (
            <div className="bookmarks-panel">
              <div className="tip-header">📌 Bookmarks ({bookmarkedMessages.length})</div>
              {bookmarkedMessages.slice(-5).reverse().map((msg) => (
                <button
                  key={msg.id}
                  className="bookmark-jump-btn"
                  onClick={() => jumpToMessage(msg.id)}
                >
                  <span>{msg.user_name}:</span> {msg.message?.slice(0, 28) || ''}{msg.message?.length > 28 ? '...' : ''}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Main Chat Area */}
        <div className="chat-main">
          <div className="chat-header">
            <div>
              <h1><FaComments style={{ marginRight: '10px', verticalAlign: 'middle' }} />{team?.name || 'Team'} Chat</h1>
              <p>{onlineUsers.filter(u => u.status === 'online').length} online</p>
            </div>
            <div className="chat-header-actions">
              <div className="chat-search-wrap">
                <FaSearch />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search messages"
                  className="chat-search-input"
                />
              </div>
              <button className="header-action-btn" onClick={handleExportTranscript} title="Export chat transcript">
                <FaDownload /> Export
              </button>
              <button className="header-action-btn" onClick={handleStartCall} title="Start Audio Call">
                <FaPhone /> Call
              </button>
              <button className="header-action-btn meet" onClick={handleStartMeet} title="Start Video Meeting">
                <FaVideo /> Meet
              </button>
              <FaEllipsisV style={{ cursor: 'pointer' }} />
            </div>
          </div>

          <div className="messages-container">
            {filteredMessages.length === 0 ? (
              <div className="empty-chat">
                <FaUsers size={50} color="#555" />
                <p>{searchQuery ? 'No messages match your search' : 'No messages yet. Start the conversation!'}</p>
              </div>
            ) : (
              filteredMessages.map((msg, idx) => renderMessage(msg, idx))
            )}
            
            {typing.length > 0 && (
              <div className="typing-indicator">
                <div className="typing-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <span>{typing.join(', ')} {typing.length === 1 ? 'is' : 'are'} typing...</span>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          <div className="chat-input-area">
            {replyingTo && (
              <div className="replying-to-bar">
                <FaReply />
                <span>Replying to {replyingTo.user_name}</span>
                <button onClick={() => setReplyingTo(null)}>×</button>
              </div>
            )}

            {editingMessage && (
              <div className="editing-bar">
                <FaEdit />
                <span>Editing message</span>
                <button onClick={() => {
                  setEditingMessage(null);
                  setNewMessage('');
                }}>×</button>
              </div>
            )}

            {selectedFile && (
              <div className="selected-file-bar">
                <FaFile />
                <span>{selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)</span>
                <button onClick={() => setSelectedFile(null)}>×</button>
              </div>
            )}

            {showEmojiPicker && (
              <div className="emoji-picker">
                {emojis.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => {
                      setNewMessage(newMessage + emoji);
                      setShowEmojiPicker(false);
                    }}
                    className="emoji-button"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}

            <div className="input-controls">
              <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="control-btn">
                <FaSmile />
              </button>
              
              <button onClick={() => fileInputRef.current?.click()} className="control-btn">
                <FaFile />
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />

              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type a message... (Use @ to mention)"
                className="message-input"
              />

              <button 
                onClick={editingMessage ? handleEditMessage : handleSend}
                disabled={(!newMessage.trim() && !selectedFile) || sending}
                className="send-button"
              >
                {sending ? '...' : <><FaPaperPlane /> {editingMessage ? 'Update' : 'Send'}</>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TeamChat;
