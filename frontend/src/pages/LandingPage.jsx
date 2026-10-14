// src/pages/LandingPage.jsx
import { useNavigate } from 'react-router-dom';
import '../styles/Landing.css';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="landing">
      {/* Hero */}
      <header className="landing-header">
        <div className="landing-logo">
          <div className="landing-logo-icon">⌁</div>
          <span className="landing-brand">TapLink</span>
        </div>
      </header>

      <main className="landing-main">
        <section className="landing-hero">
          <p className="landing-eyebrow">WARLOCKS TEAM — CAPSTONE PROJECT</p>
          <h1 className="landing-title">Communicate<br />without words</h1>
          <p className="landing-subtitle">
            TapLink lets you send personalized messages using tap patterns and
            voice commands — even when normal communication is difficult.
          </p>
          <div className="landing-cta">
            <button className="btn btn-primary btn-lg" onClick={() => navigate('/register')}>
              Get Started Free
            </button>
            <button className="btn btn-secondary btn-lg" onClick={() => navigate('/login')}>
              Sign In
            </button>
          </div>
        </section>

        {/* Features */}
        <section className="landing-features">
          {[
            { icon: '👆', title: 'Tap Patterns', desc: 'Create personalized tap codes that map to predefined messages.' },
            { icon: '🎙️', title: 'Voice Commands', desc: 'Navigate the app and send messages with natural voice commands.' },
            { icon: '💬', title: 'Real-time Messaging', desc: 'Chat instantly with contacts via WebSocket-powered delivery.' },
            { icon: '🚨', title: 'Emergency Alerts', desc: 'Send instant alerts to your contacts with optional location.' },
            { icon: '📡', title: 'Online Status', desc: 'See when your contacts are online in real time.' },
            { icon: '🔒', title: 'Secure & Private', desc: 'JWT authentication and encrypted passwords keep your data safe.' },
          ].map((f) => (
            <div className="feature-card" key={f.title}>
              <div className="feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </section>

        <section className="landing-note">
          <p>⚠️ Emergency alerts only reach registered TapLink contacts — they do not contact emergency services.</p>
        </section>
      </main>

      <footer className="landing-footer">
        <p>© 2026 TapLink · Warlocks Team · Capstone Project</p>
      </footer>
    </div>
  );
}
