// src/context/OnlineContext.jsx — Tracks which users are online via Socket.IO

import { createContext, useContext, useState, useEffect } from 'react';
import { getSocket } from '../services/socket';
import { useAuth } from './AuthContext';

const OnlineContext = createContext(new Set());

export function OnlineProvider({ children }) {
  const { token } = useAuth();
  const [onlineSet, setOnlineSet] = useState(new Set());

  useEffect(() => {
    if (!token) { setOnlineSet(new Set()); return; }

    const socket = getSocket();
    if (!socket) return;

    const handleOnline  = ({ userId }) => setOnlineSet((s) => new Set([...s, userId]));
    const handleOffline = ({ userId }) => setOnlineSet((s) => { const n = new Set(s); n.delete(userId); return n; });

    socket.on('user:online',  handleOnline);
    socket.on('user:offline', handleOffline);

    return () => {
      socket.off('user:online',  handleOnline);
      socket.off('user:offline', handleOffline);
    };
  }, [token]);

  return <OnlineContext.Provider value={onlineSet}>{children}</OnlineContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useOnline() { return useContext(OnlineContext); }
