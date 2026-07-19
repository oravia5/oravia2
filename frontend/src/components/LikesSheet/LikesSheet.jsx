import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { X, Heart, ThumbsDown, Loader2 } from 'lucide-react';
import client from '../../api/client';
import { getFullMediaUrl } from '../../utils/mediaUrl';

export default function LikesSheet({ postId, initialTab = 'likes', likeCount = 0, dislikeCount = 0, onClose }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(initialTab);

  const [likes, setLikes] = useState([]);
  const [dislikes, setDislikes] = useState([]);
  const [loadingLikes, setLoadingLikes] = useState(true);
  const [loadingDislikes, setLoadingDislikes] = useState(true);
  const [likesLoaded, setLikesLoaded] = useState(false);
  const [dislikesLoaded, setDislikesLoaded] = useState(false);

  // Lock body scroll while sheet is open (same pattern as CommentsSheet)
  useEffect(() => {
    const body = document.body;
    const html = document.documentElement;
    const prevBody = body.style.overflow;
    const prevHtml = html.style.overflow;
    const prevBodyPos = body.style.position;
    const prevBodyTop = body.style.top;
    const prevBodyWidth = body.style.width;

    body.style.overflow = 'hidden';
    html.style.overflow = 'hidden';

    if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
      body.style.position = 'fixed';
      body.style.top = `-${window.scrollY}px`;
      body.style.width = '100%';
    }

    return () => {
      body.style.overflow = prevBody;
      html.style.overflow = prevHtml;
      body.style.position = prevBodyPos;
      body.style.top = prevBodyTop;
      body.style.width = prevBodyWidth;
      if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
        window.scrollTo(0, parseInt(prevBodyTop || '0') * -1);
      }
    };
  }, []);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const fetchLikes = useCallback(async () => {
    setLoadingLikes(true);
    try {
      const res = await client.get(`/posts/${postId}/likes?limit=100`);
      if (res.data.success) {
        setLikes(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching likes list:', err);
    } finally {
      setLoadingLikes(false);
      setLikesLoaded(true);
    }
  }, [postId]);

  const fetchDislikes = useCallback(async () => {
    setLoadingDislikes(true);
    try {
      const res = await client.get(`/posts/${postId}/dislikes?limit=100`);
      if (res.data.success) {
        setDislikes(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching dislikes list:', err);
    } finally {
      setLoadingDislikes(false);
      setDislikesLoaded(true);
    }
  }, [postId]);

  // Lazy-load each tab's data only the first time it's viewed
  useEffect(() => {
    if (activeTab === 'likes' && !likesLoaded) fetchLikes();
    if (activeTab === 'dislikes' && !dislikesLoaded) fetchDislikes();
  }, [activeTab, likesLoaded, dislikesLoaded, fetchLikes, fetchDislikes]);

  const goToProfile = (username) => {
    onClose();
    navigate(`/profile/${username}`);
  };

  const activeList = activeTab === 'likes' ? likes : dislikes;
  const activeLoading = activeTab === 'likes' ? loadingLikes : loadingDislikes;

  const sheetContent = (
    <div className="likes-sheet-overlay" onClick={onClose}>
      <div className="likes-sheet-card" onClick={(e) => e.stopPropagation()}>
        <div className="likes-sheet-drag-handle" />

        <div className="likes-sheet-header">
          <button
            className={`likes-tab-btn ${activeTab === 'likes' ? 'active' : ''}`}
            onClick={() => setActiveTab('likes')}
          >
            <Heart size={15} fill={activeTab === 'likes' ? 'currentColor' : 'none'} />
            <span>Likes {likeCount > 0 ? `(${likeCount})` : ''}</span>
          </button>
          <button
            className={`likes-tab-btn ${activeTab === 'dislikes' ? 'active' : ''}`}
            onClick={() => setActiveTab('dislikes')}
          >
            <ThumbsDown size={15} fill={activeTab === 'dislikes' ? 'currentColor' : 'none'} />
            <span>Dislikes {dislikeCount > 0 ? `(${dislikeCount})` : ''}</span>
          </button>
          <button className="likes-sheet-close" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="likes-sheet-body">
          {activeLoading ? (
            <div className="likes-sheet-loader">
              <Loader2 size={26} className="spin-icon" />
            </div>
          ) : activeList.length === 0 ? (
            <div className="likes-sheet-empty">
              {activeTab === 'likes' ? (
                <>
                  <Heart size={36} />
                  <p>No likes yet</p>
                </>
              ) : (
                <>
                  <ThumbsDown size={36} />
                  <p>No dislikes yet</p>
                </>
              )}
            </div>
          ) : (
            <div className="likes-sheet-list">
              {activeList.map((u) => (
                <div
                  key={u._id}
                  className="likes-user-row"
                  onClick={() => goToProfile(u.username)}
                >
                  <img
                    src={getFullMediaUrl(u.avatarUrl) || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                    alt={u.username}
                    className="likes-user-avatar"
                  />
                  <div className="likes-user-text">
                    <span className="likes-user-display">{u.displayName || u.username}</span>
                    <span className="likes-user-username">@{u.username}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        .likes-sheet-overlay {
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

        .likes-sheet-card {
          width: 100%;
          max-width: 500px;
          max-height: 70vh;
          background: #0a0a0a;
          border-top: 1px solid #222222;
          border-top-left-radius: 24px;
          border-top-right-radius: 24px;
          display: flex;
          flex-direction: column;
          box-shadow: 0 -10px 30px rgba(0, 0, 0, 0.9);
          animation: likesSlideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        @keyframes likesSlideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }

        .likes-sheet-drag-handle {
          width: 36px;
          height: 4px;
          background: #333333;
          border-radius: 2px;
          margin: 12px auto 4px auto;
          flex-shrink: 0;
        }

        .likes-sheet-header {
          display: flex;
          align-items: center;
          padding: 8px 12px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          flex-shrink: 0;
          gap: 4px;
        }

        .likes-tab-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          background: none;
          border: none;
          color: #71717a;
          font-size: 13px;
          font-weight: 600;
          font-family: 'Outfit', sans-serif;
          padding: 10px 8px;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .likes-tab-btn.active {
          color: #ffffff;
          background: rgba(255, 255, 255, 0.06);
        }

        .likes-sheet-close {
          background: none;
          border: none;
          color: #71717a;
          cursor: pointer;
          padding: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          flex-shrink: 0;
          transition: background 0.2s;
        }

        .likes-sheet-close:hover {
          background: rgba(255, 255, 255, 0.08);
          color: #fff;
        }

        .likes-sheet-body {
          overflow-y: auto;
          flex: 1;
          -webkit-overflow-scrolling: touch;
        }

        .likes-sheet-loader {
          display: flex;
          justify-content: center;
          padding: 50px 0;
        }

        .spin-icon {
          color: var(--accent-indigo);
          animation: likesSpin 0.8s linear infinite;
        }

        @keyframes likesSpin {
          to { transform: rotate(360deg); }
        }

        .likes-sheet-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          color: #52525b;
          gap: 10px;
        }

        .likes-sheet-empty p {
          font-size: 13px;
          margin: 0;
        }

        .likes-sheet-list {
          display: flex;
          flex-direction: column;
          padding-bottom: 12px;
        }

        .likes-user-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 20px;
          cursor: pointer;
          transition: background 0.15s;
        }

        .likes-user-row:hover {
          background: rgba(255, 255, 255, 0.03);
        }

        .likes-user-avatar {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          object-fit: cover;
          flex-shrink: 0;
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .likes-user-text {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .likes-user-display {
          font-size: 14px;
          font-weight: 600;
          color: #fff;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .likes-user-username {
          font-size: 12px;
          color: #71717a;
        }
      `}</style>
    </div>
  );

  return createPortal(sheetContent, document.body);
}
