import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Button from '../../components/common/Button/Button';
import StatusBadge from '../../components/common/Badge/StatusBadge';
import CrimpDiameterDisplay from '../../components/features/Crimping/CrimpDiameterDisplay';
import DieSetIndicator from '../../components/features/Crimping/DieSetIndicator';
import { getWizardSteps, updateJobLineProgress } from '../../services/productionApi';
import './KioskMode.css';

export default function KioskMode() {
    const navigate = useNavigate();
    const { jobId } = useParams(); // Start with job ID, then find incomplete line

    // Data state
    const [wizardData, setWizardData] = useState(null);
    const [currentLine, setCurrentLine] = useState(null);
    const [loading, setLoading] = useState(true);

    // Kiosk state
    const [step, setStep] = useState('scan'); // scan, input, validate, complete
    const [scannedMaterial, setScannedMaterial] = useState(null);
    const [measuredValue, setMeasuredValue] = useState('');
    const [validationResult, setValidationResult] = useState(null);

    useEffect(() => {
        loadWizardData();
    }, [jobId]);

    const loadWizardData = async () => {
        setLoading(true);
        try {
            // Fetch wizard steps for this job
            const res = await getWizardSteps(jobId);
            if (res.status === 'success') {
                setWizardData(res.data);

                // Find first incomplete line
                const lines = res.data.lines || [];
                const nextLine = lines.find(l => l.progress.pending > 0);

                if (nextLine) {
                    setCurrentLine(nextLine);
                } else {
                    // All done!
                    alert('Semua item untuk Job ini sudah selesai!');
                    navigate(`/production`);
                }
            }
        } catch (err) {
            console.error('Error loading kiosk data:', err);
        }
        setLoading(false);
    };

    // Exit kiosk mode with Escape key
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                navigate(`/production`);
            }
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [navigate]);

    const handleScan = () => {
        // Simulate successful scan
        // In real dev, this would use the camera/scanner input
        setScannedMaterial({
            hose: true,
            fitting: true
        });
        setStep('input');
    };

    const handleMeasurementInput = (value) => {
        setMeasuredValue(value);

        // Mock spec for now (real spec should come from API wizard steps)
        // Standard R2 hose usually around 28-30mm depending on size
        const target = 28.4;
        const tol = 0.5;

        if (value) {
            const measured = parseFloat(value);
            const difference = Math.abs(measured - target);
            const isPass = difference <= tol;

            setValidationResult({
                measured,
                difference: difference.toFixed(2),
                isPass,
                status: isPass ? 'pass' : 'fail'
            });
        } else {
            setValidationResult(null);
        }
    };

    const handleComplete = async () => {
        setStep('complete');

        // Optimistic update + API call
        try {
            await updateJobLineProgress(
                jobId,
                currentLine.id,
                1,
                `Measured: ${measuredValue}mm`
            );
        } catch (err) {
            console.error("Failed to update progress:", err);
            // In kiosk mode, we might just log error and continue to keep the flow moving, 
            // or show a small toast. for now just console.
        }

        setTimeout(() => {
            // Reset for next assembly
            setStep('scan');
            setScannedMaterial(null);
            setMeasuredValue('');
            setValidationResult(null);

            // Re-fetch to update progress
            loadWizardData();
        }, 2000);
    };

    const exitKiosk = () => {
        navigate(`/production`);
    };

    if (loading) return <div className="kiosk-loading">Memuat Mode Kiosk...</div>;
    if (!currentLine) return <div className="kiosk-error">Tidak ada item yang perlu dikerjakan.</div>;

    return (
        <div className="kiosk-mode">
            {/* Minimal Header */}
            <div className="kiosk-header">
                <div className="kiosk-job-info">
                    <span className="kiosk-job-id">{wizardData?.jo_number}</span>
                    <span className="kiosk-progress">
                        Item #{currentLine.line_number} • {currentLine.description}
                    </span>
                </div>
                <div className="kiosk-stats">
                    <span>Target: {currentLine.target.qty}</span>
                    <span>Selesai: {currentLine.progress.completed}</span>
                </div>
                <button className="kiosk-exit" onClick={exitKiosk}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                    Keluar
                </button>
            </div>

            {/* Scan Step */}
            {step === 'scan' && (
                <div className="kiosk-step kiosk-scan">
                    <div className="kiosk-instruction">
                        <span className="step-number">1</span>
                        <h2>SCAN MATERIAL</h2>
                        <p>Scan QR Code pada Hose dan Fitting</p>
                    </div>

                    <div className="material-status-kiosk">
                        <div className={`material-item-kiosk ${scannedMaterial?.hose ? 'scanned' : ''}`}>
                            <div className="material-icon-kiosk">
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="3" y="3" width="18" height="18" rx="2" />
                                    <circle cx="8.5" cy="8.5" r="1.5" />
                                    <path d="M21 15l-5-5L5 21" />
                                </svg>
                            </div>
                            <span>HOSE</span>
                            {scannedMaterial?.hose && <span className="check-icon">✓</span>}
                        </div>
                        <div className={`material-item-kiosk ${scannedMaterial?.fitting ? 'scanned' : ''}`}>
                            <div className="material-icon-kiosk">
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10" />
                                    <circle cx="12" cy="12" r="4" />
                                </svg>
                            </div>
                            <span>FITTING</span>
                            {scannedMaterial?.fitting && <span className="check-icon">✓</span>}
                        </div>
                    </div>

                    <button className="kiosk-btn kiosk-btn-large" onClick={handleScan}>
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                            <circle cx="12" cy="13" r="4" />
                        </svg>
                        SCAN BAHAN
                    </button>

                    <div className="kiosk-helper-text">
                        Tekan SPASI untuk scan simulasi
                    </div>
                </div>
            )}

            {/* Input Step */}
            {step === 'input' && (
                <div className="kiosk-step kiosk-input">
                    <div className="kiosk-spec-display">
                        <CrimpDiameterDisplay
                            targetDiameter="28.4" // TODO: Get from API Spec
                            tolerance="0.2"
                        />
                        <div className="kiosk-die-display">
                            <DieSetIndicator dieCode="D-28" size="lg" />
                        </div>
                    </div>

                    <div className="kiosk-instruction">
                        <span className="step-number">2</span>
                        <h2>INPUT HASIL UKUR</h2>
                        <p>Ukur diameter crimp dengan kaliper (Target: 28.4mm)</p>
                    </div>

                    <div className="kiosk-input-section">
                        <input
                            type="number"
                            className="kiosk-number-input"
                            value={measuredValue}
                            onChange={(e) => handleMeasurementInput(e.target.value)}
                            placeholder="0.00"
                            step="0.01"
                            autoFocus
                        />
                        <span className="kiosk-unit">mm</span>
                    </div>

                    {validationResult && (
                        <div className={`kiosk-result ${validationResult.isPass ? 'result-pass' : 'result-fail'}`}>
                            <StatusBadge status={validationResult.status} size="xl" pulse={!validationResult.isPass} />
                            <span className="result-text">
                                {validationResult.isPass ? 'DALAM TOLERANSI' : 'DI LUAR TOLERANSI!'}
                            </span>
                        </div>
                    )}

                    <button
                        className="kiosk-btn kiosk-btn-large kiosk-btn-success"
                        disabled={!validationResult?.isPass}
                        onClick={handleComplete}
                    >
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M9 12l2 2 4-4" />
                            <circle cx="12" cy="12" r="10" />
                        </svg>
                        SELESAI & CETAK
                    </button>
                </div>
            )}

            {/* Complete Step */}
            {step === 'complete' && (
                <div className="kiosk-step kiosk-complete">
                    <div className="complete-animation">
                        <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M9 12l2 2 4-4" />
                            <circle cx="12" cy="12" r="10" />
                        </svg>
                    </div>
                    <h2>ASSEMBLY SELESAI!</h2>
                    <p>Mencetak Label ID...</p>
                </div>
            )}

            {/* Footer */}
            <div className="kiosk-footer">
                <span>Mode Kiosk • Tekan ESC untuk keluar</span>
            </div>
        </div>
    );
}
