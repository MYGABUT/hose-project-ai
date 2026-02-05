import { useState, useEffect } from 'react';
import { useAccessRequest } from '../../../contexts/AccessRequestContext';
import './AccessTimer.css';

export default function AccessTimer() {
    const { getMyActiveGrants, earlyFinish } = useAccessRequest();
    const [, forceUpdate] = useState(0);
    const [showDropdown, setShowDropdown] = useState(false);

    // Force re-render every second to update countdown
    useEffect(() => {
        const interval = setInterval(() => {
            forceUpdate(n => n + 1);
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    const activeGrants = getMyActiveGrants();

    if (activeGrants.length === 0) return null;

    const formatTime = (ms) => {
        const totalSeconds = Math.floor(ms / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        if (hours > 0) {
            return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        }
        return `${minutes}:${String(seconds).padStart(2, '0')}`;
    };

    // Get the grant with shortest remaining time
    const now = Date.now();
    const grantsWithTime = activeGrants.map(g => ({
        ...g,
        remaining: new Date(g.expiresAt).getTime() - now
    })).filter(g => g.remaining > 0);

    if (grantsWithTime.length === 0) return null;

    const shortestGrant = grantsWithTime.reduce((a, b) =>
        a.remaining < b.remaining ? a : b
    );

    const isUrgent = shortestGrant.remaining < 5 * 60 * 1000;
    const isCritical = shortestGrant.remaining < 60 * 1000;

    const handleEarlyFinish = (grantId) => {
        const remainingMinutes = Math.floor(grantsWithTime.find(g => g.id === grantId)?.remaining / 60000);
        if (confirm(`Anda masih punya sisa waktu ${remainingMinutes} menit. Yakin ingin mengunci kembali sekarang?`)) {
            earlyFinish(grantId);
            setShowDropdown(false);
        }
    };

    return (
        <div className="access-timer-wrapper">
            <button
                className={`access-timer ${isUrgent ? 'urgent' : ''} ${isCritical ? 'critical' : ''}`}
                onClick={() => setShowDropdown(!showDropdown)}
            >
                <span className="timer-icon">⏱️</span>
                <div className="timer-content">
                    <span className="timer-label">Sisa Akses:</span>
                    <span className="timer-value">{formatTime(shortestGrant.remaining)}</span>
                </div>
                {grantsWithTime.length > 1 && (
                    <span className="timer-badge">+{grantsWithTime.length - 1}</span>
                )}
                {shortestGrant.hasGracePeriod && (
                    <span className="grace-badge">Grace</span>
                )}
            </button>

            {showDropdown && (
                <>
                    <div className="timer-dropdown">
                        <div className="dropdown-header">
                            <span>🔓 Akses Aktif</span>
                        </div>
                        {grantsWithTime.map(grant => (
                            <div key={grant.id} className="grant-item">
                                <div className="grant-info">
                                    <span className="grant-feature">{grant.featureLabel}</span>
                                    <span className="grant-time">{formatTime(grant.remaining)}</span>
                                </div>
                                <button
                                    className="early-finish-btn"
                                    onClick={() => handleEarlyFinish(grant.id)}
                                    title="Selesaikan Sesi & Kunci"
                                >
                                    🔒
                                </button>
                            </div>
                        ))}
                        <div className="dropdown-footer">
                            <small>Klik 🔒 untuk mengakhiri sesi lebih awal</small>
                        </div>
                    </div>
                    <div className="timer-overlay" onClick={() => setShowDropdown(false)} />
                </>
            )}
        </div>
    );
}

