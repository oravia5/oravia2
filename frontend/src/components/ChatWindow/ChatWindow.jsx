import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ChatRoomProvider,
  useMessages,
  useTyping,
  usePresence,
  usePresenceListener,
} from '@ably/chat/react';
import { ChatMessageEventType } from '@ably/chat';
import { useAuth } from '../../context/AuthContext';
import { useChatContext } from '../../context/ChatContext';
import client from '../../api/client';
import { ArrowLeft, Send, Image, X, Play, Smile } from 'lucide-react';
import { getFullMediaUrl } from '../../utils/mediaUrl';

/* ── Typing indicator (Ably presence-based, zero server load) ── */
function TypingIndicator({ otherUserName }) {
  const { currentlyTyping } = useTyping();
  const names = Array.from(currentlyTyping);

  if (names.length === 0) return <div className="typing-spacer" />;

  return (
    <div className="typing-indicator-row">
      <div className="typing-bubble">
        <div className="typing-dots">
          <span />
          <span />
          <span />
        </div>
        <span className="typing-text">
          {otherUserName || 'Someone'} is typing
        </span>
      </div>
    </div>
  );
}

/* ── Presence dot ── */
function PresenceDot() {
  const { presenceData } = usePresenceListener();
  const isOnline = presenceData.length > 0;
  return (
    <span
      className={`presence-dot ${isOnline ? 'online' : 'offline'}`}
      title={isOnline ? 'Online' : 'Offline'}
    />
  );
}

/* ── Media Preview in message bubble ── */
function MediaContent({ metadata }) {
  if (!metadata?.mediaUrl) return null;

  if (metadata.mediaType === 'sticker') {
    return (
      <div className="msg-sticker">
        <img
          src={`${getFullMediaUrl(metadata.mediaUrl)}?v=1.0.1`}
          alt="sticker"
          className="msg-sticker-img"
          loading="lazy"
        />
      </div>
    );
  }

  if (metadata.mediaType === 'video') {
    return (
      <div className="msg-media">
        <video
          src={getFullMediaUrl(metadata.mediaUrl)}
          controls
          preload="metadata"
          className="msg-video"
          playsInline
        />
      </div>
    );
  }

  return (
    <div className="msg-media">
      <img
        src={getFullMediaUrl(metadata.mediaUrl)}
        alt=""
        className="msg-image"
        loading="lazy"
        onClick={() => window.open(getFullMediaUrl(metadata.mediaUrl), '_blank')}
      />
    </div>
  );
}

/* ── Upload Preview (before sending) ── */
function UploadPreview({ file, onRemove }) {
  const [preview, setPreview] = useState(null);
  const isVideo = file?.type?.startsWith('video/');

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  if (!preview) return null;

  return (
    <div className="upload-preview-bar">
      <div className="upload-preview-content">
        {isVideo ? (
          <div className="preview-video-wrap">
            <video src={preview} className="preview-thumb" />
            <div className="preview-play-icon">
              <Play size={16} />
            </div>
          </div>
        ) : (
          <img src={preview} alt="" className="preview-thumb" />
        )}
        <div className="preview-info">
          <span className="preview-name">{file.name}</span>
          <span className="preview-size">
            {(file.size / 1024 / 1024).toFixed(1)} MB
          </span>
        </div>
      </div>
      <button className="preview-remove" onClick={onRemove}>
        <X size={16} />
      </button>
    </div>
  );
}

