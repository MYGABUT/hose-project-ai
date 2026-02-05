import './DieSetIndicator.css';

// Die set color mapping for crimping
const dieColors = {
    'D-20': { color: '#2563EB', name: 'Biru' },
    'D-24': { color: '#16A34A', name: 'Hijau' },
    'D-28': { color: '#DC2626', name: 'Merah' },
    'D-32': { color: '#9333EA', name: 'Ungu' },
    'D-36': { color: '#EA580C', name: 'Oranye' },
    'D-40': { color: '#EAB308', name: 'Kuning' },
    'D-44': { color: '#18181B', name: 'Hitam' },
    'D-48': { color: '#F4F4F5', name: 'Putih' }
};

export default function DieSetIndicator({ dieCode, size = 'md' }) {
    const die = dieColors[dieCode] || { color: '#64748B', name: 'Unknown' };

    return (
        <div className={`die-indicator die-indicator-${size}`}>
            <div
                className="die-color-block"
                style={{ backgroundColor: die.color }}
            >
                {dieCode === 'D-48' && <span className="die-inner-text">⬜</span>}
            </div>
            <div className="die-info">
                <span className="die-code">{dieCode}</span>
                <span className="die-color-name">({die.name})</span>
            </div>
        </div>
    );
}
