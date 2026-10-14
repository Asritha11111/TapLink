// src/pages/EmergencyPage.jsx — Emergency alerts with robust Geolocation detection
import React, { useState, useEffect, useCallback } from 'react';
import AppLayout from '../components/AppLayout';
import api from '../services/api';
import { getSocket } from '../services/socket';
import '../styles/Emergency.css';

export default function EmergencyPage() {
  const [contacts,      setContacts]      = useState([]);
  const [selected,      setSelected]      = useState(new Set());
  const [alerts,        setAlerts]        = useState([]);
  const [step,          setStep]          = useState('select'); // select | confirm | sent
  const [sending,       setSending]       = useState(false);
  const [error,         setError]         = useState('');
  const [loading,       setLoading]       = useState(true);

  // ── Geolocation state ──────────────────────────────────────────────────────
  const [location,      setLocation]      = useState(null);      // { lat, lng, accuracy, timestamp }
  const [locLoading,    setLocLoading]    = useState(false);
  const [locError,      setLocError]      = useState('');
  const [shareLocation, setShareLocation] = useState(false);     // Explicit user consent toggle
  const [locRequested,  setLocRequested]  = useState(false);

  // Load contacts and incoming alerts
  useEffect(() => {
    Promise.all([
      api.get('/contacts').then((r) => setContacts(r.data.contacts || [])),
      api.get('/emergency').then((r) => setAlerts(r.data.alerts || [])),
    ]).catch(() => {
      setError('Failed to load initial emergency data');
    }).finally(() => setLoading(false));
  }, []);

  // Socket: receive incoming emergency alerts in real time
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const handleAlert = ({ message }) => {
      if (message?.alert) {
        setAlerts((a) => [message.alert, ...a]);
      }
    };
    socket.on('emergency:alert', handleAlert);
    return () => socket.off('emergency:alert', handleAlert);
  }, []);

  function toggleContact(id) {
    setSelected((s) => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  // ─── Browser Geolocation Detection ─────────────────────────────────────────
  const requestLocation = useCallback(() => {
    setLocLoading(true);
    setLocError('');
    setLocRequested(true);

    // 1. Browser support check
    if (!navigator.geolocation) {
      setLocError('Geolocation is not supported by your current browser.');
      setLocLoading(false);
      return;
    }

    // 2. Secure context check (browsers block geolocation on non-secure HTTP except localhost)
    if (typeof window !== 'undefined' && !window.isSecureContext &&
        window.location.hostname !== 'localhost' &&
        window.location.hostname !== '127.0.0.1') {
      setLocError('Geolocation requires a secure connection (HTTPS) or localhost deployment.');
      setLocLoading(false);
      return;
    }

    // 3. Geolocation options
    const geoOptions = {
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 0,
    };

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy || 0),
          timestamp: pos.timestamp || Date.now(),
        };
        setLocation(coords);
        setLocLoading(false);
        setLocError('');
      },
      (err) => {
        setLocLoading(false);
        let message = 'Failed to acquire location.';
        switch (err.code) {
          case 1: // PERMISSION_DENIED
            message = 'Location access was denied. Please allow location permissions in your browser or device settings to share your coordinates.';
            break;
          case 2: // POSITION_UNAVAILABLE
            message = 'Location information is unavailable. Please check that GPS or location services are turned on on your device.';
            break;
          case 3: // TIMEOUT
            message = 'Location request timed out. Please check your signal and click "Retry Location".';
            break;
          default:
            message = err.message || 'Unable to determine your location.';
            break;
        }
        setLocError(message);
      },
      geoOptions
    );
  }, []);

  // ─── Send Emergency Alert ──────────────────────────────────────────────────
  async function handleSend() {
    if (selected.size === 0) {
      setError('Please select at least one contact to alert.');
      return;
    }

    setSending(true);
    setError('');

    try {
      const payload = {
        recipientIds: Array.from(selected),
        message: '🚨 EMERGENCY ALERT — I need help immediately!',
      };

      // Only attach location if user explicitly gave consent and valid coordinates exist
      if (shareLocation && location && typeof location.lat === 'number' && typeof location.lng === 'number') {
        payload.latitude  = location.lat;
        payload.longitude = location.lng;
      }

      await api.post('/emergency', payload);
      setStep('sent');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send emergency alert');
      setStep('select');
    } finally {
      setSending(false);
    }
  }

  async function markRead(alertId) {
    try {
      await api.patch(`/emergency/${alertId}/read`);
      setAlerts((as) => as.map((a) => a.id === alertId ? { ...a, readAt: new Date().toISOString() } : a));
    } catch {
      /* not critical */
    }
  }

  function initials(name = '') {
    return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
  }

  // ── SENT screen ──
  if (step === 'sent') {
    return (
      <AppLayout>
        <div className="emergency-sent">
          <div className="emergency-sent-icon">✅</div>
          <h1>Alert Sent</h1>
          <p>Your emergency alert was sent to {selected.size} contact{selected.size !== 1 ? 's' : ''}.</p>
          {shareLocation && location && (
            <p className="text-muted" style={{ marginTop: 8 }}>
              📍 Your coordinates ({location.lat.toFixed(4)}, {location.lng.toFixed(4)}) were included.
            </p>
          )}
          <div className="alert alert-info" style={{ marginTop: 24, maxWidth: 440 }}>
            ℹ️ TapLink alerts only notify your chosen registered contacts — they do not contact emergency services (police, ambulance, etc.).
          </div>
          <button
            className="btn btn-primary"
            style={{ marginTop: 24 }}
            onClick={() => {
              setStep('select');
              setSelected(new Set());
              setShareLocation(false);
            }}
          >
            ← Back to Emergency
          </button>
        </div>
      </AppLayout>
    );
  }

  // ── CONFIRM screen ──
  if (step === 'confirm') {
    return (
      <AppLayout>
        <div className="page-header">
          <h1>🚨 Confirm Alert</h1>
          <p>You are about to alert your selected contacts</p>
        </div>

        <div className="card" style={{ marginBottom: 20 }}>
          <p style={{ fontWeight: 600, marginBottom: 10 }}>Recipients ({selected.size}):</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {contacts.filter((c) => selected.has(c.id)).map((c) => (
              <div key={c.id} className="flex items-center gap-sm">
                <div className="avatar avatar-sm">{initials(c.name)}</div>
                <span style={{ fontWeight: 500 }}>{c.name}</span>
                <span className="text-muted" style={{ fontSize: '0.8rem' }}>({c.email})</span>
              </div>
            ))}
          </div>
        </div>

        {/* Location Consent & Verification */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 8 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontWeight: 600 }}>
              <input
                type="checkbox"
                id="share-loc-confirm"
                checked={shareLocation}
                onChange={(e) => {
                  setShareLocation(e.target.checked);
                  if (e.target.checked && !location) {
                    requestLocation();
                  }
                }}
                style={{ width: 18, height: 18, accentColor: 'var(--brown)' }}
              />
              <span>📍 Include My Current Location</span>
            </label>

            {locLoading && (
              <span className="text-muted" style={{ fontSize: '0.85rem' }}>
                <span className="spinner spinner-sm" style={{ marginRight: 6 }} /> Acquiring…
              </span>
            )}
          </div>

          <p className="text-muted" style={{ fontSize: '0.8rem', margin: 0 }}>
            Your coordinates will only be sent to the {selected.size} selected recipient{selected.size !== 1 ? 's' : ''}.
          </p>

          {shareLocation && location && (
            <div style={{ marginTop: 12, padding: '10px 12px', background: 'rgba(46, 125, 50, 0.1)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--success)' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--success)', fontWeight: 600 }}>
                ✅ Location ready: {location.lat.toFixed(5)}°, {location.lng.toFixed(5)}°
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--light-brown)', marginTop: 2 }}>
                Accuracy: ±{location.accuracy}m &middot;{' '}
                <a
                  href={`https://maps.google.com/?q=${location.lat},${location.lng}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: 'var(--brown)', textDecoration: 'underline' }}
                >
                  Preview map
                </a>
              </div>
            </div>
          )}

          {shareLocation && locError && (
            <div className="alert alert-error" style={{ marginTop: 12, fontSize: '0.85rem' }}>
              <div>⚠️ {locError}</div>
              <button
                className="btn btn-ghost btn-sm"
                onClick={requestLocation}
                style={{ marginTop: 6 }}
              >
                🔄 Retry Location Detection
              </button>
            </div>
          )}
        </div>

        <div className="alert alert-error" style={{ marginBottom: 20 }}>
          ⚠️ This will immediately alert your selected contacts.
        </div>

        {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button
            id="emergency-confirm-send"
            className="btn btn-danger btn-lg"
            onClick={handleSend}
            disabled={sending}
          >
            {sending ? <><span className="spinner spinner-sm" /> Sending…</> : '🚨 Send Alert Now'}
          </button>
          <button className="btn btn-ghost btn-lg" onClick={() => setStep('select')}>
            Cancel
          </button>
        </div>
      </AppLayout>
    );
  }

  // ── SELECT screen ──
  return (
    <AppLayout>
      <div className="page-header">
        <h1>🚨 Emergency</h1>
        <p>Send an immediate alert to your designated contacts</p>
      </div>

      <div className="alert alert-info" style={{ marginBottom: 20 }}>
        ℹ️ TapLink emergency alerts only notify <strong>registered TapLink contacts</strong>. They do not call government emergency services.
        In an immediate life-threatening emergency, please call <strong>112</strong> or your local emergency number.
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

      {/* ── Location Acquisition Panel on main screen ── */}
      <section className="card" style={{ marginBottom: 24, border: '2px solid var(--cream-dark)', background: 'var(--cream)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div style={{ fontWeight: 600, color: 'var(--brown)', fontSize: '0.95rem' }}>
              📍 Device Location Detection
            </div>
            <div className="text-muted" style={{ fontSize: '0.8rem' }}>
              Detect and verify your GPS coordinates before sending alerts
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {location ? (
              <button
                id="emergency-refresh-location-btn"
                className="btn btn-secondary btn-sm"
                onClick={requestLocation}
                disabled={locLoading}
              >
                {locLoading ? <span className="spinner spinner-sm" /> : '🔄 Refresh Location'}
              </button>
            ) : (
              <button
                id="emergency-detect-location-btn"
                className="btn btn-primary btn-sm"
                onClick={requestLocation}
                disabled={locLoading}
              >
                {locLoading ? <><span className="spinner spinner-sm" /> Detecting…</> : '📍 Detect My Location'}
              </button>
            )}
          </div>
        </div>

        {/* Location Status details */}
        {locLoading && (
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.85rem', color: 'var(--light-brown)' }}>
            <span className="spinner spinner-sm" />
            <span>Requesting browser location permission and acquiring coordinates…</span>
          </div>
        )}

        {location && !locLoading && (
          <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(46, 125, 50, 0.08)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--success)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <span style={{ fontWeight: 600, color: 'var(--success)' }}>
                  ✅ Location Acquired: {location.lat.toFixed(5)}°, {location.lng.toFixed(5)}°
                </span>
                <span className="text-muted" style={{ fontSize: '0.75rem', marginLeft: 8 }}>
                  (Accuracy: ±{location.accuracy} meters)
                </span>
              </div>
              <a
                href={`https://maps.google.com/?q=${location.lat},${location.lng}`}
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: '0.8rem', color: 'var(--brown)', fontWeight: 600, textDecoration: 'underline' }}
              >
                View on Google Maps ↗
              </a>
            </div>
          </div>
        )}

        {locError && !locLoading && (
          <div className="alert alert-error" style={{ marginTop: 12, fontSize: '0.85rem' }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>⚠️ Location Detection Issue:</div>
            <div>{locError}</div>
            <div style={{ marginTop: 8 }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={requestLocation}
              >
                🔄 Retry Detection
              </button>
            </div>
          </div>
        )}

        {/* Explicit Consent Checkbox */}
        <div style={{ marginTop: 14, paddingTop: 10, borderTop: '1px solid rgba(139, 107, 73, 0.15)' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: '0.85rem' }}>
            <input
              type="checkbox"
              id="emergency-share-loc-checkbox"
              checked={shareLocation}
              onChange={(e) => {
                setShareLocation(e.target.checked);
                if (e.target.checked && !location) {
                  requestLocation();
                }
              }}
              style={{ width: 16, height: 16, accentColor: 'var(--brown)' }}
            />
            <span style={{ fontWeight: 500, color: 'var(--brown)' }}>
              Include this location when sending emergency alerts (requires your consent)
            </span>
          </label>
        </div>
      </section>

      {/* ── Contact Selection ── */}
      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : contacts.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">👥</div>
          <p>You need to add contacts before sending emergency alerts.</p>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 600, color: 'var(--brown)' }}>
              Select recipients to alert:
            </span>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => {
                if (selected.size === contacts.length) {
                  setSelected(new Set());
                } else {
                  setSelected(new Set(contacts.map((c) => c.id)));
                }
              }}
              style={{ fontSize: '0.8rem' }}
            >
              {selected.size === contacts.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
            {contacts.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`card emergency-contact-item ${selected.has(c.id) ? 'selected' : ''}`}
                onClick={() => toggleContact(c.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  textAlign: 'left',
                  cursor: 'pointer',
                  width: '100%',
                  background: selected.has(c.id) ? 'var(--cream)' : undefined,
                  border: selected.has(c.id) ? '2px solid var(--danger)' : undefined,
                }}
              >
                <input
                  type="checkbox"
                  checked={selected.has(c.id)}
                  readOnly
                  tabIndex={-1}
                  style={{ width: 18, height: 18, accentColor: 'var(--danger)', flexShrink: 0 }}
                />
                <div className="avatar">{initials(c.name)}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{c.name}</div>
                  <div className="text-muted">{c.email}</div>
                </div>
              </button>
            ))}
          </div>

          <button
            id="emergency-proceed"
            className="btn btn-danger btn-lg btn-full"
            disabled={selected.size === 0}
            onClick={() => setStep('confirm')}
          >
            🚨 Alert {selected.size > 0 ? `${selected.size} Contact${selected.size > 1 ? 's' : ''}` : 'Selected Contacts'}
          </button>
        </>
      )}

      {/* ── Incoming alerts ── */}
      {alerts.length > 0 && (
        <section style={{ marginTop: 36 }}>
          <h2 style={{ fontWeight: 600, marginBottom: 14, color: 'var(--danger)' }}>
            📥 Incoming Alerts
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {alerts.map((a) => (
              <div
                key={a.id}
                className={`card ${!a.readAt ? 'alert-error' : ''}`}
                style={{
                  borderLeft: `4px solid ${a.readAt ? 'var(--cream-dark)' : 'var(--danger)'}`,
                  display: 'flex',
                  gap: 14,
                  alignItems: 'flex-start',
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{a.sender?.name}</div>
                  <div style={{ fontSize: '0.875rem', margin: '4px 0' }}>{a.message}</div>
                  {a.latitude != null && a.longitude != null && (
                    <a
                      href={`https://maps.google.com/?q=${a.latitude},${a.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ fontSize: '0.8rem', color: 'var(--brown)', fontWeight: 600 }}
                    >
                      📍 View Location ({Number(a.latitude).toFixed(4)}, {Number(a.longitude).toFixed(4)})
                    </a>
                  )}
                  <div className="text-muted" style={{ marginTop: 4, fontSize: '0.75rem' }}>
                    {new Date(a.sentAt).toLocaleString()}
                  </div>
                </div>
                {!a.readAt && (
                  <button className="btn btn-ghost btn-sm" onClick={() => markRead(a.id)}>
                    Mark Read
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </AppLayout>
  );
}
