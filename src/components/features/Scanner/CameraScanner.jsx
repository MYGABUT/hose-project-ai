import { useState, useRef, useEffect, useCallback } from 'react';
import Webcam from 'react-webcam';
import Button from '../../common/Button/Button';
import './CameraScanner.css';

const videoConstraints = {
    width: 1280,
    height: 720,
    facingMode: 'environment' // Use back camera on mobile
};

export default function CameraScanner({
    isOpen,
    onClose,
    onScanComplete,
    scanMode = 'qr', // 'qr' | 'ocr' | 'both'
    title = 'Scan Barcode/QR Code'
}) {
    const webcamRef = useRef(null);
    const fileInputRef = useRef(null);
    const [inputMode, setInputMode] = useState(null); // null | 'camera' | 'gallery'
    const [isProcessing, setIsProcessing] = useState(false);
    const [capturedImage, setCapturedImage] = useState(null);
    const [scanResult, setScanResult] = useState(null);
    const [error, setError] = useState(null);
    const [retryCount, setRetryCount] = useState(0);

    // Reset when closed
    useEffect(() => {
        if (!isOpen) {
            setInputMode(null);
            setCapturedImage(null);
            setScanResult(null);
            setError(null);
        }
    }, [isOpen]);

    // Simulate barcode detection
    const simulateBarcodeScan = useCallback((imageSrc) => {
        // In real app, use @zxing/library or html5-qrcode
        const mockResults = [
            { id: 'ROLL-2024-0899', type: 'internal_qr' },
            { id: 'INV-2024-0059', type: 'internal_qr' },
            { id: '8801234567890', type: 'vendor_barcode' }
        ];
        return mockResults[Math.floor(Math.random() * mockResults.length)];
    }, []);

    // Simulate OCR detection
    const simulateOCRScan = useCallback((imageSrc) => {
        // In real app, use Tesseract.js
        return {
            brand: 'GATES',
            type: '100R2',
            size: '3/4"',
            pressure: '5000 PSI',
            confidence: 0.87
        };
    }, []);

    // Process image (from camera or gallery)
    const processImage = useCallback(async (imageSrc) => {
        setIsProcessing(true);
        setError(null);
        setCapturedImage(imageSrc);

        // Simulate processing delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        try {
            let result = {};

            if (scanMode === 'qr' || scanMode === 'both') {
                const barcodeResult = simulateBarcodeScan(imageSrc);
                result.barcode = barcodeResult;
            }

            if (scanMode === 'ocr' || scanMode === 'both') {
                const ocrResult = simulateOCRScan(imageSrc);
                result.ocr = ocrResult;
            }

            // Simulate occasional failures for demo
            if (Math.random() < 0.1) {
                throw new Error('Gagal membaca kode. Pastikan kode terlihat jelas.');
            }

            setScanResult(result);
            setRetryCount(0);
        } catch (err) {
            setError(err.message);
            setRetryCount(prev => prev + 1);
        }

        setIsProcessing(false);
    }, [scanMode, simulateBarcodeScan, simulateOCRScan]);

    // Handle camera capture
    const handleCapture = useCallback(async () => {
        if (!webcamRef.current) return;
        const imageSrc = webcamRef.current.getScreenshot();
        processImage(imageSrc);
    }, [processImage]);

    // Handle gallery/file upload
    const handleFileSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            setError('File harus berupa gambar (JPG, PNG, etc.)');
            return;
        }

        // Read file as base64
        const reader = new FileReader();
        reader.onload = (event) => {
            const imageSrc = event.target?.result;
            if (typeof imageSrc === 'string') {
                processImage(imageSrc);
            }
        };
        reader.onerror = () => {
            setError('Gagal membaca file. Coba lagi.');
        };
        reader.readAsDataURL(file);
    };

    const handleConfirm = () => {
        onScanComplete?.({
            image: capturedImage,
            result: scanResult,
            timestamp: new Date().toISOString(),
            source: inputMode
        });
        handleReset();
        onClose();
    };

    const handleReset = () => {
        setCapturedImage(null);
        setScanResult(null);
        setError(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleClose = () => {
        handleReset();
        setInputMode(null);
        onClose();
    };

    const handleBackToModeSelect = () => {
        handleReset();
        setInputMode(null);
    };

    // Show retry tips after 3 failed attempts
    const showRetryTips = retryCount >= 3;

    if (!isOpen) return null;

    return (
        <div className="camera-scanner-overlay">
            <div className="camera-scanner-modal">
                <div className="scanner-header">
                    <h2 className="scanner-title">{title}</h2>
                    <button className="scanner-close" onClick={handleClose}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                <div className="scanner-content">
                    {/* Mode Selection */}
                    {!inputMode && !capturedImage && (
                        <div className="mode-selection">
                            <h3 className="mode-title">Pilih Sumber Gambar</h3>
                            <p className="mode-subtitle">Scan QR/Barcode dari kamera atau file gambar</p>

                            <div className="mode-options">
                                <button
                                    className="mode-option"
                                    onClick={() => setInputMode('camera')}
                                >
                                    <span className="mode-icon">📷</span>
                                    <span className="mode-label">Kamera</span>
                                    <span className="mode-desc">Ambil foto langsung</span>
                                </button>

                                <button
                                    className="mode-option"
                                    onClick={() => {
                                        setInputMode('gallery');
                                        setTimeout(() => fileInputRef.current?.click(), 100);
                                    }}
                                >
                                    <span className="mode-icon">🖼️</span>
                                    <span className="mode-label">Galeri</span>
                                    <span className="mode-desc">Pilih dari penyimpanan</span>
                                </button>
                            </div>

                            {/* Hidden file input */}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleFileSelect}
                                style={{ display: 'none' }}
                            />
                        </div>
                    )}

                    {/* Camera Mode */}
                    {inputMode === 'camera' && !capturedImage && (
                        <>
                            <div className="camera-wrapper">
                                <Webcam
                                    ref={webcamRef}
                                    audio={false}
                                    screenshotFormat="image/jpeg"
                                    videoConstraints={videoConstraints}
                                    className="camera-feed"
                                />
                                {/* Scanning overlay */}
                                <div className="scan-overlay">
                                    <div className="scan-corners">
                                        <span className="corner corner-tl"></span>
                                        <span className="corner corner-tr"></span>
                                        <span className="corner corner-bl"></span>
                                        <span className="corner corner-br"></span>
                                    </div>
                                    <p className="scan-instruction">
                                        Arahkan kamera ke {scanMode === 'ocr' ? 'label selang' : 'QR Code/Barcode'}
                                    </p>
                                </div>
                            </div>
                            <div className="camera-actions">
                                <Button
                                    variant="secondary"
                                    onClick={handleBackToModeSelect}
                                >
                                    ← Kembali
                                </Button>
                                <Button
                                    variant="primary"
                                    size="xl"
                                    onClick={handleCapture}
                                    loading={isProcessing}
                                    icon={
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <circle cx="12" cy="12" r="10" />
                                            <circle cx="12" cy="12" r="3" />
                                        </svg>
                                    }
                                >
                                    {isProcessing ? 'Memproses...' : 'CAPTURE'}
                                </Button>
                            </div>
                        </>
                    )}

                    {/* Gallery Mode - Waiting for file */}
                    {inputMode === 'gallery' && !capturedImage && !isProcessing && (
                        <div className="gallery-mode">
                            <div className="gallery-upload" onClick={() => fileInputRef.current?.click()}>
                                <span className="upload-icon">📁</span>
                                <p>Klik di sini untuk memilih gambar</p>
                                <p className="upload-hint">JPG, PNG, atau gambar lainnya</p>
                            </div>
                            <Button
                                variant="secondary"
                                onClick={handleBackToModeSelect}
                            >
                                ← Kembali
                            </Button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleFileSelect}
                                style={{ display: 'none' }}
                            />
                        </div>
                    )}

                    {/* Processing indicator */}
                    {isProcessing && !capturedImage && (
                        <div className="processing-indicator">
                            <div className="spinner"></div>
                            <p>Memproses gambar...</p>
                        </div>
                    )}

                    {/* Result Section */}
                    {capturedImage && (
                        <div className="scan-result-section">
                            {/* Captured image preview */}
                            <div className="captured-preview">
                                <img src={capturedImage} alt="Captured" />
                                <span className="source-badge">
                                    {inputMode === 'camera' ? '📷 Kamera' : '🖼️ Galeri'}
                                </span>
                            </div>

                            {/* Processing state */}
                            {isProcessing && (
                                <div className="processing-result">
                                    <div className="spinner"></div>
                                    <p>Menganalisis gambar...</p>
                                </div>
                            )}

                            {/* Error state */}
                            {error && !isProcessing && (
                                <div className="scan-error">
                                    <div className="error-icon">
                                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <circle cx="12" cy="12" r="10" />
                                            <line x1="15" y1="9" x2="9" y2="15" />
                                            <line x1="9" y1="9" x2="15" y2="15" />
                                        </svg>
                                    </div>
                                    <p className="error-message">{error}</p>

                                    {showRetryTips && (
                                        <div className="retry-tips">
                                            <h4>Tips untuk hasil lebih baik:</h4>
                                            <ul>
                                                <li>✓ Pastikan pencahayaan cukup terang</li>
                                                <li>✓ Gambar tidak blur atau buram</li>
                                                <li>✓ QR Code/Barcode terlihat jelas</li>
                                                <li>✓ Tidak ada refleksi atau bayangan</li>
                                            </ul>
                                        </div>
                                    )}

                                    <div className="error-actions">
                                        <Button variant="secondary" onClick={handleBackToModeSelect}>
                                            Pilih Sumber Lain
                                        </Button>
                                        <Button variant="primary" onClick={handleReset}>
                                            Coba Lagi
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Success result */}
                            {scanResult && !error && !isProcessing && (
                                <div className="scan-success">
                                    <div className="success-icon">
                                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                                            <path d="M22 4L12 14.01l-3-3" />
                                        </svg>
                                    </div>

                                    {scanResult.barcode && (
                                        <div className="result-item">
                                            <span className="result-label">ID Terdeteksi:</span>
                                            <span className="result-value">{scanResult.barcode.id}</span>
                                            <span className="result-type">
                                                {scanResult.barcode.type === 'internal_qr' ? 'QR Internal' : 'Barcode Vendor'}
                                            </span>
                                        </div>
                                    )}

                                    {scanResult.ocr && (
                                        <div className="result-ocr">
                                            <span className="result-label">Data OCR:</span>
                                            <div className="ocr-data">
                                                <span>Brand: {scanResult.ocr.brand}</span>
                                                <span>Type: {scanResult.ocr.type}</span>
                                                <span>Size: {scanResult.ocr.size}</span>
                                                <span className="confidence">
                                                    Confidence: {Math.round(scanResult.ocr.confidence * 100)}%
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    <div className="result-actions">
                                        <Button variant="secondary" onClick={handleReset}>
                                            Scan Ulang
                                        </Button>
                                        <Button variant="success" onClick={handleConfirm}>
                                            Konfirmasi & Lanjut
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="scanner-footer">
                    <span className="scanner-hint">
                        {!inputMode
                            ? 'Pilih sumber: Kamera untuk foto langsung, Galeri untuk gambar tersimpan'
                            : scanMode === 'both'
                                ? 'Mendukung QR Code, Barcode 1D, dan OCR label'
                                : scanMode === 'ocr'
                                    ? 'Mode OCR: Membaca teks pada label selang'
                                    : 'Scan QR Code atau Barcode 1D (UPC)'}
                    </span>
                </div>
            </div>
        </div>
    );
}
