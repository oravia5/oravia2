import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Sparkles, User, Mail, Lock, Phone, Camera, AlertCircle, ArrowRight, Check, X, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';
import OraviaLogo from '../components/OraviaLogo/OraviaLogo';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNSFW, setShowNSFW] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [usernameStatus, setUsernameStatus] = useState('idle'); // idle | checking | available | taken

  useEffect(() => {
    if (!username || username.length < 3) {
      setUsernameStatus('idle');
      return;
    }
    const timer = setTimeout(async () => {
      setUsernameStatus('checking');
      try {
        const res = await client.get(`/users/${username.trim().toLowerCase()}`);
        if (res.data.success) {
          setUsernameStatus('taken');
        } else {
          setUsernameStatus('available');
        }
      } catch (err) {
        if (err.response?.status === 404) {
          setUsernameStatus('available');
        } else {
          setUsernameStatus('idle');
        }
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [username]);



  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !email || !phone || !password || !confirmPassword) {
      setError('Please fill in all required fields');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError('');

    const payload = {
      username: username.trim().toLowerCase(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      password,
      displayName: displayName.trim() || username.trim(),
      showNSFW,
    };

    const res = await register(payload);
    if (res.success) {
      // Redirect to OTP verification page and pass the email
      navigate('/verify-otp', { state: { email: email.trim().toLowerCase() } });
    } else {
      setError(res.message);
      setLoading(false);
    }
  };

  return (
    <div className="auth-page animate-fade">
      <div className="auth-card glass-panel register-card">
        {/* Logo Section */}
        <div className="auth-logo-section">
          <div className="logo-glow">
            <OraviaLogo size={36} className="logo-icon" />
          </div>
          <h1>Create Account</h1>
          <p className="auth-subtitle">Join Oravia and connect moments that matter</p>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="auth-error-banner">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="auth-form">


          <div className="form-group">
            <label className="auth-label">Username *</label>
            <div className="input-with-icon">
              <User size={18} className="input-icon" />
              <input
                type="text"
                className="input-field auth-input"
                placeholder="Choose a unique username"
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/\s+/g, ''))}
                required
                disabled={loading}
                style={{ paddingRight: '36px' }}
              />
              {username.length >= 3 && (
                <span className="username-status-icon">
                  {usernameStatus === 'checking' && <div className="status-spinner" />}
                  {usernameStatus === 'available' && <Check size={16} className="status-available" />}
                  {usernameStatus === 'taken' && <X size={16} className="status-taken" />}
                </span>
              )}
            </div>
            {usernameStatus === 'taken' && (
              <span className="username-hint taken">Username already taken</span>
            )}
            {usernameStatus === 'available' && (
              <span className="username-hint available">Username available</span>
            )}
          </div>

          <div className="form-group">
            <label className="auth-label">Display Name</label>
            <div className="input-with-icon">
              <User size={18} className="input-icon" />
              <input
                type="text"
                className="input-field auth-input"
                placeholder="Your profile display name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="auth-label">Email Address *</label>
            <div className="input-with-icon">
              <Mail size={18} className="input-icon" />
              <input
                type="email"
                className="input-field auth-input"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="auth-label">Phone Number *</label>
            <div className="input-with-icon">
              <Phone size={18} className="input-icon" />
              <input
                type="tel"
                className="input-field auth-input"
                placeholder="Enter your phone number"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="auth-label">Password *</label>
            <div className="input-with-icon">
              <Lock size={18} className="input-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                className="input-field auth-input auth-input-password"
                placeholder="At least 6 characters"
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

          <div className="form-group">
            <label className="auth-label">Confirm Password *</label>
            <div className="input-with-icon">
              <Lock size={18} className="input-icon" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                className="input-field auth-input auth-input-password"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
              />
              <button type="button" className="password-toggle-btn" tabIndex={-1} onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '16px', marginBottom: '16px' }}>
            <input
              id="showNSFW"
              type="checkbox"
              checked={showNSFW}
              onChange={(e) => setShowNSFW(e.target.checked)}
              disabled={loading}
              style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#ffffff', backgroundColor: '#111', border: '1px solid #333', borderRadius: '4px' }}
            />
            <label className="auth-label" style={{ margin: 0, cursor: 'pointer', userSelect: 'none', fontSize: '13px', color: '#a1a1aa' }} htmlFor="showNSFW">
              Show NSFW / Mature Content (18+)
            </label>
          </div>

          <button type="submit" className="btn-primary auth-submit-btn" disabled={loading}>
            {loading ? (
              <span>Creating Account...</span>
            ) : (
              <>
                <span>Sign Up</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        {/* Login Redirect */}
        <div className="auth-footer">
          <p>
            Already have an account? <Link to="/login">Login</Link>
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
          padding: 20px 20px 40px 20px;
        }

        .auth-card {
          width: 100%;
          max-width: 420px;
          background: #0a0a0a;
          border: 1px solid #222222;
          border-radius: 24px;
          padding: 40px 30px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.8);
        }

        .auth-logo-section {
          text-align: center;
          margin-bottom: 28px;
        }

        .logo-glow {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 60px;
          height: 60px;
          border-radius: 18px;
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
          font-size: 28px;
          font-weight: 800;
          letter-spacing: -0.03em;
          color: #ffffff;
          margin-bottom: 6px;
        }

        .auth-subtitle {
          font-size: 13px;
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
          gap: 16px;
        }

        .avatar-upload-container {
          display: flex;
          justify-content: center;
          margin-bottom: 10px;
        }

        .avatar-placeholder {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          border: 2px dashed #333333;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: #71717a;
          cursor: pointer;
          gap: 6px;
          font-size: 11px;
          transition: all 0.2s;
        }

        .avatar-placeholder:hover {
          border-color: #ffffff;
          color: #ffffff;
        }

        .avatar-preview-img {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid #ffffff;
          cursor: pointer;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .auth-label {
          font-size: 11px;
          font-weight: 600;
          color: #71717a;
          text-transform: uppercase;
          letter-spacing: 0.05em;
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
          padding: 11px 14px 11px 42px;
          font-size: 14px;
        }

        .username-status-icon {
          position: absolute;
          right: 12px;
          display: flex;
          align-items: center;
        }
        .status-available { color: #22c55e; }
        .status-taken { color: #ef4444; }
        .status-spinner {
          width: 14px;
          height: 14px;
          border: 2px solid rgba(255,255,255,0.1);
          border-top-color: var(--accent-indigo);
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }
        .username-hint {
          font-size: 11px;
          margin-top: -4px;
        }
        .username-hint.taken { color: #ef4444; }
        .username-hint.available { color: #22c55e; }

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
          padding: 13px;
          border-radius: 12px;
          margin-top: 10px;
        }

        .auth-footer {
          text-align: center;
          margin-top: 24px;
          border-top: 1px solid #1c1c1c;
          padding-top: 16px;
          font-size: 13px;
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
