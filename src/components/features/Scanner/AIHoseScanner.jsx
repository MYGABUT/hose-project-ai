import { useState, useRef, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import { scanHoseImage, scanMultipleHoseImages, checkAIHealth } from '../../../services/aiScannerApi';
import Button from '../../common/Button/Button';
import './AIHoseScanner.css';

export default function AIHoseScanner({ isOpen, onClose, onDetectionComplete }) {
    const webcamRef = useRef(null);
    const [mode, setMode] = useState('camera'); // camera | gallery | result
    const [isScanning, setIsScanning] = useState(false);
    const [capturedImages, setCapturedImages] = useState([]); // Array of images now
    const [scanResult, setScanResult] = useState(null);
    const [aiOnline, setAiOnline] = useState(null);
    const [error, setError] = useState(null);

    // Check AI backend health on mount
    useEffect(() => {
        if (isOpen) {
            checkAIHealth().then(setAiOnline);
        }
    }, [isOpen]);

    // Capture from webcam (add to collection)
    const captureImage = useCallback(() => {
        if (webcamRef.current && capturedImages.length < 5) {
            const imageSrc = webcamRef.current.getScreenshot();
            setCapturedImages(prev => [...prev, { dataUrl: imageSrc, blob: null }]);
        }
    }, [capturedImages.length]);

    // Handle gallery upload (multiple files)
    const handleFileUpload = (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        // Limit to remaining slots (max 5 total)
        const remaining = 5 - capturedImages.length;
        const filesToAdd = files.slice(0, remaining);

        filesToAdd.forEach(file => {
            const reader = new FileReader();
            reader.onload = (event) => {
                setCapturedImages(prev => [...prev, {
                    dataUrl: event.target.result,
                    file: file
                }]);
            };
            reader.readAsDataURL(file);
        });
    };

    // Remove an image from collection
    const removeImage = (index) => {
        setCapturedImages(prev => prev.filter((_, i) => i !== index));
    };

    // Process all images
    const processAllImages = async () => {
        if (capturedImages.length === 0) {
            setError('Tambahkan minimal 1 foto');
            return;
        }

        setIsScanning(true);
        setError(null);
        setScanResult(null);
        setMode('result');

        try {
            // Convert all images to blobs
            const blobs = await Promise.all(
                capturedImages.map(async (img) => {
                    if (img.file) {
                        return img.file;
                    }
                    // Convert dataUrl to blob
                    const response = await fetch(img.dataUrl);
                    return await response.blob();
                })
            );

            console.log(`📸 Processing ${blobs.length} images...`);

            let result;
            if (blobs.length === 1) {
                // Single image - use regular endpoint
                result = await scanHoseImage(blobs[0], true);
            } else {
                // Multiple images - use multi endpoint
                result = await scanMultipleHoseImages(blobs, true);
            }

            console.log('📥 API Response:', result);

            // Handle response
            if (result.status === 'success' || result.status === 'partial' || result.status === 'success_generic') {
                setScanResult(result);
            } else if (result.status === 'no_text') {
                setError(result.message || 'Tidak ada teks terdeteksi. Coba foto lebih dekat.');
            } else if (result.offline) {
                setError('AI Server offline. Pastikan backend berjalan.');
            } else {
                setError(result.message || 'Gagal mendeteksi hose');
            }
        } catch (err) {
            console.error('❌ Processing error:', err);
            setError(err.message);
        } finally {
            setIsScanning(false);
        }
    };

    // Retry scan
    const handleRetry = () => {
        setCapturedImages([]);
        setScanResult(null);
        setError(null);
        setMode('camera');
    };

    // Confirm detection
    const handleConfirm = () => {
        if (scanResult && onDetectionComplete) {
            onDetectionComplete({
                brand: scanResult.brand,
                sku: scanResult.sku,
                STD: scanResult.STD,
                SIZE: scanResult.SIZE,
                pressure_bar: scanResult.pressure_bar,
                pressure_psi: scanResult.pressure_psi,
                size_inch: scanResult.size_inch || scanResult.SIZE,
                desc: scanResult.desc,
                confidence: scanResult.confidence,
                raw_text_sample: scanResult.raw_text_sample,
                images_processed: scanResult.images_processed || 1,
                raw_images: capturedImages.map(img => img.dataUrl)
            });
        }
        handleClose();
    };

    const handleClose = () => {
        setCapturedImages([]);
        setScanResult(null);
        setError(null);
        setMode('camera');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="ai-scanner-overlay">
            <div className="ai-scanner-modal">
                {/* Header */}
                <div className="ai-scanner-header">
                    <div className="header-info">
                        <h2>🔍 AI Hose Scanner</h2>
                        <span className={`ai-status ${aiOnline ? 'online' : 'offline'}`}>
                            {aiOnline === null ? '⏳' : aiOnline ? '🟢 AI Online' : '🔴 Offline'}
                        </span>
                    </div>
                    <button className="close-btn" onClick={handleClose}>✕</button>
                </div>

                {/* Multi-Photo Mode */}
                {mode === 'camera' && (
                    <div className="ai-scanner-content">
                        {/* Photo Count Badge */}
                        <div className="photo-count-badge">
                            📸 {capturedImages.length}/5 Foto
                            {capturedImages.length > 0 && (
                                <span className="hint"> (Tambah foto untuk hasil lebih akurat)</span>
                            )}
                        </div>

                        {/* Source Buttons */}
                        <div className="source-buttons">
                            <button className="source-btn active" onClick={() => { }}>
                                📷 Kamera
                            </button>
                            <label className="source-btn">
                                🖼️ Galeri
                                <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={handleFileUpload}
                                    hidden
                                />
                            </label>
                        </div>

                        {/* Camera View */}
                        <div className="camera-container">
                            <Webcam
                                ref={webcamRef}
                                audio={false}
                                screenshotFormat="image/jpeg"
                                className="webcam-view"
                                videoConstraints={{
                                    facingMode: 'environment',
                                    width: 1280,
                                    height: 720
                                }}
                            />
                            <div className="scan-overlay">
                                <div className="scan-frame"></div>
                            </div>
                        </div>

                        {/* Captured Images Preview */}
                        {capturedImages.length > 0 && (
                            <div className="captured-images-preview">
                                {capturedImages.map((img, index) => (
                                    <div key={index} className="preview-thumb">
                                        <img src={img.dataUrl} alt={`Foto ${index + 1}`} />
                                        <button
                                            className="remove-thumb-btn"
                                            onClick={() => removeImage(index)}
                                        >
                                            ✕
                                        </button>
                                        <span className="thumb-number">{index + 1}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="camera-actions">
                            <Button
                                variant="secondary"
                                onClick={captureImage}
                                disabled={capturedImages.length >= 5}
                            >
                                📷 Ambil Foto ({capturedImages.length}/5)
                            </Button>
                            <Button
                                variant="primary"
                                onClick={processAllImages}
                                disabled={capturedImages.length === 0 || !aiOnline}
                            >
                                🔍 Scan {capturedImages.length} Foto
                            </Button>
                        </div>
                    </div>
                )}

                {/* Result Mode */}
                {mode === 'result' && (
                    <div className="ai-scanner-content result-mode">
                        {/* Images Grid */}
                        <div className="result-images-grid">
                            {capturedImages.slice(0, 3).map((img, index) => (
                                <img key={index} src={img.dataUrl} alt={`Foto ${index + 1}`} />
                            ))}
                            {capturedImages.length > 3 && (
                                <div className="more-images-badge">+{capturedImages.length - 3}</div>
                            )}
                        </div>

                        {/* Scanning Animation */}
                        {isScanning && (
                            <div className="scanning-animation">
                                <div className="scan-pulse"></div>
                                <p>Menganalisis {capturedImages.length} foto...</p>
                            </div>
                        )}

                        {/* Error */}
                        {error && (
                            <div className="scan-error">
                                <span className="error-icon">⚠️</span>
                                <p>{error}</p>
                                <Button variant="secondary" onClick={handleRetry}>
                                    Coba Lagi
                                </Button>
                            </div>
                        )}

                        {/* Result Display */}
                        {scanResult && (
                            <div className="detection-result">
                                <div className="result-header">
                                    <span className="success-icon">✅</span>
                                    <h3>Hose Terdeteksi!</h3>
                                    {scanResult.images_processed && (
                                        <span className="images-badge">
                                            📸 {scanResult.images_processed} foto diproses
                                        </span>
                                    )}
                                </div>

                                <div className="result-details">
                                    <div className="detail-row">
                                        <span className="label">Brand</span>
                                        <span className={`value brand ${scanResult.brand === 'UNKNOWN' ? 'unknown' : ''}`}>
                                            {scanResult.brand || 'N/A'}
                                        </span>
                                    </div>
                                    {(scanResult.sku || scanResult.STD) && (
                                        <div className="detail-row">
                                            <span className="label">SKU / Type</span>
                                            <span className="value">{scanResult.sku || scanResult.STD || 'N/A'}</span>
                                        </div>
                                    )}
                                    {scanResult.SIZE && (
                                        <div className="detail-row">
                                            <span className="label">Size</span>
                                            <span className="value">{scanResult.SIZE}"</span>
                                        </div>
                                    )}
                                    {scanResult.pressure_bar && (
                                        <div className="detail-row">
                                            <span className="label">Pressure</span>
                                            <span className="value">{scanResult.pressure_bar} Bar</span>
                                        </div>
                                    )}
                                    <div className="detail-row">
                                        <span className="label">Confidence</span>
                                        <span className={`confidence-badge ${scanResult.confidence < 60 ? 'low' : 'high'}`}>
                                            {scanResult.confidence}%
                                        </span>
                                    </div>
                                </div>

                                <div className="result-actions">
                                    <Button variant="secondary" onClick={handleRetry}>
                                        🔄 Scan Ulang
                                    </Button>
                                    <Button variant="primary" onClick={handleConfirm}>
                                        ✅ Gunakan Data Ini
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
