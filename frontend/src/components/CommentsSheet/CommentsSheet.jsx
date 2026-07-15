import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Send, Trash2, Heart, ThumbsDown, Image, Smile, CornerDownRight, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import client from '../../api/client';

const EMOJI_LIST = ['😀','😂','🥰','😍','🤩','😎','🥺','😢','😡','🔥','❤️','💯','👏','🙌','💪','🎉','✨','💀','👀','🤔','😈','💖','🥳','😭','🤗','👍','👎','😊','🫶','💕'];

export default function CommentsSheet({ postId, onClose, onCommentCountChange }) {
  const { user } = useAuth();

  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  const [replyingTo, setReplyingTo] = useState(null);
  const [expandedReplies, setExpandedReplies] = useState({});

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const [selectedMedia, setSelectedMedia] = useState(null);
  const [mediaPreview, setMediaPreview] = useState('');
  const mediaInputRef = useRef(null);

  const commentsEndRef = useRef(null);
  const inputRef = useRef(null);
  const sheetRef = useRef(null);

  const getFullMediaUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('/uploads/')) return `http://127.0.0.1:5000${url}`;
    return url;
  };

  const fetchComments = useCallback(async () => {
    try {
      const res = await client.get(`/posts/${postId}/comments`);
      if (res.data.success) {
        setComments(res.data.data);
        const total = res.data.total || res.data.data.length;
        setTotalCount(total);
        if (onCommentCountChange) onCommentCountChange(total);
      }
    } catch (err) {
      console.error('Error fetching comments:', err);
    } finally {
      setLoading(false);
    }
  }, [postId, onCommentCountChange]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  useEffect(() => {
    if (comments.length > 0) {
      commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [comments]);

  // Lock body + html scroll while sheet is open (handles iOS elastic scroll)
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

    // iOS workaround: position fixed + negative top prevents elastic scroll
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
      // Restore scroll position after unlocking
      if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
        window.scrollTo(0, parseInt(prevBodyTop || '0') * -1);
      }
    };
  }, []);

  // Close on Escape
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim() && !selectedMedia) return;

    setSubmitting(true);
    try {
      const formData = new FormData();
      if (newComment.trim()) formData.append('text', newComment.trim());
      if (replyingTo) formData.append('parentComment', replyingTo._id);
      if (selectedMedia) formData.append('commentMedia', selectedMedia);

      const res = await client.post(`/posts/${postId}/comments`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data.success) {
        const newCommentData = res.data.data;

        if (replyingTo) {
          setComments(prev => prev.map(c => {
            if (c._id === replyingTo._id) {
              return { ...c, replies: [...(c.replies || []), newCommentData] };
            }
            return c;
          }));
          setExpandedReplies(prev => ({ ...prev, [replyingTo._id]: true }));
        } else {
          setComments(prev => [...prev, newCommentData]);
        }

        setNewComment('');
        setReplyingTo(null);
        setSelectedMedia(null);
        setMediaPreview('');
        setShowEmojiPicker(false);

        setTotalCount(prev => {
          const next = prev + 1;
          if (onCommentCountChange) onCommentCountChange(next);
          return next;
        });
      }
    } catch (err) {
      console.error('Error adding comment:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId, parentId = null) => {
    if (!window.confirm('Delete this comment?')) return;
    try {
      const res = await client.delete(`/comments/${commentId}`);
      if (res.data.success) {
        if (parentId) {
          setComments(prev => prev.map(c => {
            if (c._id === parentId) {
              return { ...c, replies: (c.replies || []).filter(r => r._id !== commentId) };
            }
            return c;
          }));
          setTotalCount(prev => {
            const next = prev - 1;
            if (onCommentCountChange) onCommentCountChange(next);
            return next;
          });
        } else {
          const deleted = comments.find(c => c._id === commentId);
          const deletedCount = 1 + (deleted?.replies?.length || 0);
          setComments(prev => prev.filter(c => c._id !== commentId));
          setTotalCount(prev => {
            const next = prev - deletedCount;
            if (onCommentCountChange) onCommentCountChange(next);
            return next;
          });
        }
      }
    } catch (err) {
      console.error('Error deleting comment:', err);
    }
  };

  const handleLike = async (commentId, parentId = null) => {
    try {
      const res = await client.post(`/comments/${commentId}/like`);
      if (res.data.success) {
        updateCommentReactions(commentId, parentId, res.data.data);
      }
    } catch (err) {
      console.error('Error liking comment:', err);
    }
  };

  const handleDislike = async (commentId, parentId = null) => {
    try {
      const res = await client.post(`/comments/${commentId}/dislike`);
      if (res.data.success) {
        updateCommentReactions(commentId, parentId, res.data.data);
      }
    } catch (err) {
      console.error('Error disliking comment:', err);
    }
  };

  const updateCommentReactions = (commentId, parentId, { likes, dislikes }) => {
    if (parentId) {
      setComments(prev => prev.map(c => {
        if (c._id === parentId) {
          return {
            ...c,
            replies: (c.replies || []).map(r =>
              r._id === commentId ? { ...r, likes, dislikes } : r
            ),
          };
        }
        return c;
      }));
    } else {
      setComments(prev => prev.map(c =>
        c._id === commentId ? { ...c, likes, dislikes } : c
      ));
    }
  };

  const handleMediaSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedMedia(file);
      setMediaPreview(URL.createObjectURL(file));
    }
  };

  const removeMedia = () => {
    setSelectedMedia(null);
    setMediaPreview('');
    if (mediaInputRef.current) mediaInputRef.current.value = '';
  };

  const handleEmojiClick = (emoji) => {
    setNewComment(prev => prev + emoji);
    inputRef.current?.focus();
  };

  const startReply = (comment) => {
    setReplyingTo(comment);
    inputRef.current?.focus();
  };

  const cancelReply = () => setReplyingTo(null);

  const toggleReplies = (commentId) => {
    setExpandedReplies(prev => ({ ...prev, [commentId]: !prev[commentId] }));
  };

  const formatCommentTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffMins < 60) return `${diffMins || 1}m`;
    if (diffHours < 24) return `${diffHours}h`;
    return `${diffDays}d`;
  };

  const renderComment = (comment, isReply = false, parentId = null) => {
    const isOwnComment = comment.author?._id === user?._id;
    const isLiked = (comment.likes || []).some(id => id.toString() === user?._id?.toString());
    const isDisliked = (comment.dislikes || []).some(id => id.toString() === user?._id?.toString());
    const repliesExpanded = expandedReplies[comment._id];
    const replyCount = (comment.replies || []).length;

    return (
      <div key={comment._id} className={`cs-comment ${isReply ? 'cs-reply' : ''}`}>
        <img
          src={getFullMediaUrl(comment.author?.avatarUrl) || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
          alt={comment.author?.username}
          className="cs-avatar"
        />
        <div className="cs-comment-body">
          <div className="cs-bubble">
            <div className="cs-bubble-head">
              <span className="cs-name">{comment.author?.displayName || comment.author?.username}</span>
              <span className="cs-time">{formatCommentTime(comment.createdAt)}</span>
            </div>
            {comment.text && <p className="cs-text">{comment.text}</p>}
            {comment.mediaUrl && (
              <div className="cs-media-wrap">
                <img
                  src={getFullMediaUrl(comment.mediaUrl)}
                  alt="Comment attachment"
                  className="cs-media-img"
                  onClick={() => window.open(getFullMediaUrl(comment.mediaUrl), '_blank')}
                />
              </div>
            )}
          </div>

          <div className="cs-actions">
            <button
              className={`cs-action-btn ${isLiked ? 'cs-liked' : ''}`}
              onClick={() => handleLike(comment._id, parentId)}
            >
              <Heart size={13} fill={isLiked ? 'currentColor' : 'none'} />
              <span>{(comment.likes || []).length || ''}</span>
            </button>
            <button
              className={`cs-action-btn ${isDisliked ? 'cs-disliked' : ''}`}
              onClick={() => handleDislike(comment._id, parentId)}
            >
              <ThumbsDown size={13} fill={isDisliked ? 'currentColor' : 'none'} />
              <span>{(comment.dislikes || []).length || ''}</span>
            </button>
            {!isReply && (
              <button className="cs-action-btn cs-reply-btn" onClick={() => startReply(comment)}>
                <CornerDownRight size={13} />
                <span>Reply</span>
              </button>
            )}
            {isOwnComment && (
              <button
                className="cs-action-btn cs-delete-btn"
                onClick={() => handleDelete(comment._id, parentId)}
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>

          {!isReply && replyCount > 0 && (
            <button className="cs-toggle-replies" onClick={() => toggleReplies(comment._id)}>
              {repliesExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              <span>{repliesExpanded ? 'Hide' : 'View'} {replyCount} {replyCount === 1 ? 'reply' : 'replies'}</span>
            </button>
          )}

          {!isReply && repliesExpanded && (comment.replies || []).map((reply) =>
            renderComment(reply, true, comment._id)
          )}
        </div>
      </div>
    );
  };

  const sheetContent = (
    <div className="cs-overlay" ref={sheetRef}>
      <div className="cs-backdrop" onClick={onClose} />
      <div className="cs-sheet">
        {/* Header */}
        <div className="cs-header">
          <div className="cs-header-left">
            <h3 className="cs-title">Comments</h3>
            <span className="cs-count">{totalCount}</span>
          </div>
          <button className="cs-close-btn" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="cs-body">
          {loading ? (
            <div className="cs-loading">
              <div className="cs-spinner" />
              <p>Loading comments...</p>
            </div>
          ) : comments.length === 0 ? (
            <div className="cs-empty">
              <span className="cs-empty-emoji">💬</span>
              <p>No comments yet. Start the conversation!</p>
            </div>
          ) : (
            <div className="cs-list">
              {comments.map((comment) => renderComment(comment))}
              <div ref={commentsEndRef} />
            </div>
          )}
        </div>

        {/* Reply indicator */}
        {replyingTo && (
          <div className="cs-reply-indicator">
            <CornerDownRight size={14} />
            <span>Replying to <strong>@{replyingTo.author?.username}</strong></span>
            <button className="cs-cancel-reply" onClick={cancelReply}><X size={14} /></button>
          </div>
        )}

        {/* Media preview */}
        {mediaPreview && (
          <div className="cs-media-bar">
            <img src={mediaPreview} alt="Preview" className="cs-media-thumb" />
            <button className="cs-remove-media" onClick={removeMedia}><X size={14} /></button>
          </div>
        )}

        {/* Emoji picker */}
        {showEmojiPicker && (
          <div className="cs-emoji-picker">
            {EMOJI_LIST.map((emoji, i) => (
              <button key={i} className="cs-emoji-btn" onClick={() => handleEmojiClick(emoji)}>
                {emoji}
              </button>
            ))}
          </div>
        )}

        {/* Input bar — always visible at bottom */}
        <form onSubmit={handleSubmit} className="cs-footer">
          <button
            type="button"
            className="cs-footer-icon"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            aria-label="Emoji"
          >
            <Smile size={20} className={showEmojiPicker ? 'cs-icon-active' : ''} />
          </button>
          <button
            type="button"
            className="cs-footer-icon"
            onClick={() => mediaInputRef.current?.click()}
            aria-label="Attach image"
          >
            <Image size={20} className={selectedMedia ? 'cs-icon-active' : ''} />
          </button>
          <input
            type="file"
            ref={mediaInputRef}
            onChange={handleMediaSelect}
            accept="image/*,.gif"
            style={{ display: 'none' }}
          />
          <input
            ref={inputRef}
            type="text"
            className="cs-input"
            placeholder={replyingTo ? `Reply to @${replyingTo.author?.username}...` : 'Add a comment...'}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            disabled={submitting}
          />
          <button
            type="submit"
            className="cs-send-btn"
            disabled={(!newComment.trim() && !selectedMedia) || submitting}
            aria-label="Send"
          >
            <Send size={18} />
          </button>
        </form>
      </div>

      <style>{`
        /* ── Overlay ── */
        .cs-overlay {
          position: fixed;
          inset: 0;
          height: 100dvh;
          z-index: 9999;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          overscroll-behavior: none;
        }

        .cs-backdrop {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.85);
        }

        .cs-sheet {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 500px;
          height: 85dvh;
          background: var(--bg-secondary);
          border-top-left-radius: 20px;
          border-top-right-radius: 20px;
          border-top: 1px solid var(--border-color);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          overscroll-behavior: contain;
          animation: csSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @keyframes csSlideUp {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }

        /* ── Header ── */
        .cs-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          border-bottom: 1px solid var(--border-color);
          flex-shrink: 0;
          background: var(--bg-secondary);
        }

        .cs-header-left {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .cs-title {
          font-family: 'Outfit', sans-serif;
          font-size: 16px;
          font-weight: 700;
          margin: 0;
        }

        .cs-count {
          background: rgba(255, 255, 255, 0.08);
          color: var(--text-secondary);
          font-size: 12px;
          font-weight: 600;
          padding: 2px 9px;
          border-radius: 10px;
        }

        .cs-close-btn {
          background: none;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
          border-radius: 8px;
          transition: all 0.15s;
        }

        .cs-close-btn:hover {
          color: #fff;
          background: rgba(255,255,255,0.08);
        }

        /* ── Body (scrollable) ── */
        .cs-body {
          flex: 1 1 0;
          min-height: 0;
          overflow-y: auto;
          overscroll-behavior: contain;
          padding: 16px;
        }

        .cs-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 200px;
          color: var(--text-secondary);
          gap: 12px;
        }

        .cs-spinner {
          width: 24px;
          height: 24px;
          border: 2.5px solid rgba(255, 255, 255, 0.1);
          border-top-color: var(--accent-indigo);
          border-radius: 50%;
          animation: csSpin 0.8s linear infinite;
        }

        @keyframes csSpin {
          to { transform: rotate(360deg); }
        }

        .cs-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 180px;
          color: var(--text-secondary);
        }

        .cs-empty-emoji {
          font-size: 32px;
          margin-bottom: 8px;
        }

        .cs-list {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        /* ── Comment item ── */
        .cs-comment {
          display: flex;
          align-items: flex-start;
          gap: 10px;
        }

        .cs-reply {
          margin-left: 8px;
          padding-left: 12px;
          border-left: 2px solid rgba(255, 255, 255, 0.06);
          margin-top: 12px;
        }

        .cs-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          object-fit: cover;
          border: 1.5px solid rgba(255, 255, 255, 0.1);
          flex-shrink: 0;
          margin-top: 2px;
        }

        .cs-reply .cs-avatar {
          width: 26px;
          height: 26px;
        }

        .cs-comment-body {
          flex: 1;
          min-width: 0;
        }

        .cs-bubble {
          background: rgba(255, 255, 255, 0.05);
          padding: 10px 12px;
          border-radius: 14px;
          border-top-left-radius: 4px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .cs-reply .cs-bubble {
          background: rgba(255, 255, 255, 0.03);
          padding: 8px 10px;
          border-radius: 12px;
          border-top-left-radius: 4px;
        }

        .cs-bubble-head {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .cs-name {
          font-size: 12px;
          font-weight: 700;
          color: #fff;
        }

        .cs-time {
          font-size: 10px;
          color: var(--text-muted);
        }

        .cs-text {
          font-size: 13px;
          color: var(--text-primary);
          word-break: break-word;
          line-height: 1.45;
          margin: 0;
          opacity: 0.92;
        }

        /* ── Attached media ── */
        .cs-media-wrap {
          margin-top: 6px;
          border-radius: 10px;
          overflow: hidden;
          max-width: 200px;
        }

        .cs-media-img {
          width: 100%;
          max-height: 180px;
          object-fit: cover;
          border-radius: 10px;
          cursor: pointer;
          transition: transform 0.2s ease;
        }

        .cs-media-img:hover {
          transform: scale(1.02);
        }

        /* ── Action row ── */
        .cs-actions {
          display: flex;
          align-items: center;
          gap: 2px;
          margin-top: 4px;
          padding-left: 4px;
        }

        .cs-action-btn {
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 3px;
          font-size: 11px;
          padding: 4px 8px;
          border-radius: 8px;
          transition: all 0.2s ease;
        }

        .cs-action-btn:hover {
          background: rgba(255, 255, 255, 0.06);
          color: var(--text-secondary);
        }

        .cs-action-btn.cs-liked {
          color: #ef4444;
        }

        .cs-action-btn.cs-disliked {
          color: var(--accent-indigo);
        }

        .cs-action-btn.cs-delete-btn:hover {
          color: #ef4444;
          background: rgba(239, 68, 68, 0.1);
        }

        .cs-reply-btn {
          font-weight: 600;
        }

        /* ── Toggle replies ── */
        .cs-toggle-replies {
          background: none;
          border: none;
          color: var(--accent-indigo);
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          font-weight: 600;
          padding: 6px 4px;
          margin-top: 4px;
          transition: opacity 0.2s;
        }

        .cs-toggle-replies:hover {
          opacity: 0.8;
        }

        /* ── Reply indicator ── */
        .cs-reply-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 20px;
          background: rgba(255, 143, 0, 0.08);
          border-top: 1px solid rgba(255, 143, 0, 0.15);
          font-size: 12px;
          color: var(--accent-indigo);
          flex-shrink: 0;
        }

        .cs-reply-indicator strong {
          color: #fff;
        }

        .cs-cancel-reply {
          margin-left: auto;
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 2px;
          display: flex;
          align-items: center;
          transition: color 0.2s;
        }

        .cs-cancel-reply:hover {
          color: #ef4444;
        }

        /* ── Media preview ── */
        .cs-media-bar {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 20px;
          background: var(--bg-tertiary);
          border-top: 1px solid var(--border-color);
          flex-shrink: 0;
        }

        .cs-media-thumb {
          width: 48px;
          height: 48px;
          object-fit: cover;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .cs-remove-media {
          background: rgba(239, 68, 68, 0.15);
          border: none;
          color: #ef4444;
          cursor: pointer;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .cs-remove-media:hover {
          background: rgba(239, 68, 68, 0.3);
        }

        /* ── Emoji picker ── */
        .cs-emoji-picker {
          display: flex;
          flex-wrap: wrap;
          gap: 2px;
          padding: 10px 16px;
          background: var(--bg-tertiary);
          border-top: 1px solid var(--border-color);
          max-height: 120px;
          overflow-y: auto;
          flex-shrink: 0;
        }

        .cs-emoji-btn {
          background: none;
          border: none;
          font-size: 22px;
          cursor: pointer;
          padding: 4px 6px;
          border-radius: 8px;
          transition: all 0.15s;
          line-height: 1;
        }

        .cs-emoji-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          transform: scale(1.15);
        }

        /* ── Footer input ── */
        .cs-footer {
          display: flex;
          align-items: center;
          padding: 10px 12px calc(10px + var(--safe-bottom, 0px)) 12px;
          border-top: 1px solid var(--border-color);
          background: var(--bg-secondary);
          gap: 6px;
          flex-shrink: 0;
        }

        .cs-footer-icon {
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 6px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          flex-shrink: 0;
        }

        .cs-footer-icon:hover {
          color: var(--text-primary);
          background: rgba(255, 255, 255, 0.06);
        }

        .cs-footer-icon .cs-icon-active {
          color: var(--accent-indigo);
        }

        .cs-input {
          flex: 1;
          min-width: 0;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          padding: 10px 14px;
          font-size: 13.5px;
          color: #fff;
          outline: none;
          resize: none;
          touch-action: manipulation;
          transition: border-color 0.2s;
        }

        .cs-input:focus {
          border-color: var(--accent-indigo);
        }

        .cs-input::placeholder {
          color: var(--text-muted);
        }

        .cs-input:disabled {
          opacity: 0.5;
        }

        .cs-send-btn {
          background: var(--accent-gradient);
          color: #fff;
          border: none;
          border-radius: 50%;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
          transition: all 0.2s;
          flex-shrink: 0;
        }

        .cs-send-btn:disabled {
          background: var(--bg-tertiary);
          color: var(--text-muted);
          box-shadow: none;
          cursor: not-allowed;
        }

        .cs-send-btn:not(:disabled):hover {
          transform: scale(1.08);
        }
      `}</style>
    </div>
  );

  return createPortal(sheetContent, document.body);
}
