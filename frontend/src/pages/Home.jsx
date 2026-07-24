import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Search, Bell } from 'lucide-react';
import client from '../api/client';
import PostCard from '../components/PostCard/PostCard';
import ReelCard from '../components/ReelCard/ReelCard';
import SuggestedCreators from '../components/SuggestedCreators/SuggestedCreators';
import { useNotifications } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import OraviaLogo from '../components/OraviaLogo/OraviaLogo';

export default function Home() {
  const [feedItems, setFeedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showMessagesModal, setShowMessagesModal] = useState(false);
  const { unreadCount } = useNotifications();
  
  const [activeTab, setActiveTab] = useState('for-you');
  const [locationNotSet, setLocationNotSet] = useState(false);
  const [emptyFollowing, setEmptyFollowing] = useState(false);
  const [noPostsForLocation, setNoPostsForLocation] = useState(false);
  const [userLocation, setUserLocation] = useState('');

  const { isAuthenticated } = useAuth();
  const [guestCityQuery, setGuestCityQuery] = useState('');
  const [tempCityInput, setTempCityInput] = useState('');
  const displayFeed = feedItems;

  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  const loaderRef = useRef(null);
  const navigate = useNavigate();

  const [showTopBar, setShowTopBar] = useState(true);
  const lastScrollY = useRef(0);
  const scrollTicking = useRef(false);

  useEffect(() => {
    const handleScroll = () => {
      if (scrollTicking.current) return;
      scrollTicking.current = true;

      requestAnimationFrame(() => {
        const currentScrollY = window.scrollY;
        const delta = currentScrollY - lastScrollY.current;

        if (currentScrollY <= 20) {
          setShowTopBar(true);
        } else if (delta > 5) {
          setShowTopBar(false);
        } else if (delta < -5) {
          setShowTopBar(true);
        }

        lastScrollY.current = currentScrollY;
        scrollTicking.current = false;
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBanner(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  useEffect(() => {
    document.title = 'Home | Oravia';
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`[PWA] User installation choice: ${outcome}`);
    setDeferredPrompt(null);
    setShowInstallBanner(false);
  };

  const fetchFeed = async (tabName = activeTab, targetCity = guestCityQuery) => {
    setLoading(true);
    setEmptyFollowing(false);
    setLocationNotSet(false);
    setNoPostsForLocation(false);
    setUserLocation('');
    setNextCursor(null);
    setHasMore(true);

    try {
      let endpoint = '/posts/feed?limit=10';
      if (tabName === 'following') {
        endpoint = '/posts/following';
      } else if (tabName === 'near-you') {
        endpoint = '/posts/near-you?limit=10';
        if (targetCity) {
          endpoint += `&city=${encodeURIComponent(targetCity)}`;
        }
      }

      const res = await client.get(endpoint);
      if (res.data.success) {
        setFeedItems(res.data.data || []);
        setNextCursor(res.data.nextCursor || null);
        setHasMore(!!res.data.nextCursor);

        if (tabName === 'following') {
          setEmptyFollowing(!!res.data.emptyFollowing);
        } else if (tabName === 'near-you') {
          // If guest and they queried, don't show locationNotSet card
          if (!isAuthenticated && targetCity) {
            setLocationNotSet(false);
          } else {
            setLocationNotSet(!!res.data.locationNotSet);
          }
          setNoPostsForLocation(!!res.data.noPostsForLocation);
          setUserLocation(targetCity || res.data.userLocation || '');
        }
      }
    } catch (err) {
      console.error('Error fetching feed:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMorePosts = async () => {
    if (loadingMore || !hasMore || !nextCursor) return;
    setLoadingMore(true);
    try {
      let endpoint = `/posts/feed?limit=10&cursor=${encodeURIComponent(nextCursor)}`;
      if (activeTab === 'near-you') {
        endpoint = `/posts/near-you?limit=10&cursor=${encodeURIComponent(nextCursor)}`;
        if (guestCityQuery) {
          endpoint += `&city=${encodeURIComponent(guestCityQuery)}`;
        }
      }

      const res = await client.get(endpoint);
      if (res.data.success) {
        setFeedItems((prev) => [...prev, ...(res.data.data || [])]);
        setNextCursor(res.data.nextCursor || null);
        setHasMore(!!res.data.nextCursor);
      }
    } catch (err) {
      console.error('Error fetching more posts:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (!loaderRef.current) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore && !loadingMore) {
        fetchMorePosts();
      }
    }, { threshold: 0.5 });

    observer.observe(loaderRef.current);
    return () => {
      if (loaderRef.current) {
        observer.unobserve(loaderRef.current);
      }
    };
  }, [hasMore, nextCursor, loadingMore, activeTab, guestCityQuery]);

  useEffect(() => {
    fetchFeed(activeTab);
  }, [activeTab]);

  const handleDeletePost = (deletedId) => {
    setFeedItems(feedItems.filter(item => item._id !== deletedId));
  };

  // Compute which post indices should show SuggestedCreators
  // First time: after 2nd post (index 1), then randomly every 4, 6, 8, or 10 posts
  const suggestedIndices = useMemo(() => {
    const indices = new Set();
    const len = feedItems.length;
    const possibleSteps = [4, 6, 8, 10];
    if (len >= 2) {
      indices.add(1); // Always after 2nd post
      let current = 1;
      while (current < len - 1) {
        const step = possibleSteps[Math.floor(Math.random() * possibleSteps.length)];
        current += step;
        if (current < len) {
          indices.add(current);
        }
      }
    }
    return indices;
  }, [feedItems.length]);

  return (
    <div className="page-container">
      {/* Auto-hide Top Bar: Header + Sticky Tabs (Instagram-style) */}
      <div className={`top-bar-wrapper ${showTopBar ? '' : 'top-bar-hidden'}`}>
        <header className="glass-header">
          <div className="brand-logo-container" onClick={() => navigate('/')}>
            <OraviaLogo className="logo-spark" size={18} />
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

        <div className="timeline-tabs-container">
          <button 
            className={`tab-btn ${activeTab === 'for-you' ? 'active' : ''}`}
            onClick={() => setActiveTab('for-you')}
          >
            <span>For You</span>
          </button>
          <button 
            className={`tab-btn ${activeTab === 'following' ? 'active' : ''}`}
            onClick={() => setActiveTab('following')}
          >
            <span>Following</span>
          </button>
          <button 
            className={`tab-btn ${activeTab === 'near-you' ? 'active' : ''}`}
            onClick={() => setActiveTab('near-you')}
          >
            <span>Near You</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="feed-body">
        {loading ? (
          <div className="feed-loader-container">
            <div className="spinner"></div>
            <p>Gathering your feed...</p>
          </div>
        ) : activeTab === 'following' && emptyFollowing ? (
          <div className="empty-feed-container">
            <div className="empty-emoji">👥</div>
            <h3>Not following anyone yet</h3>
            <p>Follow active creators below to see their posts and snips in your Following feed!</p>
            <div style={{ width: '100%', maxWidth: '500px', margin: '16px auto 0' }}>
              <SuggestedCreators />
            </div>
          </div>
        ) : activeTab === 'near-you' && (!isAuthenticated || locationNotSet) && !guestCityQuery ? (
          <div className="empty-feed-container">
            <div className="empty-emoji">📍</div>
            <h3>Search posts near any city</h3>
            <p>Explore local creators, snips, and products shared in any city.</p>
            <div style={{ marginTop: '20px', display: 'flex', gap: '8px', width: '100%', maxWidth: '320px', marginLeft: 'auto', marginRight: 'auto' }}>
              <input 
                type="text" 
                placeholder="Enter city (e.g., Kolkata)" 
                value={tempCityInput} 
                onChange={(e) => setTempCityInput(e.target.value)}
                style={{
                  flex: 1,
                  background: '#121214',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '12px',
                  padding: '10px 14px',
                  color: '#fff',
                  fontSize: '13px',
                  outline: 'none'
                }}
              />
              <button 
                className="btn-primary" 
                style={{ padding: '0 16px', borderRadius: '12px', fontSize: '13px' }}
                onClick={() => {
                  if (tempCityInput.trim()) {
                    setGuestCityQuery(tempCityInput.trim());
                    fetchFeed('near-you', tempCityInput.trim());
                  }
                }}
              >
                Search
              </button>
            </div>
          </div>
        ) : activeTab === 'near-you' && noPostsForLocation ? (
          <div className="empty-feed-container">
            <div className="empty-emoji">🌆</div>
            <h3>No posts near {guestCityQuery || userLocation} yet</h3>
            <p>Be the first to share a photo, video or reel in this location!</p>
            {!isAuthenticated ? (
              <button className="btn-primary" style={{ marginTop: '16px', padding: '10px 24px', borderRadius: '20px', fontSize: '14px', fontWeight: '600' }} onClick={() => { setGuestCityQuery(''); setTempCityInput(''); fetchFeed('near-you', ''); }}>
                Search Another City
              </button>
            ) : (
              <button className="btn-primary" style={{ marginTop: '16px', padding: '10px 24px', borderRadius: '20px', fontSize: '14px', fontWeight: '600' }} onClick={() => navigate('/create-post')}>
                Create Post
              </button>
            )}
          </div>
        ) : activeTab === 'near-you' && locationNotSet ? (
          <div className="empty-feed-container">
            <div className="empty-emoji">📍</div>
            <h3>Location Not Set</h3>
            <p>Please add your location in your profile to find posts and creators near you.</p>
            <button className="btn-primary" style={{ marginTop: '16px', padding: '10px 24px', borderRadius: '20px', fontSize: '14px', fontWeight: '600' }} onClick={() => navigate('/edit-profile')}>
              Add Location
            </button>
          </div>
        ) : feedItems.length === 0 ? (
          <div className="empty-feed-container">
            <div className="empty-emoji">🌱</div>
            <h3>Your feed is empty</h3>
            <p>Follow users or upload your first photo/video post from the bottom bar to get started!</p>
          </div>
        ) : (
          <div className="feed-list">
            {showInstallBanner && (
              <div className="pwa-install-banner">
                <div className="pwa-install-content">
                  <img src="/logo192.png" alt="Oravia logo" className="pwa-logo-img" />
                  <div className="pwa-text">
                    <h4>Install Oravia App</h4>
                    <p>Add to your home screen for quick access and fullscreen mobile experience!</p>
                  </div>
                </div>
                <div className="pwa-actions">
                  <button className="btn-install" onClick={handleInstallClick}>Install</button>
                  <button className="btn-dismiss" onClick={() => setShowInstallBanner(false)}>Not Now</button>
                </div>
              </div>
            )}

            {feedItems.map((item, index) => {
              const isReel = item.type === 'reel';
              return (
                <React.Fragment key={item._id}>
                  {isReel ? (
                    <ReelCard reel={item} onDeleteSuccess={handleDeletePost} />
                  ) : (
                    <PostCard 
                      post={item} 
                      onDeleteSuccess={handleDeletePost} 
                    />
                  )}
                  {suggestedIndices.has(index) && <SuggestedCreators />}
                </React.Fragment>
              );
            })}
            {feedItems.length === 1 && <SuggestedCreators />}
            
            {/* Infinite Scroll Loader marker */}
            {hasMore && (
              <div ref={loaderRef} className="feed-loading-more-trigger">
                <div className="spinner" style={{ width: '24px', height: '24px', margin: '20px auto' }}></div>
              </div>
            )}
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
          padding-top: 108px;
        }

        .top-bar-wrapper {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 100;
          transform: translateY(0);
          transition: transform 0.3s ease;
        }

        .top-bar-wrapper.top-bar-hidden {
          transform: translateY(-100%);
        }

        .top-bar-wrapper .glass-header {
          position: static;
        }

        .pwa-install-banner {
          margin: 16px 16px 8px 16px;
          padding: 20px;
          background: linear-gradient(135deg, rgba(20, 20, 25, 0.9) 0%, rgba(10, 10, 12, 0.95) 100%);
          border: 1px solid rgba(139, 92, 246, 0.25);
          border-radius: 20px;
          backdrop-filter: blur(20px);
          display: flex;
          flex-direction: column;
          gap: 16px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.05);
        }

        .pwa-install-content {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .pwa-logo-img {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.6);
        }

        .pwa-text h4 {
          font-family: 'Outfit', sans-serif;
          font-size: 15px;
          font-weight: 700;
          color: #ffffff;
          margin: 0 0 4px 0;
          letter-spacing: -0.01em;
        }

        .pwa-text p {
          font-size: 12px;
          color: #a1a1aa;
          margin: 0;
          line-height: 1.45;
        }

        .pwa-actions {
          display: flex;
          gap: 10px;
        }

        .btn-install {
          flex: 1;
          padding: 11px 0;
          border-radius: 12px;
          font-family: 'Outfit', sans-serif;
          font-size: 13px;
          font-weight: 600;
          border: none;
          background: linear-gradient(135deg, var(--accent-violet) 0%, var(--accent-indigo) 100%);
          color: #ffffff;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
          box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
        }

        .btn-install:active {
          transform: scale(0.98);
        }

        .btn-dismiss {
          padding: 11px 20px;
          border-radius: 12px;
          font-family: 'Outfit', sans-serif;
          font-size: 13px;
          font-weight: 600;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: #ffffff;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .btn-dismiss:hover {
          background: rgba(255, 255, 255, 0.08);
        }

        .guest-feed-lock-card {
          margin: 24px 16px;
          background: rgba(20, 20, 25, 0.75);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          padding: 32px 20px;
          text-align: center;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
        }

        .lock-graphic {
          font-size: 36px;
          margin-bottom: 16px;
        }

        .guest-feed-lock-card h3 {
          font-family: 'Outfit', sans-serif;
          font-size: 18px;
          font-weight: 700;
          color: #ffffff;
          margin: 0 0 8px 0;
        }

        .guest-feed-lock-card p {
          font-size: 13px;
          color: #a1a1aa;
          line-height: 1.5;
          margin: 0 0 24px 0;
        }

        .lock-cta-actions {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .lock-btn {
          width: 100%;
          padding: 12px 0;
          border-radius: 10px;
          font-family: 'Outfit', sans-serif;
          font-weight: 600;
          font-size: 13px;
          border: none;
          background: var(--accent-indigo);
          color: #000;
          cursor: pointer;
        }

        .lock-secondary-btn {
          width: 100%;
          padding: 12px 0;
          border-radius: 10px;
          font-family: 'Outfit', sans-serif;
          font-weight: 600;
          font-size: 13px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: #ffffff;
          cursor: pointer;
          transition: all 0.2s;
        }

        .lock-secondary-btn:hover {
          background: rgba(255, 255, 255, 0.08);
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

        .timeline-tabs-container {
          background: rgba(0, 0, 0, 0.9);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          justify-content: space-around;
          align-items: center;
          height: 48px;
          width: 100%;
        }

        .tab-btn {
          background: none;
          border: none;
          color: var(--text-secondary);
          font-family: 'Outfit', sans-serif;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          padding: 0 16px;
          transition: color 0.2s, transform 0.1s;
        }

        .tab-btn:hover {
          color: var(--text-primary);
        }

        .tab-btn:active {
          transform: scale(0.95);
        }

        .tab-btn.active {
          color: var(--text-primary);
          font-weight: 700;
        }

        .tab-btn.active::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 15%;
          right: 15%;
          height: 3px;
          background: var(--accent-indigo);
          border-top-left-radius: 3px;
          border-top-right-radius: 3px;
          box-shadow: 0 0 10px rgba(255, 143, 0, 0.5);
        }
      `}</style>
    </div>
  );
}
