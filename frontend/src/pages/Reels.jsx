import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import client from '../api/client';
import ReelPlayer from '../components/ReelPlayer/ReelPlayer';

export default function Reels() {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);

  const containerRef = useRef(null);
  const scrollRaf = useRef(null);

  const fetchReels = async () => {
    try {
      const res = await client.get('/reels');
      if (res.data.success) {
        setReels(res.data.data);
        
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
      if (index !== activeIndex && index >= 0 && index < reels.length) {
        setActiveIndex(index);
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
          {reels.map((reel, idx) => (
            <div key={reel._id} className="reel-item">
              <ReelPlayer 
                reel={reel} 
                isActive={idx === activeIndex} 
              />
            </div>
          ))}
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
          height: calc(100vh - 65px - var(--safe-bottom));
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
          bottom: 90px;
          right: 20px;
          width: 52px;
          height: 52px;
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
      `}</style>
    </div>
  );
}
