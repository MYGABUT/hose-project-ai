/**
 * Put-away Wizard - Directed put-away for inbound goods
 * Guides technician to correct rack location with scan validation
 */
import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Card from '../../components/common/Card/Card';
import Button from '../../components/common/Button/Button';
import './PutawayWizard.css';

const API_BASE_URL = import.meta.env.VITE_AI_API_URL || 'http://localhost:8000';

export default function PutawayWizard() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const scanInputRef = useRef(null);

    // State
    const [step, setStep] = useState('scan_item'); // scan_item, show_suggestion, scan_location, confirm
    const [itemBarcode, setItemBarcode] = useState('');
    const [itemData, setItemData] = useState(null);
    const [suggestions, setSuggestions] = useState([]);
    const [currentSuggestion, setCurrentSuggestion] = useState(0);
    const [locationScan, setLocationScan] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [completedItems, setCompletedItems] = useState([]);

    // Auto-focus scan input
    useEffect(() => {
        if (scanInputRef.current && (step === 'scan_item' || step === 'scan_location')) {
            scanInputRef.current.focus();
        }
    }, [step]);

    // Load from URL params
    useEffect(() => {
        const barcode = searchParams.get('barcode');
        if (barcode) {
            setItemBarcode(barcode);
            handleScanItem(barcode);
        }
    }, [searchParams]);

    const showMessage = (type, text) => {
        setMessage({ type, text });
        setTimeout(() => setMessage(null), 4000);
    };

    const handleScanItem = async (barcode = itemBarcode) => {
        if (!barcode.trim()) return;

        setLoading(true);
        try {
            // Get batch info
            const batchRes = await fetch(`${API_BASE_URL}/api/v1/batches/code/${barcode.trim().toUpperCase()}`);
            const batchData = await batchRes.json();

            if (batchData.status !== 'success') {
                showMessage('error', '❌ Barcode tidak ditemukan');
                setLoading(false);
                return;
            }

            setItemData(batchData.data);

            // Get put-away suggestions
            const suggestRes = await fetch(
                `${API_BASE_URL}/api/v1/locations/suggestion?product_id=${batchData.data.product_id}&qty=${batchData.data.current_qty}`
            );
            const suggestData = await suggestRes.json();

            if (suggestData.status === 'success') {
                setSuggestions(suggestData.data.suggestions || []);
                setStep('show_suggestion');
            } else {
                showMessage('error', 'Tidak ada lokasi tersedia');
            }
        } catch (err) {
            showMessage('error', `Error: ${err.message}`);
        }
        setLoading(false);
    };

    const handleConfirmSuggestion = () => {
        setStep('scan_location');
        setLocationScan('');
    };

    const handleScanLocation = async () => {
        if (!locationScan.trim()) return;

        const expectedCode = suggestions[currentSuggestion]?.location_code;

        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/locations/validate-scan`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    expected_location_code: expectedCode,
                    scanned_location_code: locationScan.trim().toUpperCase()
                })
            });

            const data = await res.json();

            if (res.ok) {
                showMessage('success', data.message);
                setStep('confirm');
            } else {
                showMessage('error', data.detail || 'Lokasi salah');
            }
        } catch (err) {
            showMessage('error', `Error: ${err.message}`);
        }
        setLoading(false);
    };

    const handleConfirmPutaway = async () => {
        const suggestion = suggestions[currentSuggestion];

        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/locations/confirm-putaway`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    batch_id: itemData.id,
                    location_id: suggestion.location_id,
                    qty: suggestion.suggested_qty,
                    performed_by: 'technician'
                })
            });

            const data = await res.json();

            if (res.ok) {
                showMessage('success', `✅ ${data.message}`);
                setCompletedItems(prev => [...prev, {
                    barcode: itemData.barcode,
                    location: suggestion.location_code,
                    qty: suggestion.suggested_qty
                }]);

                // Reset for next item
                setTimeout(() => {
                    setStep('scan_item');
                    setItemBarcode('');
                    setItemData(null);
                    setSuggestions([]);
                    setCurrentSuggestion(0);
                }, 2000);
            } else {
                showMessage('error', data.detail || 'Gagal konfirmasi');
            }
        } catch (err) {
            showMessage('error', `Error: ${err.message}`);
        }
        setLoading(false);
    };

    const handleSkipLocation = () => {
        if (currentSuggestion < suggestions.length - 1) {
            setCurrentSuggestion(prev => prev + 1);
            setStep('show_suggestion');
        } else {
            showMessage('error', 'Tidak ada lokasi alternatif lain');
        }
    };

    return (
        <div className="putaway-page">
            {/* Header */}
            <div className="putaway-header">
                <button className="back-btn" onClick={() => navigate('/inbound')}>
                    ← Kembali
                </button>
                <h1>📦 Put-away Wizard</h1>
                <div className="counter-badge">
                    {completedItems.length} selesai
                </div>
            </div>

            {/* Toast */}
            {message && (
                <div className={`toast-message ${message.type}`}>
                    {message.text}
                </div>
            )}

            {/* Step 1: Scan Item */}
            {step === 'scan_item' && (
                <Card className="wizard-card">
                    <div className="step-indicator">
                        <span className="step-badge active">1</span>
                        <span className="step-badge">2</span>
                        <span className="step-badge">3</span>
                    </div>

                    <div className="scan-section">
                        <span className="scan-icon">📷</span>
                        <h2>Scan Barcode Barang</h2>
                        <p>Scan stiker barcode pada roll/box yang akan ditaruh</p>

                        <div className="scan-input-group">
                            <input
                                ref={scanInputRef}
                                type="text"
                                className="scan-input large"
                                placeholder="Scan atau ketik barcode..."
                                value={itemBarcode}
                                onChange={(e) => setItemBarcode(e.target.value.toUpperCase())}
                                onKeyDown={(e) => e.key === 'Enter' && handleScanItem()}
                            />
                            <Button
                                variant="primary"
                                size="lg"
                                onClick={() => handleScanItem()}
                                loading={loading}
                            >
                                Cari
                            </Button>
                        </div>
                    </div>
                </Card>
            )}

            {/* Step 2: Show Suggestion */}
            {step === 'show_suggestion' && itemData && (
                <Card className="wizard-card">
                    <div className="step-indicator">
                        <span className="step-badge done">✓</span>
                        <span className="step-badge active">2</span>
                        <span className="step-badge">3</span>
                    </div>

                    {/* Item Info */}
                    <div className="item-info-card">
                        <div className="item-header">
                            <span className="item-barcode">{itemData.barcode}</span>
                            <span className="item-qty">{itemData.current_qty} m</span>
                        </div>
                        <p className="item-name">{itemData.product_name}</p>
                    </div>

                    {/* Location Suggestion */}
                    {suggestions.length > 0 && (
                        <div className="suggestion-card">
                            <h3>🎯 TARUH DI LOKASI:</h3>
                            <div className="location-big">
                                {suggestions[currentSuggestion]?.location_code}
                            </div>
                            <div className="suggestion-details">
                                <span className="detail-item">
                                    <span className="label">Aksi:</span>
                                    <span className="value">{suggestions[currentSuggestion]?.action === 'TOP_UP' ? 'Tambah ke lokasi yang ada' : 'Lokasi baru'}</span>
                                </span>
                                <span className="detail-item">
                                    <span className="label">Qty:</span>
                                    <span className="value">{suggestions[currentSuggestion]?.suggested_qty}m</span>
                                </span>
                                <span className="detail-item">
                                    <span className="label">Kapasitas:</span>
                                    <span className="value">{suggestions[currentSuggestion]?.current_qty || 0}/{suggestions[currentSuggestion]?.capacity}</span>
                                </span>
                            </div>
                            <p className="reason">{suggestions[currentSuggestion]?.reason}</p>
                        </div>
                    )}

                    <div className="action-buttons">
                        <Button
                            variant="primary"
                            size="lg"
                            onClick={handleConfirmSuggestion}
                        >
                            ✓ Lanjut Scan Lokasi
                        </Button>
                        {suggestions.length > 1 && (
                            <Button
                                variant="ghost"
                                onClick={handleSkipLocation}
                            >
                                Lokasi Lain ({suggestions.length - currentSuggestion - 1} tersisa)
                            </Button>
                        )}
                    </div>
                </Card>
            )}

            {/* Step 3: Scan Location */}
            {step === 'scan_location' && (
                <Card className="wizard-card">
                    <div className="step-indicator">
                        <span className="step-badge done">✓</span>
                        <span className="step-badge done">✓</span>
                        <span className="step-badge active">3</span>
                    </div>

                    <div className="scan-section">
                        <div className="expected-location">
                            Lokasi tujuan: <strong>{suggestions[currentSuggestion]?.location_code}</strong>
                        </div>

                        <span className="scan-icon">📍</span>
                        <h2>Scan Barcode Lokasi</h2>
                        <p>Scan label QR di rak/bin untuk konfirmasi</p>

                        <div className="scan-input-group">
                            <input
                                ref={scanInputRef}
                                type="text"
                                className="scan-input large"
                                placeholder="Scan lokasi..."
                                value={locationScan}
                                onChange={(e) => setLocationScan(e.target.value.toUpperCase())}
                                onKeyDown={(e) => e.key === 'Enter' && handleScanLocation()}
                            />
                            <Button
                                variant="success"
                                size="lg"
                                onClick={handleScanLocation}
                                loading={loading}
                            >
                                Verifikasi
                            </Button>
                        </div>
                    </div>

                    <Button
                        variant="ghost"
                        onClick={() => setStep('show_suggestion')}
                    >
                        ← Kembali
                    </Button>
                </Card>
            )}

            {/* Step 4: Confirm */}
            {step === 'confirm' && (
                <Card className="wizard-card success-card">
                    <div className="success-content">
                        <span className="success-icon">✅</span>
                        <h2>Lokasi Benar!</h2>
                        <p>Taruh barang di lokasi dan tekan konfirmasi</p>

                        <div className="confirm-summary">
                            <div className="summary-row">
                                <span>Barang:</span>
                                <strong>{itemData?.barcode}</strong>
                            </div>
                            <div className="summary-row">
                                <span>Lokasi:</span>
                                <strong>{suggestions[currentSuggestion]?.location_code}</strong>
                            </div>
                            <div className="summary-row">
                                <span>Qty:</span>
                                <strong>{suggestions[currentSuggestion]?.suggested_qty}m</strong>
                            </div>
                        </div>

                        <Button
                            variant="success"
                            size="lg"
                            onClick={handleConfirmPutaway}
                            loading={loading}
                            className="confirm-btn"
                        >
                            📦 Konfirmasi Put-away
                        </Button>
                    </div>
                </Card>
            )}

            {/* Completed Items */}
            {completedItems.length > 0 && (
                <div className="completed-section">
                    <h4>✅ Sudah Ditaruh:</h4>
                    <div className="completed-list">
                        {completedItems.map((item, idx) => (
                            <div key={idx} className="completed-item">
                                <span className="c-barcode">{item.barcode}</span>
                                <span className="c-arrow">→</span>
                                <span className="c-location">{item.location}</span>
                                <span className="c-qty">{item.qty}m</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