/* ── Main Chat Room ── */
function ChatRoom({ channelId, otherUser, onBack }) {
  usePresence();
  const { user: currentUser } = useAuth();
  const myId = currentUser?._id;

  const [messages, setMessages] = useState([]);
  const [sendError, setSendError] = useState(null);
  const messagesEndRef = useRef(null);

  // Sticker & Media States (Lifted up for layout adjustments)
  const [mediaFile, setMediaFile] = useState(null);
  const [showStickers, setShowStickers] = useState(false);
  const [stickerPacks, setStickerPacks] = useState([]);
  const [activePackId, setActivePackId] = useState(null);
  const [loadingStickers, setLoadingStickers] = useState(false);

  const { sendMessage, historyBeforeSubscribe } = useMessages({
    listener: (event) => {
      if (event.type === ChatMessageEventType.Created) {
        setMessages((prev) => {
          const updated = [...prev, event.message];
          updated.sort((a, b) => a.timestamp - b.timestamp);
          return updated;
        });
      }
    },
  });

  useEffect(() => {
    async function loadHistory() {
      try {
        if (!historyBeforeSubscribe) return;
        const history = await historyBeforeSubscribe({ limit: 50 });
        const sorted = [...history.items].sort(
          (a, b) => a.timestamp - b.timestamp
        );
        setMessages(sorted);
      } catch (err) {
        console.error('History load error:', err);
      }
    }
    loadHistory();
  }, [historyBeforeSubscribe]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = useCallback(
    async (text, fileToUpload, stickerUrl) => {
      setSendError(null);
      try {
        let metadata = {};

        if (stickerUrl) {
          metadata = {
            mediaUrl: stickerUrl,
            mediaType: 'sticker',
          };
        } else if (fileToUpload) {
          const formData = new FormData();
          formData.append('media', fileToUpload);
          const uploadRes = await client.post('/chat/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          if (uploadRes.data.success) {
            metadata = {
              mediaUrl: uploadRes.data.data.url,
              mediaType: uploadRes.data.data.type,
              mediaName: uploadRes.data.data.name,
            };
          }
        }

        // Ably Chat SDK requires non-empty text — use a space for media-only messages
        const msgText = text || (Object.keys(metadata).length > 0 ? ' ' : '');
        const msgPayload = { text: msgText };
        if (Object.keys(metadata).length > 0) {
          msgPayload.metadata = metadata;
        }

        await sendMessage(msgPayload);

        // Update conversation (fire-and-forget)
        const previewText = metadata.mediaType
          ? metadata.mediaType === 'sticker'
            ? '✨ Sticker'
            : metadata.mediaType === 'video'
            ? '🎬 Video'
            : '📷 Photo'
          : text;
        client
          .put('/chat/conversations', {
            channelId,
            lastMessageText: previewText,
          })
          .catch(() => {});
      } catch (err) {
        console.error('Send failed:', err);
        setSendError('Failed to send. Tap to retry.');
        throw err;
      }
    },
    [sendMessage, channelId]
  );

  const fetchStickers = async () => {
    if (stickerPacks.length > 0) return;
    setLoadingStickers(true);
    try {
      const res = await client.get('/chat/stickers');
      if (res.data.success) {
        setStickerPacks(res.data.data);
        if (res.data.data.length > 0) {
          setActivePackId(res.data.data[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load stickers:', err);
    } finally {
      setLoadingStickers(false);
    }
  };

  const toggleStickers = () => {
    if (!showStickers) {
      fetchStickers();
    }
    setShowStickers(!showStickers);
  };

  const handleStickerClick = (url) => {
    setShowStickers(false);
    handleSend('', null, url);
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const d = new Date(timestamp);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Adjust message viewport when sticker drawer or upload previews are open
  let messagesBottomMargin = 60;
  if (showStickers) messagesBottomMargin += 260;
  if (mediaFile) messagesBottomMargin += 68;

  return (
    <div className="chat-room-view">
      <div className="chat-detail-header">
        <button className="chat-back-btn" onClick={onBack}>
          <ArrowLeft size={18} />
        </button>
        <div className="chat-header-user">
          <div className="header-avatar-wrap">
            {otherUser?.avatarUrl && (
              <img src={otherUser.avatarUrl} alt="" className="mini-avatar" />
            )}
            <PresenceDot />
          </div>
          <div>
            <h6>{otherUser?.displayName || otherUser?.username}</h6>
            <span>@{otherUser?.username}</span>
          </div>
        </div>
      </div>

      <div
        className="chat-messages-area"
        style={{ marginBottom: `${messagesBottomMargin}px` }}
      >
        <div className="system-notice">
          <span>Messages are end-to-end encrypted</span>
        </div>

        {messages.map((msg) => {
          const isMine = msg.clientId === myId;
          const isSticker = msg.metadata?.mediaType === 'sticker';
          return (
            <div
              key={msg.serial}
              className={`msg-row ${isMine ? 'mine' : 'theirs'}`}
            >
              {!isMine && otherUser?.avatarUrl && (
                <img src={otherUser.avatarUrl} alt="" className="msg-avatar" />
              )}
              <div
                className={`msg-bubble ${
                  isSticker ? 'sticker-bubble' : isMine ? 'sent' : 'received'
                }`}
              >
                <MediaContent metadata={msg.metadata} />
                {msg.text && msg.text.trim() && <p>{msg.text}</p>}
                <span className="msg-time">{formatTime(msg.timestamp)}</span>
              </div>
            </div>
          );
        })}

        <div ref={messagesEndRef} />
      </div>

      <TypingIndicator
        otherUserName={otherUser?.displayName || otherUser?.username}
      />

      {sendError && (
        <div className="chat-send-error" onClick={() => setSendError(null)}>
          {sendError}
        </div>
      )}

      {/* Stickers Drawer */}
      {showStickers && (
        <div className="sticker-drawer">
          {loadingStickers ? (
            <div className="sticker-loading">
              <div className="spinner-small" />
            </div>
          ) : (
            <>
              <div className="sticker-grid-container">
                {stickerPacks
                  .find((p) => p.id === activePackId)
                  ?.stickers.map((stUrl, i) => (
                    <button
                      key={i}
                      className="sticker-item-btn"
                      onClick={() => handleStickerClick(stUrl)}
                    >
                      <img src={`${getFullMediaUrl(stUrl)}?v=1.0.1`} alt="" loading="lazy" />
                    </button>
                  ))}
              </div>
              <div className="sticker-packs-tabs">
                {stickerPacks.map((pack) => (
                  <button
                    key={pack.id}
                    className={`pack-tab-btn ${
                      activePackId === pack.id ? 'active' : ''
                    }`}
                    onClick={() => setActivePackId(pack.id)}
                    title={pack.name}
                  >
                    <img src={`${getFullMediaUrl(pack.tray)}?v=1.0.1`} alt={pack.name} />
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <MessageInput
        onSend={handleSend}
        mediaFile={mediaFile}
        setMediaFile={setMediaFile}
        showStickers={showStickers}
        onToggleStickers={toggleStickers}
      />
    </div>
  );
}

/* ── Message Input with media picker & stickers toggle ── */
function MessageInput({
  onSend,
  mediaFile,
  setMediaFile,
  showStickers,
  onToggleStickers,
}) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const { keystroke, stop } = useTyping();
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);

  const handleChange = (e) => {
    const val = e.target.value;
    setText(val);
    if (val.trim().length > 0) {
      keystroke().catch(() => {});
    } else {
      stop().catch(() => {});
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/gif',
      'video/mp4',
      'video/mov',
      'video/quicktime',
    ];
    if (!allowed.includes(file.type)) {
      alert('Only images (JPG, PNG, WebP, GIF) and videos (MP4, MOV) are supported.');
      return;
    }

    const maxSize = file.type.startsWith('video/') ? 100 : 50;
    if (file.size > maxSize * 1024 * 1024) {
      alert(`File too large. Max ${maxSize}MB.`);
      return;
    }

    setMediaFile(file);
    inputRef.current?.focus();
    e.target.value = '';
  };

  const handleSend = async () => {
    if ((!text.trim() && !mediaFile) || sending) return;
    const msg = text.trim();
    const file = mediaFile;
    setText('');
    setMediaFile(null);
    setSending(true);
    try {
      await onSend(msg, file);
    } catch {
      setText(msg);
      setMediaFile(file);
    } finally {
      setSending(false);
      stop().catch(() => {});
      inputRef.current?.focus();
    }
  };

  const canSend = (text.trim() || mediaFile) && !sending;

  return (
    <>
      {mediaFile && (
        <UploadPreview file={mediaFile} onRemove={() => setMediaFile(null)} />
      )}
      <div className="chat-input-bar">
        <button
          className={`sticker-toggle-btn ${showStickers ? 'active' : ''}`}
          onClick={onToggleStickers}
          disabled={sending}
          title="Stickers"
        >
          <Smile size={20} />
        </button>
        <button
          className="media-attach-btn"
          onClick={() => fileInputRef.current?.click()}
          disabled={sending}
          title="Attach image or video"
        >
          <Image size={20} />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp,image/gif,video/mp4,video/mov,video/quicktime"
          style={{ display: 'none' }}
          onChange={handleFileSelect}
        />
        <input
          ref={inputRef}
          type="text"
          placeholder={mediaFile ? 'Add a caption...' : 'Type a message...'}
          value={text}
          onChange={handleChange}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <button
          className={`send-btn ${canSend ? 'active' : ''}`}
          onClick={handleSend}
          disabled={!canSend}
        >
          {sending ? <div className="spinner-tiny" /> : <Send size={18} />}
        </button>
      </div>
    </>
  );
}

/* ── Main export ── */
export default function ChatWindow({ channelId, otherUser, onBack }) {
  const { chatReady } = useChatContext();

  if (!channelId) return null;

  if (!chatReady) {
    return (
      <div className="chat-room-view">
        <div className="chat-detail-header">
          <button className="chat-back-btn" onClick={onBack}>
            <ArrowLeft size={18} />
          </button>
          <div className="chat-header-user">
            {otherUser?.avatarUrl && (
              <img src={otherUser.avatarUrl} alt="" className="mini-avatar" />
            )}
            <div>
              <h6>{otherUser?.displayName || otherUser?.username}</h6>
              <span>@{otherUser?.username}</span>
            </div>
          </div>
        </div>
        <div className="chat-connecting">
          <div className="spinner-small" />
          <span>Connecting to chat...</span>
        </div>
      </div>
    );
  }

  return (
    <ChatRoomProvider name={channelId}>
      <ChatRoom channelId={channelId} otherUser={otherUser} onBack={onBack} />
    </ChatRoomProvider>
  );
}
