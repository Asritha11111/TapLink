// src/pages/LocationPage.jsx
import { useState } from 'react';
import AppLayout from '../components/AppLayout';
import api from '../services/api';

export default function LocationPage() {
  const [status,   setStatus]   = useState('idle');   // idle | loading | granted | denied | shared
  const [location, setLocation] = useState(null);
  const [error,    setError]    = useState('');

  async function requestLocation() {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      setStatus('denied');
      return;
    }
    setStatus('loading'); setError('');
    try {
      const pos = await new Promise((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, { timeout: 10000 })
      );
      setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude, acc: pos.coords.accuracy });
      setStatus('granted');
    } catch (e) {
      setStatus('denied');
      setError(
        e.code === 1
          ? 'Location permission was denied. Please allow location access in your browser settings.'
          : 'Could not get your location. Please try again.'
      );
    }
  }

  async function shareLocation() {
    if (!location) return;
    setStatus('loading');
    try {
      await api.post('/location', { latitude: location.lat, longitude: location.lng });
      setStatus('shared');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to share location');
      setStatus('granted');
    }
  }

  const mapUrl = location
    ? `https://maps.google.com/?q=${location.lat},${location.lng}`
    : null;

  return (
    <AppLayout>
      <div className="page-header">
        <h1>📍 Location</h1>
        <p>Optional location sharing — your consent is always required</p>
      </div>

      <div className="alert alert-info" style={{ marginBottom: 24 }}>
        ℹ️ TapLink only accesses your location when you explicitly request it below.
        Location is never collected silently or in the background.
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

      {status === 'idle' && (
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: 16 }}>📍</div>
          <h2 style={{ marginBottom: 12 }}>Location not enabled</h2>
          <p className="text-muted" style={{ marginBottom: 24 }}>
            Your location is used only when you send an emergency alert with location sharing enabled.
            Nothing is shared without your explicit action.
          </p>
          <button className="btn btn-primary" onClick={requestLocation}>
            Request Location Access
          </button>
        </div>
      )}

      {status === 'loading' && (
        <div className="loading-center">
          <div className="spinner" />
          <p style={{ marginTop: 12, color: 'var(--light-brown)' }}>Getting your location…</p>
        </div>
      )}

      {(status === 'granted' || status === 'shared') && location && (
        <div className="card">
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 20 }}>
            <div style={{ fontSize: '2rem' }}>✅</div>
            <div>
              <h2 style={{ marginBottom: 6, fontSize: '1.1rem' }}>Location Acquired</h2>
              <p className="text-muted">Latitude: {location.lat.toFixed(6)}</p>
              <p className="text-muted">Longitude: {location.lng.toFixed(6)}</p>
              {location.acc && <p className="text-muted">Accuracy: ±{Math.round(location.acc)} m</p>}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <a href={mapUrl} target="_blank" rel="noreferrer" className="btn btn-secondary">
              🗺️ View on Map
            </a>
            {status !== 'shared' && (
              <button className="btn btn-primary" onClick={shareLocation}>
                📤 Share My Location
              </button>
            )}
            <button className="btn btn-ghost" onClick={() => { setStatus('idle'); setLocation(null); setError(''); }}>
              Clear
            </button>
          </div>

          {status === 'shared' && (
            <div className="alert alert-success" style={{ marginTop: 16 }}>
              ✅ Location shared successfully.
            </div>
          )}
        </div>
      )}

      {status === 'denied' && (
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🚫</div>
          <h2 style={{ marginBottom: 8 }}>Location Unavailable</h2>
          <p className="text-muted" style={{ marginBottom: 20 }}>
            You can still use TapLink without location. Emergency alerts will be sent without location data.
          </p>
          <button className="btn btn-ghost" onClick={() => { setStatus('idle'); setError(''); }}>
            Try Again
          </button>
        </div>
      )}
    </AppLayout>
  );
}
