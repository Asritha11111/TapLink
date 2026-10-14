// src/pages/HomePage.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [recentConvs, setRecentConvs] = useState([]);
  const [contacts,    setContacts]    = useState([]);
  const [alerts,      setAlerts]      = useState([]);
  const [loading,     setLoading]     = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/conversations').then((r) => setRecentConvs(r.data.conversations?.slice(0, 3) || [])),
      api.get('/contacts').then((r) => setContacts(r.data.contacts || [])),
      api.get('/emergency').then((r) => setAlerts((r.data.alerts || []).filter((a) => !a.readAt))),
    ]).finally(() => setLoading(false));
  }, []);

  function getOther(participants) {
    return participants?.find((p) => p.user?.id !== user?.id)?.user;
  }

  function initials(name = '') {
    return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
  }

  return (
    <AppLayout>
      {/* Welcome */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <p style={{ fontSize: 11, letterSpacing: 3, color: 'var(--light-brown)', textTransform: 'uppercase', marginBottom: 8 }}>
          WELCOME BACK
        </p>
        <h1 style={{ fontFamily: 'var(--font-brand)', fontSize: '2.4rem', color: 'var(--brown)', fontWeight: 'normal' }}>
          {user?.name?.split(' ')[0] || 'Tapper'}
        </h1>
        <p style={{ color: 'var(--light-brown)', marginTop: 6 }}>
          {contacts.length} contacts · {recentConvs.length} conversations
        </p>
      </div>

      {/* Unread emergency alerts banner */}
      {alerts.length > 0 && (
        <div className="alert alert-error" style={{ marginBottom: 20, cursor: 'pointer' }}
          onClick={() => navigate('/emergency')}>
          🚨 You have {alerts.length} unread emergency alert{alerts.length > 1 ? 's' : ''}! Tap to view.
        </div>
      )}

      {/* Quick actions */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 32 }}>
        {[
          { icon: '👆', title: 'Tap Message',   desc: 'Send via tap pattern',     path: '/tapcodes', color: 'var(--brown)' },
          { icon: '💬', title: 'New Message',   desc: 'Chat with a contact',      path: '/messages', color: 'var(--brown-mid)' },
          { icon: '🚨', title: 'Emergency Alert', desc: 'Alert your contacts',   path: '/emergency', color: 'var(--danger)' },
          { icon: '🎙️', title: 'Voice Command', desc: 'Speak to navigate',       path: '/voice',    color: 'var(--accent)' },
        ].map((a) => (
          <button key={a.path}
            className="card"
            style={{ display: 'flex', alignItems: 'center', gap: 18, cursor: 'pointer', border: `2px solid transparent`, textAlign: 'left', transition: 'transform 0.2s, box-shadow 0.2s', padding: '18px 20px' }}
            onClick={() => navigate(a.path)}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
          >
            <div style={{ width: 50, height: 50, borderRadius: 14, background: a.color, color: 'var(--cream)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
              {a.icon}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, color: 'var(--brown)', fontSize: '1rem' }}>{a.title}</div>
              <div style={{ color: 'var(--light-brown)', fontSize: '0.8rem', marginTop: 2 }}>{a.desc}</div>
            </div>
            <span style={{ color: 'var(--light-brown)', fontSize: 20 }}>→</span>
          </button>
        ))}
      </section>

      {/* Recent conversations */}
      {!loading && recentConvs.length > 0 && (
        <section>
          <div className="flex justify-between items-center" style={{ marginBottom: 12 }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--brown)' }}>Recent Conversations</h2>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/messages')}>View all →</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {recentConvs.map((conv) => {
              const other = getOther(conv.participants);
              const last  = conv.messages?.[0];
              return (
                <button key={conv.id}
                  className="card"
                  style={{ display: 'flex', gap: 14, alignItems: 'center', textAlign: 'left', padding: '14px 16px', cursor: 'pointer' }}
                  onClick={() => navigate(`/messages/${conv.id}`)}
                >
                  <div className="avatar">{initials(other?.name)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: 'var(--brown)', fontSize: '0.9rem' }}>{other?.name || 'Unknown'}</div>
                    {last && <div style={{ color: 'var(--light-brown)', fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {last.body}
                    </div>}
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {loading && <div className="loading-center"><div className="spinner" /></div>}
    </AppLayout>
  );
}
