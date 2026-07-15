import React from 'react';
import { useUpload } from '../../context/UploadContext';
import { CloudUpload, CheckCircle2, XCircle } from 'lucide-react';

export default function UploadToast() {
  const { uploads } = useUpload();

  if (!uploads || uploads.length === 0) return null;

  return (
    <>
      <div className="ut-container">
        {uploads.map((u) => (
          <div key={u.id} className={`ut-card ${u.status}`}>
            {/* Animated background glow */}
            {u.status === 'uploading' && <div className="ut-glow" />}

            {/* Left icon */}
            <div className="ut-icon-wrap">
              {u.status === 'done' ? (
                <CheckCircle2 size={20} />
              ) : u.status === 'error' ? (
                <XCircle size={20} />
              ) : (
                <CloudUpload size={20} className="ut-pulse" />
              )}
            </div>

            {/* Info column */}
            <div className="ut-body">
              <div className="ut-row">
                <span className="ut-label">
                  {u.status === 'done'
                    ? 'Published!'
                    : u.status === 'error'
                      ? 'Upload Failed'
                      : u.filename || 'Uploading...'}
                </span>
                {u.status === 'uploading' && (
                  <span className="ut-pct">{Math.round(u.progress)}%</span>
                )}
              </div>

              {/* Progress bar */}
              {u.status === 'uploading' && (
                <div className="ut-track">
                  <div
                    className="ut-fill"
                    style={{ width: `${u.progress}%` }}
                  />
                </div>
              )}

              {u.status === 'done' && (
                <span className="ut-sub success">Your post is now live ✨</span>
              )}
              {u.status === 'error' && (
                <span className="ut-sub error">Something went wrong. Try again.</span>
              )}
            </div>
          </div>
        ))}
      </div>

      <style>{`
        .ut-container {
          position: fixed;
          bottom: 90px;
          left: 12px;
          right: 12px;
          z-index: 10000;
          display: flex;
          flex-direction: column;
          gap: 10px;
          pointer-events: none;
        }

        .ut-card {
          position: relative;
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 18px;
          border-radius: 18px;
          background: rgba(18, 18, 18, 0.92);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow:
            0 8px 32px rgba(0, 0, 0, 0.6),
            0 0 0 1px rgba(255, 255, 255, 0.04) inset;
          overflow: hidden;
          pointer-events: auto;
          animation: utSlideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @keyframes utSlideIn {
          from {
            opacity: 0;
            transform: translateY(24px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        /* Animated glow background for uploading state */
        .ut-glow {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(255, 143, 0, 0.06) 30%,
            rgba(255, 143, 0, 0.12) 50%,
            rgba(255, 143, 0, 0.06) 70%,
            transparent 100%
          );
          animation: utShimmer 2s ease-in-out infinite;
          pointer-events: none;
        }

        @keyframes utShimmer {
          0%, 100% { transform: translateX(-100%); }
          50% { transform: translateX(100%); }
        }

        .ut-card.done {
          border-color: rgba(34, 197, 94, 0.25);
          box-shadow:
            0 8px 32px rgba(0, 0, 0, 0.6),
            0 0 24px rgba(34, 197, 94, 0.08);
        }

        .ut-card.error {
          border-color: rgba(239, 68, 68, 0.25);
          box-shadow:
            0 8px 32px rgba(0, 0, 0, 0.6),
            0 0 24px rgba(239, 68, 68, 0.08);
        }

        /* Icon */
        .ut-icon-wrap {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border-radius: 12px;
          background: rgba(255, 143, 0, 0.1);
          color: #FF8F00;
          flex-shrink: 0;
          position: relative;
          z-index: 1;
        }

        .ut-card.done .ut-icon-wrap {
          background: rgba(34, 197, 94, 0.12);
          color: #22c55e;
        }

        .ut-card.error .ut-icon-wrap {
          background: rgba(239, 68, 68, 0.12);
          color: #ef4444;
        }

        @keyframes utPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .ut-pulse {
          animation: utPulse 1.5s ease-in-out infinite;
        }

        /* Body */
        .ut-body {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 8px;
          position: relative;
          z-index: 1;
        }

        .ut-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .ut-label {
          font-size: 14px;
          font-weight: 600;
          color: #ffffff;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          font-family: 'Inter', sans-serif;
        }

        .ut-pct {
          font-size: 14px;
          font-weight: 700;
          color: #FF8F00;
          flex-shrink: 0;
          font-variant-numeric: tabular-nums;
          font-family: 'Inter', sans-serif;
        }

        /* Progress track */
        .ut-track {
          width: 100%;
          height: 4px;
          background: rgba(255, 255, 255, 0.06);
          border-radius: 999px;
          overflow: hidden;
        }

        .ut-fill {
          height: 100%;
          border-radius: 999px;
          background: linear-gradient(90deg, #FF8F00, #ffb300);
          transition: width 0.35s cubic-bezier(0.22, 1, 0.36, 1);
          box-shadow: 0 0 12px rgba(255, 143, 0, 0.4);
          position: relative;
        }

        .ut-fill::after {
          content: '';
          position: absolute;
          top: 0;
          right: 0;
          width: 20px;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4));
          border-radius: 999px;
        }

        /* Sub text */
        .ut-sub {
          font-size: 12px;
          font-weight: 500;
          font-family: 'Inter', sans-serif;
        }

        .ut-sub.success {
          color: #22c55e;
        }

        .ut-sub.error {
          color: #ef4444;
        }
      `}</style>
    </>
  );
}
