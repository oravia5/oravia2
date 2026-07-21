import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Grid, Film, Bookmark, AlertCircle, Folder, ArrowLeft, Archive, FileText, Download, ShoppingBag, Heart, Ban, Menu, X, Settings, Share2, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';
import ProfileHeader from '../components/ProfileHeader/ProfileHeader';
import { getFullMediaUrl } from '../utils/mediaUrl';

export default function Profile() {
  const navigate = useNavigate();
  const { username } = useParams();
  const { user: currentUser, logout } = useAuth();
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const targetUsername = username || currentUser?.username;
  const isOwnProfile = !username || username.toLowerCase() === currentUser?.username?.toLowerCase();

  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [reels, setReels] = useState([]);
  const [activeTab, setActiveTab] = useState('posts'); // 'posts', 'reels', 'albums'
  const [selectedAlbum, setSelectedAlbum] = useState(null); // null, 'photos', 'videos', 'snips'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isBlockedByThem, setIsBlockedByThem] = useState(false);



  const fetchProfileData = async ({ showLoader = true } = {}) => {
    if (showLoader) setLoading(true);
    setError('');
    try {
      const profileRes = await client.get(`/users/${targetUsername}`);
      if (!profileRes.data.success) {
        throw new Error('User profile not found');
      }
      const profileInfo = profileRes.data.data;
      setProfile(profileInfo);

      const postsRes = await client.get(`/posts?author=${profileInfo._id}`);
      setPosts(postsRes.data.data);

      const reelsRes = await client.get(`/posts?author=${profileInfo._id}&type=reel`);
      setReels(reelsRes.data.data);

      // Removed own profile specific loads (saved, archived, drafts moved to settings subpages)
    } catch (err) {
      console.error(err);
      if (err.response?.status === 403 && err.response?.data?.blocked) {
        setIsBlockedByThem(true);
      } else {
        if (showLoader) setError('User profile could not be loaded.');
      }
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  const refetchProfile = async () => {
    try {
      const profileRes = await client.get(`/users/${targetUsername}`);
      if (profileRes.data.success) {
        setProfile(profileRes.data.data);
        return profileRes.data.data;
      }
    } catch (err) {
      console.error('Silent refetch failed:', err);
    }
    return null;
  };

  useEffect(() => {
    setIsBlockedByThem(false);
    fetchProfileData({ showLoader: true });
    setSelectedAlbum(null);
  }, [username, targetUsername]);

  // No setInterval / polling here (avoids extra server load with many
  // concurrent users). Refetch only fires when the user actually returns
  // to this profile tab/page — e.g. after navigating away and back, or
  // switching apps — so things like Follow/Following state stay accurate
  // without needing a manual reload.
  useEffect(() => {
    const silentRefresh = () => {
      fetchProfileData({ showLoader: false });
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') silentRefresh();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', silentRefresh);
    window.addEventListener('pageshow', silentRefresh);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', silentRefresh);
      window.removeEventListener('pageshow', silentRefresh);
    };
  }, [targetUsername]);

  useEffect(() => {
    if (profile) {
      const name = profile.displayName || profile.username;
      document.title = `${name} (@${profile.username}) | Oravia`;
    } else {
      document.title = 'Profile | Oravia';
    }
  }, [profile]);

  // Removed wishlist useEffect hook (moved to standalone settings subpages)

  const handleProfileUpdate = (updatedProfile) => {
    setProfile(prev => ({
      ...prev,
      ...updatedProfile
    }));
  };

  // Group posts by user-defined custom album name dynamically
  const customAlbumsMap = {};
  posts.forEach((post) => {
    if (post.album) {
      const name = post.album.trim();
      if (!customAlbumsMap[name]) {
        customAlbumsMap[name] = [];
      }
      customAlbumsMap[name].push(post);
    }
  });

  reels.forEach((reel) => {
    if (reel.album) {
      const name = reel.album.trim();
      if (!customAlbumsMap[name]) {
        customAlbumsMap[name] = [];
      }
      customAlbumsMap[name].push(reel);
    }
  });

  const customAlbumsList = Object.entries(customAlbumsMap).map(([name, items]) => {
    const firstItem = items[0];
    const isVideo = firstItem?.type === 'video' || firstItem?.type === 'reel';
    const coverUrl = firstItem?.mediaUrl || firstItem?.thumbnailUrl || '';
    return { name, items, coverUrl, isVideo };
  });

  return (
    <div className="profile-page-wrapper animate-fade">
      {/* Header Bar */}
      <header className="glass-header" style={{ justifyContent: 'space-between', padding: '0 16px', display: 'flex', alignItems: 'center' }}>
        {isOwnProfile ? (
          <button className="hamburger-menu-btn" onClick={() => setIsMenuOpen(true)} aria-label="Open Menu">
            <Menu size={22} />
          </button>
        ) : (
          <button className="back-btn-circle" onClick={() => navigate(-1)} aria-label="Go Back" style={{ width: '36px', height: '36px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <ArrowLeft size={18} />
          </button>
        )}
        <span className="profile-title-header" style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
          {isOwnProfile ? 'My Profile' : `@${targetUsername}`}
        </span>
        <div style={{ width: '36px' }} /> {/* Spacer to balance left icon */}
      </header>

      {/* Sliding Sidebar Menu */}
      {isOwnProfile && (
        <div className={`profile-menu-overlay ${isMenuOpen ? 'open' : ''}`} onClick={() => setIsMenuOpen(false)}>
          <div className="profile-menu-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="profile-menu-header">
              <h3>Menu</h3>
              <button className="menu-close-btn" onClick={() => setIsMenuOpen(false)} aria-label="Close Menu">
                <X size={22} />
              </button>
            </div>
            
            <nav className="profile-menu-links">
              <button className="profile-menu-item" onClick={() => { setIsMenuOpen(false); navigate(`/profile/${profile?.username || currentUser?.username}/share`); }}>
                <Share2 size={18} />
                <span>Share Profile</span>
              </button>
              
              <button className="profile-menu-item" onClick={() => { setIsMenuOpen(false); navigate('/settings'); }}>
                <Settings size={18} />
                <span>Settings</span>
              </button>
              
              <button className="profile-menu-item logout" onClick={() => { setIsMenuOpen(false); logout(); }}>
                <LogOut size={18} />
                <span>Logout</span>
              </button>
            </nav>
          </div>
        </div>
      )}

      {/* Main Info */}
      <main className="profile-page-body">
        {loading ? (
          <div className="profile-loader">
            <div className="spinner"></div>
            <p>Loading profile...</p>
          </div>
        ) : isBlockedByThem ? (
          <div className="profile-error animate-fade" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '100px 20px', textAlign: 'center', color: '#71717a', minHeight: '50vh' }}>
            <Ban size={48} style={{ marginBottom: '16px', opacity: 0.5, color: '#ef4444' }} />
            <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>Account Unavailable</h3>
            <p style={{ fontSize: '14px', margin: 0 }}>You are blocked from viewing this account's details and posts.</p>
          </div>
        ) : error ? (
          <div className="profile-error">
            <AlertCircle size={40} className="err-icon" />
            <p>{error}</p>
          </div>
        ) : (
          <>
            {profile && (
              <ProfileHeader 
                profile={profile} 
                isOwnProfile={isOwnProfile} 
                onProfileUpdate={handleProfileUpdate} 
                refetchProfile={refetchProfile}
              />
            )}

            {/* Restructured Stats Bar (above the posts grid tab configuration) */}
            {profile && (
              <div className="profile-stats-strip">
                <div className="stat-strip-item">
                  <span className="stat-num">{posts.length + reels.length}</span>
                  <span className="stat-label">Posts</span>
                </div>
                <div className="stat-strip-item clickable-stat" onClick={() => !profile.isBlocked && navigate(`/profile/${targetUsername}/followers`)}>
                  <span className="stat-num">{profile.followerCount || 0}</span>
                  <span className="stat-label">Followers</span>
                </div>
                <div className="stat-strip-item clickable-stat" onClick={() => !profile.isBlocked && navigate(`/profile/${targetUsername}/following`)}>
                  <span className="stat-num">{profile.followingCount || 0}</span>
                  <span className="stat-label">Following</span>
                </div>
              </div>
            )}
            {profile && profile.isBlocked ? (
              <div className="blocked-profile-placeholder" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', textAlign: 'center', color: '#71717a' }}>
                <Ban size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
                <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>You have blocked @{profile.username}</h3>
                <p style={{ fontSize: '14px', margin: 0 }}>Unblock this account to see their posts and snips.</p>
              </div>
            ) : (
              <>
                {/* Tab selection buttons */}
                <div className="profile-tabs-header">
              <button 
                className={`tab-toggle-btn ${activeTab === 'posts' ? 'active' : ''}`}
                onClick={() => { setActiveTab('posts'); setSelectedAlbum(null); }}
              >
                <Grid size={18} />
                <span>Posts</span>
              </button>

              <button 
                className={`tab-toggle-btn ${activeTab === 'reels' ? 'active' : ''}`}
                onClick={() => { setActiveTab('reels'); setSelectedAlbum(null); }}
              >
                <Film size={18} />
                <span>Snips</span>
              </button>

              <button 
                className={`tab-toggle-btn ${activeTab === 'albums' ? 'active' : ''}`}
                onClick={() => { setActiveTab('albums'); setSelectedAlbum(null); }}
              >
                <Folder size={18} />
                <span>Albums</span>
              </button>

              {/* Own profile library tabs removed (moved to settings) */}
            </div>

            {/* Tab contents */}
            <div className="profile-tab-contents">
              
              {/* posts tab */}
              {activeTab === 'posts' && (
                posts.length === 0 ? (
                  <div className="empty-tab-state">
                    <p>No posts shared yet</p>
                  </div>
                ) : (
                  <div className="profile-grid">
                    {posts.map((post) => (
                      <div 
                        key={post._id} 
                        className="rednote-post-card"
                        onClick={() => navigate(`/post/${post._id}`, { state: { posts, scrollToId: post._id } })}
                      >
                        <div className="card-media-wrapper">
                          {post.type === 'video' ? (
                            <video src={getFullMediaUrl(post.mediaUrl)} className="grid-media" muted playsInline />
                          ) : (
                            <img src={getFullMediaUrl(post.mediaUrl)} alt="Post grid preview" className="grid-media" />
                          )}
                          {post.type === 'video' && <div className="grid-media-indicator">🎥</div>}
                        </div>
                        <div className="card-info-wrapper">
                          <p className="card-caption">{post.caption || 'Untitled Post'}</p>
                          <div className="card-footer">
                            <div className="card-author">
                              <img 
                                src={getFullMediaUrl(profile.avatarUrl) || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'} 
                                alt={profile.username} 
                                className="card-author-avatar" 
                              />
                              <span className="card-author-name">{profile.displayName || profile.username}</span>
                            </div>
                            <div className="card-likes">
                              <span className="heart-icon">❤️</span>
                              <span className="likes-count">{post.likes?.length || 0}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}

              {/* reels (snips) tab */}
              {activeTab === 'reels' && (
                reels.length === 0 ? (
                  <div className="empty-tab-state">
                    <p>No snips uploaded yet</p>
                  </div>
                ) : (
                  <div className="profile-grid">
                    {reels.map((reel) => (
                      <div 
                        key={reel._id} 
                        className="rednote-post-card"
                        onClick={() => navigate('/snips', { state: { activeId: reel._id, reelsList: reels } })}
                      >
                        <div className="card-media-wrapper">
                          {reel.thumbnailUrl ? (
                            reel.thumbnailUrl.endsWith('.mp4') || reel.thumbnailUrl.endsWith('.mov') ? (
                              <video src={getFullMediaUrl(reel.thumbnailUrl)} className="grid-media" muted playsInline />
                            ) : (
                              <img src={getFullMediaUrl(reel.thumbnailUrl)} alt="Reel grid preview" className="grid-media" />
                            )
                          ) : (
                            <div className="grid-media-fallback">🎬</div>
                          )}
                          <div className="grid-media-indicator">▶</div>
                        </div>
                        <div className="card-info-wrapper">
                          <p className="card-caption">{reel.caption || 'Untitled Snip'}</p>
                          <div className="card-footer">
                            <div className="card-author">
                              <img 
                                src={getFullMediaUrl(profile.avatarUrl) || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'} 
                                alt={profile.username} 
                                className="card-author-avatar" 
                              />
                              <span className="card-author-name">{profile.displayName || profile.username}</span>
                            </div>
                            <div className="card-likes">
                              <span className="heart-icon">❤️</span>
                              <span className="likes-count">{reel.likes?.length || 0}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}

              {/* saved, archive, drafts tab contents removed (moved to settings) */}
              {/* albums tab */}
              {activeTab === 'albums' && (
                selectedAlbum === null ? (
                  /* List custom album folders */
                  customAlbumsList.length === 0 ? (
                    <div className="empty-tab-state">
                      <div className="empty-albums-icon">📂</div>
                      <p>No albums created yet</p>
                      <small className="empty-albums-hint">
                        Add an album name when creating a post to organize your content!
                      </small>
                    </div>
                  ) : (
                    <div className="albums-grid-container">
                      {customAlbumsList.map((album, idx) => (
                        <div key={idx} className="album-card" onClick={() => setSelectedAlbum(album.name)} style={{ animationDelay: `${idx * 0.08}s` }}>
                          {/* Stacked card illusion layers */}
                          <div className="album-stack-layer album-stack-3"></div>
                          <div className="album-stack-layer album-stack-2"></div>
                          <div className="album-cover-frame">
                            {album.coverUrl ? (
                              album.isVideo ? (
                                <video src={getFullMediaUrl(album.coverUrl)} className="album-cover-img" muted />
                              ) : (
                                <img src={getFullMediaUrl(album.coverUrl)} alt={album.name} className="album-cover-img" />
                              )
                            ) : (
                              <div className="album-cover-empty">📁</div>
                            )}
                            <div className="album-cover-gradient"></div>
                            <div className="album-item-badge">{album.items.length}</div>
                          </div>
                          <div className="album-card-meta">
                            <h5 className="album-card-title">{album.name}</h5>
                            <span className="album-card-count">{album.items.length} {album.items.length === 1 ? 'item' : 'items'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                ) : (
                  /* Inside selected custom Album folder */
                  <div className="nested-album-view animate-fade">
                    <div className="album-nested-header">
                      <button className="back-albums-btn" onClick={() => setSelectedAlbum(null)}>
                        <ArrowLeft size={16} />
                        <span>Back</span>
                      </button>
                      <div className="album-nested-title-group">
                        <h4>{selectedAlbum}</h4>
                        <span className="album-nested-count">{(customAlbumsMap[selectedAlbum] || []).length} items</span>
                      </div>
                    </div>

                    <div className="profile-grid">
                      {(customAlbumsMap[selectedAlbum] || []).map((item) => (
                        <div 
                          key={item._id} 
                          className="rednote-post-card"
                          onClick={() => {
                            if (item.type === 'reel') {
                              navigate('/snips', { 
                                state: { 
                                  activeId: item._id, 
                                  reelsList: (customAlbumsMap[selectedAlbum] || []).filter(i => i.type === 'reel') 
                                } 
                              });
                            } else {
                              navigate(`/post/${item._id}`, { state: { posts: customAlbumsMap[selectedAlbum] || [], scrollToId: item._id } });
                            }
                          }}
                        >
                          <div className="card-media-wrapper">
                            {item.type === 'video' || item.type === 'reel' ? (
                              <video src={getFullMediaUrl(item.mediaUrl || item.thumbnailUrl)} className="grid-media" muted playsInline />
                            ) : (
                              <img src={getFullMediaUrl(item.mediaUrl)} alt="Album preview" className="grid-media" />
                            )}
                            {(item.type === 'video' || item.type === 'reel') && (
                              <div className="grid-media-indicator">🎥</div>
                            )}
                          </div>
                          <div className="card-info-wrapper">
                            <p className="card-caption">{item.caption || 'Untitled Post'}</p>
                            <div className="card-footer">
                              <div className="card-author">
                                <img 
                                  src={getFullMediaUrl(profile.avatarUrl) || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'} 
                                  alt={profile.username} 
                                  className="card-author-avatar" 
                                />
                                <span className="card-author-name">{profile.displayName || profile.username}</span>
                              </div>
                              <div className="card-likes">
                                <span className="heart-icon">❤️</span>
                                <span className="likes-count">{item.likes?.length || 0}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              )}
              {/* wishlist tab contents removed (moved to settings) */}
            </div>
              </>
            )}
          </>
        )}
      </main>

      <style>{`
        .profile-page-wrapper {
          min-height: 100vh;
          background-color: #000000;
          color: #ffffff;
        }

        .profile-title-header {
          font-family: 'Outfit', sans-serif;
          font-weight: 700;
          font-size: 16px;
        }

        .profile-page-body {
          display: flex;
          flex-direction: column;
        }

        /* Stats strip layout directly above tab selectors */
        .profile-stats-strip {
          display: flex;
          align-items: center;
          justify-content: space-around;
          padding: 12px 20px;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          background-color: #050505;
          margin-bottom: 12px;
        }

        .stat-strip-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
        }

        .stat-strip-item .stat-num {
          font-family: 'Outfit', sans-serif;
          font-size: 16px;
          font-weight: 800;
          color: #ffffff;
        }

        .stat-strip-item .stat-label {
          font-size: 11px;
          color: #71717a;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .clickable-stat {
          cursor: pointer;
          transition: transform 0.2s cubic-bezier(0.25, 0.8, 0.25, 1);
          border-radius: 8px;
          padding: 4px 8px;
        }

        .clickable-stat:hover {
          transform: scale(1.05);
          background: rgba(255, 255, 255, 0.05);
        }

        .clickable-stat:hover .stat-num {
          color: var(--accent-indigo);
        }

        .profile-tabs-header {
          display: flex;
          border-bottom: 1px solid var(--border-color);
          margin-bottom: 2px;
        }

        .tab-toggle-btn {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 6px;
          background: none;
          border: none;
          color: #71717a;
          padding: 12px 0;
          cursor: pointer;
          font-size: 11px;
          font-weight: 600;
          transition: all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1);
          border-bottom: 2px solid transparent;
        }

        .tab-toggle-btn:hover {
          color: #ffffff;
        }

        .tab-toggle-btn.active {
          color: var(--accent-indigo);
          border-bottom-color: var(--accent-indigo);
        }

        .profile-tab-contents {
          padding: 8px 0;
        }

        /* Post Grid layouts */
        .profile-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          padding: 8px 12px;
        }

        /* RedNote style post card */
        .rednote-post-card {
          background-color: #121212;
          border: 1px solid #1f1f1f;
          border-radius: 12px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          cursor: pointer;
          transition: transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1), box-shadow 0.3s ease, border-color 0.3s ease;
        }

        .rednote-post-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 24px rgba(255, 143, 0, 0.15);
          border-color: rgba(255, 143, 0, 0.3);
        }

        .card-media-wrapper {
          width: 100%;
          aspect-ratio: 3 / 4;
          position: relative;
          overflow: hidden;
          background-color: #0c0c0c;
        }

        .grid-media {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.6s cubic-bezier(0.25, 1, 0.5, 1);
        }

        .rednote-post-card:hover .grid-media {
          transform: scale(1.05);
        }

        .grid-media-indicator {
          position: absolute;
          top: 8px;
          right: 8px;
          font-size: 11px;
          background: rgba(0, 0, 0, 0.65);
          backdrop-filter: blur(4px);
          padding: 3px 6px;
          border-radius: 6px;
          color: #ffffff;
        }

        .card-info-wrapper {
          padding: 10px 10px 12px 10px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .card-caption {
          font-size: 12.5px;
          font-weight: 500;
          color: #eeeeee;
          line-height: 1.5;
          margin: 0;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          text-overflow: ellipsis;
          text-align: left;
        }

        .card-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          margin-top: 2px;
        }

        .card-author {
          display: flex;
          align-items: center;
          gap: 6px;
          overflow: hidden;
          max-width: 70%;
        }

        .card-author-avatar {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          object-fit: cover;
          flex-shrink: 0;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .card-author-name {
          font-size: 11px;
          color: #a1a1aa;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .card-likes {
          display: flex;
          align-items: center;
          gap: 4px;
          color: #a1a1aa;
          font-size: 11px;
          transition: color 0.2s ease;
        }

        .rednote-post-card:hover .card-likes {
          color: var(--accent-indigo);
        }

        .heart-icon {
          font-size: 10px;
        }

        .likes-count {
          font-family: 'Outfit', sans-serif;
          font-weight: 600;
        }

        .grid-media-fallback {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          background: #0f0f0f;
        }

        .empty-tab-state {
          text-align: center;
          padding: 60px 20px;
          color: #52525b;
          font-size: 14px;
          grid-column: 1 / -1;
        }

        .profile-loader {
          text-align: center;
          padding: 100px 20px;
          color: #71717a;
        }

        .spinner {
          width: 28px;
          height: 28px;
          border: 2.5px solid rgba(255, 255, 255, 0.1);
          border-top-color: var(--accent-indigo);
          border-radius: 50%;
          margin: 0 auto 16px auto;
          animation: spin 0.8s linear infinite;
        }

        /* Albums Grid Layout */
        .albums-grid-container {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 14px;
          padding: 14px;
        }

        .empty-albums-icon {
          font-size: 36px;
          margin-bottom: 8px;
        }

        .empty-albums-hint {
          color: #52525b;
          display: block;
          margin: 6px auto 0 auto;
          text-align: center;
          font-size: 12px;
          max-width: 240px;
          line-height: 1.5;
        }

        /* Album Card */
        .album-card {
          position: relative;
          cursor: pointer;
          animation: albumFadeIn 0.4s ease both;
        }

        @keyframes albumFadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* Stacked card illusion */
        .album-stack-layer {
          position: absolute;
          border-radius: 14px;
          background: #181818;
          border: 1px solid #222;
        }

        .album-stack-3 {
          top: 6px;
          left: 6px;
          right: 6px;
          height: calc(100% - 50px);
          opacity: 0.3;
          transform: rotate(2.5deg);
          z-index: 0;
        }

        .album-stack-2 {
          top: 3px;
          left: 3px;
          right: 3px;
          height: calc(100% - 48px);
          opacity: 0.5;
          transform: rotate(-1.5deg);
          z-index: 1;
        }

        /* Main cover frame */
        .album-cover-frame {
          position: relative;
          width: 100%;
          aspect-ratio: 3 / 3.5;
          border-radius: 14px;
          overflow: hidden;
          background: #0c0c0c;
          border: 1px solid #1f1f1f;
          z-index: 2;
          transition: all 0.35s cubic-bezier(0.25, 0.8, 0.25, 1);
        }

        .album-card:hover .album-cover-frame {
          transform: translateY(-3px);
          box-shadow: 0 10px 30px rgba(255, 143, 0, 0.2);
          border-color: rgba(255, 143, 0, 0.4);
        }

        .album-cover-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.5s cubic-bezier(0.25, 1, 0.5, 1);
        }

        .album-card:hover .album-cover-img {
          transform: scale(1.06);
        }

        .album-cover-empty {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 32px;
          background: linear-gradient(135deg, #111 0%, #1a1a1a 100%);
        }

        /* Gradient overlay at bottom of cover */
        .album-cover-gradient {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 50%;
          background: linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%);
          pointer-events: none;
        }

        /* Item count badge */
        .album-item-badge {
          position: absolute;
          top: 8px;
          right: 8px;
          background: rgba(0, 0, 0, 0.65);
          backdrop-filter: blur(8px);
          color: #ffffff;
          font-family: 'Outfit', sans-serif;
          font-size: 11px;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          z-index: 3;
        }

        /* Album card meta below cover */
        .album-card-meta {
          position: relative;
          z-index: 2;
          padding: 10px 4px 4px 4px;
        }

        .album-card-title {
          font-family: 'Outfit', sans-serif;
          font-size: 13px;
          font-weight: 700;
          color: #ffffff;
          margin: 0 0 2px 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .album-card-count {
          font-size: 11px;
          color: #71717a;
        }

        /* Nested album view */
        .nested-album-view {
          padding: 10px 2px;
        }

        .album-nested-header {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 6px 14px 14px 14px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          margin-bottom: 10px;
        }

        .back-albums-btn {
          background: rgba(255, 143, 0, 0.1);
          border: 1px solid rgba(255, 143, 0, 0.25);
          color: var(--accent-indigo);
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 7px 14px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.25s;
          flex-shrink: 0;
        }

        .back-albums-btn:hover {
          background: rgba(255, 143, 0, 0.2);
          border-color: var(--accent-indigo);
        }

        .album-nested-title-group {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }

        .album-nested-title-group h4 {
          font-family: 'Outfit', sans-serif;
          font-size: 15px;
          font-weight: 700;
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .album-nested-count {
          font-size: 11px;
          color: #71717a;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        /* Hamburger button */
        .hamburger-menu-btn {
          background: transparent;
          border: none;
          color: #ffffff;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 6px;
          border-radius: 50%;
          transition: all 0.2s ease;
        }

        .hamburger-menu-btn:hover {
          background: rgba(255, 255, 255, 0.08);
        }

        /* Drawer Overlay */
        .profile-menu-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          z-index: 9999;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
        }

        .profile-menu-overlay.open {
          opacity: 1;
          pointer-events: auto;
        }

        /* Drawer Pane */
        .profile-menu-drawer {
          position: absolute;
          top: 0;
          left: -280px;
          bottom: 0;
          width: 280px;
          background: #121214;
          border-right: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 15px 0 35px rgba(0, 0, 0, 0.5);
          display: flex;
          flex-direction: column;
          transition: left 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
          box-sizing: border-box;
        }

        .profile-menu-overlay.open .profile-menu-drawer {
          left: 0;
        }

        .profile-menu-header {
          padding: 24px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .profile-menu-header h3 {
          margin: 0;
          font-size: 18px;
          font-weight: 750;
          color: #ffffff;
        }

        .menu-close-btn {
          background: transparent;
          border: none;
          color: #71717a;
          cursor: pointer;
          padding: 4px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }

        .menu-close-btn:hover {
          color: #ffffff;
          background: rgba(255, 255, 255, 0.06);
        }

        .profile-menu-links {
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .profile-menu-item {
          background: transparent;
          border: none;
          color: #a1a1aa;
          padding: 14px 16px;
          border-radius: 12px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 14px;
          width: 100%;
          text-align: left;
          box-sizing: border-box;
          transition: all 0.2s ease;
        }

        .profile-menu-item:hover {
          color: #ffffff;
          background: rgba(255, 255, 255, 0.03);
        }

        .profile-menu-item.logout {
          color: #f87171;
          margin-top: 16px;
          border-top: 1px solid rgba(255, 255, 255, 0.04);
          padding-top: 20px;
          border-radius: 0;
        }

        .profile-menu-item.logout:hover {
          background: rgba(239, 68, 68, 0.08);
          color: #ef4444;
          border-radius: 12px;
        }
      `}</style>
    </div>
  );
}
