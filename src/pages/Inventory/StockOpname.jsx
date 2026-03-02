import { useState, useEffect } from 'react';
import Card from '../../components/common/Card/Card';
import Button from '../../components/common/Button/Button';
import AlertBox from '../../components/common/Alert/AlertBox';
import StatusBadge from '../../components/common/Badge/StatusBadge';
import CameraScanner from '../../components/features/Scanner/CameraScanner';
import Input from '../../components/common/Input/Input';
import Modal from '../../components/common/Modal/Modal';
import {
    startOpname,
    getCurrentOpname,
    getOpnameItems,
    scanOpnameItem,
    markItemMissing,
    finalizeOpname
} from '../../services/opnameApi';
import { useNotification } from '../../contexts/NotificationContext';
import './StockOpname.css';

export default function StockOpname() {
    const { addNotification } = useNotification();
    const [isOpnameMode, setIsOpnameMode] = useState(false);
    const [showScanner, setShowScanner] = useState(false);
    const [items, setItems] = useState([]);
    const [opnameId, setOpnameId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [scanHistory, setScanHistory] = useState([]);
    const [isBlind, setIsBlind] = useState(false); // Blind Mode State

    // Qty Modal State
    const [showQtyModal, setShowQtyModal] = useState(false);
    const [tempBarcode, setTempBarcode] = useState('');
    const [scanQty, setScanQty] = useState(1);

    const scannedCount = items.filter(i => i.status === 'found' || i.status === 'mismatch').length;
    const missingCount = items.filter(i => i.status === 'missing').length;
    const totalItems = items.length;
    const progress = totalItems > 0 ? (scannedCount / totalItems) * 100 : 0;

    useEffect(() => {
        checkActiveOpname();
    }, []);

    const checkActiveOpname = async () => {
        setLoading(true);
        const res = await getCurrentOpname();
        if (res.status === 'success' && res.data) {
            setOpnameId(res.data.id);
            setIsOpnameMode(true);
            setIsBlind(res.data.is_blind); // Restore blind state
            await loadItems(res.data.id);
        }
        setLoading(false);
    };

    const loadItems = async (id) => {
        const res = await getOpnameItems(id);
        if (res.status === 'success') {
            setItems(res.data.map(item => ({
                id: item.id, // OpnameItem ID
                barcode: item.barcode,
                brand: item.brand,
                name: item.name, // Product name
                location: item.location,
                status: item.status, // pending, found, missing, mismatch
                sysQty: item.system_qty,
                actQty: item.actual_qty
            })));
        }
    };

    const [scopeType, setScopeType] = useState('ALL');
    const [scopeValue, setScopeValue] = useState('');

    const handleStartOpname = async () => {
        if (scopeType !== 'ALL' && !scopeValue) {
            addNotification("Info", 'Harap isi nilai scope (Lokasi / Kategori)', "warning");
            return;
        }

        const description = `Opname ${scopeType} - ${new Date().toLocaleDateString('id-ID')}`;
        const res = await startOpname(description, scopeType, scopeValue, isBlind);

        if (res.status === 'success') {
            setOpnameId(res.data.id);
            setIsOpnameMode(true);
            await loadItems(res.data.id);
            addNotification("Sukses", `Opname dimulai! Total ${res.data.total_items} items untuk di-scan.`, "success");
        } else {
            addNotification("Gagal", 'Gagal memulai opname: ' + res.message, "error");
        }
    };

    const handleScanComplete = (data) => {
        setShowScanner(false);
        const scannedCode = data.result?.text || data.result?.barcode?.id;
        if (!scannedCode) return;

        setTempBarcode(scannedCode);
        setScanQty(1); // Default to 1
        setShowQtyModal(true); // Open Qty Input
    };

    const submitScan = async () => {
        if (!tempBarcode) {
            addNotification("Error", "Barcode wajib diisi", "error");
            return;
        }
        if (scanQty <= 0) {
            addNotification("Error", "Jumlah harus > 0", "error");
            return;
        }

        setShowQtyModal(false);
        const res = await scanOpnameItem(opnameId, tempBarcode, parseFloat(scanQty));

        if (res.status === 'success') {
            // Update local state
            setItems(prev => prev.map(item => {
                if (item.barcode === tempBarcode) {
                    return { ...item, status: res.data.status, actQty: res.data.actual_qty };
                }
                return item;
            }));

            setScanHistory(prev => [
                { id: tempBarcode, time: new Date().toLocaleTimeString(), status: res.data.status },
                ...prev
            ]);

            addNotification("Sukses", `Item ${tempBarcode} terverifikasi (Qty: ${scanQty})`, "success");
        } else {
            addNotification("Error", res.message, "error");
        }
    };

    const handleMarkMissing = async (item) => {
        const res = await markItemMissing(opnameId, item.id);
        if (res.status === 'success') {
            setItems(prev => prev.map(i => {
                if (i.id === item.id) {
                    return { ...i, status: 'missing' };
                }
                return i;
            }));
        }
    };

    const handleFinishOpname = async () => {
        if (!confirm('Apakah anda yakin ingin menyelesaikan Opname? Item yang belum di-scan akan ditandai HILANG.')) return;

        const res = await finalizeOpname(opnameId);
        if (res.status === 'success') {
            addNotification("Selesai", `Opname Selesai!\nDitemukan: ${res.data.found_count}\nHilang: ${res.data.missing_count}`, "success");
            setIsOpnameMode(false);
            setOpnameId(null);
            setItems([]);
            // Redirect to report
            // window.open(`/inventory/opname-report/${res.data.id}`, '_blank');
        } else {
            addNotification("Gagal", 'Gagal finalize: ' + res.message, "error");
        }
    };

    if (loading) return <div className="p-4">Loading Opname Session...</div>;

    return (
        <div className="stock-opname-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Stock Opname</h1>
                    <p className="page-subtitle">Audit stok fisik gudang {isBlind ? '(Blind Mode)' : ''}</p>
                </div>
                {!isOpnameMode && (
                    <div className="opname-controls">
                        <div className="control-group">
                            <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', background: 'white', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ddd' }}>
                                <input
                                    type="checkbox"
                                    checked={isBlind}
                                    onChange={e => setIsBlind(e.target.checked)}
                                />
                                <span style={{ fontWeight: 500 }}>Blind Mode 🕵️</span>
                            </label>
                        </div>

                        <select
                            className="scope-select"
                            value={scopeType}
                            onChange={(e) => setScopeType(e.target.value)}
                        >
                            <option value="ALL">Semua Barang</option>
                            <option value="LOCATION">Berdasarkan Lokasi</option>
                            <option value="CATEGORY">Berdasarkan Kategori</option>
                        </select>

                        {scopeType === 'LOCATION' && (
                            <input
                                type="text"
                                placeholder="Kode Lokasi (e.g. RAK-A)"
                                value={scopeValue}
                                onChange={(e) => setScopeValue(e.target.value)}
                                className="scope-input"
                            />
                        )}

                        {scopeType === 'CATEGORY' && (
                            <select
                                value={scopeValue}
                                onChange={(e) => setScopeValue(e.target.value)}
                                className="scope-select"
                            >
                                <option value="">Pilih Kategori</option>
                                <option value="HOSE">Hose</option>
                                <option value="FITTING">Fitting</option>
                                <option value="CONNECTOR">Connector</option>
                            </select>
                        )}

                        <Button
                            variant="primary"
                            size="lg"
                            onClick={handleStartOpname}
                            icon={
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polygon points="5 3 19 12 5 21 5 3" />
                                </svg>
                            }
                        >
                            Mulai Stock Opname
                        </Button>
                    </div>
                )}
            </div>

            {!isOpnameMode ? (
                <>
                    <Card>
                        <div className="opname-intro">
                            <div className="intro-illustration">
                                <svg width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <rect x="3" y="4" width="18" height="18" rx="2" />
                                    <line x1="3" y1="10" x2="21" y2="10" />
                                    <path d="M8 14l2 2 4-4" />
                                </svg>
                            </div>
                            <div className="intro-content">
                                <h2>Cara Kerja Stock Opname</h2>
                                <ol>
                                    <li>Pilih Mode (Blind Mode disarankan untuk audit)</li>
                                    <li>Tekan tombol "Mulai Stock Opname"</li>
                                    <li>Scan QR Code barang dan input jumlah fisik</li>
                                    <li>Sistem akan mencatat selisih secara otomatis</li>
                                </ol>
                            </div>
                        </div>
                    </Card>

                    <AlertBox variant="info" title="Jadwal Opname Berikutnya">
                        Opname terakhir: <strong>-</strong> • Rekomendasi: Lakukan opname setiap akhir bulan
                    </AlertBox>
                </>
            ) : (
                <>
                    {/* Progress Header */}
                    <Card className="opname-progress-card">
                        <div className="opname-progress">
                            <div className="progress-stats">
                                <div className="stat-item found">
                                    <span className="stat-value">{scannedCount}</span>
                                    <span className="stat-label">Selesai</span>
                                </div>
                                <div className="stat-item missing">
                                    <span className="stat-value">{missingCount}</span>
                                    <span className="stat-label">Hilang</span>
                                </div>
                                <div className="stat-item pending">
                                    <span className="stat-value">{totalItems - scannedCount - missingCount}</span>
                                    <span className="stat-label">Belum Scan</span>
                                </div>
                            </div>
                            <div className="progress-bar-wrapper">
                                <div className="progress-bar">
                                    <div className="progress-fill" style={{ width: `${progress}%` }} />
                                </div>
                                <span className="progress-text">{Math.round(progress)}%</span>
                            </div>
                            <div className="opname-actions">
                                <Button
                                    variant="primary"
                                    size="lg"
                                    onClick={() => setShowScanner(true)}
                                    icon={
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <rect x="3" y="3" width="18" height="18" rx="2" />
                                            <path d="M7 7h.01M7 12h.01M7 17h.01M12 7h.01M12 12h.01M12 17h.01M17 7h.01M17 12h.01M17 17h.01" />
                                        </svg>
                                    }
                                >
                                    Scan Berikutnya
                                </Button>
                                <Button
                                    variant="secondary"
                                    size="lg"
                                    onClick={() => {
                                        setTempBarcode('');
                                        setScanQty(1);
                                        setShowQtyModal(true);
                                    }}
                                >
                                    Input Manual
                                </Button>
                                <Button variant="success" onClick={handleFinishOpname}>
                                    Selesai
                                </Button>
                            </div>
                        </div>
                    </Card>

                    {/* Item List */}
                    <Card title="Daftar Barang">
                        <div className="opname-list">
                            {items.map((item) => (
                                <div key={item.id} className={`opname-item status-${item.status}`}>
                                    <div className="item-check">
                                        {(item.status === 'found' || item.status === 'mismatch') && (
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                                <path d="M20 6L9 17l-5-5" />
                                            </svg>
                                        )}
                                        {item.status === 'missing' && (
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                                <line x1="18" y1="6" x2="6" y2="18" />
                                                <line x1="6" y1="6" x2="18" y2="18" />
                                            </svg>
                                        )}
                                        {item.status === 'pending' && (
                                            <div className="pending-circle" />
                                        )}
                                    </div>
                                    <div className="item-info">
                                        <span className="item-id">{item.barcode}</span>
                                        <span className="item-spec">{item.brand} {item.name}</span>
                                        {item.actQty !== null && (
                                            <span className="text-sm text-gray-600 block mt-1">
                                                Count: <strong>{item.actQty}</strong>
                                                {!isBlind && ` / Sys: ${item.sysQty}`}
                                            </span>
                                        )}
                                    </div>
                                    <div className="item-location">
                                        📍 {item.location}
                                    </div>
                                    <div className="item-status">
                                        {item.status === 'found' && <StatusBadge status="pass" size="sm" />}
                                        {item.status === 'mismatch' && <StatusBadge status="warning" text="Mismatch" size="sm" />}
                                        {item.status === 'missing' && <StatusBadge status="fail" size="sm" />}
                                        {item.status === 'pending' && (
                                            <Button
                                                variant="danger"
                                                size="sm"
                                                onClick={() => handleMarkMissing(item)}
                                            >
                                                Tandai Hilang
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>

                    {/* Missing Items Alert */}
                    {missingCount > 0 && (
                        <AlertBox variant="danger" title={`${missingCount} Barang Tidak Ditemukan!`} blink>
                            <ul className="missing-list">
                                {items.filter(i => i.status === 'missing').map(item => (
                                    <li key={item.id}>
                                        <strong>{item.barcode}</strong> - {item.name} (Lokasi: {item.location})
                                    </li>
                                ))}
                            </ul>
                        </AlertBox>
                    )}
                </>
            )}

            {/* Camera Scanner */}
            <CameraScanner
                isOpen={showScanner}
                onClose={() => setShowScanner(false)}
                onScanComplete={handleScanComplete}
                scanMode="qr"
                title="Scan QR Code Barang"
            />

            {/* Qty Input Modal */}
            <Modal
                isOpen={showQtyModal}
                onClose={() => setShowQtyModal(false)}
                title="Input Jumlah Fisik"
            >
                <div className="p-4">
                    <div className="mb-4">
                        <Input
                            label="Barcode / ID Barang"
                            value={tempBarcode}
                            onChange={(e) => setTempBarcode(e.target.value.toUpperCase())}
                            placeholder="e.g. BATCH-2023..."
                            autoFocus
                        />
                    </div>
                    <Input
                        label="Jumlah Fisik (Actual Qty)"
                        type="number"
                        value={scanQty}
                        onChange={e => setScanQty(e.target.value)}
                        autoFocus
                    />
                    <div className="flex justify-end gap-2 mt-4">
                        <Button variant="secondary" onClick={() => setShowQtyModal(false)}>Batal</Button>
                        <Button variant="primary" onClick={submitScan}>Simpan</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
