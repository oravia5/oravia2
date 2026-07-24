import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { getFullMediaUrl } from '../../utils/mediaUrl';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, ThumbsDown, MessageCircle, Share2, Bookmark, Play, VolumeX, Volume2, Eye, MoreVertical, Lock, Download, ShoppingBag } from 'lucide-react';
import { queueView } from '../../utils/viewTracker';
import { useAuth } from '../../context/AuthContext';
import client from '../../api/client';
import CommentsSheet from '../CommentsSheet/CommentsSheet';
import AuthDrawer from '../AuthDrawer/AuthDrawer';
import LikesSheet from '../LikesSheet/LikesSheet';
import { useNsfw } from '../../context/NsfwContext';

export default React.memo(function ReelPlayer({ reel, isActive, onDelete }) {
  const { user, isAuthenticated, updateUserData } = useAuth();
  const navigate = useNavigate();
  
  const [isAuthDrawerOpen, setIsAuthDrawerOpen] = useState(false);
  const [drawerAction, setDrawerAction] = useState('interact with snips');
  const [showMenu, setShowMenu] = useState(false);
  const [isArchivedState, setIsArchivedState] = useState(reel.isArchived || false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isCaptionExpanded, setIsCaptionExpanded] = useState(false);
  const [previewFileModal, setPreviewFileModal] = useState(null);
  const [followUnlockModal, setFollowUnlockModal] = useState(null);
  const [productDownloadCounts, setProductDownloadCounts] = useState({});
  const [isFollowingAuthorState, setIsFollowingAuthorState] = useState(
    user && reel.author && (user.following || []).some(id => id.toString() === reel.author._id.toString())
  );
  const { nsfwRevealed, revealNsfw } = useNsfw();

  const isOwnContent = isAuthenticated && user?._id && reel.author?._id === user._id;
  const isNsfwFlag = reel.isNSFW === true || reel.isNSFW === 'true';
  const isBlurred = isNsfwFlag && !isOwnContent && !nsfwRevealed;
  
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
  const [isMuted, setIsMuted] = useState(() => {
    return sessionStorage.getItem('oravia_sound_enabled') !== 'true';
  });
  const [reelProgress, setReelProgress] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [showLikesSheet, setShowLikesSheet] = useState(false);
  const [likesSheetTab, setLikesSheetTab] = useState('likes');
  const [commentCount, setCommentCount] = useState(0);

  const videoRef = useRef(null);
  const hasCountedView = useRef(false);



  const isLiked = likes.includes(user?._id);
  const isDisliked = dislikes.includes(user?._id);

  // Play or pause based on active viewport state and NSFW blur
  useEffect(() => {
    if (videoRef.current) {
      if (isActive && !isBlurred) {
        const soundEnabled = sessionStorage.getItem('oravia_sound_enabled') === 'true';
        videoRef.current.muted = !soundEnabled;
        setIsMuted(!soundEnabled);
        videoRef.current.play()
          .then(() => setIsPlaying(true))
          .catch((err) => console.log('Autoplay block:', err.message));
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  }, [isActive, isBlurred]);

  useEffect(() => {
    const syncSound = () => {
      const soundEnabled = sessionStorage.getItem('oravia_sound_enabled') === 'true';
      setIsMuted(!soundEnabled);
      if (videoRef.current) {
        videoRef.current.muted = !soundEnabled;
      }
    };
    window.addEventListener('oravia_sound_change', syncSound);
    return () => window.removeEventListener('oravia_sound_change', syncSound);
  }, []);

  const handleVideoClick = () => {
    if (showMenu) {
      setShowMenu(false);
      return;
    }
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleArchiveToggle = async (e) => {
    e.stopPropagation();
    try {
      setIsArchiving(true);
      const action = isArchivedState ? 'unarchive' : 'archive';
      const res = await client.post(`/posts/${reel._id}/${action}`);
      if (res.data.success) {
        setIsArchivedState(!isArchivedState);
        if (onDelete) onDelete(reel._id);
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
        if (onDelete) onDelete(reel._id);
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

  const triggerActualDownload = async (prod) => {
    try {
      const res = await client.post(`/posts/${reel._id}/products/${prod._id}/download`);
      if (res.data.success) {
        setProductDownloadCounts(prev => ({ ...prev, [prod._id]: res.data.downloadCount }));
        const fileUrl = res.data.fileUrl || prod.fileUrl;
        if (fileUrl) window.open(getFullMediaUrl(fileUrl), '_blank', 'noopener,noreferrer');
      }
    } catch (err) {
      console.error('Download error:', err);
      if (err.response?.status === 403 || err.response?.data?.requireFollow) {
        setFollowUnlockModal(prod);
      } else {
        alert(err.response?.data?.message || 'Download failed. Please make sure you are following the author.');
      }
    }
  };

  const handleDownloadFileClick = async (prod, e) => {
    if (e) e.stopPropagation();
    const isSelf = user && reel.author && user._id.toString() === reel.author._id.toString();
    const isFollowing = isSelf || isFollowingAuthorState || (
      user && reel.author && (user.following || []).some(id => id.toString() === reel.author._id.toString())
    );
    if (prod.requireFollow && !isFollowing) {
      setFollowUnlockModal(prod);
      return;
    }
    triggerActualDownload(prod);
  };

  const handleFollowAndDownload = async () => {
    if (!isAuthenticated) {
      setDrawerAction('follow creators to unlock free downloads');
      setIsAuthDrawerOpen(true);
      return;
    }
    try {
      const authorId = reel.author?._id || reel.author;
      if (authorId) {
        const res = await client.post(`/users/${authorId}/follow`);
        setIsFollowingAuthorState(true);
        if (res.data?.success && user) {
          const updatedFollowing = [...(user.following || [])];
          if (!updatedFollowing.some(id => id.toString() === authorId.toString())) {
            updatedFollowing.push(authorId);
            updateUserData({ following: updatedFollowing });
          }
        }
      }
      const prodToDownload = followUnlockModal;
      setFollowUnlockModal(null);
      if (prodToDownload) triggerActualDownload(prodToDownload);
    } catch (err) {
      console.error('Follow error:', err);
    }
  };

  const handleProductWishlistToggle = async (productId, e) => {
    if (e) e.stopPropagation();
    if (!isAuthenticated) {
      setDrawerAction('add products to wishlist');
      setIsAuthDrawerOpen(true);
      return;
    }
    try {
      const res = await client.post('/products/wishlist', { postId: reel._id, productId });
      if (res.data.success) {
        const updatedSavedProducts = [...(user.savedProducts || [])];
        if (res.data.isSaved) {
          updatedSavedProducts.push({ post: reel._id, productId });
        } else {
          const idx = updatedSavedProducts.findIndex(
            item => item.post?.toString() === reel._id.toString() && item.productId?.toString() === productId.toString()
          );
          if (idx > -1) updatedSavedProducts.splice(idx, 1);
        }
        updateUserData({ ...user, savedProducts: updatedSavedProducts });
      }
    } catch (err) {
      console.error('Error toggling wishlist:', err);
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
        style={isBlurred ? { filter: 'blur(28px)', pointerEvents: 'none' } : {}}
        onTimeUpdate={(e) => {
          const v = e.target;
          if (v.duration) setReelProgress((v.currentTime / v.duration) * 100);
          if (!hasCountedView.current && v.currentTime >= 2) {
            hasCountedView.current = true;
            queueView(reel._id);
          }
        }}
      />

      {/* 18+ Guest Warning Blur Overlay */}
      {isBlurred && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            revealNsfw();
          }}
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 30,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(12px)',
            cursor: 'pointer',
            pointerEvents: 'auto',
            textAlign: 'center',
            padding: '24px',
          }}
        >
          <div style={{ color: '#ef4444', fontWeight: 700, fontSize: '20px', marginBottom: '8px' }}>
            🔞 18+ Content Warning
          </div>
          <div style={{ color: '#eee', fontSize: '13px', marginBottom: '18px', maxWidth: '260px' }}>
            This snip contains mature content. Tap to view.
          </div>
          <button
            style={{
              padding: '10px 24px',
              background: 'linear-gradient(135deg, #ef4444, #dc2626)',
              color: '#fff',
              border: 'none',
              borderRadius: '24px',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(239, 68, 68, 0.4)',
            }}
          >
            Tap to view (18+)
          </button>
        </div>
      )}

      {/* Play/Pause center overlay */}
      {!isPlaying && (
        <div className="center-play-overlay" onClick={handleVideoClick}>
          <Play size={50} fill="currentColor" className="center-play-icon" />
        </div>
      )}

      {/* Sound Controller overlay */}
      <button 
        className="reel-sound-btn" 
        onClick={(e) => {
          e.stopPropagation();
          const nextMuted = !isMuted;
          setIsMuted(nextMuted);
          if (videoRef.current) {
            videoRef.current.muted = nextMuted;
          }
          sessionStorage.setItem('oravia_sound_enabled', nextMuted ? 'false' : 'true');
          window.dispatchEvent(new Event('oravia_sound_change'));
        }}
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

        {isAuthenticated && user?._id === reel.author?._id && (
          <div className="sidebar-btn-wrapper" style={{ position: 'relative' }}>
            <button 
              className="sidebar-btn" 
              onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }} 
              aria-label="Snip Options"
            >
              <MoreVertical size={26} />
            </button>
            {showMenu && (
              <div className="reel-dropdown-menu" style={{
                position: 'absolute',
                right: '48px',
                bottom: '0px',
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

      <div className="reel-bottom-stack">
      {reel.products && reel.products.length > 0 && (
        <div className="reel-products-row" onClick={(e) => e.stopPropagation()}>
          {reel.products.map((prod, idx) => {
            const isProductSaved = (user?.savedProducts || []).some(
              item => item.productId?.toString() === prod._id?.toString()
            );
            const downloadCnt = productDownloadCounts[prod._id] !== undefined ? productDownloadCounts[prod._id] : (prod.downloadCount || 0);
            const isPDF = prod.fileType === 'PDF' || (prod.fileName && prod.fileName.toLowerCase().endsWith('.pdf'));
            const isImageFile = ['PNG','JPG','JPEG','WEBP'].includes(prod.fileType);
            const canPreview = !!prod.fileUrl && (isPDF || isImageFile);
            const handleCardClick = () => {
              if (prod.fileUrl) handleDownloadFileClick(prod);
              else if (prod.link) window.open(prod.link, '_blank', 'noopener,noreferrer');
            };
            return (
              <div key={prod._id || idx} className="reel-product-card" onClick={handleCardClick}>
                <div className="reel-product-thumb">
                  {prod.imageUrl ? (
                    <img src={getFullMediaUrl(prod.imageUrl)} alt={prod.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <>{prod.fileUrl ? (prod.requireFollow ? <Lock size={18} color="#eab308" /> : <Download size={18} color="#22c55e" />) : <ShoppingBag size={18} color="#71717a" />}</>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <p style={{ fontSize: '11px', fontWeight: '600', color: '#e4e4e7', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{prod.title}</p>
                  {prod.fileUrl ? (
                    <span style={{ fontSize: '9px', color: '#22c55e', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                      <Download size={9} /> {downloadCnt}
                    </span>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span style={{ fontSize: '12px', fontWeight: '700', color: prod.price === 'FREE' ? '#22c55e' : 'var(--accent-indigo)' }}>{prod.price}</span>
                      {prod.originalPrice && <span style={{ fontSize: '10px', textDecoration: 'line-through', color: '#52525b' }}>{prod.originalPrice}</span>}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
                  {canPreview && (
                    <button type="button" onClick={(e) => {
                      e.stopPropagation();
                      const isSelf = user && reel.author && user._id.toString() === reel.author._id.toString();
                      const isFollowing = isSelf || isFollowingAuthorState || (
                        user && reel.author && (user.following || []).some(id => id.toString() === reel.author._id.toString())
                      );
                      if (prod.requireFollow && !isFollowing) {
                        setFollowUnlockModal(prod);
                        return;
                      }
                      setPreviewFileModal(prod);
                    }} style={{ background: 'none', border: 'none', padding: '4px', color: '#a1a1aa', cursor: 'pointer' }}>
                      <Eye size={13} />
                    </button>
                  )}
                  <button type="button" onClick={(e) => handleProductWishlistToggle(prod._id, e)} style={{ background: 'none', border: 'none', padding: '4px', color: isProductSaved ? '#f43f5e' : '#3f3f46', cursor: 'pointer' }}>
                    <Heart size={14} fill={isProductSaved ? '#f43f5e' : 'none'} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Details bottom overlay */}
      <div className="reel-bottom-info" onClick={(e) => e.stopPropagation()}>
        <Link 
          to={`/profile/${reel.author?.username}`} 
          className="reel-author-tag" 
          style={{ textDecoration: 'none', color: '#fff', display: 'inline-flex', alignItems: 'center' }}
        >
          <img 
            src={getFullMediaUrl(reel.author?.avatarUrl) || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'} 
            alt={reel.author?.username} 
            className="author-avatar"
          />
          <span className="author-name">@{reel.author?.username}</span>
        </Link>
        {reel.caption && (
          <div className="reel-caption-container">
            {reel.caption.length > 80 && !isCaptionExpanded ? (
              <p className="reel-caption">
                {parseCaptionText(reel.caption.slice(0, 80) + '... ')}
                <button 
                  type="button"
                  onClick={() => setIsCaptionExpanded(true)}
                  style={{ background: 'none', border: 'none', color: 'var(--accent-indigo)', fontWeight: 'bold', padding: 0, cursor: 'pointer', fontSize: '13px', marginLeft: '4px', display: 'inline-block' }}
                >
                  see more
                </button>
              </p>
            ) : (
              <p className="reel-caption">
                {parseCaptionText(reel.caption)}
                {reel.caption.length > 80 && (
                  <button 
                    type="button"
                    onClick={() => setIsCaptionExpanded(false)}
                    style={{ background: 'none', border: 'none', color: 'var(--accent-indigo)', fontWeight: 'bold', padding: 0, cursor: 'pointer', fontSize: '13px', marginLeft: '4px', display: 'inline-block' }}
                  >
                    see less
                  </button>
                )}
              </p>
            )}
          </div>
        )}
      </div>

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
        .reel-bottom-stack {
          position: absolute;
          bottom: 28px;
          left: 0;
          right: 0;
          display: flex;
          flex-direction: column-reverse;
          gap: 8px;
          z-index: 9;
        }

        .reel-bottom-info {
          padding: 0 70px 0 16px;
          display: flex;
          flex-direction: column;
          gap: 8px;
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
          white-space: pre-wrap;
        }
      
.reel-products-row {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding: 0 12px;
          background: transparent;
          scrollbar-width: none;
        }

      .reel-products-row::-webkit-scrollbar {
        display: none;
      }

      .reel-product-card {
        flex: 0 0 200px;
        background: rgba(15, 15, 18, 0.55);
        backdrop-filter: blur(14px);
        -webkit-backdrop-filter: blur(14px);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 10px;
        padding: 6px;
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 8px;
        cursor: pointer;
        overflow: hidden;
      }

      .reel-product-thumb {
        position: relative;
        width: 44px;
        height: 44px;
        flex-shrink: 0;
        border-radius: 6px;
        overflow: hidden;
        background: #0f0f12;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      {/* ── Follow to Unlock Modal ── */}
      {followUnlockModal && createPortal(
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          zIndex: 999999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <div style={{
            background: '#121215',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '16px',
            padding: '24px',
            maxWidth: '340px',
            width: '100%',
            textAlign: 'center',
            boxShadow: '0 8px 32px rgba(0,0,0,0.8)'
          }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(234, 179, 8, 0.15)', border: '1px solid rgba(234, 179, 8, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <Lock size={22} color="#eab308" />
            </div>
            <h4 style={{ fontSize: '16px', fontWeight: '700', color: '#fff', margin: '0 0 6px' }}>Follow to Unlock Download</h4>
            <p style={{ fontSize: '13px', color: '#a1a1aa', margin: '0 0 16px', lineHeight: '1.4' }}>
              Follow <strong>@{reel.author?.username}</strong> to instantly unlock and download <strong>{followUnlockModal.title}</strong> for free!
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setFollowUnlockModal(null)}
                style={{ flex: 1, padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#aaa', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleFollowAndDownload}
                style={{ flex: 1.4, padding: '10px', borderRadius: '8px', background: 'var(--accent-indigo)', border: 'none', color: '#fff', fontSize: '13px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <span>Follow & Download</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── File Preview Modal ── */}
      {previewFileModal && createPortal(
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          zIndex: 999999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <div style={{
            background: '#0d0d10',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '16px',
            maxWidth: '560px',
            width: '100%',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0,0,0,0.9)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', background: '#121216' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--accent-indigo)', background: 'rgba(99,102,241,0.15)', padding: '2px 6px', borderRadius: '4px' }}>
                  {previewFileModal.fileType || 'FILE'}
                </span>
                <span style={{ fontSize: '13px', fontWeight: '600', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {previewFileModal.title}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewFileModal(null)}
                style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer', padding: '4px' }}
              >
                ✕
              </button>
            </div>
            <div style={{ flex: 1, minHeight: '300px', background: '#000', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {previewFileModal.fileType === 'PDF' || (previewFileModal.fileName && previewFileModal.fileName.toLowerCase().endsWith('.pdf')) ? (
                <iframe
                  src={getFullMediaUrl(previewFileModal.fileUrl)}
                  title="PDF Preview"
                  style={{ width: '100%', height: '400px', border: 'none' }}
                />
              ) : (
                <img
                  src={getFullMediaUrl(previewFileModal.fileUrl)}
                  alt="File Preview"
                  style={{ maxWidth: '100%', maxHeight: '400px', objectFit: 'contain' }}
                />
              )}
            </div>
            <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'flex-end', background: '#121216' }}>
              <button
                type="button"
                onClick={() => {
                  const prod = previewFileModal;
                  setPreviewFileModal(null);
                  handleDownloadFileClick(prod);
                }}
                style={{ background: 'var(--accent-indigo)', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 18px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Download size={14} />
                <span>Download File ({previewFileModal.fileSize || 'Free'})</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <AuthDrawer 
        isOpen={isAuthDrawerOpen} 
        onClose={() => setIsAuthDrawerOpen(false)} 
        actionText={drawerAction}
      />
    </div>
  );
})
