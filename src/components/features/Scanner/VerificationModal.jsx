import { useState } from 'react';
import Button from '../../common/Button/Button';
import Input from '../../common/Input/Input';
import './VerificationModal.css';

export default function VerificationModal({
    isOpen,
    onClose,
    onConfirm,
    capturedImage,
    ocrData = {}
}) {
    const [formData, setFormData] = useState({
        brand: ocrData.brand || '',
        type: ocrData.type || '',
        size: ocrData.size || '',
        pressure: ocrData.pressure || '',
        length: '',
        location: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleConfirm = async () => {
        setIsSubmitting(true);
        await new Promise(resolve => setTimeout(resolve, 800));

        const uniqueId = `ROLL-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}`;

        onConfirm?.({
            id: uniqueId,
            ...formData,
            timestamp: new Date().toISOString()
        });
        setIsSubmitting(false);
    };

    if (!isOpen) return null;

    // Check if OCR detected correctly
    const hasDiscrepancy = ocrData.brand && formData.brand !== ocrData.brand;

    return (
        <div className="verification-overlay">
            <div className="verification-modal">
                <div className="verification-header">
                    <h2>Verifikasi Hasil Scan</h2>
                    <p>Silakan cek kesesuaian data sebelum disimpan</p>
                    <button className="verification-close" onClick={onClose}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                <div className="verification-content">
                    {/* Side by side: Image vs Form */}
                    <div className="verification-grid">
                        {/* Left: Captured Image */}
                        <div className="image-section">
                            <h4 className="section-title">
                                <span className="title-icon">📷</span>
                                Foto Label (Bukti)
                            </h4>
                            <div className="captured-image-wrapper">
                                {capturedImage ? (
                                    <img src={capturedImage} alt="Captured label" />
                                ) : (
                                    <div className="image-placeholder">
                                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                            <rect x="3" y="3" width="18" height="18" rx="2" />
                                            <circle cx="8.5" cy="8.5" r="1.5" />
                                            <path d="M21 15l-5-5L5 21" />
                                        </svg>
                                        <span>Preview foto label</span>
                                    </div>
                                )}
                            </div>
                            {ocrData.confidence && (
                                <div className="ocr-confidence">
                                    <span>AI Confidence:</span>
                                    <div className="confidence-bar">
                                        <div
                                            className="confidence-fill"
                                            style={{ width: `${ocrData.confidence * 100}%` }}
                                        />
                                    </div>
                                    <span>{Math.round(ocrData.confidence * 100)}%</span>
                                </div>
                            )}
                        </div>

                        {/* Right: Form Data */}
                        <div className="form-section">
                            <h4 className="section-title">
                                <span className="title-icon">📝</span>
                                Data Barang
                                {hasDiscrepancy && (
                                    <span className="discrepancy-badge">Ada Perubahan</span>
                                )}
                            </h4>

                            <div className="form-group">
                                <Input
                                    label="Merek (Brand)"
                                    value={formData.brand}
                                    onChange={(e) => handleChange('brand', e.target.value)}
                                    placeholder="GATES, EATON, PARKER..."
                                />
                                {ocrData.brand && formData.brand !== ocrData.brand && (
                                    <span className="original-value">
                                        AI baca: "{ocrData.brand}"
                                    </span>
                                )}
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <Input
                                        label="Tipe (Type)"
                                        value={formData.type}
                                        onChange={(e) => handleChange('type', e.target.value)}
                                        placeholder="R1, R2, 2SN..."
                                    />
                                </div>
                                <div className="form-group">
                                    <Input
                                        label="Ukuran (Size)"
                                        value={formData.size}
                                        onChange={(e) => handleChange('size', e.target.value)}
                                        placeholder='1/2", 3/4"...'
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <Input
                                        label="Panjang Roll (Meter)"
                                        type="number"
                                        value={formData.length}
                                        onChange={(e) => handleChange('length', e.target.value)}
                                        placeholder="50"
                                    />
                                </div>
                                <div className="form-group">
                                    <Input
                                        label="Lokasi Rak"
                                        value={formData.location}
                                        onChange={(e) => handleChange('location', e.target.value)}
                                        placeholder="A-05"
                                        suffix={
                                            <button className="auto-btn" onClick={() => handleChange('location', 'A-05')}>
                                                Auto
                                            </button>
                                        }
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <Input
                                    label="Tekanan Max (PSI)"
                                    value={formData.pressure}
                                    onChange={(e) => handleChange('pressure', e.target.value)}
                                    placeholder="5000"
                                    suffix="PSI"
                                    helper={
                                        <span className="helper-with-tip">
                                            <span>Lihat angka "Max WP" pada kulit selang</span>
                                            <button className="tip-icon" title="Bantuan">?</button>
                                        </span>
                                    }
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="verification-footer">
                    <Button variant="secondary" onClick={onClose}>
                        Batal
                    </Button>
                    <Button
                        variant="success"
                        onClick={handleConfirm}
                        loading={isSubmitting}
                        icon={
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M9 12l2 2 4-4" />
                                <rect x="3" y="3" width="18" height="18" rx="2" />
                            </svg>
                        }
                    >
                        Simpan & Generate Barcode
                    </Button>
                </div>
            </div>
        </div>
    );
}
