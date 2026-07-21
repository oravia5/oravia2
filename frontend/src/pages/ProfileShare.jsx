import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Copy, Check, Share2, Award, QrCode } from 'lucide-react';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import { getFullMediaUrl } from '../utils/mediaUrl';

export default function ProfileShare() {
  const { username } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  
  const targetUsername = username || currentUser?.username;
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const canvasRef = useRef(null);
  const profileUrl = `${window.location.origin}/profile/${targetUsername}`;

  // Fetch user profile if not loaded
  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const res = await client.get(`/users/${targetUsername}`);
        if (res.data.success) {
          setProfile(res.data.data);
        } else {
          setError('User not found');
        }
      } catch (err) {
        console.error(err);
        setError('Failed to load user profile');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [targetUsername]);

  // Generate QR Code with Gradient and Avatar
  useEffect(() => {
    if (!profile) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const qrSize = 300;
    canvas.width = qrSize;
    canvas.height = qrSize;

    // Draw loading spacer
    ctx.fillStyle = '#0f0f14';
    ctx.fillRect(0, 0, qrSize, qrSize);

    // 1. Load QR Code from API (High Error Correction 'H' is critical to allow center logo placement)
    const qrImage = new Image();
    qrImage.crossOrigin = 'anonymous';
    // Use ECC level 'H' (High - 30% restoration)
    qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&ecc=H&margin=2&data=${encodeURIComponent(profileUrl)}`;

    qrImage.onload = () => {
      // Clear canvas
      ctx.clearRect(0, 0, qrSize, qrSize);

      // Draw QR Code
      ctx.drawImage(qrImage, 0, 0, qrSize, qrSize);

      // 2. Color with Gradient (using composite operation)
      ctx.globalCompositeOperation = 'source-in';
      const gradient = ctx.createLinearGradient(0, 0, qrSize, qrSize);
      // Oravia Brand premium orange/indigo gradient
      gradient.addColorStop(0, '#f97316'); // Vibrant Orange
      gradient.addColorStop(0.5, '#ec4899'); // Rose Pink
      gradient.addColorStop(1, '#6366f1'); // Indigo Blue
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, qrSize, qrSize);

      // Restore composite operation for drawing logo on top
      ctx.globalCompositeOperation = 'source-over';

      // 3. Load and Draw Avatar in the center
      const avatarImage = new Image();
      avatarImage.crossOrigin = 'anonymous';
      avatarImage.src = profile.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150';

      const drawCenterLogo = (img) => {
        const logoSize = 64;
        const logoX = (qrSize - logoSize) / 2;
        const logoY = (qrSize - logoSize) / 2;

        // Draw white rounded background panel for the avatar spacer
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(qrSize / 2, qrSize / 2, (logoSize / 2) + 4, 0, Math.PI * 2);
        ctx.fill();

        // Draw circular cropped profile image
        ctx.save();
        ctx.beginPath();
        ctx.arc(qrSize / 2, qrSize / 2, logoSize / 2, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(img, logoX, logoY, logoSize, logoSize);
        ctx.restore();
      };

      avatarImage.onload = () => {
        drawCenterLogo(avatarImage);
      };

      avatarImage.onerror = () => {
        // Fallback: draw local default placeholder if user avatar fails (CORS block etc)
        const fallbackImg = new Image();
        fallbackImg.src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150';
        fallbackImg.onload = () => {
          drawCenterLogo(fallbackImg);
        };
      };
    };
  }, [profile, profileUrl]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${profile?.displayName || targetUsername} on Oravia`,
          text: `Scan my QR badge or click to view my profile on Oravia!`,
          url: profileUrl,
        });
      } catch (err) {
        console.error(err);
      }
    } else {
      handleCopyLink();
    }
  };

  const handleDownloadQR = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `${targetUsername}_oravia_qr.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Failed to export canvas image:', err);
      // Fallback
      alert('Click and hold the QR code to save it on your device.');
    }
  };

  return (
    <div className="share-page-wrapper animate-fade">
      <style>{`
        .share-page-wrapper {
          min-height: 100vh;
          background: radial-gradient(circle at 50% 20%, rgba(99, 102, 241, 0.1), transparent 60%), 
                      radial-gradient(circle at 80% 80%, rgba(236, 72, 153, 0.08), transparent 60%), 
                      #09090b;
          color: #f4f4f5;
          font-family: 'Outfit', 'Inter', system-ui, -apple-system, sans-serif;
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 100%;
          box-sizing: border-box;
          padding-bottom: 40px;
        }

        .share-header {
          width: 100%;
          padding: 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          background: rgba(9, 9, 11, 0.7);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          position: sticky;
          top: 0;
          z-index: 10;
          box-sizing: border-box;
        }

        .back-btn-circle {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #ffffff;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .back-btn-circle:hover {
          background: rgba(255, 255, 255, 0.1);
          transform: scale(1.05);
        }

        .share-header h2 {
          margin: 0;
          font-size: 18px;
          font-weight: 750;
          letter-spacing: -0.02em;
        }

        .share-header-placeholder {
          width: 40px;
        }

        .share-body-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 100%;
          max-width: 420px;
          padding: 24px 20px;
          box-sizing: border-box;
          gap: 32px;
        }

        /* Digital ID Badge Card */
        .digital-badge-card {
          background: rgba(20, 20, 25, 0.75);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 32px;
          padding: 32px 24px;
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
          box-shadow: 0 25px 60px rgba(0, 0, 0, 0.4);
          overflow: hidden;
          box-sizing: border-box;
        }

        /* Ambient colored lighting behind the badge */
        .digital-badge-card::before {
          content: '';
          position: absolute;
          top: -20%;
          left: -20%;
          width: 140%;
          height: 140%;
          background: radial-gradient(circle at 50% 30%, rgba(249, 115, 22, 0.08) 0%, rgba(99, 102, 241, 0.08) 50%, transparent 80%);
          z-index: -1;
          pointer-events: none;
        }

        .badge-user-info {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 28px;
          gap: 12px;
        }

        .badge-avatar {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid rgba(255, 255, 255, 0.15);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
        }

        .badge-names {
          text-align: center;
        }

        .badge-displayname {
          font-size: 20px;
          font-weight: 800;
          color: #ffffff;
          margin: 0 0 4px 0;
          letter-spacing: -0.02em;
        }

        .badge-username {
          font-size: 13px;
          color: #71717a;
          font-weight: 600;
        }

        /* Canvas Wrapper styling */
        .canvas-qr-wrapper {
          background: #ffffff;
          padding: 16px;
          border-radius: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 15px 35px rgba(0, 0, 0, 0.25);
          margin-bottom: 20px;
          position: relative;
        }

        .custom-qr-canvas {
          display: block;
          max-width: 100%;
          width: 240px;
          height: 240px;
          border-radius: 12px;
        }

        .badge-footer-tag {
          font-size: 11px;
          font-weight: 750;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.35);
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 10px;
        }

        /* Share Actions List */
        .actions-vertical-stack {
          display: flex;
          flex-direction: column;
          gap: 12px;
          width: 100%;
        }

        .action-full-width-btn {
          width: 100%;
          padding: 16px 20px;
          border-radius: 16px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          box-sizing: border-box;
          transition: all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1);
        }

        .action-full-width-btn.primary {
          background: linear-gradient(135deg, #f97316 0%, #ec4899 50%, #6366f1 100%);
          border: none;
          color: #ffffff;
          box-shadow: 0 6px 20px rgba(99, 102, 241, 0.25);
        }

        .action-full-width-btn.primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 25px rgba(99, 102, 241, 0.4);
        }

        .action-full-width-btn.secondary {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
          color: #e4e4e7;
        }

        .action-full-width-btn.secondary:hover {
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(255, 255, 255, 0.12);
        }

        .action-full-width-btn.secondary.copied {
          background: rgba(16, 185, 129, 0.08);
          border-color: rgba(16, 185, 129, 0.25);
          color: #34d399;
        }

        .share-loader {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 80px 0;
          gap: 16px;
        }

        .share-spinner {
          width: 36px;
          height: 36px;
          border: 3px solid rgba(99, 102, 241, 0.1);
          border-top: 3px solid #6366f1;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

      {/* Header Bar */}
      <header className="share-header">
        <button className="back-btn-circle" onClick={() => navigate(`/profile/${targetUsername}`)} aria-label="Go Back">
          <ArrowLeft size={20} />
        </button>
        <h2>Digital Profile ID</h2>
        <div className="share-header-placeholder"></div>
      </header>

      {/* Main Body */}
      {loading ? (
        <div className="share-loader">
          <div className="share-spinner"></div>
          <p style={{ color: '#71717a', fontSize: '13px' }}>Generating Oravia Badge...</p>
        </div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#f87171' }}>
          <p>{error}</p>
          <button className="qr-download-btn" onClick={() => navigate(-1)}>Go Back</button>
        </div>
      ) : (
        <div className="share-body-container">
          {/* Glowing Digital Badge Card */}
          <div className="digital-badge-card">
            <div className="badge-user-info">
              <img 
                src={profile.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'} 
                alt={profile.username}
                className="badge-avatar"
              />
              <div className="badge-names">
                <h3 className="badge-displayname">{profile.displayName || profile.username}</h3>
                <span className="badge-username">@{profile.username}</span>
              </div>
            </div>

            {/* Custom QR Code Canvas */}
            <div className="canvas-qr-wrapper">
              <canvas ref={canvasRef} className="custom-qr-canvas" />
            </div>

            <div className="badge-footer-tag">
              <Award size={14} /> Oravia Connected Member
            </div>
          </div>

          {/* Action List */}
          <div className="actions-vertical-stack">
            <button className="action-full-width-btn primary" onClick={handleDownloadQR}>
              <Download size={18} />
              <span>Download ID Badge Image</span>
            </button>

            {navigator.share && (
              <button className="action-full-width-btn secondary" onClick={handleNativeShare}>
                <Share2 size={18} />
                <span>Share via other Apps</span>
              </button>
            )}

            <button 
              className={`action-full-width-btn secondary ${copied ? 'copied' : ''}`} 
              onClick={handleCopyLink}
            >
              {copied ? <Check size={18} /> : <Copy size={18} />}
              <span>{copied ? 'Profile Link Copied!' : 'Copy Profile Link'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
