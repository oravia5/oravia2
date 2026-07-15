import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Search, Bell } from 'lucide-react';
import client from '../api/client';
import PostCard from '../components/PostCard/PostCard';
import ReelCard from '../components/ReelCard/ReelCard';
import { useNotifications } from '../context/NotificationContext';

export default function Home() {
  const [feedItems, setFeedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showMessagesModal, setShowMessagesModal] = useState(false);
  const { unreadCount } = useNotifications();
  
  const navigate = useNavigate();

  const fetchFeed = async () => {
    try {
      const res = await client.get('/posts/feed');
      if (res.data.success) {
        setFeedItems(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching feed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeed();
  }, []);

  const handleDeletePost = (deletedId) => {
    setFeedItems(feedItems.filter(item => item._id !== deletedId));
  };

  return (
    <div className="page-container">
      {/* Header Bar */}
      <header className="glass-header">
        <div className="brand-logo-container" onClick={() => navigate('/')}>
          <Sparkles className="logo-spark" size={18} />
          <span className="brand-logo">Oravia</span>
        </div>
        <div className="top-nav-actions">
          <button className="top-action-btn" onClick={() => navigate('/search')} aria-label="Search Profiles">
            <Search size={18} />
          </button>
          <button className="top-action-btn" onClick={() => navigate('/notifications')} aria-label="Notifications">
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="top-bell-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
              )}
            </div>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="feed-body">
        {loading ? (
          <div className="feed-loader-container">
            <div className="spinner"></div>
            <p>Gathering your feed...</p>
          </div>
        ) : feedItems.length === 0 ? (
          <div className="empty-feed-container">
            <div className="empty-emoji">🌱</div>
            <h3>Your feed is empty</h3>
            <p>Follow users or upload your first photo/video post from the bottom bar to get started!</p>
          </div>
        ) : (
          <div className="feed-list">
            {feedItems.map((item) => {
              if (item.type === 'reel') {
                return <ReelCard key={item._id} reel={item} />;
              }
              return (
                <PostCard 
                  key={item._id} 
                  post={item} 
                  onDeleteSuccess={handleDeletePost} 
                />
              );
            })}
          </div>
        )}
      </main>

      {/* Messages Modal */}
      {showMessagesModal && (
        <div className="messages-modal-overlay" onClick={() => setShowMessagesModal(false)}>
          <div className="messages-modal-card animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="modal-drag-handle"></div>
            <div className="modal-header">
              <h4>Messages</h4>
              <button className="modal-close-x" onClick={() => setShowMessagesModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="empty-messages-graphic">💬</div>
              <h5>Direct Messages Coming Soon</h5>
              <p>Messaging is currently in private beta for Oravia team accounts. It will be released in v2.0 shortly!</p>
              <button className="btn-primary modal-close-btn" onClick={() => setShowMessagesModal(false)}>
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .page-container {
          width: 100%;
          min-height: 100vh;
          background-color: #000000;
        }

        .brand-logo-container {
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
        }

        .logo-spark {
          color: #ffffff;
          filter: drop-shadow(0 0 3px rgba(255, 255, 255, 0.4));
        }

        .brand-logo {
          font-family: 'Outfit', sans-serif;
          font-size: 20px;
          font-weight: 800;
          letter-spacing: -0.03em;
          color: #ffffff;
        }

        .top-nav-actions {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .top-action-btn {
          background: none;
          border: none;
          color: #ffffff;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 6px;
          transition: opacity 0.2s;
        }

        .top-action-btn:hover {
          opacity: 0.8;
        }

        .feed-body {
          padding: 0 0 80px 0;
        }

        .feed-loader-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 300px;
          color: var(--text-secondary);
          gap: 12px;
        }

        .spinner {
          width: 32px;
          height: 32px;
          border: 3px solid rgba(255,255,255,0.08);
          border-top-color: #ffffff;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        .empty-feed-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 80px 40px;
          color: var(--text-secondary);
        }

        .empty-emoji {
          font-size: 48px;
          margin-bottom: 16px;
        }

        .empty-feed-container h3 {
          color: #ffffff;
          font-size: 18px;
          margin-bottom: 8px;
        }

        .empty-feed-container p {
          font-size: 14px;
          line-height: 1.5;
        }

        .feed-list {
          display: flex;
          flex-direction: column;
        }

        /* Messages Modal Styles */
        .messages-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(4px);
          z-index: 1000;
          display: flex;
          align-items: flex-end;
          justify-content: center;
        }

        .messages-modal-card {
          width: 100%;
          max-width: 500px;
          background: #0a0a0a;
          border-top: 1px solid #222222;
          border-top-left-radius: 24px;
          border-top-right-radius: 24px;
          padding: 24px;
          box-shadow: 0 -10px 30px rgba(0, 0, 0, 0.9);
        }

        .modal-drag-handle {
          width: 36px;
          height: 4px;
          background: #333333;
          border-radius: 2px;
          margin: 0 auto 16px auto;
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 24px;
        }

        .modal-header h4 {
          font-size: 18px;
          font-weight: 700;
        }

        .modal-close-x {
          background: none;
          border: none;
          color: #71717a;
          font-size: 24px;
          cursor: pointer;
        }

        .modal-body {
          text-align: center;
          padding: 16px 0;
        }

        .empty-messages-graphic {
          font-size: 48px;
          margin-bottom: 16px;
        }

        .modal-body h5 {
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 8px;
          color: #ffffff;
        }

        .modal-body p {
          font-size: 13px;
          color: #a1a1aa;
          line-height: 1.6;
          margin-bottom: 24px;
          max-width: 280px;
          margin-left: auto;
          margin-right: auto;
        }

        .modal-close-btn {
          width: 100%;
          padding: 12px;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .animate-slide-up {
          animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }

        .top-bell-badge {
          position: absolute;
          top: -6px;
          right: -7px;
          background: #ef4444;
          color: #fff;
          font-size: 8px;
          font-weight: 700;
          min-width: 13px;
          height: 13px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 2px;
          border: 1px solid #000;
          line-height: 1;
        }
      `}</style>
    </div>
  );
}
