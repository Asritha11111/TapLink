// src/__tests__/features.test.jsx
// Tests for GlobalTapButton, ContactsPage, and EmergencyPage location detection
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import GlobalTapButton from '../components/GlobalTapButton';
import ContactsPage from '../pages/ContactsPage';
import EmergencyPage from '../pages/EmergencyPage';

// Mock contexts
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1', name: 'Current User', email: 'me@example.com' } }),
}));

vi.mock('../context/OnlineContext', () => ({
  useOnline: () => new Set(),
}));

// Mock socket
vi.mock('../services/socket', () => ({
  getSocket: () => ({
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
  }),
}));

// Mock api
vi.mock('../services/api', () => ({
  default: {
    get: vi.fn((url) => {
      if (url === '/contacts') {
        return Promise.resolve({
          data: {
            contacts: [
              { id: 'c1', name: 'Alice Friend', email: 'alice@example.com' },
            ],
          },
        });
      }
      if (url === '/tapcodes') {
        return Promise.resolve({
          data: {
            tapCodes: [
              { id: 'tc1', name: 'Quick Help', pattern: ['S', 'S', 'L'], message: 'I need quick help' },
            ],
          },
        });
      }
      if (url === '/emergency') {
        return Promise.resolve({ data: { alerts: [] } });
      }
      return Promise.resolve({ data: {} });
    }),
    post: vi.fn(() => Promise.resolve({ data: { success: true } })),
    delete: vi.fn(() => Promise.resolve({ data: { message: 'Removed' } })),
    patch: vi.fn(() => Promise.resolve({ data: {} })),
  },
}));

describe('GlobalTapButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the floating global tap button', () => {
    render(
      <MemoryRouter>
        <GlobalTapButton />
      </MemoryRouter>
    );
    const btn = screen.getByRole('button', { name: /quick tap/i });
    expect(btn).toBeInTheDocument();
  });

  it('opens modal with tap interface on click', async () => {
    render(
      <MemoryRouter>
        <GlobalTapButton />
      </MemoryRouter>
    );
    fireEvent.click(screen.getByRole('button', { name: /quick tap/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/quick tap/i)).toBeInTheDocument();
      expect(screen.getByText(/tap the button below/i)).toBeInTheDocument();
    });
  });
});

describe('ContactsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders contacts list and Add Contact button', async () => {
    render(
      <MemoryRouter>
        <ContactsPage />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('Alice Friend')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /add contact/i })).toBeInTheDocument();
    });
  });

  it('opens add contact form when Add Contact button is clicked', async () => {
    render(
      <MemoryRouter>
        <ContactsPage />
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText('Alice Friend')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /add contact/i }));
    expect(screen.getByPlaceholderText(/registered\.user@example\.com/i)).toBeInTheDocument();
  });

  it('prevents adding yourself as contact', async () => {
    render(
      <MemoryRouter>
        <ContactsPage />
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText('Alice Friend')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /add contact/i }));
    const input = screen.getByPlaceholderText(/registered\.user@example\.com/i);
    fireEvent.change(input, { target: { value: 'me@example.com' } });

    fireEvent.click(screen.getByRole('button', { name: /add user/i }));
    await waitFor(() => {
      expect(screen.getByText(/cannot add yourself/i)).toBeInTheDocument();
    });
  });
});

describe('EmergencyPage Location Detection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('provides a clear option to detect current location', async () => {
    render(
      <MemoryRouter>
        <EmergencyPage />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /detect my location/i })).toBeInTheDocument();
    });
  });

  it('displays error message when geolocation is not supported', async () => {
    const originalGeo = navigator.geolocation;
    // Temporarily undefine geolocation
    Object.defineProperty(navigator, 'geolocation', {
      value: undefined,
      configurable: true,
    });

    render(
      <MemoryRouter>
        <EmergencyPage />
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByRole('button', { name: /detect my location/i })).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /detect my location/i }));
    await waitFor(() => {
      expect(screen.getByText(/geolocation is not supported/i)).toBeInTheDocument();
    });

    // Restore
    Object.defineProperty(navigator, 'geolocation', {
      value: originalGeo,
      configurable: true,
    });
  });
});
