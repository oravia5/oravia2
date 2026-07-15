import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Film, PlusSquare, User, MessageSquare } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { unreadCount } = useNotifications();

  const isActive = (path) => location.pathname === path;

  return (
    <>
      <div className="bottom-nav-wrapper">
        <div className="bottom-nav glass-panel">
          <button 
            className={`nav-item ${isActive('/') ? 'active' : ''}`} 
            onClick={() => navigate('/')}
            aria-label="Home"
          >
            <Home size={22} />
            <span>Home</span>
          </button>
          
          <button 
            className={`nav-item ${isActive('/snips') ? 'active' : ''}`} 
            onClick={() => navigate('/snips')}
            aria-label="Snips"
          >
            <Film size={22} />
            <span>Snips</span>
          </button>
          
          <button 
            className={`nav-item create-btn ${isActive('/create-post') ? 'active' : ''}`} 
            onClick={() => navigate('/create-post')}
            aria-label="Create Post"
          >
            <div className="create-icon-wrapper">
              <PlusSquare size={24} />
            </div>
          </button>
          
          <button 
            className={`nav-item ${isActive('/messages') ? 'active' : ''}`} 
            onClick={() => navigate('/messages')}
            aria-label="Messages"
          >
            <MessageSquare size={22} />
            <span>Messages</span>
          </button>
          
          <button 
            className={`nav-item ${isActive('/profile') || location.pathname.startsWith('/profile/') ? 'active' : ''}`} 
            onClick={() => navigate('/profile')}
            aria-label="Profile"
          >
            <User size={22} />
            <span>Profile</span>
          </button>
        </div>

        <style>{`
          .bottom-nav-wrapper {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            z-index: 999;
            padding: 0 16px 12px 16px;
            background: linear-gradient(to top, #000000 70%, rgba(0, 0, 0, 0) 100%);
            pointer-events: none;
          }

          .bottom-nav {
            display: flex;
            align-items: center;
            justify-content: space-between;
            height: 64px;
            padding: 0 12px;
            border-radius: 20px;
            pointer-events: auto;
            background: rgba(10, 10, 10, 0.85);
            backdrop-filter: blur(16px);
            border: 1px solid rgba(255, 255, 255, 0.08);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.8);
          }

          .nav-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            flex: 1;
            height: 100%;
            background: none;
            border: none;
            color: #71717a;
            cursor: pointer;
            font-size: 10px;
            font-weight: 500;
            gap: 4px;
            transition: all 0.2s ease;
            padding: 0;
            position: relative;
          }

          .nav-item:hover, .nav-item.active {
            color: var(--accent-indigo);
          }

          .nav-item svg {
            transition: transform 0.2s ease;
          }

          .nav-item:active svg {
            transform: scale(0.9);
          }

          .create-btn {
            position: relative;
            top: -4px;
          }

          .create-icon-wrapper {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 44px;
            height: 44px;
            background: #111111;
            border: 1.5px solid #222222;
            border-radius: 14px;
            color: #ffffff;
            transition: all 0.2s ease;
          }

          .create-btn:hover .create-icon-wrapper,
          .create-btn.active .create-icon-wrapper {
            background: var(--accent-indigo);
            border-color: var(--accent-indigo);
            color: #000000;
            box-shadow: 0 0 12px rgba(255, 143, 0, 0.4);
          }

          .bell-wrapper {
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .bell-badge {
            position: absolute;
            top: -6px;
            right: -8px;
            background: #ef4444;
            color: #fff;
            font-size: 9px;
            font-weight: 700;
            min-width: 16px;
            height: 16px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0 3px;
            border: 1.5px solid #000;
            line-height: 1;
          }
         `}</style>
      </div>
    </>
  );
}
