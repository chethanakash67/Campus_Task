import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import Sidebar from '../components/Sidebar';
import { User, Mail, Shield, Camera, Save } from 'lucide-react';
import '../styles/auth.css'; // Re-using card styles for consistency
import './Profile.css';

function Profile() {
    const { currentUser, updateCurrentUserProfile } = useApp();
    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        name: currentUser?.name || '',
        email: currentUser?.email || '',
        bio: currentUser?.bio || '',
    });
    const [avatarPreview, setAvatarPreview] = useState(currentUser?.avatar || null);
    const fileInputRef = useRef(null);
    const isImageAvatar = typeof avatarPreview === 'string' &&
        (avatarPreview.startsWith('data:image/') || avatarPreview.startsWith('http://') || avatarPreview.startsWith('https://'));

    useEffect(() => {
        if (!currentUser) return;
        setFormData({
            name: currentUser.name || '',
            email: currentUser.email || '',
            bio: currentUser.bio || '',
        });
        setAvatarPreview(currentUser.avatar || null);
    }, [currentUser]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            setIsEditing(true);
            const reader = new FileReader();
            reader.onloadend = () => {
                setAvatarPreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const triggerFileInput = () => {
        fileInputRef.current.click();
    };

    const removeProfilePicture = () => {
        setIsEditing(true);
        setAvatarPreview(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setSaving(true);
            await updateCurrentUserProfile({
                name: formData.name,
                bio: formData.bio,
                avatar: avatarPreview
            });
            setIsEditing(false);
        } finally {
            setSaving(false);
        }
    };

    if (!currentUser) return <div className="p-8">Loading profile...</div>;

    return (
        <div className="dashboard-container">
            <Sidebar />
            <main className="main-content">
                <div className="profile-page-container">
                    <div className="profile-header-bg"></div>

                    <div className="profile-content">
                        <div className="profile-card">
                            <div className="profile-avatar-section">
                                <div className="profile-avatar-large" style={isImageAvatar
                                    ? { background: `url(${avatarPreview}) center/cover no-repeat`, border: '4px solid white' }
                                    : {}}>
                                    {!isImageAvatar && currentUser.name?.charAt(0).toUpperCase()}
                                </div>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleImageUpload}
                                    style={{ display: 'none' }}
                                    accept="image/*"
                                />
                                <button
                                    type="button"
                                    onClick={triggerFileInput}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: '#000000',
                                        cursor: 'pointer',
                                        fontSize: '14px',
                                        fontWeight: '500',
                                        marginTop: '12px',
                                        marginBottom: '16px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px'
                                    }}
                                >
                                    <Camera size={16} /> Change Picture
                                </button>
                                {isImageAvatar && (
                                    <button
                                        type="button"
                                        onClick={removeProfilePicture}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            color: '#ef4444',
                                            cursor: 'pointer',
                                            fontSize: '13px',
                                            fontWeight: '600',
                                            marginBottom: '12px'
                                        }}
                                    >
                                        Remove Picture
                                    </button>
                                )}
                                <h1 className="profile-name">{currentUser.name}</h1>
                                <p className="profile-email">{currentUser.email}</p>
                                <span className="profile-role-badge">
                                    <Shield size={12} /> Team Admin
                                </span>
                            </div>

                            <div className="profile-details-section">
                                <div className="section-header">
                                    <h2>Personal Information</h2>
                                    <button
                                        className={`edit-toggle-btn ${isEditing ? 'active' : ''}`}
                                        onClick={() => setIsEditing(!isEditing)}
                                    >
                                        {isEditing ? 'Cancel' : 'Edit Profile'}
                                    </button>
                                </div>

                                <form onSubmit={handleSubmit} className="profile-form">
                                    <div className="form-group">
                                        <label>Full Name</label>
                                        <div className="input-wrapper">
                                            <User className="input-icon" size={18} />
                                            <input
                                                type="text"
                                                name="name"
                                                value={formData.name}
                                                onChange={handleChange}
                                                disabled={!isEditing}
                                                className="profile-input"
                                            />
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <label>Email Address</label>
                                        <div className="input-wrapper">
                                            <Mail className="input-icon" size={18} />
                                            <input
                                                type="email"
                                                name="email"
                                                value={formData.email}
                                                disabled={true} // Email usually immutable
                                                className="profile-input disabled"
                                            />
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <label>Bio</label>
                                        <textarea
                                            name="bio"
                                            value={formData.bio}
                                            onChange={handleChange}
                                            disabled={!isEditing}
                                            className="profile-textarea"
                                            rows="4"
                                        />
                                    </div>

                                    {isEditing && (
                                        <button type="submit" className="save-btn" disabled={saving}>
                                            <Save size={18} /> {saving ? 'Saving...' : 'Save Changes'}
                                        </button>
                                    )}
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

export default Profile;
