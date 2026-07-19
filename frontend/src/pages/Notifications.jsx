import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, MessageCircle, UserPlus, Share2, Bell, Loader2, ArrowLeft } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';
import { getFullMediaUrl } from '../utils/mediaUrl';



const getNotificationText = (type) => {
  switch (type) {
    case 'like': return 'liked your post';
    case 'dislike': return 'disliked your post';
    case 'comment': return 'commented on your post';
    case 'follow': return 'started following you';
    case 'share': return 'shared your post';
    case 'comment_like': return 'liked your comment';
    default: return 'interacted with your post';
  }
};

const getNotificationIcon = (type) => {
  switch (type) {
    case 'like': return <Heart size={16} fill="#f43f5e" color="#f43f5e" />;
    case 'dislike': return <Heart size={16} color="#71717a" style={{ transform: 'rotate(180deg)' }} />;
    case 'comment': return <MessageCircle size={16} color="#3b82f6" />;
    case 'follow': return <UserPlus size={16} color="#22c55e" />;
    case 'share': return <Share2 size={16} color="#eab308" />;
    case 'comment_like': return <Heart size={16} fill="#f43f5e" color="#f43f5e" />;
    default: return <Bell size={16} />;
  }
};

const formatTime = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 60) return `${diffMins || 1}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString();
};

export default function Notifications() {
  const { notifications, loading, fetchNotifications, markAsRead, markAllAsRead } = useNotifications();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();

  const [followingMap, setFollowingMap] = useState({});
  const [listLoading, setListLoading] = useState(false);

  // Sync follow map
  const syncFollowMap = useCallback(async (notifsList) => {
    if (!currentUser || !notifsList || notifsList.length === 0) return;
    try {
      const myRes = await client.get(`/users/${currentUser.username}`);
      if (myRes.data.success) {
        const myFollowingIds = myRes.data.data.following || [];
        const map = {};
        notifsList.forEach((n) => {
          if (n.actor) {
            map[n.actor._id] = myFollowingIds.some((fid) => String(fid) === String(n.actor._id));
          }
        });
        setFollowingMap(map);
      }
    } catch (err) {
      console.error('Error syncing follow map in notifications:', err);
    }
  }, [currentUser]);

  const loadNotificationsData = useCallback(async () => {
    setListLoading(true);
    const data = await fetchNotifications(1);
    if (data && data.notifications) {
      await syncFollowMap(data.notifications);
      if (data.unread > 0) {
        await markAllAsRead();
      }
    }
    setListLoading(false);
  }, [fetchNotifications, syncFollowMap, markAllAsRead]);

  useEffect(() => {
    loadNotificationsData();
  }, []);

  const handleNotificationClick = async (n) => {
    if (!n.read) {
      await markAsRead(n._id);
    }
    if (n.post) {
      navigate(`/post/${n.post._id || n.post}`);
    } else if (n.type === 'follow') {
      navigate(`/profile/${n.actor?.username}`);
    }
  };

  const handleFollowToggle = async (e, actorId) => {
    e.stopPropagation(); // Prevent row click navigation
    if (!currentUser) return;

    const isFollowing = followingMap[actorId];
    const newFollowing = !isFollowing;
    setFollowingMap((m) => ({ ...m, [actorId]: newFollowing }));

    try {
      await client.post(`/users/${actorId}/${isFollowing ? 'unfollow' : 'follow'}`);
    } catch (err) {
      setFollowingMap((m) => ({ ...m, [actorId]: isFollowing }));
    }
  };

  const isUnread = (n) => !n.read;

  return (
    <div className="notifications-page-container animate-fade">
      {/* Header Bar */}
      <header className="notif-page-header">
        <button className="notif-back-btn" onClick={() => navigate(-1)} aria-label="Go Back">
          <ArrowLeft size={20} />
        </button>
        <div className="header-title-box">
          <h4>Notifications</h4>
        </div>
        <div className="header-right-action">
          {notifications.some(isUnread) && (
            <button className="mark-all-read-btn" onClick={markAllAsRead}>
              Mark all read
            </button>
          )}
        </div>
      </header>

      {/* List Body */}
      <main className="notif-page-body">
        {listLoading && notifications.length === 0 ? (
          <div className="notif-page-loader">
            <Loader2 size={32} className="spin-icon" />
            <p>Loading alerts...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="empty-notif-state">
            <div className="empty-bell-icon">
              <Bell size={48} />
            </div>
            <h5>All Quiet Here!</h5>
            <p>We'll notify you when someone interacts with your posts, comments, or follows you.</p>
          </div>
        ) : (
          <div className="notif-list-wrapper">
            {notifications.map((n) => (
              <div
                key={n._id}
                className={`notif-card-item ${n.read ? 'read-item' : 'unread-item'}`}
                onClick={() => handleNotificationClick(n)}
              >
                {/* Left Actor Avatar */}
                <div 
                  className="actor-avatar-box" 
                  onClick={(e) => {
                    e.stopPropagation();
                    if (n.actor?.username) navigate(`/profile/${n.actor.username}`);
                  }}
                >
                  <img
                    src={getFullMediaUrl(n.actor?.avatarUrl) || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                    alt={n.actor?.username || 'user'}
                    className="actor-img"
                  />
                  <div className="mini-icon-badge">
                    {getNotificationIcon(n.type)}
                  </div>
                </div>

                {/* Middle Alert Description */}
                <div className="alert-content-box">
                  <span className="alert-description-text">
                    <strong>{n.actor?.displayName || n.actor?.username || 'Someone'}</strong>{' '}
                    {getNotificationText(n.type)}
                  </span>
                  <span className="alert-time-elapsed">{formatTime(n.createdAt)}</span>
                </div>

                {/* Right Action Box: Follow Back button or Post Preview Thumbnail */}
                <div className="alert-action-box">
                  {n.type === 'follow' && n.actor && (
                    <button
                      className={`notif-follow-btn ${followingMap[n.actor._id] ? 'btn-following' : 'btn-not-following'}`}
                      onClick={(e) => handleFollowToggle(e, n.actor._id)}
                    >
                      {followingMap[n.actor._id] ? 'Following' : 'Follow Back'}
                    </button>
                  )}

                  {n.post?.mediaUrl && (() => {
                    // Photos can use mediaUrl directly, but video/reel posts need
                    // thumbnailUrl since mediaUrl points to a video file, not an image.
                    const previewSrc = n.post.type === 'photo'
                      ? n.post.mediaUrl
                      : (n.post.thumbnailUrl || null);

                    if (!previewSrc) return null;

                    return (
                      <div
                        className="post-preview-thumbnail"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/post/${n.post._id || n.post}`);
                        }}
                      >
                        <img src={getFullMediaUrl(previewSrc)} alt="Post preview" />
                      </div>
                    );
                  })()}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <style>{`
        .notifications-page-container {
          background: #000000;
          color: #ffffff;
          padding-top: 60px;
          padding-bottom: 20px;
        }

        .notif-page-header {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: 60px;
          background: rgba(0, 0, 0, 0.85);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 16px;
          z-index: 100;
        }

        .notif-back-btn {
          background: none;
          border: none;
          color: #ffffff;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 6px;
          border-radius: 50%;
          transition: background 0.2s;
        }

        .notif-back-btn:hover {
          background: rgba(255, 255, 255, 0.08);
        }

        .header-title-box h4 {
          font-family: 'Outfit', sans-serif;
          font-size: 17px;
          font-weight: 700;
          margin: 0;
        }

        .mark-all-read-btn {
          background: none;
          border: none;
          color: var(--accent-indigo);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: opacity 0.2s;
        }

        .mark-all-read-btn:hover {
          opacity: 0.8;
        }

        .notif-page-body {
          padding: 8px 0;
          max-width: 600px;
          margin: 0 auto;
        }

        .notif-page-loader {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 100px 20px;
          gap: 12px;
          color: #71717a;
        }

        .spin-icon {
          color: var(--accent-indigo);
          animation: spinLoader 0.8s linear infinite;
        }

        @keyframes spinLoader {
          to { transform: rotate(360deg); }
        }

        .empty-notif-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 80px 20px;
          color: #71717a;
          text-align: center;
        }

        .empty-bell-icon {
          background: rgba(255, 255, 255, 0.03);
          width: 80px;
          height: 80px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #3f3f46;
          margin-bottom: 18px;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .empty-notif-state h5 {
          font-family: 'Outfit', sans-serif;
          font-size: 16px;
          font-weight: 700;
          color: #ffffff;
          margin: 0 0 6px 0;
        }

        .empty-notif-state p {
          font-size: 13px;
          max-width: 280px;
          line-height: 1.5;
          margin: 0;
        }

        .notif-list-wrapper {
          display: flex;
          flex-direction: column;
        }

        .notif-card-item {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 14px 20px;
          cursor: pointer;
          border-bottom: 1px solid rgba(255, 255, 255, 0.03);
          transition: background 0.2s;
        }

        .notif-card-item:hover {
          background: rgba(255, 255, 255, 0.03);
        }

        .unread-item {
          background: rgba(99, 102, 241, 0.05);
          border-left: 3.5px solid var(--accent-indigo);
          padding-left: 16.5px;
        }

        .actor-avatar-box {
          position: relative;
          width: 44px;
          height: 44px;
          flex-shrink: 0;
        }

        .actor-img {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          object-fit: cover;
          border: 1.5px solid rgba(255, 255, 255, 0.1);
        }

        .mini-icon-badge {
          position: absolute;
          bottom: -4px;
          right: -4px;
          background: #000000;
          border-radius: 50%;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1.5px solid #000000;
          padding: 2px;
          box-shadow: 0 2px 6px rgba(0,0,0,0.5);
        }

        .alert-content-box {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0;
          text-align: left;
        }

        .alert-description-text {
          font-size: 13.5px;
          color: #eeeeee;
          line-height: 1.45;
        }

        .alert-description-text strong {
          color: #ffffff;
          font-weight: 600;
        }

        .alert-time-elapsed {
          font-size: 11px;
          color: #71717a;
          margin-top: 4px;
        }

        .alert-action-box {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          margin-left: 8px;
        }

        .notif-follow-btn {
          font-size: 11.5px;
          font-weight: 700;
          padding: 6px 14px;
          border-radius: 9999px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-not-following {
          background: var(--accent-indigo);
          color: #ffffff;
          border: none;
        }

        .btn-not-following:hover {
          background: var(--accent-violet);
          transform: scale(1.02);
        }

        .btn-following {
          background: rgba(255, 255, 255, 0.08);
          color: rgba(255, 255, 255, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .btn-following:hover {
          background: rgba(255, 255, 255, 0.15);
          color: #ffffff;
          border-color: rgba(255, 255, 255, 0.35);
        }

        .post-preview-thumbnail {
          width: 42px;
          height: 42px;
          border-radius: 6px;
          overflow: hidden;
          cursor: pointer;
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .post-preview-thumbnail img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
      `}</style>
    </div>
  );
}
