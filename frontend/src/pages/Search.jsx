import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Users, FileText, Hash, MapPin, Grid, List } from 'lucide-react';
import client from '../api/client';
import PostCard from '../components/PostCard/PostCard';
import { getFullMediaUrl } from '../utils/mediaUrl';

export default function Search() {
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [hashtags, setHashtags] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [activeTab, setActiveTab] = useState('users'); // 'users' | 'posts' | 'hashtags'

  const handleSearchChange = async (e) => {
    const val = e.target.value;
    setQuery(val);

    if (!val.trim()) {
      setUsers([]);
      setPosts([]);
      setHashtags([]);
      setSearched(false);
      return;
    }

    setLoading(true);
    try {
      // Execute both search requests in parallel
      const [usersRes, postsRes] = await Promise.all([
        client.get(`/users/search?q=${encodeURIComponent(val)}`),
        client.get(`/posts/search-posts?q=${encodeURIComponent(val)}`)
      ]);

      if (usersRes.data.success) {
        setUsers(usersRes.data.data);
      }
      if (postsRes.data.success) {
        setPosts(postsRes.data.data.posts);
        setHashtags(postsRes.data.data.hashtags);
      }
      setSearched(true);
    } catch (err) {
      console.error('Failed search operations:', err.message);
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="search-page-container">
      <header className="search-header-bar">
        <h3>Explore Oravia</h3>
      </header>

      {/* Search Input field */}
      <div className="search-input-wrapper">
        <div className="search-input-field">
          <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            type="text"
            placeholder="Search users, posts, hashtags..."
            value={query}
            onChange={handleSearchChange}
            className="search-input"
            autoFocus
          />
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="search-tabs-container">
        <button 
          className={`search-tab-btn ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          <Users size={16} />
          <span>Accounts</span>
        </button>
        <button 
          className={`search-tab-btn ${activeTab === 'posts' ? 'active' : ''}`}
          onClick={() => setActiveTab('posts')}
        >
          <FileText size={16} />
          <span>Posts</span>
        </button>
        <button 
          className={`search-tab-btn ${activeTab === 'hashtags' ? 'active' : ''}`}
          onClick={() => setActiveTab('hashtags')}
        >
          <Hash size={16} />
          <span>Hashtags</span>
        </button>
      </div>

      {/* Results Main List */}
      <main className="search-results-list">
        {loading && (
          <div className="search-loader">
            <div className="search-spinner"></div>
            <span>Searching database...</span>
          </div>
        )}

        {!loading && searched && (
          <div className="results-wrapper animate-fade">
            {/* USERS TAB VIEW */}
            {activeTab === 'users' && (
              users.length > 0 ? (
                <div className="results-container">
                  {users.map((item) => (
                    <Link to={`/profile/${item.username}`} key={item._id} className="search-result-item">
                      <img
                        src={getFullMediaUrl(item.avatarUrl) || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                        alt={item.username}
                        className="result-avatar"
                      />
                      <div className="result-info">
                        <div className="result-name-row">
                          <span className="result-displayname">{item.displayName || item.username}</span>
                          <span className="result-username">@{item.username}</span>
                        </div>
                        {item.bio && <p className="result-bio-preview">{item.bio}</p>}
                      </div>
                      {item.isMutual && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            navigate('/messages', { state: { openChatUser: item } });
                          }}
                          style={{
                            background: 'var(--accent-indigo)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '6px 12px',
                            fontSize: '12px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            marginRight: '12px',
                            zIndex: 10
                          }}
                        >
                          Message
                        </button>
                      )}
                      <div className="chevron-right-arrow">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="9 18 15 12 9 6"></polyline>
                        </svg>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="empty-results-box">
                  <div className="empty-emoji">👤</div>
                  <h4>No accounts found</h4>
                  <p>No user profiles matched "{query}"</p>
                </div>
              )
            )}

            {/* POSTS TAB VIEW */}
            {activeTab === 'posts' && (
              posts.length > 0 ? (
                <div className="search-posts-list">
                  {posts.map((post) => (
                    <PostCard key={post._id} post={post} onDeleteSuccess={() => handleSearchChange({ target: { value: query } })} />
                  ))}
                </div>
              ) : (
                <div className="empty-results-box">
                  <div className="empty-emoji">📸</div>
                  <h4>No posts found</h4>
                  <p>No post captions or locations matched "{query}"</p>
                </div>
              )
            )}

            {/* HASHTAGS TAB VIEW */}
            {activeTab === 'hashtags' && (
              hashtags.length > 0 ? (
                <div className="results-container">
                  {hashtags.map((tag) => (
                    <Link to={`/tag/${tag.name}`} key={tag.name} className="search-result-item hashtag-item">
                      <div className="tag-avatar-circle">
                        <Hash size={18} />
                      </div>
                      <div className="result-info">
                        <div className="result-name-row">
                          <span className="result-displayname">#{tag.name}</span>
                          <span className="result-username">{tag.count} {tag.count === 1 ? 'post' : 'posts'}</span>
                        </div>
                      </div>
                      <div className="chevron-right-arrow">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="9 18 15 12 9 6"></polyline>
                        </svg>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="empty-results-box">
                  <div className="empty-emoji">🏷️</div>
                  <h4>No hashtags found</h4>
                  <p>No hashtags matched "#{query}"</p>
                </div>
              )
            )}
          </div>
        )}

        {!searched && !query.trim() && (
          <div className="search-prompt-box">
            <div className="search-prompt-emoji">✨</div>
            <h4>Explore Connections</h4>
            <p>Search accounts, browse posts matching words/locations, or find trendy hashtags.</p>
          </div>
        )}
      </main>

      <style>{`
        .search-page-container {
          width: 100%;
          min-height: 100vh;
          background-color: #000000;
          color: #ffffff;
          padding-top: 60px;
          padding-bottom: 80px;
          font-family: 'Outfit', sans-serif;
        }

        .search-header-bar {
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
        }

        .search-header-bar h3 {
          font-size: 18px;
          font-weight: 700;
        }

        .search-input-wrapper {
          padding: 16px 16px 8px 16px;
        }

        .search-input-field {
          position: relative;
          display: flex;
          align-items: center;
          width: 100%;
        }

        .search-icon {
          position: absolute;
          left: 14px;
          width: 18px;
          height: 18px;
          color: #71717a;
          pointer-events: none;
        }

        .search-input {
          width: 100%;
          background-color: #0c0c0c;
          border: 1px solid #1c1c1e;
          border-radius: 14px;
          padding: 12px 14px 12px 42px;
          font-size: 14px;
          color: #ffffff;
          transition: all 0.25s;
          font-family: 'Inter', sans-serif;
        }

        .search-input:focus {
          outline: none;
          border-color: var(--accent-indigo);
          background-color: #121212;
          box-shadow: 0 0 0 1px var(--accent-indigo);
        }

        .search-tabs-container {
          display: flex;
          padding: 4px 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          gap: 4px;
        }

        .search-tab-btn {
          flex: 1;
          background: none;
          border: none;
          color: #71717a;
          padding: 10px 4px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          border-bottom: 2px solid transparent;
          transition: all 0.2s;
        }

        .search-tab-btn:hover {
          color: #ffffff;
        }

        .search-tab-btn.active {
          color: var(--accent-indigo);
          border-bottom-color: var(--accent-indigo);
        }

        .search-results-list {
          padding: 16px;
          max-width: 600px;
          margin: 0 auto;
        }

        .search-result-item {
          display: flex;
          align-items: center;
          padding: 12px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          text-decoration: none;
          color: inherit;
          animation: slideUp 0.2s ease-out;
        }

        .search-result-item:last-child {
          border-bottom: none;
        }

        .result-avatar {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          object-fit: cover;
          margin-right: 14px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .tag-avatar-circle {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: var(--accent-indigo);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: 14px;
        }

        .result-info {
          flex: 1;
          min-width: 0;
        }

        .result-name-row {
          display: flex;
          flex-direction: column;
          margin-bottom: 2px;
        }

        .result-displayname {
          font-size: 14px;
          font-weight: 600;
          color: #ffffff;
        }

        .result-username {
          font-size: 12px;
          color: #71717a;
        }

        .result-bio-preview {
          font-size: 12px;
          color: #a1a1aa;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .chevron-right-arrow {
          width: 16px;
          height: 16px;
          color: #52525b;
          margin-left: 12px;
        }

        .search-loader {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 0;
          color: #71717a;
          gap: 12px;
          font-size: 13px;
        }

        .search-spinner {
          width: 28px;
          height: 28px;
          border: 2px solid rgba(255, 255, 255, 0.05);
          border-top-color: var(--accent-indigo);
          border-radius: 50%;
          animation: searchSpin 0.8s linear infinite;
        }

        .empty-results-box, .search-prompt-box {
          text-align: center;
          padding: 60px 20px;
          color: #71717a;
        }

        .empty-emoji, .search-prompt-emoji {
          font-size: 36px;
          margin-bottom: 16px;
        }

        h4 {
          font-size: 15px;
          font-weight: 600;
          color: #ffffff;
          margin-bottom: 6px;
        }

        .empty-results-box p, .search-prompt-box p {
          font-size: 13px;
          line-height: 1.5;
          max-width: 260px;
          margin: 0 auto;
        }

        .search-posts-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        @keyframes searchSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .animate-fade {
          animation: fadeIn 0.25s ease-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
