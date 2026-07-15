import axios from 'axios';

// Dynamically determine the backend URL
const getBaseUrl = () => {
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://127.0.0.1:5000/api';
  }
  return '/api'; // production path fallback
};

const client = axios.create({
  baseURL: getBaseUrl(),
  timeout: 15000,
});

// Request interceptor to automatically attach authorization tokens
client.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('oravia_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle authorization failures globally
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token and redirect if session expired
      localStorage.removeItem('oravia_token');
      localStorage.removeItem('oravia_user');
      const path = window.location.pathname;
      if (
        !path.startsWith('/login') &&
        !path.startsWith('/register') &&
        !path.startsWith('/verify-otp') &&
        !path.startsWith('/forgot-password')
      ) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default client;
