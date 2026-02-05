import './MachineStatusWidget.css';

export default function MachineStatusWidget({
    machineName = 'Crimper Hydraulic #1',
    totalCrimps = 12500,
    serviceInterval = 15000,
    lastService = '2024-01-01',
    status = 'operational'
}) {
    const crimpsUntilService = serviceInterval - (totalCrimps % serviceInterval);
    const serviceProgress = ((totalCrimps % serviceInterval) / serviceInterval) * 100;
    const isServiceSoon = crimpsUntilService < 1000;

    const statusConfig = {
        operational: { label: 'Operasional', color: 'var(--color-success)' },
        maintenance: { label: 'Dalam Perawatan', color: 'var(--color-warning)' },
        offline: { label: 'Offline', color: 'var(--color-danger)' }
    };

    const currentStatus = statusConfig[status] || statusConfig.operational;

    return (
        <div className="machine-widget">
            <div className="machine-header">
                <div className="machine-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="3" />
                        <path d="M12 1v4m0 14v4M4.22 4.22l2.83 2.83m9.9 9.9l2.83 2.83M1 12h4m14 0h4M4.22 19.78l2.83-2.83m9.9-9.9l2.83-2.83" />
                    </svg>
                </div>
                <div className="machine-info">
                    <span className="machine-name">{machineName}</span>
                    <span className="machine-status" style={{ color: currentStatus.color }}>
                        <span className="status-dot" style={{ backgroundColor: currentStatus.color }}></span>
                        {currentStatus.label}
                    </span>
                </div>
            </div>

            <div className="machine-stats">
                <div className="stat-item">
                    <span className="stat-value">{totalCrimps.toLocaleString()}</span>
                    <span className="stat-label">Total Crimps</span>
                </div>
                <div className={`stat-item ${isServiceSoon ? 'warning' : ''}`}>
                    <span className="stat-value">{crimpsUntilService.toLocaleString()}</span>
                    <span className="stat-label">Next Service</span>
                </div>
            </div>

            <div className="service-progress">
                <div className="progress-header">
                    <span>Service Interval</span>
                    <span>{Math.round(serviceProgress)}%</span>
                </div>
                <div className="progress-bar">
                    <div
                        className="progress-fill"
                        style={{
                            width: `${serviceProgress}%`,
                            backgroundColor: isServiceSoon ? 'var(--color-warning)' : 'var(--color-primary)'
                        }}
                    />
                </div>
            </div>

            {isServiceSoon && (
                <div className="service-alert">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                        <line x1="12" y1="9" x2="12" y2="13" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    <span>Service segera diperlukan!</span>
                </div>
            )}

            <div className="machine-meta">
                <span>Last Service: {lastService}</span>
            </div>
        </div>
    );
}
