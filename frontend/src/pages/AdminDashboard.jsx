import React, { useState, useEffect } from 'react';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getFullMediaUrl } from '../utils/mediaUrl';
import { 
  BarChart3, 
  Users, 
  Image, 
  LogOut, 
  ArrowLeft, 
  Search, 
  Check, 
  X, 
  ShieldAlert, 
  Trash2, 
  CheckCircle2, 
  ChevronLeft, 
  ChevronRight, 
  Menu,
  Play,
  Film,
  Activity,
  UserCheck,
  UserX
} from 'lucide-react';

export default function AdminDashboard() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState('stats'); // 'stats' | 'users' | 'posts'
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Pagination states
  const [usersPage, setUsersPage] = useState(1);
  const [usersTotalPages, setUsersTotalPages] = useState(1);
  const [postsPage, setPostsPage] = useState(1);
  const [postsTotalPages, setPostsTotalPages] = useState(1);

  // Fetch admin stats
  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await client.get('/admin/stats');
      if (res.data.success) {
        setStats(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
      setError(err.response?.data?.message || 'Failed to fetch admin stats');
    } finally {
      setLoading(false);
    }
  };

  // Fetch users list
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await client.get(`/admin/users?page=${usersPage}&limit=10&search=${userSearch}`);
      if (res.data.success) {
        setUsers(res.data.data);
        setUsersTotalPages(res.data.pagination.totalPages);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
      setError(err.response?.data?.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  // Fetch posts list
  const fetchPosts = async () => {
    try {
      setLoading(true);
      const res = await client.get(`/admin/posts?page=${postsPage}&limit=10`);
      if (res.data.success) {
        setPosts(res.data.data);
        setPostsTotalPages(res.data.pagination.totalPages);
      }
    } catch (err) {
      console.error('Failed to fetch posts:', err);
      setError(err.response?.data?.message || 'Failed to fetch posts');
    } finally {
      setLoading(false);
    }
  };

  // Toggle user ban status
  const handleToggleBan = async (userId, currentBanStatus) => {
    const confirmation = window.confirm(
      `Are you sure you want to ${currentBanStatus ? 'UNBAN' : 'BAN'} this user?`
    );
    if (!confirmation) return;

    try {
      const res = await client.put(`/admin/users/${userId}/ban`);
      if (res.data.success) {
        alert(res.data.message);
        // Refresh active views
        if (activeTab === 'users') fetchUsers();
        fetchStats();

        // Update selectedUser if open in modal
        if (selectedUser && selectedUser._id === userId) {
          setSelectedUser(prev => ({ ...prev, isBanned: !currentBanStatus }));
        }
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to toggle ban status');
    }
  };

  // Toggle user verification badge
  const handleToggleVerification = async (userId) => {
    try {
      const res = await client.put(`/admin/users/${userId}/verify`);
      if (res.data.success) {
        // Refresh active views
        if (activeTab === 'users') fetchUsers();
        fetchStats();

        // Update selectedUser if open in modal
        if (selectedUser && selectedUser._id === userId) {
          setSelectedUser(prev => ({ ...prev, isVerified: !prev.isVerified }));
        }
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to toggle verification status');
    }
  };

  // Delete a post
  const handleDeletePost = async (postId) => {
    const confirmation = window.confirm(
      'Are you sure you want to delete this post? This action is permanent!'
    );
    if (!confirmation) return;

    try {
      const res = await client.delete(`/admin/posts/${postId}`);
      if (res.data.success) {
        alert(res.data.message);
        // Refresh active views
        if (activeTab === 'posts') fetchPosts();
        fetchStats();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete post');
    }
  };

  // Initial stats fetch
  useEffect(() => {
    fetchStats();
  }, []);

  // Fetch when tab changes or search/page changes
  useEffect(() => {
    if (activeTab === 'stats') {
      fetchStats();
    } else if (activeTab === 'users') {
      fetchUsers();
    } else if (activeTab === 'posts') {
      fetchPosts();
    }
  }, [activeTab, usersPage, postsPage]);

  // Debounced/delayed search handle
  useEffect(() => {
    if (activeTab === 'users') {
      setUsersPage(1);
      const delayDebounce = setTimeout(() => {
        fetchUsers();
      }, 500);
      return () => clearTimeout(delayDebounce);
    }
  }, [userSearch]);

  const handleTabChange = (tabName) => {
    setActiveTab(tabName);
    setError(null);
  };

  const handleExit = () => {
    navigate('/');
  };

  return (
    <div className="admin-page-wrapper">
      <style>{`
        .admin-page-wrapper {
          min-height: 100vh;
          background: radial-gradient(circle at 80% 20%, rgba(99, 102, 241, 0.05), transparent 50%), 
                      radial-gradient(circle at 20% 80%, rgba(168, 85, 247, 0.06), transparent 50%), 
                      #09090b;
          color: #f4f4f5;
          font-family: 'Outfit', 'Inter', system-ui, -apple-system, sans-serif;
          display: flex;
          position: relative;
          width: 100%;
          box-sizing: border-box;
        }

        /* Sidebar styles */
        .admin-sidebar {
          width: 280px;
          background: rgba(15, 15, 20, 0.7);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border-right: 1px solid rgba(255, 255, 255, 0.06);
          padding: 40px 24px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          height: 100vh;
          position: sticky;
          top: 0;
          z-index: 100;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-sizing: border-box;
          flex-shrink: 0;
        }

        .sidebar-logo h1 {
          font-size: 20px;
          font-weight: 800;
          letter-spacing: -0.03em;
          background: linear-gradient(135deg, #818cf8 0%, #c084fc 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin: 0 0 6px 0;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .sidebar-logo p {
          font-size: 11px;
          color: #71717a;
          margin: 0;
          line-height: 1.4;
        }

        .sidebar-menu {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-top: 48px;
          flex-grow: 1;
        }

        .sidebar-tab-btn {
          background: transparent;
          border: 1px solid transparent;
          color: #a1a1aa;
          padding: 12px 16px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 12px;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          width: 100%;
          text-align: left;
          box-sizing: border-box;
        }

        .sidebar-tab-btn:hover {
          color: #ffffff;
          background: rgba(255, 255, 255, 0.03);
        }

        .sidebar-tab-btn.active {
          background: rgba(99, 102, 241, 0.08);
          border: 1px solid rgba(99, 102, 241, 0.2);
          color: #818cf8;
          box-shadow: 0 4px 20px rgba(99, 102, 241, 0.05);
        }

        .sidebar-footer {
          display: flex;
          flex-direction: column;
          gap: 10px;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          padding-top: 24px;
        }

        .sidebar-footer-btn {
          width: 100%;
          padding: 12px;
          border-radius: 12px;
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.2s ease;
          box-sizing: border-box;
        }

        .sidebar-footer-btn.exit {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
          color: #e4e4e7;
        }

        .sidebar-footer-btn.exit:hover {
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(255, 255, 255, 0.12);
        }

        .sidebar-footer-btn.logout {
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          border: none;
          color: #ffffff;
          box-shadow: 0 4px 15px rgba(239, 68, 68, 0.25);
        }

        .sidebar-footer-btn.logout:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(239, 68, 68, 0.35);
        }

        /* Main Content Pane */
        .admin-main-content {
          flex-grow: 1;
          padding: 40px 48px;
          overflow-y: auto;
          overflow-x: hidden;
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
        }

        /* Stats Cards */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 24px;
          margin-bottom: 32px;
        }

        .stat-card {
          background: rgba(20, 20, 25, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 20px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
        }

        .stat-card:hover {
          transform: translateY(-4px);
          background: rgba(25, 25, 30, 0.8);
          border-color: rgba(99, 102, 241, 0.3);
          box-shadow: 0 15px 40px rgba(99, 102, 241, 0.1);
        }

        .stat-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .stat-label {
          font-size: 12px;
          color: #71717a;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .stat-icon-wrapper {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .stat-icon-wrapper.users { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
        .stat-icon-wrapper.posts { background: rgba(168, 85, 247, 0.1); color: #a855f7; }
        .stat-icon-wrapper.verified { background: rgba(16, 185, 129, 0.1); color: #10b981; }
        .stat-icon-wrapper.banned { background: rgba(239, 68, 68, 0.1); color: #ef4444; }

        .stat-value {
          font-size: 38px;
          font-weight: 800;
          color: #ffffff;
          line-height: 1.1;
        }

        /* Breakdown Card */
        .breakdown-card {
          background: rgba(20, 20, 25, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 20px;
          padding: 28px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
        }

        .breakdown-card h3 {
          margin: 0 0 24px 0;
          font-size: 18px;
          font-weight: 750;
          letter-spacing: -0.02em;
        }

        .breakdown-bars {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .bar-item {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .bar-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 13px;
        }

        .bar-type-label {
          display: flex;
          align-items: center;
          color: #e4e4e7;
          font-weight: 600;
        }

        .bar-count-label {
          color: #a1a1aa;
        }

        .bar-bg {
          height: 10px;
          background: rgba(255, 255, 255, 0.04);
          border-radius: 6px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.02);
        }

        .bar-fill {
          height: 100%;
          border-radius: 6px;
          transition: width 1s cubic-bezier(0.4, 0, 0.2, 1);
        }

        /* User Moderation Elements */
        .search-container {
          margin-bottom: 24px;
          position: relative;
          max-width: 480px;
          display: flex;
          align-items: center;
        }

        .search-icon {
          position: absolute;
          left: 16px;
          color: #71717a;
          pointer-events: none;
        }

        .search-input {
          width: 100%;
          background: rgba(20, 20, 25, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: #ffffff;
          padding: 14px 16px 14px 48px;
          border-radius: 14px;
          font-size: 14px;
          outline: none;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          box-sizing: border-box;
        }

        .search-input:focus {
          border-color: #818cf8;
          box-shadow: 0 0 20px rgba(99, 102, 241, 0.15);
          background: rgba(20, 20, 25, 0.8);
        }

        .admin-table-container {
          background: rgba(20, 20, 25, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 20px;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
        }

        .admin-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          min-width: 800px;
        }

        .admin-table th {
          background: rgba(255, 255, 255, 0.02);
          color: #a1a1aa;
          font-size: 11px;
          font-weight: 750;
          padding: 18px 24px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .admin-table td {
          padding: 18px 24px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.04);
          font-size: 14px;
          color: #e4e4e7;
          vertical-align: middle;
        }

        .admin-table tr:last-child td {
          border-bottom: none;
        }

        .admin-table tr:hover td {
          background: rgba(255, 255, 255, 0.025);
        }

        .user-info {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .user-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          object-fit: cover;
          border: 1.5px solid rgba(255, 255, 255, 0.1);
        }

        .user-names {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .user-displayname {
          font-weight: 650;
          color: #ffffff;
        }

        .user-username {
          font-size: 12px;
          color: #71717a;
        }

        /* Badges */
        .badge {
          display: inline-flex;
          align-items: center;
          padding: 4px 10px;
          border-radius: 8px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.03em;
        }

        .badge.superadmin {
          background: rgba(99, 102, 241, 0.1);
          color: #818cf8;
          border: 1px solid rgba(99, 102, 241, 0.2);
        }

        .badge.admin {
          background: rgba(168, 85, 247, 0.1);
          color: #c084fc;
          border: 1px solid rgba(168, 85, 247, 0.2);
        }

        .badge.user {
          background: rgba(255, 255, 255, 0.05);
          color: #a1a1aa;
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .badge.banned {
          background: rgba(239, 68, 68, 0.1);
          color: #f87171;
          border: 1px solid rgba(239, 68, 68, 0.2);
        }

        .badge.active {
          background: rgba(16, 185, 129, 0.1);
          color: #34d399;
          border: 1px solid rgba(16, 185, 129, 0.2);
        }

        /* Action Buttons */
        .action-btn-pill {
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #e4e4e7;
          padding: 6px 14px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .action-btn-pill:hover {
          background: rgba(255, 255, 255, 0.04);
          border-color: rgba(255, 255, 255, 0.2);
        }

        .action-btn-pill.ban {
          border-color: rgba(239, 68, 68, 0.25);
          color: #f87171;
        }

        .action-btn-pill.ban:hover {
          background: rgba(239, 68, 68, 0.08);
          border-color: #ef4444;
        }

        .action-btn-pill.unban {
          border-color: rgba(16, 185, 129, 0.25);
          color: #34d399;
        }

        .action-btn-pill.unban:hover {
          background: rgba(16, 185, 129, 0.08);
          border-color: #10b981;
        }

        .admin-system-label {
          font-size: 12px;
          color: #52525b;
          font-style: italic;
        }

        .verify-toggle-btn {
          cursor: pointer;
          background: none;
          border: none;
          padding: 6px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }

        .verify-toggle-btn:hover {
          transform: scale(1.15);
        }

        .verified-badge-circle {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #3b82f6;
          color: #ffffff;
          box-shadow: 0 0 8px rgba(59, 130, 246, 0.3);
        }

        .unverified-badge-circle {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.04);
          border: 1px dashed rgba(255, 255, 255, 0.15);
          color: #52525b;
        }

        /* Content Moderation Grid */
        .posts-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 24px;
        }

        .post-moderation-card {
          background: rgba(20, 20, 25, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 20px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .post-moderation-card:hover {
          transform: translateY(-4px);
          border-color: rgba(255, 255, 255, 0.12);
          box-shadow: 0 15px 40px rgba(0, 0, 0, 0.45);
        }

        .post-media-container {
          position: relative;
          height: 200px;
          width: 100%;
          background: #000000;
          overflow: hidden;
        }

        .post-media-preview {
          width: 100%;
          height: 100%;
          object-fit: cover;
          opacity: 0.85;
          transition: transform 0.5s ease, opacity 0.3s ease;
        }

        .post-moderation-card:hover .post-media-preview {
          opacity: 1;
          transform: scale(1.03);
        }

        .post-type-indicator {
          position: absolute;
          top: 14px;
          right: 14px;
          background: rgba(10, 10, 15, 0.8);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          padding: 4px 10px;
          border-radius: 8px;
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          border: 1px solid rgba(255, 255, 255, 0.06);
        }

        .post-content-section {
          padding: 20px;
          display: flex;
          flex-direction: column;
          flex-grow: 1;
          justify-content: space-between;
          gap: 16px;
        }

        .post-author-row {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 12px;
        }

        .post-author-avatar {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          object-fit: cover;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .post-author-name {
          font-size: 13px;
          font-weight: 650;
          color: #ffffff;
        }

        .post-caption-preview {
          font-size: 13px;
          color: #a1a1aa;
          line-height: 1.5;
          margin: 0;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          min-height: 38px;
        }

        .post-stats-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 12px;
          color: #71717a;
          margin-bottom: 16px;
          border-top: 1px solid rgba(255, 255, 255, 0.04);
          padding-top: 14px;
        }

        .delete-post-btn {
          width: 100%;
          background: rgba(239, 68, 68, 0.08);
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: #f87171;
          padding: 10px;
          border-radius: 12px;
          font-weight: 650;
          font-size: 13px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .delete-post-btn:hover {
          background: #ef4444;
          color: #ffffff;
          border-color: #ef4444;
          box-shadow: 0 4px 15px rgba(239, 68, 68, 0.3);
        }

        /* Pagination Controls */
        .pagination-row {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 16px;
          margin-top: 36px;
        }

        .pagination-btn {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
          color: #e4e4e7;
          padding: 8px 16px;
          border-radius: 10px;
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: all 0.2s ease;
        }

        .pagination-btn:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(255, 255, 255, 0.12);
        }

        .pagination-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .page-indicator {
          font-size: 13px;
          color: #71717a;
        }

        .page-indicator strong {
          color: #ffffff;
        }

        /* Mobile Top Header styles */
        .mobile-admin-header {
          display: none;
        }

        .sidebar-overlay {
          display: none;
        }

        /* Loader */
        .admin-loader {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 80px 0;
          gap: 16px;
        }

        .admin-spinner {
          width: 36px;
          height: 36px;
          border: 3px solid rgba(99, 102, 241, 0.1);
          border-top: 3px solid #6366f1;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        /* Global Error Banner */
        .error-banner {
          background: rgba(239, 68, 68, 0.08); 
          border: 1px solid rgba(239, 68, 68, 0.15); 
          color: #f87171; 
          padding: 14px 18px; 
          border-radius: 14px; 
          margin-bottom: 24px; 
          font-size: 14px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        /* Modal Styles */
        .admin-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
          box-sizing: border-box;
        }

        .admin-modal {
          background: rgba(18, 18, 24, 0.95);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 24px;
          max-width: 520px;
          width: 100%;
          box-shadow: 0 25px 50px rgba(0, 0, 0, 0.6);
          overflow: hidden;
          animation: modalScaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          display: flex;
          flex-direction: column;
          box-sizing: border-box;
        }

        @keyframes modalScaleIn {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }

        .modal-header {
          padding: 24px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .modal-header h3 {
          margin: 0;
          font-size: 18px;
          font-weight: 750;
          letter-spacing: -0.02em;
          color: #ffffff;
        }

        .modal-close-btn {
          background: transparent;
          border: none;
          color: #71717a;
          cursor: pointer;
          padding: 6px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }

        .modal-close-btn:hover {
          color: #ffffff;
          background: rgba(255, 255, 255, 0.06);
        }

        .modal-body {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 24px;
          overflow-y: auto;
          max-height: calc(80vh - 150px);
        }

        .modal-user-profile-header {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .modal-user-avatar {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid rgba(255, 255, 255, 0.1);
        }

        .modal-user-names {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .modal-user-names h4 {
          margin: 0;
          font-size: 18px;
          font-weight: 700;
          color: #ffffff;
        }

        .modal-user-names span {
          font-size: 13px;
          color: #71717a;
        }

        .modal-details-grid {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .detail-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.04);
          border-radius: 12px;
          font-size: 14px;
          gap: 12px;
        }

        .detail-label {
          color: #71717a;
          font-weight: 600;
          flex-shrink: 0;
        }

        .detail-value {
          color: #ffffff;
          font-weight: 600;
          text-align: right;
          word-break: break-all;
        }

        .detail-value-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .modal-footer {
          padding: 20px 24px;
          background: rgba(255, 255, 255, 0.02);
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          display: flex;
          justify-content: flex-end;
          gap: 12px;
        }

        /* Responsive Breakpoints */
        @media (max-width: 991px) {
          .admin-page-wrapper {
            flex-direction: column;
          }

          .mobile-admin-header {
            display: flex;
            background: rgba(10, 10, 15, 0.85);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border-bottom: 1px solid rgba(255, 255, 255, 0.06);
            padding: 16px 20px;
            position: sticky;
            top: 0;
            z-index: 110;
            align-items: center;
            justify-content: space-between;
            width: 100%;
            box-sizing: border-box;
            flex-shrink: 0;
          }

          .mobile-logo-section h1 {
            font-size: 16px;
            font-weight: 800;
            background: linear-gradient(135deg, #818cf8 0%, #c084fc 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin: 0;
          }

          .mobile-logo-section p {
            font-size: 10px;
            color: #71717a;
            margin: 0;
          }

          .mobile-menu-toggle {
            background: transparent;
            border: none;
            color: #ffffff;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 8px;
            border-radius: 8px;
          }

          .admin-sidebar {
            position: fixed;
            top: 60px;
            left: -280px;
            height: calc(100vh - 60px);
            width: 280px;
            box-shadow: 10px 0 35px rgba(0, 0, 0, 0.6);
            z-index: 100;
            padding: 24px;
            background: #0d0d12;
            border-right: 1px solid rgba(255, 255, 255, 0.08);
          }

          .admin-sidebar.open {
            left: 0;
          }

          .sidebar-overlay {
            display: block;
            position: fixed;
            top: 60px;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.6);
            backdrop-filter: blur(6px);
            -webkit-backdrop-filter: blur(6px);
            z-index: 95;
          }

          .admin-main-content {
            padding: 28px 20px;
          }
        }
      `}</style>

      {/* Mobile Top Header */}
      <div className="mobile-admin-header">
        <div className="mobile-logo-section">
          <h1>SUPER ADMIN</h1>
          <p>Oravia Moderation Center</p>
        </div>
        <button className="mobile-menu-toggle" onClick={() => setIsSidebarOpen(!isSidebarOpen)} aria-label="Toggle Navigation Menu">
          <Menu size={22} />
        </button>
      </div>

      {/* Sidebar Overlay (Mobile Close Helper) */}
      {isSidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)}></div>
      )}

      {/* Responsive Left Sidebar */}
      <div className={`admin-sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-top">
          <div className="sidebar-logo">
            <h1><Activity size={22} style={{ color: '#818cf8' }} /> Oravia Admin</h1>
            <p>Platform Analytics & Moderation Center</p>
          </div>

          <nav className="sidebar-menu">
            <button
              className={`sidebar-tab-btn ${activeTab === 'stats' ? 'active' : ''}`}
              onClick={() => { handleTabChange('stats'); setIsSidebarOpen(false); }}
            >
              <BarChart3 size={18} />
              <span>Statistics</span>
            </button>
            <button
              className={`sidebar-tab-btn ${activeTab === 'users' ? 'active' : ''}`}
              onClick={() => { handleTabChange('users'); setIsSidebarOpen(false); }}
            >
              <Users size={18} />
              <span>User Management</span>
            </button>
            <button
              className={`sidebar-tab-btn ${activeTab === 'posts' ? 'active' : ''}`}
              onClick={() => { handleTabChange('posts'); setIsSidebarOpen(false); }}
            >
              <Image size={18} />
              <span>Content Moderation</span>
            </button>
          </nav>
        </div>

        <div className="sidebar-footer">
          <button className="sidebar-footer-btn exit" onClick={handleExit}>
            <ArrowLeft size={15} />
            <span>Exit Dashboard</span>
          </button>
          <button className="sidebar-footer-btn logout" onClick={logout}>
            <LogOut size={15} />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="admin-main-content">
        {/* Global Error Banner */}
        {error && (
          <div className="error-banner">
            <ShieldAlert size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* Loading Spinner */}
        {loading && (
          <div className="admin-loader">
            <div className="admin-spinner"></div>
            <p style={{ color: '#71717a', fontSize: '13px', margin: 0, fontWeight: 500 }}>Syncing database configurations...</p>
          </div>
        )}

        {/* Tab 1: Statistics */}
        {!loading && activeTab === 'stats' && stats && (
          <div className="animate-fade">
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-card-header">
                  <span className="stat-label">Total Users</span>
                  <div className="stat-icon-wrapper users"><Users size={18} /></div>
                </div>
                <span className="stat-value">{stats.totalUsers}</span>
              </div>
              <div className="stat-card">
                <div className="stat-card-header">
                  <span className="stat-label">Total Posts</span>
                  <div className="stat-icon-wrapper posts"><Image size={18} /></div>
                </div>
                <span className="stat-value">{stats.totalPosts}</span>
              </div>
              <div className="stat-card">
                <div className="stat-card-header">
                  <span className="stat-label">Verified Accounts</span>
                  <div className="stat-icon-wrapper verified"><CheckCircle2 size={18} /></div>
                </div>
                <span className="stat-value">{stats.verifiedCount}</span>
              </div>
              <div className="stat-card">
                <div className="stat-card-header">
                  <span className="stat-label">Banned Accounts</span>
                  <div className="stat-icon-wrapper banned"><ShieldAlert size={18} /></div>
                </div>
                <span className="stat-value">{stats.bannedCount}</span>
              </div>
            </div>

            <div className="breakdown-card">
              <h3>Post Content Distribution</h3>
              <div className="breakdown-bars">
                <div className="bar-item">
                  <div className="bar-header">
                    <span className="bar-type-label"><Image size={14} style={{ marginRight: '6px' }} /> Photos</span>
                    <span className="bar-count-label"><strong>{stats.breakdown.photo}</strong> posts ({stats.totalPosts > 0 ? Math.round((stats.breakdown.photo / stats.totalPosts) * 100) : 0}%)</span>
                  </div>
                  <div className="bar-bg">
                    <div
                      className="bar-fill"
                      style={{
                        width: stats.totalPosts > 0 ? `${(stats.breakdown.photo / stats.totalPosts) * 100}%` : '0%',
                        background: 'linear-gradient(90deg, #3b82f6, #60a5fa)'
                      }}
                    ></div>
                  </div>
                </div>

                <div className="bar-item">
                  <div className="bar-header">
                    <span className="bar-type-label"><Play size={14} style={{ marginRight: '6px' }} /> Videos</span>
                    <span className="bar-count-label"><strong>{stats.breakdown.video}</strong> posts ({stats.totalPosts > 0 ? Math.round((stats.breakdown.video / stats.totalPosts) * 100) : 0}%)</span>
                  </div>
                  <div className="bar-bg">
                    <div
                      className="bar-fill"
                      style={{
                        width: stats.totalPosts > 0 ? `${(stats.breakdown.video / stats.totalPosts) * 100}%` : '0%',
                        background: 'linear-gradient(90deg, #ec4899, #f472b6)'
                      }}
                    ></div>
                  </div>
                </div>

                <div className="bar-item">
                  <div className="bar-header">
                    <span className="bar-type-label"><Film size={14} style={{ marginRight: '6px' }} /> Snips / Reels</span>
                    <span className="bar-count-label"><strong>{stats.breakdown.reel}</strong> posts ({stats.totalPosts > 0 ? Math.round((stats.breakdown.reel / stats.totalPosts) * 100) : 0}%)</span>
                  </div>
                  <div className="bar-bg">
                    <div
                      className="bar-fill"
                      style={{
                        width: stats.totalPosts > 0 ? `${(stats.breakdown.reel / stats.totalPosts) * 100}%` : '0%',
                        background: 'linear-gradient(90deg, #a855f7, #c084fc)'
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: User Moderation */}
        {!loading && activeTab === 'users' && (
          <div className="animate-fade">
            <div className="search-container">
              <Search size={18} className="search-icon" />
              <input
                type="text"
                className="search-input"
                placeholder="Search user by username, email, display name..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
              />
            </div>

            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>User Profile</th>
                    <th>Email Address</th>
                    <th>Date Joined</th>
                    <th>Role Privilege</th>
                    <th>Submissions</th>
                    <th>Verified</th>
                    <th>Status</th>
                    <th>Management Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length > 0 ? (
                    users.map((userObj) => (
                      <tr 
                        key={userObj._id} 
                        onClick={() => setSelectedUser(userObj)} 
                        style={{ cursor: 'pointer' }}
                        title="Click to view full user details"
                      >
                        <td>
                          <div className="user-info">
                            <img
                              className="user-avatar"
                              src={userObj.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
                              alt={userObj.username}
                            />
                            <div className="user-names">
                              <span className="user-displayname">{userObj.displayName || userObj.username}</span>
                              <span className="user-username">@{userObj.username}</span>
                            </div>
                          </div>
                        </td>
                        <td>{userObj.email}</td>
                        <td>{new Date(userObj.createdAt).toLocaleDateString()}</td>
                        <td>
                          <span className={`badge ${userObj.role || 'user'}`}>
                            {userObj.role || 'user'}
                          </span>
                        </td>
                        <td style={{ fontWeight: '600' }}>{userObj.postCount || 0}</td>
                        <td>
                          <button
                            className="verify-toggle-btn"
                            title="Toggle verification badge"
                            onClick={(e) => { e.stopPropagation(); handleToggleVerification(userObj._id); }}
                          >
                            {userObj.isVerified ? (
                              <span className="verified-badge-circle"><Check size={10} strokeWidth={4} /></span>
                            ) : (
                              <span className="unverified-badge-circle"></span>
                            )}
                          </button>
                        </td>
                        <td>
                          <span className={`badge ${userObj.isBanned ? 'banned' : 'active'}`}>
                            {userObj.isBanned ? 'Banned' : 'Active'}
                          </span>
                        </td>
                        <td>
                          {userObj.role !== 'superadmin' ? (
                            <button
                              className={`action-btn-pill ${userObj.isBanned ? 'unban' : 'ban'}`}
                              onClick={(e) => { e.stopPropagation(); handleToggleBan(userObj._id, userObj.isBanned); }}
                            >
                              {userObj.isBanned ? 'Unban User' : 'Ban User'}
                            </button>
                          ) : (
                            <span className="admin-system-label">System Admin</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', color: '#71717a', padding: '32px' }}>
                        No users registered matching search query.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {usersTotalPages > 1 && (
              <div className="pagination-row">
                <button
                  className="pagination-btn"
                  disabled={usersPage === 1}
                  onClick={() => setUsersPage((prev) => Math.max(prev - 1, 1))}
                >
                  <ChevronLeft size={16} /> Previous
                </button>
                <span className="page-indicator">
                  Page <strong>{usersPage}</strong> of {usersTotalPages}
                </span>
                <button
                  className="pagination-btn"
                  disabled={usersPage === usersTotalPages}
                  onClick={() => setUsersPage((prev) => Math.min(prev + 1, usersTotalPages))}
                >
                  Next <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Content Moderation */}
        {!loading && activeTab === 'posts' && (
          <div className="animate-fade">
            <div className="posts-grid">
              {posts.length > 0 ? (
                posts.map((postObj) => (
                  <div className="post-moderation-card" key={postObj._id}>
                    <div className="post-media-container">
                      {postObj.type === 'photo' ? (
                        <img
                          src={getFullMediaUrl(postObj.mediaUrl)}
                          alt="Post Media"
                          className="post-media-preview"
                        />
                      ) : (
                        <video
                          src={getFullMediaUrl(postObj.mediaUrl)}
                          className="post-media-preview"
                          muted
                          preload="metadata"
                        />
                      )}
                      <span className="post-type-indicator">{postObj.type}</span>
                    </div>

                    <div className="post-content-section">
                      <div>
                        <div className="post-author-row">
                          <img
                            src={postObj.author?.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
                            alt="Author"
                            className="post-author-avatar"
                          />
                          <span className="post-author-name">
                            @{postObj.author?.username || 'unknown'}
                          </span>
                        </div>
                        <p className="post-caption-preview">
                          {postObj.caption || <span style={{ fontStyle: 'italic', color: '#52525b' }}>No caption</span>}
                        </p>
                      </div>

                      <div>
                        <div className="post-stats-row">
                          <span>❤️ {postObj.likes?.length || 0} Likes</span>
                          <span>📅 {new Date(postObj.createdAt).toLocaleDateString()}</span>
                        </div>
                        <button
                          className="delete-post-btn"
                          onClick={() => handleDeletePost(postObj._id)}
                        >
                          <Trash2 size={13} style={{ marginRight: '6px' }} /> Delete Post
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#71717a', padding: '32px' }}>
                  No posts found on the platform.
                </div>
              )}
            </div>

            {postsTotalPages > 1 && (
              <div className="pagination-row">
                <button
                  className="pagination-btn"
                  disabled={postsPage === 1}
                  onClick={() => setPostsPage((prev) => Math.max(prev - 1, 1))}
                >
                  <ChevronLeft size={16} /> Previous
                </button>
                <span className="page-indicator">
                  Page <strong>{postsPage}</strong> of {postsTotalPages}
                </span>
                <button
                  className="pagination-btn"
                  disabled={postsPage === postsTotalPages}
                  onClick={() => setPostsPage((prev) => Math.min(prev + 1, postsTotalPages))}
                >
                  Next <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* User Details Modal */}
      {selectedUser && (
        <div className="admin-modal-overlay" onClick={() => setSelectedUser(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>User Management Details</h3>
              <button className="modal-close-btn" onClick={() => setSelectedUser(null)} aria-label="Close Modal">
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="modal-user-profile-header">
                <img 
                  className="modal-user-avatar" 
                  src={selectedUser.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'} 
                  alt={selectedUser.username} 
                />
                <div className="modal-user-names">
                  <h4>{selectedUser.displayName || selectedUser.username}</h4>
                  <span>@{selectedUser.username}</span>
                </div>
              </div>

              <div className="modal-details-grid">
                <div className="detail-item">
                  <span className="detail-label">Email Address</span>
                  <span className="detail-value">{selectedUser.email}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Phone Number</span>
                  <span className="detail-value">{selectedUser.phone || 'Not Provided'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Date Joined</span>
                  <span className="detail-value">{new Date(selectedUser.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Role Privilege</span>
                  <span className="detail-value">
                    <span className={`badge ${selectedUser.role || 'user'}`}>
                      {selectedUser.role || 'user'}
                    </span>
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Total Submissions</span>
                  <span className="detail-value">{selectedUser.postCount || 0} Posts</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Verification Status</span>
                  <div className="detail-value-row">
                    {selectedUser.isVerified ? (
                      <span className="verified-badge-circle" style={{ marginRight: '10px' }}><Check size={10} strokeWidth={4} /></span>
                    ) : (
                      <span className="unverified-badge-circle" style={{ marginRight: '10px' }}></span>
                    )}
                    <button
                      className="action-btn-pill"
                      onClick={() => handleToggleVerification(selectedUser._id)}
                    >
                      Toggle Badge
                    </button>
                  </div>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Account Status</span>
                  <div className="detail-value-row">
                    <span className={`badge ${selectedUser.isBanned ? 'banned' : 'active'}`} style={{ marginRight: '10px' }}>
                      {selectedUser.isBanned ? 'Banned' : 'Active'}
                    </span>
                    {selectedUser.role !== 'superadmin' ? (
                      <button
                        className={`action-btn-pill ${selectedUser.isBanned ? 'unban' : 'ban'}`}
                        onClick={() => handleToggleBan(selectedUser._id, selectedUser.isBanned)}
                      >
                        {selectedUser.isBanned ? 'Unban User' : 'Ban User'}
                      </button>
                    ) : (
                      <span className="admin-system-label">Protected</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="sidebar-footer-btn exit" onClick={() => {
                setSelectedUser(null);
                navigate(`/profile/${selectedUser.username}`);
              }}>
                <Users size={14} style={{ marginRight: '6px' }} /> View Public Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
