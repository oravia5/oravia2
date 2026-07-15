import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, AlertCircle, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';

const POPULAR_LOCATIONS = [
  'Mumbai, Maharashtra, India',
  'Delhi, NCR, India',
  'Bangalore, Karnataka, India',
  'Hyderabad, Telangana, India',
  'Ahmedabad, Gujarat, India',
  'Chennai, Tamil Nadu, India',
  'Kolkata, West Bengal, India',
  'Surat, Gujarat, India',
  'Pune, Maharashtra, India',
  'Jaipur, Rajasthan, India',
  'Lucknow, Uttar Pradesh, India',
  'Kanpur, Uttar Pradesh, India',
  'Indore, Madhya Pradesh, India',
  'Thane, Maharashtra, India',
  'Bhopal, Madhya Pradesh, India',
  'Visakhapatnam, Andhra Pradesh, India',
  'Pimpri-Chinchwad, Maharashtra, India',
  'Patna, Bihar, India',
  'Vadodara, Gujarat, India',
  'Ghaziabad, Uttar Pradesh, India',
  'Ludhiana, Punjab, India',
  'Coimbatore, Tamil Nadu, India',
  'Agra, Uttar Pradesh, India',
  'Madurai, Tamil Nadu, India',
  'Nashik, Maharashtra, India',
  'Faridabad, Haryana, India',
  'Meerut, Uttar Pradesh, India',
  'Rajkot, Gujarat, India',
  'Kalyan-Dombivli, Maharashtra, India',
  'Vasai-Virar, Maharashtra, India',
  'Varanasi, Uttar Pradesh, India',
  'Srinagar, Jammu and Kashmir, India',
  'Aurangabad, Maharashtra, India',
  'Dhanbad, Jharkhand, India',
  'Amritsar, Punjab, India',
  'Navi Mumbai, Maharashtra, India',
  'Allahabad, Uttar Pradesh, India',
  'Ranchi, Jharkhand, India',
  'Howrah, West Bengal, India',
  'Jabalpur, Madhya Pradesh, India',
  'Gwalior, Madhya Pradesh, India',
  'Vijayawada, Andhra Pradesh, India',
  'Jodhpur, Rajasthan, India',
  'Raipur, Chhattisgarh, India',
  'Kota, Rajasthan, India',
  'Guwahati, Assam, India',
  'Chandigarh, India',
  'Noida, Uttar Pradesh, India',
  'Gurgaon, Haryana, India',
  'New York City, NY, USA',
  'Los Angeles, CA, USA',
  'Chicago, IL, USA',
  'Houston, TX, USA',
  'London, United Kingdom',
  'Manchester, United Kingdom',
  'Paris, France',
  'Berlin, Germany',
  'Tokyo, Japan',
  'Singapore',
  'Dubai, United Arab Emirates',
  'Sydney, NSW, Australia',
  'Melbourne, VIC, Australia',
  'Toronto, ON, Canada',
  'Vancouver, BC, Canada'
];

