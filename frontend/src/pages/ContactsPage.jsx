// src/pages/ContactsPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import { useAuth } from '../context/AuthContext';
import { useOnline } from '../context/OnlineContext';
import api from '../services/api';

function ContactItem({ contact, online, onMessage, onRemove }) {
  const initials = (name = '') =>
    name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px' }}>
      <div style={{ position: 'relative' }}>
        <div className="avatar">{initials(contact.name)}</div>
        <span
          className={`status-dot ${online ? 'online' : 'offline'}`}
          style={{ position: 'absolute', bottom: 1, right: 1, border: '2px solid var(--light-cream)' }}
          title={online ? 'Online' : 'Offline'}
        />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{contact.name}</div>
        <div style={{ color: 'var(--light-brown)', fontSize: '0.8rem' }}>{contact.email}</div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-ghost btn-sm" title="Send message" onClick={onMessage}>
          💬
        </button>
        <button
          className="btn btn-ghost btn-sm"
          title="Remove contact"
          onClick={onRemove}
          style={{ color: 'var(--danger)' }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}

export default function ContactsPage() {
  const navigate  = useNavigate();
  const { user }  = useAuth();
  const onlineSet = useOnline();

  // Contacts list
  const [contacts,    setContacts]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [filterQuery, setFilterQuery] = useState('');

  // Add contact state
  const [showAddForm, setShowAddForm] = useState(false);
  const [addEmail,    setAddEmail]    = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching,   setSearching]   = useState(false);
  const [adding,      setAdding]      = useState(false);

  // Status alerts
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState('');

  const loadContacts = useCallback(() => {
    setLoading(true);
    api.get('/contacts')
      .then((r) => setContacts(r.data.contacts || []))
      .catch(() => setError('Failed to load contacts'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  // Client validation before adding
  function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  // Handle direct add by email
  async function handleAddByEmail(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    const targetEmail = addEmail.trim().toLowerCase();
    if (!targetEmail) {
      setError('Please enter an email address.');
      return;
    }

    if (!validateEmail(targetEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (user?.email && targetEmail === user.email.toLowerCase()) {
      setError('You cannot add yourself as a contact.');
      return;
    }

    if (contacts.some((c) => c.email?.toLowerCase() === targetEmail)) {
      setError('This user is already in your contacts list.');
      return;
    }

    setAdding(true);
    try {
      await api.post('/contacts', { email: targetEmail });
      setSuccess(`Contact "${targetEmail}" added successfully!`);
      setAddEmail('');
      setShowAddForm(false);
      loadContacts();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add contact. Please check the email address.');
    } finally {
      setAdding(false);
    }
  }

  // Search users by name or email
  async function handleSearch(e) {
    e.preventDefault();
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setError('Search query must be at least 2 characters.');
      return;
    }
    setError('');
    setSearching(true);
    setSearchResults([]);

    try {
      const { data } = await api.get('/users/search', { params: { q: searchQuery.trim() } });
      setSearchResults(data.users || []);
      if (!data.users || data.users.length === 0) {
        setError(`No users found matching "${searchQuery.trim()}".`);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Search failed');
    } finally {
      setSearching(false);
    }
  }

  // Add selected user from search
  async function handleAddTarget(targetUser) {
    setError('');
    setSuccess('');

    if (user?.id && targetUser.id === user.id) {
      setError('You cannot add yourself as a contact.');
      return;
    }

    if (contacts.some((c) => c.id === targetUser.id)) {
      setError('This user is already in your contacts list.');
      return;
    }

    setAdding(true);
    try {
      await api.post('/contacts', { targetId: targetUser.id });
      setSuccess(`Added ${targetUser.name} to your contacts!`);
      setSearchResults((prev) => prev.filter((u) => u.id !== targetUser.id));
      loadContacts();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add contact');
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(targetId) {
    if (!window.confirm('Are you sure you want to remove this contact?')) return;
    setError('');
    setSuccess('');
    try {
      await api.delete(`/contacts/${targetId}`);
      setContacts((cs) => cs.filter((c) => c.id !== targetId));
      setSuccess('Contact removed.');
    } catch {
      setError('Failed to remove contact.');
    }
  }

  async function handleMessage(contactId) {
    try {
      const { data } = await api.post('/conversations', { otherUserId: contactId });
      navigate(`/messages/${data.conversation.id}`);
    } catch {
      setError('Could not open conversation.');
    }
  }

  const isAlreadyContact = (id) => contacts.some((c) => c.id === id);

  const filteredContacts = contacts.filter((c) =>
    (c.name || '').toLowerCase().includes(filterQuery.toLowerCase()) ||
    (c.email || '').toLowerCase().includes(filterQuery.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1>Contacts</h1>
          <p>Manage your registered TapLink contacts</p>
        </div>
        <button
          id="add-contact-button"
          className="btn btn-primary"
          onClick={() => {
            setShowAddForm((prev) => !prev);
            setError('');
            setSuccess('');
          }}
        >
          {showAddForm ? '✕ Close Form' : '＋ Add Contact'}
        </button>
      </div>

      {error   && <div className="alert alert-error"   style={{ marginBottom: 16 }}>{error}</div>}
      {success && <div className="alert alert-success" style={{ marginBottom: 16 }}>{success}</div>}

      {/* ── Add Contact Form / Card ── */}
      {showAddForm && (
        <div className="card" style={{ marginBottom: 24, border: '2px solid var(--cream-dark)', background: 'var(--cream)' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--brown)', marginBottom: 6 }}>
            Add a New Contact
          </h2>
          <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: 16 }}>
            Enter the email address of any registered TapLink user, or search by name.
          </p>

          {/* Add by email directly */}
          <form onSubmit={handleAddByEmail} style={{ marginBottom: 18 }}>
            <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600 }}>
              Add by Email Address
            </label>
            <div style={{ display: 'flex', gap: 10 }}>
              <input
                id="add-contact-email-input"
                className="form-input"
                type="email"
                placeholder="registered.user@example.com"
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
                disabled={adding}
                style={{ flex: 1 }}
              />
              <button
                id="submit-add-contact-btn"
                type="submit"
                className="btn btn-primary"
                disabled={adding || !addEmail.trim()}
              >
                {adding ? <span className="spinner spinner-sm" /> : '＋ Add User'}
              </button>
            </div>
          </form>

          <hr style={{ border: 'none', borderTop: '1px solid rgba(139, 107, 73, 0.2)', margin: '16px 0' }} />

          {/* Or search to discover */}
          <form onSubmit={handleSearch}>
            <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600 }}>
              Or Search Registered Users
            </label>
            <div style={{ display: 'flex', gap: 10 }}>
              <input
                id="search-users-input"
                className="form-input"
                placeholder="Search by name or email…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                disabled={searching}
                style={{ flex: 1 }}
              />
              <button
                type="submit"
                className="btn btn-secondary"
                disabled={searching || !searchQuery.trim()}
              >
                {searching ? <span className="spinner spinner-sm" /> : '🔍 Search'}
              </button>
            </div>
          </form>

          {/* Search Results list */}
          {searchResults.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <p className="text-muted" style={{ fontSize: '0.8rem', marginBottom: 10 }}>
                Found {searchResults.length} user{searchResults.length > 1 ? 's' : ''}:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {searchResults.map((u) => {
                  const already = isAlreadyContact(u.id);
                  return (
                    <div
                      key={u.id}
                      className="card"
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--light-cream)' }}
                    >
                      <div className="avatar avatar-sm">
                        {u.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{u.name}</div>
                        <div style={{ color: 'var(--light-brown)', fontSize: '0.775rem' }}>{u.email}</div>
                      </div>
                      {already ? (
                        <span style={{ fontSize: '0.75rem', color: 'var(--light-brown)', fontWeight: 600 }}>
                          ✓ Already Added
                        </span>
                      ) : (
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => handleAddTarget(u)}
                          disabled={adding}
                        >
                          ＋ Add
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Filter existing contacts ── */}
      {contacts.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <input
            id="filter-contacts-input"
            className="form-input"
            placeholder="Filter your contacts by name or email…"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            style={{ width: '100%' }}
          />
        </div>
      )}

      {/* ── Existing Contacts List ── */}
      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : contacts.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">👥</div>
          <p style={{ fontWeight: 600, marginBottom: 4 }}>You have no contacts yet.</p>
          <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: 16 }}>
            Click &ldquo;＋ Add Contact&rdquo; above to connect with other registered users!
          </p>
          <button className="btn btn-primary" onClick={() => setShowAddForm(true)}>
            ＋ Add Your First Contact
          </button>
        </div>
      ) : filteredContacts.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🔍</div>
          <p>No contacts match &ldquo;{filterQuery}&rdquo;</p>
          <button className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={() => setFilterQuery('')}>
            Clear Filter
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filteredContacts.map((c) => (
            <ContactItem
              key={c.id}
              contact={c}
              online={onlineSet.has(c.id)}
              onMessage={() => handleMessage(c.id)}
              onRemove={() => handleRemove(c.id)}
            />
          ))}
        </div>
      )}
    </AppLayout>
  );
}
