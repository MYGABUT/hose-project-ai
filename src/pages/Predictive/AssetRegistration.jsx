import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/common/Card/Card';
import Button from '../../components/common/Button/Button';
import Input from '../../components/common/Input/Input';
import './AssetRegistration.css';

const categories = [
    { id: 'factory', icon: '⚙️', label: 'Pabrik', color: '#607d8b' },
    { id: 'heavy', icon: '🚜', label: 'Alat Berat', color: '#ff9800' },
    { id: 'marine', icon: '⚓', label: 'Laut/Kapal', color: '#2196f3' },
    { id: 'oil_gas', icon: '🛢️', label: 'Migas', color: '#795548' },
    { id: 'general', icon: '📦', label: 'Umum', color: '#9c27b0' }
];

const environments = [
    { id: 'indoor', icon: '🏭', label: 'Indoor (Bersih)', desc: 'Area tertutup, minim debu' },
    { id: 'outdoor', icon: '☀️', label: 'Outdoor (Kotor/Korosif)', desc: 'Terpapar cuaca, debu, air' }
];

const workloads = [
    { id: 'static', icon: '📊', label: 'Statis (Stabil)', desc: 'Tekanan konstan, gerakan halus' },
    { id: 'shock', icon: '💥', label: 'Shock (Hentakan)', desc: 'Tekanan berubah-ubah, benturan' }
];

