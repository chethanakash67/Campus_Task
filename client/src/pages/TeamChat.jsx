import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import axios from 'axios';
import { FaPaperPlane } from 'react-icons/fa';
import './Dashboard.css';

function TeamChat() {
  const { teamId } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000); // Poll every 3 seconds
    return () => clearInterval(interval);
  }, [teamId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
    try {
      const token = localStorage.getItem('campusToken');
      const response = await axios.get(`${API_URL}/chat/team/${teamId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(response.data);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    try {
      setSending(true);
      const token = localStorage.getItem('campusToken');
      await axios.post(`${API_URL}/chat/team/${teamId}`, 
        { message: newMessage },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      setNewMessage('');
      fetchMessages();
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const currentUser = JSON.parse(localStorage.getItem('campusUser') || '{}');

  return (
    <div className="dashboard-container">
      <Sidebar />
      <main className="main-content">
        <header className="top-bar">
          <h1>💬 Team Chat</h1>
          <button className="btn btn-secondary" onClick={() => navigate('/teams')}>
            Back to Teams
          </button>
        </header>

        <div className="chat-container" style={{
          display: 'flex',
          flexDirection: 'column',
          height: 'calc(100vh - 150px)',
          backgroundColor: '#fff',
          borderRadius: '8px',
          padding: '20px'
        }}>
          <div className="messages-container" style={{
            flex: 1,
            overflowY: 'auto',
            marginBottom: '20px',
            padding: '10px'
          }}>
            {messages.map((msg) => (
              <div 
                key={msg.id} 
                style={{
                  marginBottom: '15px',
                  textAlign: msg.user_id === currentUser.id ? 'right' : 'left'
                }}
              >
                <div style={{
                  display: 'inline-block',
                  maxWidth: '70%',
                  padding: '10px 15px',
                  borderRadius: '12px',
                  backgroundColor: msg.user_id === currentUser.id ? '#646cff' : '#f0f0f0',
                  color: msg.user_id === currentUser.id ? '#fff' : '#000'
                }}>
                  {msg.user_id !== currentUser.id && (
                    <div style={{ 
                      fontSize: '0.8rem', 
                      fontWeight: 'bold', 
                      marginBottom: '5px',
                      color: '#666'
                    }}>
                      {msg.user_name}
                    </div>
                  )}
                  <div>{msg.message}</div>
                  <div style={{ 
                    fontSize: '0.7rem', 
                    marginTop: '5px',
                    opacity: 0.7
                  }}>
                    {new Date(msg.created_at).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSend} style={{ display: 'flex', gap: '10px' }}>
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #ddd'
              }}
            />
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={!newMessage.trim() || sending}
            >
              <FaPaperPlane />
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

export default TeamChat;