import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Eye, EyeOff, Shield, LogOut, CheckCircle2, User, HelpCircle, Lock,
  FolderHeart, Bookmark, Archive, FileText, Download, ShoppingBag, Loader2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';

export default function Settings() {
  const { user, logout, updateUserData } = useAuth();
  const navigate = useNavigate();

  const [showWebsite, setShowWebsite] = useState(true);
  const [showLocation, setShowLocation] = useState(true);
  const [showDob, setShowDob] = useState(true);
  const [showJoinedDate, setShowJoinedDate] = useState(true);
  const [showProfession, setShowProfession] = useState(true);
  const [showGender, setShowGender] = useState(true);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(''); // 'saving', 'saved', 'error'

  // Change password modal states
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');
  const [pwChanging, setPwChanging] = useState(false);

  // Blocklist states
  const [blockedUsers, setBlockedUsers] = useState([]);

  // Library content states and fetching moved to standalone sub-pages

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPwError('');
    setPwSuccess('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPwError('Please fill out all fields');
      return;
    }

    if (newPassword.length < 6) {
      setPwError('New password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPwError('New passwords do not match');
      return;
    }

    setPwChanging(true);
    try {
      const res = await client.post('/users/change-password', {
        currentPassword,
        newPassword
      });
      if (res.data.success) {
        setPwSuccess('Password updated successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => {
          setShowPasswordModal(false);
          setPwSuccess('');
        }, 1500);
      }
    } catch (err) {
      console.error(err);
      setPwError(err.response?.data?.message || 'Incorrect current password.');
    } finally {
      setPwChanging(false);
    }
  };

  useEffect(() => {
    const fetchSettings = async () => {
      if (!user?.username) return;
      try {
        const res = await client.get(`/users/${user.username}`);
        if (res.data.success) {
          const profile = res.data.data;
          const controls = profile.profileVisibilityControls || {
            showWebsite: true,
            showLocation: true,
            showDob: true,
            showJoinedDate: true,
            showProfession: true,
            showGender: true,
          };
          setShowWebsite(controls.showWebsite !== false);
          setShowLocation(controls.showLocation !== false);
          setShowDob(controls.showDob !== false);
          setShowJoinedDate(controls.showJoinedDate !== false);
          setShowProfession(controls.showProfession !== false);
          setShowGender(controls.showGender !== false);
          setBlockedUsers(profile.blockedUsers || []);
        }
      } catch (err) {
        console.error('Error fetching settings:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [user]);

  const handleToggle = async (settingName, currentValue, setter) => {
    const newValue = !currentValue;
    setter(newValue);
    setSaveStatus('saving');

    // Create current values map
    const updatedControls = {
      showWebsite: settingName === 'showWebsite' ? newValue : showWebsite,
      showLocation: settingName === 'showLocation' ? newValue : showLocation,
      showDob: settingName === 'showDob' ? newValue : showDob,
      showJoinedDate: settingName === 'showJoinedDate' ? newValue : showJoinedDate,
      showProfession: settingName === 'showProfession' ? newValue : showProfession,
      showGender: settingName === 'showGender' ? newValue : showGender,
    };

    const formData = new FormData();
    formData.append('showWebsite', updatedControls.showWebsite);
    formData.append('showLocation', updatedControls.showLocation);
    formData.append('showDob', updatedControls.showDob);
    formData.append('showJoinedDate', updatedControls.showJoinedDate);
    formData.append('showProfession', updatedControls.showProfession);
    formData.append('showGender', updatedControls.showGender);

    try {
      const res = await client.put('/users/me', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data.success) {
        updateUserData(res.data.data);
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus(''), 1500);
      } else {
        setSaveStatus('error');
      }
    } catch (err) {
      console.error('Error saving settings:', err);
      setSaveStatus('error');
      setter(currentValue); // Rollback state on error
      setTimeout(() => setSaveStatus(''), 2000);
    }
  };



  const handleLogoutClick = () => {
    if (window.confirm('Are you sure you want to log out?')) {
      logout();
      navigate('/login');
    }
  };

  return (
    <div className="settings-page animate-fade">
      {/* Header bar */}
      <header className="settings-header">
        <button className="back-btn" onClick={() => navigate('/profile')} aria-label="Back">
          <ArrowLeft size={20} />
        </button>
        <span className="settings-header-title">Settings</span>
        <div className="header-status-indicator">
          {saveStatus === 'saving' && <span className="status-badge saving">Saving...</span>}
          {saveStatus === 'saved' && <span className="status-badge saved"><CheckCircle2 size={12} /> Saved</span>}
          {saveStatus === 'error' && <span className="status-badge error">Error saving</span>}
        </div>
      </header>

      <main className="settings-body">
        {loading ? (
          <div className="settings-loader">
            <div className="spinner"></div>
            <p>Loading settings...</p>
          </div>
        ) : (
          <div className="settings-container">
            {/* Section 1: Visibility Settings */}
            <div className="settings-section">
              <div className="section-header">
                <Eye size={18} className="section-icon text-indigo" />
                <h3 className="section-title">Profile Visibility Controls</h3>
              </div>
              <p className="section-desc">Choose what details you want to show or hide on your public profile card.</p>

              <div className="settings-card">
                <div className="settings-row">
                  <div className="row-info">
                    <span className="row-label">Show Website Link</span>
                    <span className="row-desc">Display your website link to other visitors</span>
                  </div>
                  <label className="switch">
                    <input 
                      type="checkbox" 
                      checked={showWebsite} 
                      onChange={() => handleToggle('showWebsite', showWebsite, setShowWebsite)} 
                    />
                    <span className="slider"></span>
                  </label>
                </div>

                <div className="settings-row">
                  <div className="row-info">
                    <span className="row-label">Show Location</span>
                    <span className="row-desc">Show your city/location on your profile</span>
                  </div>
                  <label className="switch">
                    <input 
                      type="checkbox" 
                      checked={showLocation} 
                      onChange={() => handleToggle('showLocation', showLocation, setShowLocation)} 
                    />
                    <span className="slider"></span>
                  </label>
                </div>

                <div className="settings-row">
                  <div className="row-info">
                    <span className="row-label">Show Date of Birth</span>
                    <span className="row-desc">Make your birth date visible to other users</span>
                  </div>
                  <label className="switch">
                    <input 
                      type="checkbox" 
                      checked={showDob} 
                      onChange={() => handleToggle('showDob', showDob, setShowDob)} 
                    />
                    <span className="slider"></span>
                  </label>
                </div>

                <div className="settings-row">
                  <div className="row-info">
                    <span className="row-label">Show Joined Date</span>
                    <span className="row-desc">Display the month and year you joined Oravia</span>
                  </div>
                  <label className="switch">
                    <input 
                      type="checkbox" 
                      checked={showJoinedDate} 
                      onChange={() => handleToggle('showJoinedDate', showJoinedDate, setShowJoinedDate)} 
                    />
                    <span className="slider"></span>
                  </label>
                </div>

                <div className="settings-row">
                  <div className="row-info">
                    <span className="row-label">Show Profession</span>
                    <span className="row-desc">Display your profession details on your profile</span>
                  </div>
                  <label className="switch">
                    <input 
                      type="checkbox" 
                      checked={showProfession} 
                      onChange={() => handleToggle('showProfession', showProfession, setShowProfession)} 
                    />
                    <span className="slider"></span>
                  </label>
                </div>

                <div className="settings-row">
                  <div className="row-info">
                    <span className="row-label">Show Gender</span>
                    <span className="row-desc">Display your gender on your profile</span>
                  </div>
                  <label className="switch">
                    <input 
                      type="checkbox" 
                      checked={showGender} 
                      onChange={() => handleToggle('showGender', showGender, setShowGender)} 
                    />
                    <span className="slider"></span>
                  </label>
                </div>
              </div>
            </div>

            {/* Section 2: Privacy & Security */}
            <div className="settings-section">
              <div className="section-header">
                <Lock size={18} className="section-icon text-indigo" />
                <h3 className="section-title">Privacy & Security</h3>
              </div>
              <p className="section-desc">Manage blocked profiles and account protection.</p>

              <div className="settings-card">
                <div className="settings-row clickable" onClick={() => setShowBlocklistModal(true)}>
                  <div className="row-info">
                    <span className="row-label">Blocked Accounts</span>
                    <span className="row-desc">View and manage profiles you blocked</span>
                  </div>
                  <span style={{ fontSize: '12.5px', color: '#71717a', fontWeight: '600' }}>
                    {blockedUsers.length} blocked
                  </span>
                </div>
              </div>
            </div>

            {/* Section: My Library & Content */}
            <div className="settings-section">
              <div className="section-header">
                <Bookmark size={18} className="section-icon text-indigo" />
                <h3 className="section-title">My Library & Content</h3>
              </div>
              <p className="section-desc">Access your wishlist, saved posts, drafts, and archived posts.</p>

              <div className="settings-card">
                <div className="settings-row clickable" onClick={() => navigate('/settings/wishlist')}>
                  <div className="row-info">
                    <span className="row-label">Wishlist</span>
                    <span className="row-desc">View and manage your saved products</span>
                  </div>
                  <FolderHeart size={16} className="arrow-indicator text-indigo" />
                </div>

                <div className="settings-row clickable" onClick={() => navigate('/settings/saved')}>
                  <div className="row-info">
                    <span className="row-label">Saved Posts</span>
                    <span className="row-desc">Posts you bookmarked for later</span>
                  </div>
                  <Bookmark size={16} className="arrow-indicator text-indigo" />
                </div>

                <div className="settings-row clickable" onClick={() => navigate('/settings/archive')}>
                  <div className="row-info">
                    <span className="row-label">Archived Posts</span>
                    <span className="row-desc">Your posts hidden from public timeline</span>
                  </div>
                  <Archive size={16} className="arrow-indicator text-indigo" />
                </div>

                <div className="settings-row clickable" onClick={() => navigate('/settings/drafts')}>
                  <div className="row-info">
                    <span className="row-label">Drafts</span>
                    <span className="row-desc">Resume writing your unsaved posts</span>
                  </div>
                  <FileText size={16} className="arrow-indicator text-indigo" />
                </div>
              </div>
            </div>

            {/* Section 3: Account Actions */}
            <div className="settings-section">
              <div className="section-header">
                <Shield size={18} className="section-icon text-indigo" />
                <h3 className="section-title">Account Settings</h3>
              </div>

              <div className="settings-card">
                <div className="settings-row clickable" onClick={() => navigate('/edit-profile')}>
                  <div className="row-info">
                    <span className="row-label">Edit Profile Details</span>
                    <span className="row-desc">Update your display name, bio, avatar, and cover</span>
                  </div>
                  <User size={16} className="arrow-indicator" />
                </div>

                <div className="settings-row clickable" onClick={() => setShowPasswordModal(true)}>
                  <div className="row-info">
                    <span className="row-label">Change Password</span>
                    <span className="row-desc">Keep your account secure with a new password</span>
                  </div>
                  <Lock size={16} className="arrow-indicator" />
                </div>

                <div className="settings-row clickable logout-row" onClick={handleLogoutClick}>
                  <div className="row-info">
                    <span className="row-label text-danger">Log Out</span>
                    <span className="row-desc text-muted">Sign out of your account on this device</span>
                  </div>
                  <LogOut size={16} className="text-danger" />
                </div>
              </div>
            </div>

            {/* Change Password Modal */}
            {showPasswordModal && (
              <div className="modal-overlay">
                <div className="settings-modal animate-fade-in">
                  <div className="modal-header">
                    <h3 className="modal-title">Change Password</h3>
                    <button className="modal-close-btn" onClick={() => { setShowPasswordModal(false); setPwError(''); setPwSuccess(''); }}>&times;</button>
                  </div>
                  <form onSubmit={handlePasswordChange}>
                    <div className="modal-body">
                      {pwError && <div className="modal-error-msg">{pwError}</div>}
                      {pwSuccess && <div className="modal-success-msg">{pwSuccess}</div>}

                      <div className="modal-form-group pw-modal-group">
                        <label className="modal-input-label">Current Password</label>
                        <input
                          type="password"
                          className="modal-input-field pw-modal-input"
                          placeholder="Enter current password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          required
                        />
                      </div>

                      <div className="modal-form-group pw-modal-group">
                        <label className="modal-input-label">New Password</label>
                        <input
                          type="password"
                          className="modal-input-field pw-modal-input"
                          placeholder="Min. 6 characters"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          required
                        />
                      </div>

                      <div className="modal-form-group pw-modal-group">
                        <label className="modal-input-label">Confirm New Password</label>
                        <input
                          type="password"
                          className="modal-input-field pw-modal-input"
                          placeholder="Re-enter new password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <div className="modal-footer">
                      <button
                        type="button"
                        className="modal-btn-cancel"
                        onClick={() => { setShowPasswordModal(false); setPwError(''); setPwSuccess(''); }}
                        disabled={pwChanging}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="modal-btn-submit"
                        disabled={pwChanging}
                      >
                        {pwChanging ? 'Changing...' : 'Change Password'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
            {/* About Section */}
            <div className="settings-footer">
              <HelpCircle size={16} />
              <span>Oravia v1.2.0 • Secured connection</span>
            </div>
          </div>
        )}
      </main>

      <style>{`
        .settings-page {
          min-height: 100vh;
          background-color: #000000;
          color: #ffffff;
          padding-top: 60px;
          padding-bottom: 80px;
          font-family: 'Outfit', sans-serif;
        }

        .settings-header {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: 60px;
          background: rgba(0, 0, 0, 0.85);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          align-items: center;
          padding: 0 16px;
          z-index: 100;
          justify-content: space-between;
        }

        .back-btn {
          background: none;
          border: none;
          color: #ffffff;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 8px;
          border-radius: 50%;
          transition: background-color 0.2s;
        }

        .back-btn:hover {
          background-color: rgba(255, 255, 255, 0.08);
        }

        .settings-header-title {
          font-weight: 700;
          font-size: 16px;
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
        }

        .header-status-indicator {
          display: flex;
          align-items: center;
          font-size: 11px;
        }

        .status-badge {
          padding: 3px 8px;
          border-radius: 12px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .status-badge.saving {
          background: rgba(255, 255, 255, 0.08);
          color: #a1a1aa;
        }

        .status-badge.saved {
          background: rgba(16, 185, 129, 0.15);
          color: #10b981;
          border: 1px solid rgba(16, 185, 129, 0.2);
        }

        .status-badge.error {
          background: rgba(239, 68, 68, 0.15);
          color: #ef4444;
          border: 1px solid rgba(239, 68, 68, 0.2);
        }

        .settings-body {
          max-width: 600px;
          margin: 0 auto;
          padding: 16px;
        }

        .settings-loader {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 100px 0;
          color: #a1a1aa;
          gap: 12px;
        }

        .settings-container {
          display: flex;
          flex-direction: column;
          gap: 28px;
        }

        .settings-section {
          display: flex;
          flex-direction: column;
        }

        .section-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 6px;
        }

        .section-icon {
          color: var(--accent-indigo);
        }

        .section-title {
          font-size: 15px;
          font-weight: 700;
          margin: 0;
          color: #ffffff;
        }

        .section-desc {
          font-size: 12px;
          color: #71717a;
          margin: 0 0 14px 0;
          padding-left: 26px;
        }

        .settings-card {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 16px;
          overflow: hidden;
        }

        .settings-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.04);
        }

        .settings-row:last-child {
          border-bottom: none;
        }

        .settings-row.clickable {
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .settings-row.clickable:hover {
          background-color: rgba(255, 255, 255, 0.04);
        }

        .row-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
          max-width: 80%;
        }

        .row-label {
          font-size: 14px;
          font-weight: 600;
          color: #ffffff;
        }

        .row-desc {
          font-size: 11px;
          color: #71717a;
        }

        .arrow-indicator {
          color: #71717a;
        }

        .text-danger {
          color: #ef4444 !important;
        }

        .text-muted {
          color: #71717a !important;
        }

        /* Toggle switches */
        .switch {
          position: relative;
          display: inline-block;
          width: 44px;
          height: 24px;
        }

        .switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #3f3f46;
          transition: .3s cubic-bezier(0.25, 0.8, 0.25, 1);
          border-radius: 24px;
        }

        .slider:before {
          position: absolute;
          content: "";
          height: 18px;
          width: 18px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          transition: .3s cubic-bezier(0.25, 0.8, 0.25, 1);
          border-radius: 50%;
        }

        input:checked + .slider {
          background-color: var(--accent-indigo);
        }

        input:checked + .slider:before {
          transform: translateX(20px);
        }

        .settings-footer {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          color: #3f3f46;
          font-size: 11px;
          margin-top: 20px;
          font-weight: 500;
        }

        .spinner {
          width: 32px;
          height: 32px;
          border: 3px solid rgba(255, 255, 255, 0.05);
          border-top: 3px solid var(--accent-indigo);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        /* Modal Overlay & Dialog styles */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 999;
          padding: 20px;
        }

        .settings-modal {
          background: #0a0a0a;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          width: 100%;
          max-width: 400px;
          box-shadow: 0 24px 64px rgba(0, 0, 0, 0.9);
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }

        .modal-title {
          font-size: 15px;
          font-weight: 700;
          margin: 0;
          font-family: 'Outfit', sans-serif;
        }

        .modal-close-btn {
          background: none;
          border: none;
          color: #71717a;
          font-size: 24px;
          cursor: pointer;
          line-height: 1;
          padding: 4px;
        }

        .modal-close-btn:hover {
          color: #ffffff;
        }

        .modal-body {
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .modal-form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .modal-input-label {
          font-size: 12px;
          font-weight: 600;
          color: #a1a1aa;
        }

        .modal-input-field {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: #ffffff;
          padding: 10px 14px;
          border-radius: 12px;
          font-size: 13px;
          outline: none;
          font-family: 'Inter', sans-serif;
          transition: border-color 0.2s;
        }

        .modal-input-field:focus {
          border-color: var(--accent-indigo);
        }

        .pw-modal-group {
          position: relative;
        }

        .pw-modal-input {
          padding-right: 42px;
        }

        .pw-modal-toggle {
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

        .pw-modal-toggle:hover {
          color: #a1a1aa;
        }

        .modal-error-msg {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: #ef4444;
          padding: 10px 12px;
          border-radius: 10px;
          font-size: 12px;
          font-weight: 500;
        }

        .modal-success-msg {
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.2);
          color: #10b981;
          padding: 10px 12px;
          border-radius: 10px;
          font-size: 12px;
          font-weight: 500;
        }

        .modal-footer {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 12px;
          padding: 16px 20px;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          background: rgba(255, 255, 255, 0.01);
        }

        .modal-btn-cancel {
          background: none;
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #ffffff;
          padding: 8px 16px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .modal-btn-cancel:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.04);
        }

        .modal-btn-submit {
          background: var(--accent-indigo);
          border: none;
          color: #ffffff;
          padding: 8px 16px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: opacity 0.2s;
        }

        .modal-btn-submit:hover:not(:disabled) {
          opacity: 0.9;
        }

        .modal-btn-submit:disabled, .modal-btn-cancel:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .animate-fade-in {
          animation: modalFadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes modalFadeIn {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
