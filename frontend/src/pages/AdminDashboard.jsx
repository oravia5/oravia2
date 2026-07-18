import React, { useState, useEffect } from 'react';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getFullMediaUrl } from '../utils/mediaUrl';

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
          background: linear-gradient(135deg, #09090b 0%, #111115 100%);
          color: #f4f4f5;
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          padding: 40px 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .admin-container {
          width: 100%;
          max-width: 1200px;
          background: rgba(18, 18, 24, 0.6);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 24px;
          padding: 32px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
        }

        /* Header Styles */
        .admin-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          padding-bottom: 24px;
          margin-bottom: 32px;
        }

        .admin-logo-section h1 {
          font-size: 26px;
          font-weight: 800;
          letter-spacing: -0.03em;
          background: linear-gradient(90deg, #6366f1 0%, #a855f7 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin: 0 0 4px 0;
        }

        .admin-logo-section p {
          font-size: 13px;
          color: #71717a;
          margin: 0;
        }

        .admin-actions {
          display: flex;
          gap: 12px;
        }

        .exit-btn {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #e4e4e7;
          padding: 10px 20px;
          border-radius: 12px;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .exit-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.2);
          transform: translateY(-2px);
        }

        .logout-btn {
          background: linear-gradient(90deg, #ef4444 0%, #dc2626 100%);
          border: none;
          color: #ffffff;
          padding: 10px 20px;
          border-radius: 12px;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2);
        }

        .logout-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(239, 68, 68, 0.4);
        }

        /* Navigation Tabs */
        .admin-tabs {
          display: flex;
          gap: 8px;
          background: rgba(255, 255, 255, 0.03);
          padding: 6px;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.05);
          margin-bottom: 32px;
          width: fit-content;
        }

        .tab-btn {
          background: transparent;
          border: none;
          color: #a1a1aa;
          padding: 10px 24px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .tab-btn:hover {
          color: #ffffff;
        }

        .tab-btn.active {
          background: rgba(99, 102, 241, 0.15);
          border: 1px solid rgba(99, 102, 241, 0.3);
          color: #818cf8;
        }

        /* Stats Cards */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 20px;
          margin-bottom: 32px;
        }

        .stat-card {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 18px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .stat-card::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 4px;
          height: 100%;
          background: #6366f1;
        }

        .stat-card.banned::after {
          background: #ef4444;
        }

        .stat-card.verified::after {
          background: #3b82f6;
        }

        .stat-card:hover {
          transform: translateY(-4px);
          background: rgba(255, 255, 255, 0.04);
          border-color: rgba(255, 255, 255, 0.1);
        }

        .stat-label {
          font-size: 13px;
          color: #71717a;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 8px;
        }

        .stat-value {
          font-size: 32px;
          font-weight: 800;
          color: #ffffff;
        }

        /* Detail Breakdown Section */
        .breakdown-card {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 18px;
          padding: 24px;
          margin-top: 24px;
        }

        .breakdown-card h3 {
          margin: 0 0 20px 0;
          font-size: 18px;
          font-weight: 700;
        }

        .breakdown-bars {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .bar-item {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .bar-header {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
          color: #a1a1aa;
        }

        .bar-bg {
          height: 8px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 4px;
          overflow: hidden;
        }

        .bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #6366f1, #a855f7);
          border-radius: 4px;
          transition: width 0.8s ease;
        }

        /* Moderation Elements */
        .search-container {
          margin-bottom: 24px;
          position: relative;
          max-width: 400px;
        }

        .search-input {
          width: 100%;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: #ffffff;
          padding: 12px 16px;
          border-radius: 12px;
          font-size: 14px;
          outline: none;
          transition: all 0.2s ease;
        }

        .search-input:focus {
          border-color: #6366f1;
          box-shadow: 0 0 10px rgba(99, 102, 241, 0.2);
          background: rgba(255, 255, 255, 0.05);
        }

        /* Modern Table/Grid */
        .admin-table-container {
          overflow-x: auto;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .admin-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        .admin-table th {
          background: rgba(255, 255, 255, 0.03);
          color: #a1a1aa;
          font-size: 13px;
          font-weight: 600;
          padding: 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .admin-table td {
          padding: 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          font-size: 14px;
          color: #e4e4e7;
          vertical-align: middle;
        }

        .admin-table tr:hover {
          background: rgba(255, 255, 255, 0.01);
        }

        .user-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .user-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          object-fit: cover;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .user-names {
          display: flex;
          flex-direction: column;
        }

        .user-displayname {
          font-weight: 600;
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
          border-radius: 20px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
        }

        .badge.admin {
          background: rgba(168, 85, 247, 0.15);
          color: #c084fc;
          border: 1px solid rgba(168, 85, 247, 0.3);
        }

        .badge.superadmin {
          background: rgba(99, 102, 241, 0.15);
          color: #818cf8;
          border: 1px solid rgba(99, 102, 241, 0.3);
        }

        .badge.user {
          background: rgba(255, 255, 255, 0.05);
          color: #a1a1aa;
        }

        .badge.banned {
          background: rgba(239, 68, 68, 0.15);
          color: #f87171;
          border: 1px solid rgba(239, 68, 68, 0.3);
        }

        .badge.active {
          background: rgba(34, 197, 94, 0.15);
          color: #4ade80;
          border: 1px solid rgba(34, 197, 94, 0.3);
        }

        /* Action Buttons */
        .action-btn {
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #e4e4e7;
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .action-btn:hover {
          background: rgba(255, 255, 255, 0.05);
          transform: translateY(-1px);
        }

        .action-btn.ban {
          border-color: rgba(239, 68, 68, 0.3);
          color: #f87171;
        }

        .action-btn.ban:hover {
          background: rgba(239, 68, 68, 0.1);
          border-color: #ef4444;
        }

        .action-btn.unban {
          border-color: rgba(34, 197, 94, 0.3);
          color: #4ade80;
        }

        .action-btn.unban:hover {
          background: rgba(34, 197, 94, 0.1);
          border-color: #22c55e;
        }

        .verify-toggle-btn {
          cursor: pointer;
          background: none;
          border: none;
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          transition: transform 0.2s ease;
        }

        .verify-toggle-btn:hover {
          transform: scale(1.2);
        }

        /* Posts Management Grid */
        .posts-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 20px;
        }

        .post-moderation-card {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 18px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .post-media-container {
          position: relative;
          height: 180px;
          width: 100%;
          background: #000;
          overflow: hidden;
        }

        .post-media-preview {
          width: 100%;
          height: 100%;
          object-fit: cover;
          opacity: 0.8;
          transition: opacity 0.3s ease;
        }

        .post-moderation-card:hover .post-media-preview {
          opacity: 1;
        }

        .post-type-indicator {
          position: absolute;
          top: 12px;
          right: 12px;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(4px);
          padding: 4px 8px;
          border-radius: 8px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
        }

        .post-content-section {
          padding: 16px;
          display: flex;
          flex-direction: column;
          flex-grow: 1;
          justify-content: space-between;
        }

        .post-author-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
        }

        .post-author-avatar {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          object-fit: cover;
        }

        .post-author-name {
          font-size: 13px;
          font-weight: 600;
          color: #ffffff;
        }

        .post-caption-preview {
          font-size: 13px;
          color: #a1a1aa;
          line-height: 1.4;
          margin-bottom: 16px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          min-height: 36px;
        }

        .post-stats-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 12px;
          color: #71717a;
          margin-bottom: 16px;
        }

        .delete-post-btn {
          width: 100%;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: #f87171;
          padding: 10px;
          border-radius: 10px;
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .delete-post-btn:hover {
          background: #ef4444;
          color: #ffffff;
          border-color: #ef4444;
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2);
        }

        /* Pagination Controls */
        .pagination-row {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 16px;
          margin-top: 24px;
        }

        .page-indicator {
          font-size: 14px;
          color: #71717a;
        }

        /* Spinner & Loading */
        .admin-loader {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 0;
          gap: 12px;
        }

        .admin-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid rgba(99, 102, 241, 0.1);
          border-top: 3px solid #6366f1;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

      <div className="admin-container">
        {/* Header */}
        <div className="admin-header">
          <div className="admin-logo-section">
            <h1>SUPER ADMIN DASHBOARD</h1>
            <p>Platform Analytics & Moderation Center</p>
          </div>
          <div className="admin-actions">
            <button className="exit-btn" onClick={handleExit}>Exit Dashboard</button>
            <button className="logout-btn" onClick={logout}>Logout</button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="admin-tabs">
          <button
            className={`tab-btn ${activeTab === 'stats' ? 'active' : ''}`}
            onClick={() => handleTabChange('stats')}
          >
            📊 Statistics
          </button>
          <button
            className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => handleTabChange('users')}
          >
            👥 User Management
          </button>
          <button
            className={`tab-btn ${activeTab === 'posts' ? 'active' : ''}`}
            onClick={() => handleTabChange('posts')}
          >
            🖼️ Content Moderation
          </button>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#f87171', padding: '12px 16px', borderRadius: '12px', marginBottom: '24px', fontSize: '14px' }}>
            ⚠️ {error}
          </div>
        )}

        {/* Loading Spinner */}
        {loading && (
          <div className="admin-loader">
            <div className="admin-spinner"></div>
            <p style={{ color: '#71717a', fontSize: '14px', margin: 0 }}>Syncing database configurations...</p>
          </div>
        )}

        {/* Tab 1: Statistics */}
        {!loading && activeTab === 'stats' && stats && (
          <div>
            <div className="stats-grid">
              <div className="stat-card">
                <span className="stat-label">Total Users</span>
                <span className="stat-value">{stats.totalUsers}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Total Posts</span>
                <span className="stat-value">{stats.totalPosts}</span>
              </div>
              <div className="stat-card verified">
                <span className="stat-label">Verified Users (Blue Tick)</span>
                <span className="stat-value">{stats.verifiedCount}</span>
              </div>
              <div className="stat-card banned">
                <span className="stat-label">Banned Users</span>
                <span className="stat-value">{stats.bannedCount}</span>
              </div>
            </div>

            <div className="breakdown-card">
              <h3>Post Type Breakdown</h3>
              <div className="breakdown-bars">
                <div className="bar-item">
                  <div className="bar-header">
                    <span>Photos</span>
                    <span>{stats.breakdown.photo} Posts</span>
                  </div>
                  <div className="bar-bg">
                    <div
                      className="bar-fill"
                      style={{
                        width: stats.totalPosts > 0
                          ? `${(stats.breakdown.photo / stats.totalPosts) * 100}%`
                          : '0%',
                        background: 'linear-gradient(90deg, #3b82f6, #60a5fa)'
                      }}
                    ></div>
                  </div>
                </div>

                <div className="bar-item">
                  <div className="bar-header">
                    <span>Videos</span>
                    <span>{stats.breakdown.video} Posts</span>
                  </div>
                  <div className="bar-bg">
                    <div
                      className="bar-fill"
                      style={{
                        width: stats.totalPosts > 0
                          ? `${(stats.breakdown.video / stats.totalPosts) * 100}%`
                          : '0%',
                        background: 'linear-gradient(90deg, #ec4899, #f472b6)'
                      }}
                    ></div>
                  </div>
                </div>

                <div className="bar-item">
                  <div className="bar-header">
                    <span>Snips / Reels</span>
                    <span>{stats.breakdown.reel} Posts</span>
                  </div>
                  <div className="bar-bg">
                    <div
                      className="bar-fill"
                      style={{
                        width: stats.totalPosts > 0
                          ? `${(stats.breakdown.reel / stats.totalPosts) * 100}%`
                          : '0%',
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
          <div>
            <div className="search-container">
              <input
                type="text"
                className="search-input"
                placeholder="Search username, email, display name..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
              />
            </div>

            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Email</th>
                    <th>Joined</th>
                    <th>Role</th>
                    <th>Posts Count</th>
                    <th>Verified</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length > 0 ? (
                    users.map((userObj) => (
                      <tr key={userObj._id}>
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
                            onClick={() => handleToggleVerification(userObj._id)}
                          >
                            {userObj.isVerified ? '🔵' : '⚪'}
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
                              className={`action-btn ${userObj.isBanned ? 'unban' : 'ban'}`}
                              onClick={() => handleToggleBan(userObj._id, userObj.isBanned)}
                            >
                              {userObj.isBanned ? 'Unban User' : 'Ban User'}
                            </button>
                          ) : (
                            <span style={{ fontSize: '12px', color: '#71717a' }}>System Admin</span>
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
                  className="exit-btn"
                  disabled={usersPage === 1}
                  onClick={() => setUsersPage((prev) => Math.max(prev - 1, 1))}
                >
                  Previous
                </button>
                <span className="page-indicator">
                  Page {usersPage} of {usersTotalPages}
                </span>
                <button
                  className="exit-btn"
                  disabled={usersPage === usersTotalPages}
                  onClick={() => setUsersPage((prev) => Math.min(prev + 1, usersTotalPages))}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Content Moderation */}
        {!loading && activeTab === 'posts' && (
          <div>
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
                          Delete Post
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
                  className="exit-btn"
                  disabled={postsPage === 1}
                  onClick={() => setPostsPage((prev) => Math.max(prev - 1, 1))}
                >
                  Previous
                </button>
                <span className="page-indicator">
                  Page {postsPage} of {postsTotalPages}
                </span>
                <button
                  className="exit-btn"
                  disabled={postsPage === postsTotalPages}
                  onClick={() => setPostsPage((prev) => Math.min(prev + 1, postsTotalPages))}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
