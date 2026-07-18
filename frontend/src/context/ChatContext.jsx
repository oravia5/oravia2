import React, { createContext, useContext, useState, useEffect } from 'react';
import * as Ably from 'ably';
import { ChatClient, LogLevel } from '@ably/chat';
import { ChatClientProvider } from '@ably/chat/react';
import { AblyProvider } from 'ably/react';
import { useAuth } from './AuthContext';

const ChatContext = createContext({ chatReady: false, connected: false });

const API_BASE = import.meta.env.VITE_BACKEND_URL || '';

let globalClients = null;

function getOrCreateChatClients(userId) {
  const instanceId = Math.random().toString(36).substring(2, 9).toUpperCase();

  if (globalClients) {
    // If the userId matches, or the old userId was null (anonymous), we can reuse it
    if (!userId || !globalClients.userId || globalClients.userId === userId) {
      if (userId && !globalClients.userId) {
        globalClients.userId = userId;
        console.log(`[CHAT] [Instance ${globalClients.instanceId}] Associating existing client with user: ${userId}`);
      }
      return globalClients;
    }

    // User changed! Clean up the old client
    console.log(`[CHAT] [Instance ${globalClients.instanceId}] User changed from ${globalClients.userId} to ${userId}. Cleaning up old client.`);
    try {
      globalClients.rc.connection.close();
    } catch (err) {
      console.error('[CHAT] Error closing old client:', err);
    }
    globalClients = null;
  }

  console.log(`[CHAT] [Instance ${instanceId}] Creating NEW Ably/Chat clients for user: ${userId || 'anonymous'}`);

  const rc = new Ably.Realtime({
    autoConnect: false,
    queryTime: true,
    logLevel: 4,
    logHandler: (level, msg, err) => {
      const label = ['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR'][level] || level;
      console.log(`[ABLY ${label}] [Instance ${instanceId}] ${msg}`, err || '');
    },
    authCallback: (tokenParams, callback) => {
      console.log(`[CHAT] [Instance ${instanceId}] authCallback invoked with tokenParams:`, JSON.stringify(tokenParams));
      const jwt = localStorage.getItem('oravia_token');
      console.log(`[CHAT] [Instance ${instanceId}] JWT present:`, !!jwt, jwt ? `(${jwt.length} chars)` : '');

      if (!jwt) {
        console.error(`[CHAT] [Instance ${instanceId}] No JWT in localStorage — aborting auth`);
        callback('Not authenticated', null);
        return;
      }

      const url = `${API_BASE}/api/chat/token`;
      console.log(`[CHAT] [Instance ${instanceId}] Fetching:`, url);

      fetch(url, { headers: { Authorization: `Bearer ${jwt}` } })
        .then((res) => {
          console.log(`[CHAT] [Instance ${instanceId}] Token endpoint responded:`, res.status, res.statusText);
          if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${res.statusText}`);
          }
          return res.json();
        })
        .then((data) => {
          console.log(`[CHAT] [Instance ${instanceId}] Token response success:`, data.success);
          if (!data.success) {
            console.error(`[CHAT] [Instance ${instanceId}] Backend returned success=false:`, data.message);
            callback(data.message || 'Token request failed', null);
            return;
          }
          const tr = data.data.tokenRequest;
          console.log(`[CHAT] [Instance ${instanceId}] TokenRequest keys:`, Object.keys(tr || {}));
          console.log(`[CHAT] [Instance ${instanceId}] Calling Ably callback with tokenRequest`);
          callback(null, tr);
        })
        .catch((err) => {
          console.error(`[CHAT] [Instance ${instanceId}] Fetch or parse error:`, err.message || err);
          callback(err.message || 'Network error', null);
        });
    },
  });

  rc.connection.on('stateChange', (state) => {
    console.log(`[CHAT] [Instance ${instanceId}] Connection state changed to:`, state.current, '| reason:', state.reason?.message || 'none');
  });

  const cc = new ChatClient(rc, { logLevel: LogLevel.Warning });
  console.log(`[CHAT] [Instance ${instanceId}] Ably Realtime + ChatClient created successfully`);

  globalClients = { userId, rc, cc, instanceId };
  return globalClients;
}

export function ChatAuthProvider({ children }) {
  const { isAuthenticated, user } = useAuth();
  const userId = isAuthenticated ? user?._id : null;
  const [chatReady, setChatReady] = useState(false);
  const [connected, setConnected] = useState(false);

  const clientInfo = getOrCreateChatClients(userId);
  const rc = clientInfo?.rc;
  const cc = clientInfo?.cc;

  useEffect(() => {
    if (!rc) return;

    console.log('[CHAT] useEffect: isAuthenticated=', isAuthenticated, 'userId=', userId, 'state=', rc.connection.state);

    if (!isAuthenticated) {
      console.log('[CHAT] Not authenticated — closing');
      if (rc.connection.state !== 'closed' && rc.connection.state !== 'initialized') {
        rc.connection.close();
      }
      setConnected(false);
      setChatReady(false);
      return;
    }

    if (rc.connection.state === 'initialized' || rc.connection.state === 'closed') {
      console.log('[CHAT] Calling rc.connect()');
      rc.connect();
    } else {
      console.log('[CHAT] Already in state:', rc.connection.state, '- skipping connect()');
      if (rc.connection.state === 'connected') {
        setConnected(true);
        setChatReady(true);
      }
    }

    const onConnected = () => {
      console.log('[CHAT] >>> CONNECTED — setting chatReady=true');
      setConnected(true);
      setChatReady(true);
    };
    const onDisconnected = () => {
      console.log('[CHAT] >>> DISCONNECTED — setting chatReady=false');
      setConnected(false);
      setChatReady(false);
    };
    const onFailed = (state) => {
      console.error('[CHAT] >>> FAILED — setting chatReady=false. Reason:', state.reason);
      setConnected(false);
      setChatReady(false);
    };

    rc.connection.on('connected', onConnected);
    rc.connection.on('disconnected', onDisconnected);
    rc.connection.on('failed', onFailed);

    return () => {
      console.log('[CHAT] useEffect cleanup — removing listeners');
      rc.connection.off('connected', onConnected);
      rc.connection.off('disconnected', onDisconnected);
      rc.connection.off('failed', onFailed);
    };
  }, [isAuthenticated, rc, userId]);

  if (!rc || !cc) {
    return <>{children}</>;
  }

  return (
    <ChatContext.Provider value={{ chatReady, connected }}>
      <AblyProvider client={rc}>
        <ChatClientProvider client={cc}>
          {children}
        </ChatClientProvider>
      </AblyProvider>
    </ChatContext.Provider>
  );
}

export const useChatContext = () => useContext(ChatContext);

// Clean up Ably client connection during Vite HMR (Hot Module Replacement)
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    console.log('[CHAT] Vite HMR: Disposing previous global client connection');
    if (globalClients) {
      try {
        globalClients.rc.connection.close();
      } catch (err) {
        console.error('[CHAT] HMR dispose error:', err);
      }
      globalClients = null;
    }
  });
}
