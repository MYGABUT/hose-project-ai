import { useState, useEffect } from 'react';
import { useUserManagement, ROLES, ROLE_CONFIG } from '../../../contexts/UserContext';
import Modal from '../../common/Modal/Modal';
import Button from '../../common/Button/Button';
import './AddEditUserModal.css';

export default function AddEditUserModal() {
    const {
        showAddEditModal,
        editingUser,
        institutions,
        closeAddEditModal,
        addUser,
        updateUser
    } = useUserManagement();

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        gender: 'male',
        institution: '',
        phone: '',
        role: ROLES.SALES,
        email: '',
        pin: '',
        loginMethods: {
            web: true,
            kiosk: false
        }
    });

    const [errors, setErrors] = useState({});
    const [showInstitutionSuggestions, setShowInstitutionSuggestions] = useState(false);
    const [message, setMessage] = useState(null);

    // Pre-fill form when editing
    useEffect(() => {
        if (editingUser) {
            setFormData({
                name: editingUser.name || '',
                gender: editingUser.gender || 'male',
                institution: editingUser.institution || '',
                phone: editingUser.phone || '',
                role: editingUser.role || ROLES.SALES,
                email: editingUser.email || '',
                pin: editingUser.pin || '',
                loginMethods: editingUser.loginMethods || { web: true, kiosk: false }
            });
        } else {
            // Reset form for new user
            setFormData({
                name: '',
                gender: 'male',
                institution: '',
                phone: '',
                role: ROLES.SALES,
                email: '',
                pin: '',
                loginMethods: { web: true, kiosk: false }
            });
        }
        setErrors({});
        setMessage(null);
    }, [editingUser, showAddEditModal]);

    // Handle input changes
    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // Clear error for this field
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: null }));
        }
    };

    // Handle login method toggle
    const handleLoginMethodChange = (method) => {
        setFormData(prev => ({
            ...prev,
            loginMethods: {
                ...prev.loginMethods,
                [method]: !prev.loginMethods[method]
            }
        }));
    };

    // Filter institutions for autocomplete
    const filteredInstitutions = institutions.filter(inst =>
        inst.toLowerCase().includes(formData.institution.toLowerCase()) &&
        inst.toLowerCase() !== formData.institution.toLowerCase()
    );

    // Validate form
    const validateForm = () => {
        const newErrors = {};

        if (!formData.name.trim()) {
            newErrors.name = 'Nama lengkap wajib diisi';
        }

        if (!formData.institution.trim()) {
            newErrors.institution = 'Lembaga/institusi wajib diisi';
        }

        if (!formData.role) {
            newErrors.role = 'Job role wajib dipilih';
        }

        // Check login methods
        if (!formData.loginMethods.web && !formData.loginMethods.kiosk) {
            newErrors.loginMethods = 'Pilih minimal satu metode login';
        }

        if (formData.loginMethods.web && !formData.email.trim()) {
            newErrors.email = 'Email wajib diisi untuk akses web';
        }

        if (formData.loginMethods.kiosk && !formData.pin.trim()) {
            newErrors.pin = 'PIN wajib diisi untuk akses kiosk';
        }

        if (formData.loginMethods.kiosk && formData.pin.length !== 4) {
            newErrors.pin = 'PIN harus 4 digit';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Handle submit
    const handleSubmit = () => {
        if (!validateForm()) {
            setMessage({ type: 'error', text: '❌ Mohon lengkapi semua field yang wajib diisi!' });
            setTimeout(() => setMessage(null), 3000);
            return;
        }

        if (editingUser) {
            updateUser(editingUser.id, formData);
        } else {
            addUser(formData);
        }
    };

    const handleClose = () => {
        closeAddEditModal();
        setFormData({
            name: '',
            gender: 'male',
            institution: '',
            phone: '',
            role: ROLES.SALES,
            email: '',
            pin: '',
            loginMethods: { web: true, kiosk: false }
        });
        setErrors({});
        setMessage(null);
    };

    return (
        <Modal
            isOpen={showAddEditModal}
            onClose={handleClose}
            title={editingUser ? 'Edit Pengguna' : 'Tambah Pengguna Baru'}
            size="lg"
        >
            <div className="add-edit-user-form">
                {/* Message */}
                {message && (
                    <div className={`form-message ${message.type}`}>
                        {message.text}
                    </div>
                )}

                {/* Section 1: Data Pribadi */}
                <div className="form-section-header">
                    <span className="section-number">1</span>
                    <span className="section-title">DATA PRIBADI (Bio)</span>
                </div>

                <div className="form-grid two-columns">
                    {/* Nama Lengkap */}
                    <div className="form-field">
                        <label>Nama Lengkap <span className="required">*</span></label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => handleChange('name', e.target.value)}
                            placeholder="Ketik nama user..."
                            className={errors.name ? 'error' : ''}
                        />
                        {errors.name && <span className="error-text">{errors.name}</span>}
                    </div>

                    {/* Jenis Kelamin */}
                    <div className="form-field">
                        <label>Jenis Kelamin <span className="required">*</span></label>
                        <div className="gender-options">
                            <label className={`gender-option ${formData.gender === 'male' ? 'selected' : ''}`}>
                                <input
                                    type="radio"
                                    name="gender"
                                    value="male"
                                    checked={formData.gender === 'male'}
                                    onChange={() => handleChange('gender', 'male')}
                                />
                                <span className="gender-icon">♂️</span>
                                <span>Pria</span>
                            </label>
                            <label className={`gender-option ${formData.gender === 'female' ? 'selected' : ''}`}>
                                <input
                                    type="radio"
                                    name="gender"
                                    value="female"
                                    checked={formData.gender === 'female'}
                                    onChange={() => handleChange('gender', 'female')}
                                />
                                <span className="gender-icon">♀️</span>
                                <span>Wanita</span>
                            </label>
                        </div>
                    </div>

                    {/* Lembaga */}
                    <div className="form-field">
                        <label>Lembaga / Institusi <span className="required">*</span></label>
                        <div className="autocomplete-wrapper">
                            <input
                                type="text"
                                value={formData.institution}
                                onChange={(e) => handleChange('institution', e.target.value)}
                                onFocus={() => setShowInstitutionSuggestions(true)}
                                onBlur={() => setTimeout(() => setShowInstitutionSuggestions(false), 200)}
                                placeholder="Ketik manual..."
                                className={errors.institution ? 'error' : ''}
                            />
                            {showInstitutionSuggestions && filteredInstitutions.length > 0 && (
                                <div className="autocomplete-suggestions">
                                    {filteredInstitutions.slice(0, 5).map((inst, idx) => (
                                        <div
                                            key={idx}
                                            className="suggestion-item"
                                            onClick={() => {
                                                handleChange('institution', inst);
                                                setShowInstitutionSuggestions(false);
                                            }}
                                        >
                                            {inst}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        {errors.institution && <span className="error-text">{errors.institution}</span>}
                    </div>

                    {/* Nomor Telepon */}
                    <div className="form-field">
                        <label>Nomor Telepon <span className="optional">(Opsional)</span></label>
                        <input
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => handleChange('phone', e.target.value)}
                            placeholder="+62..."
                        />
                    </div>
                </div>

                {/* Section 2: Jabatan & Akses */}
                <div className="form-section-header">
                    <span className="section-number">2</span>
                    <span className="section-title">JABATAN & AKSES (System)</span>
                </div>

                <div className="form-grid two-columns">
                    {/* Job Role */}
                    <div className="form-field full-width">
                        <label>Job Role (Jabatan) <span className="required">*</span></label>
                        <select
                            value={formData.role}
                            onChange={(e) => handleChange('role', e.target.value)}
                            className={errors.role ? 'error' : ''}
                        >
                            {Object.entries(ROLE_CONFIG)
                                .filter(([_, config]) => !config.isHidden)
                                .map(([roleKey, config]) => (
                                    <option key={roleKey} value={roleKey}>
                                        {config.icon} {config.label}
                                    </option>
                                ))}
                        </select>
                        {errors.role && <span className="error-text">{errors.role}</span>}
                    </div>
                </div>

                {/* Login Methods */}
                <div className="login-methods-section">
                    <label>Metode Login <span className="hint">(Pilih minimal satu)</span></label>
                    {errors.loginMethods && <span className="error-text">{errors.loginMethods}</span>}

                    <div className="login-methods-grid">
                        {/* Web Access */}
                        <div className={`login-method-card ${formData.loginMethods.web ? 'active' : ''}`}>
                            <label className="method-toggle">
                                <input
                                    type="checkbox"
                                    checked={formData.loginMethods.web}
                                    onChange={() => handleLoginMethodChange('web')}
                                />
                                <span className="checkmark">✓</span>
                                <span className="method-label">Akses Web (Email)</span>
                            </label>
                            {formData.loginMethods.web && (
                                <div className="method-input">
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => handleChange('email', e.target.value)}
                                        placeholder="email@example.com"
                                        className={errors.email ? 'error' : ''}
                                    />
                                    {errors.email && <span className="error-text">{errors.email}</span>}
                                </div>
                            )}
                        </div>

                        {/* Kiosk Access */}
                        <div className={`login-method-card ${formData.loginMethods.kiosk ? 'active' : ''}`}>
                            <label className="method-toggle">
                                <input
                                    type="checkbox"
                                    checked={formData.loginMethods.kiosk}
                                    onChange={() => handleLoginMethodChange('kiosk')}
                                />
                                <span className="checkmark">✓</span>
                                <span className="method-label">Akses Kiosk (Tablet)</span>
                            </label>
                            {formData.loginMethods.kiosk && (
                                <div className="method-input">
                                    <input
                                        type="text"
                                        value={formData.pin}
                                        onChange={(e) => handleChange('pin', e.target.value.replace(/\D/g, '').slice(0, 4))}
                                        placeholder="PIN 4 digit"
                                        maxLength={4}
                                        className={errors.pin ? 'error' : ''}
                                    />
                                    {errors.pin && <span className="error-text">{errors.pin}</span>}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="form-actions">
                    <Button variant="secondary" onClick={handleClose}>
                        Batal
                    </Button>
                    <Button variant="primary" onClick={handleSubmit}>
                        {editingUser ? '💾 Simpan Perubahan' : '➕ Simpan Data User'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
