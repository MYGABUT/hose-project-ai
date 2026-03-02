import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/common/Card/Card';
import Button from '../../components/common/Button/Button';
import AlertBox from '../../components/common/Alert/AlertBox';
import CameraScanner from '../../components/features/Scanner/CameraScanner';
// import AIHoseScanner from '../../components/features/Scanner/AIHoseScanner'; // Deprecated
import HoseDataForm from '../../components/features/Scanner/HoseDataForm';
import VerificationModal from '../../components/features/Scanner/VerificationModal';
import BarcodeGenerator from '../../components/features/Scanner/BarcodeGenerator';
import './Inbound.css';

export default function Inbound() {
    const navigate = useNavigate();
    const [showScanner, setShowScanner] = useState(false);
    // const [showAIScanner, setShowAIScanner] = useState(false); // Deprecated
    const [showDataForm, setShowDataForm] = useState(false);
    const [showVerification, setShowVerification] = useState(false);
    const [showBarcode, setShowBarcode] = useState(false);
    const [scanData, setScanData] = useState(null);
    const [aiDetectionData, setAIDetectionData] = useState(null);
    const [generatedItem, setGeneratedItem] = useState(null);
    const [formMode, setFormMode] = useState('ai'); // 'ai' or 'manual'

    const [recentEntries, setRecentEntries] = useState([]);

    useEffect(() => {
        loadRecentEntries();
    }, []);

    const loadRecentEntries = async () => {
        try {
            const { getBatches } = await import('../../services/wmsApi');
            const res = await getBatches({ limit: 5 });
            if (res.status === 'success') {
                const mapped = res.data.map(b => ({
                    id: b.batch_number || b.barcode,
                    brand: b.brand || b.product_brand,
                    type: b.standard || b.product_category || 'Hydraulic',
                    size: b.size_inch || b.size_dn || b.size,
                    length: b.current_qty || 0,
                    location: b.location_code || '-',
                    time: new Date(b.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }));
                setRecentEntries(mapped);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleScanComplete = (data) => {
        setScanData(data);
        setShowScanner(false);
        setShowVerification(true);
    };

    const handleFormConfirm = async (formData) => {
        console.log('📝 Form Data Confirmed:', formData);
        setGeneratedItem(formData);
        setShowDataForm(false);
        setShowBarcode(true);
    };

    const handleManualEntry = () => {
        setAIDetectionData({});  // Empty data
        setFormMode('manual');
        setShowDataForm(true);
    };

    const handleVerificationConfirm = (itemData) => {
        setGeneratedItem(itemData);
        setShowVerification(false);
        setShowBarcode(true);
    };

    const handleBarcodeClose = () => {
        setShowBarcode(false);
        setGeneratedItem(null);
        setScanData(null);
        setAIDetectionData(null);
        loadRecentEntries(); // Refresh list
    };

    return (
        <div className="inbound-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Barang Masuk</h1>
                    <p className="page-subtitle">Registrasi dan pelabelan stok baru</p>
                </div>
            </div>

            {/* Scan CTA */}
            <Card className="scan-cta-card">
                <div className="scan-cta">
                    <div className="cta-illustration">
                        <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                            <circle cx="12" cy="13" r="4" />
                        </svg>
                    </div>
                    <div className="cta-content">
                        <h2>Registrasi Hose Baru</h2>
                        <p>Pilih metode untuk menambah stok baru</p>
                    </div>
                    <div className="cta-buttons">
                        <Button
                            variant="primary"
                            size="xl"
                            onClick={() => navigate('/inbound/scan')}
                            icon={<span>🤖</span>}
                        >
                            AI Scanner
                        </Button>
                        <Button
                            variant="secondary"
                            size="lg"
                            onClick={handleManualEntry}
                            icon={
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                                </svg>
                            }
                        >
                            Entry Manual
                        </Button>
                    </div>
                </div>
            </Card>

            {/* AI Scanner Badge */}
            <div className="ai-feature-badge">
                <span className="badge-icon">🧠</span>
                <div className="badge-info">
                    <strong>AI Hose Detection + Manual Form</strong>
                    <span>Scan otomatis → Edit data → Generate barcode</span>
                </div>
                <span className="badge-status">21 Brand Supported</span>
            </div>

            {/* Workflow explanation */}
            <div className="workflow-steps">
                <div className="workflow-step">
                    <div className="step-number">1</div>
                    <div className="step-content">
                        <h4>SCAN</h4>
                        <p>AI deteksi label hose</p>
                    </div>
                </div>
                <div className="workflow-arrow">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                </div>
                <div className="workflow-step">
                    <div className="step-number">2</div>
                    <div className="step-content">
                        <h4>FORM</h4>
                        <p>Lengkapi data manual</p>
                    </div>
                </div>
                <div className="workflow-arrow">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                </div>
                <div className="workflow-step">
                    <div className="step-number">3</div>
                    <div className="step-content">
                        <h4>BARCODE</h4>
                        <p>Generate & cetak</p>
                    </div>
                </div>
                <div className="workflow-arrow">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                </div>
                <div className="workflow-step">
                    <div className="step-number">4</div>
                    <div className="step-content">
                        <h4>SIMPAN</h4>
                        <p>Masuk ke inventory</p>
                    </div>
                </div>
            </div>

            {/* Recent Entries */}
            <Card title="Barang Masuk Hari Ini" subtitle={`${recentEntries.length} item terdaftar`}>
                <div className="recent-entries">
                    {recentEntries.map((item) => (
                        <div key={item.id} className="entry-item">
                            <div className="entry-time">{item.time}</div>
                            <div className="entry-info">
                                <span className="entry-id">{item.id}</span>
                                <span className="entry-spec">
                                    {item.brand} {item.type} {item.size} • {item.length}m • 📍 {item.location}
                                </span>
                            </div>
                            <Button variant="secondary" size="sm">
                                Cetak Ulang
                            </Button>
                        </div>
                    ))}
                </div>
            </Card>

            {/* Hose Data Form - For Manual Entry */}
            <HoseDataForm
                isOpen={showDataForm}
                onClose={() => setShowDataForm(false)}
                onConfirm={handleFormConfirm}
                aiDetectionData={aiDetectionData}
                mode={formMode}
            />

            {/* Camera Scanner (OCR Manual - legacy) */}
            <CameraScanner
                isOpen={showScanner}
                onClose={() => setShowScanner(false)}
                onScanComplete={handleScanComplete}
                scanMode="ocr"
                title="Scan Label Selang"
            />

            {/* Verification Modal (legacy) */}
            <VerificationModal
                isOpen={showVerification}
                onClose={() => setShowVerification(false)}
                onConfirm={handleVerificationConfirm}
                capturedImage={scanData?.image}
                ocrData={scanData?.result?.ocr || {}}
            />

            {/* Barcode Generator */}
            <BarcodeGenerator
                isOpen={showBarcode}
                onClose={handleBarcodeClose}
                itemId={generatedItem?.barcode || generatedItem?.id}
                itemData={generatedItem}
                onSaved={() => loadRecentEntries()}
            />
        </div>
    );
}
