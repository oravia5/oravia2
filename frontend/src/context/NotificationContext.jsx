import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import client from '../api/client';

const NotificationContext = createContext();

export function useNotifications() {
  return useContext(NotificationContext);
}

export function NotificationProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const pollingRef = useRef(null);

  const fetchUnreadCount = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const [notifRes, chatRes] = await Promise.allSettled([
        client.get('/notifications/unread-count'),
        client.get('/chat/unread-count'),
      ]);
      if (notifRes.status === 'fulfilled' && notifRes.value.data?.success) {
        setUnreadCount(notifRes.value.data.data.count);
      }
      if (chatRes.status === 'fulfilled' && chatRes.value.data?.success) {
        setUnreadChatCount(chatRes.value.data.count || 0);
      }
    } catch (err) {
      // silent
    }
  }, [isAuthenticated]);

  const fetchNotifications = useCallback(async (page = 1) => {
    if (!isAuthenticated) return { notifications: [], total: 0 };
    setLoading(true);
    try {
      const res = await client.get(`/notifications?page=${page}&limit=20`);
      if (res.data.success) {
        const data = res.data.data;
        if (page === 1) {
          setNotifications(data.notifications);
        } else {
          setNotifications(prev => [...prev, ...data.notifications]);
        }
        setUnreadCount(data.unread);
        return data;
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
    return { notifications: [], total: 0 };
  }, [isAuthenticated]);

  const markAsRead = useCallback(async (notificationId) => {
    try {
      await client.put(`/notifications/${notificationId}/read`);
      setNotifications(prev =>
        prev.map(n => n._id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await client.put('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchUnreadCount();
      pollingRef.current = setInterval(fetchUnreadCount, 15000);
    }
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [isAuthenticated, fetchUnreadCount]);

  const value = {
    notifications,
    unreadCount,
    unreadChatCount,
    setUnreadChatCount,
    loading,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}
