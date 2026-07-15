import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import client from '../api/client';
import PostCard from '../components/PostCard/PostCard';

export default function PostDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  // If navigated from profile grid, we'll receive all posts and the scrollToId
  const passedPosts = location.state?.posts || null;
  const scrollToId = location.state?.scrollToId || id;

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hasScrolled, setHasScrolled] = useState(false);
  
  const postRefs = useRef({});

  const fetchPosts = async () => {
    setLoading(true);
    setError('');
    try {
      if (passedPosts && passedPosts.length > 0) {
        // We already have all posts from profile — use them directly
        setPosts(passedPosts);
      } else {
        // Fallback: fetch single post (direct URL access / share link)
        const res = await client.get(`/posts/${id}`);
        if (res.data.success) {
          // Try to get more posts from the same author for a feed experience
          const authorId = res.data.data.author?._id;
          if (authorId) {
            try {
              const feedRes = await client.get(`/posts?author=${authorId}`);
              if (feedRes.data.success && feedRes.data.data.length > 0) {
                setPosts(feedRes.data.data);
              } else {
                setPosts([res.data.data]);
              }
            } catch {
              setPosts([res.data.data]);
            }
          } else {
            setPosts([res.data.data]);
          }
        } else {
          throw new Error('Post not found');
        }
      }
    } catch (err) {
      console.error(err);
      setError('The post you are looking for does not exist or has been deleted.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [id]);

  // Scroll to the clicked post once posts are loaded
  useEffect(() => {
    if (!loading && posts.length > 0 && !hasScrolled && scrollToId) {
      const el = postRefs.current[scrollToId];
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: 'auto', block: 'start' });
          setHasScrolled(true);
        }, 100);
      } else {
        setHasScrolled(true);
      }
    }
  }, [loading, posts, hasScrolled, scrollToId]);

  const handleDeleteSuccess = (deletedId) => {
    const remaining = posts.filter(p => p._id !== deletedId);
    setPosts(remaining);
    if (remaining.length === 0) {
      navigate(-1);
    }
  };

  return (
    <div className="post-detail-page animate-fade">
      {/* Header with back navigation */}
      <header className="glass-header">
        <button className="back-nav-btn" onClick={() => navigate(-1)} aria-label="Go Back">
          <ArrowLeft size={20} />
        </button>
        <span className="detail-header-title">Posts</span>
        <div style={{ width: '20px' }}></div>
      </header>

      {/* Main scrollable posts feed */}
      <main className="detail-body">
        {loading ? (
          <div className="detail-loader">
            <div className="spinner"></div>
            <p>Loading posts...</p>
          </div>
        ) : error ? (
          <div className="detail-error">
            <AlertCircle size={40} className="err-icon" />
            <p>{error}</p>
            <button className="btn-secondary" onClick={() => navigate(-1)}>
              Go Back
            </button>
          </div>
        ) : (
          <div className="posts-feed-scroll">
            {posts.map((post) => (
              <div
                key={post._id}
                ref={(el) => { postRefs.current[post._id] = el; }}
              >
                <PostCard post={post} onDeleteSuccess={handleDeleteSuccess} />
              </div>
            ))}
          </div>
        )}
      </main>

      <style>{`
        .post-detail-page {
          width: 100%;
          min-height: 100vh;
          background-color: #000000;
        }

        .back-nav-btn {
          background: none;
          border: none;
          color: var(--text-primary);
          cursor: pointer;
          padding: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          transition: background-color 0.2s;
        }

        .back-nav-btn:active {
          background-color: var(--bg-tertiary);
        }

        .detail-header-title {
          font-family: 'Outfit', sans-serif;
          font-weight: 700;
          font-size: 16px;
        }

        .detail-body {
          padding: 0 0 80px 0;
        }

        .detail-loader, .detail-error {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 350px;
          color: var(--text-secondary);
          gap: 16px;
          text-align: center;
        }

        .detail-error p {
          max-width: 250px;
          font-size: 14px;
        }

        .err-icon {
          color: #ef4444;
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

        .posts-feed-scroll {
          display: flex;
          flex-direction: column;
        }
      `}</style>
    </div>
  );
}
