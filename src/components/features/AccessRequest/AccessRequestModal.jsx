import { useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useAccessRequest, RESTRICTED_FEATURES } from '../../../contexts/AccessRequestContext';
import Modal from '../../common/Modal/Modal';
import Button from '../../common/Button/Button';
import './AccessRequestModal.css';

export default function AccessRequestModal() {
    const { user } = useAuth();
    const {
        showRequestModal,
        requestingFeature,
        setShowRequestModal,
        requestAccess,
        getApproversFor
    } = useAccessRequest();

    const [durationValue, setDurationValue] = useState(1);
    const [durationUnit, setDurationUnit] = useState('hours'); // 'minutes' or 'hours'
    const [reason, setReason] = useState('');
    const [approverId, setApproverId] = useState('');
    const [submitMessage, setSubmitMessage] = useState(null);

    const approvers = user ? getApproversFor(user.id) : [];

    // Calculate duration in hours for the API
    const getDurationInHours = () => {
        if (durationUnit === 'minutes') {
            return durationValue / 60;
        }
        return durationValue;
    };

    // Get max value based on unit
    const getMaxValue = () => {
        return durationUnit === 'minutes' ? 60 : 24;
    };

    // Get min value based on unit
    const getMinValue = () => {
        return durationUnit === 'minutes' ? 5 : 1;
    };

    const handleSubmit = () => {
        if (!reason.trim()) {
            setSubmitMessage({ type: 'error', text: '❌ Mohon isi alasan permintaan akses!' });
            setTimeout(() => setSubmitMessage(null), 3000);
            return;
        }
        if (!approverId) {
            setSubmitMessage({ type: 'error', text: '❌ Mohon pilih approver!' });
            setTimeout(() => setSubmitMessage(null), 3000);
            return;
        }

        requestAccess(requestingFeature?.id, getDurationInHours(), reason, approverId);

        // Reset form
        setDurationValue(1);
        setDurationUnit('hours');
        setReason('');
        setApproverId('');

        setSubmitMessage({ type: 'success', text: '✅ Permintaan akses telah dikirim ke atasan Anda!' });
        setTimeout(() => {
            setSubmitMessage(null);
            setShowRequestModal(false);
        }, 2000);
    };

    const handleClose = () => {
        setShowRequestModal(false);
        setDurationValue(1);
        setDurationUnit('hours');
        setReason('');
        setApproverId('');
        setSubmitMessage(null);
    };

    const handleUnitChange = (newUnit) => {
        setDurationUnit(newUnit);
        // Reset to appropriate default when switching units
        if (newUnit === 'minutes') {
            setDurationValue(15);
        } else {
            setDurationValue(1);
        }
    };

    if (!requestingFeature) return null;

    return (
        <Modal
            isOpen={showRequestModal}
            onClose={handleClose}
            title="Request Akses Fitur Sementara"
            size="md"
        >
            <div className="access-request-form">
                {/* Submit Message Toast */}
                {submitMessage && (
                    <div className={`submit-message ${submitMessage.type}`}>
                        {submitMessage.text}
                    </div>
                )}

                {/* Feature Info */}
                <div className="request-feature-info">
                    <span className="feature-icon locked">🔒</span>
                    <div className="feature-details">
                        <span className="feature-label">{requestingFeature.label}</span>
                        <span className="feature-module">Modul: {requestingFeature.module}</span>
                    </div>
                </div>

                <p className="request-description">
                    Anda tidak memiliki akses permanen untuk fitur ini.
                    Ajukan permintaan akses sementara ke atasan Anda.
                </p>

                {/* Duration */}
                <div className="form-section">
                    <label>Durasi yang Diminta</label>

                    {/* Unit Toggle */}
                    <div className="duration-unit-toggle">
                        <button
                            type="button"
                            className={`unit-btn ${durationUnit === 'minutes' ? 'active' : ''}`}
                            onClick={() => handleUnitChange('minutes')}
                        >
                            Menit
                        </button>
                        <button
                            type="button"
                            className={`unit-btn ${durationUnit === 'hours' ? 'active' : ''}`}
                            onClick={() => handleUnitChange('hours')}
                        >
                            Jam
                        </button>
                    </div>

                    <div className="duration-picker">
                        <button
                            type="button"
                            onClick={() => setDurationValue(Math.max(getMinValue(), durationValue - (durationUnit === 'minutes' ? 5 : 1)))}
                            disabled={durationValue <= getMinValue()}
                        >
                            −
                        </button>
                        <input
                            type="number"
                            min={getMinValue()}
                            max={getMaxValue()}
                            value={durationValue}
                            onChange={(e) => setDurationValue(Math.min(getMaxValue(), Math.max(getMinValue(), parseInt(e.target.value) || getMinValue())))}
                        />
                        <button
                            type="button"
                            onClick={() => setDurationValue(Math.min(getMaxValue(), durationValue + (durationUnit === 'minutes' ? 5 : 1)))}
                            disabled={durationValue >= getMaxValue()}
                        >
                            +
                        </button>
                        <span className="duration-unit">{durationUnit === 'minutes' ? 'Menit' : 'Jam'}</span>
                    </div>

                    {/* Quick Select Buttons */}
                    <div className="duration-quick-select">
                        {durationUnit === 'minutes' ? (
                            <>
                                <button type="button" onClick={() => setDurationValue(15)} className={durationValue === 15 ? 'active' : ''}>15m</button>
                                <button type="button" onClick={() => setDurationValue(30)} className={durationValue === 30 ? 'active' : ''}>30m</button>
                                <button type="button" onClick={() => setDurationValue(45)} className={durationValue === 45 ? 'active' : ''}>45m</button>
                                <button type="button" onClick={() => setDurationValue(60)} className={durationValue === 60 ? 'active' : ''}>60m</button>
                            </>
                        ) : (
                            <>
                                <button type="button" onClick={() => setDurationValue(1)} className={durationValue === 1 ? 'active' : ''}>1j</button>
                                <button type="button" onClick={() => setDurationValue(2)} className={durationValue === 2 ? 'active' : ''}>2j</button>
                                <button type="button" onClick={() => setDurationValue(4)} className={durationValue === 4 ? 'active' : ''}>4j</button>
                                <button type="button" onClick={() => setDurationValue(8)} className={durationValue === 8 ? 'active' : ''}>8j</button>
                            </>
                        )}
                    </div>

                    <span className="hint">
                        {durationUnit === 'minutes'
                            ? 'Minimum 5 menit, maksimal 60 menit. Approver dapat mengubah durasi.'
                            : 'Minimum 1 jam, maksimal 24 jam. Approver dapat mengubah durasi.'
                        }
                    </span>
                </div>

                {/* Reason */}
                <div className="form-section">
                    <label>Alasan (Wajib Diisi)</label>
                    <textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Contoh: Sedang meeting dengan Vendor A, butuh input harga real-time untuk deal proyek Freeport."
                        rows={3}
                    />
                </div>

                {/* Approver */}
                <div className="form-section">
                    <label>Approver (Pilih Atasan)</label>
                    <select
                        value={approverId}
                        onChange={(e) => setApproverId(e.target.value)}
                    >
                        <option value="">-- Pilih Approver --</option>
                        {approvers.map(a => (
                            <option key={a.id} value={a.id}>
                                {a.name} ({a.role})
                            </option>
                        ))}
                    </select>
                </div>

                {/* Actions */}
                <div className="form-actions">
                    <Button variant="secondary" onClick={handleClose}>
                        Batal
                    </Button>
                    <Button variant="primary" onClick={handleSubmit}>
                        🔔 Kirim Request
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
