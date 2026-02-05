import { useState, useEffect } from 'react';
import { useAccessRequest } from '../../../contexts/AccessRequestContext';
import Button from '../../common/Button/Button';
import './ExpiryWarningModal.css';

export default function ExpiryWarningModal() {
    const {
        showExpiryWarning,
        expiringGrant,
        dismissExpiryWarning,
        requestExtension,
        earlyFinish
    } = useAccessRequest();

    const [, forceUpdate] = useState(0);
    const [showConfirmFinish, setShowConfirmFinish] = useState(false);
    const [extensionSent, setExtensionSent] = useState(false);

    // Update countdown every second
    useEffect(() => {
        if (showExpiryWarning) {
            const interval = setInterval(() => forceUpdate(n => n + 1), 1000);
            return () => clearInterval(interval);
        }
    }, [showExpiryWarning]);

    // Reset states when modal closes
    useEffect(() => {
        if (!showExpiryWarning) {
            setShowConfirmFinish(false);
            setExtensionSent(false);
        }
    }, [showExpiryWarning]);

    if (!showExpiryWarning || !expiringGrant) return null;

    const remaining = new Date(expiringGrant.expiresAt).getTime() - Date.now();

    // Determine warning level
    const getWarningLevel = () => {
        if (remaining <= 30 * 1000) return 'critical'; // 30 seconds
        if (remaining <= 60 * 1000) return 'danger';   // 1 minute
        if (remaining <= 2 * 60 * 1000) return 'urgent'; // 2 minutes
        return 'warning'; // 5 minutes
    };

    const warningLevel = getWarningLevel();
    const isCritical = warningLevel === 'critical' || warningLevel === 'danger';

    // Calculate progress percentage (5 min = 0%, 0 = 100%)
    const maxWarningTime = 5 * 60 * 1000; // 5 minutes in ms
    const progressPercent = Math.min(100, Math.max(0, ((maxWarningTime - remaining) / maxWarningTime) * 100));

    const formatTime = (ms) => {
        if (ms <= 0) return '0:00';
        const minutes = Math.floor(ms / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        return `${minutes}:${String(seconds).padStart(2, '0')}`;
    };

    const getWarningTitle = () => {
        switch (warningLevel) {
            case 'critical': return '⛔ AKSES AKAN BERAKHIR!';
            case 'danger': return '🚨 Waktu Hampir Habis!';
            case 'urgent': return '⚠️ Kurang dari 2 Menit';
            default: return '⏰ Peringatan Waktu';
        }
    };

    const getWarningMessage = () => {
        switch (warningLevel) {
            case 'critical':
                return (
                    <div className="warning-message-critical">
                        <strong>SEGERA SIMPAN PEKERJAAN ANDA!</strong>
                        <br />
                        Akses akan terkunci dalam hitungan detik.
                    </div>
                );
            case 'danger':
                return 'Simpan pekerjaan Anda SEKARANG! Waktu akan berakhir kurang dari 1 menit lagi.';
            case 'urgent':
                return 'Pastikan semua perubahan sudah tersimpan. Butuh tambahan waktu?';
            default:
                return 'Waktu akses Anda akan berakhir. Silakan simpan pekerjaan atau minta perpanjangan.';
        }
    };

    const handleRequestExtension = () => {
        requestExtension(expiringGrant.id, 15);
        setExtensionSent(true);
    };

    const handleConfirmEarlyFinish = () => {
        earlyFinish(expiringGrant.id);
        dismissExpiryWarning();
        setShowConfirmFinish(false);
    };

    // Early finish confirmation view
    if (showConfirmFinish) {
        return (
            <div className="expiry-warning-modal confirm-modal">
                <div className="warning-content confirm-content">
                    <div className="confirm-header">
                        <span className="confirm-icon">🔒</span>
                        <h3>Konfirmasi Akhiri Sesi</h3>
                    </div>

                    <div className="confirm-info">
                        <div className="confirm-feature">
                            {expiringGrant.featureLabel}
                        </div>
                        <p className="confirm-remaining">
                            Sisa waktu: <strong>{formatTime(remaining)}</strong>
                        </p>
                    </div>

                    <div className="confirm-warning-box">
                        <span className="confirm-warning-icon">ℹ️</span>
                        <div className="confirm-warning-text">
                            <strong>Anda yakin ingin mengakhiri akses sekarang?</strong>
                            <p>Akses akan segera dikunci dan tidak dapat diaktifkan kembali tanpa permintaan baru.</p>
                        </div>
                    </div>

                    <div className="confirm-benefits">
                        <p>✅ Mengakhiri lebih awal menunjukkan tanggung jawab keamanan</p>
                        <p>🏆 Anda akan mendapatkan badge "Disiplin Keamanan"</p>
                    </div>

                    <div className="confirm-actions">
                        <Button
                            variant="secondary"
                            onClick={() => setShowConfirmFinish(false)}
                            size="lg"
                        >
                            ← Kembali
                        </Button>
                        <Button
                            variant="danger"
                            onClick={handleConfirmEarlyFinish}
                            size="lg"
                        >
                            🔒 Ya, Akhiri Sekarang
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    // Extension sent confirmation view
    if (extensionSent) {
        return (
            <div className="expiry-warning-modal extension-sent">
                <div className="warning-content extension-content">
                    <div className="extension-sent-header">
                        <span className="success-icon">✅</span>
                        <h3>Permintaan Perpanjangan Terkirim!</h3>
                    </div>

                    <div className="extension-info">
                        <div className="grace-period-info">
                            <span className="grace-icon">⏸️</span>
                            <div>
                                <strong>Grace Period 5 Menit Diberikan</strong>
                                <p>Anda mendapat tambahan waktu sementara selagi menunggu approval.</p>
                            </div>
                        </div>
                    </div>

                    <div className="extension-timer">
                        <span className="timer-label">Sisa Waktu Saat Ini:</span>
                        <span className="timer-value grace">{formatTime(remaining)}</span>
                    </div>

                    <div className="extension-note">
                        <p>📋 Permintaan perpanjangan +15 menit telah dikirim ke:</p>
                        <strong>{expiringGrant.grantedByName || 'Approver'}</strong>
                    </div>

                    <div className="warning-actions single">
                        <Button
                            variant="primary"
                            onClick={() => {
                                dismissExpiryWarning();
                                setExtensionSent(false);
                            }}
                            size="lg"
                        >
                            Lanjutkan Bekerja →
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`expiry-warning-modal ${warningLevel}`}>
            <div className="warning-content">
                {/* Progress bar at top */}
                <div className="warning-progress-container">
                    <div
                        className={`warning-progress-bar ${warningLevel}`}
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>

                <div className="warning-header">
                    <span className="warning-title">{getWarningTitle()}</span>
                    {!isCritical && (
                        <button
                            className="warning-minimize"
                            onClick={dismissExpiryWarning}
                            title="Sembunyikan sementara"
                        >
                            ✕
                        </button>
                    )}
                </div>

                {/* Big Timer Display */}
                <div className={`warning-timer-display ${warningLevel}`}>
                    <div className="timer-circle">
                        <span className="timer-value">{formatTime(remaining)}</span>
                        <span className="timer-unit">tersisa</span>
                    </div>
                </div>

                <div className="warning-feature">
                    <span className="feature-icon">🔓</span>
                    <span className="feature-label">{expiringGrant.featureLabel}</span>
                </div>

                <p className="warning-message">{getWarningMessage()}</p>

                {expiringGrant.hasGracePeriod && (
                    <div className="grace-period-badge">
                        <span className="badge-icon">⏸️</span>
                        <span>Grace Period Aktif - Menunggu Approval Perpanjangan</span>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="warning-actions-grid">
                    {!expiringGrant.hasGracePeriod && (
                        <button
                            className="action-card extension"
                            onClick={handleRequestExtension}
                        >
                            <span className="action-icon">⏱️</span>
                            <span className="action-title">Minta Tambahan Waktu</span>
                            <span className="action-desc">+15 menit (dengan persetujuan)</span>
                        </button>
                    )}

                    <button
                        className="action-card save-work"
                        onClick={dismissExpiryWarning}
                    >
                        <span className="action-icon">💾</span>
                        <span className="action-title">Lanjut & Simpan</span>
                        <span className="action-desc">Sembunyikan peringatan ini</span>
                    </button>

                    <button
                        className="action-card finish-early"
                        onClick={() => setShowConfirmFinish(true)}
                    >
                        <span className="action-icon">🔒</span>
                        <span className="action-title">Selesai Lebih Awal</span>
                        <span className="action-desc">Kunci akses sekarang</span>
                    </button>
                </div>

                {/* Urgent Actions for Critical State */}
                {isCritical && !expiringGrant.hasGracePeriod && (
                    <div className="critical-actions">
                        <Button
                            variant="warning"
                            onClick={handleRequestExtension}
                            size="lg"
                            className="full-width pulse-button"
                        >
                            🚨 MINTA PERPANJANGAN DARURAT
                        </Button>
                    </div>
                )}

                {/* Quick tip */}
                <div className="warning-tip">
                    <span className="tip-icon">💡</span>
                    <span className="tip-text">
                        {isCritical
                            ? 'Klik "Minta Perpanjangan Darurat" untuk mendapat grace period 5 menit otomatis!'
                            : 'Peringatan ini akan muncul kembali jika disembunyikan.'
                        }
                    </span>
                </div>
            </div>
        </div>
    );
}
