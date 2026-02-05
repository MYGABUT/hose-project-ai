import { useState, useRef } from 'react';
import Button from '../../common/Button/Button';
import './QCApproval.css';

export default function QCApproval({
    onApprove,
    onReject,
    inspectorName = 'QC Inspector'
}) {
    const [mode, setMode] = useState('pin'); // 'pin' or 'signature'
    const [pin, setPin] = useState(['', '', '', '']);
    const [signatureData, setSignatureData] = useState(null);
    const [isApproving, setIsApproving] = useState(false);
    const canvasRef = useRef(null);
    const pinRefs = [useRef(), useRef(), useRef(), useRef()];
    const [isDrawing, setIsDrawing] = useState(false);

    // PIN handling
    const handlePinChange = (index, value) => {
        if (value.length > 1) return;
        if (!/^\d*$/.test(value)) return;

        const newPin = [...pin];
        newPin[index] = value;
        setPin(newPin);

        // Auto focus next input
        if (value && index < 3) {
            pinRefs[index + 1].current?.focus();
        }
    };

    const handlePinKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !pin[index] && index > 0) {
            pinRefs[index - 1].current?.focus();
        }
    };

    // Signature handling
    const startDrawing = (e) => {
        setIsDrawing(true);
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX || e.touches[0].clientX) - rect.left;
        const y = (e.clientY || e.touches[0].clientY) - rect.top;
        ctx.beginPath();
        ctx.moveTo(x, y);
    };

    const draw = (e) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX || e.touches[0].clientX) - rect.left;
        const y = (e.clientY || e.touches[0].clientY) - rect.top;
        ctx.lineTo(x, y);
        ctx.stroke();
    };

    const stopDrawing = () => {
        setIsDrawing(false);
        if (canvasRef.current) {
            setSignatureData(canvasRef.current.toDataURL());
        }
    };

    const clearSignature = () => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#1E293B';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        setSignatureData(null);
    };

    // Initialize canvas
    useState(() => {
        if (canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            ctx.strokeStyle = '#1E293B';
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
        }
    }, []);

    const handleApprove = async () => {
        const isValid = mode === 'pin'
            ? pin.every(d => d !== '')
            : signatureData !== null;

        if (!isValid) return;

        setIsApproving(true);
        await new Promise(resolve => setTimeout(resolve, 500));

        onApprove?.({
            method: mode,
            data: mode === 'pin' ? pin.join('') : signatureData,
            timestamp: new Date().toISOString()
        });
        setIsApproving(false);
    };

    const isPinComplete = pin.every(d => d !== '');

    return (
        <div className="qc-approval">
            <div className="approval-header">
                <h3 className="approval-title">Approval QC Inspector</h3>
                <p className="approval-subtitle">
                    Validasi hasil tes oleh <strong>{inspectorName}</strong>
                </p>
            </div>

            {/* Mode Tabs */}
            <div className="approval-tabs">
                <button
                    className={`approval-tab ${mode === 'pin' ? 'active' : ''}`}
                    onClick={() => setMode('pin')}
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" />
                        <path d="M7 11V7a5 5 0 0110 0v4" />
                    </svg>
                    PIN 4 Digit
                </button>
                <button
                    className={`approval-tab ${mode === 'signature' ? 'active' : ''}`}
                    onClick={() => setMode('signature')}
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 19l7-7 3 3-7 7-3-3z" />
                        <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
                        <path d="M2 2l7.586 7.586" />
                    </svg>
                    Tanda Tangan
                </button>
            </div>

            {/* PIN Input */}
            {mode === 'pin' && (
                <div className="pin-section">
                    <p className="pin-instruction">Masukkan PIN 4 digit Anda:</p>
                    <div className="pin-inputs">
                        {pin.map((digit, idx) => (
                            <input
                                key={idx}
                                ref={pinRefs[idx]}
                                type="password"
                                maxLength={1}
                                value={digit}
                                onChange={(e) => handlePinChange(idx, e.target.value)}
                                onKeyDown={(e) => handlePinKeyDown(idx, e)}
                                className="pin-input"
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Signature Canvas */}
            {mode === 'signature' && (
                <div className="signature-section">
                    <p className="signature-instruction">Tanda tangan di area di bawah:</p>
                    <div className="canvas-wrapper">
                        <canvas
                            ref={canvasRef}
                            width={400}
                            height={150}
                            onMouseDown={startDrawing}
                            onMouseMove={draw}
                            onMouseUp={stopDrawing}
                            onMouseLeave={stopDrawing}
                            onTouchStart={startDrawing}
                            onTouchMove={draw}
                            onTouchEnd={stopDrawing}
                            className="signature-canvas"
                        />
                        <button className="clear-signature" onClick={clearSignature}>
                            Hapus
                        </button>
                    </div>
                </div>
            )}

            {/* Actions */}
            <div className="approval-actions">
                <Button
                    variant="danger"
                    size="lg"
                    onClick={onReject}
                >
                    REJECT
                </Button>
                <Button
                    variant="success"
                    size="lg"
                    disabled={mode === 'pin' ? !isPinComplete : !signatureData}
                    loading={isApproving}
                    onClick={handleApprove}
                >
                    APPROVE & SERTIFIKASI
                </Button>
            </div>
        </div>
    );
}
