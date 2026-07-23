import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Search, X } from 'lucide-react';
import client from '../api/client';
import ChatWindow from '../components/ChatWindow/ChatWindow';
import { useAuth } from '../context/AuthContext';

export default function Messages() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user: currentUser } = useAuth();

  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedChat, setSelectedChat] = useState(null);
  const openedRef = useRef(false);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await client.get('/chat/conversations');
      if (res.data.success) {
        setConversations(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
    // Poll conversations list every 4 seconds to catch new incoming messages in real-time
    const interval = setInterval(fetchConversations, 4000);
    return () => clearInterval(interval);
  }, [fetchConversations]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await client.get(
          `/chat/users/search?q=${encodeURIComponent(searchQuery)}`
        );
        if (res.data.success) setSearchResults(res.data.data);
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const openChat = useCallback(async (channelId, user) => {
    setSelectedChat({ channelId, user });
    setSearchQuery('');
    setSearchResults([]);

    // Register & mark read in backend
    try {
      await client.post('/chat/conversations', { otherUserId: user._id });
      await client.put('/chat/mark-read', { channelId });
    } catch (err) {
      console.error('Failed to register/mark conversation read:', err);
    }
  }, []);

  useEffect(() => {
    if (location.state?.openChatUser && currentUser && !openedRef.current) {
      openedRef.current = true;
      const targetUser = location.state.openChatUser;
      const ids = [currentUser._id.toString(), targetUser._id.toString()].sort();
      const channelId = `dm:${ids[0]}:${ids[1]}`;
      openChat(channelId, targetUser);
      navigate(window.location.pathname, { replace: true, state: {} });
    }
  }, [location.state, currentUser, openChat, navigate]);

  if (selectedChat) {
    return (
      <div className="messages-page-container">
        <ChatWindow
          channelId={selectedChat.channelId}
          otherUser={selectedChat.user}
          onBack={() => {
            setSelectedChat(null);
            // Refresh conversations list when returning from a chat
            fetchConversations();
          }}
        />
        <style>{msgPageStyles}</style>
      </div>
    );
  }

  return (
    <div className="messages-page-container animate-fade">
      <header className="msg-page-header">
        <button className="msg-back-btn" onClick={() => navigate(-1)} aria-label="Go Back">
          <ArrowLeft size={20} />
        </button>
        <div className="header-title-box">
          <h4>Messages</h4>
        </div>
        <div style={{ width: 36 }} />
      </header>

      <main className="msg-page-body">
        <div className="inbox-view">
          <div className="inbox-search">
            <div className="search-field">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                placeholder="Search people to message..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button className="clear-search" onClick={() => setSearchQuery('')}>
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {searchQuery.trim() ? (
            <div className="chats-list">
              {searching && (
                <div className="loading-row">
                  <div className="spinner-small" />
                  <span>Searching...</span>
                </div>
              )}
              {!searching && searchResults.length === 0 && (
                <div className="empty-row">No users found</div>
              )}
              {searchResults.map((u) => (
                <div
                  key={u._id}
                  className="chat-row-item"
                  onClick={() => openChat(u.channelId, u)}
                >
                  <img src={u.avatarUrl} alt="" className="chat-avatar" />
                  <div className="chat-content">
                    <span className="chat-name">{u.displayName || u.username}</span>
                    <span className="chat-subtext">@{u.username}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="chats-list">
              {loading && (
                <div className="loading-row">
                  <div className="spinner-small" />
                  <span>Loading...</span>
                </div>
              )}
              {!loading && conversations.length === 0 && (
                <div className="empty-state">
                  <div className="empty-icon">💬</div>
                  <h3>No conversations yet</h3>
                  <p>Follow people to start messaging them</p>
                </div>
              )}
              {conversations.map((conv) => (
                <div
                  key={conv.channelId}
                  className={`chat-row-item ${conv.isUnread ? 'unread-item' : ''}`}
                  onClick={() => openChat(conv.channelId, conv.user)}
                >
                  <div className="avatar-wrap" style={{ position: 'relative' }}>
                    <img src={conv.user.avatarUrl} alt="" className="chat-avatar" />
                    {conv.isUnread && <span className="unread-dot" />}
                  </div>
                  <div className="chat-content">
                    <span className="chat-name" style={{ fontWeight: conv.isUnread ? 700 : 500 }}>
                      {conv.user.displayName || conv.user.username}
                    </span>
                    <span className="chat-subtext" style={{ color: conv.isUnread ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: conv.isUnread ? 600 : 400 }}>
                      {conv.lastMessageText
                        ? conv.lastMessageText
                        : `@${conv.user.username}`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <style>{msgPageStyles}</style>
    </div>
  );
}

const msgPageStyles = `
  .unread-dot {
    position: absolute;
    top: 0;
    right: 0;
    width: 12px;
    height: 12px;
    background: #ef4444;
    border-radius: 50%;
    border: 2px solid #000;
  }
  .unread-item {
    background: rgba(99, 102, 241, 0.05) !important;
  }
  .messages-page-container {
    min-height: 100vh;
    background: #000;
    color: #fff;
    padding-top: 60px;
    padding-bottom: 80px;
  }
  .msg-page-header {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 60px;
    background: rgba(0,0,0,0.85);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border-bottom: 1px solid rgba(255,255,255,0.08);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 16px;
    z-index: 100;
  }
  .msg-back-btn {
    background: none;
    border: none;
    color: #fff;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 6px;
    border-radius: 50%;
    transition: background 0.2s;
  }
  .msg-back-btn:hover { background: rgba(255,255,255,0.08); }
  .header-title-box { display: flex; align-items: center; gap: 8px; }
  .header-title-box h4 {
    font-family: 'Outfit', sans-serif;
    font-size: 17px;
    font-weight: 700;
    margin: 0;
  }
  .msg-page-body {
    max-width: 600px;
    margin: 0 auto;
  }
  .inbox-view { display: flex; flex-direction: column; }
  .inbox-search { padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.04); }
  .search-field {
    background: #111;
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 10px;
    display: flex;
    align-items: center;
    padding: 8px 12px;
    gap: 8px;
  }
  .search-icon { color: #71717a; flex-shrink: 0; }
  .search-field input {
    background: none;
    border: none;
    color: #fff;
    font-size: 13.5px;
    width: 100%;
    outline: none;
  }
  .clear-search {
    background: none;
    border: none;
    color: #71717a;
    cursor: pointer;
    display: flex;
    align-items: center;
    padding: 2px;
  }
  .chats-list { display: flex; flex-direction: column; }
  .chat-row-item {
    display: flex;
    align-items: center;
    padding: 14px 20px;
    border-bottom: 1px solid rgba(255,255,255,0.03);
    cursor: pointer;
    transition: background 0.2s;
    gap: 14px;
  }
  .chat-row-item:hover { background: rgba(255,255,255,0.03); }
  .chat-avatar {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    object-fit: cover;
    border: 1px solid rgba(255,255,255,0.08);
    flex-shrink: 0;
  }
  .chat-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
    text-align: left;
  }
  .chat-name { font-size: 14px; font-weight: 600; color: #fff; }
  .chat-subtext {
    font-size: 12.5px;
    color: #a1a1aa;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-top: 3px;
  }
  .loading-row, .empty-row {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 40px 16px;
    color: #71717a;
    font-size: 13px;
  }
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 20px;
    gap: 8px;
    text-align: center;
  }
  .empty-icon { font-size: 48px; margin-bottom: 8px; }
  .empty-state h3 { font-size: 16px; font-weight: 700; color: #fff; margin: 0; }
  .empty-state p { font-size: 13px; color: #71717a; margin: 0; }
  .spinner-small {
    width: 18px;
    height: 18px;
    border: 2px solid rgba(255,255,255,0.1);
    border-top-color: var(--accent-indigo);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  .chat-room-view {
    display: flex;
    flex-direction: column;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: #000;
    z-index: 1000;
  }
  .chat-detail-header {
    display: flex;
    align-items: center;
    padding: 10px 16px;
    border-bottom: 1px solid rgba(255,255,255,0.08);
    gap: 12px;
    background: rgba(0,0,0,0.9);
    backdrop-filter: blur(12px);
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    z-index: 90;
    height: 60px;
  }
  .chat-back-btn {
    background: none;
    border: none;
    color: var(--accent-indigo);
    cursor: pointer;
    display: flex;
    align-items: center;
  }
  .chat-header-user {
    display: flex;
    align-items: center;
    gap: 10px;
    text-align: left;
  }
  .header-avatar-wrap { position: relative; }
  .mini-avatar {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    object-fit: cover;
  }
  .chat-header-user h6 { font-size: 14px; font-weight: 600; margin: 0; }
  .chat-header-user span { font-size: 11px; color: #71717a; }
  .presence-dot {
    position: absolute;
    bottom: 0;
    right: 0;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    border: 2px solid #000;
  }
  .presence-dot.online { background: #22c55e; }
  .presence-dot.offline { background: #52525b; }
 
  .chat-messages-area {
    flex: 1;
    overflow-y: auto;
    padding: 16px 16px 8px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 60px;
    margin-bottom: 60px;
  }
  .system-notice {
    align-self: center;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.06);
    padding: 6px 14px;
    border-radius: 9999px;
    font-size: 11px;
    color: #71717a;
    margin-bottom: 8px;
  }
  .msg-row { display: flex; align-items: flex-end; gap: 8px; }
  .msg-row.mine { justify-content: flex-end; }
  .msg-row.theirs { justify-content: flex-start; }
  .msg-avatar {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    object-fit: cover;
    flex-shrink: 0;
  }
  .msg-bubble {
    max-width: 75%;
    padding: 10px 14px;
    border-radius: 16px;
    font-size: 13.5px;
    line-height: 1.45;
    text-align: left;
  }
  .msg-bubble p { margin: 0; }
  .msg-bubble.sent {
    background: var(--accent-gradient);
    color: #fff;
    border-bottom-right-radius: 4px;
  }
  .msg-bubble.received {
    background: #18181b;
    border: 1px solid rgba(255,255,255,0.04);
    color: #eee;
    border-bottom-left-radius: 4px;
  }
  .msg-time {
    font-size: 9.5px;
    opacity: 0.5;
    margin-top: 4px;
    display: block;
    text-align: right;
  }

  /* ── Typing indicator ── */
  .typing-spacer { height: 28px; }
  .typing-indicator-row {
    padding: 0 16px 4px;
    min-height: 28px;
    animation: typeFadeIn 0.25s ease;
  }
  @keyframes typeFadeIn {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .typing-bubble {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: #18181b;
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 14px;
    padding: 6px 14px;
  }
  .typing-dots {
    display: flex;
    gap: 3px;
  }
  .typing-dots span {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--accent-indigo, #6366f1);
    animation: typingBounce 1.4s infinite ease-in-out;
  }
  .typing-dots span:nth-child(2) { animation-delay: 0.2s; }
  .typing-dots span:nth-child(3) { animation-delay: 0.4s; }
  @keyframes typingBounce {
    0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
    30% { transform: translateY(-5px); opacity: 1; }
  }
  .typing-text {
    font-size: 11.5px;
    color: #a1a1aa;
    font-weight: 500;
  }

  /* ── Media in messages ── */
  .msg-media {
    margin-bottom: 6px;
    border-radius: 10px;
    overflow: hidden;
  }
  .msg-image {
    max-width: 100%;
    max-height: 280px;
    border-radius: 10px;
    object-fit: cover;
    cursor: pointer;
    display: block;
    transition: opacity 0.2s;
  }
  .msg-image:hover { opacity: 0.9; }
  .msg-video {
    max-width: 100%;
    max-height: 280px;
    border-radius: 10px;
    display: block;
    background: #000;
  }

  /* ── Upload preview bar ── */
  .upload-preview-bar {
    position: absolute;
    bottom: 60px;
    left: 0;
    right: 0;
    padding: 10px 16px;
    background: #0a0a0a;
    border-top: 1px solid rgba(255,255,255,0.08);
    display: flex;
    align-items: center;
    justify-content: space-between;
    z-index: 91;
    animation: slideUp 0.2s ease;
  }
  @keyframes slideUp {
    from { transform: translateY(10px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
  .upload-preview-content {
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 1;
    min-width: 0;
  }
  .preview-thumb {
    width: 48px;
    height: 48px;
    border-radius: 8px;
    object-fit: cover;
    flex-shrink: 0;
    border: 1px solid rgba(255,255,255,0.1);
  }
  .preview-video-wrap {
    position: relative;
    width: 48px;
    height: 48px;
    flex-shrink: 0;
  }
  .preview-video-wrap video {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 8px;
  }
  .preview-play-icon {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0,0,0,0.4);
    border-radius: 8px;
    color: #fff;
  }
  .preview-info {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .preview-name {
    font-size: 12.5px;
    color: #e4e4e7;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .preview-size {
    font-size: 11px;
    color: #71717a;
    margin-top: 2px;
  }
  .preview-remove {
    background: rgba(255,255,255,0.06);
    border: none;
    color: #a1a1aa;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    flex-shrink: 0;
    transition: all 0.2s;
  }
  .preview-remove:hover {
    background: rgba(239,68,68,0.2);
    color: #ef4444;
  }

  /* ── Input bar ── */
  .chat-input-bar {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 10px 16px;
    background: #000;
    border-top: 1px solid rgba(255,255,255,0.08);
    display: flex;
    gap: 8px;
    align-items: center;
    z-index: 90;
    height: 60px;
  }
  .media-attach-btn {
    background: none;
    border: none;
    color: #71717a;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 6px;
    border-radius: 50%;
    transition: all 0.2s;
    flex-shrink: 0;
  }
  .media-attach-btn:hover {
    color: var(--accent-indigo, #6366f1);
    background: rgba(99,102,241,0.1);
  }
  .media-attach-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  .chat-input-bar input[type="text"] {
    flex: 1;
    background: #111;
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 9999px;
    padding: 10px 18px;
    color: #fff;
    font-size: 13.5px;
    outline: none;
  }
  .chat-input-bar input[type="text"]:focus {
    border-color: var(--accent-indigo);
  }
  .send-btn {
    background: #1e1b18;
    color: #52525b;
    border: none;
    width: 38px;
    height: 38px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: not-allowed;
    transition: all 0.2s;
    flex-shrink: 0;
  }
  .send-btn.active {
    background: var(--accent-indigo);
    color: #000;
    cursor: pointer;
  }

  .spinner-tiny {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255,255,255,0.2);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }

  /* ── Stickers Bubble & Rendering ── */
  .msg-bubble.sticker-bubble {
    background: none !important;
    border: none !important;
    padding: 0 !important;
    box-shadow: none !important;
  }
  .msg-sticker {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 2px;
  }
  .msg-sticker-img {
    width: 140px;
    height: 140px;
    object-fit: contain;
    display: block;
  }

  /* ── Sticker Drawer ── */
  .sticker-drawer {
    position: absolute;
    bottom: 60px;
    left: 0;
    right: 0;
    height: 260px;
    background: #09090b;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    display: flex;
    flex-direction: column;
    z-index: 92;
    animation: slideUpStickers 0.2s ease;
  }
  @keyframes slideUpStickers {
    from { transform: translateY(15px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
  .sticker-loading {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .sticker-grid-container {
    flex: 1;
    overflow-y: auto;
    padding: 12px;
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 12px;
  }
  .sticker-item-btn {
    background: none;
    border: none;
    padding: 6px;
    border-radius: 8px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s ease;
  }
  .sticker-item-btn:hover {
    background: rgba(255, 255, 255, 0.06);
    transform: scale(1.08);
  }
  .sticker-item-btn img {
    width: 60px;
    height: 60px;
    object-fit: contain;
  }
  .sticker-packs-tabs {
    height: 52px;
    background: #030303;
    border-top: 1px solid rgba(255, 255, 255, 0.05);
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 12px;
    overflow-x: auto;
    scrollbar-width: none;
  }
  .sticker-packs-tabs::-webkit-scrollbar {
    display: none;
  }
  .pack-tab-btn {
    background: none;
    border: none;
    padding: 6px;
    border-radius: 6px;
    cursor: pointer;
    flex-shrink: 0;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .pack-tab-btn:hover, .pack-tab-btn.active {
    background: rgba(255, 255, 255, 0.1);
  }
  .pack-tab-btn img {
    width: 28px;
    height: 28px;
    object-fit: contain;
  }
  .sticker-toggle-btn {
    background: none;
    border: none;
    color: #71717a;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 6px;
    border-radius: 50%;
    transition: all 0.2s;
    flex-shrink: 0;
  }
  .sticker-toggle-btn:hover, .sticker-toggle-btn.active {
    color: var(--accent-indigo, #6366f1);
    background: rgba(99,102,241,0.1);
  }
  .sticker-toggle-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .chat-connecting {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    color: #71717a;
    font-size: 13px;
    margin-top: 0;
  }
  .chat-send-error {
    position: absolute;
    bottom: 70px;
    left: 16px;
    right: 16px;
    background: rgba(239,68,68,0.9);
    color: #fff;
    font-size: 12px;
    text-align: center;
    padding: 8px 12px;
    border-radius: 8px;
    z-index: 95;
    cursor: pointer;
  }
`;
