import React, { useState, useEffect, useRef } from 'react';
import { getFullMediaUrl } from '../../utils/mediaUrl';
import { Link } from 'react-router-dom';
import { Heart, ThumbsDown, MessageCircle, Share2, Bookmark, Play, VolumeX, Volume2, Eye } from 'lucide-react';
import { queueView } from '../../utils/viewTracker';
import { useAuth } from '../../context/AuthContext';
import client from '../../api/client';
import CommentsSheet from '../CommentsSheet/CommentsSheet';
import AuthDrawer from '../AuthDrawer/AuthDrawer';
import LikesSheet from '../LikesSheet/LikesSheet';

export default React.memo(function ReelPlayer({ reel, isActive }) {
  const { user, isAuthenticated } = useAuth();
  
  const [isAuthDrawerOpen, setIsAuthDrawerOpen] = useState(false);
  const [drawerAction, setDrawerAction] = useState('interact with snips');
  
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
  const [reelProgress, setReelProgress] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [showLikesSheet, setShowLikesSheet] = useState(false);
  const [likesSheetTab, setLikesSheetTab] = useState('likes');
  const [commentCount, setCommentCount] = useState(0);

  const videoRef = useRef(null);
  const hasCountedView = useRef(false);



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
        onTimeUpdate={(e) => {
          const v = e.target;
          if (v.duration) setReelProgress((v.currentTime / v.duration) * 100);
          if (!hasCountedView.current && v.currentTime >= 2) {
            hasCountedView.current = true;
            queueView(reel._id);
          }
        }}
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

      {/* Seek / progress bar */}
      <div
        className="reel-progress-hitzone"
        onClick={(e) => {
          e.stopPropagation();
          const rect = e.currentTarget.getBoundingClientRect();
          const percent = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
          if (videoRef.current && videoRef.current.duration) {
            videoRef.current.currentTime = percent * videoRef.current.duration;
            setReelProgress(percent * 100);
          }
        }}
      >
        <div className="reel-progress-track">
          <div className="reel-progress-fill" style={{ width: `${reelProgress}%` }} />
        </div>
      </div>

      {/* Actions Sidebar (Likes, Dislikes, Comments, Shares, Bookmark) */}
      <div className="reel-sidebar" onClick={(e) => e.stopPropagation()}>
        {reel.views > 0 && (
          <div className="sidebar-btn views-stat" aria-label="Views">
            <Eye size={26} />
            <span>{reel.views}</span>
          </div>
        )}

        <button className={`sidebar-btn ${isLiked ? 'liked' : ''}`} onClick={handleLike} aria-label="Like">
          <Heart size={26} fill={isLiked ? 'currentColor' : 'none'} />
          <span
            onClick={(e) => {
              e.stopPropagation();
              setLikesSheetTab('likes');
              setShowLikesSheet(true);
            }}
          >
            {likes.length}
          </span>
        </button>

        <button className={`sidebar-btn ${isDisliked ? 'disliked' : ''}`} onClick={handleDislike} aria-label="Dislike">
          <ThumbsDown size={26} fill={isDisliked ? 'currentColor' : 'none'} />
          <span
            onClick={(e) => {
              e.stopPropagation();
              setLikesSheetTab('dislikes');
              setShowLikesSheet(true);
            }}
          >
            {dislikes.length}
          </span>
        </button>

        <button 
          className="sidebar-btn" 
          onClick={() => {
            if (!isAuthenticated) {
              setDrawerAction('comment on snips');
              setIsAuthDrawerOpen(true);
            } else {
              setShowComments(true);
            }
          }} 
          aria-label="Comments"
        >
          <MessageCircle size={26} />
          <span>{commentCount}</span>
        </button>

        <button className="sidebar-btn" onClick={handleShare} aria-label="Share">
          <Share2 size={26} />
          <span>{shareCount}</span>
        </button>

        <button className={`sidebar-btn ${isSaved ? 'saved' : ''}`} onClick={handleSave} aria-label="Save">
          <Bookmark size={26} fill={isSaved ? 'currentColor' : 'none'} />
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

      {showLikesSheet && (
        <LikesSheet
          postId={reel._id}
          initialTab={likesSheetTab}
          likeCount={likes.length}
          dislikeCount={dislikes.length}
          onClose={() => setShowLikesSheet(false)}
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

        .reel-progress-hitzone {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 28px;
          z-index: 11;
          cursor: pointer;
          display: flex;
          align-items: flex-end;
        }

        .reel-progress-track {
          position: relative;
          width: 100%;
          height: 3px;
          background: rgba(255,255,255,0.25);
        }

        .reel-progress-fill {
          height: 100%;
          background: #ffffff;
          transition: width 0.25s linear;
        }

        /* Sidebar overlays */
        .views-stat {
          cursor: default;
        }

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

        .sidebar-btn svg {
          filter: drop-shadow(0 2px 6px rgba(0,0,0,0.9));
          transition: transform 0.2s;
        }

        .sidebar-btn:active svg {
          transform: scale(0.85);
        }

        .sidebar-btn.liked svg {
          color: var(--accent-violet);
        }

        .sidebar-btn.disliked svg {
          color: var(--accent-indigo);
        }

        .sidebar-btn.saved svg {
          color: #eab308;
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
      <AuthDrawer 
        isOpen={isAuthDrawerOpen} 
        onClose={() => setIsAuthDrawerOpen(false)} 
        actionText={drawerAction}
      />
    </div>
  );
})
