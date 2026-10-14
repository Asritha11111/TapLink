import GlobalTapButton from './GlobalTapButton';
// src/components/AppLayout.jsx — Shared layout with header, sidebar, bottom nav
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useOnline } from '../context/OnlineContext';
import '../styles/AppLayout.css';

const NAV_ITEMS = [
  { icon: '⌂',  label: 'Home',      path: '/home' },
  { icon: '💬', label: 'Messages',  path: '/messages' },
  { icon: '👆', label: 'TapCodes',  path: '/tapcodes' },
  { icon: '📍', label: 'Location',  path: '/location' },
  { icon: '⚙',  label: 'Settings', path: '/settings' },
];

const SIDEBAR_ITEMS = [
  { icon: '⌂',  label: 'Home',           path: '/home' },
  { icon: '💬', label: 'Messages',       path: '/messages' },
  { icon: '👥', label: 'Contacts',       path: '/contacts' },
  { icon: '👆', label: 'TapCodes',       path: '/tapcodes' },
  { icon: '🎙️', label: 'Voice Commands', path: '/voice' },
  { icon: '🚨', label: 'Emergency',      path: '/emergency' },
  { icon: '📍', label: 'Location',       path: '/location' },
  { icon: '📱', label: 'Devices',        path: '/devices' },
  { icon: '⚙',  label: 'Settings',      path: '/settings' },
];

export default function AppLayout({ children }) {
  const { user, logout } = useAuth();
  const onlineSet  = useOnline();
  const navigate   = useNavigate();
  const location   = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isActive = (path) => location.pathname.startsWith(path);

  function getInitials(name = '') {
    return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
  }

  return (
    <div className="page-wrapper">
      {/* ── HEADER ── */}
      <header className="header">
        <button
          className="header-logo"
          onClick={() => setSidebarOpen((o) => !o)}
          aria-label="Open menu"
        >
          <div className="header-logo-icon">⌁</div>
          <span className="header-logo-text">TapLink</span>
        </button>

        <div className="header-right">
          <div className="header-status">
            <span className="status-dot cream" />
            Online
          </div>
          <button
            className="header-avatar-btn"
            onClick={() => navigate('/settings')}
            aria-label="Profile settings"
          >
            <div className="avatar avatar-sm">{getInitials(user?.name)}</div>
          </button>
        </div>
      </header>

      {/* ── SIDEBAR OVERLAY ── */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── SIDEBAR ── */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2>TapLink</h2>
          <button className="sidebar-close" onClick={() => setSidebarOpen(false)}>×</button>
        </div>

        {user && (
          <div className="flex items-center gap-md" style={{ padding: '0 8px 16px' }}>
            <div className="avatar">{getInitials(user.name)}</div>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--cream)', fontSize: '0.9rem' }}>{user.name}</div>
              <div style={{ fontSize: '0.75rem', color: 'rgba(245,236,215,0.6)' }}>{user.email}</div>
            </div>
          </div>
        )}

        <div className="sidebar-label">Navigation</div>

        {SIDEBAR_ITEMS.map((item) => (
          <button
            key={item.path}
            className={`sidebar-item ${isActive(item.path) ? 'active' : ''}`}
            onClick={() => { navigate(item.path); setSidebarOpen(false); }}
          >
            <span className="icon">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}

        <div style={{ flex: 1 }} />

        <div className="sidebar-label">Account</div>
        <button className="sidebar-item danger" onClick={logout}>
          <span className="icon">🚪</span>
          <span>Log out</span>
        </button>
      </aside>

      {/* ── MAIN ── */}
      <main className="main-content">
        <div className="content-inner">{children}</div>
      </main>

      {/* ── BOTTOM NAV ── */}
      <nav className="bottom-nav" aria-label="Main navigation">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.path}
            className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
            onClick={() => navigate(item.path)}
            aria-label={item.label}
          >
            <span>{item.icon}</span>
            <small>{item.label}</small>
          </button>
        ))}
      </nav>
          <GlobalTapButton />
    </div>
  );
}
