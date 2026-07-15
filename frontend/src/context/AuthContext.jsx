import React, { createContext, useState, useEffect, useContext } from 'react';
import client from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if token exists on mount and verify it
  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('oravia_token');
      const savedUser = localStorage.getItem('oravia_user');

      if (token && savedUser) {
        try {
          setUser(JSON.parse(savedUser));
          
          // Verify with backend that token is still valid
          const res = await client.get('/auth/me');
          if (res.data.success) {
            setUser(res.data.data);
            localStorage.setItem('oravia_user', JSON.stringify(res.data.data));
          }
        } catch (error) {
          console.error('Session validation failed:', error.message);
          logout();
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  // Login handler
  const login = async (emailOrUsername, password) => {
    try {
      const res = await client.post('/auth/login', { emailOrUsername, password });
      if (res.data.success) {
        const { token, ...userData } = res.data.data;
        localStorage.setItem('oravia_token', token);
        localStorage.setItem('oravia_user', JSON.stringify(userData));
        setUser(userData);
        return { success: true };
      }
    } catch (error) {
      if (error.response?.data?.isUnverified) {
        return {
          success: false,
          isUnverified: true,
          email: error.response.data.data.email,
          message: error.response.data.message,
        };
      }
      return {
        success: false,
        message: error.response?.data?.message || 'Login failed. Please check credentials.',
      };
    }
  };

  // Register handler (sends OTP, returns success, does not log in directly)
  const register = async (data) => {
    try {
      const isFormData = data instanceof FormData;
      const headers = isFormData ? { 'Content-Type': 'multipart/form-data' } : { 'Content-Type': 'application/json' };
      const res = await client.post('/auth/register', data, { headers });
      
      if (res.data.success) {
        return { 
          success: true, 
          needsVerification: true, 
          email: res.data.data?.email || ''
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Registration failed.',
      };
    }
  };

  // Verify OTP handler (completes registration and logs user in)
  const verifyOTP = async (email, code) => {
    try {
      const res = await client.post('/auth/verify-otp', { email, code });
      if (res.data.success) {
        const { token, ...userData } = res.data.data;
        localStorage.setItem('oravia_token', token);
        localStorage.setItem('oravia_user', JSON.stringify(userData));
        setUser(userData);
        return { success: true };
      }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'OTP verification failed.',
      };
    }
  };

  // Forgot password handler
  const forgotPassword = async (email) => {
    try {
      const res = await client.post('/auth/forgot-password', { email });
      return { success: true, message: res.data.message };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to request reset OTP.',
      };
    }
  };

  // Reset password handler
  const resetPassword = async (email, code, newPassword) => {
    try {
      const res = await client.post('/auth/reset-password', { email, code, newPassword });
      return { success: true, message: res.data.message };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to reset password.',
      };
    }
  };

  // Logout handler
  const logout = () => {
    localStorage.removeItem('oravia_token');
    localStorage.removeItem('oravia_user');
    setUser(null);
  };

  // Update profile user details handler
  const updateUserData = (updatedUser) => {
    localStorage.setItem('oravia_user', JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  const value = {
    user,
    loading,
    login,
    register,
    verifyOTP,
    forgotPassword,
    resetPassword,
    logout,
    updateUserData,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
