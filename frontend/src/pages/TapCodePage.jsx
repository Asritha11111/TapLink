// src/pages/TapCodePage.jsx
// TapCode detection rules (also documented in backend):
//   - S (short) = tap hold < 300 ms
//   - L (long)  = tap hold ≥ 300 ms
//   - Taps are grouped while gaps between consecutive taps < 1500 ms
//   - Idle for ≥ 1500 ms finalizes the pattern

import { useState, useEffect, useRef, useCallback } from 'react';
import AppLayout from '../components/AppLayout';
import api from '../services/api';
import '../styles/TapCode.css';

const SHORT_THRESHOLD = 300;   // ms — tap < this = Short
const GROUP_TIMEOUT   = 1500;  // ms — gap ≥ this finalizes pattern

// Convert tap durations to S/L array
function classifyTap(duration) { return duration < SHORT_THRESHOLD ? 'S' : 'L'; }

export default function TapCodePage() {
  // ── TapCode list state ────────────────────────────────────────────────────
  const [codes,   setCodes]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState('');

  // ── Tap input state ───────────────────────────────────────────────────────
  const [taps,       setTaps]       = useState([]);     // accumulated S/L
  const [tapDown,    setTapDown]    = useState(null);   // press start time
  const [matched,    setMatched]    = useState(null);   // { matched, tapCode? }
  const [tapping,    setTapping]    = useState(false);
  const groupTimer  = useRef(null);

  // ── Create form ───────────────────────────────────────────────────────────
  const [showForm,  setShowForm]  = useState(false);
  const [formData,  setFormData]  = useState({ name: '', pattern: [], message: '' });
  const [recording, setRecording] = useState(false);
  const recTaps   = useRef([]);
  const recDown   = useRef(null);
  const recTimer  = useRef(null);

  // ── Edit state ────────────────────────────────────────────────────────────
  const [editId,    setEditId]    = useState(null);
  const [editData,  setEditData]  = useState({});

  // ─── Load TapCodes ─────────────────────────────────────────────────────────
  const loadCodes = useCallback(() => {
    setLoading(true);
    api.get('/tapcodes')
      .then((r) => setCodes(r.data.tapCodes || []))
      .catch(() => setError('Failed to load TapCodes'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadCodes(); }, [loadCodes]);

  // ─── Tap area: detect pattern ──────────────────────────────────────────────
  function onTapStart() {
    clearTimeout(groupTimer.current);
    setTapDown(Date.now());
    setTapping(true);
    setMatched(null);
  }

  function onTapEnd() {
    if (!tapDown) return;
    const dur  = Date.now() - tapDown;
    const type = classifyTap(dur);
    setTapDown(null);
    setTapping(false);
    setTaps((prev) => {
      const next = [...prev, type];
      // Start the group-finalization timer
      clearTimeout(groupTimer.current);
      groupTimer.current = setTimeout(() => finalizePattern(next), GROUP_TIMEOUT);
      return next;
    });
  }

  async function finalizePattern(pattern) {
    if (!pattern || pattern.length === 0) return;
    try {
      const { data } = await api.post('/tapcodes/match', { pattern });
      setMatched(data);
    } catch {
      setMatched({ matched: false, pattern });
    }
  }

  function clearTaps() {
    clearTimeout(groupTimer.current);
    setTaps([]); setMatched(null); setTapDown(null);
  }

  // ─── Recording for create form ────────────────────────────────────────────
  function startRecord() { setRecording(true); recTaps.current = []; recDown.current = null; }

  function recTapStart() {
    if (!recording) return;
    clearTimeout(recTimer.current);
    recDown.current = Date.now();
  }

  function recTapEnd() {
    if (!recording || !recDown.current) return;
    const dur  = Date.now() - recDown.current;
    const type = classifyTap(dur);
    recDown.current = null;
    recTaps.current = [...recTaps.current, type];
    setFormData((f) => ({ ...f, pattern: [...recTaps.current] }));
    clearTimeout(recTimer.current);
    recTimer.current = setTimeout(() => { setRecording(false); }, GROUP_TIMEOUT);
  }

  function clearRecord() { recTaps.current = []; setFormData((f) => ({ ...f, pattern: [] })); }

  // ─── Create ────────────────────────────────────────────────────────────────
  async function handleCreate(e) {
    e.preventDefault();
    setError(''); setSuccess('');
    try {
      await api.post('/tapcodes', formData);
      setSuccess('TapCode created!');
      setShowForm(false); setFormData({ name: '', pattern: [], message: '' });
      loadCodes();
    } catch (err) { setError(err.response?.data?.error || 'Failed to create'); }
  }

  // ─── Delete ────────────────────────────────────────────────────────────────
  async function handleDelete(id) {
    if (!window.confirm('Delete this TapCode?')) return;
    try {
      await api.delete(`/tapcodes/${id}`);
      setCodes((cs) => cs.filter((c) => c.id !== id));
    } catch { setError('Failed to delete TapCode'); }
  }

  // ─── Update ────────────────────────────────────────────────────────────────
  async function handleUpdate(id) {
    setError(''); setSuccess('');
    try {
      await api.put(`/tapcodes/${id}`, editData);
      setSuccess('TapCode updated!'); setEditId(null);
      loadCodes();
    } catch (err) { setError(err.response?.data?.error || 'Failed to update'); }
  }

  function patternDisplay(pattern) {
    if (!Array.isArray(pattern)) return '—';
    return pattern.map((t) => (t === 'S' ? '·' : '—')).join(' ');
  }

  return (
    <AppLayout>
      <div className="page-header">
        <h1>TapCodes</h1>
        <p>Create and manage your personalized tap patterns</p>
      </div>

      {error   && <div className="alert alert-error"   style={{ marginBottom: 16 }}>{error}</div>}
      {success && <div className="alert alert-success" style={{ marginBottom: 16 }}>{success}</div>}

      {/* ── TAP INPUT AREA ── */}
      <section className="card" style={{ marginBottom: 28 }}>
        <h2 style={{ fontWeight: 600, marginBottom: 4, fontSize: '1rem' }}>🎯 Try a Tap Pattern</h2>
        <p className="text-muted" style={{ marginBottom: 16, fontSize: '0.8rem' }}>
          Hold the button for &lt;300 ms = Short (·), ≥300 ms = Long (—). Wait 1.5 s to finalize.
        </p>

        <div className="tap-pattern-display">
          {taps.length === 0
            ? <span style={{ opacity: 0.4 }}>No taps yet</span>
            : taps.map((t, i) => <span key={i} className={`tap-symbol ${t === 'L' ? 'long' : ''}`}>{t === 'S' ? '·' : '—'}</span>)
          }
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            className={`tap-btn ${tapping ? 'pressing' : ''}`}
            id="tap-area"
            onMouseDown={onTapStart}
            onMouseUp={onTapEnd}
            onMouseLeave={onTapEnd}
            onTouchStart={(e) => { e.preventDefault(); onTapStart(); }}
            onTouchEnd={(e)   => { e.preventDefault(); onTapEnd(); }}
          >
            {tapping ? '●' : 'TAP'}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={clearTaps}>Clear</button>
        </div>

        {matched && (
          <div className={`alert ${matched.matched ? 'alert-success' : 'alert-info'}`} style={{ marginTop: 16 }}>
            {matched.matched
              ? <>✅ Matched: <strong>{matched.tapCode?.name}</strong> → &ldquo;{matched.tapCode?.message}&rdquo;</>
              : <>❌ Pattern [{Array.isArray(matched.pattern) ? matched.pattern.join(',') : matched.pattern}] not recognized. <br /><small>Create a TapCode for it below.</small></>
            }
          </div>
        )}
      </section>

      {/* ── CREATE BUTTON ── */}
      <div style={{ marginBottom: 20 }}>
        <button className="btn btn-primary" onClick={() => setShowForm((s) => !s)}>
          {showForm ? '✕ Cancel' : '＋ New TapCode'}
        </button>
      </div>

      {/* ── CREATE FORM ── */}
      {showForm && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h2 style={{ fontWeight: 600, marginBottom: 16, fontSize: '1rem' }}>Create TapCode</h2>
          <form className="auth-form" onSubmit={handleCreate}>
            <div className="form-group">
              <label className="form-label">Name</label>
              <input className="form-input" placeholder="e.g. Help me"
                value={formData.name}
                onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))} required />
            </div>

            <div className="form-group">
              <label className="form-label">Pattern</label>
              <div className="tap-pattern-display" style={{ minHeight: 44, marginBottom: 10 }}>
                {formData.pattern.length === 0
                  ? <span style={{ opacity: 0.4 }}>Record your pattern below</span>
                  : formData.pattern.map((t, i) => <span key={i} className={`tap-symbol ${t === 'L' ? 'long' : ''}`}>{t === 'S' ? '·' : '—'}</span>)
                }
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <button type="button"
                  className={`tap-btn ${recording ? 'pressing' : ''}`}
                  style={{ fontSize: '0.85rem', minWidth: 100 }}
                  onMouseDown={recTapStart}
                  onMouseUp={recTapEnd}
                  onMouseLeave={recTapEnd}
                  onTouchStart={(e) => { e.preventDefault(); startRecord(); recTapStart(); }}
                  onTouchEnd={(e)   => { e.preventDefault(); recTapEnd(); }}
                  onClick={!recording ? startRecord : undefined}
                >
                  {recording ? '● REC' : '⏺ Record'}
                </button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={clearRecord}>Clear</button>
                <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                  {recording ? 'Tap now…' : formData.pattern.length ? `${formData.pattern.join(',')}` : ''}
                </span>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Message</label>
              <input className="form-input" placeholder="e.g. Please help me!"
                value={formData.message}
                onChange={(e) => setFormData((f) => ({ ...f, message: e.target.value }))} required />
            </div>

            <button type="submit" className="btn btn-primary">Save TapCode</button>
          </form>
        </div>
      )}

      {/* ── TAPCODE LIST ── */}
      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : codes.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">👆</div>
          <p>No TapCodes yet. Create one above!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {codes.map((code) => (
            <div key={code.id} className="card">
              {editId === code.id ? (
                /* Edit form */
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <input className="form-input" placeholder="Name"
                    defaultValue={code.name}
                    onChange={(e) => setEditData((d) => ({ ...d, name: e.target.value }))} />
                  <input className="form-input" placeholder="Message"
                    defaultValue={code.message}
                    onChange={(e) => setEditData((d) => ({ ...d, message: e.target.value }))} />
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button className="btn btn-primary btn-sm" onClick={() => handleUpdate(code.id)}>Save</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditId(null)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>{code.name}</div>
                    <div className="text-muted" style={{ fontFamily: 'monospace', letterSpacing: 4, marginBottom: 6 }}>
                      {patternDisplay(code.pattern)}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--brown-mid)' }}>
                      &ldquo;{code.message}&rdquo;
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-ghost btn-sm" title="Edit" onClick={() => { setEditId(code.id); setEditData({}); }}>✏️</button>
                    <button className="btn btn-ghost btn-sm" title="Delete" style={{ color: 'var(--danger)' }}
                      onClick={() => handleDelete(code.id)}>🗑️</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
