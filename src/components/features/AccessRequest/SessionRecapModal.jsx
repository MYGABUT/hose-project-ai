import { useAccessRequest } from '../../../contexts/AccessRequestContext';
import Modal from '../../common/Modal/Modal';
import Button from '../../common/Button/Button';
import './SessionRecapModal.css';

export default function SessionRecapModal() {
    const {
        showRecapModal,
        recapSession,
        setShowRecapModal
    } = useAccessRequest();

    if (!showRecapModal || !recapSession) return null;

    const formatDuration = (minutes) => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        if (hours > 0) {
            return `${hours} jam ${mins} menit`;
        }
        return `${mins} menit`;
    };

    const formatTimestamp = (ts) => {
        return new Date(ts).toLocaleString('id-ID', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <Modal
            isOpen={showRecapModal}
            onClose={() => setShowRecapModal(false)}
            title="📄 Laporan Aktivitas PAM"
            size="md"
        >
            <div className="session-recap">
                {/* Session Header */}
                <div className="recap-header">
                    <div className="recap-user">
                        <span className="user-avatar">
                            {recapSession.userName?.charAt(0).toUpperCase()}
                        </span>
                        <div className="user-info">
                            <span className="user-name">{recapSession.userName}</span>
                            <span className="session-time">
                                {new Date(recapSession.completedAt).toLocaleString('id-ID')}
                            </span>
                        </div>
                    </div>

                    {recapSession.isEarlyLock && (
                        <span className="early-lock-badge">✅ EARLY LOCK</span>
                    )}
                </div>

                {/* Feature & Duration */}
                <div className="recap-stats">
                    <div className="stat-item">
                        <span className="stat-label">Fitur</span>
                        <span className="stat-value">🔓 {recapSession.featureLabel}</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-label">Durasi Dipakai</span>
                        <span className="stat-value">{formatDuration(recapSession.durationUsedMinutes)}</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-label">Jatah Awal</span>
                        <span className="stat-value">{recapSession.grantedDuration} Jam</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-label">Status</span>
                        <span className={`stat-value status ${recapSession.endReason}`}>
                            {recapSession.endReason === 'expired' && '⏱️ Kadaluarsa'}
                            {recapSession.endReason === 'early_lock' && '🔒 Early Lock'}
                        </span>
                    </div>
                </div>

                {/* Activity Log */}
                <div className="recap-activities">
                    <h4>📋 Aktivitas ({recapSession.activityCount} perubahan)</h4>

                    {recapSession.activities.length === 0 ? (
                        <p className="no-activities">Tidak ada perubahan data selama sesi ini.</p>
                    ) : (
                        <table className="activity-table">
                            <thead>
                                <tr>
                                    <th>Waktu</th>
                                    <th>Aksi</th>
                                    <th>Item</th>
                                    <th>Sebelum</th>
                                    <th>Sesudah</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recapSession.activities.map(log => (
                                    <tr key={log.id}>
                                        <td className="time-col">{formatTimestamp(log.timestamp)}</td>
                                        <td>
                                            <span className={`action-badge ${log.action.toLowerCase()}`}>
                                                {log.action}
                                            </span>
                                        </td>
                                        <td>{log.targetItem}</td>
                                        <td className="value-col old">{log.oldValue || '-'}</td>
                                        <td className="value-col new">{log.newValue || '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Footer */}
                <div className="recap-footer">
                    <span className="approver-info">
                        Disetujui oleh: {recapSession.approverName}
                    </span>
                    <Button variant="primary" onClick={() => setShowRecapModal(false)}>
                        Tutup
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
