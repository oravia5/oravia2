import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { getFullMediaUrl } from '../../utils/mediaUrl';
import { useNavigate, Link } from 'react-router-dom';
import { Heart, ThumbsDown, MessageCircle, Share2, Bookmark, Play, Volume2, Film, Camera, MoreVertical, AlertCircle, ShoppingBag, Download, Tag, Lock, UserPlus, X, Eye } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import client from '../../api/client';
import CommentsSheet from '../CommentsSheet/CommentsSheet';
import AuthDrawer from '../AuthDrawer/AuthDrawer';
import { useNsfw } from '../../context/NsfwContext';

export default function ReelCard({ reel, onDeleteSuccess }) {
  const { user, isAuthenticated, updateUserData } = useAuth();
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const containerRef = useRef(null);

  const [isAuthDrawerOpen, setIsAuthDrawerOpen] = useState(false);
  const [drawerAction, setDrawerAction] = useState('interact with posts');
  const [showMenu, setShowMenu] = useState(false);
  const [isArchivedState, setIsArchivedState] = useState(reel.isArchived || false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [previewFileModal, setPreviewFileModal] = useState(null);
  const [videoProgress, setVideoProgress] = useState(0);
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
  const [isSaved, setIsSaved] = useState(
    (user?.savedPosts || []).some(id => id.toString() === reel._id.toString())
  );
  const [shareCount, setShareCount] = useState(reel.shareCount || 0);

  const [showComments, setShowComments] = useState(false);
  const [commentCount, setCommentCount] = useState(reel.commentCount || 0);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(() => sessionStorage.getItem('oravia_sound_enabled') !== 'true');

  const isLiked = likes.some(id => id.toString() === user?._id?.toString());
  const isDisliked = dislikes.some(id => id.toString() === user?._id?.toString());
  const isAuthor = reel.author?._id === user?._id;

  const goToReelFeed = () => {
    navigate('/snips', { state: { activeId: reel._id } });
  };

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = node.querySelector('video');
          if (!video) return;
          if (entry.isIntersecting) {
            const soundEnabled = sessionStorage.getItem('oravia_sound_enabled') === 'true';
            video.muted = !soundEnabled;
            setIsMuted(!soundEnabled);
            video.play().catch((err) => {
              console.log('Autoplay blocked:', err);
            });
            setIsPlaying(true);
          } else {
            video.pause();
            video.muted = true;
            setIsPlaying(false);
            setIsMuted(true);
          }
        });
      },
      { threshold: 0.4 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

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

  const toggleVideoPlay = (e) => {
    if (isBlurred) return;
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
    if (isBlurred) return;
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="author-name">{reel.author?.displayName || reel.author?.username}</span>
              {reel.isNSFW && (
                <span style={{ 
                  background: 'rgba(239, 68, 68, 0.15)', 
                  color: '#ef4444', 
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '4px', 
                  padding: '1px 5px', 
                  fontSize: '10px', 
                  fontWeight: '700',
                  display: 'inline-flex',
                  alignItems: 'center'
                }}>
                  🔞 18+
                </span>
              )}
            </div>
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
      <div ref={containerRef} className="reel-media-container" onClick={handleMediaClick} style={{ position: 'relative', overflow: 'hidden' }}>
        {isBlurred && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              revealNsfw();
            }}
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 20,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(0,0,0,0.65)',
              backdropFilter: 'blur(20px)',
              cursor: 'pointer',
              pointerEvents: 'auto',
              textAlign: 'center',
              padding: '16px',
            }}
          >
            <AlertCircle size={32} color="#ef4444" style={{ marginBottom: '8px' }} />
            <div style={{ color: '#fff', fontWeight: 700, fontSize: '16px' }}>🔞 18+ Sensitive Snip</div>
            <div style={{ color: '#ddd', fontSize: '13px', marginTop: '4px', maxWidth: '260px' }}>This snip contains 18+ sensitive material. Tap to view.</div>
            <div style={{ color: '#fff', fontSize: '13px', marginTop: '12px', background: '#ef4444', padding: '6px 16px', borderRadius: '20px', fontWeight: 600 }}>Tap to view (18+)</div>
          </div>
        )}
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
              onTimeUpdate={(e) => { const v = e.target; if (v.duration) setVideoProgress((v.currentTime / v.duration) * 100); }}
              style={isBlurred ? { filter: 'blur(30px) scale(1.05)' } : {}}
            />
            {!isPlaying && !isBlurred && (
              <div className="play-overlay">
                <Play size={40} className="play-icon" />
              </div>
            )}
            {!isBlurred && (
              <button
                className="mute-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  const soundEnabled = sessionStorage.getItem('oravia_sound_enabled') === 'true';
                  const nextSoundEnabled = !soundEnabled;
                  sessionStorage.setItem('oravia_sound_enabled', nextSoundEnabled ? 'true' : 'false');
                  setIsMuted(!nextSoundEnabled);
                  if (videoRef.current) {
                    videoRef.current.muted = !nextSoundEnabled;
                  }
                  window.dispatchEvent(new Event('oravia_sound_change'));
                }}
                aria-label={isMuted ? 'Unmute' : 'Mute'}
              >
                <Volume2 size={16} color={isMuted ? '#ef4444' : '#22c55e'} />
              </button>
            )}
          </>
        ) : (
          <div className="media-fallback">
            <Film size={40} />
          </div>
        )}
        <div className="reel-badge">Snip</div>
        {isPlaying && !isBlurred && (
          <div
            className="video-progress-hitzone"
            onClick={(e) => {
              e.stopPropagation();
              const rect = e.currentTarget.getBoundingClientRect();
              const percent = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
              if (videoRef.current && videoRef.current.duration) {
                videoRef.current.currentTime = percent * videoRef.current.duration;
                setVideoProgress(percent * 100);
              }
            }}
          >
            <div className="video-progress-track">
              <div className="video-progress-fill" style={{ width: `${videoProgress}%` }} />
            </div>
          </div>
        )}
      </div>

      {reel.products && reel.products.length > 0 && (
        <div className="products-scroll-container" style={{ display: 'flex', gap: '6px', overflowX: 'auto', padding: '8px 6px', margin: '8px 0' }}>
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
              <div key={prod._id || idx} className="product-scroll-card" onClick={handleCardClick}
                style={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '6px', width: '220px', minWidth: '220px', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '8px', position: 'relative', flexShrink: 0, cursor: 'pointer', overflow: 'hidden' }}>
                <div style={{ position: 'relative', width: '50px', height: '50px', flexShrink: 0, borderRadius: '6px', overflow: 'hidden', background: '#0f0f12', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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

        .video-progress-hitzone {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 24px;
          z-index: 6;
          cursor: pointer;
          display: flex;
          align-items: flex-end;
        }

        .video-progress-track {
          position: relative;
          width: 100%;
          height: 3px;
          background: rgba(255,255,255,0.2);
        }

        .video-progress-fill {
          height: 100%;
          background: #ffffff;
          transition: width 0.25s linear;
          border-radius: 0 2px 2px 0;
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
                <UserPlus size={14} />
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
                <X size={18} />
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
}
