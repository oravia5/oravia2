import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Grid, List, AlertCircle, MessageCircle, Heart } from 'lucide-react';
import client from '../api/client';
import PostCard from '../components/PostCard/PostCard';
import { getFullMediaUrl } from '../utils/mediaUrl';

export default function HashtagFeed() {
  const { tag } = useParams();
  const navigate = useNavigate();

  const [posts, setPosts] = useState([]);
  const [circleImage, setCircleImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'

  const fetchTagPosts = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await client.get(`/posts/tag/${tag}`);
      if (res.data.success) {
        setPosts(res.data.data);

        // Pick a random post's image for the header circle — changes on
        // every visit. Photos use mediaUrl directly; videos/reels use their
        // thumbnailUrl (mediaUrl there is a video file, not an image).
        const candidates = res.data.data
          .map((p) => (p.type === 'photo' ? p.mediaUrl : p.thumbnailUrl))
          .filter(Boolean);
        setCircleImage(
          candidates.length > 0
            ? candidates[Math.floor(Math.random() * candidates.length)]
            : null
        );
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load posts with this hashtag.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTagPosts();
  }, [tag]);



  return (
    <div className="tag-feed-page animate-fade">
      {/* Header bar */}
      <header className="tag-header">
        <button className="back-btn" onClick={() => navigate(-1)} aria-label="Back">
          <ArrowLeft size={20} />
        </button>
        <span className="tag-header-title">#{tag}</span>
        <div style={{ width: 36 }}></div> {/* Spacer */}
      </header>

      <main className="tag-body">
        {loading ? (
          <div className="tag-loader">
            <div className="spinner"></div>
            <p>Loading posts...</p>
          </div>
        ) : error ? (
          <div className="tag-error">
            <AlertCircle size={40} className="err-icon" />
            <p>{error}</p>
          </div>
        ) : (
          <div className="tag-container">
            {/* Top Stat Banner */}
            <div className="tag-banner-card">
              <div className="tag-icon-circle">
                {circleImage ? (
                  <img
                    src={getFullMediaUrl(circleImage)}
                    alt={`#${tag}`}
                    className="tag-icon-circle-img"
                  />
                ) : (
                  '#'
                )}
              </div>
              <div className="tag-meta-info">
                <h2>#{tag}</h2>
                <p className="posts-count-label">
                  <strong>{posts.length}</strong> {posts.length === 1 ? 'post' : 'posts'}
                </p>
              </div>
            </div>

            {/* View Mode Switcher */}
            {posts.length > 0 && (
              <div className="view-mode-selector">
                <button 
                  className={`mode-btn ${viewMode === 'grid' ? 'active' : ''}`}
                  onClick={() => setViewMode('grid')}
                  aria-label="Grid View"
                >
                  <Grid size={18} />
                </button>
                <button 
                  className={`mode-btn ${viewMode === 'list' ? 'active' : ''}`}
                  onClick={() => setViewMode('list')}
                  aria-label="List View"
                >
                  <List size={18} />
                </button>
              </div>
            )}

            {/* Posts Content */}
            {posts.length === 0 ? (
              <div className="empty-tag-state">
                <span className="empty-emoji">📌</span>
                <h3>No posts yet</h3>
                <p>Be the first to share a post with #{tag}!</p>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="tag-posts-grid">
                {posts.map((post) => (
                  <div 
                    key={post._id} 
                    className="grid-post-card" 
                    onClick={() => navigate(`/post/${post._id}`, { state: { posts, scrollToId: post._id } })}
                  >
                    {post.type === 'video' || post.type === 'reel' ? (
                      <video src={getFullMediaUrl(post.mediaUrl)} className="grid-media" muted playsInline />
                    ) : (
                      <img src={getFullMediaUrl(post.mediaUrl)} alt="" className="grid-media" loading="lazy" />
                    )}
                    <div className="grid-overlay">
                      <div className="overlay-stat">
                        <Heart size={14} fill="currentColor" />
                        <span>{post.likes?.length || 0}</span>
                      </div>
                      <div className="overlay-stat">
                        <MessageCircle size={14} fill="currentColor" />
                        <span>{post.commentCount || 0}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="tag-posts-list">
                {posts.map((post) => (
                  <PostCard key={post._id} post={post} onDeleteSuccess={fetchTagPosts} />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <style>{`
        .tag-feed-page {
          min-height: 100vh;
          background-color: #000000;
          color: #ffffff;
          padding-top: 60px;
          padding-bottom: 80px;
          font-family: 'Outfit', sans-serif;
        }

        .tag-header {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: 60px;
          background: rgba(0, 0, 0, 0.85);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          align-items: center;
          padding: 0 16px;
          z-index: 100;
          justify-content: space-between;
        }

        .back-btn {
          background: none;
          border: none;
          color: #ffffff;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 8px;
          border-radius: 50%;
          transition: background-color 0.2s;
        }

        .back-btn:hover {
          background-color: rgba(255, 255, 255, 0.08);
        }

        .tag-header-title {
          font-weight: 700;
          font-size: 16px;
        }

        .tag-body {
          max-width: 600px;
          margin: 0 auto;
          padding: 16px;
        }

        .tag-loader, .tag-error, .empty-tag-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 100px 20px;
          color: #a1a1aa;
          text-align: center;
          gap: 12px;
        }

        .err-icon {
          color: #ef4444;
        }

        .tag-banner-card {
          display: flex;
          align-items: center;
          gap: 20px;
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 20px;
          padding: 24px;
          margin-bottom: 20px;
        }

        .tag-icon-circle {
          width: 64px;
          height: 64px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 50%;
          font-size: 28px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--accent-indigo);
          box-shadow: 0 8px 24px rgba(255, 143, 0, 0.15);
          overflow: hidden;
        }

        .tag-icon-circle-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .tag-meta-info h2 {
          font-size: 20px;
          font-weight: 800;
          margin: 0 0 4px 0;
        }

        .posts-count-label {
          font-size: 13px;
          color: #a1a1aa;
        }

        .view-mode-selector {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
          margin-bottom: 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          padding-bottom: 12px;
        }

        .mode-btn {
          background: none;
          border: none;
          color: #71717a;
          cursor: pointer;
          padding: 6px;
          border-radius: 6px;
          transition: all 0.2s;
        }

        .mode-btn:hover, .mode-btn.active {
          color: #ffffff;
          background: rgba(255, 255, 255, 0.08);
        }

        .tag-posts-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 4px;
          border-radius: 12px;
          overflow: hidden;
        }

        .grid-post-card {
          aspect-ratio: 1;
          position: relative;
          cursor: pointer;
          background: #0f0f0f;
        }

        .grid-media {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .grid-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          opacity: 0;
          transition: opacity 0.2s ease-in-out;
        }

        .grid-post-card:hover .grid-overlay {
          opacity: 1;
        }

        .overlay-stat {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          font-weight: 700;
          color: #ffffff;
        }

        .tag-posts-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .empty-emoji {
          font-size: 40px;
        }

        .spinner {
          width: 32px;
          height: 32px;
          border: 3px solid rgba(255, 255, 255, 0.05);
          border-top: 3px solid var(--accent-indigo);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
