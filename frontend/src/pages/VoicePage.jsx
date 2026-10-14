// src/pages/VoicePage.jsx
// Web Speech API — voice command interface.
// Supported commands (case-insensitive partial match):
//   "open home"      → /home
//   "open contacts"  → /contacts
//   "open messages"  → /messages
//   "tap codes"      → /tapcodes
//   "open settings"  → /settings
//   "emergency"      → /emergency (with confirmation)
//   "go back"        → browser back
//
// Limitations documented inline.

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/AppLayout';

// Check browser support once
const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition || null;

const COMMANDS = [
  { keywords: ['home'],            action: 'navigate', target: '/home',      label: 'Open Home' },
  { keywords: ['contacts'],        action: 'navigate', target: '/contacts',  label: 'Open Contacts' },
  { keywords: ['message'],         action: 'navigate', target: '/messages',  label: 'Open Messages' },
  { keywords: ['tap', 'tapcode'],  action: 'navigate', target: '/tapcodes',  label: 'Open TapCodes' },
  { keywords: ['setting'],         action: 'navigate', target: '/settings',  label: 'Open Settings' },
  { keywords: ['location'],        action: 'navigate', target: '/location',  label: 'Open Location' },
  { keywords: ['device'],          action: 'navigate', target: '/devices',   label: 'Open Devices' },
  { keywords: ['voice'],           action: 'navigate', target: '/voice',     label: 'Open Voice' },
  { keywords: ['emergency', 'help me', 'sos'], action: 'confirm', target: '/emergency', label: '🚨 Emergency (needs confirm)' },
  { keywords: ['go back', 'back'], action: 'back',     target: null,         label: 'Go Back' },
];

function matchCommand(transcript) {
  const t = transcript.toLowerCase();
  return COMMANDS.find((cmd) => cmd.keywords.some((kw) => t.includes(kw)));
}

