import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Heart, ThumbsDown, MessageCircle, Share2, Bookmark, Play, VolumeX, Volume2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import client from '../../api/client';
import CommentsSheet from '../CommentsSheet/CommentsSheet';

export default React.memo(function ReelPlayer({ reel, isActive }) {
  const { user } = useAuth();
  
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
  const [isSaved, setIsSaved] = useState(user?.savedPosts?.includes(reel._id) || false);
  const [shareCount, setShareCount] = useState(reel.shareCount || 0);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [showComments, setShowComments] = useState(false);
  const [commentCount, setCommentCount] = useState(0);

  const videoRef = useRef(null);

  const getFullMediaUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('/uploads/')) {
      return `http://127.0.0.1:5000${url}`;
    }
    return url;
  };

  const isLiked = likes.includes(user?._id);
  const isDisliked = dislikes.includes(user?._id);

  // Play or pause based on active viewport state
  useEffect(() => {
    if (videoRef.current) {
      if (isActive) {
        videoRef.current.play()
          .then(() => setIsPlaying(true))
          .catch((err) => console.log('Autoplay block:', err.message));
      } else {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
        setIsPlaying(false);
      }
    }
  }, [isActive]);

  const handleVideoClick = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleLike = async (e) => {
    e.stopPropagation();
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

  return (
    <div className="reel-player-container">
      {/* Video element */}
      <video
        ref={videoRef}
        src={getFullMediaUrl(reel.mediaUrl)}
        className="reel-video"
        loop
        muted={isMuted}
        onClick={handleVideoClick}
        playsInline
      />

      {/* Play/Pause center overlay */}
      {!isPlaying && (
        <div className="center-play-overlay" onClick={handleVideoClick}>
          <Play size={50} fill="currentColor" className="center-play-icon" />
        </div>
      )}

      {/* Sound Controller overlay */}
      <button 
        className="reel-sound-btn" 
        onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }}
        aria-label="Toggle Sound"
      >
        {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
      </button>

      {/* Actions Sidebar (Likes, Dislikes, Comments, Shares, Bookmark) */}
      <div className="reel-sidebar" onClick={(e) => e.stopPropagation()}>
        <button className={`sidebar-btn ${isLiked ? 'liked' : ''}`} onClick={handleLike} aria-label="Like">
          <div className="icon-circle">
            <Heart size={24} fill={isLiked ? 'currentColor' : 'none'} />
          </div>
          <span>{likes.length}</span>
        </button>

        <button className={`sidebar-btn ${isDisliked ? 'disliked' : ''}`} onClick={handleDislike} aria-label="Dislike">
          <div className="icon-circle">
            <ThumbsDown size={24} fill={isDisliked ? 'currentColor' : 'none'} />
          </div>
          <span>{dislikes.length}</span>
        </button>

        <button className="sidebar-btn" onClick={() => setShowComments(true)} aria-label="Comments">
          <div className="icon-circle">
            <MessageCircle size={24} />
          </div>
          <span>{commentCount}</span>
        </button>

        <button className="sidebar-btn" onClick={handleShare} aria-label="Share">
          <div className="icon-circle">
            <Share2 size={24} />
          </div>
          <span>{shareCount}</span>
        </button>

        <button className={`sidebar-btn ${isSaved ? 'saved' : ''}`} onClick={handleSave} aria-label="Save">
          <div className="icon-circle">
            <Bookmark size={24} fill={isSaved ? 'currentColor' : 'none'} />
          </div>
        </button>
      </div>

      {/* Details bottom overlay */}
      <div className="reel-bottom-info" onClick={(e) => e.stopPropagation()}>
        <div className="reel-author-tag">
          <img 
            src={getFullMediaUrl(reel.author?.avatarUrl) || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'} 
            alt={reel.author?.username} 
            className="author-avatar"
          />
          <span className="author-name">@{reel.author?.username}</span>
        </div>
        {reel.caption && <p className="reel-caption">{parseCaptionText(reel.caption)}</p>}
      </div>

      {/* Floating Comments sheet */}
      {showComments && (
        <CommentsSheet
          postId={reel._id}
          onClose={() => setShowComments(false)}
          onCommentCountChange={setCommentCount}
        />
      )}

      <style>{`
        .reel-player-container {
          width: 100%;
          height: 100%;
          position: relative;
          background-color: #000;
          overflow: hidden;
        }

        .reel-video {
          width: 100%;
          height: 100%;
          object-fit: cover;
          cursor: pointer;
        }

        .center-play-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.15);
          cursor: pointer;
        }

        .center-play-icon {
          color: rgba(255, 255, 255, 0.8);
          filter: drop-shadow(0 2px 10px rgba(0, 0, 0, 0.6));
        }

        .reel-sound-btn {
          position: absolute;
          top: 20px;
          right: 20px;
          background: rgba(9, 9, 11, 0.6);
          border: 1px solid var(--border-color);
          border-radius: 50%;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          cursor: pointer;
          z-index: 10;
        }

        /* Sidebar overlays */
        .reel-sidebar {
          position: absolute;
          right: 12px;
          bottom: 100px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          z-index: 10;
        }

        .sidebar-btn {
          background: none;
          border: none;
          color: #fff;
          display: flex;
          flex-direction: column;
          align-items: center;
          cursor: pointer;
          gap: 4px;
          font-size: 12px;
          font-weight: 600;
          text-shadow: 0 1px 3px rgba(0,0,0,0.8);
        }

        .icon-circle {
          width: 46px;
          height: 46px;
          border-radius: 50%;
          background: rgba(9, 9, 11, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 10px rgba(0,0,0,0.3);
          transition: transform 0.2s;
        }

        .sidebar-btn:active .icon-circle {
          transform: scale(0.9);
        }

        .sidebar-btn.liked .icon-circle {
          color: #f43f5e;
          background: rgba(244, 63, 94, 0.15);
          border-color: rgba(244, 63, 94, 0.3);
        }

        .sidebar-btn.disliked .icon-circle {
          color: #3b82f6;
          background: rgba(59, 130, 246, 0.15);
          border-color: rgba(59, 130, 246, 0.3);
        }

        .sidebar-btn.saved .icon-circle {
          color: #eab308;
          background: rgba(234, 179, 8, 0.15);
          border-color: rgba(234, 179, 8, 0.3);
        }

        /* Bottom metadata overlay */
        .reel-bottom-info {
          position: absolute;
          left: 16px;
          right: 70px;
          bottom: 20px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          z-index: 10;
          color: #fff;
          text-shadow: 0 1px 3px rgba(0,0,0,0.8);
        }

        .reel-author-tag {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .reel-author-tag .author-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          object-fit: cover;
          border: 1.5px solid var(--accent-indigo);
        }

        .reel-author-tag .author-name {
          font-weight: 700;
          font-size: 14px;
        }

        .reel-caption {
          font-size: 13px;
          line-height: 1.4;
        }
      `}</style>
    </div>
  );
})
