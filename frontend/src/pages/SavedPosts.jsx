import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bookmark, Loader2 } from 'lucide-react';
import client from '../api/client';
import { getFullMediaUrl } from '../utils/mediaUrl';

export default function SavedPosts() {
  const navigate = useNavigate();
  const [savedPosts, setSavedPosts] = useState([]);
  const [loading, setLoading] = useState(true);



  const fetchSaved = async () => {
    setLoading(true);
    try {
      const res = await client.get('/posts?saved=true');
      if (res.data.success) {
        setSavedPosts(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching saved posts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSaved();
  }, []);

  return (
    <div className="settings-subpage">
      <header className="subpage-header">
        <button className="back-btn" onClick={() => navigate('/settings')} aria-label="Back">
          <ArrowLeft size={20} />
        </button>
        <span className="subpage-header-title">Saved Posts</span>
        <div style={{ width: '36px' }} /> {/* Spacer */}
      </header>

      <main className="subpage-body">
        {loading ? (
          <div className="subpage-loader">
            <Loader2 className="spinner animate-spin" size={32} />
            <p>Loading saved posts...</p>
          </div>
        ) : savedPosts.length === 0 ? (
          <div className="subpage-empty-state">
            <Bookmark size={48} className="empty-icon text-muted" />
            <h3>No Saved Posts</h3>
            <p>Posts you bookmark will appear here.</p>
          </div>
        ) : (
          <div className="posts-preview-grid">
            {savedPosts.map((post) => (
              <div 
                key={post._id} 
                className="post-preview-card"
                onClick={() => navigate(`/post/${post._id}`, { state: { posts: savedPosts, scrollToId: post._id } })}
              >
                <div className="preview-media-wrapper">
                  {post.type === 'video' ? (
                    <video src={getFullMediaUrl(post.mediaUrl)} className="preview-media" muted playsInline />
                  ) : (
                    <img src={getFullMediaUrl(post.mediaUrl)} alt="" className="preview-media" />
                  )}
                  {post.type === 'video' && <div className="preview-media-indicator">🎥</div>}
                </div>
                <div className="preview-info">
                  <p className="preview-caption">{post.caption || 'Untitled Post'}</p>
                  <div className="preview-footer">
                    <span className="preview-author">@{post.author?.username}</span>
                    <span className="preview-likes">❤️ {post.likes?.length || 0}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <style>{`
        .settings-subpage {
          min-height: 100vh;
          background-color: #000000;
          color: #ffffff;
          padding-top: 60px;
          padding-bottom: 20px;
          font-family: 'Outfit', sans-serif;
        }

        .subpage-header {
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

        .subpage-header-title {
          font-weight: 700;
          font-size: 16px;
        }

        .subpage-body {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px 16px;
        }

        .subpage-loader {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 100px 20px;
          color: #71717a;
          gap: 15px;
        }

        .spinner {
          color: var(--accent-indigo);
        }

        .animate-spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .subpage-empty-state {
          text-align: center;
          padding: 100px 20px;
          color: #71717a;
        }

        .empty-icon {
          margin-bottom: 16px;
          opacity: 0.6;
        }

        .subpage-empty-state h3 {
          font-size: 18px;
          color: #ffffff;
          margin-bottom: 8px;
          font-weight: 600;
        }

        .subpage-empty-state p {
          font-size: 14px;
          margin: 0;
        }

        .posts-preview-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 16px;
          width: 100%;
        }

        .post-preview-card {
          background: #18181b;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          overflow: hidden;
          cursor: pointer;
          transition: transform 0.2s, border-color 0.2s;
          display: flex;
          flex-direction: column;
        }

        .post-preview-card:hover {
          transform: translateY(-2px);
          border-color: var(--accent-indigo);
        }

        .preview-media-wrapper {
          position: relative;
          width: 100%;
          height: 140px;
          background: #09090b;
        }

        .preview-media {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .preview-media-indicator {
          position: absolute;
          bottom: 6px;
          right: 6px;
          background: rgba(0, 0, 0, 0.6);
          border-radius: 4px;
          padding: 2px 6px;
          font-size: 10px;
        }

        .preview-info {
          padding: 10px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          text-align: left;
        }

        .preview-caption {
          font-size: 12px;
          color: #e4e4e7;
          margin: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          height: 36px;
        }

        .preview-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 11px;
          color: #71717a;
          margin-top: 2px;
        }

        .preview-author {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 70%;
        }
      `}</style>
    </div>
  );
}
