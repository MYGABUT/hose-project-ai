import './CrimpDiameterDisplay.css';

export default function CrimpDiameterDisplay({ targetDiameter, tolerance }) {
    return (
        <div className="crimp-diameter-display">
            <div className="diameter-label">TARGET DIAMETER CRIMP</div>
            <div className="diameter-box">
                <span className="diameter-value">{targetDiameter}</span>
                <span className="diameter-unit">mm</span>
            </div>
            <div className="tolerance-info">
                (+/- {tolerance} mm Toleransi)
            </div>
        </div>
    );
}
