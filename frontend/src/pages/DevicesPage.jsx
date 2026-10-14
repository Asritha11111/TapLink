// src/pages/DevicesPage.jsx
// Note: TapLink does not currently implement real physical device discovery.
// This page is honest about that limitation while showing connection info.
import AppLayout from '../components/AppLayout';
import { getSocket } from '../services/socket';

export default function DevicesPage() {
  const socket = getSocket();
  const connected = socket?.connected ?? false;

  return (
    <AppLayout>
      <div className="page-header">
        <h1>📱 Devices</h1>
        <p>Connection status</p>
      </div>

      <div className="alert alert-info" style={{ marginBottom: 24 }}>
        ℹ️ TapLink v1.0 uses internet-based messaging via WebSockets. Bluetooth or local mesh
        networking between physical devices is <strong>not implemented</strong> in this version.
      </div>

      {/* Current session */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h2 style={{ fontWeight: 600, marginBottom: 16, fontSize: '1rem' }}>This Device</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { label: 'Connection',   value: connected ? '✅ Connected to TapLink server' : '❌ Disconnected' },
            { label: 'Socket ID',    value: socket?.id || '—' },
            { label: 'Protocol',     value: 'WebSocket (Socket.IO)' },
            { label: 'Browser',      value: navigator.userAgent.split(' ').slice(-2).join(' ') },
            { label: 'Platform',     value: navigator.platform || '—' },
          ].map(({ label, value }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: '0.875rem', padding: '6px 0', borderBottom: '1px solid var(--cream-dark)' }}>
              <span style={{ fontWeight: 600, color: 'var(--brown-mid)' }}>{label}</span>
              <span style={{ color: 'var(--light-brown)', wordBreak: 'break-all', textAlign: 'right' }}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h2 style={{ fontWeight: 600, marginBottom: 12, fontSize: '1rem' }}>Future Roadmap</h2>
        <ul style={{ paddingLeft: 20, color: 'var(--light-brown)', fontSize: '0.875rem', lineHeight: 2 }}>
          <li>Bluetooth Low Energy (BLE) local messaging</li>
          <li>WiFi-Direct peer-to-peer mode</li>
          <li>Offline mesh network support</li>
          <li>Multi-device session management</li>
        </ul>
      </div>
    </AppLayout>
  );
}
