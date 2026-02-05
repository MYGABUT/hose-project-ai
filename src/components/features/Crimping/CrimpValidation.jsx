import { useState, useEffect } from 'react';
import Input from '../../common/Input/Input';
import StatusBadge from '../../common/Badge/StatusBadge';
import './CrimpValidation.css';

export default function CrimpValidation({
    targetDiameter,
    tolerance,
    onValidationChange
}) {
    const [measuredValue, setMeasuredValue] = useState('');
    const [validationResult, setValidationResult] = useState(null);

    useEffect(() => {
        if (!measuredValue || isNaN(parseFloat(measuredValue))) {
            setValidationResult(null);
            onValidationChange?.(null);
            return;
        }

        const measured = parseFloat(measuredValue);
        const target = parseFloat(targetDiameter);
        const tol = parseFloat(tolerance);

        const difference = Math.abs(measured - target);
        const isWithinTolerance = difference <= tol;

        const result = {
            measured,
            difference: difference.toFixed(2),
            isPass: isWithinTolerance,
            status: isWithinTolerance ? 'pass' : 'fail'
        };

        setValidationResult(result);
        onValidationChange?.(result);
    }, [measuredValue, targetDiameter, tolerance, onValidationChange]);

    return (
        <div className="crimp-validation">
            <div className="validation-grid">
                <div className="validation-input-section">
                    <h4 className="validation-section-title">INPUT HASIL UKUR</h4>
                    <p className="validation-instruction">
                        Ukur hasil press menggunakan kaliper digital, lalu input:
                    </p>
                    <Input
                        type="number"
                        value={measuredValue}
                        onChange={(e) => setMeasuredValue(e.target.value)}
                        placeholder="0.00"
                        suffix="mm"
                        size="xl"
                        className="validation-input"
                    />
                </div>

                <div className="validation-arrow">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                </div>

                <div className="validation-result-section">
                    <h4 className="validation-section-title">STATUS VALIDASI</h4>
                    {validationResult ? (
                        <div className={`validation-result ${validationResult.isPass ? 'result-pass' : 'result-fail'}`}>
                            <StatusBadge
                                status={validationResult.status}
                                size="xl"
                                pulse={!validationResult.isPass}
                            />
                            <div className="result-details">
                                <span className="result-measured">
                                    Terukur: <strong>{validationResult.measured} mm</strong>
                                </span>
                                <span className="result-difference">
                                    Selisih: <strong>{validationResult.difference} mm</strong>
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div className="validation-pending">
                            <div className="pending-icon">
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10" />
                                    <path d="M12 6v6l4 2" />
                                </svg>
                            </div>
                            <span className="pending-text">Menunggu input...</span>
                        </div>
                    )}
                </div>
            </div>

            {validationResult && !validationResult.isPass && (
                <div className="validation-error-message">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="15" y1="9" x2="9" y2="15" />
                        <line x1="9" y1="9" x2="15" y2="15" />
                    </svg>
                    <span>
                        Hasil ukur di luar toleransi! Lakukan press ulang atau tandai sebagai SCRAP.
                    </span>
                </div>
            )}
        </div>
    );
}
