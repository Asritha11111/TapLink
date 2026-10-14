// src/pages/MessagingPage.jsx — Conversation list
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function MessagingPage() {
  const { user }  = useAuth();
  const navigate  = useNavigate();
  const [convs, setConvs]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    api.get('/conversations')
      .then((r) => setConvs(r.data.conversations || []))
      .catch(() => setError('Failed to load conversations'))
      .finally(() => setLoading(false));
  }, []);

  function getOther(participants) {
    return participants?.find((p) => p.user?.id !== user?.id)?.user;
  }

  function initials(name = '') {
    return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
  }

  function formatTime(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  return (
    <AppLayout>
      <div className="page-header">
        <h1>Messages</h1>
        <p>Your conversations</p>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : convs.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">💬</div>
          <p>No conversations yet. Go to Contacts and message someone!</p>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/contacts')}>
            Go to Contacts →
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {convs.map((conv) => {
            const other = getOther(conv.participants);
            const last  = conv.messages?.[0];
            return (
              <button key={conv.id}
                className="card"
                style={{ display: 'flex', gap: 14, alignItems: 'center', textAlign: 'left', padding: '16px', cursor: 'pointer', width: '100%', transition: 'transform 0.2s, box-shadow 0.2s' }}
                onClick={() => navigate(`/messages/${conv.id}`)}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateX(4px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
              >
                <div className="avatar avatar-lg">{initials(other?.name)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: 'var(--brown)' }}>{other?.name || 'Unknown'}</div>
                  {last && (
                    <div style={{ color: 'var(--light-brown)', fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 3 }}>
                      {last.senderId === user?.id ? 'You: ' : ''}{last.body}
                    </div>
                  )}
                </div>
                {last && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--light-brown)', flexShrink: 0 }}>
                    {formatTime(last.createdAt)}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </AppLayout>
  );
}
