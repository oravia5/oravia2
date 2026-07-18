import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Sparkles, Mail, Lock, AlertCircle, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!emailOrUsername || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');

    const res = await login(emailOrUsername, password);
    if (res.success) {
      // Redirect admin users to admin dashboard
      if (res.user && (res.user.role === 'admin' || res.user.role === 'superadmin')) {
        navigate('/admin');
      } else {
        navigate('/');
      }
    } else {
      if (res.isUnverified) {
        // Redirect to OTP verification page and pass the email
        navigate('/verify-otp', { state: { email: res.email } });
      } else {
        setError(res.message);
        setLoading(false);
      }
    }
  };

  return (
    <div className="auth-page animate-fade">
      <div className="auth-card glass-panel">
        {/* Logo and Brand */}
        <div className="auth-logo-section">
          <div className="logo-glow">
            <Sparkles size={36} className="logo-icon" />
          </div>
          <h1>Oravia</h1>
          <p className="auth-subtitle">Connecting moments that matter</p>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="auth-error-banner">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="auth-label">Username or Email</label>
            <div className="input-with-icon">
              <Mail size={18} className="input-icon" />
              <input
                type="text"
                className="input-field auth-input"
                placeholder="Enter username or email"
                value={emailOrUsername}
                onChange={(e) => setEmailOrUsername(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-group">
            <div className="label-row">
              <label className="auth-label">Password</label>
              <Link to="/forgot-password" className="forgot-password-link">Forgot?</Link>
            </div>
            <div className="input-with-icon">
              <Lock size={18} className="input-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                className="input-field auth-input auth-input-password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
              <button type="button" className="password-toggle-btn" tabIndex={-1} onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn-primary auth-submit-btn" disabled={loading}>
            {loading ? (
              <span>Signing In...</span>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        {/* Register Redirect */}
        <div className="auth-footer">
          <p>
            Don't have an account? <Link to="/register">Sign Up</Link>
          </p>
        </div>
      </div>

      <style>{`
        .auth-page {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          background-color: #000000;
          padding: 20px;
        }

        .auth-card {
          width: 100%;
          max-width: 400px;
          background: #0a0a0a;
          border: 1px solid #222222;
          border-radius: 24px;
          padding: 40px 30px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.8);
        }

        .auth-logo-section {
          text-align: center;
          margin-bottom: 32px;
        }

        .logo-glow {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 64px;
          height: 64px;
          border-radius: 20px;
          background: #111111;
          border: 1px solid #333333;
          margin-bottom: 16px;
        }

        .logo-icon {
          color: #ffffff;
          filter: drop-shadow(0 0 4px rgba(255, 255, 255, 0.5));
        }

        .auth-logo-section h1 {
          font-family: 'Outfit', sans-serif;
          font-size: 32px;
          font-weight: 800;
          letter-spacing: -0.03em;
          color: #ffffff;
          margin-bottom: 6px;
        }

        .auth-subtitle {
          font-size: 14px;
          color: #a1a1aa;
        }

        .auth-error-banner {
          display: flex;
          align-items: center;
          gap: 10px;
          background-color: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: #f87171;
          padding: 12px 16px;
          border-radius: 12px;
          margin-bottom: 24px;
          font-size: 13px;
        }

        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .label-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .auth-label {
          font-size: 12px;
          font-weight: 600;
          color: #71717a;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .forgot-password-link {
          font-size: 12px;
          color: #a1a1aa;
          text-decoration: none;
          font-weight: 500;
        }

        .forgot-password-link:hover {
          color: #ffffff;
          text-decoration: underline;
        }

        .input-with-icon {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-icon {
          position: absolute;
          left: 14px;
          color: #52525b;
          pointer-events: none;
        }

        .auth-input {
          width: 100%;
          padding: 12px 14px 12px 42px;
          font-size: 14px;
        }

        .auth-input-password {
          padding-right: 42px;
        }

        .password-toggle-btn {
          position: absolute;
          right: 12px;
          background: none;
          border: none;
          color: #52525b;
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .password-toggle-btn:hover {
          color: #a1a1aa;
        }

        .auth-submit-btn {
          width: 100%;
          padding: 14px;
          border-radius: 12px;
          margin-top: 10px;
        }

        .auth-footer {
          text-align: center;
          margin-top: 28px;
          border-top: 1px solid #1c1c1c;
          padding-top: 20px;
          font-size: 14px;
          color: #71717a;
        }

        .auth-footer a {
          color: #ffffff;
          text-decoration: none;
          font-weight: 600;
          margin-left: 4px;
        }

        .auth-footer a:hover {
          text-decoration: underline;
        }

        .animate-fade {
          animation: fadeIn 0.4s ease-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
