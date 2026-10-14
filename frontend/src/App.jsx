// src/App.jsx — Root router
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Pages
import LandingPage       from './pages/LandingPage';
import LoginPage         from './pages/LoginPage';
import RegisterPage      from './pages/RegisterPage';
import HomePage          from './pages/HomePage';
import ContactsPage      from './pages/ContactsPage';
import MessagingPage     from './pages/MessagingPage';
import ConversationPage  from './pages/ConversationPage';
import TapCodePage       from './pages/TapCodePage';
import EmergencyPage     from './pages/EmergencyPage';
import LocationPage      from './pages/LocationPage';
import DevicesPage       from './pages/DevicesPage';
import SettingsPage      from './pages/SettingsPage';
import VoicePage         from './pages/VoicePage';

// Protected route wrapper
function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="loading-center">
      <div className="spinner" />
    </div>
  );
  return user ? children : <Navigate to="/login" replace />;
}

// Guest-only wrapper (redirect home if already logged in)
function GuestOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Navigate to="/home" replace /> : children;
}

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/"        element={<LandingPage />} />
      <Route path="/login"   element={<GuestOnly><LoginPage /></GuestOnly>} />
      <Route path="/register"element={<GuestOnly><RegisterPage /></GuestOnly>} />

      {/* Protected */}
      <Route path="/home"    element={<Protected><HomePage /></Protected>} />
      <Route path="/contacts"element={<Protected><ContactsPage /></Protected>} />
      <Route path="/messages"element={<Protected><MessagingPage /></Protected>} />
      <Route path="/messages/:conversationId" element={<Protected><ConversationPage /></Protected>} />
      <Route path="/tapcodes"element={<Protected><TapCodePage /></Protected>} />
      <Route path="/emergency"element={<Protected><EmergencyPage /></Protected>} />
      <Route path="/location"element={<Protected><LocationPage /></Protected>} />
      <Route path="/devices" element={<Protected><DevicesPage /></Protected>} />
      <Route path="/settings"element={<Protected><SettingsPage /></Protected>} />
      <Route path="/voice"   element={<Protected><VoicePage /></Protected>} />

      {/* Catch-all */}
      <Route path="*"        element={<Navigate to="/" replace />} />
    </Routes>
  );
}
