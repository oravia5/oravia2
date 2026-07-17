import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, X, ShieldAlert } from 'lucide-react';

export default function AuthDrawer({ isOpen, onClose, actionText = 'interact with posts' }) {
  const navigate = useNavigate();

  if (!isOpen) return null;

  return (
    <div className="auth-drawer-overlay animate-fade" onClick={onClose}>
      <div 
        className="auth-drawer-card animate-slide-up" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle decoration */}
        <div className="drawer-drag-handle" />

        {/* Header */}
        <div className="drawer-header">
          <div className="drawer-logo">
            <Sparkles size={20} className="logo-spark" />
            <span>Oravia Community</span>
          </div>
          <button className="drawer-close-btn" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="drawer-body">
          <div className="drawer-icon-container">
            <ShieldAlert size={36} className="drawer-alert-icon" />
          </div>
          <h3>Login Required</h3>
          <p>
            Join Oravia to {actionText}! Create a profile to follow your favorite creators, discover posts near you, and purchase shoppable affiliate products.
          </p>
        </div>

        {/* Actions */}
        <div className="drawer-footer">
          <button 
            className="btn-primary drawer-action-btn"
            onClick={() => {
              onClose();
              navigate('/login');
            }}
          >
            Log In to Oravia
          </button>
          <button 
            className="drawer-secondary-btn"
            onClick={() => {
              onClose();
              navigate('/register');
            }}
          >
            Create Free Account
          </button>
        </div>
      </div>

      <style>{`
        .auth-drawer-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(4px);
          z-index: 2000;
          display: flex;
          align-items: flex-end;
          justify-content: center;
        }

        .auth-drawer-card {
          width: 100%;
          max-width: 500px;
          background: rgba(10, 10, 12, 0.95);
          backdrop-filter: blur(16px);
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          border-top-left-radius: 24px;
          border-top-right-radius: 24px;
          padding: 24px 20px 32px 20px;
          box-shadow: 0 -10px 40px rgba(0, 0, 0, 0.8);
          box-sizing: border-box;
        }

        .drawer-drag-handle {
          width: 36px;
          height: 4px;
          background: rgba(255, 255, 255, 0.15);
          border-radius: 2px;
          margin: 0 auto 16px auto;
        }

        .drawer-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 24px;
        }

        .drawer-logo {
          display: flex;
          align-items: center;
          gap: 6px;
          font-family: 'Outfit', sans-serif;
          font-size: 15px;
          font-weight: 700;
          color: #ffffff;
        }

        .logo-spark {
          color: var(--accent-indigo);
        }

        .drawer-close-btn {
          background: none;
          border: none;
          color: #71717a;
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.2s;
        }

        .drawer-close-btn:hover {
          color: #ffffff;
        }

        .drawer-body {
          text-align: center;
          margin-bottom: 28px;
        }

        .drawer-icon-container {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: rgba(255, 143, 0, 0.08);
          border: 1px solid rgba(255, 143, 0, 0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 16px auto;
        }

        .drawer-alert-icon {
          color: var(--accent-indigo);
        }

        .drawer-body h3 {
          font-family: 'Outfit', sans-serif;
          font-size: 20px;
          font-weight: 700;
          color: #ffffff;
          margin: 0 0 10px 0;
        }

        .drawer-body p {
          font-size: 13px;
          color: #a1a1aa;
          line-height: 1.6;
          margin: 0;
        }

        .drawer-footer {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .drawer-action-btn {
          width: 100%;
          padding: 14px 0;
          border-radius: 12px;
          font-family: 'Outfit', sans-serif;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          background: var(--accent-indigo);
          color: #000000;
          border: none;
        }

        .drawer-secondary-btn {
          width: 100%;
          padding: 14px 0;
          border-radius: 12px;
          font-family: 'Outfit', sans-serif;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: #ffffff;
          transition: all 0.2s;
        }

        .drawer-secondary-btn:hover {
          background: rgba(255, 255, 255, 0.08);
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }

        .animate-fade {
          animation: fadeIn 0.2s ease-out forwards;
        }

        .animate-slide-up {
          animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
}
