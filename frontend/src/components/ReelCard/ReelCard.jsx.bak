import React, { useState, useRef } from 'react';
import { getFullMediaUrl } from '../../utils/mediaUrl';
import { useNavigate, Link } from 'react-router-dom';
import { Heart, ThumbsDown, MessageCircle, Share2, Bookmark, Play, Volume2, Film, Camera, MoreVertical } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import client from '../../api/client';
import CommentsSheet from '../CommentsSheet/CommentsSheet';
import AuthDrawer from '../AuthDrawer/AuthDrawer';

export default function ReelCard({ reel, onDeleteSuccess }) {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const videoRef = useRef(null);

  const [isAuthDrawerOpen, setIsAuthDrawerOpen] = useState(false);
  const [drawerAction, setDrawerAction] = useState('interact with posts');
  const [showMenu, setShowMenu] = useState(false);
  const [isArchivedState, setIsArchivedState] = useState(reel.isArchived || false);
  const [isArchiving, setIsArchiving] = useState(false);

  const parseCaptionText = (text) => {
    if (!text) return '';
    const parts = text.split(/(\s+)/);
    return parts.map((part, index) => {
      if (part.startsWith('#') && part.length > 1) {
        const cleanTag = part.substring(1).replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '');
        return (
          <Link key={index} to={`/tag/${cleanTag}`} className="hashtag-link" style={{ color: 'var(--accent-indigo)', fontWeight: '600', textDecoration: 'none' }}>
            {part}
          </Link>
        );
      }
      if (part.startsWith('@') && part.length > 1) {
        const cleanUser = part.substring(1).replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '');
        return (
          <Link key={index} to={`/profile/${cleanUser}`} className="mention-link" style={{ color: 'var(--accent-indigo)', fontWeight: '600', textDecoration: 'none' }}>
            {part}
          </Link>
        );
      }
      return part;
    });
  };

  const [likes, setLikes] = useState(reel.likes || []);
  const [dislikes, setDislikes] = useState(reel.dislikes || []);
  const [isSaved, setIsSaved] = useState(
    (user?.savedPosts || []).some(id => id.toString() === reel._id.toString())
  );
  const [shareCount, setShareCount] = useState(reel.shareCount || 0);

  const [showComments, setShowComments] = useState(false);
  const [commentCount, setCommentCount] = useState(reel.commentCount || 0);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);



  const isLiked = likes.some(id => id.toString() === user?._id?.toString());
  const isDisliked = dislikes.some(id => id.toString() === user?._id?.toString());
  const isAuthor = reel.author?._id === user?._id;

  const goToReelFeed = () => {
    navigate('/snips', { state: { activeId: reel._id } });
  };

  const handleArchiveToggle = async (e) => {
    e.stopPropagation();
    try {
      setIsArchiving(true);
      const action = isArchivedState ? 'unarchive' : 'archive';
      const res = await client.post(`/posts/${reel._id}/${action}`);
      if (res.data.success) {
        setIsArchivedState(!isArchivedState);
        if (onDeleteSuccess) {
          onDeleteSuccess(reel._id);
        }
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to archive snip');
    } finally {
      setIsArchiving(false);
      setShowMenu(false);
    }
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this snip?')) return;
    try {
      const res = await client.delete(`/posts/${reel._id}`);
      if (res.data.success) {
        if (onDeleteSuccess) onDeleteSuccess(reel._id);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete snip');
    } finally {
      setShowMenu(false);
    }
  };

  const handleEdit = (e) => {
    e.stopPropagation();
    setShowMenu(false);
    navigate('/create-post', { state: { editPost: reel } });
  };

  const handleLike = async (e) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      setDrawerAction('like snips');
      setIsAuthDrawerOpen(true);
      return;
    }
    try {
      const res = await client.post(`/posts/${reel._id}/like`);
      if (res.data.success) {
        setLikes(res.data.data.likes);
        setDislikes(res.data.data.dislikes);
      }
    } catch (err) {
      console.error('Error liking reel:', err);
    }
  };

  const handleDislike = async (e) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      setDrawerAction('dislike snips');
      setIsAuthDrawerOpen(true);
      return;
    }
    try {
      const res = await client.post(`/posts/${reel._id}/dislike`);
      if (res.data.success) {
        setLikes(res.data.data.likes);
        setDislikes(res.data.data.dislikes);
      }
    } catch (err) {
      console.error('Error disliking reel:', err);
    }
  };

  const handleSave = async (e) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      setDrawerAction('save snips');
      setIsAuthDrawerOpen(true);
      return;
    }
    try {
      const endpoint = isSaved ? `/posts/${reel._id}/unsave` : `/posts/${reel._id}/save`;
      const res = await client.post(endpoint);
      if (res.data.success) {
        setIsSaved(!isSaved);
        const updatedSaved = isSaved
          ? (user.savedPosts || []).filter(id => id !== reel._id)
          : [...(user.savedPosts || []), reel._id];
        user.savedPosts = updatedSaved;
      }
    } catch (err) {
      console.error('Error saving reel:', err);
    }
  };

  const handleShare = async (e) => {
    e.stopPropagation();
    try {
      const res = await client.post(`/posts/${reel._id}/share`);
      if (res.data.success) {
        setShareCount(res.data.data.shareCount);
        const shareLink = res.data.data.shareableUrl;

        if (navigator.share) {
          await navigator.share({
            title: 'Oravia Snip',
            text: reel.caption || 'Check out this snip on Oravia!',
            url: shareLink,
          });
        } else {
          await navigator.clipboard.writeText(shareLink);
          alert('Snip link copied to clipboard!');
        }
      }
    } catch (err) {
      console.error('Error sharing reel:', err);
    }
  };

  const toggleVideoPlay = (e) => {
    const video = e.target.closest('.reel-media-container')?.querySelector('video');
    if (!video) return;
    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      video.play();
      setIsPlaying(true);
    }
  };

  const handleMediaClick = (e) => {
    const video = e.target.closest('.reel-media-container')?.querySelector('video');
    if (video) {
      if (isPlaying) {
        video.pause();
        setIsPlaying(false);
      } else {
        video.play();
        setIsPlaying(true);
      }
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) return `${diffMins || 1}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <div className="reel-card animate-fade">
      {/* Header */}
      <div className="reel-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
        <Link to={`/profile/${reel.author?.username}`} className="author-link" onClick={(e) => e.stopPropagation()}>
          <img
            src={getFullMediaUrl(reel.author?.avatarUrl) || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
            alt={reel.author?.username}
            className="author-avatar"
          />
          <div className="author-details">
            <span className="author-name">{reel.author?.displayName || reel.author?.username}</span>
            <span className="author-username">@{reel.author?.username}</span>
          </div>
        </Link>

        {isAuthor && (
          <div className="reel-options-menu-wrapper" style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
            <button 
              className="three-dot-menu-btn" 
              onClick={() => setShowMenu(!showMenu)} 
              aria-label="Snip Options"
              style={{ background: 'none', border: 'none', color: '#71717a', cursor: 'pointer', padding: '4px' }}
            >
              <MoreVertical size={18} />
            </button>
            
            {showMenu && (
              <div className="reel-dropdown-menu" style={{
                position: 'absolute',
                right: 0,
                top: '28px',
                background: '#0e0e11',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '10px',
                boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
                zIndex: 99,
                minWidth: '130px',
                overflow: 'hidden'
              }}>
                <button 
                  onClick={handleEdit}
                  style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', background: 'none', border: 'none', color: '#fff', fontSize: '13px', cursor: 'pointer' }}
                >
                  Edit Snip
                </button>
                <button 
                  onClick={handleArchiveToggle}
                  disabled={isArchiving}
                  style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', background: 'none', border: 'none', color: '#fff', fontSize: '13px', cursor: 'pointer', borderTop: '1px solid rgba(255, 255, 255, 0.04)' }}
                >
                  {isArchivedState ? 'Unarchive' : 'Archive'}
                </button>
                <button 
                  onClick={handleDelete}
                  style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', background: 'none', border: 'none', color: '#ef4444', fontSize: '13px', cursor: 'pointer', borderTop: '1px solid rgba(255, 255, 255, 0.04)', fontWeight: '600' }}
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Media Block */}
      <div className="reel-media-container" onClick={handleMediaClick}>
        {reel.isReal && (
          <div className="reel-real-badge-overlay">
            <Camera size={12} style={{ marginRight: '4px' }} /> Real
          </div>
        )}
        {reel.thumbnailUrl || reel.mediaUrl ? (
          <>
            <video
              ref={videoRef}
              src={getFullMediaUrl(reel.mediaUrl || reel.thumbnailUrl)}
              className="reel-video"
              loop
              muted={isMuted}
              playsInline
            />
            {!isPlaying && (
              <div className="play-overlay">
                <Play size={40} className="play-icon" />
              </div>
            )}
            <button
              className="mute-btn"
              onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }}
              aria-label={isMuted ? 'Unmute' : 'Mute'}
            >
              <Volume2 size={16} color={isMuted ? '#ef4444' : '#22c55e'} />
            </button>
          </>
        ) : (
          <div className="media-fallback">
            <Film size={40} />
          </div>
        )}
        <div className="reel-badge">Snip</div>
      </div>

      {/* Action Bar */}
      <div className="reel-actions">
        <div className="actions-left">
          <button
            className={`action-btn ${isLiked ? 'liked' : ''}`}
            onClick={handleLike}
            aria-label="Like"
          >
            <Heart size={22} fill={isLiked ? 'currentColor' : 'none'} />
            <span>{likes.length}</span>
          </button>

          <button
            className={`action-btn ${isDisliked ? 'disliked' : ''}`}
            onClick={handleDislike}
            aria-label="Dislike"
          >
            <ThumbsDown size={22} fill={isDisliked ? 'currentColor' : 'none'} />
            <span>{dislikes.length}</span>
          </button>

          <button
            className="action-btn"
            onClick={(e) => {
              e.stopPropagation();
              if (!isAuthenticated) {
                setDrawerAction('comment on snips');
                setIsAuthDrawerOpen(true);
              } else {
                setShowComments(true);
              }
            }}
            aria-label="Comment"
          >
            <MessageCircle size={22} />
            <span>{commentCount}</span>
          </button>
        </div>

        <div className="actions-right">
          <button className="action-btn" onClick={handleShare} aria-label="Share">
            <Share2 size={22} />
            {shareCount > 0 && <span>{shareCount}</span>}
          </button>

          <button
            className={`action-btn ${isSaved ? 'saved' : ''}`}
            onClick={handleSave}
            aria-label="Save"
          >
            <Bookmark size={22} fill={isSaved ? 'currentColor' : 'none'} />
          </button>
        </div>
      </div>

      {/* Caption */}
      <div className="reel-body">
        {reel.caption && (
          <p className="reel-caption">
            <Link to={`/profile/${reel.author?.username}`} className="caption-username" onClick={(e) => e.stopPropagation()}>
              {reel.author?.username}
            </Link>
            {parseCaptionText(reel.caption)}
          </p>
        )}
        <span className="reel-time" onClick={goToReelFeed}>{formatTime(reel.createdAt)}</span>
      </div>

      {/* Comments Sheet */}
      {showComments && (
        <CommentsSheet
          postId={reel._id}
          onClose={() => setShowComments(false)}
          onCommentCountChange={setCommentCount}
        />
      )}

      <style>{`
        .reel-card {
          background-color: var(--bg-secondary);
          border-top: 1px solid var(--border-color);
          border-bottom: 1px solid var(--border-color);
          border-left: none;
          border-right: none;
          border-radius: 0;
          margin-bottom: 16px;
          overflow: hidden;
        }

        .reel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 16px;
        }

        .reel-header .author-link {
          display: flex;
          align-items: center;
          text-decoration: none;
          color: inherit;
          gap: 12px;
        }

        .reel-header .author-avatar {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid var(--accent-indigo);
        }

        .reel-header .author-details {
          display: flex;
          flex-direction: column;
        }

        .reel-header .author-name {
          font-size: 14px;
          font-weight: 600;
        }

        .reel-header .author-username {
          font-size: 11px;
          color: #ffffff;
        }

        .reel-media-container {
          width: 100%;
          aspect-ratio: 9 / 16;
          background-color: #000;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          cursor: pointer;
        }

        .reel-video {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .play-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.25);
          cursor: pointer;
        }

        .play-icon {
          color: #fff;
          filter: drop-shadow(0 2px 8px rgba(0,0,0,0.5));
          opacity: 0.85;
        }

        .mute-btn {
          position: absolute;
          bottom: 12px;
          right: 12px;
          background: rgba(0, 0, 0, 0.6);
          border: none;
          border-radius: 50%;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .media-fallback {
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
          height: 100%;
        }

        .reel-badge {
          position: absolute;
          top: 12px;
          left: 12px;
          background: var(--accent-indigo);
          color: #000;
          font-size: 11px;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 4px;
          letter-spacing: 0.3px;
          z-index: 5;
        }

        .reel-actions {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
        }

        .reel-actions .actions-left,
        .reel-actions .actions-right {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .reel-actions .action-btn {
          background: none;
          border: none;
          color: var(--text-primary);
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          font-weight: 500;
          padding: 4px;
          transition: all 0.2s;
        }

        .reel-actions .action-btn:active {
          transform: scale(0.9);
        }

        .reel-actions .action-btn.liked {
          color: var(--accent-violet);
        }

        .reel-actions .action-btn.disliked {
          color: var(--accent-indigo);
        }

        .reel-actions .action-btn.saved {
          color: var(--accent-gold);
        }

        .reel-body {
          padding: 0 16px 16px 16px;
        }

        .reel-caption {
          font-size: 14px;
          margin-bottom: 6px;
        }

        .caption-username {
          font-weight: 600;
          text-decoration: none;
          color: inherit;
          margin-right: 6px;
        }

        .reel-time {
          font-size: 11px;
          color: var(--text-muted);
          text-transform: uppercase;
          cursor: pointer;
        }

        .reel-real-badge-overlay {
          position: absolute;
          top: 12px;
          left: 60px;
          z-index: 10;
          display: inline-flex;
          align-items: center;
          background: linear-gradient(135deg, #FF8F00 0%, #d84315 100%);
          color: #fff;
          font-size: 10px;
          font-weight: 700;
          padding: 4px 8px;
          border-radius: 6px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          box-shadow: 0 4px 12px rgba(255, 143, 0, 0.4);
          line-height: 1;
        }
      `}</style>
      
      <AuthDrawer 
        isOpen={isAuthDrawerOpen} 
        onClose={() => setIsAuthDrawerOpen(false)} 
        actionText={drawerAction}
      />
    </div>
  );
}
