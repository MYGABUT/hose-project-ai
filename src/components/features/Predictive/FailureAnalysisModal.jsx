import { useState } from 'react';
import Modal from '../../common/Modal/Modal';
import Button from '../../common/Button/Button';
import './FailureAnalysisModal.css';

const failureReasons = [
    { id: 'burst', label: 'Pecah/Meledak (Burst)', icon: '💥', adjust: true },
    { id: 'leak_fitting', label: 'Bocor di Fitting', icon: '💧', adjust: false },
    { id: 'abrasion', label: 'Kulit Terkelupas (Gesekan)', icon: '🔧', adjust: true },
    { id: 'kink', label: 'Selang Tertekuk/Patah', icon: '📐', adjust: false },
    { id: 'age', label: 'Aus Normal (Umur Pakai)', icon: '⏰', adjust: false },
    { id: 'accident', label: 'Kecelakaan/Benturan', icon: '💢', adjust: false }
];

export default function FailureAnalysisModal({ isOpen, onClose, hose }) {
    const [selectedReason, setSelectedReason] = useState(null);
    const [adjustPrediction, setAdjustPrediction] = useState(false);
    const [notes, setNotes] = useState('');

    const handleSubmit = () => {
        const reason = failureReasons.find(r => r.id === selectedReason);

        if (!selectedReason) {
            alert('Mohon pilih kondisi fisik selang!');
            return;
        }

        const message = adjustPrediction
            ? `✅ Data tersimpan!\n\nSistem akan menyesuaikan prediksi untuk klien ini.`
            : `✅ Data tersimpan sebagai kejadian insidental.`;

        alert(message);
        onClose();
        setSelectedReason(null);
        setAdjustPrediction(false);
        setNotes('');
    };

    if (!hose) return null;

    // Calculate duration (mock)
    const durationMonths = 5;
    const expectedMonths = 6;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="🔍 Analisa Kegagalan (Failure Analysis)"
            size="md"
        >
            <div className="failure-modal">
                {/* Hose Info */}
                <div className="failure-hose-info">
                    <div className="info-row">
                        <span className="info-label">Selang ID:</span>
                        <span className="info-value">{hose?.id || 'H-2023-005'}</span>
                    </div>
                    <div className="info-row">
                        <span className="info-label">Klien:</span>
                        <span className="info-value">Bpk. Budi - Bengkel Jaya</span>
                    </div>
                    <div className="duration-compare">
                        <div className="duration-box actual">
                            <span className="duration-label">Durasi Pakai</span>
                            <span className="duration-value">{durationMonths} Bulan</span>
                        </div>
                        <span className="duration-vs">vs</span>
                        <div className="duration-box expected">
                            <span className="duration-label">Estimasi Sistem</span>
                            <span className="duration-value">{expectedMonths} Bulan</span>
                        </div>
                    </div>
                    {durationMonths < expectedMonths && (
                        <div className="duration-warning">
                            ⚠️ Selang gagal lebih awal dari prediksi!
                        </div>
                    )}
                </div>

                {/* Failure Reason Selection */}
                <div className="failure-reasons">
                    <h4>KONDISI FISIK SAAT INI:</h4>
                    <div className="reason-options">
                        {failureReasons.map(reason => (
                            <label
                                key={reason.id}
                                className={`reason-option ${selectedReason === reason.id ? 'selected' : ''}`}
                            >
                                <input
                                    type="radio"
                                    name="reason"
                                    value={reason.id}
                                    checked={selectedReason === reason.id}
                                    onChange={() => setSelectedReason(reason.id)}
                                />
                                <span className="reason-icon">{reason.icon}</span>
                                <span className="reason-label">{reason.label}</span>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Adjustment Question */}
                {selectedReason && failureReasons.find(r => r.id === selectedReason)?.adjust && (
                    <div className="adjustment-question">
                        <h4>APAKAH SISTEM PERLU MENYESUAIKAN PREDIKSI?</h4>
                        <div className="adjustment-options">
                            <label className={`adjustment-option ${adjustPrediction ? 'selected' : ''}`}>
                                <input
                                    type="radio"
                                    name="adjust"
                                    checked={adjustPrediction}
                                    onChange={() => setAdjustPrediction(true)}
                                />
                                <div className="option-content">
                                    <strong>YA, Turunkan estimasi</strong>
                                    <span>Prediksi untuk klien ini akan disesuaikan menjadi {durationMonths} bulan</span>
                                </div>
                            </label>
                            <label className={`adjustment-option ${!adjustPrediction ? 'selected' : ''}`}>
                                <input
                                    type="radio"
                                    name="adjust"
                                    checked={!adjustPrediction}
                                    onChange={() => setAdjustPrediction(false)}
                                />
                                <div className="option-content">
                                    <strong>TIDAK, Ini kejadian insidental</strong>
                                    <span>Prediksi tetap menggunakan estimasi standar</span>
                                </div>
                            </label>
                        </div>
                    </div>
                )}

                {/* Notes */}
                <div className="failure-notes">
                    <label>Catatan Tambahan (Opsional):</label>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Contoh: Selang dipasang di area panas mesin..."
                        rows={2}
                    />
                </div>

                {/* Actions */}
                <div className="modal-actions">
                    <Button variant="secondary" onClick={onClose}>
                        Batal
                    </Button>
                    <Button variant="primary" onClick={handleSubmit}>
                        💾 Simpan & Buat Order Baru
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
