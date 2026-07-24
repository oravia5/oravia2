import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Edit3, LogOut, Settings, X, AlertCircle, MapPin, Link2, Calendar, Ban, Briefcase, User, Phone, Share2, Copy, Check, Download } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import client from '../../api/client';
import { getFullMediaUrl } from '../../utils/mediaUrl';

export default function ProfileHeader({ profile, isOwnProfile, onProfileUpdate, refetchProfile }) {
  const { logout, updateUserData } = useAuth();
  const navigate = useNavigate();
  
  // Determine if viewing user is already followed
  const [isFollowing, setIsFollowing] = useState(profile.isFollowing || false);
  const [followerCount, setFollowerCount] = useState(profile.followerCount || 0);
  const [followLoading, setFollowLoading] = useState(false);
  const coverInputRef = useRef(null);



  // Sync local state ONLY when we're now looking at a different profile
  // (not on every profile object mutation). Previously this re-ran on
  // every profile update — including the one triggered by our own follow
  // click — which could race with the click and snap the button back to
  // "Follow" even though the follow had already succeeded.
  useEffect(() => {
    setIsFollowing(profile.isFollowing || false);
    setFollowerCount(profile.followerCount || 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile._id]);

  const handleFollowToggle = async () => {
    if (followLoading) return;
    setFollowLoading(true);
    const wasFollowing = isFollowing;
    const prevCount = followerCount;
    const newFollowing = !isFollowing;
    const newCount = isFollowing ? followerCount - 1 : followerCount + 1;

    try {
      const endpoint = isFollowing ? `/users/${profile._id}/unfollow` : `/users/${profile._id}/follow`;
      
      setIsFollowing(newFollowing);
      setFollowerCount(newCount);

      if (onProfileUpdate) {
        onProfileUpdate({
          isFollowing: newFollowing,
          followerCount: newCount,
        });
      }

      await client.post(endpoint);
    } catch (err) {
      setIsFollowing(wasFollowing);
      setFollowerCount(prevCount);

      if (onProfileUpdate) {
        onProfileUpdate({
          isFollowing: wasFollowing,
          followerCount: prevCount,
        });
      }

      const msg = err.response?.data?.message || err.message;
      if (refetchProfile) await refetchProfile();
      if (msg !== 'You are already following this user' && msg !== 'You are not following this user') {
        alert(msg);
      }
    } finally {
      setFollowLoading(false);
    }
  };

  const handleBlock = async () => {
    const confirmBlock = window.confirm(`Are you sure you want to block @${profile.username}? They will not be able to find your profile, see your posts, or interact with you.`);
    if (!confirmBlock) return;
    try {
      const res = await client.post(`/users/${profile._id}/block`);
      if (res.data.success) {
        alert(`Blocked @${profile.username} successfully.`);
        if (refetchProfile) await refetchProfile();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to block user');
    }
  };

  const handleUnblock = async () => {
    try {
      const res = await client.post(`/users/${profile._id}/unblock`);
      if (res.data.success) {
        alert(`Unblocked @${profile.username} successfully.`);
        if (refetchProfile) await refetchProfile();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to unblock user');
    }
  };

  // Direct cover banner change handler
  const handleCoverChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const formData = new FormData();
      formData.append('cover', file);
      try {
        const res = await client.put('/users/me', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        if (res.data.success) {
          onProfileUpdate(res.data.data);
          updateUserData(res.data.data);
        }
      } catch (err) {
        console.error('Error uploading cover banner:', err);
        alert('Failed to upload cover banner. Ensure format is correct and size is under 50MB.');
      } finally {
        e.target.value = ''; // Reset input
      }
    }
  };

  const isCoverVideo = (url) => {
    if (!url) return false;
    // Extract base name or look for video extension
    const cleanUrl = url.split('?')[0].toLowerCase();
    return cleanUrl.endsWith('.mp4') || cleanUrl.endsWith('.mov') || cleanUrl.endsWith('.webm') || cleanUrl.endsWith('.ogg');
  };

  return (
    <div className="profile-header-container animate-fade">
      {/* Cover Photo Banner */}
      <div className="profile-cover-banner" key={profile.coverUrl}>
        {profile.coverUrl ? (
          isCoverVideo(profile.coverUrl) ? (
            <video 
              key={profile.coverUrl}
              src={getFullMediaUrl(profile.coverUrl)} 
              className="cover-img" 
              autoPlay 
              loop 
              muted 
              playsInline 
            />
          ) : (
            <img key={profile.coverUrl} src={getFullMediaUrl(profile.coverUrl)} alt="Cover banner" className="cover-img" />
          )
        ) : (
          <div className="cover-gradient-placeholder" />
        )}
      </div>

      {isOwnProfile && (
        <button className="edit-cover-btn" onClick={() => coverInputRef.current.click()}>
          <Camera size={14} />
          <span>Change Cover</span>
        </button>
      )}
      <input 
        type="file" 
        ref={coverInputRef} 
        onChange={handleCoverChange} 
        accept="image/*,video/*" 
        style={{ display: 'none' }} 
      />

      {/* Profile Details Area */}
      <div className="profile-details-card">
        {/* Gradient transition blur panel */}
        <div className="details-blur-bg" />
        <div className="details-header-row">
          {/* Overlapping Avatar */}
          <div className="profile-avatar-container">
            <img 
              src={getFullMediaUrl(profile.avatarUrl) || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'} 
              alt={profile.username} 
              className="profile-avatar"
            />
          </div>

          {/* Edit/Follow Button */}
          <div className="header-actions">
            {isOwnProfile ? (
              <button className="btn-secondary edit-profile-btn" onClick={() => navigate('/edit-profile')}>
                <Edit3 size={16} />
                <span>Edit Profile</span>
              </button>
            ) : (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {profile.isBlocked ? (
                  <button 
                    className="follow-btn follow-inactive" 
                    onClick={handleUnblock}
                    style={{ background: '#ef4444', color: '#fff' }}
                  >
                    Unblock
                  </button>
                ) : (
                  <>
                    <button 
                      className={`follow-btn ${isFollowing ? 'following-active' : 'follow-inactive'}`} 
                      onClick={handleFollowToggle}
                      disabled={followLoading}
                      style={followLoading ? { opacity: 0.6, cursor: 'not-allowed' } : undefined}
                    >
                      {isFollowing ? 'Following' : 'Follow'}
                    </button>
                    <button 
                      className="btn-secondary share-btn"
                      onClick={() => navigate(`/profile/${profile.username}/share`)}
                      style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.15)', padding: '10px 14px', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                      aria-label="Share Profile"
                    >
                      <Share2 size={16} />
                    </button>
                    {isFollowing && profile.isFollowingBack && (
                      <button 
                        className="btn-secondary message-action-btn"
                        onClick={() => navigate('/messages', { state: { openChatUser: profile } })}
                        style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.15)', padding: '10px 14px', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                      >
                        Message
                      </button>
                    )}
                    <button 
                      className="btn-secondary block-action-btn"
                      onClick={handleBlock}
                      style={{ background: 'rgba(255,255,255,0.05)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', padding: '10px 14px', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                      aria-label="Block User"
                    >
                      <Ban size={14} />
                      <span>Block</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Name and Bio */}
        <div className="profile-bio-info">
          <h2 className="profile-display-name">{profile.displayName || profile.username}</h2>
          <span className="profile-username">@{profile.username}</span>
          {profile.bio && <p className="profile-bio-text">{profile.bio}</p>}
          
          {/* Metadata Row */}
          <div className="profile-metadata-grid">
            {profile.location && (isOwnProfile || (profile.profileVisibilityControls?.showLocation !== false)) && (
              <div className="profile-meta-item">
                <MapPin size={14} className="meta-icon" />
                <span>{profile.location}</span>
              </div>
            )}
            
            {profile.website && (isOwnProfile || (profile.profileVisibilityControls?.showWebsite !== false)) && (
              <div className="profile-meta-item">
                <Link2 size={14} className="meta-icon" />
                <a href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`} target="_blank" rel="noopener noreferrer" className="meta-link">
                  {profile.website.replace(/(^\w+:|^)\/\//, '')}
                </a>
              </div>
            )}

            {profile.createdAt && (isOwnProfile || (profile.profileVisibilityControls?.showJoinedDate !== false)) && (
              <div className="profile-meta-item">
                <Calendar size={14} className="meta-icon" />
                <span>
                  Joined {new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </span>
              </div>
            )}

            {profile.dob && (isOwnProfile || (profile.profileVisibilityControls?.showDob !== false)) && (
              <div className="profile-meta-item">
                <Calendar size={14} className="meta-icon" />
                <span>
                  Born {new Date(profile.dob).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </div>
            )}

            {profile.profession && (isOwnProfile || (profile.profileVisibilityControls?.showProfession !== false)) && (
              <div className="profile-meta-item">
                <Briefcase size={14} className="meta-icon" />
                <span>{profile.profession}</span>
              </div>
            )}

            {profile.gender && (isOwnProfile || (profile.profileVisibilityControls?.showGender !== false)) && (
              <div className="profile-meta-item">
                <User size={14} className="meta-icon" />
                <span>{profile.gender}</span>
              </div>
            )}

            {profile.phone && (isOwnProfile || (profile.profileVisibilityControls?.showPhone !== false)) && (
              <div className="profile-meta-item">
                <Phone size={14} className="meta-icon" />
                <span>{profile.phone}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .profile-header-container {
          display: flex;
          flex-direction: column;
          position: relative;
          background-color: #000000;
          overflow: hidden;
        }

        .profile-cover-banner {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: -2px;
          background-color: #111111;
          overflow: hidden;
          z-index: 1;
        }

        .cover-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 1.2s cubic-bezier(0.25, 1, 0.5, 1);
        }

        .profile-cover-banner:hover .cover-img {
          transform: scale(1.06);
        }

        .cover-gradient-placeholder {
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, #18181b 0%, #27272a 100%);
        }

        .edit-cover-btn {
          position: absolute;
          top: 96px;
          right: 14px;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: #ffffff;
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border-radius: 9999px;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1);
          z-index: 10;
        }

        .edit-cover-btn:hover {
          background: #ffffff;
          color: #000000;
          border-color: #ffffff;
          transform: scale(1.02);
        }

        .profile-details-card {
          margin-top: 140px;
          background: transparent;
          border: none;
          border-radius: 0;
          padding: 0 20px 16px 20px;
          position: relative;
          z-index: 2;
        }

        .details-blur-bg {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: -1;
          background: linear-gradient(to bottom, rgba(0, 0, 0, 0.02) 0%, rgba(0, 0, 0, 0.45) 100%);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          -webkit-mask-image: linear-gradient(to bottom, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 1) 100%);
          mask-image: linear-gradient(to bottom, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 1) 100%);
        }

        .details-header-row {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          margin-top: -38px;
          margin-bottom: 16px;
        }

        .profile-avatar-container {
          width: 90px;
          height: 90px;
          border-radius: 50%;
          border: 4px solid #000000;
          overflow: hidden;
          background-color: #000000;
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.6);
          transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
          cursor: pointer;
          position: relative;
        }

        .profile-avatar-container:hover {
          transform: scale(1.06);
          box-shadow: 0 0 20px rgba(255, 143, 0, 0.35);
          border-color: var(--accent-indigo);
        }

        .profile-avatar {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.4s ease;
        }

        .profile-avatar-container:hover .profile-avatar {
          transform: scale(1.05);
        }

        .header-actions {
          display: flex;
          gap: 8px;
          align-self: flex-end;
          padding-bottom: 2px;
        }

        .btn-secondary {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #ffffff;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.25, 0.8, 0.25, 1);
        }

        .btn-secondary:hover {
          background: #ffffff;
          color: #000000;
          border-color: #ffffff;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(255, 255, 255, 0.1);
        }

        .edit-profile-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          font-size: 12px;
          font-weight: 600;
          border-radius: 9999px;
        }

        .settings-btn, .logout-btn {
          padding: 8px 12px;
          border-radius: 9999px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .follow-btn {
          padding: 8px 24px;
          font-size: 13px;
          font-weight: 700;
          border-radius: 9999px;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.25, 0.8, 0.25, 1);
        }

        .follow-inactive {
          background: var(--accent-indigo);
          color: #ffffff;
          border: none;
        }

        .follow-inactive:hover {
          background: var(--accent-violet);
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(255, 143, 0, 0.35);
        }

        .following-active {
          background: rgba(255, 255, 255, 0.08);
          color: rgba(255, 255, 255, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .following-active:hover {
          background: rgba(255, 255, 255, 0.15);
          color: #ffffff;
          border-color: rgba(255, 255, 255, 0.35);
          transform: translateY(-2px);
        }

        .profile-bio-info {
          text-align: left;
          padding: 0 4px;
        }

        .profile-display-name {
          font-family: 'Outfit', sans-serif;
          font-size: 22px;
          font-weight: 800;
          color: #ffffff;
          margin: 0 0 4px 0;
        }

        .profile-username {
          font-size: 12px;
          color: #a1a1aa;
          display: block;
          margin-bottom: 12px;
        }

        .profile-bio-text {
          font-size: 13.5px;
          color: #e4e4e7;
          line-height: 1.6;
          margin: 0;
          white-space: pre-wrap;
          opacity: 0.95;
        }

        /* Avatar editing overlay */
        .avatar-edit-selector {
          width: 90px;
          height: 90px;
          border-radius: 50%;
          overflow: hidden;
          position: relative;
          margin: 0 auto 16px auto;
          cursor: pointer;
          border: 3px solid #ff2442;
        }

        .avatar-edit-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .avatar-edit-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          opacity: 0.8;
          transition: opacity 0.2s;
        }

        .avatar-edit-selector:hover .avatar-edit-overlay {
          opacity: 1;
        }

        .input-label {
          font-size: 12px;
          color: var(--text-secondary);
          font-weight: 600;
          margin-bottom: 6px;
          display: block;
        }

        .bio-textarea {
          resize: none;
        }

        /* Profile Metadata Styling */
        .profile-metadata-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 12px 16px;
          margin-top: 14px;
        }

        .profile-meta-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: #a1a1aa;
        }

        .meta-icon {
          color: var(--accent-indigo);
          flex-shrink: 0;
        }

        .meta-link {
          color: var(--accent-indigo);
          text-decoration: none;
          font-weight: 500;
          transition: opacity 0.2s;
        }

        .meta-link:hover {
          opacity: 0.8;
          text-decoration: underline;
        }

        /* Visibility Settings switches */
        .visibility-settings-section {
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          margin-top: 20px;
          padding-top: 16px;
          margin-bottom: 24px;
          text-align: left;
        }

        .settings-title {
          font-family: 'Outfit', sans-serif;
          font-size: 13.5px;
          font-weight: 700;
          color: #ffffff;
          margin: 0 0 4px 0;
        }

        .settings-description {
          font-size: 11px;
          color: #71717a;
          margin: 0 0 16px 0;
          line-height: 1.4;
        }

        .setting-toggle-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.04);
          font-size: 12.5px;
          color: #eeeeee;
        }

        /* Switch toggle pill styling */
        .switch {
          position: relative;
          display: inline-block;
          width: 38px;
          height: 22px;
        }

        .switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #27272a;
          transition: .3s;
          border-radius: 34px;
        }

        .slider:before {
          position: absolute;
          content: "";
          height: 16px;
          width: 16px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          transition: .3s;
          border-radius: 50%;
        }

        input:checked + .slider {
          background-color: var(--accent-indigo);
        }

        input:focus + .slider {
          box-shadow: 0 0 1px var(--accent-indigo);
        }

        input:checked + .slider:before {
          transform: translateX(16px);
        }

        /* Ambient Glow Styling */
        .profile-ambient-glow {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          overflow: hidden;
          z-index: -1;
          pointer-events: none;
          opacity: 0.7;
        }

        .ambient-media {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          filter: blur(35px) saturate(3);
          transform: scale(1.3);
          opacity: 0.85;
        }

        .ambient-gradient-placeholder {
          width: 100%;
          height: 100%;
          background: radial-gradient(circle at top, rgba(255, 143, 0, 0.15) 0%, #121212 100%);
          filter: blur(40px);
        }
      `}</style>
    </div>
  );
}
