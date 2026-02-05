import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import Modal from '../../common/Modal/Modal';
import Button from '../../common/Button/Button';
import './ProfileModal.css';

export default function ProfileModal({ isOpen, onClose }) {
    const { user, updateProfile } = useAuth();
    const fileInputRef = useRef(null);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        address: '',
        bio: ''
    });
    const [photoPreview, setPhotoPreview] = useState(null);
    const [photoFile, setPhotoFile] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    // Load user data when modal opens
    useEffect(() => {
        if (isOpen && user) {
            setFormData({
                name: user.name || '',
                email: user.email || '',
                phone: user.phone || '',
                address: user.address || '',
                bio: user.bio || ''
            });
            setPhotoPreview(user.photo || null);
            setMessage({ type: '', text: '' });
        }
    }, [isOpen, user]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handlePhotoClick = () => {
        fileInputRef.current?.click();
    };

    const handlePhotoChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            // Validate file type
            if (!file.type.startsWith('image/')) {
                setMessage({ type: 'error', text: 'File harus berupa gambar!' });
                return;
            }

            // Validate file size (max 2MB)
            if (file.size > 2 * 1024 * 1024) {
                setMessage({ type: 'error', text: 'Ukuran foto maksimal 2MB!' });
                return;
            }

            setPhotoFile(file);

            // Create preview
            const reader = new FileReader();
            reader.onloadend = () => {
                setPhotoPreview(reader.result);
            };
            reader.readAsDataURL(file);
            setMessage({ type: '', text: '' });
        }
    };

    const handleRemovePhoto = () => {
        setPhotoPreview(null);
        setPhotoFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage({ type: '', text: '' });

        try {
            const updatedData = {
                ...formData,
                photo: photoPreview
            };

            await updateProfile(updatedData);
            setMessage({ type: 'success', text: 'Profil berhasil diperbarui!' });

            // Close modal after success
            setTimeout(() => {
                onClose();
            }, 1500);
        } catch (err) {
            setMessage({ type: 'error', text: err.message || 'Gagal memperbarui profil' });
        } finally {
            setIsLoading(false);
        }
    };

    if (!user) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="👤 Edit Profil"
            size="md"
        >
            <form onSubmit={handleSubmit} className="profile-form">
                {/* Photo Section */}
                <div className="photo-section">
                    <div
                        className="photo-preview"
                        onClick={handlePhotoClick}
                        style={{ backgroundColor: user.roleConfig?.color }}
                    >
                        {photoPreview ? (
                            <img src={photoPreview} alt="Profile" />
                        ) : (
                            <span className="photo-placeholder">
                                {user.roleConfig?.icon || user.name?.charAt(0).toUpperCase()}
                            </span>
                        )}
                        <div className="photo-overlay">
                            <span>📷</span>
                            <span>Ubah Foto</span>
                        </div>
                    </div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoChange}
                        style={{ display: 'none' }}
                    />
                    {photoPreview && (
                        <button
                            type="button"
                            className="remove-photo-btn"
                            onClick={handleRemovePhoto}
                        >
                            🗑️ Hapus Foto
                        </button>
                    )}
                    <p className="photo-hint">Klik foto untuk mengganti (Max 2MB)</p>
                </div>

                {/* Role Badge */}
                <div className="role-badge-display">
                    <span
                        className="role-badge"
                        style={{ backgroundColor: user.roleConfig?.color }}
                    >
                        {user.roleConfig?.icon} {user.roleConfig?.label}
                    </span>
                    <span className="user-id">ID: {user.id}</span>
                </div>

                {/* Form Fields */}
                <div className="form-grid">
                    <div className="form-group">
                        <label htmlFor="name">Nama Lengkap *</label>
                        <input
                            id="name"
                            name="name"
                            type="text"
                            value={formData.name}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="email">Email *</label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="phone">No. Telepon</label>
                        <input
                            id="phone"
                            name="phone"
                            type="tel"
                            value={formData.phone}
                            onChange={handleChange}
                            placeholder="+62 812 3456 7890"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="address">Alamat</label>
                        <input
                            id="address"
                            name="address"
                            type="text"
                            value={formData.address}
                            onChange={handleChange}
                            placeholder="Kota, Provinsi"
                        />
                    </div>
                </div>

                <div className="form-group full-width">
                    <label htmlFor="bio">Bio / Catatan</label>
                    <textarea
                        id="bio"
                        name="bio"
                        value={formData.bio}
                        onChange={handleChange}
                        placeholder="Tulis sesuatu tentang diri Anda..."
                        rows={3}
                    />
                </div>

                {/* Message */}
                {message.text && (
                    <div className={`profile-message ${message.type}`}>
                        {message.type === 'success' ? '✅' : '❌'} {message.text}
                    </div>
                )}

                {/* Actions */}
                <div className="profile-actions">
                    <Button type="button" variant="secondary" onClick={onClose}>
                        Batal
                    </Button>
                    <Button type="submit" variant="primary" disabled={isLoading}>
                        {isLoading ? 'Menyimpan...' : '💾 Simpan Perubahan'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
