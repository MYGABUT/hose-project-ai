import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth, ROLE_CONFIG } from '../../contexts/AuthContext';
import Button from '../../components/common/Button/Button';
import './Login.css';

export default function Login() {
    const navigate = useNavigate();
    const location = useLocation();
    const {
        loginByEmail,
        loginByBarcode,
        loginByPin,
        isAuthenticated,
        hasPinSetup,
        deviceId
    } = useAuth();

    // Default to PIN if device has PIN setup, otherwise email
    const [loginMode, setLoginMode] = useState('email');
    const [pin, setPin] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Set initial login mode based on device PIN setup
    useEffect(() => {
        if (hasPinSetup) {
            setLoginMode('pin');
        }
    }, [hasPinSetup]);

    // Redirect if already authenticated
    useEffect(() => {
        if (isAuthenticated) {
            const from = location.state?.from?.pathname || '/';
            navigate(from, { replace: true });
        }
    }, [isAuthenticated, navigate, location]);

    const handlePinInput = (digit) => {
        if (pin.length < 6) {
            const newPin = pin + digit;
            setPin(newPin);
            setError('');

            // Auto-submit when 4-6 digits entered
            if (newPin.length >= 4) {
                // Delay to show the last digit
                setTimeout(() => handlePinLogin(newPin), 200);
            }
        }
    };

    const handlePinClear = () => {
        setPin('');
        setError('');
    };

    const handlePinBackspace = () => {
        setPin(prev => prev.slice(0, -1));
        setError('');
    };

    const handlePinLogin = async (pinCode) => {
        setIsLoading(true);
        setError('');

        try {
            await loginByPin(pinCode);
            const from = location.state?.from?.pathname || '/';
            navigate(from, { replace: true });
        } catch (err) {
            setError(err.message);
            setPin('');
        } finally {
            setIsLoading(false);
        }
    };

    const handleEmailLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            await loginByEmail(email, password);
            const from = location.state?.from?.pathname || '/';
            navigate(from, { replace: true });
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleBarcodeLogin = async (userId) => {
        setIsLoading(true);
        setError('');

        try {
            await loginByBarcode(userId);
            const from = location.state?.from?.pathname || '/';
            navigate(from, { replace: true });
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-container">
                {/* Brand Header */}
                <div className="login-header">
                    <div className="brand-logo">
                        <span className="logo-icon">⚙️</span>
                        <span className="logo-text">HOSE PRO</span>
                    </div>
                    <p className="brand-tagline">Hydraulic Hose Inventory System</p>
                </div>

                {/* Login Mode Tabs */}
                <div className="login-tabs">
                    <button
                        className={`tab ${loginMode === 'email' ? 'active' : ''}`}
                        onClick={() => setLoginMode('email')}
                    >
                        ✉️ Email
                    </button>
                    <button
                        className={`tab ${loginMode === 'barcode' ? 'active' : ''}`}
                        onClick={() => setLoginMode('barcode')}
                    >
                        📱 Badge/QR
                    </button>
                    {hasPinSetup && (
                        <button
                            className={`tab ${loginMode === 'pin' ? 'active' : ''}`}
                            onClick={() => setLoginMode('pin')}
                        >
                            🔢 PIN Cepat
                        </button>
                    )}
                </div>

                {/* Email Login */}
                {loginMode === 'email' && (
                    <div className="email-login">
                        <h3>Masuk dengan Email</h3>

                        <form onSubmit={handleEmailLogin}>
                            <div className="form-group">
                                <label>Email</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="nama@hosepro.id"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Password</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                />
                            </div>

                            {error && <div className="login-error">{error}</div>}

                            <Button type="submit" variant="primary" fullWidth disabled={isLoading}>
                                {isLoading ? 'Memproses...' : 'Masuk'}
                            </Button>
                        </form>

                        <div className="login-info">
                            <p>💡 Setelah login, Anda bisa mengaktifkan <strong>PIN Login</strong> untuk akses cepat di perangkat ini.</p>
                        </div>
                    </div>
                )}

                {/* Barcode/QR Badge Login */}
                {loginMode === 'barcode' && (
                    <div className="qr-login">
                        <h3>Scan Badge / QR Code</h3>

                        <div className="qr-scanner-placeholder">
                            <span className="scanner-icon">📷</span>
                            <span>Arahkan kamera ke Badge Karyawan</span>
                        </div>

                        <div className="demo-users">
                            <p className="demo-label">Gunakan Badge Karyawan Anda</p>
                            {/* Demo section removed */}
                        </div>
                    </div>
                )}

                {/* PIN Login (only if device has PIN setup) */}
                {loginMode === 'pin' && hasPinSetup && (
                    <div className="pin-login">
                        <h3>Login Cepat dengan PIN</h3>
                        <p className="pin-subtitle">PIN ini terikat dengan perangkat Anda</p>

                        {/* PIN Display */}
                        <div className="pin-display">
                            {[0, 1, 2, 3, 4, 5].map(i => (
                                <div key={i} className={`pin-dot ${i < pin.length ? 'filled' : ''}`}>
                                    {i < pin.length ? '●' : '○'}
                                </div>
                            ))}
                        </div>

                        {error && <div className="login-error">{error}</div>}

                        {/* PIN Keypad */}
                        <div className="pin-keypad">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'C', 0, '⌫'].map(key => (
                                <button
                                    key={key}
                                    className={`keypad-btn ${key === 'C' || key === '⌫' ? 'action' : ''}`}
                                    onClick={() => {
                                        if (key === 'C') handlePinClear();
                                        else if (key === '⌫') handlePinBackspace();
                                        else handlePinInput(String(key));
                                    }}
                                    disabled={isLoading}
                                >
                                    {key}
                                </button>
                            ))}
                        </div>

                        <p className="login-hint">Masukkan 4-6 digit PIN Anda</p>
                    </div>
                )}

                {/* Device Info */}
                <div className="device-info">
                    <span className="device-label">🖥️ Device ID:</span>
                    <span className="device-id">{deviceId || 'Loading...'}</span>
                </div>


            </div>
        </div>
    );
}
