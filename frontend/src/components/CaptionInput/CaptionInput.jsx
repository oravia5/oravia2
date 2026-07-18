import React, { useState, useRef, useEffect, useCallback } from 'react';
import client from '../../api/client';
import { getFullMediaUrl } from '../../utils/mediaUrl';


let debounceTimer = null;
const debounce = (fn, ms) => {
  return (...args) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => fn(...args), ms);
  };
};

export default function CaptionInput({ value, onChange, disabled }) {
  const textareaRef = useRef(null);
  const dropdownRef = useRef(null);

  const [suggestions, setSuggestions] = useState([]);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const [trigger, setTrigger] = useState(null); // '#' or '@'
  const [searchTerm, setSearchTerm] = useState('');
  const [cursorPos, setCursorPos] = useState({ top: 0, left: 0 });

  // Get cursor position relative to textarea
  const getCursorCoordinates = () => {
    const textarea = textareaRef.current;
    if (!textarea) return { top: 0, left: 0 };
    const pos = textarea.selectionStart;
    const { offsetLeft, offsetTop } = textarea;
    const style = getComputedStyle(textarea);
    const lineHeight = parseInt(style.lineHeight) || 20;
    const charsPerLine = Math.floor((textarea.clientWidth - 16) / 8);
    const line = Math.floor(pos / charsPerLine);
    const col = pos % charsPerLine;
    return {
      top: offsetTop + (line + 1) * lineHeight + 8,
      left: offsetLeft + Math.min(col * 8, textarea.clientWidth - 200),
    };
  };

  // Find trigger (# or @) before cursor
  const findTrigger = (text, cursor) => {
    const beforeCursor = text.slice(0, cursor);
    const triggerMatch = beforeCursor.match(/[\s]?(#|@)([a-zA-Z0-9_]*)$/);
    if (triggerMatch) {
      const fullMatch = triggerMatch[0].trim();
      const trig = fullMatch[0];
      const term = fullMatch.slice(1);
      return { trigger: trig, term };
    }
    return null;
  };

  // Fetch suggestions
  const fetchSuggestions = useCallback(
    debounce(async (trig, term) => {
      if (!term) {
        setSuggestions([]);
        return;
      }
      try {
        if (trig === '#') {
          const res = await client.get(`/posts/search-posts?q=${encodeURIComponent(term)}`);
          if (res.data.success) {
            setSuggestions(res.data.data.hashtags.slice(0, 8));
          }
        } else if (trig === '@') {
          const res = await client.get(`/users/search?q=${encodeURIComponent(term)}`);
          if (res.data.success) {
            setSuggestions(res.data.data.slice(0, 8));
          }
        }
      } catch (err) {
        console.error('Error fetching suggestions:', err);
        setSuggestions([]);
      }
    }, 250),
    []
  );

  const handleChange = (e) => {
    const text = e.target.value;
    const cursor = e.target.selectionStart;
    onChange(e);

    const found = findTrigger(text, cursor);
    if (found) {
      setTrigger(found.trigger);
      setSearchTerm(found.term);
      setActiveSuggestionIndex(-1);
      setCursorPos(getCursorCoordinates());
      fetchSuggestions(found.trigger, found.term);
    } else {
      setTrigger(null);
      setSearchTerm('');
      setSuggestions([]);
      setActiveSuggestionIndex(-1);
    }
  };

  const insertSuggestion = (suggestion) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const cursor = textarea.selectionStart;
    const text = value;
    const beforeCursor = text.slice(0, cursor);
    const afterCursor = text.slice(cursor);
    const match = beforeCursor.match(/[\s]?(#|@)[a-zA-Z0-9_]*$/);
    if (!match) return;

    const replaceText = trigger === '#'
      ? `#${suggestion.name} `
      : `@${suggestion.username} `;

    const newText = text.slice(0, cursor - match[0].length) + replaceText + afterCursor;
    onChange({ target: { value: newText } });
    setTrigger(null);
    setSuggestions([]);
    setActiveSuggestionIndex(-1);

    // Set cursor position after inserted text
    requestAnimationFrame(() => {
      const newPos = cursor - match[0].length + replaceText.length;
      textarea.focus();
      textarea.setSelectionRange(newPos, newPos);
    });
  };

  const handleKeyDown = (e) => {
    if (!suggestions.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSuggestionIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSuggestionIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      if (activeSuggestionIndex >= 0) {
        e.preventDefault();
        insertSuggestion(suggestions[activeSuggestionIndex]);
      }
    } else if (e.key === 'Escape') {
      setSuggestions([]);
      setTrigger(null);
    }
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleClick = (e) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        textareaRef.current &&
        !textareaRef.current.contains(e.target)
      ) {
        setSuggestions([]);
        setTrigger(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="caption-input-wrapper">
      <textarea
        ref={textareaRef}
        placeholder="Write a caption for your post..."
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        className="create-textarea"
        rows="3"
        disabled={disabled}
      />

      {suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="auto-suggest-dropdown"
          style={{
            top: cursorPos.top,
            left: cursorPos.left,
          }}
        >
          {trigger === '#' && suggestions.map((tag, idx) => (
            <div
              key={tag.name}
              className={`suggest-item ${idx === activeSuggestionIndex ? 'active' : ''}`}
              onClick={() => insertSuggestion(tag)}
            >
              <span className="suggest-icon">#</span>
              <div className="suggest-info">
                <span className="suggest-name">{tag.name}</span>
                <span className="suggest-count">{tag.count} posts</span>
              </div>
            </div>
          ))}
          {trigger === '@' && suggestions.map((user, idx) => (
            <div
              key={user._id}
              className={`suggest-item ${idx === activeSuggestionIndex ? 'active' : ''}`}
              onClick={() => insertSuggestion(user)}
            >
              <img
                src={user.avatarUrl
                  ? getFullMediaUrl(user.avatarUrl)
                  : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                alt=""
                className="suggest-avatar"
              />
              <div className="suggest-info">
                <span className="suggest-name">{user.displayName || user.username}</span>
                <span className="suggest-count">@{user.username}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        .caption-input-wrapper {
          position: relative;
          width: 100%;
        }

        .caption-input-wrapper .create-textarea {
          width: 100%;
          background-color: #0d0d0d;
          border: 1px solid #222222;
          border-radius: 12px;
          padding: 12px;
          font-size: 14px;
          color: #ffffff;
          resize: none;
          font-family: inherit;
          box-sizing: border-box;
        }

        .caption-input-wrapper .create-textarea:focus {
          outline: none;
          border-color: var(--accent-indigo);
        }

        .auto-suggest-dropdown {
          position: absolute;
          z-index: 1000;
          background: #141416;
          border: 1px solid #2a2a2e;
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.6);
          min-width: 220px;
          max-width: 300px;
          max-height: 280px;
          overflow-y: auto;
          padding: 6px;
        }

        .suggest-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 10px;
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.15s;
        }

        .suggest-item.active,
        .suggest-item:hover {
          background: rgba(99, 102, 241, 0.15);
        }

        .suggest-icon {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: rgba(99, 102, 241, 0.15);
          color: var(--accent-indigo);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 16px;
          flex-shrink: 0;
        }

        .suggest-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          object-fit: cover;
          flex-shrink: 0;
        }

        .suggest-info {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .suggest-name {
          font-size: 13px;
          font-weight: 600;
          color: #fff;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .suggest-count {
          font-size: 11px;
          color: #71717a;
        }
      `}</style>
    </div>
  );
}
