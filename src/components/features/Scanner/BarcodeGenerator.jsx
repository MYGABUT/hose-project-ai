import { useState, useRef, useEffect } from 'react';
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react';
import Button from '../../common/Button/Button';
import './BarcodeGenerator.css';
import { printService } from '../../../services/printService';

// Fallback Mock available printers (if service fails completely)
const DEFAULT_PRINTERS = [
    { id: 'printer1', name: 'Zebra ZD420 (Label)', type: 'thermal', status: 'online' },
    { id: 'printer2', name: 'Brother QL-820NWB', type: 'thermal', status: 'online' },
];

import { receiveBatch, uploadBatchImage } from '../../../services/wmsApi';
import { resizeImage } from '../../../utils/imageUtils';

export default function BarcodeGenerator({
    isOpen,
    onClose,
    itemId,
    itemData = {},
    onSaved // Callback when saved successfully
}) {
    const qrCanvasRef = useRef(null);
    const [isPrinting, setIsPrinting] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [printSuccess, setPrintSuccess] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [saveError, setSaveError] = useState(null);
    const [showPrinterSelect, setShowPrinterSelect] = useState(false);
    const [selectedPrinter, setSelectedPrinter] = useState(null);
    const [printers, setPrinters] = useState(DEFAULT_PRINTERS);
    const [printError, setPrintError] = useState(null);

    // Initialize Printers
    useEffect(() => {
        const initPrinters = async () => {
            try {
                const available = await printService.getPrinters();
                if (available && available.length > 0) {
                    setPrinters(available);
                }
            } catch (err) {
                console.warn("Print service init failed, using defaults", err);
            }
        };
        initPrinters();
    }, []);

    // Auto-select first online printer
    useEffect(() => {
        const firstOnline = printers.find(p => p.status === 'online');
        if (firstOnline && !selectedPrinter) {
            setSelectedPrinter(firstOnline);
        }
    }, [printers, selectedPrinter]);

    if (!isOpen) return null;

    const handlePrint = async () => {
        setPrintError(null);
        if (!selectedPrinter) {
            setShowPrinterSelect(true);
            return;
        }

        setIsPrinting(true);
        try {
            // Generate ZPL or Image data here in real app
            const printData = {
                sku: itemId,
                barcode: itemId,
                name: itemData?.brand || 'HOSE'
            };

            await printService.printLabel(printData, selectedPrinter.name);

            setPrintSuccess(true);
            setShowPrinterSelect(false);
            setTimeout(() => setPrintSuccess(false), 3000);
        } catch (err) {
            console.error("Print Failed:", err);
            setPrintError(err.message || "Gagal mencetak label. Pastikan layanan printer aktif.");
        } finally {
            setIsPrinting(false);
        }
    };

    const handleSaveToInventory = async () => {
        setIsSaving(true);
        setSaveError(null);

        try {
            console.log('💾 Saving to inventory:', itemData);

            // 1. Save Batch Data
            const result = await receiveBatch(itemData);

            if (result.status === 'success') {
                console.log('✅ Batch saved:', result);

                // 2. Upload Image (if any)
                if (itemData.raw_images && itemData.raw_images.length > 0) {
                    try {
                        console.log('🖼️ Uploading image...');
                        const imageToUpload = itemData.raw_images[0];
                        const resizedBlob = await resizeImage(imageToUpload, 800, 0.7);
                        await uploadBatchImage(result.data.barcode, resizedBlob);
                        console.log('📸 Image uploaded');
                    } catch (imgErr) {
                        console.error('❌ Image upload failed:', imgErr);
                    }
                }

                setSaveSuccess(true);
                setSaveSuccess(true);
                if (onSaved) onSaved();

                // Do not auto-close so user has time to print the barcode
                // They can close it manually using the X button
            } else {
                setSaveError(result.message || 'Gagal menyimpan data');
            }
        } catch (err) {
            console.error('❌ Save error:', err);
            // Enhance Error Message for "Failed to fetch"
            if (err.message && err.message.includes('Failed to fetch')) {
                setSaveError("Gagal terhubung ke Server. Pastikan Backend sudah berjalan (Port 8000).");
            } else {
                setSaveError(err.message || 'Terjadi kesalahan koneksi');
            }
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveDigital = async () => {
        setIsSaving(true);

        try {
            // Get the canvas element from QRCodeCanvas
            const canvas = document.querySelector('.qr-canvas-hidden canvas');
            if (canvas) {
                // Convert to image and download
                const dataUrl = canvas.toDataURL('image/png');

                // Create download link
                const link = document.createElement('a');
                link.download = `QR_${itemId || 'label'}_${new Date().getTime()}.png`;
                link.href = dataUrl;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                setSaveSuccess(true);
                setTimeout(() => setSaveSuccess(false), 3000);
            }
        } catch (err) {
            console.error('Error saving QR:', err);
            alert('Gagal menyimpan QR Code. Coba lagi.');
        }

        setIsSaving(false);
    };

    const handleClose = () => {
        setPrintSuccess(false);
        setSaveSuccess(false);
        setShowPrinterSelect(false);
        setPrintError(null);
        setSaveError(null);
        onClose();
    };

    const getPrinterIcon = (type) => {
        switch (type) {
            case 'thermal': return '🏷️';
            case 'inkjet': return '🖨️';
            case 'laser': return '📠';
            default: return '🖨️';
        }
    };

    return (
        <div className="barcode-generator-overlay">
            <div className="barcode-generator-modal">
                <div className="generator-header">
                    <h2>Label Berhasil Dibuat!</h2>
                    <button className="generator-close" onClick={handleClose}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                <div className="generator-content">
                    <div className="success-animation">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                            <path d="M22 4L12 14.01l-3-3" />
                        </svg>
                    </div>

                    <div className="qr-display">
                        <QRCodeSVG
                            value={itemId || itemData?.barcode || 'BATCH-UNKNOWN'}
                            size={200}
                            level="H"
                            includeMargin={true}
                            bgColor="#ffffff"
                            fgColor="#1E293B"
                        />
                    </div>

                    {/* Hidden canvas for download */}
                    <div className="qr-canvas-hidden" style={{ position: 'absolute', left: '-9999px' }}>
                        <QRCodeCanvas
                            value={itemId || itemData?.barcode || 'BATCH-UNKNOWN'}
                            size={400}
                            level="H"
                            includeMargin={true}
                            bgColor="#ffffff"
                            fgColor="#1E293B"
                        />
                    </div>

                    <div className="item-info">
                        <span className="item-id">{itemId || itemData?.barcode || 'N/A'}</span>
                        {(itemData?.brand || itemData?.formData?.brand) && (
                            <span className="item-spec">
                                {itemData?.brand || itemData?.formData?.brand} {' '}
                                {itemData?.type || itemData?.formData?.standard || ''} {' - '}
                                {itemData?.size || itemData?.formData?.sizeInch || ''}
                            </span>
                        )}
                        {(itemData?.location || itemData?.formData?.location) && (
                            <span className="item-location">
                                📍 Lokasi: {itemData?.location?.code || itemData?.formData?.location || itemData?.location}
                            </span>
                        )}
                        {itemData?.current_qty && (
                            <span className="item-qty">
                                📦 Qty: {itemData.current_qty} {itemData?.product?.unit || 'METER'}
                            </span>
                        )}
                    </div>

                    {/* Printer Selection */}
                    {showPrinterSelect && (
                        <div className="printer-selection">
                            <h4>📠 Pilih Printer</h4>
                            <div className="printer-list">
                                {printers.map(printer => (
                                    <button
                                        key={printer.id}
                                        className={`printer-item ${selectedPrinter?.id === printer.id ? 'selected' : ''} ${printer.status === 'offline' ? 'offline' : ''}`}
                                        onClick={() => printer.status === 'online' && setSelectedPrinter(printer)}
                                        disabled={printer.status === 'offline'}
                                    >
                                        <span className="printer-icon">{getPrinterIcon(printer.type)}</span>
                                        <div className="printer-info">
                                            <span className="printer-name">{printer.name}</span>
                                            <span className={`printer-status ${printer.status}`}>
                                                {printer.status === 'online' ? '🟢 Online' : '🔴 Offline'}
                                            </span>
                                        </div>
                                        {selectedPrinter?.id === printer.id && (
                                            <span className="selected-check">✓</span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Success Messages */}
                    {printSuccess && (
                        <div className="success-message print">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M9 12l2 2 4-4" />
                            </svg>
                            Label berhasil dikirim ke {selectedPrinter?.name}!
                        </div>
                    )}

                    {saveSuccess && (
                        <div className="success-message save">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M9 12l2 2 4-4" />
                            </svg>
                            QR Code berhasil disimpan ke Downloads!
                        </div>
                    )}

                    {/* Current Printer Info */}
                    {selectedPrinter && !showPrinterSelect && (
                        <div className="current-printer">
                            <span>{getPrinterIcon(selectedPrinter.type)} {selectedPrinter.name}</span>
                            <button
                                className="change-printer-btn"
                                onClick={() => setShowPrinterSelect(!showPrinterSelect)}
                            >
                                Ganti
                            </button>
                        </div>
                    )}

                    {saveError && (
                        <div className="save-error-message" style={{ color: '#ef4444', textAlign: 'center', marginBottom: '10px', fontWeight: 'bold' }}>
                            ⚠️ {saveError}
                        </div>
                    )}

                    {printError && (
                        <div className="save-error-message" style={{ color: '#f59e0b', textAlign: 'center', marginBottom: '10px' }}>
                            ⚠️ {printError}
                        </div>
                    )}

                    <div className="generator-actions">
                        {!saveSuccess ? (
                            <Button
                                variant="primary"
                                size="lg"
                                fullWidth
                                onClick={handleSaveToInventory}
                                loading={isSaving}
                                icon={<span>💾</span>}
                            >
                                {isSaving ? 'Menyimpan...' : 'Simpan ke Inventory'}
                            </Button>
                        ) : (
                            <div className="success-message save">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M9 12l2 2 4-4" />
                                </svg>
                                Data Berhasil Disimpan!
                            </div>
                        )}

                        <Button
                            variant="secondary"
                            size="lg"
                            fullWidth
                            onClick={handlePrint}
                            loading={isPrinting}
                            disabled={!saveSuccess && !isSaving}
                            icon={
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="6 9 6 2 18 2 18 9" />
                                    <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" />
                                    <rect x="6" y="14" width="12" height="8" />
                                </svg>
                            }
                        >
                            {isPrinting ? 'Mencetak...' : showPrinterSelect ? 'Cetak ke Printer Terpilih' : 'Cetak Label'}
                        </Button>
                    </div>
                </div>

                <div className="generator-footer">
                    <p>Tempel label ini pada fisik barang segera</p>
                </div>
            </div>
        </div>
    );
}
