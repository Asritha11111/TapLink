// src/pages/ConversationPage.jsx — Real-time chat view
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import { useAuth } from '../context/AuthContext';
import { getSocket } from '../services/socket';
import api from '../services/api';
import '../styles/Conversation.css';

export default function ConversationPage() {
  const { conversationId } = useParams();
  const { user }  = useAuth();
  const navigate  = useNavigate();
  const bottomRef = useRef(null);

  const [messages,  setMessages]  = useState([]);
  const [other,     setOther]     = useState(null);
  const [body,      setBody]      = useState('');
  const [loading,   setLoading]   = useState(true);
  const [sending,   setSending]   = useState(false);
  const [error,     setError]     = useState('');
  const [typing,    setTyping]    = useState(false);
  const typingTimer = useRef(null);

  // ─── Load messages ──────────────────────────────────────────────────────────
  const loadMessages = useCallback(async () => {
    try {
      const [msgRes, convRes] = await Promise.all([
        api.get(`/conversations/${conversationId}/messages`),
        api.get('/conversations'),
      ]);
      setMessages(msgRes.data.messages || []);
      const conv = convRes.data.conversations?.find((c) => c.id === conversationId);
      if (conv) {
        const o = conv.participants?.find((p) => p.user?.id !== user?.id)?.user;
        setOther(o);
      }
    } catch {
      setError('Failed to load conversation');
    } finally {
      setLoading(false);
    }
  }, [conversationId, user]);

  useEffect(() => { loadMessages(); }, [loadMessages]);

  // ─── Socket.IO: join room + listen for new messages ─────────────────────────
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    socket.emit('conversation:join', { conversationId });

    const handleNew = ({ message }) => {
      setMessages((ms) => {
        if (ms.some((m) => m.id === message.id)) return ms;
        return [...ms, message];
      });
    };

    const handleTypingStart = ({ userId }) => {
      if (userId !== user?.id) setTyping(true);
    };
    const handleTypingStop  = ({ userId }) => {
      if (userId !== user?.id) setTyping(false);
    };

    socket.on('message:new',   handleNew);
    socket.on('typing:start',  handleTypingStart);
    socket.on('typing:stop',   handleTypingStop);

    return () => {
      socket.emit('conversation:leave', { conversationId });
      socket.off('message:new',  handleNew);
      socket.off('typing:start', handleTypingStart);
      socket.off('typing:stop',  handleTypingStop);
    };
  }, [conversationId, user]);

  // ─── Scroll to bottom on new messages ───────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  // ─── Send message ────────────────────────────────────────────────────────────
  async function handleSend(e) {
    e.preventDefault();
    if (!body.trim() || sending) return;
    const text = body.trim();
    setBody('');
    setSending(true);
    setError('');
    try {
      const { data } = await api.post(`/conversations/${conversationId}/messages`, { body: text });
      setMessages((ms) => {
        if (ms.some((m) => m.id === data.message.id)) return ms;
        return [...ms, data.message];
      });
    } catch {
      setError('Failed to send message');
      setBody(text);
    } finally {
      setSending(false);
    }
  }

  // ─── Typing indicator emission ───────────────────────────────────────────────
  function handleInputChange(e) {
    setBody(e.target.value);
    const socket = getSocket();
    if (!socket) return;
    socket.emit('typing:start', { conversationId });
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      socket.emit('typing:stop', { conversationId });
    }, 1200);
  }

  function formatTime(ts) {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function initials(name = '') {
    return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
  }

  return (
    <AppLayout>
      {/* Header */}
      <div className="conv-header">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/messages')}>← Back</button>
        {other && (
          <div className="flex items-center gap-sm">
            <div className="avatar avatar-sm">{initials(other.name)}</div>
            <span style={{ fontWeight: 600 }}>{other.name}</span>
          </div>
        )}
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 12 }}>{error}</div>}

      {/* Messages */}
      <div className="conv-messages">
        {loading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : messages.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">💬</div><p>No messages yet. Say hello!</p></div>
        ) : (
          messages.map((msg) => {
            const mine = msg.senderId === user?.id || msg.sender?.id === user?.id;
            return (
              <div key={msg.id} className={`msg-row ${mine ? 'mine' : 'theirs'}`}>
                {!mine && (
                  <div className="avatar avatar-sm" style={{ flexShrink: 0 }}>
                    {initials(msg.sender?.name)}
                  </div>
                )}
                <div className={`msg-bubble ${mine ? 'mine' : 'theirs'}`}>
                  <div className="msg-body">{msg.body}</div>
                  <div className="msg-time">{formatTime(msg.createdAt)}</div>
                </div>
              </div>
            );
          })
        )}

        {typing && (
          <div className="msg-row theirs">
            <div className="msg-bubble theirs" style={{ padding: '10px 16px' }}>
              <span className="typing-dots"><span /><span /><span /></span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <form className="conv-composer" onSubmit={handleSend}>
        <input
          className="form-input conv-input"
          placeholder="Type a message…"
          value={body}
          onChange={handleInputChange}
          disabled={sending}
          maxLength={2000}
          autoFocus
        />
        <button type="submit" className="btn btn-primary" disabled={!body.trim() || sending}>
          {sending ? <span className="spinner spinner-sm" /> : '➤'}
        </button>
      </form>
    </AppLayout>
  );
}