export default function VoicePage() {
  const navigate = useNavigate();

  const [supported,   setSupported]   = useState(!!SpeechRecognition);
  const [listening,   setListening]   = useState(false);
  const [transcript,  setTranscript]  = useState('');
  const [status,      setStatus]      = useState('');
  const [history,     setHistory]     = useState([]);
  const [pendingCmd,  setPendingCmd]  = useState(null); // for confirm-required actions
  const recognizerRef = useRef(null);

  useEffect(() => {
    return () => {
      recognizerRef.current?.stop();
    };
  }, []);

  function startListening() {
    if (!SpeechRecognition) return;
    const rec = new SpeechRecognition();
    rec.lang = 'en-US';
    rec.continuous = false;
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    rec.onstart = () => { setListening(true); setStatus('Listening…'); setTranscript(''); };
    rec.onend   = () => { setListening(false); setStatus(''); };
    rec.onerror = (e) => {
      setListening(false);
      if (e.error === 'not-allowed') {
        setStatus('❌ Microphone permission denied.');
        setSupported(false);
      } else if (e.error === 'no-speech') {
        setStatus('No speech detected. Try again.');
      } else {
        setStatus(`Error: ${e.error}`);
      }
    };

    rec.onresult = (e) => {
      const said = e.results[0][0].transcript;
      setTranscript(said);
      const cmd = matchCommand(said);
      if (!cmd) {
        setStatus(`❓ Not recognized: "${said}"`);
        setHistory((h) => [{ said, result: 'Unknown command', ts: new Date() }, ...h.slice(0, 9)]);
        return;
      }

      if (cmd.action === 'confirm') {
        setPendingCmd(cmd);
        setStatus(`⚠️ Recognized: "${cmd.label}" — confirm below before proceeding.`);
        setHistory((h) => [{ said, result: `Needs confirmation: ${cmd.label}`, ts: new Date() }, ...h.slice(0, 9)]);
        return;
      }

      if (cmd.action === 'back') {
        window.history.back();
        setHistory((h) => [{ said, result: 'Went back', ts: new Date() }, ...h.slice(0, 9)]);
        return;
      }

      setStatus(`✅ Executing: ${cmd.label}`);
      setHistory((h) => [{ said, result: cmd.label, ts: new Date() }, ...h.slice(0, 9)]);
      setTimeout(() => navigate(cmd.target), 600);
    };

    recognizerRef.current = rec;
    rec.start();
  }

  function stopListening() {
    recognizerRef.current?.stop();
    setListening(false);
    setStatus('Stopped.');
  }

  function confirmPending() {
    if (!pendingCmd) return;
    navigate(pendingCmd.target);
    setPendingCmd(null);
    setStatus('');
  }

  return (
    <AppLayout>
      <div className="page-header">
        <h1>🎙️ Voice Commands</h1>
        <p>Navigate TapLink using your voice</p>
      </div>

      {!supported ? (
        <div className="alert alert-error" style={{ marginBottom: 20 }}>
          ❌ Your browser does not support the Web Speech API, or microphone permission was denied.
          Try Chrome or Edge on desktop. Voice commands require HTTPS in production.
        </div>
      ) : (
        <>
          {/* Control */}
          <div className="card" style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ fontSize: '3.5rem', marginBottom: 16 }}>
              {listening ? '🔴' : '🎤'}
            </div>
            <p style={{ marginBottom: 20, color: 'var(--light-brown)', fontSize: '0.9rem' }}>
              {listening
                ? 'Listening… speak a command now.'
                : 'Press the button and speak a command.'}
            </p>

            {!listening ? (
              <button id="voice-start" className="btn btn-primary btn-lg" onClick={startListening}>
                Start Listening
              </button>
            ) : (
              <button id="voice-stop" className="btn btn-secondary btn-lg" onClick={stopListening}>
                Stop Listening
              </button>
            )}

            {transcript && (
              <div className="alert alert-info" style={{ marginTop: 16, textAlign: 'left' }}>
                🗣️ You said: <strong>&ldquo;{transcript}&rdquo;</strong>
              </div>
            )}

            {status && (
              <p style={{ marginTop: 14, fontSize: '0.875rem', color: 'var(--brown)', fontWeight: 500 }}>
                {status}
              </p>
            )}
          </div>

          {/* Pending confirmation for sensitive commands */}
          {pendingCmd && (
            <div className="card" style={{ border: '2px solid var(--danger)', marginBottom: 24 }}>
              <p style={{ fontWeight: 600, color: 'var(--danger)', marginBottom: 12 }}>
                ⚠️ Confirm: {pendingCmd.label}
              </p>
              <p style={{ fontSize: '0.875rem', marginBottom: 16, color: 'var(--light-brown)' }}>
                This action will navigate to the emergency page. Confirm to proceed.
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-danger" onClick={confirmPending}>Confirm</button>
                <button className="btn btn-ghost" onClick={() => { setPendingCmd(null); setStatus('Cancelled.'); }}>Cancel</button>
              </div>
            </div>
          )}

          {/* Supported commands reference */}
          <div className="card" style={{ marginBottom: 24 }}>
            <h2 style={{ fontWeight: 600, marginBottom: 14, fontSize: '1rem' }}>Supported Commands</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {COMMANDS.map((cmd) => (
                <div key={cmd.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', padding: '8px 0', borderBottom: '1px solid var(--cream-dark)' }}>
                  <span style={{ fontWeight: 500 }}>&ldquo;{cmd.keywords[0]}&rdquo;</span>
                  <span style={{ color: 'var(--light-brown)' }}>{cmd.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* History */}
          {history.length > 0 && (
            <div className="card">
              <h2 style={{ fontWeight: 600, marginBottom: 14, fontSize: '1rem' }}>Recent Commands</h2>
              {history.map((h, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', padding: '6px 0', borderBottom: '1px solid var(--cream-dark)', color: 'var(--light-brown)' }}>
                  <span>&ldquo;{h.said}&rdquo; → {h.result}</span>
                  <span>{h.ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              ))}
            </div>
          )}

          {/* Browser limitation note */}
          <div className="alert alert-info" style={{ marginTop: 24 }}>
            ℹ️ Voice recognition uses the browser's built-in Web Speech API. It requires:
            microphone access, a supported browser (Chrome/Edge), and an internet connection
            (browser sends audio to Google servers for transcription). Continuous background
            listening is not available — each session ends after one command.
          </div>
        </>
      )}
    </AppLayout>
  );
}
