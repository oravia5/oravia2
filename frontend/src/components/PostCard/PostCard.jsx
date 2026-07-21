import React, { useState, useRef, useCallback, useEffect } from 'react';
import { queueView } from '../../utils/viewTracker';
import { getFullMediaUrl } from '../../utils/mediaUrl';
import { useNavigate, Link } from 'react-router-dom';
import { Heart, ThumbsDown, MessageCircle, Share2, Bookmark, Trash2, MapPin, Play, Volume2, ChevronLeft, ChevronRight, MoreHorizontal, Edit3, Download, ShoppingBag, Camera, Eye, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import client from '../../api/client';
import CommentsSheet from '../CommentsSheet/CommentsSheet';
import AuthDrawer from '../AuthDrawer/AuthDrawer';
import LikesSheet from '../LikesSheet/LikesSheet';

const POPULAR_LOCATIONS = [
  'Mumbai, Maharashtra, India',
  'Delhi, NCR, India',
  'Bangalore, Karnataka, India',
  'Hyderabad, Telangana, India',
  'Ahmedabad, Gujarat, India',
  'Chennai, Tamil Nadu, India',
  'Kolkata, West Bengal, India',
  'Surat, Gujarat, India',
  'Pune, Maharashtra, India',
  'Jaipur, Rajasthan, India',
  'Lucknow, Uttar Pradesh, India',
  'Kanpur, Uttar Pradesh, India',
  'Indore, Madhya Pradesh, India',
  'Thane, Maharashtra, India',
  'Bhopal, Madhya Pradesh, India',
  'Visakhapatnam, Andhra Pradesh, India',
  'Pimpri-Chinchwad, Maharashtra, India',
  'Patna, Bihar, India',
  'Vadodara, Gujarat, India',
  'Ghaziabad, Uttar Pradesh, India',
  'Ludhiana, Punjab, India',
  'Coimbatore, Tamil Nadu, India',
  'Agra, Uttar Pradesh, India',
  'Madurai, Tamil Nadu, India',
  'Nashik, Maharashtra, India',
  'Faridabad, Haryana, India',
  'Meerut, Uttar Pradesh, India',
  'Rajkot, Gujarat, India',
  'Kalyan-Dombivli, Maharashtra, India',
  'Vasai-Virar, Maharashtra, India',
  'Varanasi, Uttar Pradesh, India',
  'Srinagar, Jammu and Kashmir, India',
  'Aurangabad, Maharashtra, India',
  'Dhanbad, Jharkhand, India',
  'Amritsar, Punjab, India',
  'Navi Mumbai, Maharashtra, India',
  'Allahabad, Uttar Pradesh, India',
  'Ranchi, Jharkhand, India',
  'Howrah, West Bengal, India',
  'Jabalpur, Madhya Pradesh, India',
  'Gwalior, Madhya Pradesh, India',
  'Vijayawada, Andhra Pradesh, India',
  'Jodhpur, Rajasthan, India',
  'Raipur, Chhattisgarh, India',
  'Kota, Rajasthan, India',
  'Guwahati, Assam, India',
  'Chandigarh, India',
  'Noida, Uttar Pradesh, India',
  'Gurgaon, Haryana, India',
  'New York City, NY, USA',
  'Los Angeles, CA, USA',
  'Chicago, IL, USA',
  'Houston, TX, USA',
  'London, United Kingdom',
  'Manchester, United Kingdom',
  'Paris, France',
  'Berlin, Germany',
  'Tokyo, Japan',
  'Singapore',
  'Dubai, United Arab Emirates',
  'Sydney, NSW, Australia',
  'Melbourne, VIC, Australia',
  'Toronto, ON, Canada',
  'Vancouver, BC, Canada'
];

export default function PostCard({ post, onDeleteSuccess }) {
  const [nsfwRevealed, setNsfwRevealed] = useState(false);
  const [showAgeGate, setShowAgeGate] = useState(false);
  const { user, updateUserData, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const carouselRef = useRef(null);
  const postCardRef = useRef(null);
  const hasCountedView = useRef(false);

  const [isAuthDrawerOpen, setIsAuthDrawerOpen] = useState(false);
  const [drawerAction, setDrawerAction] = useState('interact with posts');

  const handleProductWishlistToggle = async (productId, e) => {
    if (e) e.stopPropagation();
    if (!isAuthenticated) {
      setDrawerAction('add products to wishlist');
      setIsAuthDrawerOpen(true);
      return;
    }
    try {
      const res = await client.post('/products/wishlist', { postId: post._id, productId });
      if (res.data.success) {
        // Update user state so that the heart icon changes instantly!
        const updatedSavedProducts = [...(user.savedProducts || [])];
        if (res.data.isSaved) {
          updatedSavedProducts.push({ post: post._id, productId });
        } else {
          const idx = updatedSavedProducts.findIndex(
            item => item.post?.toString() === post._id.toString() && item.productId?.toString() === productId.toString()
          );
          if (idx > -1) updatedSavedProducts.splice(idx, 1);
        }
        updateUserData({ ...user, savedProducts: updatedSavedProducts });
      }
    } catch (err) {
      console.error('Error toggling wishlist:', err);
    }
  };

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
  
  const [currentCaption, setCurrentCaption] = useState(post.caption || '');
  const [expandedCaption, setExpandedCaption] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(post.location || '');
  const [isArchivedState, setIsArchivedState] = useState(post.isArchived || false);
  const [showMenu, setShowMenu] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);

  // Removed inline location helpers for edit post modal

  const [likes, setLikes] = useState(post.likes || []);
  const [dislikes, setDislikes] = useState(post.dislikes || []);
  const [isSaved, setIsSaved] = useState(
    (user?.savedPosts || []).some(id => id.toString() === post._id.toString())
  );
  const [shareCount, setShareCount] = useState(post.shareCount || 0);
  
  const [showComments, setShowComments] = useState(false);
  const [showLikesSheet, setShowLikesSheet] = useState(false);
  const [likesSheetTab, setLikesSheetTab] = useState('likes');
  const [commentCount, setCommentCount] = useState(post.commentCount || 0);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [mediaAspect, setMediaAspect] = useState(null);

  // Carousel state
  const [currentSlide, setCurrentSlide] = useState(0);
  const [videoPlayingStates, setVideoPlayingStates] = useState({});
  const [videoMutedStates, setVideoMutedStates] = useState({});
  const [videoProgressStates, setVideoProgressStates] = useState({});
  const [singleVideoProgress, setSingleVideoProgress] = useState(0);
  const [touchStart, setTouchStart] = useState(null);
  const [touchDelta, setTouchDelta] = useState(0);

  // Determine media items for carousel (declared before useEffect to avoid TDZ ReferenceError)
  const hasCarousel = post.mediaItems && post.mediaItems.length > 1;
  const mediaItems = hasCarousel
    ? post.mediaItems
    : post.mediaUrl
      ? [{ url: post.mediaUrl, type: (post.type === 'video' || post.type === 'reel') ? 'video' : 'photo', thumbnailUrl: post.thumbnailUrl || '' }]
      : [];

  // Auto-play/pause & mute video when the post scrolls in/out of view
  useEffect(() => {
    const node = postCardRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Find the active slide (carousel slide or the post container itself)
            const slides = node.querySelectorAll('.carousel-slide');
            const activeSlide = hasCarousel ? slides[currentSlide] : node;
            const video = activeSlide?.querySelector('video');
            
            if (video) {
              // Ensure video is muted to comply with browser autoplay security policies
              video.muted = true;
              video.play().catch((err) => {
                console.log('Autoplay blocked:', err);
              });
              setIsPlaying(true);
              setIsMuted(true);
              if (hasCarousel) {
                setVideoPlayingStates(prev => ({ ...prev, [currentSlide]: true }));
                setVideoMutedStates(prev => ({ ...prev, [currentSlide]: true }));
              }
            }
          } else {
            const video = node.querySelector('video');
            if (video && !video.paused) {
              video.pause();
            }
            setIsPlaying(false);
            setIsMuted(true);
            setVideoPlayingStates(prev => {
              const updated = {};
              Object.keys(prev).forEach((k) => { updated[k] = false; });
              return updated;
            });
            setVideoMutedStates(prev => {
              const updated = {};
              Object.keys(prev).forEach((k) => { updated[k] = true; });
              return updated;
            });
          }
        });
      },
      { threshold: 0.4 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [currentSlide, hasCarousel]);

  const isLiked = likes.some(id => id.toString() === user?._id?.toString());
  const isDisliked = dislikes.some(id => id.toString() === user?._id?.toString());
  const isAuthor = post.author?._id === user?._id;

  // Determined media items at component top

  const goToSlide = useCallback((index) => {
    if (index < 0 || index >= mediaItems.length) return;
    // Pause any playing video when leaving slide
    const prevItem = mediaItems[currentSlide];
    if (prevItem?.type === 'video' && videoPlayingStates[currentSlide]) {
      setVideoPlayingStates(prev => ({ ...prev, [currentSlide]: false }));
    }
    setCurrentSlide(index);
  }, [mediaItems, currentSlide, videoPlayingStates]);

  const goNext = useCallback(() => goToSlide(currentSlide + 1), [currentSlide, goToSlide]);
  const goPrev = useCallback(() => goToSlide(currentSlide - 1), [currentSlide, goToSlide]);

  // Touch / swipe handlers
  const handleTouchStart = (e) => {
    setTouchStart(e.touches[0].clientX);
    setTouchDelta(0);
  };

  const handleTouchMove = (e) => {
    if (touchStart === null) return;
    setTouchDelta(e.touches[0].clientX - touchStart);
  };

  const handleTouchEnd = () => {
    const swipeThreshold = 50;
    if (touchDelta < -swipeThreshold && currentSlide < mediaItems.length - 1) {
      goToSlide(currentSlide + 1);
    } else if (touchDelta > swipeThreshold && currentSlide > 0) {
      goToSlide(currentSlide - 1);
    }
    setTouchStart(null);
    setTouchDelta(0);
  };

  const handleMediaLoad = (e) => {
    if (mediaAspect) return;
    const w = e.target.naturalWidth;
    const h = e.target.naturalHeight;
    if (!w || !h) return;
    const ratio = w / h;
    if (ratio < 0.5625) {
      setMediaAspect('9/16');
    } else if (ratio > 1.777) {
      setMediaAspect('16/9');
    } else {
      setMediaAspect(`${w}/${h}`);
    }
  };

  const handleArchiveToggle = async () => {
    try {
      setIsArchiving(true);
      const action = isArchivedState ? 'unarchive' : 'archive';
      const res = await client.post(`/posts/${post._id}/${action}`);
      if (res.data.success) {
        setIsArchivedState(!isArchivedState);
        if (onDeleteSuccess) {
          onDeleteSuccess(post._id);
        }
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to archive post');
    } finally {
      setIsArchiving(false);
      setShowMenu(false);
    }
  };

  // Removed inline handleEditSubmit for post modal

  const toggleCarouselVideo = (index) => {
    setVideoPlayingStates(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const toggleCarouselMute = (index) => {
    setVideoMutedStates(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const handleCarouselTimeUpdate = (index, e) => {
    const video = e.target;
    if (video.duration) {
      setVideoProgressStates(prev => ({ ...prev, [index]: (video.currentTime / video.duration) * 100 }));
    }
    if (!hasCountedView.current && video.currentTime >= 2) {
      hasCountedView.current = true;
      queueView(post._id);
    }
  };

  const handleLike = async () => {
    if (!isAuthenticated) {
      setDrawerAction('like posts');
      setIsAuthDrawerOpen(true);
      return;
    }
    try {
      const res = await client.post(`/posts/${post._id}/like`);
      if (res.data.success) {
        setLikes(res.data.data.likes);
        setDislikes(res.data.data.dislikes);
      }
    } catch (err) {
      console.error('Error liking post:', err);
    }
  };

  const handleDislike = async () => {
    if (!isAuthenticated) {
      setDrawerAction('dislike posts');
      setIsAuthDrawerOpen(true);
      return;
    }
    try {
      const res = await client.post(`/posts/${post._id}/dislike`);
      if (res.data.success) {
        setLikes(res.data.data.likes);
        setDislikes(res.data.data.dislikes);
      }
    } catch (err) {
      console.error('Error disliking post:', err);
    }
  };

  const handleSave = async () => {
    if (!isAuthenticated) {
      setDrawerAction('save posts');
      setIsAuthDrawerOpen(true);
      return;
    }
    try {
      const endpoint = isSaved ? `/posts/${post._id}/unsave` : `/posts/${post._id}/save`;
      const res = await client.post(endpoint);
      if (res.data.success) {
        setIsSaved(!isSaved);
        // Sync context user saved list if we want, or keep local state
        const updatedSaved = isSaved 
          ? (user.savedPosts || []).filter(id => id !== post._id)
          : [...(user.savedPosts || []), post._id];
        
        // Mock context update via helper
        user.savedPosts = updatedSaved;
      }
    } catch (err) {
      console.error('Error saving post:', err);
    }
  };

  const handleShare = async () => {
    try {
      const res = await client.post(`/posts/${post._id}/share`);
      if (res.data.success) {
        setShareCount(res.data.data.shareCount);
        const shareLink = res.data.data.shareableUrl;

        // Try native Web Share API
        if (navigator.share) {
          await navigator.share({
            title: 'Oravia Post',
            text: post.caption || 'Check out this post on Oravia!',
            url: shareLink,
          });
        } else {
          // Fallback to Clipboard Copy
          await navigator.clipboard.writeText(shareLink);
          alert('Link copied to clipboard!');
        }
      }
    } catch (err) {
      console.error('Error sharing post:', err);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    try {
      const res = await client.delete(`/posts/${post._id}`);
      if (res.data.success) {
        if (onDeleteSuccess) onDeleteSuccess(post._id);
      }
    } catch (err) {
      console.error('Error deleting post:', err);
    }
  };

  const toggleVideoPlay = (e) => {
    const video = e.target;
    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      video.play();
      setIsPlaying(true);
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

  const mediaContainerStyle = {
    ...(mediaAspect ? { aspectRatio: mediaAspect } : {}),
    ...(post.isNSFW && !nsfwRevealed ? { filter: 'blur(28px)', pointerEvents: 'none' } : {}),
    position: 'relative',
  };

  return (
    <div className="post-card animate-fade" ref={postCardRef}>
      {showAgeGate && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0,0,0,0.92)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            padding: '24px',
          }}
        >
          <AlertCircle size={40} color="#fff" style={{ marginBottom: '16px' }} />
          <div style={{ color: '#fff', fontWeight: 700, fontSize: '19px', marginBottom: '10px' }}>
            Age Restricted Content
          </div>
          <div style={{ color: '#ccc', fontSize: '14px', maxWidth: '320px', marginBottom: '28px' }}>
            This content is intended for adults 18 years or older. Please confirm your age to continue.
          </div>
          <button
            onClick={() => {
              sessionStorage.setItem('oravia_18plus_confirmed', 'true');
              setShowAgeGate(false);
              setNsfwRevealed(true);
            }}
            style={{
              background: '#fff',
              color: '#000',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 28px',
              fontWeight: 600,
              fontSize: '15px',
              marginBottom: '12px',
              width: '260px',
            }}
          >
            Yes, I am 18 or older
          </button>
          <button
            onClick={() => { window.location.href = '/'; }}
            style={{
              background: 'transparent',
              color: '#aaa',
              border: '1px solid #555',
              borderRadius: '8px',
              padding: '12px 28px',
              fontWeight: 600,
              fontSize: '15px',
              width: '260px',
            }}
          >
            No, take me back
          </button>
        </div>
      )}
      {/* Header */}
      <div className="post-header">
        <div className="author-header-left">
          <Link to={`/profile/${post.author?.username}`} className="author-avatar-link">
            <img 
              src={getFullMediaUrl(post.author?.avatarUrl) || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'} 
              alt={post.author?.username} 
              className="author-avatar" 
            />
          </Link>
          <div className="author-details">
            <Link to={`/profile/${post.author?.username}`} className="author-name-link">
              <span className="author-name">{post.author?.displayName || post.author?.username}</span>
            </Link>
            <span className="author-username">@{post.author?.username}</span>
            {currentLocation && (
              <Link to={`/location/${encodeURIComponent(currentLocation)}`} className="post-location-link">
                <MapPin size={10} style={{ marginRight: '3px' }} />
                <span>{currentLocation}</span>
              </Link>
            )}
          </div>
        </div>

        <div className="post-meta-right">
          {isAuthor && (
            <div className="post-options-menu-wrapper" style={{ position: 'relative' }}>
              <button 
                className="three-dot-menu-btn" 
                onClick={() => setShowMenu(!showMenu)} 
                aria-label="Post Options"
                style={{ background: 'none', border: 'none', color: '#71717a', cursor: 'pointer', padding: '4px' }}
              >
                <MoreHorizontal size={18} />
              </button>
              
              {showMenu && (
                <div className="post-dropdown-menu" style={{
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
                    onClick={() => { navigate('/create-post', { state: { editPost: post } }); setShowMenu(false); }}
                    style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', background: 'none', border: 'none', color: '#fff', fontSize: '13px', cursor: 'pointer' }}
                  >
                    Edit Post
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
      </div>

      {/* Media Block */}
      <div className="post-media-container" style={mediaContainerStyle}>
        {post.isNSFW && !nsfwRevealed && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              if (!isAuthenticated) {
                if (sessionStorage.getItem('oravia_18plus_confirmed') === 'true') {
                  setNsfwRevealed(true);
                } else {
                  setShowAgeGate(true);
                }
              } else {
                setNsfwRevealed(true);
              }
            }}
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 20,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(0,0,0,0.55)',
              cursor: 'pointer',
              pointerEvents: 'auto',
              textAlign: 'center',
              padding: '16px',
            }}
          >
            <AlertCircle size={28} color="#fff" style={{ marginBottom: '8px' }} />
            <div style={{ color: '#fff', fontWeight: 600, fontSize: '15px' }}>Sensitive Content</div>
            <div style={{ color: '#ddd', fontSize: '13px', marginTop: '4px' }}>This post may not be suitable for all audiences.</div>
            <div style={{ color: '#fff', fontSize: '13px', marginTop: '10px', textDecoration: 'underline' }}>Tap to view (18+)</div>
          </div>
        )}
        {post.isReal && (
          <div className="post-real-badge-overlay">
            <Camera size={12} style={{ marginRight: '4px' }} /> Real
          </div>
        )}
        {hasCarousel ? (
          <div
            className="carousel-wrapper"
            ref={carouselRef}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div
              className="carousel-track"
              style={{ transform: `translateX(-${currentSlide * 100}%)` }}
            >
              {mediaItems.map((item, idx) => (
                <div key={idx} className="carousel-slide">
                  {item.type === 'video' ? (
                    <div className="video-wrapper">
                      <video
                        src={getFullMediaUrl(item.url)}
                        loop
                        muted={videoMutedStates[idx] !== undefined ? videoMutedStates[idx] : true}
                        onClick={() => toggleCarouselVideo(idx)}
                        className="post-video"
                        playsInline
                        onLoadedMetadata={(e) => {
                          const w = e.target.videoWidth;
                          const h = e.target.videoHeight;
                          if (w && h && !mediaAspect) {
                            const ratio = w / h;
                            if (ratio < 0.5625) {
                              setMediaAspect('9/16');
                            } else if (ratio > 1.777) {
                              setMediaAspect('16/9');
                            } else {
                              setMediaAspect(`${w}/${h}`);
                            }
                          }
                        }}
                        onTimeUpdate={(e) => handleCarouselTimeUpdate(idx, e)}
                      />
                      {!videoPlayingStates[idx] && (
                        <div className="play-overlay" onClick={() => toggleCarouselVideo(idx)}>
                          <Play size={40} className="play-icon" />
                        </div>
                      )}
                      <button
                        className="mute-btn"
                        onClick={() => toggleCarouselMute(idx)}
                        aria-label={videoMutedStates[idx] !== false ? 'Unmute' : 'Mute'}
                      >
                        <Volume2 size={16} color={(videoMutedStates[idx] !== undefined ? videoMutedStates[idx] : true) ? '#ef4444' : '#22c55e'} />
                      </button>
                      {videoPlayingStates[idx] && (
                        <div
                          className="video-progress-hitzone"
                          onClick={(e) => {
                            e.stopPropagation();
                            const rect = e.currentTarget.getBoundingClientRect();
                            const percent = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
                            const video = e.currentTarget.closest('.video-wrapper').querySelector('video');
                            if (video && video.duration) {
                              video.currentTime = percent * video.duration;
                              setVideoProgressStates(prev => ({ ...prev, [idx]: percent * 100 }));
                            }
                          }}
                        >
                          <div className="video-progress-track">
                            <div className="video-progress-fill" style={{ width: `${videoProgressStates[idx] || 0}%` }} />
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <img
                      src={getFullMediaUrl(item.url)}
                      alt="Post content"
                      className="post-image"
                      loading="lazy"
                      onLoad={handleMediaLoad}
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Left Arrow */}
            {currentSlide > 0 && (
              <button className="carousel-arrow carousel-arrow-left" onClick={goPrev} aria-label="Previous">
                <ChevronLeft size={22} />
              </button>
            )}

            {/* Right Arrow */}
            {currentSlide < mediaItems.length - 1 && (
              <button className="carousel-arrow carousel-arrow-right" onClick={goNext} aria-label="Next">
                <ChevronRight size={22} />
              </button>
            )}

            {/* Dot Indicators */}
            {mediaItems.length > 1 && (
              <div className="carousel-dots">
                {mediaItems.map((_, idx) => (
                  <span
                    key={idx}
                    className={`carousel-dot ${idx === currentSlide ? 'active' : ''}`}
                    onClick={() => goToSlide(idx)}
                  />
                ))}
              </div>
            )}

            {/* Slide Counter */}
            <div className="carousel-counter">
              {currentSlide + 1}/{mediaItems.length}
            </div>
          </div>
        ) : (
          mediaItems.length > 0 && (
            mediaItems[0].type === 'video' ? (
              <div className="video-wrapper">
                <video
                  src={getFullMediaUrl(mediaItems[0].url)}
                  loop
                  muted={isMuted}
                  onClick={toggleVideoPlay}
                  className="post-video"
                  playsInline
                  onLoadedMetadata={(e) => {
                    const w = e.target.videoWidth;
                    const h = e.target.videoHeight;
                    if (w && h && !mediaAspect) {
                      const ratio = w / h;
                      if (ratio < 0.5625) {
                        setMediaAspect('9/16');
                      } else if (ratio > 1.777) {
                        setMediaAspect('16/9');
                      } else {
                        setMediaAspect(`${w}/${h}`);
                      }
                    }
                  }}
                  onTimeUpdate={(e) => {
                    const v = e.target;
                    if (v.duration) setSingleVideoProgress((v.currentTime / v.duration) * 100);
                    if (!hasCountedView.current && v.currentTime >= 2) {
                      hasCountedView.current = true;
                      queueView(post._id);
                    }
                  }}
                />
                {!isPlaying && (
                  <div className="play-overlay" onClick={(e) => {
                    const video = e.target.closest('.video-wrapper').querySelector('video');
                    video.play();
                    setIsPlaying(true);
                  }}>
                    <Play size={40} className="play-icon" />
                  </div>
                )}
                <button
                  className="mute-btn"
                  onClick={() => setIsMuted(!isMuted)}
                  aria-label={isMuted ? 'Unmute' : 'Mute'}
                >
                  <Volume2 size={16} color={isMuted ? '#ef4444' : '#22c55e'} />
                </button>
                {isPlaying && (
                  <div
                    className="video-progress-hitzone"
                    onClick={(e) => {
                      e.stopPropagation();
                      const rect = e.currentTarget.getBoundingClientRect();
                      const percent = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
                      const video = e.currentTarget.closest('.video-wrapper').querySelector('video');
                      if (video && video.duration) {
                        video.currentTime = percent * video.duration;
                        setSingleVideoProgress(percent * 100);
                      }
                    }}
                  >
                    <div className="video-progress-track">
                      <div className="video-progress-fill" style={{ width: `${singleVideoProgress}%` }} />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <img
                src={getFullMediaUrl(mediaItems[0].url)}
                alt="Post content"
                className="post-image"
                loading="lazy"
                onLoad={handleMediaLoad}
              />
            )
          )
        )}
      </div>

      {/* Shoppable Affiliate Products */}
      {post.products && post.products.length > 0 && (
        <div className="products-scroll-container" style={{ display: 'flex', gap: '6px', overflowX: 'auto', padding: '8px 6px', margin: '8px 0' }}>
          {post.products.map((prod, idx) => {
            const isProductSaved = (user?.savedProducts || []).some(
              item => item.productId?.toString() === prod._id?.toString()
            );

            const isDownload = !!prod.fileUrl;
            const primaryLink = prod.link || '';

            const handleCardClick = () => {
              if (prod.fileUrl) {
                window.open(getFullMediaUrl(prod.fileUrl), '_blank', 'noopener,noreferrer');
              } else if (primaryLink) {
                window.open(primaryLink, '_blank', 'noopener,noreferrer');
              }
            };

            return (
              <div 
                key={prod._id || idx} 
                className="product-scroll-card"
                onClick={handleCardClick}
                style={{
                  background: '#18181b',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '8px',
                  padding: '6px',
                  width: '220px',
                  minWidth: '220px',
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: '8px',
                  position: 'relative',
                  flexShrink: 0,
                  cursor: 'pointer',
                  overflow: 'hidden',
                  transition: 'background 0.15s, border-color 0.15s'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#1f1f23'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#18181b'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
              >
                {/* Thumbnail */}
                <div
                  style={{
                    position: 'relative',
                    width: '50px',
                    height: '50px',
                    flexShrink: 0,
                    borderRadius: '6px',
                    overflow: 'hidden',
                    background: '#0f0f12',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {prod.imageUrl ? (
                    <img 
                      src={getFullMediaUrl(prod.imageUrl)} 
                      alt={prod.title} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling && (e.target.nextSibling.style.display = 'flex'); }}
                    />
                  ) : null}
                  {/* Icon placeholder — shown when no image, or as fallback on image error */}
                  <div
                    style={{
                      display: prod.imageUrl ? 'none' : 'flex',
                      position: prod.imageUrl ? 'absolute' : 'relative',
                      inset: prod.imageUrl ? 0 : undefined,
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: prod.imageUrl ? 'rgba(0,0,0,0.6)' : 'transparent',
                      zIndex: prod.imageUrl ? 1 : 0
                    }}
                  >
                    {prod.fileUrl ? (
                      <Download size={18} color="#71717a" />
                    ) : (
                      <ShoppingBag size={18} color="#71717a" />
                    )}
                  </div>
                </div>

                {/* Text Info */}
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <p style={{ fontSize: '11px', fontWeight: '600', color: '#e4e4e7', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{prod.title}</p>
                  {!prod.fileUrl && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--accent-indigo)' }}>{prod.price}</span>
                      {prod.originalPrice && (
                        <span style={{ fontSize: '10px', textDecoration: 'line-through', color: '#52525b' }}>{prod.originalPrice}</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Wishlist Heart — far right, independent click */}
                <button
                  type="button"
                  onClick={(e) => handleProductWishlistToggle(prod._id, e)}
                  style={{
                    flexShrink: 0,
                    background: 'none',
                    border: 'none',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: isProductSaved ? '#f43f5e' : '#3f3f46',
                    cursor: 'pointer',
                    transition: 'color 0.15s ease'
                  }}
                  title={isProductSaved ? "Remove from Wishlist" : "Save to Wishlist"}
                >
                  <Heart size={14} fill={isProductSaved ? '#f43f5e' : 'none'} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Interactions Action Bar */}
      <div className="post-actions">
        <div className="actions-left">
          <button 
            className={`action-btn ${isLiked ? 'liked' : ''}`} 
            onClick={handleLike}
            aria-label="Like"
          >
            <Heart size={22} fill={isLiked ? 'currentColor' : 'none'} />
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

          <button 
            className={`action-btn ${isDisliked ? 'disliked' : ''}`} 
            onClick={handleDislike}
            aria-label="Dislike"
          >
            <ThumbsDown size={22} fill={isDisliked ? 'currentColor' : 'none'} />
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
            className="action-btn" 
            onClick={(e) => {
              e.stopPropagation();
              if (!isAuthenticated) {
                setDrawerAction('comment on posts');
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

          {(post.type === 'video' || post.type === 'reel') && post.views > 0 && (
            <span className="views-count" aria-label="Views">
              <Eye size={18} />
              {post.views}
            </span>
          )}
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

      {/* Content */}
      <div className="post-body">
        {currentCaption && (() => {
          const CAPTION_LIMIT = 200;
          const isLongCaption = currentCaption.length > CAPTION_LIMIT;
          const displayCaption = isLongCaption && !expandedCaption
            ? currentCaption.slice(0, CAPTION_LIMIT).trimEnd()
            : currentCaption;

          return (
            <p className="post-caption">
              <Link to={`/profile/${post.author?.username}`} className="caption-username">
                {post.author?.username}
              </Link>{' '}
              {parseCaptionText(displayCaption)}
              {isLongCaption && !expandedCaption && '... '}
              {isLongCaption && (
                <span
                  onClick={() => setExpandedCaption(!expandedCaption)}
                  style={{ color: 'var(--text-muted)', fontWeight: 600, cursor: 'pointer' }}
                >
                  {expandedCaption ? ' Show less' : 'See more'}
                </span>
              )}
            </p>
          );
        })()}
        <span className="post-time">{formatTime(post.createdAt)}</span>
      </div>

      {/* Comment Drawer Sheet */}
      {showComments && (
        <CommentsSheet 
          postId={post._id} 
          onClose={() => setShowComments(false)}
          onCommentCountChange={setCommentCount} 
        />
      )}

      {showLikesSheet && (
        <LikesSheet
          postId={post._id}
          initialTab={likesSheetTab}
          likeCount={likes.length}
          dislikeCount={dislikes.length}
          onClose={() => setShowLikesSheet(false)}
        />
      )}

      <style>{`
        .location-link-wrapper {
          text-decoration: none;
          color: inherit;
          transition: opacity 0.2s;
        }
        .location-link-wrapper:hover {
          opacity: 0.8;
        }

        .post-card {
          background-color: var(--bg-secondary);
          border-top: 1px solid var(--border-color);
          border-bottom: 1px solid var(--border-color);
          border-left: none;
          border-right: none;
          border-radius: 0;
          margin-bottom: 16px;
          overflow: hidden;
        }

        .post-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 16px;
        }

        .author-header-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .author-avatar-link {
          display: flex;
          align-items: center;
          text-decoration: none;
        }

        .author-name-link {
          text-decoration: none;
          color: inherit;
        }

        .author-name-link:hover {
          text-decoration: underline;
        }

        .post-location-link {
          display: flex;
          align-items: center;
          gap: 2px;
          font-size: 10px;
          color: #ffffff;
          text-decoration: none;
          margin-top: 2px;
        }

        .post-location-link:hover {
          color: rgba(255, 255, 255, 0.8);
        }

        .author-avatar {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid var(--accent-indigo);
        }

        .author-details {
          display: flex;
          flex-direction: column;
        }

        .author-name {
          font-size: 14px;
          font-weight: 600;
        }

        .author-username {
          font-size: 11px;
          color: #ffffff;
        }

        .post-meta-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .location-tag {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          color: var(--text-secondary);
          background: var(--bg-tertiary);
          padding: 4px 8px;
          border-radius: 20px;
        }

        .delete-btn {
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          transition: color 0.2s;
        }

        .delete-btn:hover {
          color: #ef4444;
        }

        .post-media-container {
          width: 100%;
          aspect-ratio: 1 / 1;
          background-color: #000;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }

        .post-image {
          width: 100%;
          height: 100%;
          object-fit: contain;
          background: #000;
        }

        .video-wrapper {
          position: relative;
          width: 100%;
          height: 100%;
        }

        .post-video {
          width: 100%;
          height: 100%;
          object-fit: cover;
          cursor: pointer;
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

        .video-progress-hitzone {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 24px;
          z-index: 3;
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

        .views-count {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 13px;
          color: var(--text-muted);
          margin-left: 4px;
        }

        .post-actions {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
        }

        .actions-left, .actions-right {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .action-btn {
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

        .action-btn:active {
          transform: scale(0.9);
        }

        .action-btn.liked {
          color: var(--accent-violet);
        }

        .action-btn.disliked {
          color: var(--accent-indigo);
        }

        .action-btn.saved {
          color: var(--accent-gold);
        }

        .post-body {
          padding: 0 16px 16px 16px;
        }

        .post-caption {
          font-size: 14px;
          margin-bottom: 6px;
          white-space: pre-wrap;
          word-break: break-word;
        }

        .caption-username {
          font-weight: 600;
          text-decoration: none;
          color: inherit;
          margin-right: 6px;
        }

        .post-time {
          font-size: 11px;
          color: var(--text-muted);
          text-transform: uppercase;
        }

        /* Carousel Styles */
        .carousel-wrapper {
          width: 100%;
          height: 100%;
          position: relative;
          overflow: hidden;
        }

        .carousel-track {
          display: flex;
          height: 100%;
          transition: transform 0.3s ease;
          will-change: transform;
        }

        .carousel-slide {
          flex: 0 0 100%;
          width: 100%;
          max-width: 100%;
          height: 100%;
          position: relative;
        }

        .carousel-slide .post-image,
        .carousel-slide .post-video,
        .carousel-slide .video-wrapper {
          width: 100%;
          height: 100%;
        }

        .carousel-arrow {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          background: rgba(0, 0, 0, 0.55);
          border: none;
          color: #ffffff;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 5;
          backdrop-filter: blur(4px);
          transition: background 0.2s;
        }

        .carousel-arrow:hover {
          background: rgba(0, 0, 0, 0.75);
        }

        .carousel-arrow-left {
          left: 10px;
        }

        .carousel-arrow-right {
          right: 10px;
        }

        .carousel-dots {
          position: absolute;
          bottom: 12px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 6px;
          z-index: 5;
        }

        .carousel-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.4);
          cursor: pointer;
          transition: all 0.2s;
        }

        .carousel-dot.active {
          background: #ffffff;
          width: 18px;
          border-radius: 3px;
        }

        .carousel-counter {
          position: absolute;
          top: 12px;
          right: 12px;
          background: rgba(0, 0, 0, 0.6);
          color: #ffffff;
          font-size: 11px;
          font-weight: 600;
          padding: 3px 8px;
          border-radius: 10px;
          z-index: 5;
          backdrop-filter: blur(4px);
        }

        .post-real-badge-overlay {
          position: absolute;
          top: 12px;
          left: 12px;
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

      {/* Inline edit post modal removed, routing to standalone CreatePost page instead */}
      
      <AuthDrawer 
        isOpen={isAuthDrawerOpen} 
        onClose={() => setIsAuthDrawerOpen(false)} 
        actionText={drawerAction}
      />
    </div>
  );
}
