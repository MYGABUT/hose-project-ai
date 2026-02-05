/**
 * Cutting Wizard - Step-by-step cutting guide for technicians
 * Best-Fit Algorithm visualization with barcode scanning
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Card from '../../components/common/Card/Card';
import Button from '../../components/common/Button/Button';
import { getWizardSteps, scanMaterial, completeCutting, startJobOrder, completeJobOrder } from '../../services/productionApi';
import './CuttingWizard.css';

export default function CuttingWizard() {
    const { joId } = useParams();
    const navigate = useNavigate();

    const [wizard, setWizard] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentLine, setCurrentLine] = useState(0);
    const [actionLoading, setActionLoading] = useState(false);
    const [scanMode, setScanMode] = useState(false);
    const [scanInput, setScanInput] = useState('');
    const [message, setMessage] = useState(null);

    useEffect(() => {
        loadWizard();
    }, [joId]);

    const loadWizard = async () => {
        setLoading(true);
        const result = await getWizardSteps(joId);
        if (result.status === 'success') {
            setWizard(result.data);
        }
        setLoading(false);
    };

    const handleStart = async () => {
        setActionLoading(true);
        const result = await startJobOrder(joId);
        if (result.status === 'success') {
            showMessage('success', '🚀 Job Order dimulai!');
            loadWizard();
        } else {
            showMessage('error', result.message);
        }
        setActionLoading(false);
    };

    const handleScan = async () => {
        if (!scanInput.trim()) return;

        const currentStep = getCurrentStep();
        if (!currentStep) return;

        setActionLoading(true);
        const result = await scanMaterial(currentStep.material_id, scanInput.trim());

        if (result.status === 'success') {
            showMessage('success', `✅ ${result.message}`);
            setScanMode(false);
            setScanInput('');
            loadWizard();
        } else {
            showMessage('error', `❌ ${result.message}`);
        }
        setActionLoading(false);
    };

    const handleCompleteCut = async () => {
        const currentStep = getCurrentStep();
        if (!currentStep) return;

        setActionLoading(true);
        const result = await completeCutting(
            currentStep.material_id,
            currentStep.instruction.take_from_roll
        );

        if (result.status === 'success') {
            showMessage('success', `✂️ Pemotongan selesai! Sisa roll: ${result.roll_remaining}m`);
            loadWizard();
        } else {
            showMessage('error', result.message);
        }
        setActionLoading(false);
    };

    const handleComplete = async () => {
        setActionLoading(true);
        const result = await completeJobOrder(joId);
        if (result.status === 'success') {
            showMessage('success', '🎉 Job Order selesai!');
            setTimeout(() => navigate('/production/job-orders'), 2000);
        } else {
            showMessage('error', result.message);
        }
        setActionLoading(false);
    };

    const showMessage = (type, text) => {
        setMessage({ type, text });
        setTimeout(() => setMessage(null), 4000);
    };

    const getCurrentStep = () => {
        if (!wizard?.lines?.[currentLine]?.steps) return null;
        const steps = wizard.lines[currentLine].steps;
        return steps.find(s => s.status !== 'CONSUMED') || steps[0];
    };

    const getProgressPercent = () => {
        if (!wizard?.lines?.[currentLine]) return 0;
        const line = wizard.lines[currentLine];
        const total = line.target.qty;
        const completed = line.progress.completed;
        return Math.round((completed / total) * 100);
    };

    if (loading) {
        return (
            <div className="wizard-page">
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Memuat wizard...</p>
                </div>
            </div>
        );
    }

    if (!wizard) {
        return (
            <div className="wizard-page">
                <div className="empty-state">
                    <span className="empty-icon">⚠️</span>
                    <h3>Job Order tidak ditemukan</h3>
                    <Button onClick={() => navigate('/production/job-orders')}>
                        Kembali
                    </Button>
                </div>
            </div>
        );
    }

    const currentLineData = wizard.lines[currentLine];
    const currentStep = getCurrentStep();
    const isWizardComplete = wizard.lines.every(
        l => l.progress.completed >= l.target.qty
    );

    return (
        <div className="wizard-page">
            {/* Header */}
            <div className="wizard-header">
                <button className="back-btn" onClick={() => navigate('/production/job-orders')}>
                    ← Kembali
                </button>
                <div className="wizard-title">
                    <h1>✂️ Cutting Wizard</h1>
                    <span className="jo-number">{wizard.jo_number}</span>
                </div>
                <div className="wizard-status">
                    <span className={`status-badge ${wizard.status === 'IN_PROGRESS' ? 'green' : 'blue'}`}>
                        {wizard.status}
                    </span>
                </div>
            </div>

            {/* Message Toast */}
            {message && (
                <div className={`toast-message ${message.type}`}>
                    {message.text}
                </div>
            )}

            {/* Line Selector */}
            {wizard.lines.length > 1 && (
                <div className="line-selector">
                    {wizard.lines.map((line, idx) => (
                        <button
                            key={idx}
                            className={`line-tab ${currentLine === idx ? 'active' : ''}`}
                            onClick={() => setCurrentLine(idx)}
                        >
                            Line {line.line_number}
                            {line.progress.completed >= line.target.qty && ' ✓'}
                        </button>
                    ))}
                </div>
            )}

            {/* Main Wizard Content */}
            {wizard.status === 'DRAFT' ? (
                <Card className="start-card">
                    <div className="start-content">
                        <span className="start-icon">🚀</span>
                        <h2>Siap Memulai?</h2>
                        <p>Klik tombol di bawah untuk mulai proses pemotongan</p>
                        <Button
                            variant="primary"
                            size="lg"
                            onClick={handleStart}
                            loading={actionLoading}
                        >
                            Mulai Job Order
                        </Button>
                    </div>
                </Card>
            ) : isWizardComplete ? (
                <Card className="complete-card">
                    <div className="complete-content">
                        <span className="complete-icon">🎉</span>
                        <h2>Semua Pemotongan Selesai!</h2>
                        <p>Lanjutkan ke proses assembly dan finishing</p>
                        <Button
                            variant="success"
                            size="lg"
                            onClick={handleComplete}
                            loading={actionLoading}
                        >
                            Selesaikan Job Order
                        </Button>
                    </div>
                </Card>
            ) : (
                <>
                    {/* Target Info */}
                    <Card className="target-card">
                        <h3>🎯 TARGET</h3>
                        <div className="target-info">
                            <div className="target-qty">
                                <span className="big-number">{currentLineData?.target?.qty || 0}</span>
                                <span className="unit">Pcs</span>
                            </div>
                            <div className="target-details">
                                <p className="target-desc">{currentLineData?.description}</p>
                                <p className="target-spec">
                                    @ {currentLineData?.target?.cut_length || 0}m = Total {currentLineData?.target?.total_length || 0}m
                                </p>
                            </div>
                        </div>
                        <div className="progress-section">
                            <div className="progress-header">
                                <span>Progress</span>
                                <span>{currentLineData?.progress?.completed || 0} / {currentLineData?.target?.qty || 0}</span>
                            </div>
                            <div className="progress-bar">
                                <div className="progress-fill" style={{ width: `${getProgressPercent()}%` }}></div>
                            </div>
                        </div>
                    </Card>

                    {/* Current Step */}
                    {currentStep && (
                        <Card className="step-card">
                            <div className="step-header">
                                <span className="step-number">STEP {currentStep.step_number}</span>
                                <span className={`step-status ${currentStep.status.toLowerCase()}`}>
                                    {currentStep.status}
                                </span>
                            </div>

                            <div className="step-instruction">
                                <div className="roll-info">
                                    <div className="roll-badge">
                                        <span className="roll-icon">🎲</span>
                                        <span className="roll-barcode">{currentStep.batch?.barcode}</span>
                                    </div>
                                    <div className="roll-location">
                                        <span>📍</span>
                                        <span>{currentStep.batch?.location}</span>
                                    </div>
                                    <div className="roll-qty">
                                        Sisa: <strong>{currentStep.batch?.current_qty}m</strong>
                                    </div>
                                </div>

                                <div className="cut-instruction">
                                    <div className="cut-action">
                                        <span className="cut-icon">✂️</span>
                                        <div>
                                            <p className="cut-label">POTONG</p>
                                            <p className="cut-value">{currentStep.instruction?.take_from_roll}m</p>
                                        </div>
                                    </div>
                                    <div className="cut-result">
                                        <span className="result-icon">📦</span>
                                        <div>
                                            <p className="result-label">Sisa Roll</p>
                                            <p className="result-value">
                                                {currentStep.instruction?.roll_after_cut}m
                                                {currentStep.instruction?.is_finish_roll && ' (HABIS)'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="step-actions">
                                {currentStep.scan_required ? (
                                    scanMode ? (
                                        <div className="scan-input-container">
                                            <input
                                                type="text"
                                                className="scan-input"
                                                placeholder="Scan atau ketik barcode roll..."
                                                value={scanInput}
                                                onChange={(e) => setScanInput(e.target.value.toUpperCase())}
                                                onKeyDown={(e) => e.key === 'Enter' && handleScan()}
                                                autoFocus
                                            />
                                            <Button
                                                variant="primary"
                                                onClick={handleScan}
                                                loading={actionLoading}
                                            >
                                                ✓ Verify
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                onClick={() => { setScanMode(false); setScanInput(''); }}
                                            >
                                                Batal
                                            </Button>
                                        </div>
                                    ) : (
                                        <Button
                                            variant="primary"
                                            size="lg"
                                            onClick={() => setScanMode(true)}
                                            icon={<span>📷</span>}
                                        >
                                            Scan Barcode Roll
                                        </Button>
                                    )
                                ) : (
                                    <Button
                                        variant="success"
                                        size="lg"
                                        onClick={handleCompleteCut}
                                        loading={actionLoading}
                                        icon={<span>✓</span>}
                                    >
                                        Selesai Potong
                                    </Button>
                                )}
                            </div>
                        </Card>
                    )}
                </>
            )}
        </div>
    );
}
