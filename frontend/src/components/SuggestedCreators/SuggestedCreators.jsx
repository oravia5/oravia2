import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, UserCheck, Sparkles, ChevronRight } from 'lucide-react';
import { getFullMediaUrl } from '../../utils/mediaUrl';
import { useAuth } from '../../context/AuthContext';
import client from '../../api/client';

export default function SuggestedCreators({ onFollowChange }) {
  const { user, isAuthenticated, updateUserData } = useAuth();
  const navigate = useNavigate();
  const [creators, setCreators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [followingMap, setFollowingMap] = useState({});

  useEffect(() => {
    const fetchSuggested = async () => {
      try {
        const res = await client.get(`/users/suggested?t=${Date.now()}`);
        if (res.data.success) {
          setCreators(res.data.data || []);
          // Pre-populate following state
          const initialMap = {};
          (res.data.data || []).forEach(c => {
            if (user && (user.following || []).some(id => id.toString() === c._id.toString())) {
              initialMap[c._id] = true;
            }
          });
          setFollowingMap(initialMap);
        }
      } catch (err) {
        console.error('Error fetching suggested creators:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSuggested();
  }, [user]);

  const handleFollowToggle = async (creatorId, e) => {
    if (e) e.stopPropagation();
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    const isCurrentlyFollowing = !!followingMap[creatorId];
    // Optimistic UI update
    setFollowingMap(prev => ({ ...prev, [creatorId]: !isCurrentlyFollowing }));

    try {
      const endpoint = isCurrentlyFollowing ? `/users/${creatorId}/unfollow` : `/users/${creatorId}/follow`;
      const res = await client.post(endpoint);
      if (res.data.success && user) {
        let updatedFollowing = [...(user.following || [])];
        if (!isCurrentlyFollowing) {
          if (!updatedFollowing.some(id => id.toString() === creatorId.toString())) {
            updatedFollowing.push(creatorId);
          }
        } else {
          updatedFollowing = updatedFollowing.filter(id => id.toString() !== creatorId.toString());
        }
        updateUserData({ following: updatedFollowing });
        if (onFollowChange) onFollowChange(creatorId, !isCurrentlyFollowing);
      }
    } catch (err) {
      console.error('Follow toggle error:', err);
      // Revert on error
      setFollowingMap(prev => ({ ...prev, [creatorId]: isCurrentlyFollowing }));
    }
  };

  if (loading || creators.length === 0) return null;

  return (
    <div className="suggested-creators-wrapper" style={{
      margin: '16px 0',
      padding: '14px 0',
      background: 'linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.05) 100%)',
      borderTop: '1px solid rgba(255,255,255,0.06)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      borderRadius: '12px'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px 10px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Sparkles size={16} color="var(--accent-indigo)" />
          <span style={{ fontSize: '13px', fontWeight: '700', color: '#ffffff', letterSpacing: '0.02em' }}>
            Suggested Creators
          </span>
        </div>
      </div>

      {/* Horizontal Scroll Cards */}
      <div style={{
        display: 'flex',
        gap: '10px',
        overflowX: 'auto',
        padding: '0 16px 4px',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        WebkitOverflowScrolling: 'touch'
      }}>
        {creators.map((creator) => {
          const isFollowing = !!followingMap[creator._id];
          return (
            <div
              key={creator._id}
              onClick={() => navigate(`/profile/${creator.username}`)}
              style={{
                width: '135px',
                minWidth: '135px',
                background: '#121215',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '12px',
                padding: '12px 10px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'transform 0.2s ease, border-color 0.2s ease',
                position: 'relative'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              {/* Avatar */}
              <div style={{
                position: 'relative',
                width: '54px',
                height: '54px',
                borderRadius: '50%',
                padding: '2px',
                background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                marginBottom: '8px'
              }}>
                <img
                  src={getFullMediaUrl(creator.avatarUrl) || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                  alt={creator.displayName}
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    background: '#0a0a0c',
                    display: 'block'
                  }}
                />
              </div>

              {/* Name & Username */}
              <span style={{
                fontSize: '12px',
                fontWeight: '700',
                color: '#ffffff',
                width: '100%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                lineHeight: '1.2'
              }}>
                {creator.displayName}
              </span>
              <span style={{
                fontSize: '10px',
                color: '#a1a1aa',
                width: '100%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                margin: '2px 0 6px'
              }}>
                @{creator.username}
              </span>

              {/* Reason Badge */}
              <span style={{
                fontSize: '9px',
                fontWeight: '600',
                color: 'var(--accent-indigo)',
                background: 'rgba(99,102,241,0.12)',
                padding: '2px 6px',
                borderRadius: '4px',
                marginBottom: '10px',
                maxWidth: '100%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {creator.reasonText || 'Active Creator'}
              </span>

              {/* Follow Button */}
              <button
                type="button"
                onClick={(e) => handleFollowToggle(creator._id, e)}
                style={{
                  width: '100%',
                  padding: '6px 0',
                  borderRadius: '8px',
                  background: isFollowing ? 'rgba(255,255,255,0.08)' : 'var(--accent-indigo)',
                  border: isFollowing ? '1px solid rgba(255,255,255,0.15)' : 'none',
                  color: isFollowing ? '#a1a1aa' : '#ffffff',
                  fontSize: '11px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  transition: 'all 0.15s ease'
                }}
              >
                {isFollowing ? (
                  <>
                    <UserCheck size={12} />
                    <span>Following</span>
                  </>
                ) : (
                  <>
                    <UserPlus size={12} />
                    <span>Follow</span>
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
