import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function ForgotPassword() {
  const [step, setStep] = useState(1); // Step 1: Email Request, Step 2: OTP & Reset Password
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { forgotPassword, resetPassword } = useAuth();
  const navigate = useNavigate();

  // Handle email submission (Step 1)
  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setError('');
    setLoading(true);
    
    try {
      const res = await forgotPassword(email);
      if (res.success) {
        setStatusMessage('A verification code has been sent to your email.');
        setStep(2);
      } else {
        setError(res.message || 'Email submission failed.');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle password reset submission (Step 2)
  const handleResetSubmit = async (e) => {
    e.preventDefault();
    
    if (code.length !== 6) {
      setError('Please enter the 6-digit OTP code');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setError('');
    setStatusMessage('');
    setLoading(true);

    try {
      const res = await resetPassword(email, code, newPassword);
      if (res.success) {
        setStatusMessage('Your password has been successfully reset. Redirecting...');
        setTimeout(() => navigate('/login'), 2500);
      } else {
        setError(res.message || 'Failed to reset password.');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reset-page-wrapper">
      <div className="reset-container-box">
        <div className="brand-logo">ORAVIA</div>
        
        <h2>Reset Password</h2>
        
        {error && <div className="reset-alert error">{error}</div>}
        {statusMessage && <div className="reset-alert success">{statusMessage}</div>}

        {step === 1 ? (
          <form onSubmit={handleEmailSubmit} className="reset-form fade-in">
            <p className="reset-desc">
              Enter your registered email address below, and we will mail you a 6-digit OTP code to reset your password.
            </p>
            
            <div className="input-group">
              <label>Email Address</label>
              <input
                type="email"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="reset-input"
                disabled={loading}
              />
            </div>

            <button type="submit" className="btn-primary reset-submit-btn" disabled={loading}>
              {loading ? 'Sending code...' : 'Send OTP Reset Code'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetSubmit} className="reset-form slide-left">
            <p className="reset-desc">
              Please enter the 6-digit verification code sent to <span className="email-highlight">{email}</span> and configure your new account password.
            </p>

            <div className="input-group">
              <label>6-Digit OTP Code</label>
              <input
                type="text"
                maxLength="6"
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                required
                className="reset-input otp-code-field"
                disabled={loading}
              />
            </div>

            <div className="input-group pw-input-group">
              <label>New Password</label>
              <input
                type={showNewPassword ? 'text' : 'password'}
                placeholder="Minimum 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="reset-input reset-input-password"
                disabled={loading}
              />
              <button type="button" className="password-toggle-btn" tabIndex={-1} onClick={() => setShowNewPassword(!showNewPassword)}>
                {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <div className="input-group pw-input-group">
              <label>Confirm New Password</label>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="reset-input reset-input-password"
                disabled={loading}
              />
              <button type="button" className="password-toggle-btn" tabIndex={-1} onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <button type="submit" className="btn-primary reset-submit-btn" disabled={loading}>
              {loading ? 'Updating password...' : 'Update Password'}
            </button>
            
            <button 
              type="button" 
              onClick={() => { setStep(1); setError(''); setStatusMessage(''); }} 
              className="back-btn" 
              disabled={loading}
            >
              Back to email entry
            </button>
          </form>
        )}

        <div className="reset-footer">
          Remember your password? <Link to="/login" className="login-link">Login here</Link>
        </div>
      </div>

      <style>{`
        .reset-page-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          background-color: #000000;
          color: #ffffff;
          padding: 20px;
          animation: fadeIn 0.4s ease-out;
        }

        .reset-container-box {
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
          margin-bottom: 12px;
        }

        .reset-desc {
          font-size: 13px;
          color: #a1a1aa;
          line-height: 1.5;
          margin-bottom: 24px;
          text-align: left;
        }

        .email-highlight {
          color: #ffffff;
          font-weight: 600;
        }

        .reset-alert {
          font-size: 13px;
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 20px;
          text-align: left;
          line-height: 1.4;
        }

        .reset-alert.error {
          background-color: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: #f87171;
          animation: shake 0.2s ease-in-out;
        }

        .reset-alert.success {
          background-color: rgba(34, 197, 94, 0.1);
          border: 1px solid rgba(34, 197, 94, 0.2);
          color: #4ade80;
        }

        .input-group {
          margin-bottom: 18px;
          text-align: left;
        }

        .pw-input-group {
          position: relative;
        }

        .reset-input-password {
          padding-right: 42px;
        }

        .password-toggle-btn {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(25%);
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

        .input-group label {
          display: block;
          font-size: 12px;
          font-weight: 500;
          color: #71717a;
          margin-bottom: 6px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .reset-input {
          width: 100%;
          background-color: #121212;
          border: 1px solid #333333;
          border-radius: 10px;
          padding: 12px 14px;
          font-size: 14px;
          color: #ffffff;
          transition: all 0.2s;
        }

        .reset-input:focus {
          outline: none;
          border-color: #ffffff;
          background-color: #161616;
          box-shadow: 0 0 0 1px #ffffff;
        }

        .otp-code-field {
          text-align: center;
          font-size: 20px;
          letter-spacing: 0.15em;
          font-weight: 700;
        }

        .reset-submit-btn {
          width: 100%;
          padding: 13px;
          border-radius: 12px;
          margin-top: 10px;
          margin-bottom: 12px;
        }

        .back-btn {
          background: none;
          border: 1px solid #222222;
          color: #a1a1aa;
          font-weight: 500;
          width: 100%;
          padding: 10px;
          border-radius: 12px;
          cursor: pointer;
          font-size: 13px;
          transition: all 0.2s;
          margin-bottom: 10px;
        }

        .back-btn:hover {
          color: #ffffff;
          border-color: #ffffff;
        }

        .reset-footer {
          font-size: 13px;
          color: #71717a;
          margin-top: 24px;
          border-top: 1px solid #1c1c1c;
          padding-top: 16px;
        }

        .login-link {
          color: #ffffff;
          text-decoration: none;
          font-weight: 600;
        }

        .login-link:hover {
          text-decoration: underline;
        }

        /* Animations */
        .fade-in {
          animation: fadeIn 0.3s ease-out;
        }

        .slide-left {
          animation: slideLeft 0.3s ease-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes slideLeft {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
      `}</style>
    </div>
  );
}
