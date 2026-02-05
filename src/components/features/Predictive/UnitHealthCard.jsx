import Button from '../../common/Button/Button';
import HealthBar from './HealthBar';
import './UnitHealthCard.css';

export default function UnitHealthCard({ unit, gradeConfig, onShare }) {
    const criticalHoses = unit.hoses.filter(h => h.status === 'critical');
    const warningHoses = unit.hoses.filter(h => h.status === 'warning');

    return (
        <div className="unit-health-card">
            {/* Header with gradient */}
            <div className={`card-header grade-${unit.grade.toLowerCase()}`}>
                <div className="card-badge">
                    <span className="badge-icon">{gradeConfig[unit.grade].icon}</span>
                    <span className="badge-text">{gradeConfig[unit.grade].label}</span>
                </div>
                <div className="card-unit-name">{unit.name}</div>
                <div className="card-client">{unit.client}</div>
            </div>

            {/* Photo section */}
            <div className="card-photo">
                <div className="photo-placeholder-large">
                    🚜
                </div>
                <div className="photo-overlay">
                    <span className="overlay-text">DIGITAL TRACKING ENABLED</span>
                </div>
            </div>

            {/* Health Summary */}
            <div className="card-summary">
                <h4>KESEHATAN HIDROLIK</h4>
                {unit.hoses.map(hose => (
                    <HealthBar key={hose.id} hose={hose} compact={true} />
                ))}
            </div>

            {/* Alerts */}
            {criticalHoses.length > 0 && (
                <div className="card-alert critical">
                    <span className="alert-icon">🚨</span>
                    <div className="alert-content">
                        <strong>KRITIS!</strong>
                        <span>{criticalHoses.length} selang perlu diganti segera</span>
                    </div>
                </div>
            )}

            {warningHoses.length > 0 && criticalHoses.length === 0 && (
                <div className="card-alert warning">
                    <span className="alert-icon">⚠️</span>
                    <div className="alert-content">
                        <strong>PERHATIAN</strong>
                        <span>{warningHoses.length} selang perlu dicek</span>
                    </div>
                </div>
            )}

            {criticalHoses.length === 0 && warningHoses.length === 0 && (
                <div className="card-alert good">
                    <span className="alert-icon">✅</span>
                    <div className="alert-content">
                        <strong>KONDISI PRIMA</strong>
                        <span>Semua sistem hidrolik dalam kondisi baik</span>
                    </div>
                </div>
            )}

            {/* Footer */}
            <div className="card-footer">
                <div className="footer-verified">
                    <span className="verified-icon">✓</span>
                    <span>Verified by HOSE PRO</span>
                </div>
                <div className="footer-date">
                    {new Date().toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                    })}
                </div>
            </div>

            {/* Action Buttons */}
            <div className="card-actions">
                <Button variant="success" fullWidth onClick={onShare}>
                    📤 Share ke WhatsApp
                </Button>
                {criticalHoses.length > 0 && (
                    <Button variant="danger" fullWidth>
                        🛒 Buat Penawaran Penggantian
                    </Button>
                )}
            </div>
        </div>
    );
}
