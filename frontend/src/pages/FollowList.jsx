import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Ban } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';
import { getFullMediaUrl } from '../utils/mediaUrl';



export default function FollowList() {
  const { username, type } = useParams();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [followingMap, setFollowingMap] = useState({});
  const [profileUser, setProfileUser] = useState(null);
  const [error, setError] = useState('');

  const isFollowers = type === 'followers';
  const title = isFollowers ? 'Followers' : 'Following';

  const isOwnProfile = (pUser) => currentUser && pUser && pUser._id === currentUser._id;

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const profileRes = await client.get(`/users/${username}`);
        if (profileRes.data.success) {
          const pUser = profileRes.data.data;
          setProfileUser(pUser);

          const endpoint = isFollowers
            ? `/users/${pUser._id}/followers`
            : `/users/${pUser._id}/following`;
          const listRes = await client.get(endpoint);
          if (listRes.data.success) {
            setUsers(listRes.data.data);

            let myFollowingIds = [];
            if (currentUser) {
              if (isOwnProfile(pUser)) {
                myFollowingIds = pUser.following || [];
              } else {
                const myRes = await client.get(`/users/${currentUser.username}`);
                if (myRes.data.success) {
                  myFollowingIds = myRes.data.data.following || [];
                }
              }
            }

            const map = {};
            listRes.data.data.forEach((u) => {
              map[u._id] = myFollowingIds.some((fid) => String(fid) === String(u._id));
            });
            setFollowingMap(map);
          }
        }
      } catch (err) {
        console.error('Failed to load follow list:', err);
        setError(err.response?.data?.message || 'Failed to load list. Profile may be private or unavailable.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [username, isFollowers]);

  const handleFollowToggle = async (user) => {
    if (!currentUser) return;
    const wasFollowing = followingMap[user._id];
    setFollowingMap((m) => ({ ...m, [user._id]: !wasFollowing }));

    try {
      await client.post(`/users/${user._id}/${wasFollowing ? 'unfollow' : 'follow'}`);
    } catch (err) {
      setFollowingMap((m) => ({ ...m, [user._id]: wasFollowing }));
    }
  };

  const isSelf = (user) => currentUser && user._id === currentUser._id;

  return (
    <div className="follow-list-page animate-fade">
      <header className="fl-header">
        <button className="fl-back" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} />
        </button>
        <div className="fl-header-center">
          <h4>{title}</h4>
          {profileUser && (
            <span className="fl-header-sub">@{profileUser.username}</span>
          )}
        </div>
        <div style={{ width: 36 }} />
      </header>

      <main className="fl-body">
        {loading ? (
          <div className="fl-loader">
            <Loader2 size={28} className="spin-icon" />
          </div>
        ) : error ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '100px 20px', textAlign: 'center', color: '#71717a', minHeight: '50vh' }}>
            <Ban size={48} style={{ marginBottom: '16px', opacity: 0.5, color: '#ef4444' }} />
            <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>Unavailable</h3>
            <p style={{ fontSize: '14px', margin: 0 }}>{error}</p>
          </div>
        ) : users.length === 0 ? (
          <div className="fl-empty">
            <p>{isFollowers ? 'No followers yet' : 'Not following anyone yet'}</p>
          </div>
        ) : (
          <div className="fl-list">
            {users.map((u) => (
              <div key={u._id} className="fl-user-row">
                <div
                  className="fl-user-info"
                  onClick={() => navigate(`/profile/${u.username}`)}
                >
                  <img
                    src={getFullMediaUrl(u.avatarUrl) || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                    alt={u.username}
                    className="fl-avatar"
                  />
                  <div className="fl-user-text">
                    <span className="fl-display-name">{u.displayName || u.username}</span>
                    <span className="fl-username">@{u.username}</span>
                  </div>
                </div>

                {!isSelf(u) && currentUser && (
                  <button
                    className={`fl-follow-btn ${followingMap[u._id] ? 'fl-following' : 'fl-not-following'}`}
                    onClick={() => handleFollowToggle(u)}
                  >
                    {followingMap[u._id] ? 'Following' : 'Follow'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      <style>{`
        .follow-list-page {
          background: #000;
          color: #fff;
          padding-top: 60px;
          padding-bottom: 20px;
        }

        .fl-header {
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
          justify-content: space-between;
          padding: 0 16px;
          z-index: 10;
        }

        .fl-back {
          background: none;
          border: none;
          color: #fff;
          cursor: pointer;
          padding: 6px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s;
        }

        .fl-back:hover {
          background: rgba(255, 255, 255, 0.08);
        }

        .fl-header-center {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .fl-header-center h4 {
          font-family: 'Outfit', sans-serif;
          font-size: 16px;
          font-weight: 700;
          margin: 0;
        }

        .fl-header-sub {
          font-size: 11px;
          color: #71717a;
        }

        .fl-body {
          padding: 0;
        }

        .fl-loader {
          display: flex;
          justify-content: center;
          padding: 60px 0;
        }

        .spin-icon {
          color: var(--accent-indigo);
          animation: flSpin 0.8s linear infinite;
        }

        @keyframes flSpin {
          to { transform: rotate(360deg); }
        }

        .fl-empty {
          text-align: center;
          padding: 60px 20px;
          color: #52525b;
          font-size: 14px;
        }

        .fl-list {
          display: flex;
          flex-direction: column;
        }

        .fl-user-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 20px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.04);
          transition: background 0.15s;
        }

        .fl-user-row:hover {
          background: rgba(255, 255, 255, 0.03);
        }

        .fl-user-row:last-child {
          border-bottom: none;
        }

        .fl-user-info {
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          flex: 1;
          min-width: 0;
        }

        .fl-avatar {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          object-fit: cover;
          flex-shrink: 0;
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .fl-user-text {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .fl-display-name {
          font-size: 14px;
          font-weight: 600;
          color: #fff;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .fl-username {
          font-size: 12px;
          color: #71717a;
        }

        .fl-follow-btn {
          padding: 7px 20px;
          font-size: 12px;
          font-weight: 700;
          border-radius: 9999px;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1);
          flex-shrink: 0;
        }

        .fl-not-following {
          background: var(--accent-indigo);
          color: #fff;
          border: none;
        }

        .fl-not-following:hover {
          background: var(--accent-violet);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(255, 143, 0, 0.3);
        }

        .fl-following {
          background: rgba(255, 255, 255, 0.08);
          color: rgba(255, 255, 255, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .fl-following:hover {
          background: rgba(255, 255, 255, 0.15);
          color: #fff;
          border-color: rgba(255, 255, 255, 0.35);
        }
      `}</style>
    </div>
  );
}
