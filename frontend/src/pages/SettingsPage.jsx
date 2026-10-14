// src/pages/SettingsPage.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import { useAuth } from '../context/AuthContext';

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [confirmLogout, setConfirmLogout] = useState(false);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  function initials(name = '') {
    return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
  }

  const speechSupported = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  const geoSupported    = !!navigator.geolocation;

  return (
    <AppLayout>
      <div className="page-header">
        <h1>⚙ Settings</h1>
        <p>Profile and preferences</p>
      </div>

      {/* Profile */}
      <div className="card" style={{ marginBottom: 20, display: 'flex', gap: 20, alignItems: 'center' }}>
        <div className="avatar avatar-lg">{initials(user?.name)}</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--brown)' }}>{user?.name}</div>
          <div style={{ color: 'var(--light-brown)', fontSize: '0.875rem' }}>{user?.email}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--light-brown)', marginTop: 4 }}>
            Member since {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}
          </div>
        </div>
      </div>

      {/* Feature capabilities */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h2 style={{ fontWeight: 600, marginBottom: 14, fontSize: '1rem' }}>Browser Capabilities</h2>
        {[
          { label: 'Voice Commands (Web Speech API)', supported: speechSupported },
          { label: 'Location Sharing (Geolocation API)', supported: geoSupported },
          { label: 'Real-time Messaging (WebSocket)', supported: true },
          { label: 'Bluetooth / Mesh Networking', supported: false, note: 'Not implemented in v1.0' },
        ].map(({ label, supported, note }) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--cream-dark)', fontSize: '0.875rem' }}>
            <span style={{ color: 'var(--brown)' }}>{label}{note && <span className="text-muted"> — {note}</span>}</span>
            <span style={{ fontWeight: 600, color: supported ? 'var(--success)' : 'var(--danger)' }}>
              {supported ? '✅ Supported' : '❌ N/A'}
            </span>
          </div>
        ))}
      </div>

      {/* Quick links */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h2 style={{ fontWeight: 600, marginBottom: 14, fontSize: '1rem' }}>Quick Links</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { label: '👥 Manage Contacts',   path: '/contacts' },
            { label: '👆 TapCode Manager',   path: '/tapcodes' },
            { label: '🎙️ Voice Commands',    path: '/voice' },
            { label: '🚨 Emergency Setup',   path: '/emergency' },
            { label: '📍 Location Settings', path: '/location' },
          ].map(({ label, path }) => (
            <button key={path} className="btn btn-ghost" style={{ justifyContent: 'flex-start', textAlign: 'left' }}
              onClick={() => navigate(path)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* About */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h2 style={{ fontWeight: 600, marginBottom: 10, fontSize: '1rem' }}>About TapLink</h2>
        <p style={{ fontSize: '0.8rem', color: 'var(--light-brown)', lineHeight: 1.8 }}>
          Version 1.0 · Warlocks Team · Capstone Project 2026<br />
          Stack: React + Vite · Node.js + Express · PostgreSQL + Prisma · Socket.IO · JWT
        </p>
      </div>

      {/* Logout */}
      {!confirmLogout ? (
        <button id="logout-btn" className="btn btn-danger btn-full"
          onClick={() => setConfirmLogout(true)}>
          🚪 Log Out
        </button>
      ) : (
        <div className="card" style={{ border: '2px solid var(--danger)' }}>
          <p style={{ fontWeight: 600, marginBottom: 16, color: 'var(--danger)' }}>
            Confirm logout?
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-danger" onClick={handleLogout}>Yes, Log Out</button>
            <button className="btn btn-ghost" onClick={() => setConfirmLogout(false)}>Cancel</button>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
