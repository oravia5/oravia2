import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';

export default function VerifyOTP() {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(60);
  const [resendStatus, setResendStatus] = useState('');

  const { verifyOTP } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Get email from router navigation state (or default placeholder)
  const email = location.state?.email || localStorage.getItem('oravia_pending_email') || '';

  useEffect(() => {
    if (!email) {
      setError('No email found. Redirecting to registration...');
      setTimeout(() => navigate('/register'), 3000);
    } else {
      // Persist in localStorage in case page reload occurs during verification
      localStorage.setItem('oravia_pending_email', email);
    }
  }, [email, navigate]);

  // Resend cooldown timer hook
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (code.length !== 6) {
      setError('Please enter a 6-digit verification code');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await verifyOTP(email, code);
      if (res.success) {
        localStorage.removeItem('oravia_pending_email');
        navigate('/');
      } else {
        setError(res.message || 'OTP verification failed');
      }
    } catch (err) {
      setError('Verification failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;

    setError('');
    setResendStatus('Sending new OTP code...');

    try {
      const res = await client.post('/auth/login', {
        emailOrUsername: email,
        password: 'dummy_trigger_resend_via_login' // The backend login detects unverified and triggers a resend
      });
    } catch (err) {
      // Backend auth.controller will return 403 with isUnverified: true and send the mail
      if (err.response?.status === 403 && err.response?.data?.isUnverified) {
        setResendStatus('A new OTP has been successfully sent to your email.');
        setResendCooldown(60);
      } else {
        setError('Failed to resend code. Please try logging in again.');
      }
    }
  };

  return (
    <div className="otp-page-wrapper">
      <div className="otp-container-box">
        <div className="brand-logo">ORAVIA</div>

        <h2>Verify Your Email</h2>
        <p className="otp-desc">
          We sent a 6-digit verification code to <span className="email-highlight">{email}</span>
        </p>
        <div className="otp-spam-note">
          Didn't get the code? Please check your <strong>Spam or Junk folder</strong> too.
        </div>

        {error && <div className="otp-alert error">{error}</div>}
        {resendStatus && <div className="otp-alert success">{resendStatus}</div>}

        <form onSubmit={handleSubmit} className="otp-form">
          <div className="otp-input-field">
            <input
              type="text"
              maxLength="6"
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              className="otp-code-input"
              disabled={loading}
              autoFocus
            />
          </div>

          <button type="submit" className="btn-primary otp-submit-btn" disabled={loading || code.length !== 6}>
            {loading ? 'Verifying...' : 'Verify & Continue'}
          </button>
        </form>

        <div className="otp-footer">
          {resendCooldown > 0 ? (
            <span className="cooldown-text">Resend code in {resendCooldown}s</span>
          ) : (
            <button onClick={handleResend} className="resend-link-btn">Resend OTP code</button>
          )}
        </div>
      </div>

      <style>{`
        .otp-page-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          background-color: #000000;
          color: #ffffff;
          padding: 20px;
          animation: fadeIn 0.4s ease-out;
        }

        .otp-container-box {
          width: 100%;
          max-width: 400px;
          background: #0a0a0a;
          border: 1px solid #222222;
          border-radius: 20px;
          padding: 40px 30px;
          text-align: center;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.8);
        }

        .brand-logo {
          font-family: 'Outfit', sans-serif;
          font-size: 28px;
          font-weight: 800;
          letter-spacing: -0.03em;
          margin-bottom: 24px;
          color: #ffffff;
        }

        h2 {
          font-size: 22px;
          font-weight: 700;
          margin-bottom: 8px;
        }

        .otp-desc {
          font-size: 14px;
          color: #a1a1aa;
          line-height: 1.5;
          margin-bottom: 10px;
        }

        .otp-spam-note {
          font-size: 13px;
          color: #fbbf24;
          line-height: 1.5;
          margin-bottom: 28px;
          background-color: rgba(251, 191, 36, 0.1);
          border: 1px solid rgba(251, 191, 36, 0.25);
          border-radius: 8px;
          padding: 10px 14px;
          font-weight: 600;
        }

        .email-highlight {
          color: #ffffff;
          font-weight: 600;
        }

        .otp-alert {
          font-size: 13px;
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 20px;
          text-align: left;
          line-height: 1.4;
          animation: slideDown 0.25s ease-out;
        }

        .otp-alert.error {
          background-color: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: #f87171;
        }

        .otp-alert.success {
          background-color: rgba(34, 197, 94, 0.1);
          border: 1px solid rgba(34, 197, 94, 0.2);
          color: #4ade80;
        }

        .otp-form {
          margin-bottom: 24px;
        }

        .otp-input-field {
          margin-bottom: 24px;
        }

        .otp-code-input {
          width: 100%;
          background-color: #121212;
          border: 1px solid #333333;
          border-radius: 12px;
          padding: 16px;
          font-size: 36px;
          font-weight: 800;
          text-align: center;
          color: #ffffff;
          letter-spacing: 0.25em;
          transition: all 0.2s;
        }

        .otp-code-input:focus {
          outline: none;
          border-color: #ffffff;
          background-color: #161616;
          box-shadow: 0 0 0 1px #ffffff;
        }

        .otp-submit-btn {
          width: 100%;
          padding: 14px;
          border-radius: 12px;
        }

        .otp-footer {
          font-size: 13px;
          color: #71717a;
        }

        .resend-link-btn {
          background: none;
          border: none;
          color: #ffffff;
          font-weight: 600;
          cursor: pointer;
          padding: 4px 8px;
          transition: opacity 0.2s;
        }

        .resend-link-btn:hover {
          text-decoration: underline;
        }

        .cooldown-text {
          color: #52525b;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
