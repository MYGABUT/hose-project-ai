import { useState, useEffect } from 'react';
import { useAccessRequest } from '../../../contexts/AccessRequestContext';
import Modal from '../../common/Modal/Modal';
import Button from '../../common/Button/Button';
import './AccessApprovalModal.css';

export default function AccessApprovalModal() {
    const {
        showApprovalModal,
        selectedRequest,
        setShowApprovalModal,
        approveRequest,
        rejectRequest
    } = useAccessRequest();

    const [grantedDuration, setGrantedDuration] = useState(1);
    const [durationUnit, setDurationUnit] = useState('hours');
    const [approverNote, setApproverNote] = useState('');
    const [rejectReason, setRejectReason] = useState('');
    const [showRejectForm, setShowRejectForm] = useState(false);
    const [actionMessage, setActionMessage] = useState(null);

    // Reset form when request changes
    useEffect(() => {
        if (selectedRequest) {
            const reqDuration = selectedRequest.requestedDuration || 1;
            // Check if it's less than 1 hour (in hours)
            if (reqDuration < 1) {
                setDurationUnit('minutes');
                setGrantedDuration(Math.round(reqDuration * 60));
            } else {
                setDurationUnit('hours');
                setGrantedDuration(reqDuration);
            }
            setApproverNote('');
            setRejectReason('');
            setShowRejectForm(false);
            setActionMessage(null);
        }
    }, [selectedRequest]);

    // Get duration in hours for API
    const getDurationInHours = () => {
        return durationUnit === 'minutes' ? grantedDuration / 60 : grantedDuration;
    };

    // Format duration for display
    const formatDuration = (hours) => {
        if (hours < 1) {
            return `${Math.round(hours * 60)} menit`;
        }
        return `${hours} jam`;
    };

    // Get max/min based on unit
    const getMaxValue = () => durationUnit === 'minutes' ? 60 : 24;
    const getMinValue = () => durationUnit === 'minutes' ? 5 : 1;
    const getStep = () => durationUnit === 'minutes' ? 5 : 0.5;

    const handleUnitChange = (newUnit) => {
        setDurationUnit(newUnit);
        if (newUnit === 'minutes') {
            setGrantedDuration(15);
        } else {
            setGrantedDuration(1);
        }
    };

    const handleApprove = () => {
        approveRequest(selectedRequest.id, getDurationInHours(), approverNote);

        const durationText = durationUnit === 'minutes'
            ? `${grantedDuration} menit`
            : `${grantedDuration} jam`;

        setActionMessage({
            type: 'success',
            text: `✅ Akses telah diberikan kepada ${selectedRequest.userName} selama ${durationText}!`
        });

        setTimeout(() => {
            setActionMessage(null);
            setShowApprovalModal(false);
        }, 2000);
    };

    const handleReject = () => {
        if (!rejectReason.trim()) {
            setActionMessage({ type: 'error', text: '❌ Mohon isi alasan penolakan!' });
            setTimeout(() => setActionMessage(null), 3000);
            return;
        }
        rejectRequest(selectedRequest.id, rejectReason);
        setActionMessage({ type: 'success', text: `❌ Permintaan dari ${selectedRequest.userName} telah ditolak.` });
        setTimeout(() => {
            setActionMessage(null);
            setShowApprovalModal(false);
        }, 2000);
    };

    const handleClose = () => {
        setShowApprovalModal(false);
        setShowRejectForm(false);
        setApproverNote('');
        setRejectReason('');
        setActionMessage(null);
    };

    if (!selectedRequest) return null;

    return (
        <Modal
            isOpen={showApprovalModal}
            onClose={handleClose}
            title="Permintaan Akses Masuk"
            size="md"
        >
            <div className="access-approval-form">
                {/* Action Message */}
                {actionMessage && (
                    <div className={`action-message ${actionMessage.type}`}>
                        {actionMessage.text}
                    </div>
                )}

                {/* Requester Info */}
                <div className="requester-info">
                    <div className="requester-avatar">
                        {selectedRequest.userName?.charAt(0).toUpperCase()}
                    </div>
                    <div className="requester-details">
                        <span className="requester-name">{selectedRequest.userName}</span>
                        <span className="requester-role">{selectedRequest.userRole}</span>
                    </div>
                    <span className="request-time">
                        {new Date(selectedRequest.createdAt).toLocaleString('id-ID')}
                    </span>
                </div>

                {/* Feature Info */}
                <div className="request-feature-box">
                    <span className="feature-label">Fitur yang Diminta:</span>
                    <span className="feature-name">🔒 {selectedRequest.featureLabel}</span>
                    <span className="feature-module">Modul: {selectedRequest.featureModule}</span>
                </div>

                {/* Reason */}
                <div className="request-reason">
                    <span className="reason-label">Alasan:</span>
                    <p className="reason-text">"{selectedRequest.reason}"</p>
                </div>

                {/* Requested Duration */}
                <div className="requested-duration">
                    <span>Durasi yang Diminta:</span>
                    <span className="duration-original">{formatDuration(selectedRequest.requestedDuration)}</span>
                </div>

                {!showRejectForm ? (
                    <>
                        {/* Approval Settings */}
                        <div className="approval-settings">
                            <h4>Setting Persetujuan (Adjustment)</h4>

                            <div className="duration-adjustment">
                                <label>Berikan Durasi:</label>

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
                                        onClick={() => setGrantedDuration(Math.max(getMinValue(), grantedDuration - getStep()))}
                                        disabled={grantedDuration <= getMinValue()}
                                    >
                                        −
                                    </button>
                                    <input
                                        type="number"
                                        step={getStep()}
                                        min={getMinValue()}
                                        max={getMaxValue()}
                                        value={grantedDuration}
                                        onChange={(e) => setGrantedDuration(Math.min(getMaxValue(), Math.max(getMinValue(), parseFloat(e.target.value) || getMinValue())))}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setGrantedDuration(Math.min(getMaxValue(), grantedDuration + getStep()))}
                                        disabled={grantedDuration >= getMaxValue()}
                                    >
                                        +
                                    </button>
                                    <span className="duration-unit">{durationUnit === 'minutes' ? 'Menit' : 'Jam'}</span>
                                </div>

                                {/* Quick Select */}
                                <div className="duration-quick-select">
                                    {durationUnit === 'minutes' ? (
                                        <>
                                            <button type="button" onClick={() => setGrantedDuration(15)} className={grantedDuration === 15 ? 'active' : ''}>15m</button>
                                            <button type="button" onClick={() => setGrantedDuration(30)} className={grantedDuration === 30 ? 'active' : ''}>30m</button>
                                            <button type="button" onClick={() => setGrantedDuration(45)} className={grantedDuration === 45 ? 'active' : ''}>45m</button>
                                            <button type="button" onClick={() => setGrantedDuration(60)} className={grantedDuration === 60 ? 'active' : ''}>60m</button>
                                        </>
                                    ) : (
                                        <>
                                            <button type="button" onClick={() => setGrantedDuration(1)} className={grantedDuration === 1 ? 'active' : ''}>1j</button>
                                            <button type="button" onClick={() => setGrantedDuration(2)} className={grantedDuration === 2 ? 'active' : ''}>2j</button>
                                            <button type="button" onClick={() => setGrantedDuration(4)} className={grantedDuration === 4 ? 'active' : ''}>4j</button>
                                            <button type="button" onClick={() => setGrantedDuration(8)} className={grantedDuration === 8 ? 'active' : ''}>8j</button>
                                        </>
                                    )}
                                </div>

                                {getDurationInHours() !== selectedRequest.requestedDuration && (
                                    <span className="duration-changed">
                                        ⚠️ Durasi diubah dari {formatDuration(selectedRequest.requestedDuration)}
                                    </span>
                                )}
                            </div>

                            <div className="approver-note-section">
                                <label>Catatan Manager (Opsional):</label>
                                <textarea
                                    value={approverNote}
                                    onChange={(e) => setApproverNote(e.target.value)}
                                    placeholder="Contoh: Ok, tapi jangan lama-lama. 1 jam cukup ya."
                                    rows={2}
                                />
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="form-actions">
                            <Button variant="danger" onClick={() => setShowRejectForm(true)}>
                                ❌ Tolak
                            </Button>
                            <Button variant="success" onClick={handleApprove}>
                                ✅ Setujui & Aktifkan Sekarang
                            </Button>
                        </div>
                    </>
                ) : (
                    <>
                        {/* Reject Form */}
                        <div className="reject-form">
                            <h4>Alasan Penolakan</h4>
                            <textarea
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                placeholder="Jelaskan alasan penolakan..."
                                rows={3}
                            />
                        </div>

                        <div className="form-actions">
                            <Button variant="secondary" onClick={() => setShowRejectForm(false)}>
                                ← Kembali
                            </Button>
                            <Button variant="danger" onClick={handleReject}>
                                Konfirmasi Tolak
                            </Button>
                        </div>
                    </>
                )}
            </div>
        </Modal>
    );
}
