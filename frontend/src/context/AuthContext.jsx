// src/context/AuthContext.jsx

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { connectSocket, disconnectSocket } from '../services/socket';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]     = useState(null);
  const [token, setToken]   = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore from localStorage on mount
  // Restore from localStorage on mount
useEffect(() => {
  const savedToken = localStorage.getItem('taplink_token');
  const savedUser = localStorage.getItem('taplink_user');

  if (
    savedToken &&
    savedUser &&
    savedUser !== 'undefined' &&
    savedUser !== 'null'
  ) {
    try {
      const parsedUser = JSON.parse(savedUser);

      setToken(savedToken);
      setUser(parsedUser);
      connectSocket(savedToken);
    } catch (error) {
      console.error('Failed to parse saved user:', error);

      localStorage.removeItem('taplink_token');
      localStorage.removeItem('taplink_user');
      setToken(null);
      setUser(null);
    }
  }

  setLoading(false);
}, []);

  const login = useCallback(async ({ email, password }) => {
    const { data } = await api.post('/auth/login', { email, password });
    const { token: t, user: u } = data;
    localStorage.setItem('taplink_token', t);
    localStorage.setItem('taplink_user',  JSON.stringify(u));
    setToken(t);
    setUser(u);
    connectSocket(t);
    return u;
  }, []);

  const register = useCallback(async ({ name, email, password }) => {
    const { data } = await api.post('/auth/register', { name, email, password });
    const { token: t, user: u } = data;
    localStorage.setItem('taplink_token', t);
    localStorage.setItem('taplink_user',  JSON.stringify(u));
    setToken(t);
    setUser(u);
    connectSocket(t);
    return u;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('taplink_token');
    localStorage.removeItem('taplink_user');
    setToken(null);
    setUser(null);
    disconnectSocket();
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
