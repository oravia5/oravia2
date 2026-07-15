import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, UserMinus, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';

export default function BlockedAccounts() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const getFullMediaUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `http://127.0.0.1:5000${url}`;
  };

  const fetchBlockedUsers = async () => {
    setLoading(true);
    try {
      if (user?.username) {
        const res = await client.get(`/users/${user.username}`);
        if (res.data.success) {
          setBlockedUsers(res.data.data.blockedUsers || []);
        }
      }
    } catch (err) {
      console.error('Error fetching blocked accounts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUnblockUser = async (targetUserId) => {
    try {
      const res = await client.post(`/users/${targetUserId}/unblock`);
      if (res.data.success) {
        setBlockedUsers(prev => prev.filter(u => u._id !== targetUserId));
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to unblock user');
    }
  };

  useEffect(() => {
    fetchBlockedUsers();
  }, [user]);

  return (
    <div className="settings-subpage">
      <header className="subpage-header">
        <button className="back-btn" onClick={() => navigate('/settings')} aria-label="Back">
          <ArrowLeft size={20} />
        </button>
        <span className="subpage-header-title">Blocked Accounts</span>
        <div style={{ width: '36px' }} /> {/* Spacer */}
      </header>

      <main className="subpage-body">
        {loading ? (
          <div className="subpage-loader">
            <Loader2 className="spinner animate-spin" size={32} />
            <p>Loading blocked accounts...</p>
          </div>
        ) : blockedUsers.length === 0 ? (
          <div className="subpage-empty-state">
            <UserMinus size={48} className="empty-icon text-muted" />
            <h3>No Blocked Accounts</h3>
            <p>Accounts you block will appear here. You can unblock them at any time.</p>
          </div>
        ) : (
          <div className="blocked-list-container" style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
            {blockedUsers.map((u) => (
              <div 
                key={u._id} 
                className="blocked-user-row"
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  padding: '12px 16px', 
                  background: '#18181b', 
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.08)' 
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <img 
                    src={u.avatarUrl ? getFullMediaUrl(u.avatarUrl) : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'} 
                    alt="" 
                    style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover' }} 
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#fff' }}>{u.displayName || u.username}</span>
                    <span style={{ fontSize: '11px', color: '#71717a' }}>@{u.username}</span>
                  </div>
                </div>
                <button
                  onClick={() => handleUnblockUser(u._id)}
                  style={{ 
                    background: 'rgba(255, 255, 255, 0.08)', 
                    color: '#fff', 
                    border: '1px solid rgba(255, 255, 255, 0.15)', 
                    borderRadius: '8px', 
                    padding: '6px 14px', 
                    fontSize: '12px', 
                    fontWeight: '600', 
                    cursor: 'pointer',
                    transition: 'all 0.2s' 
                  }}
                  onMouseEnter={(e) => { e.target.style.background = '#ef4444'; e.target.style.borderColor = '#ef4444'; }}
                  onMouseLeave={(e) => { e.target.style.background = 'rgba(255, 255, 255, 0.08)'; e.target.style.borderColor = 'rgba(255, 255, 255, 0.15)'; }}
                >
                  Unblock
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
