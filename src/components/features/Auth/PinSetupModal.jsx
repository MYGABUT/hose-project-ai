import { useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import Modal from '../../common/Modal/Modal';
import Button from '../../common/Button/Button';
import './PinSetupModal.css';

export default function PinSetupModal({ isOpen, onClose }) {
    const { user, setupPin, removePin, userHasPin, getUserPinMasked, deviceId } = useAuth();

    const [pin, setPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [step, setStep] = useState('input'); // 'input', 'confirm', 'success'
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const hasExistingPin = userHasPin();

    const handlePinInput = (digit, isConfirm = false) => {
        const currentPin = isConfirm ? confirmPin : pin;
        if (currentPin.length < 6) {
            const newPin = currentPin + digit;
            if (isConfirm) {
                setConfirmPin(newPin);
            } else {
                setPin(newPin);
            }
            setError('');
        }
    };

    const handleClear = (isConfirm = false) => {
        if (isConfirm) {
            setConfirmPin('');
        } else {
            setPin('');
        }
        setError('');
    };

    const handleBackspace = (isConfirm = false) => {
        if (isConfirm) {
            setConfirmPin(prev => prev.slice(0, -1));
        } else {
            setPin(prev => prev.slice(0, -1));
        }
        setError('');
    };

    const handleNext = () => {
        if (pin.length < 4) {
            setError('PIN minimal 4 digit');
            return;
        }
        setStep('confirm');
        setConfirmPin('');
    };

    const handleSubmit = async () => {
        if (pin !== confirmPin) {
            setError('PIN tidak cocok! Coba lagi.');
            setConfirmPin('');
            return;
        }

        setIsLoading(true);
        try {
            await setupPin(pin);
            setStep('success');
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRemovePin = async () => {
        setIsLoading(true);
        try {
            await removePin();
            handleClose();
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        setPin('');
        setConfirmPin('');
        setStep('input');
        setError('');
        onClose();
    };

    const renderKeypad = (isConfirm = false) => (
        <div className="pin-keypad">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'C', 0, '⌫'].map(key => (
                <button
                    key={key}
                    className={`keypad-btn ${key === 'C' || key === '⌫' ? 'action' : ''}`}
                    onClick={() => {
                        if (key === 'C') handleClear(isConfirm);
                        else if (key === '⌫') handleBackspace(isConfirm);
                        else handlePinInput(String(key), isConfirm);
                    }}
                    disabled={isLoading}
                >
                    {key}
                </button>
            ))}
        </div>
    );

    const renderPinDots = (currentPin) => (
        <div className="pin-display">
            {[0, 1, 2, 3, 4, 5].map(i => (
                <div key={i} className={`pin-dot ${i < currentPin.length ? 'filled' : ''}`}>
                    {i < currentPin.length ? '●' : '○'}
                </div>
            ))}
        </div>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title="🔐 Pengaturan PIN"
            size="sm"
        >
            <div className="pin-setup-content">
                {/* Step: Input PIN */}
                {step === 'input' && (
                    <>
                        <div className="setup-info">
                            <p>
                                {hasExistingPin
                                    ? 'Anda sudah memiliki PIN di perangkat ini. Buat PIN baru atau hapus PIN yang ada.'
                                    : 'Aktifkan PIN untuk login cepat di perangkat ini.'}
                            </p>
                            <div className="device-badge">
                                🖥️ {deviceId}
                            </div>
                        </div>

                        <h4>Masukkan PIN Baru (4-6 digit)</h4>
                        {renderPinDots(pin)}
                        {error && <div className="pin-error">{error}</div>}
                        {renderKeypad(false)}

                        <div className="setup-actions">
                            {hasExistingPin && (
                                <Button
                                    variant="danger"
                                    onClick={handleRemovePin}
                                    disabled={isLoading}
                                >
                                    🗑️ Hapus PIN
                                </Button>
                            )}
                            <Button
                                variant="primary"
                                onClick={handleNext}
                                disabled={pin.length < 4 || isLoading}
                            >
                                Lanjut →
                            </Button>
                        </div>
                    </>
                )}

                {/* Step: Confirm PIN */}
                {step === 'confirm' && (
                    <>
                        <h4>Konfirmasi PIN Anda</h4>
                        <p className="confirm-hint">Masukkan PIN yang sama untuk konfirmasi</p>
                        {renderPinDots(confirmPin)}
                        {error && <div className="pin-error">{error}</div>}
                        {renderKeypad(true)}

                        <div className="setup-actions">
                            <Button
                                variant="secondary"
                                onClick={() => setStep('input')}
                            >
                                ← Kembali
                            </Button>
                            <Button
                                variant="primary"
                                onClick={handleSubmit}
                                disabled={confirmPin.length < 4 || isLoading}
                            >
                                {isLoading ? 'Menyimpan...' : '✓ Simpan PIN'}
                            </Button>
                        </div>
                    </>
                )}

                {/* Step: Success */}
                {step === 'success' && (
                    <div className="success-state">
                        <span className="success-icon">✅</span>
                        <h4>PIN Berhasil Diaktifkan!</h4>
                        <p>Anda sekarang bisa login dengan PIN di perangkat ini.</p>
                        <div className="device-badge">
                            🖥️ {deviceId}
                        </div>
                        <Button variant="primary" onClick={handleClose}>
                            Selesai
                        </Button>
                    </div>
                )}

                {/* Current user info */}
                <div className="current-user">
                    <span>Akun: <strong>{user?.name}</strong></span>
                    {hasExistingPin && step === 'input' && (
                        <span className="pin-status">PIN: {getUserPinMasked()}</span>
                    )}
                </div>
            </div>
        </Modal>
    );
}
