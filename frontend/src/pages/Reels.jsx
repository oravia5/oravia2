import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import client from '../api/client';
import ReelPlayer from '../components/ReelPlayer/ReelPlayer';
import { useAuth } from '../context/AuthContext';

export default function Reels() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);

  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const displayReels = isAuthenticated ? reels : reels.slice(0, 5);

  const containerRef = useRef(null);
  const scrollRaf = useRef(null);

  const fetchReels = async () => {
    // If a list of reels is passed in the navigation state, use it directly
    if (location.state?.reelsList) {
      const passedReels = location.state.reelsList;
      setReels(passedReels);
      setNextCursor(null);
      setHasMore(false);
      setLoading(false);

      const targetId = location.state?.activeId;
      if (targetId) {
        const idx = passedReels.findIndex((r) => r._id === targetId);
        if (idx !== -1) {
          setActiveIndex(idx);
          // Wait for DOM layout to trigger scroll snap centering
          setTimeout(() => {
            if (containerRef.current) {
              const height = containerRef.current.clientHeight;
              containerRef.current.scrollTo({
                top: idx * height,
                behavior: 'auto', // immediate jump
              });
            }
          }, 100);
        }
      }
      return;
    }

    try {
      const res = await client.get('/reels?limit=5');
      if (res.data.success) {
        setReels(res.data.data);
        setNextCursor(res.data.nextCursor || null);
        setHasMore(!!res.data.nextCursor);
        
        // Handle scroll alignment if directed from specific card
        const targetId = location.state?.activeId;
        if (targetId) {
          const idx = res.data.data.findIndex((r) => r._id === targetId);
          if (idx !== -1) {
            setActiveIndex(idx);
            // Wait for DOM layout to trigger scroll snap centering
            setTimeout(() => {
              if (containerRef.current) {
                const height = containerRef.current.clientHeight;
                containerRef.current.scrollTo({
                  top: idx * height,
                  behavior: 'auto', // immediate jump
                });
              }
            }, 100);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching reels:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMoreReels = async () => {
    if (loadingMore || !hasMore || !nextCursor || !isAuthenticated) return;
    setLoadingMore(true);
    try {
      const res = await client.get(`/reels?limit=5&cursor=${encodeURIComponent(nextCursor)}`);
      if (res.data.success) {
        setReels((prev) => [...prev, ...(res.data.data || [])]);
        setNextCursor(res.data.nextCursor || null);
        setHasMore(!!res.data.nextCursor);
      }
    } catch (err) {
      console.error('Error fetching more reels:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchReels();
  }, [location.state]);

  const handleScroll = (e) => {
    if (scrollRaf.current) return;
    scrollRaf.current = requestAnimationFrame(() => {
      scrollRaf.current = null;
      const container = e.target;
      const height = container.clientHeight;
      const scrollOffset = container.scrollTop;
      
      const index = Math.round(scrollOffset / height);
      const totalCount = isAuthenticated ? reels.length : Math.min(reels.length, 6);
      if (index !== activeIndex && index >= 0 && index < totalCount) {
        setActiveIndex(index);
        
        // Pre-fetch next page when approaching the second-to-last item of current feed
        if (isAuthenticated && hasMore && !loadingMore && index >= reels.length - 2) {
          fetchMoreReels();
        }
      }
    });
  };

  useEffect(() => {
    return () => {
      if (scrollRaf.current) cancelAnimationFrame(scrollRaf.current);
    };
  }, []);

  return (
    <div className="reels-page">
      {loading ? (
        <div className="reels-loader">
          <div className="spinner"></div>
          <p>Loading Snips...</p>
        </div>
      ) : reels.length === 0 ? (
        <div className="empty-reels">
          <span className="empty-emoji">🎬</span>
          <h3>No Snips yet</h3>
          <p>Be the first to upload a Snip!</p>
        </div>
      ) : (
        <div 
          ref={containerRef} 
          className="reels-container" 
          onScroll={handleScroll}
        >
          {displayReels.map((reel, idx) => (
            <div key={reel._id} className="reel-item">
              <ReelPlayer 
                reel={reel} 
                isActive={idx === activeIndex} 
                onDelete={(deletedId) => {
                  setReels(prev => prev.filter(r => r._id !== deletedId));
                }}
              />
            </div>
          ))}
          {!isAuthenticated && reels.length > 5 && (
            <div className="reel-item reels-lock-item">
              <div className="reels-lock-card">
                <div className="lock-icon-circle">🎬</div>
                <h3>Create a profile to watch more Snips</h3>
                <p>Watch unlimited videos, post your own Snips, and connect with creators on Oravia!</p>
                <button className="btn-primary" onClick={() => navigate('/login')} style={{ width: '100%', marginBottom: '12px', padding: '14px 0', borderRadius: '12px' }}>Log In</button>
                <button className="secondary-btn" onClick={() => navigate('/register')}>Sign Up</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Floating Create Snip Button */}
      <button 
        className="create-reel-fab"
        onClick={() => navigate('/create-post', { state: { reelMode: true } })}
        aria-label="Create Snip"
      >
        <Plus size={24} />
      </button>

      <style>{`
        .reels-page {
          width: 100%;
          height: calc(100vh - var(--bottom-nav-height) - var(--safe-bottom));
          height: calc(100dvh - var(--bottom-nav-height) - var(--safe-bottom));
          background: #000;
          overflow: hidden;
        }

        .reels-loader, .empty-reels {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: var(--text-secondary);
          background-color: #000;
          gap: 12px;
        }

        .empty-reels h3 {
          font-size: 18px;
          font-weight: 700;
          color: #fff;
        }

        .empty-reels p {
          font-size: 13px;
          color: var(--text-secondary);
        }

        .empty-emoji {
          font-size: 48px;
        }

        .spinner {
          width: 32px;
          height: 32px;
          border: 3px solid rgba(255,255,255,0.08);
          border-top-color: var(--accent-indigo);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .create-reel-fab {
          position: fixed;
          top: 66px;
          right: 20px;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: var(--accent-indigo);
          color: #000;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 4px 20px rgba(99, 102, 241, 0.5);
          z-index: 50;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .create-reel-fab:hover {
          transform: scale(1.1);
          box-shadow: 0 6px 28px rgba(99, 102, 241, 0.7);
        }

        .create-reel-fab:active {
          transform: scale(0.95);
        }

        .reels-lock-item {
          display: flex;
          align-items: center;
          justify-content: center;
          background: #000000;
          box-sizing: border-box;
          padding: 24px;
        }

        .reels-lock-card {
          width: 100%;
          max-width: 400px;
          background: rgba(20, 20, 25, 0.75);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 24px;
          padding: 40px 24px;
          text-align: center;
          box-shadow: 0 10px 40px rgba(0,0,0,0.5);
          box-sizing: border-box;
        }

        .lock-icon-circle {
          width: 72px;
          height: 72px;
          border-radius: 50%;
          background: rgba(99, 102, 241, 0.1);
          border: 1.5px solid rgba(99, 102, 241, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 32px;
          margin: 0 auto 24px auto;
        }

        .reels-lock-card h3 {
          font-family: 'Outfit', sans-serif;
          font-size: 20px;
          font-weight: 700;
          color: #ffffff;
          margin: 0 0 12px 0;
          line-height: 1.3;
        }

        .reels-lock-card p {
          font-size: 13px;
          color: #a1a1aa;
          line-height: 1.6;
          margin: 0 0 32px 0;
        }

        .reels-lock-card .secondary-btn {
          width: 100%;
          padding: 14px 0;
          border-radius: 12px;
          font-family: 'Outfit', sans-serif;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: #ffffff;
          transition: all 0.2s;
          box-sizing: border-box;
        }

        .reels-lock-card .secondary-btn:hover {
          background: rgba(255, 255, 255, 0.08);
        }
      `}</style>
    </div>
  );
}
