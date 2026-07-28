import React, { useState, useEffect, useCallback } from 'react';
import { 
  X, Copy, Check, Share2, Send, Download, Search, 
  MessageSquare, Sparkles, AlertCircle
} from 'lucide-react';
import client from '../../api/client';
import './ShareModal.css';

export default function ShareModal({ isOpen, onClose, item, type = 'post', onShareSuccess }) {
  const [copied, setCopied] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [conversations, setConversations] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sendingId, setSendingId] = useState(null);
  const [sentMap, setSentMap] = useState({});
  const [loadingChats, setLoadingChats] = useState(false);

  // Derive Share URL and Preview Info
  const baseUrl = window.location.origin;
  const itemId = item?._id || item?.id;
  const shareUrl = item?.shareableUrl || `${baseUrl}/${type === 'reel' ? 'snip' : 'post'}/${itemId}`;
  const authorName = item?.author?.displayName || item?.author?.username || 'Oravia Creator';
  const authorAvatar = item?.author?.avatarUrl || item?.user?.avatarUrl || '/default-avatar.png';
  const captionText = item?.caption || item?.description || 'Check out this on Oravia!';
  const mediaUrl = item?.mediaUrl || item?.videoUrl || item?.imageUrl || (item?.media?.[0]?.url);

  // Fetch recent conversations for in-app messaging
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const fetchChats = async () => {
      setLoadingChats(true);
      try {
        const res = await client.get('/chat/conversations');
        if (isMounted && res.data.success) {
          setConversations(res.data.data.conversations || []);
        }
      } catch (err) {
        console.error('[ShareModal] Error loading chats:', err);
      } finally {
        if (isMounted) setLoadingChats(false);
      }
    };

    fetchChats();
    return () => { isMounted = false; };
  }, [isOpen]);

  // Show temporary toast notification
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 2500);
  };

  // Copy Link Handler
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      showToast('Link copied to clipboard! 📋');
      
      // Increment share count in backend if provided
      if (typeof onShareSuccess === 'function') {
        onShareSuccess();
      }

      setTimeout(() => setCopied(false), 2200);
    } catch (err) {
      console.error('[ShareModal] Copy link error:', err);
    }
  };

  // Native Device Share
  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Oravia ${type === 'reel' ? 'Snip' : 'Post'}`,
          text: captionText,
          url: shareUrl,
        });
        if (typeof onShareSuccess === 'function') onShareSuccess();
      } catch (err) {
        if (err.name !== 'AbortError') console.error('Native share error:', err);
      }
    } else {
      handleCopyLink();
    }
  };

  // Open Social Apps
  const openSocialShare = (platform) => {
    const text = encodeURIComponent(`Check out this ${type === 'reel' ? 'snip' : 'post'} by @${item?.author?.username || 'user'} on Oravia!`);
    const encodedUrl = encodeURIComponent(shareUrl);

    let url = '';
    switch (platform) {
      case 'whatsapp':
        url = `https://api.whatsapp.com/send?text=${text}%20${encodedUrl}`;
        break;
      case 'telegram':
        url = `https://t.me/share/url?url=${encodedUrl}&text=${text}`;
        break;
      case 'twitter':
        url = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${text}`;
        break;
      case 'facebook':
        url = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
        break;
      default:
        break;
    }

    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
      if (typeof onShareSuccess === 'function') onShareSuccess();
    }
  };

  // Send Direct Message in Oravia Chat
  const handleSendDirectMessage = async (channelId, otherUserId) => {
    if (sendingId) return;
    setSendingId(otherUserId);
    try {
      const messageText = `Check out this ${type === 'reel' ? 'snip' : 'post'}: ${shareUrl}`;
      await client.put('/chat/conversations', {
        channelId,
        lastMessageText: messageText,
      });

      setSentMap(prev => ({ ...prev, [otherUserId]: true }));
      showToast('Sent in message! 💬');

      if (typeof onShareSuccess === 'function') onShareSuccess();
    } catch (err) {
      console.error('[ShareModal] Failed to send DM:', err);
      showToast('Failed to send message');
    } finally {
      setSendingId(null);
    }
  };

  // Media Download Handler
  const handleDownloadMedia = () => {
    if (!mediaUrl) {
      showToast('Media unavailable for download');
      return;
    }
    const a = document.createElement('a');
    a.href = mediaUrl;
    a.download = `oravia-${type}-${itemId}.${mediaUrl.includes('.mp4') ? 'mp4' : 'jpg'}`;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('Download started 📥');
  };

  // Filter conversations by search input
  const filteredChats = conversations.filter(c => {
    const name = c.user?.displayName || c.user?.username || '';
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  if (!isOpen) return null;

  return (
    <div className="share-modal-overlay" onClick={onClose}>
      <div className="share-modal-card" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="share-modal-header">
          <div className="share-modal-title">
            <Share2 size={19} className="text-purple-400" />
            <span>Share {type === 'reel' ? 'Snip' : 'Post'}</span>
          </div>
          <button className="share-modal-close-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="share-modal-body">
          
          {/* Content Preview */}
          <div className="share-item-preview">
            {mediaUrl ? (
              mediaUrl.includes('.mp4') || mediaUrl.includes('.webm') ? (
                <video src={mediaUrl} className="share-item-thumb" muted />
              ) : (
                <img src={mediaUrl} alt="" className="share-item-thumb" />
              )
            ) : (
              <img src={authorAvatar} alt="" className="share-item-thumb" />
            )}
            <div className="share-item-info">
              <h4 className="share-item-author">@{authorName}</h4>
              <p className="share-item-text">{captionText}</p>
            </div>
          </div>

          {/* Social Apps Grid */}
          <div>
            <div className="share-section-title">Share via Social</div>
            <div className="share-social-grid">
              
              <button className="share-social-btn" onClick={() => openSocialShare('whatsapp')}>
                <div className="share-social-icon icon-whatsapp">
                  <MessageSquare size={22} />
                </div>
                <span className="share-social-label">WhatsApp</span>
              </button>

              <button className="share-social-btn" onClick={() => openSocialShare('telegram')}>
                <div className="share-social-icon icon-telegram">
                  <Send size={20} />
                </div>
                <span className="share-social-label">Telegram</span>
              </button>

              <button className="share-social-btn" onClick={() => openSocialShare('twitter')}>
                <div className="share-social-icon icon-twitter">
                  <Sparkles size={20} />
                </div>
                <span className="share-social-label">X (Twitter)</span>
              </button>

              <button className="share-social-btn" onClick={() => openSocialShare('facebook')}>
                <div className="share-social-icon icon-facebook">
                  <Share2 size={20} />
                </div>
                <span className="share-social-label">Facebook</span>
              </button>

              <button className="share-social-btn" onClick={handleNativeShare}>
                <div className="share-social-icon icon-native">
                  <Share2 size={20} />
                </div>
                <span className="share-social-label">More</span>
              </button>

            </div>
          </div>

          {/* In-App Direct Message Section */}
          {conversations.length > 0 && (
            <div className="share-inapp-section">
              <div className="share-section-title">Send to Friends</div>
              <div className="share-search-box">
                <Search size={15} className="share-search-icon" />
                <input 
                  type="text" 
                  placeholder="Search chats..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="share-chats-list">
                {filteredChats.map((c) => {
                  const u = c.user;
                  const isSent = sentMap[u._id];
                  return (
                    <div key={c.channelId} className="share-chat-row">
                      <div className="share-chat-user">
                        <img src={u.avatarUrl || '/default-avatar.png'} alt="" className="share-chat-avatar" />
                        <div>
                          <p className="share-chat-name">{u.displayName || u.username}</p>
                          <p className="share-chat-username">@{u.username}</p>
                        </div>
                      </div>
                      <button 
                        className={`share-send-btn ${isSent ? 'sent' : ''}`}
                        onClick={() => handleSendDirectMessage(c.channelId, u._id)}
                        disabled={isSent || sendingId === u._id}
                      >
                        {isSent ? (
                          <>
                            <Check size={13} /> Sent
                          </>
                        ) : (
                          'Send'
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="share-modal-footer">
          <div className="share-copy-box">
            <span className="share-copy-url">{shareUrl}</span>
            <button 
              className={`share-copy-btn ${copied ? 'copied' : ''}`}
              onClick={handleCopyLink}
            >
              {copied ? (
                <>
                  <Check size={14} /> Copied!
                </>
              ) : (
                <>
                  <Copy size={14} /> Copy Link
                </>
              )}
            </button>
          </div>

          <div className="share-action-row">
            <button className="share-secondary-action" onClick={handleDownloadMedia}>
              <Download size={16} /> Save Media
            </button>
          </div>
        </div>

      </div>

      {/* Floating Toast Feedback */}
      {toastMessage && (
        <div className="share-toast">
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
