import { useState, useEffect } from 'react';
import { getSecurityStatus, detectPhishing, verifyDomain, initializeSecurity } from '../../../utils/security';
import './SecurityIndicator.css';

/**
 * Security Indicator Component
 * Shows security status in the UI and warns about phishing
 */
export default function SecurityIndicator() {
    const [securityStatus, setSecurityStatus] = useState(null);
    const [phishingStatus, setPhishingStatus] = useState(null);
    const [domainStatus, setDomainStatus] = useState(null);
    const [showDetails, setShowDetails] = useState(false);
    const [showWarning, setShowWarning] = useState(false);

    useEffect(() => {
        // Initialize security on mount
        const status = initializeSecurity();
        setSecurityStatus(status);

        // Check for phishing
        const phishing = detectPhishing();
        setPhishingStatus(phishing);
        setShowWarning(phishing.isPhishing);

        // Verify domain
        const domain = verifyDomain();
        setDomainStatus(domain);

        // If phishing detected, show prominent warning
        if (phishing.isPhishing || !domain.isValid) {
            setShowWarning(true);
        }
    }, []);

    if (!securityStatus) return null;

    const getStatusIcon = () => {
        switch (securityStatus.level) {
            case 'secure': return '🔒';
            case 'good': return '✅';
            case 'warning': return '⚠️';
            default: return '❌';
        }
    };

    const getStatusColor = () => {
        switch (securityStatus.level) {
            case 'secure': return '#10b981';
            case 'good': return '#22c55e';
            case 'warning': return '#f59e0b';
            default: return '#ef4444';
        }
    };

    return (
        <>
            {/* Phishing Warning Banner */}
            {showWarning && (
                <div className="phishing-warning">
                    <div className="warning-content">
                        <span className="warning-icon">🚨</span>
                        <div className="warning-text">
                            <strong>PERINGATAN KEAMANAN</strong>
                            {phishingStatus?.warnings?.map((w, i) => (
                                <p key={i}>⚠️ {w.message}</p>
                            ))}
                            {!domainStatus?.isValid && (
                                <p>❌ Domain tidak dikenali: <code>{domainStatus?.domain}</code></p>
                            )}
                        </div>
                        <button
                            className="warning-close"
                            onClick={() => setShowWarning(false)}
                        >
                            ✕
                        </button>
                    </div>
                    <div className="warning-tip">
                        💡 Pastikan Anda mengakses <strong>https://hosepro.id</strong> atau <strong>localhost</strong> untuk pengembangan
                    </div>
                </div>
            )}

            {/* Security Badge (Bottom Corner) */}
            <div
                className={`security-badge ${securityStatus.level}`}
                onClick={() => setShowDetails(!showDetails)}
                title="Klik untuk detail keamanan"
            >
                <span className="badge-icon">{getStatusIcon()}</span>
                <span className="badge-text" style={{ color: getStatusColor() }}>
                    {securityStatus.level === 'secure' ? 'Aman' :
                        securityStatus.level === 'good' ? 'Baik' :
                            securityStatus.level === 'warning' ? 'Waspada' : 'Bahaya'}
                </span>
            </div>

            {/* Security Details Modal */}
            {showDetails && (
                <div className="security-details">
                    <div className="details-header">
                        <h3>🛡️ Status Keamanan</h3>
                        <button onClick={() => setShowDetails(false)}>✕</button>
                    </div>

                    <div className="details-score">
                        <div
                            className="score-circle"
                            style={{
                                background: `conic-gradient(${getStatusColor()} ${securityStatus.percentage}%, #e5e7eb ${securityStatus.percentage}%)`
                            }}
                        >
                            <span>{securityStatus.percentage}%</span>
                        </div>
                        <p>Skor Keamanan</p>
                    </div>

                    <div className="details-checks">
                        <div className={`check-item ${securityStatus.checks.domain ? 'pass' : 'fail'}`}>
                            <span className="check-icon">{securityStatus.checks.domain ? '✅' : '❌'}</span>
                            <span>Domain Terverifikasi</span>
                        </div>
                        <div className={`check-item ${securityStatus.checks.secure ? 'pass' : 'fail'}`}>
                            <span className="check-icon">{securityStatus.checks.secure ? '✅' : '❌'}</span>
                            <span>Koneksi Aman (HTTPS)</span>
                        </div>
                        <div className={`check-item ${securityStatus.checks.session ? 'pass' : 'fail'}`}>
                            <span className="check-icon">{securityStatus.checks.session ? '✅' : '❌'}</span>
                            <span>Sesi Tervalidasi</span>
                        </div>
                        <div className={`check-item ${!phishingStatus?.isPhishing ? 'pass' : 'fail'}`}>
                            <span className="check-icon">{!phishingStatus?.isPhishing ? '✅' : '❌'}</span>
                            <span>Bebas Phishing</span>
                        </div>
                    </div>

                    <div className="details-domain">
                        <span className="domain-label">Domain:</span>
                        <code>{window.location.hostname}</code>
                    </div>

                    <div className="details-tip">
                        <span>💡</span>
                        <p>Selalu periksa URL sebelum memasukkan data sensitif. Website resmi HOSE PRO hanya di <strong>hosepro.id</strong></p>
                    </div>
                </div>
            )}
        </>
    );
}
