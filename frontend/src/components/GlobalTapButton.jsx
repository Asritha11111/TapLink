// src/components/GlobalTapButton.jsx — Global Floating Tap Button and TapCode Modal
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const SHORT_THRESHOLD = 300;   // ms: tap < 300ms = S, >= 300ms = L
const GROUP_TIMEOUT   = 1500;  // ms: pause >= 1500ms finalizes pattern

function classifyTap(duration) {
  return duration < SHORT_THRESHOLD ? 'S' : 'L';
}

export default function GlobalTapButton() {
  const navigate = useNavigate();

  const [isOpen,           setIsOpen]           = useState(false);
  const [codes,            setCodes]            = useState([]);
  const [loadingCodes,     setLoadingCodes]     = useState(false);
  const [contacts,         setContacts]         = useState([]);
  const [selectedContacts, setSelectedContacts] = useState(new Set());

  // Tap input state
  const [taps,     setTaps]     = useState([]);
  const [tapDown,  setTapDown]  = useState(null);
  const [tapping,  setTapping]  = useState(false);
  const [matched,  setMatched]  = useState(null); // { matched: bool, tapCode: obj, pattern: [] }
  const [matching, setMatching] = useState(false);

  // Send state
  const [sending,     setSending]     = useState(false);
  const [sendSuccess, setSendSuccess] = useState('');
  const [sendError,   setSendError]   = useState('');

  const groupTimer = useRef(null);

  // Fetch user TapCodes and Contacts when opened
  const loadData = useCallback(async () => {
    setLoadingCodes(true);
    setSendError('');
    setSendSuccess('');
    try {
      const [codesRes, contactsRes] = await Promise.all([
        api.get('/tapcodes'),
        api.get('/contacts'),
      ]);
      setCodes(codesRes.data.tapCodes || []);
      setContacts(contactsRes.data.contacts || []);
    } catch {
      // Handled gracefully in UI
    } finally {
      setLoadingCodes(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadData();
      clearTaps();
    }
  }, [isOpen, loadData]);

  // Tap handlers
  function onTapStart(e) {
    if (e) e.preventDefault();
    clearTimeout(groupTimer.current);
    setTapDown(Date.now());
    setTapping(true);
    setSendSuccess('');
    setSendError('');
  }

  function onTapEnd(e) {
    if (e) e.preventDefault();
    if (!tapDown) return;
    const duration = Date.now() - tapDown;
    const tapType  = classifyTap(duration);
    setTapDown(null);
    setTapping(false);

    setTaps((prev) => {
      const next = [...prev, tapType];
      clearTimeout(groupTimer.current);
      groupTimer.current = setTimeout(() => finalizePattern(next), GROUP_TIMEOUT);
      return next;
    });
  }

  async function finalizePattern(pattern) {
    if (!pattern || pattern.length === 0) return;
    setMatching(true);
    setMatched(null);
    try {
      const { data } = await api.post('/tapcodes/match', { pattern });
      setMatched(data);
      // Pre-select all contacts or leave for user choice
      setSelectedContacts(new Set());
    } catch {
      setMatched({ matched: false, pattern });
    } finally {
      setMatching(false);
    }
  }

  function clearTaps() {
    clearTimeout(groupTimer.current);
    setTaps([]);
    setMatched(null);
    setTapDown(null);
    setTapping(false);
    setSendSuccess('');
    setSendError('');
    setSelectedContacts(new Set());
  }

  function toggleContact(contactId) {
    setSelectedContacts((prev) => {
      const next = new Set(prev);
      if (next.has(contactId)) {
        next.delete(contactId);
      } else {
        next.add(contactId);
      }
      return next;
    });
  }

  function selectAllContacts() {
    if (selectedContacts.size === contacts.length) {
      setSelectedContacts(new Set());
    } else {
      setSelectedContacts(new Set(contacts.map((c) => c.id)));
    }
  }

  async function handleSendMessage() {
    if (!matched?.tapCode?.id) return;
    if (selectedContacts.size === 0) {
      setSendError('Please select at least one contact to send the message to.');
      return;
    }
    setSending(true);
    setSendError('');
    setSendSuccess('');

    try {
      const recipientIds = Array.from(selectedContacts);
      const res = await api.post(`/tapcodes/${matched.tapCode.id}/send`, { recipientIds });
      setSendSuccess(`Message sent successfully to ${res.data.sentCount} contact${res.data.sentCount > 1 ? 's' : ''}!`);
    } catch (err) {
      setSendError(err.response?.data?.error || 'Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  }

  function renderPattern(pattern) {
    if (!Array.isArray(pattern)) return '—';
    return pattern.map((t, idx) => (
      <span key={idx} className={`tap-symbol ${t === 'L' ? 'long' : ''}`}>
        {t === 'S' ? '·' : '—'}
      </span>
    ));
  }

  return (
    <>
      {/* ── Global Floating Tap Button (available on all authenticated pages) ── */}
      <button
        id="global-tap-button"
        className="global-tap-fab"
        onClick={() => setIsOpen(true)}
        aria-label="Quick Tap"
        title="Quick Tap: Enter a tap pattern"
      >
        <span className="global-tap-fab-icon">👆</span>
        <span className="global-tap-fab-label">Tap</span>
      </button>

      {/* ── Tap Interface Modal ── */}
      {isOpen && (
        <div className="modal-overlay" onClick={() => setIsOpen(false)}>
          <div
            className="global-tap-modal card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="global-tap-title"
          >
            {/* Modal Header */}
            <div className="global-tap-modal-header">
              <div>
                <h2 id="global-tap-title" style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--brown)' }}>
                  👆 Quick Tap
                </h2>
                <p className="text-muted" style={{ margin: '2px 0 0', fontSize: '0.8rem' }}>
                  Enter your custom tap pattern to trigger messages
                </p>
              </div>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setIsOpen(false)}
                aria-label="Close tap dialog"
                style={{ fontSize: '1.1rem', padding: '4px 8px' }}
              >
                ✕
              </button>
            </div>

            {/* Check if user has any custom TapCodes */}
            {!loadingCodes && codes.length === 0 ? (
              <div className="empty-state" style={{ padding: '24px 12px' }}>
                <div className="empty-icon">👆</div>
                <p style={{ fontWeight: 600, color: 'var(--brown)', marginBottom: 6 }}>
                  No Custom TapCodes Configured
                </p>
                <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: 16 }}>
                  You haven&apos;t created any personalized tap patterns yet. Create one to send quick messages with a tap!
                </p>
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    setIsOpen(false);
                    navigate('/tapcodes');
                  }}
                >
                  Create a TapCode →
                </button>
              </div>
            ) : (
              <>
                {/* Instructions */}
                <div className="tap-instructions-bar">
                  <span>Hold &lt;300ms for Short (·), &ge;300ms for Long (—). Pause 1.5s to finish.</span>
                </div>

                {/* Display recorded pattern */}
                <div className="tap-pattern-display" style={{ minHeight: 48, margin: '14px 0' }}>
                  {taps.length === 0 ? (
                    <span style={{ opacity: 0.45, fontStyle: 'italic', fontSize: '0.85rem' }}>
                      Tap the button below to start…
                    </span>
                  ) : (
                    renderPattern(taps)
                  )}
                </div>

                {/* Interactive Tap Button */}
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                  <button
                    id="modal-tap-btn"
                    className={`tap-btn ${tapping ? 'pressing' : ''}`}
                    onMouseDown={onTapStart}
                    onMouseUp={onTapEnd}
                    onMouseLeave={onTapEnd}
                    onTouchStart={onTapStart}
                    onTouchEnd={onTapEnd}
                    style={{ minWidth: 120, height: 60, fontSize: '1.1rem' }}
                  >
                    {tapping ? '●' : 'TAP'}
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={clearTaps}
                    disabled={taps.length === 0 && !matched}
                  >
                    Clear
                  </button>
                </div>

                {matching && (
                  <div style={{ textAlign: 'center', margin: '8px 0', fontSize: '0.85rem', color: 'var(--light-brown)' }}>
                    <span className="spinner spinner-sm" style={{ marginRight: 6 }} />
                    Matching pattern…
                  </div>
                )}

                {/* Match Results */}
                {matched && !matching && (
                  <div style={{ marginTop: 14 }}>
                    {matched.matched ? (
                      <div className="card" style={{ background: 'rgba(235, 245, 235, 0.9)', borderColor: 'var(--success)', padding: 14 }}>
                        <div style={{ fontWeight: 600, color: 'var(--brown)', fontSize: '0.95rem' }}>
                          ✅ Matched: <strong>{matched.tapCode?.name}</strong>
                        </div>

                        {/* Associated message check */}
                        {!matched.tapCode?.message || !matched.tapCode.message.trim() ? (
                          <div className="alert alert-error" style={{ marginTop: 10, fontSize: '0.85rem' }}>
                            ⚠️ This TapCode does not have an associated message. Please edit this TapCode to add a message before sending.
                            <div style={{ marginTop: 8 }}>
                              <button
                                className="btn btn-primary btn-sm"
                                onClick={() => { setIsOpen(false); navigate('/tapcodes'); }}
                              >
                                Edit TapCode in Settings →
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div style={{ fontSize: '0.9rem', color: 'var(--brown-mid)', marginTop: 4, fontStyle: 'italic' }}>
                              &ldquo;{matched.tapCode.message}&rdquo;
                            </div>

                            {/* Contact selection for message sending */}
                            <div style={{ marginTop: 16 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                <label style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--brown)' }}>
                                  Send message to contacts:
                                </label>
                                {contacts.length > 0 && (
                                  <button
                                    type="button"
                                    className="btn btn-ghost btn-sm"
                                    onClick={selectAllContacts}
                                    style={{ fontSize: '0.75rem', padding: '2px 6px' }}
                                  >
                                    {selectedContacts.size === contacts.length ? 'Deselect All' : 'Select All'}
                                  </button>
                                )}
                              </div>

                              {contacts.length === 0 ? (
                                <p className="text-muted" style={{ fontSize: '0.8rem' }}>
                                  You have no contacts saved. <button className="btn-link" onClick={() => { setIsOpen(false); navigate('/contacts'); }}>Add a contact</button> first.
                                </p>
                              ) : (
                                <div style={{ maxHeight: 150, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                                  {contacts.map((c) => (
                                    <label
                                      key={c.id}
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 10,
                                        padding: '6px 10px',
                                        borderRadius: 'var(--radius-sm)',
                                        background: selectedContacts.has(c.id) ? 'var(--cream)' : 'transparent',
                                        border: '1px solid rgba(139, 107, 73, 0.15)',
                                        cursor: 'pointer',
                                        fontSize: '0.85rem',
                                      }}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={selectedContacts.has(c.id)}
                                        onChange={() => toggleContact(c.id)}
                                        style={{ accentColor: 'var(--brown)' }}
                                      />
                                      <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--light-brown)' }}>{c.email}</div>
                                      </div>
                                    </label>
                                  ))}
                                </div>
                              )}

                              {sendError   && <div className="alert alert-error" style={{ marginBottom: 10, fontSize: '0.85rem' }}>{sendError}</div>}
                              {sendSuccess && <div className="alert alert-success" style={{ marginBottom: 10, fontSize: '0.85rem' }}>{sendSuccess}</div>}

                              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                                <button
                                  className="btn btn-primary btn-sm"
                                  onClick={handleSendMessage}
                                  disabled={sending || selectedContacts.size === 0 || !!sendSuccess}
                                  style={{ flex: 1 }}
                                >
                                  {sending ? (
                                    <><span className="spinner spinner-sm" style={{ marginRight: 6 }} /> Sending…</>
                                  ) : (
                                    `Send to ${selectedContacts.size} Contact${selectedContacts.size !== 1 ? 's' : ''}`
                                  )}
                                </button>
                                <button
                                  className="btn btn-ghost btn-sm"
                                  onClick={clearTaps}
                                >
                                  Reset
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="alert alert-info" style={{ fontSize: '0.85rem' }}>
                        ❌ Pattern not recognized. No custom TapCode matches this sequence.
                        <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                          <button className="btn btn-ghost btn-sm" onClick={clearTaps}>
                            Try Again
                          </button>
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => { setIsOpen(false); navigate('/tapcodes'); }}
                          >
                            Create this TapCode →
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
