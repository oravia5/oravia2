import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { UploadProvider } from './context/UploadContext';
import { ChatAuthProvider } from './context/ChatContext';

// Pages
import Home from './pages/Home';
import Reels from './pages/Reels';
import Profile from './pages/Profile';
import Login from './pages/Login';
import Register from './pages/Register';
import PostDetail from './pages/PostDetail';
import VerifyOTP from './pages/VerifyOTP';
import ForgotPassword from './pages/ForgotPassword';
import Search from './pages/Search';
import CreatePost from './pages/CreatePost';
import EditProfile from './pages/EditProfile';
import Settings from './pages/Settings';
import HashtagFeed from './pages/HashtagFeed';
import LocationFeed from './pages/LocationFeed';
import FollowList from './pages/FollowList';
import Notifications from './pages/Notifications';
import Messages from './pages/Messages';
import Wishlist from './pages/Wishlist';
import SavedPosts from './pages/SavedPosts';
import ArchivedPosts from './pages/ArchivedPosts';
import Drafts from './pages/Drafts';
import BlockedAccounts from './pages/BlockedAccounts';

// Reusable Components
import BottomNav from './components/BottomNav/BottomNav';
import UploadToast from './components/UploadToast/UploadToast';

// Protected Route Guard
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-primary)' }}>
        <div className="spinner" style={{ width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.1)', borderTop: '3px solid var(--accent-indigo)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <style>{`
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// Layout component to selectively display BottomNav
const AppLayout = () => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  // Scroll to top on route change
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // Hide BottomNav on login/register/verify/forgot/edit-profile screens
  const hideNavPaths = [
    '/login', '/register', '/verify-otp', '/forgot-password', 
    '/edit-profile'
  ];
  const showNav = !hideNavPaths.includes(location.pathname);

  return (
    <>
      {/* Desktop Blocker - visible only on screens > 480px */}
      <div className="desktop-blocker">
        <div className="desktop-blocker-icon">📱</div>
        <h2>Oravia is Mobile Only</h2>
        <p>Please open this app on your mobile device for the best experience. Oravia is designed exclusively for mobile screens.</p>
        <div className="desktop-blocker-qr">Open on your phone →</div>
      </div>

      <div className="app-container">
      <UploadToast />
      <Routes>
        {/* Auth routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-otp" element={<VerifyOTP />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* Public Shared Post Route */}
        <Route path="/post/:id" element={<PostDetail />} />

        {/* Public routes */}
        <Route path="/" element={<Home />} />
        <Route path="/snips" element={<Reels />} />

        {/* Protected routes */}
        <Route path="/search" element={<ProtectedRoute><Search /></ProtectedRoute>} />
        <Route path="/create-post" element={<ProtectedRoute><CreatePost /></ProtectedRoute>} />
        <Route path="/edit-profile" element={<ProtectedRoute><EditProfile /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/settings/wishlist" element={<ProtectedRoute><Wishlist /></ProtectedRoute>} />
        <Route path="/settings/saved" element={<ProtectedRoute><SavedPosts /></ProtectedRoute>} />
        <Route path="/settings/archive" element={<ProtectedRoute><ArchivedPosts /></ProtectedRoute>} />
        <Route path="/settings/drafts" element={<ProtectedRoute><Drafts /></ProtectedRoute>} />
        <Route path="/settings/blocked" element={<ProtectedRoute><BlockedAccounts /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/profile/:username" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/profile/:username/:type" element={<ProtectedRoute><FollowList /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
        <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
        <Route path="/tag/:tag" element={<ProtectedRoute><HashtagFeed /></ProtectedRoute>} />
        <Route path="/location/:location" element={<ProtectedRoute><LocationFeed /></ProtectedRoute>} />
        
        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {showNav && <BottomNav />}
    </div>
    </>
  );
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <ChatAuthProvider>
          <UploadProvider>
            <NotificationProvider>
              <AppLayout />
            </NotificationProvider>
          </UploadProvider>
        </ChatAuthProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
