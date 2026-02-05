import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useAccessRequest, RESTRICTED_FEATURES } from '../../contexts/AccessRequestContext';
import LockedButton from '../../components/features/AccessRequest/LockedButton';
import Button from '../../components/common/Button/Button';
import './AccessManagement.css';

export default function AccessManagement() {
    const { user } = useAuth();
    const {
        getMyRequests,
        getMyActiveGrants,
        getPendingRequestsForApprover,
        getSessionReportsForApprover,
        openApprovalModal,
        openRecapModal,
        logActivity
    } = useAccessRequest();

    const [demoMessage, setDemoMessage] = useState(null);

    // Show demo message
    const showDemoMessage = (msg) => {
        setDemoMessage(msg);
        setTimeout(() => setDemoMessage(null), 4000);
    };

    const [, forceUpdate] = useState(0);

    // Force re-render every second for timers
    useEffect(() => {
        const interval = setInterval(() => forceUpdate(n => n + 1), 1000);
        return () => clearInterval(interval);
    }, []);

    const myRequests = getMyRequests();
    const myGrants = getMyActiveGrants();
    const pendingApprovals = getPendingRequestsForApprover();
    const sessionReports = getSessionReportsForApprover();

    const formatTimeRemaining = (expiresAt) => {
        const ms = new Date(expiresAt).getTime() - Date.now();
        if (ms <= 0) return 'Kadaluarsa';

        const hours = Math.floor(ms / 3600000);
        const minutes = Math.floor((ms % 3600000) / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);

        if (hours > 0) {
            return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        }
        return `${minutes}:${String(seconds).padStart(2, '0')}`;
    };

    // Demo: Simulate logging activity
    const handleDemoEditHPP = () => {
        logActivity('UPDATE', 'Hose R2 1 inch', 'Rp 50.000', 'Rp 55.000');
        showDemoMessage('✅ Demo: Activity logged - Update HPP Hose R2');
    };

    return (
        <div className="access-management-page">
            {/* Demo Message Toast */}
            {demoMessage && (
                <div className="demo-toast">
                    {demoMessage}
                </div>
            )}

            <div className="page-header">
                <h1>🔐 Access Management (PAM)</h1>
                <p>Privileged Access Management - Temporary Privilege Escalation</p>
            </div>

            {/* Demo: Locked Features */}
            <section className="demo-section">
                <h2>Demo: Fitur Terkunci</h2>
                <p className="section-desc">
                    Klik tombol terkunci untuk mengajukan request akses sementara ke atasan.
                </p>

                <div className="locked-features-grid">
                    {Object.values(RESTRICTED_FEATURES).map(feature => (
                        <div key={feature.id} className="feature-demo-card">
                            <span className="feature-demo-icon">{feature.icon}</span>
                            <div className="feature-demo-info">
                                <span className="feature-demo-label">{feature.label}</span>
                                <span className="feature-demo-module">Modul: {feature.module}</span>
                            </div>
                            <LockedButton
                                featureId={feature.id}
                                onClick={handleDemoEditHPP}
                            >
                                Akses
                            </LockedButton>
                        </div>
                    ))}
                </div>
            </section>

            {/* My Active Grants */}
            {myGrants.length > 0 && (
                <section className="grants-section">
                    <h2>⏱️ Akses Sementara Aktif</h2>
                    <div className="grants-list">
                        {myGrants.map(grant => (
                            <div key={grant.id} className={`grant-card ${grant.hasGracePeriod ? 'grace' : ''}`}>
                                <div className="grant-info">
                                    <span className="grant-feature">🔓 {grant.featureLabel}</span>
                                    <span className="grant-meta">
                                        Disetujui oleh {grant.grantedByName} • {grant.grantedDuration} jam
                                        {grant.hasGracePeriod && <span className="grace-tag"> (Grace Period)</span>}
                                    </span>
                                </div>
                                <div className="grant-timer">
                                    <span className="timer-label">Sisa:</span>
                                    <span className="timer-value">{formatTimeRemaining(grant.expiresAt)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Pending Approvals (for managers) */}
            {pendingApprovals.length > 0 && (
                <section className="approvals-section">
                    <h2>📥 Permintaan Menunggu Approval ({pendingApprovals.length})</h2>
                    <div className="requests-list">
                        {pendingApprovals.map(req => (
                            <div key={req.id} className={`request-card pending ${req.priority === 'high' ? 'high-priority' : ''}`}>
                                <div className="request-info">
                                    <span className="request-user">
                                        {req.userName}
                                        {req.type === 'extension' && <span className="extension-tag">🚨 PERPANJANGAN</span>}
                                    </span>
                                    <span className="request-feature">Minta akses: {req.featureLabel}</span>
                                    <span className="request-reason">"{req.reason}"</span>
                                </div>
                                <Button variant="primary" onClick={() => openApprovalModal(req)}>
                                    Review
                                </Button>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Session Reports (for managers) */}
            {sessionReports.length > 0 && (
                <section className="reports-section">
                    <h2>📄 Laporan Sesi PAM</h2>
                    <p className="section-desc">Klik untuk melihat detail aktivitas selama sesi.</p>
                    <div className="reports-list">
                        {sessionReports.slice().reverse().slice(0, 10).map(session => (
                            <div
                                key={session.id}
                                className={`report-card ${session.isEarlyLock ? 'early-lock' : ''}`}
                                onClick={() => openRecapModal(session)}
                            >
                                <div className="report-info">
                                    <span className="report-user">{session.userName}</span>
                                    <span className="report-feature">{session.featureLabel}</span>
                                    <span className="report-meta">
                                        {session.durationUsedMinutes} menit • {session.activityCount} perubahan
                                    </span>
                                </div>
                                <div className="report-status">
                                    {session.isEarlyLock ? (
                                        <span className="early-lock-badge">✅ EARLY LOCK</span>
                                    ) : (
                                        <span className="expired-badge">⏱️ Expired</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* My Requests History */}
            <section className="history-section">
                <h2>📋 Riwayat Permintaan Saya</h2>
                {myRequests.length === 0 ? (
                    <p className="empty-message">Belum ada permintaan akses.</p>
                ) : (
                    <div className="requests-list">
                        {myRequests.slice().reverse().map(req => (
                            <div key={req.id} className={`request-card ${req.status}`}>
                                <div className="request-info">
                                    <span className="request-feature">{req.featureLabel}</span>
                                    <span className="request-reason">"{req.reason}"</span>
                                    <span className="request-meta">
                                        Durasi diminta: {req.requestedDuration} jam •
                                        Approver: {req.approverName}
                                    </span>
                                </div>
                                <div className={`request-status ${req.status}`}>
                                    {req.status === 'pending' && '⏳ Menunggu'}
                                    {req.status === 'approved' && `✅ Disetujui (${req.grantedDuration}j)`}
                                    {req.status === 'rejected' && '❌ Ditolak'}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* Info Box */}
            <section className="info-section">
                <div className="info-box">
                    <h3>ℹ️ Cara Kerja PAM</h3>
                    <ol>
                        <li>User klik fitur terkunci (🔒)</li>
                        <li>Form request muncul - pilih durasi & alasan</li>
                        <li>Notifikasi masuk ke HP Manager</li>
                        <li>Manager bisa adjust durasi & approve/reject</li>
                        <li>Jika approved, tombol unlock & timer muncul</li>
                        <li>⚠️ 5 menit terakhir: Peringatan muncul</li>
                        <li>🚨 1 menit terakhir: Bisa minta perpanjangan (+Grace Period 5 menit)</li>
                        <li>Setelah waktu habis, akses otomatis dicabut</li>
                        <li>📄 Laporan aktivitas dikirim ke Manager</li>
                    </ol>
                </div>
            </section>
        </div>
    );
}

