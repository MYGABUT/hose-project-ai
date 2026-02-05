import './StatusBadge.css';

export default function StatusBadge({
    status,
    size = 'md',
    pulse = false,
    className = ''
}) {
    const statusConfig = {
        pass: { label: 'PASS', variant: 'success' },
        ok: { label: 'OK', variant: 'success' },
        verified: { label: 'VERIFIED', variant: 'success' },
        fail: { label: 'FAIL', variant: 'danger' },
        reject: { label: 'REJECT', variant: 'danger' },
        error: { label: 'ERROR', variant: 'danger' },
        pending: { label: 'PENDING', variant: 'warning' },
        warning: { label: 'WARNING', variant: 'warning' },
        info: { label: 'INFO', variant: 'info' },
        processing: { label: 'PROCESSING', variant: 'info' },
        offline: { label: 'OFFLINE', variant: 'danger' },
        online: { label: 'ONLINE', variant: 'success' }
    };

    const config = statusConfig[status?.toLowerCase()] || { label: status, variant: 'info' };

    return (
        <span className={`badge badge-${config.variant} badge-${size} ${pulse ? 'badge-pulse' : ''} ${className}`}>
            <span className="badge-dot"></span>
            <span className="badge-label">{config.label}</span>
        </span>
    );
}
