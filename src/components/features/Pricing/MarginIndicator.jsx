import './MarginIndicator.css';

// Margin thresholds
const MARGIN_THRESHOLDS = {
    danger: 0,      // < 0% = merah (rugi)
    warning: 15,    // < 15% = kuning
    good: 25,       // < 25% = hijau muda
    excellent: 35   // >= 35% = hijau tua
};

export default function MarginIndicator({
    costPrice,
    sellingPrice,
    showBreakdown = false
}) {
    const cost = parseFloat(costPrice) || 0;
    const price = parseFloat(sellingPrice) || 0;

    // Calculate margin
    const profit = price - cost;
    const marginPercent = cost > 0 ? ((profit / cost) * 100) : 0;

    // Determine status
    let status = 'excellent';
    let statusLabel = 'Excellent';
    let statusIcon = '🎯';

    if (marginPercent < MARGIN_THRESHOLDS.danger) {
        status = 'danger';
        statusLabel = 'RUGI!';
        statusIcon = '⚠️';
    } else if (marginPercent < MARGIN_THRESHOLDS.warning) {
        status = 'warning';
        statusLabel = 'Tipis';
        statusIcon = '⚡';
    } else if (marginPercent < MARGIN_THRESHOLDS.good) {
        status = 'good';
        statusLabel = 'Cukup';
        statusIcon = '👍';
    } else if (marginPercent < MARGIN_THRESHOLDS.excellent) {
        status = 'great';
        statusLabel = 'Bagus';
        statusIcon = '✅';
    }

    // Format currency
    const formatCurrency = (value) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(value);
    };

    return (
        <div className={`margin-indicator status-${status}`}>
            <div className="margin-header">
                <span className="margin-label">MARGIN ANDA</span>
                <span className="margin-icon">{statusIcon}</span>
            </div>

            <div className="margin-value">
                <span className="margin-sign">{marginPercent >= 0 ? '+' : ''}</span>
                <span className="margin-percent">{marginPercent.toFixed(1)}%</span>
                <span className="margin-status">({statusLabel})</span>
            </div>

            {marginPercent < 0 && (
                <div className="margin-warning">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                        <line x1="12" y1="9" x2="12" y2="13" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    <span>Harga di bawah modal! Perusahaan akan rugi.</span>
                </div>
            )}

            {showBreakdown && (
                <div className="margin-breakdown">
                    <div className="breakdown-row">
                        <span className="breakdown-label">Modal (HPP)</span>
                        <span className="breakdown-value cost">{formatCurrency(cost)}</span>
                    </div>
                    <div className="breakdown-row">
                        <span className="breakdown-label">Harga Jual</span>
                        <span className="breakdown-value">{formatCurrency(price)}</span>
                    </div>
                    <div className="breakdown-divider" />
                    <div className="breakdown-row profit">
                        <span className="breakdown-label">Profit</span>
                        <span className={`breakdown-value ${profit >= 0 ? 'positive' : 'negative'}`}>
                            {formatCurrency(profit)}
                        </span>
                    </div>
                </div>
            )}

            {/* Visual bar */}
            <div className="margin-bar-wrapper">
                <div className="margin-bar">
                    <div
                        className="margin-bar-fill"
                        style={{
                            width: `${Math.min(Math.max(marginPercent, 0), 100)}%`
                        }}
                    />
                    <div className="margin-thresholds">
                        <span className="threshold" style={{ left: '0%' }}>0%</span>
                        <span className="threshold" style={{ left: '15%' }}>15%</span>
                        <span className="threshold" style={{ left: '25%' }}>25%</span>
                        <span className="threshold" style={{ left: '35%' }}>35%</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