export default function AssetRegistration() {
    const navigate = useNavigate();
    const fileInputRef = useRef(null);

    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        name: '',
        location: '',
        photo: null,
        photoPreview: null,
        category: '',
        environment: '',
        workload: ''
    });

    // Generate initials from name
    const getInitials = (name) => {
        if (!name) return '?';
        const words = name.trim().split(' ');
        if (words.length >= 2) {
            return (words[0][0] + words[1][0]).toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    };

    // Get background color based on category
    const getCategoryColor = () => {
        const cat = categories.find(c => c.id === formData.category);
        return cat?.color || '#6366f1';
    };

    const handlePhotoUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            setFormData(prev => ({
                ...prev,
                photo: file,
                photoPreview: URL.createObjectURL(file)
            }));
        }
    };

    const handleNext = () => {
        if (step === 1 && (!formData.name || !formData.location)) {
            alert('Mohon isi Nama Aset dan Lokasi!');
            return;
        }
        if (step === 2 && !formData.category) {
            alert('Mohon pilih kategori!');
            return;
        }
        if (step < 3) {
            setStep(step + 1);
        } else {
            handleSubmit();
        }
    };

    const handleBack = () => {
        if (step > 1) setStep(step - 1);
    };

    const handleSubmit = () => {
        alert(`✅ Aset "${formData.name}" berhasil didaftarkan!`);
        navigate('/predictive');
    };

    return (
        <div className="asset-registration-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Tambah Aset Baru</h1>
                    <p className="page-subtitle">Daftarkan mesin/alat untuk prediksi kesehatan hidrolik</p>
                </div>
            </div>

            {/* Progress Steps */}
            <div className="progress-steps">
                <div className={`step ${step >= 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}>
                    <span className="step-number">1</span>
                    <span className="step-label">Identitas</span>
                </div>
                <div className="step-line" />
                <div className={`step ${step >= 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}>
                    <span className="step-number">2</span>
                    <span className="step-label">Kategori</span>
                </div>
                <div className="step-line" />
                <div className={`step ${step >= 3 ? 'active' : ''}`}>
                    <span className="step-number">3</span>
                    <span className="step-label">Profil Kerja</span>
                </div>
            </div>

            {/* Step 1: Identity & Visual */}
            {step === 1 && (
                <Card className="form-card">
                    <h2 className="step-title">📸 Identitas & Visual</h2>

                    {/* Photo Upload - Hero Section */}
                    <div
                        className="photo-upload-area"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        {formData.photoPreview ? (
                            <img
                                src={formData.photoPreview}
                                alt="Preview"
                                className="photo-preview"
                            />
                        ) : (
                            <div
                                className="photo-placeholder"
                                style={{ backgroundColor: getCategoryColor() }}
                            >
                                <span className="placeholder-initials">
                                    {getInitials(formData.name)}
                                </span>
                                <span className="placeholder-text">
                                    Tap untuk ambil foto mesin/aset asli
                                </span>
                            </div>
                        )}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={handlePhotoUpload}
                            style={{ display: 'none' }}
                        />
                        {formData.photoPreview && (
                            <button
                                className="photo-change-btn"
                                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                            >
                                📷 Ganti Foto
                            </button>
                        )}
                    </div>

                    {/* Form Fields */}
                    <div className="form-fields">
                        <div className="field-group">
                            <label className="field-label">Nama Aset *</label>
                            <input
                                type="text"
                                placeholder="Contoh: Mesin Bubut A, Genset Utama, Excavator PC200..."
                                value={formData.name}
                                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                className="text-input"
                            />
                            <span className="field-hint">Ketik nama bebas sesuai identifikasi internal Anda</span>
                        </div>

                        <div className="field-group">
                            <label className="field-label">Lokasi / Site *</label>
                            <input
                                type="text"
                                placeholder="Contoh: Gudang 2, Line Produksi A, Site Kalimantan..."
                                value={formData.location}
                                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                                className="text-input"
                            />
                        </div>
                    </div>
                </Card>
            )}

            {/* Step 2: Industry Context */}
            {step === 2 && (
                <Card className="form-card">
                    <h2 className="step-title">🏭 Konteks Industri</h2>
                    <p className="step-desc">Pilih kategori yang paling sesuai dengan aset ini</p>

                    <div className="category-grid">
                        {categories.map(cat => (
                            <div
                                key={cat.id}
                                className={`category-tile ${formData.category === cat.id ? 'selected' : ''}`}
                                style={{ '--cat-color': cat.color }}
                                onClick={() => setFormData(prev => ({ ...prev, category: cat.id }))}
                            >
                                <span className="category-icon">{cat.icon}</span>
                                <span className="category-label">{cat.label}</span>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {/* Step 3: Work Profile */}
            {step === 3 && (
                <Card className="form-card">
                    <h2 className="step-title">⚡ Profil Kerja</h2>
                    <p className="step-desc">Informasi ini membantu sistem memprediksi umur selang lebih akurat</p>

                    <div className="profile-section">
                        <h3>Lingkungan Operasi</h3>
                        <div className="profile-options">
                            {environments.map(env => (
                                <div
                                    key={env.id}
                                    className={`profile-option ${formData.environment === env.id ? 'selected' : ''}`}
                                    onClick={() => setFormData(prev => ({ ...prev, environment: env.id }))}
                                >
                                    <span className="option-icon">{env.icon}</span>
                                    <div className="option-content">
                                        <span className="option-label">{env.label}</span>
                                        <span className="option-desc">{env.desc}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="profile-section">
                        <h3>Beban Kerja</h3>
                        <div className="profile-options">
                            {workloads.map(wl => (
                                <div
                                    key={wl.id}
                                    className={`profile-option ${formData.workload === wl.id ? 'selected' : ''}`}
                                    onClick={() => setFormData(prev => ({ ...prev, workload: wl.id }))}
                                >
                                    <span className="option-icon">{wl.icon}</span>
                                    <div className="option-content">
                                        <span className="option-label">{wl.label}</span>
                                        <span className="option-desc">{wl.desc}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Preview Card */}
                    <div className="preview-section">
                        <h3>Preview Kartu Aset</h3>
                        <div className="asset-card-preview">
                            <div className="preview-photo">
                                {formData.photoPreview ? (
                                    <img src={formData.photoPreview} alt="Preview" />
                                ) : (
                                    <div
                                        className="preview-initials"
                                        style={{ backgroundColor: getCategoryColor() }}
                                    >
                                        {getInitials(formData.name)}
                                    </div>
                                )}
                            </div>
                            <div className="preview-content">
                                <span className="preview-name">{formData.name || 'Nama Aset'}</span>
                                <span className="preview-location">
                                    {formData.location || 'Lokasi'} • {categories.find(c => c.id === formData.category)?.icon} {categories.find(c => c.id === formData.category)?.label}
                                </span>
                                <div className="preview-health">
                                    <div className="health-bar-mini">
                                        <div className="health-fill" style={{ width: '0%' }} />
                                    </div>
                                    <span className="health-label">Belum Ada Selang</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>
            )}

            {/* Navigation Buttons */}
            <div className="form-navigation">
                {step > 1 && (
                    <Button variant="secondary" onClick={handleBack}>
                        ← Kembali
                    </Button>
                )}
                <Button variant="primary" onClick={handleNext}>
                    {step < 3 ? 'Lanjut →' : '✅ Simpan Aset'}
                </Button>
            </div>
        </div>
    );
}