export default function EditProfile() {
  const { user, updateUserData } = useAuth();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [website, setWebsite] = useState('');
  const [location, setLocation] = useState('');
  const [dob, setDob] = useState('');
  const [profession, setProfession] = useState('');
  const [gender, setGender] = useState('');
  const [showLocSuggestions, setShowLocSuggestions] = useState(false);

  // File uploads
  const [selectedAvatar, setSelectedAvatar] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [selectedCover, setSelectedCover] = useState(null);
  const [dbLocations, setDbLocations] = useState([]);

  const handleLocationInputChange = async (val) => {
    setLocation(val);
    setShowLocSuggestions(true);
    if (!val.trim()) {
      setDbLocations([]);
      return;
    }
    try {
      const res = await client.get(`/locations?q=${encodeURIComponent(val)}`);
      if (res.data.success) {
        setDbLocations(res.data.data);
      }
    } catch (err) {
      console.error('Error searching locations:', err);
    }
  };

  const handleLocationFocus = async () => {
    setShowLocSuggestions(true);
    if (location.trim()) {
      try {
        const res = await client.get(`/locations?q=${encodeURIComponent(location)}`);
        if (res.data.success) {
          setDbLocations(res.data.data);
        }
      } catch (err) {
        console.error('Error searching locations:', err);
      }
    }
  };
  const [coverPreview, setCoverPreview] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fileInputRef = useRef(null);
  const coverInputRef = useRef(null);

  const getFullMediaUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('/uploads/')) {
      return `http://127.0.0.1:5000${url}`;
    }
    return url;
  };

  // Fetch current user data to prefill form
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const res = await client.get(`/users/${user.username}`);
        if (res.data.success) {
          const profile = res.data.data;
          setDisplayName(profile.displayName || '');
          setBio(profile.bio || '');
          setWebsite(profile.website || '');
          setLocation(profile.location || '');
          setProfession(profile.profession || '');
          setGender(profile.gender || '');
          if (profile.dob) {
            setDob(new Date(profile.dob).toISOString().split('T')[0]);
          }
        }
      } catch (err) {
        console.error('Error fetching user profile for edit:', err);
        setError('Failed to fetch current profile details.');
      }
    };

    if (user?.username) {
      fetchUserData();
    }
  }, [user]);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedAvatar(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
    e.target.value = '';
  };

  const handleCoverChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedCover(file);
      setCoverPreview(URL.createObjectURL(file));
    }
    e.target.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    const formData = new FormData();
    formData.append('displayName', displayName.trim());
    formData.append('bio', bio.trim());
    formData.append('website', website.trim());
    formData.append('location', location.trim());
    formData.append('dob', dob);
    formData.append('profession', profession.trim());
    formData.append('gender', gender);
    

    if (selectedAvatar) {
      formData.append('avatar', selectedAvatar);
    }
    if (selectedCover) {
      formData.append('cover', selectedCover);
    }

    try {
      const res = await client.put('/users/me', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data.success) {
        updateUserData(res.data.data); // Update AuthContext / localStorage
        setSuccess('Profile updated successfully!');
        setTimeout(() => {
          navigate('/profile');
        }, 1200);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to update profile. Check file type and size.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="edit-profile-page animate-fade">
      {/* Header */}
      <header className="glass-header">
        <button className="back-nav-btn" onClick={() => navigate(-1)} aria-label="Go Back">
          <ArrowLeft size={20} />
        </button>
        <span className="edit-header-title">Edit Profile</span>
        <div style={{ width: '20px' }}></div>
      </header>

      {/* Form Body */}
      <main className="edit-profile-body">
        <form onSubmit={handleSubmit} className="edit-profile-form">
          {error && (
            <div className="error-banner">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="success-banner">
              <Sparkles size={18} />
              <span>{success}</span>
            </div>
          )}

          {/* Cover Photo Editing */}
          <div className="cover-edit-container">
            <label className="input-label">Cover Banner</label>
            <div className="cover-edit-frame" onClick={() => coverInputRef.current.click()}>
              {coverPreview ? (
                selectedCover?.type.startsWith('video/') ? (
                  <video src={coverPreview} className="cover-edit-img" autoPlay loop muted playsInline />
                ) : (
                  <img src={coverPreview} alt="Cover preview" className="cover-edit-img" />
                )
              ) : user?.coverUrl ? (
                // Helper checks url suffix for video types
                user.coverUrl.split('?')[0].toLowerCase().match(/\.(mp4|mov|webm|ogg)$/) ? (
                  <video src={getFullMediaUrl(user.coverUrl)} className="cover-edit-img" autoPlay loop muted playsInline />
                ) : (
                  <img src={getFullMediaUrl(user.coverUrl)} alt="Cover banner" className="cover-edit-img" />
                )
              ) : (
                <div className="cover-edit-placeholder" />
              )}
              <div className="cover-edit-overlay">
                <Camera size={20} />
                <span>Change Cover Photo/Video</span>
              </div>
            </div>
            <input 
              type="file" 
              ref={coverInputRef} 
              onChange={handleCoverChange} 
              accept="image/*,video/*" 
              style={{ display: 'none' }} 
            />
          </div>

          {/* Avatar Editing Frame */}
          <div className="avatar-edit-container">
            <label className="input-label" style={{ alignSelf: 'flex-start' }}>Profile Photo</label>
            <div className="avatar-edit-selector" onClick={() => fileInputRef.current.click()}>
              <img 
                src={avatarPreview || getFullMediaUrl(user?.avatarUrl) || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'} 
                alt="Avatar preview"
                className="avatar-edit-img" 
              />
              <div className="avatar-edit-overlay">
                <Camera size={22} />
              </div>
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleAvatarChange} 
              accept="image/*" 
              style={{ display: 'none' }} 
            />
            <span className="change-avatar-hint">Tap avatar to upload new photo</span>
          </div>

          <div className="form-group">
            <label className="input-label">Display Name</label>
            <input
              type="text"
              className="input-field"
              placeholder="Enter your display name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="input-label">Bio</label>
            <textarea
              className="input-field bio-textarea"
              placeholder="Tell others about yourself..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows="3"
            />
          </div>

          <div className="form-group">
            <label className="input-label">Website</label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. www.example.com"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ position: 'relative' }}>
            <label className="input-label">Location</label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. Kolkata, India"
              value={location}
              onChange={(e) => handleLocationInputChange(e.target.value)}
              onFocus={handleLocationFocus}
              onBlur={() => setTimeout(() => setShowLocSuggestions(false), 200)}
            />
            {showLocSuggestions && location.trim().length > 0 && (
              <div className="location-suggestions-dropdown" style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                background: '#121214',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '8px',
                maxHeight: '150px',
                overflowY: 'auto',
                zIndex: 9999,
                boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
              }}>
                {(dbLocations.length > 0 ? dbLocations.map(l => l.name) : POPULAR_LOCATIONS.filter(loc => loc.toLowerCase().includes(location.toLowerCase()))).map((loc, idx) => (
                  <div
                    key={idx}
                    onClick={() => { setLocation(loc); setShowLocSuggestions(false); }}
                    style={{ padding: '10px 14px', fontSize: '13px', cursor: 'pointer', borderBottom: '1px solid rgba(255, 255, 255, 0.03)', color: '#fff', textAlign: 'left' }}
                  >
                    {loc}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="input-label">Date of Birth</label>
            <input
              type="date"
              className="input-field"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="input-label">Profession</label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. Designer, Developer, Creator"
              value={profession}
              onChange={(e) => setProfession(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="input-label">Gender</label>
            <select
              className="input-field"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              style={{ background: 'rgba(255,255,255,0.03)', color: '#fff', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <option value="" style={{ background: '#121214' }}>Select Gender</option>
              <option value="Male" style={{ background: '#121214' }}>Male</option>
              <option value="Female" style={{ background: '#121214' }}>Female</option>
              <option value="Other" style={{ background: '#121214' }}>Other</option>
              <option value="Prefer not to say" style={{ background: '#121214' }}>Prefer not to say</option>
            </select>
          </div>





          <div className="action-buttons-group">
            <button 
              type="button" 
              className="cancel-btn" 
              onClick={() => navigate('/profile')}
              disabled={saving}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="submit-btn" 
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </main>

      <style>{`
        .edit-profile-page {
          width: 100%;
          min-height: 100vh;
          background-color: #000000;
          color: #ffffff;
        }

        .back-nav-btn {
          background: none;
          border: none;
          color: var(--text-primary);
          cursor: pointer;
          padding: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          transition: background-color 0.2s;
        }

        .back-nav-btn:active {
          background-color: var(--bg-tertiary);
        }

        .edit-header-title {
          font-family: 'Outfit', sans-serif;
          font-weight: 700;
          font-size: 16px;
        }

        .edit-profile-body {
          padding: 20px 16px 100px 16px;
        }

        .edit-profile-form {
          max-width: 480px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .error-banner, .success-banner {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          border-radius: 12px;
          font-size: 13.5px;
          line-height: 1.4;
          text-align: left;
        }

        .error-banner {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: #ef4444;
        }

        .success-banner {
          background: rgba(34, 197, 94, 0.1);
          border: 1px solid rgba(34, 197, 94, 0.2);
          color: #22c55e;
        }

        /* Cover Editor Styling */
        .cover-edit-container {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .cover-edit-frame {
          width: 100%;
          height: 140px;
          border-radius: 14px;
          position: relative;
          overflow: hidden;
          background-color: #111111;
          border: 1px dashed var(--border-color);
          cursor: pointer;
          transition: border-color 0.25s;
        }

        .cover-edit-frame:hover {
          border-color: var(--accent-indigo);
        }

        .cover-edit-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .cover-edit-placeholder {
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, #18181b 0%, #27272a 100%);
        }

        .cover-edit-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.45);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          color: #ffffff;
          font-size: 11.5px;
          opacity: 0.85;
          transition: opacity 0.2s;
        }

        .cover-edit-frame:hover .cover-edit-overlay {
          opacity: 1;
        }

        /* Avatar Editor Styling */
        .avatar-edit-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          margin-top: 6px;
        }

        .avatar-edit-selector {
          width: 90px;
          height: 90px;
          border-radius: 50%;
          overflow: hidden;
          position: relative;
          cursor: pointer;
          border: 3px solid var(--accent-indigo);
          box-shadow: 0 4px 16px rgba(255, 143, 0, 0.15);
          transition: transform 0.2s;
        }

        .avatar-edit-selector:hover {
          transform: scale(1.03);
        }

        .avatar-edit-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .avatar-edit-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          opacity: 0.8;
          transition: opacity 0.2s;
        }

        .avatar-edit-selector:hover .avatar-edit-overlay {
          opacity: 1;
        }

        .change-avatar-hint {
          font-size: 11px;
          color: #71717a;
        }

        .input-label {
          font-size: 12.5px;
          color: #a1a1aa;
          font-weight: 600;
          margin-bottom: 6px;
          display: block;
          text-align: left;
        }

        .bio-textarea {
          resize: none;
        }

        /* Visibility Settings switches */
        .visibility-settings-section {
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          padding-top: 20px;
          margin-top: 10px;
          text-align: left;
        }

        .settings-title {
          font-family: 'Outfit', sans-serif;
          font-size: 14px;
          font-weight: 700;
          color: #ffffff;
          margin: 0 0 4px 0;
        }

        .settings-description {
          font-size: 11.5px;
          color: #71717a;
          margin: 0 0 16px 0;
          line-height: 1.4;
        }

        .setting-toggle-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.04);
          font-size: 13px;
          color: #eeeeee;
        }

        /* Switch toggles styling */
        .switch {
          position: relative;
          display: inline-block;
          width: 38px;
          height: 22px;
          flex-shrink: 0;
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
          background-color: #27272a;
          transition: .3s;
          border-radius: 34px;
        }

        .slider:before {
          position: absolute;
          content: "";
          height: 16px;
          width: 16px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          transition: .3s;
          border-radius: 50%;
        }

        input:checked + .slider {
          background-color: var(--accent-indigo);
        }

        input:checked + .slider:before {
          transform: translateX(16px);
        }

        /* Action Buttons */
        .action-buttons-group {
          display: flex;
          gap: 12px;
          margin-top: 10px;
        }

        .action-buttons-group button {
          flex: 1;
          padding: 12px;
          border-radius: 9999px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.25s;
        }

        .cancel-btn {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: #ffffff;
        }

        .cancel-btn:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .submit-btn {
          background: var(--accent-gradient);
          border: none;
          color: #ffffff;
          box-shadow: 0 4px 16px rgba(255, 143, 0, 0.2);
        }

        .submit-btn:hover {
          box-shadow: 0 6px 20px rgba(255, 143, 0, 0.35);
          transform: translateY(-1px);
          opacity: 0.95;
        }

        .submit-btn:disabled, .cancel-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none !important;
          box-shadow: none !important;
        }
      `}</style>
    </div>
  );
}
