import './HealthBar.css';

export default function HealthBar({ hose, compact = false }) {
    const getStatusColor = (status) => {
        switch (status) {
            case 'good': return 'var(--color-success)';
            case 'warning': return 'var(--color-warning)';
            case 'critical': return 'var(--color-danger)';
            default: return 'var(--color-border)';
        }
    };

    const getStatusGradient = (status) => {
        switch (status) {
            case 'good': return 'linear-gradient(90deg, #4caf50, #81c784)';
            case 'warning': return 'linear-gradient(90deg, #ff9800, #ffb74d)';
            case 'critical': return 'linear-gradient(90deg, #f44336, #e57373)';
            default: return 'linear-gradient(90deg, #9e9e9e, #bdbdbd)';
        }
    };

    const getStatusLabel = (status, percent) => {
        if (status === 'critical') return 'KRITIS!';
        if (status === 'warning') return 'Perhatian';
        if (percent < 30) return 'Baru';
        if (percent < 60) return 'Baik';
        return 'Aman';
    };

    if (compact) {
        return (
            <div className="health-bar-compact">
                <div className="bar-label">
                    <span className="bar-position">{hose.position}</span>
                    <span className={`bar-status status-${hose.status}`}>
                        {Math.round(hose.usedPercent)}%
                    </span>
                </div>
                <div className="bar-track">
                    <div
                        className={`bar-fill status-${hose.status}`}
                        style={{ width: `${hose.usedPercent}%` }}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className={`health-bar status-${hose.status}`}>
            <div className="bar-header">
                <span className="bar-id">{hose.id}</span>
                <span className="bar-position">{hose.position}</span>
            </div>

            <div className="bar-visual">
                <div className="bar-track-full">
                    {/* Segmented bar like battery */}
                    {[...Array(10)].map((_, i) => (
                        <div
                            key={i}
                            className={`bar-segment ${i < Math.round(hose.usedPercent / 10) ? `filled status-${hose.status}` : ''}`}
                        />
                    ))}
                </div>
                <div className="bar-percent">
                    <span className="percent-value">{Math.round(hose.usedPercent)}%</span>
                    <span className="percent-label">Terpakai</span>
                </div>
            </div>

            <div className="bar-footer">
                <span className="bar-remaining">
                    {hose.usedPercent >= 90
                        ? '⚠️ Segera Ganti!'
                        : `Sisa ${100 - Math.round(hose.usedPercent)}% masa pakai`}
                </span>
                <span className={`bar-status-label status-${hose.status}`}>
                    {getStatusLabel(hose.status, hose.usedPercent)}
                </span>
            </div>
        </div>
    );
}
