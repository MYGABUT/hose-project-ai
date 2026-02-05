import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useProducts } from '../../contexts/ProductContext';
import Card from '../../components/common/Card/Card';
import Button from '../../components/common/Button/Button';
import Modal from '../../components/common/Modal/Modal';
import StatusBadge from '../../components/common/Badge/StatusBadge';
import './QualityControl.css';

// Removed Context Dependency

export default function QualityControl() {
    const { user } = useAuth();
    // const { performQCInspection, qcLogs, actionMessage } = useProducts(); // Removed Context Dependency

    const [pendingQC, setPendingQC] = useState({ inbound: [], outbound: [] });
    const [activeTab, setActiveTab] = useState('inbound');
    const [loading, setLoading] = useState(true);

    // QC Modal states
    const [showQCModal, setShowQCModal] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [qcChecklist, setQcChecklist] = useState({});
    const [qcNotes, setQcNotes] = useState('');
    const [actionMessage, setActionMessage] = useState(null);

    useEffect(() => {
        loadQCItems();
    }, []);

    const loadQCItems = async () => {
        setLoading(true);
        try {
            const { getBatches } = await import('../../services/wmsApi');
            const { getJobOrders } = await import('../../services/productionApi');

            // Fetch Inbound (Batches with status QC_PENDING)
            const inboundRes = await getBatches({ status: 'QC_PENDING' });

            // Fetch Outbound (Jobs with status QC_PENDING)
            const outboundRes = await getJobOrders({ status: 'QC_PENDING' });

            setPendingQC({
                inbound: (inboundRes.data || []).map(b => ({
                    id: b.id,
                    type: 'inbound',
                    vendor: b.source_reference || 'Unknown',
                    items: `${b.brand} ${b.size} - ${b.quantity} ${b.unit}`,
                    receivedAt: b.created_at,
                    status: b.status,
                    barcode: b.barcode // Important for update
                })),
                outbound: (outboundRes.data || []).map(j => ({
                    id: j.id,
                    type: 'outbound',
                    customer: j.customer_name,
                    items: j.notes || 'Job Order',
                    technician: j.assigned_to || '-',
                    status: j.status,
                    so_id: j.so_id // Added SO ID for delivery
                }))
            });

        } catch (err) {
            console.error('Error loading QC items:', err);
        }
        setLoading(false);
    };

    // Inbound checklist items
    const inboundChecklist = [
        { id: 'rust', label: 'Tidak ada karat pada drat fitting?', critical: true },
        { id: 'diameter', label: 'Diameter sesuai dengan PO?', critical: true },
        { id: 'packaging', label: 'Kemasan tidak rusak?', critical: false },
        { id: 'quantity', label: 'Jumlah sesuai dengan PO?', critical: true },
    ];

    // Outbound checklist items
    const outboundChecklist = [
        { id: 'length', label: 'Ukuran panjang sesuai?', critical: true },
        { id: 'crimping', label: 'Diameter crimping sesuai tabel?', critical: true },
        { id: 'cleaning', label: 'Sudah dibersihkan (Projectile Cleaning)?', critical: true },
        { id: 'visual', label: 'Visual crimping OK (tidak retak/miring)?', critical: true },
        { id: 'label', label: 'Label produk sudah dipasang?', critical: false },
    ];

    // Get stats
    const stats = useMemo(() => ({
        pendingInbound: pendingQC.inbound.length,
        pendingOutbound: pendingQC.outbound.length,
        passedToday: 0, // TODO: Fetch from logs API if available
        rejectedToday: 0
    }), [pendingQC]);

    const handleStartQC = (item) => {
        setSelectedItem(item);
        setQcChecklist({});
        setQcNotes('');
        setShowQCModal(true);
    };

    const handleChecklistChange = (itemId, value) => {
        setQcChecklist(prev => ({ ...prev, [itemId]: value }));
    };

    const getChecklist = () => {
        return selectedItem?.type === 'inbound' ? inboundChecklist : outboundChecklist;
    };

    const isAllChecked = () => {
        const checklist = getChecklist();
        return checklist.every(item => qcChecklist[item.id] !== undefined);
    };

    const hasFailedCritical = () => {
        const checklist = getChecklist();
        return checklist.some(item => item.critical && qcChecklist[item.id] === false);
    };

    const handleQCSubmit = async (status) => {
        if (!isAllChecked()) {
            alert('Mohon lengkapi semua checklist!');
            return;
        }

        try {
            if (selectedItem.type === 'inbound') {
                const { updateBatchStatus } = await import('../../services/wmsApi');
                // Map PASS -> AVAILABLE, FAIL -> REJECTED/QUARANTINE
                const newStatus = status === 'pass' ? 'AVAILABLE' : 'QUARANTINE';
                await updateBatchStatus(selectedItem.barcode, newStatus, qcNotes);

                if (status === 'pass') {
                    if (confirm('QC Passed! Barang siap ditaruh di rak. Lanjut ke Put-away?')) {
                        window.location.href = `/inbound/putaway?barcode=${selectedItem.barcode}`;
                        return;
                    }
                }

                if (status === 'pass') {
                    if (confirm('QC Passed! Barang siap ditaruh di rak. Lanjut ke Put-away?')) {
                        window.location.href = `/inbound/putaway?barcode=${selectedItem.barcode}`;
                        return;
                    }
                }
            } else {
                const { completeJobOrder } = await import('../../services/productionApi');
                if (status === 'pass') {
                    // Only mark as QC passed here, actual delivery is next
                    await completeJobOrder(selectedItem.id);

                    // Prompt for Delivery Order
                    if (confirm('QC Passed! Apakah Anda ingin langsung membuat Surat Jalan (Delivery Order)?')) {
                        window.location.href = `/outbound/create?so_id=${selectedItem.so_id}`;
                        return;
                    }

                } else {
                    // TODO: Implement rejectJobOrder or similar if needed
                    alert('Status Reject untuk Outbound belum didukung API, mencatat log saja.');
                }
            }

            // Remove from pending locally
            setPendingQC(prev => ({
                ...prev,
                [selectedItem.type]: prev[selectedItem.type].filter(i => i.id !== selectedItem.id)
            }));

            setShowQCModal(false);
            setSelectedItem(null);

            // Reload lists to be safe
            loadQCItems();

            setActionMessage({ type: 'success', text: 'QC Berhasil disimpan!' });
            setTimeout(() => setActionMessage(null), 3000);

        } catch (err) {
            console.error('QC Submit Error:', err);
            setActionMessage({ type: 'error', text: 'Gagal menyimpan hasil QC.' });
            setTimeout(() => setActionMessage(null), 3000);
        }
    };

    return (
        <div className="qc-page">
            {/* Action Message Toast */}
            {actionMessage && (
                <div className={`action-toast ${actionMessage.type}`}>
                    {actionMessage.text}
                </div>
            )}

            {/* Page Header */}
            <div className="page-header">
                <div className="header-content">
                    <h1>🔍 Quality Control</h1>
                    <p>Inspeksi kualitas barang masuk dan hasil produksi</p>
                </div>
                <div className="qc-officer">
                    <span className="officer-label">QC Officer:</span>
                    <span className="officer-name">{user?.name || 'QC Officer'}</span>
                </div>
            </div>

            {/* Stats Row */}
            <div className="stats-row">
                <div className="stat-card warning">
                    <span className="stat-icon">📥</span>
                    <div className="stat-content">
                        <span className="stat-value">{stats.pendingInbound}</span>
                        <span className="stat-label">Pending Inbound</span>
                    </div>
                </div>
                <div className="stat-card info">
                    <span className="stat-icon">📤</span>
                    <div className="stat-content">
                        <span className="stat-value">{stats.pendingOutbound}</span>
                        <span className="stat-label">Pending Pre-Sell</span>
                    </div>
                </div>
                <div className="stat-card success">
                    <span className="stat-icon">✅</span>
                    <div className="stat-content">
                        <span className="stat-value">{stats.passedToday}</span>
                        <span className="stat-label">Passed Today</span>
                    </div>
                </div>
                <div className="stat-card danger">
                    <span className="stat-icon">❌</span>
                    <div className="stat-content">
                        <span className="stat-value">{stats.rejectedToday}</span>
                        <span className="stat-label">Rejected Today</span>
                    </div>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="tab-navigation">
                <button
                    className={`tab-btn ${activeTab === 'inbound' ? 'active' : ''}`}
                    onClick={() => setActiveTab('inbound')}
                >
                    📥 QC INBOUND (Barang Masuk)
                    {stats.pendingInbound > 0 && (
                        <span className="tab-badge">{stats.pendingInbound}</span>
                    )}
                </button>
                <button
                    className={`tab-btn ${activeTab === 'outbound' ? 'active' : ''}`}
                    onClick={() => setActiveTab('outbound')}
                >
                    📤 QC BEFORE SELLING (Hasil Produksi)
                    {stats.pendingOutbound > 0 && (
                        <span className="tab-badge">{stats.pendingOutbound}</span>
                    )}
                </button>
            </div>

            {/* Pending QC List */}
            <Card
                title={activeTab === 'inbound' ? '📥 Barang Masuk Menunggu QC' : '📤 Hasil Produksi Menunggu QC'}
                subtitle={`${pendingQC[activeTab].length} item perlu diperiksa`}
            >
                {pendingQC[activeTab].length === 0 ? (
                    <div className="empty-state">
                        <span className="empty-icon">✅</span>
                        <p>Tidak ada item yang perlu di-QC</p>
                    </div>
                ) : (
                    <div className="qc-list">
                        {pendingQC[activeTab].map(item => (
                            <div key={item.id} className="qc-item">
                                <div className="qc-item-header">
                                    <span className="qc-id">{item.id}</span>
                                    <StatusBadge status="warning" size="sm" />
                                </div>

                                <div className="qc-item-body">
                                    <div className="qc-details">
                                        {activeTab === 'inbound' ? (
                                            <>
                                                <div className="detail-row">
                                                    <span className="detail-label">Vendor:</span>
                                                    <span className="detail-value">{item.vendor}</span>
                                                </div>
                                                <div className="detail-row">
                                                    <span className="detail-label">Item:</span>
                                                    <span className="detail-value">{item.items}</span>
                                                </div>
                                                <div className="detail-row">
                                                    <span className="detail-label">Diterima:</span>
                                                    <span className="detail-value">{item.receivedAt}</span>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="detail-row">
                                                    <span className="detail-label">Customer:</span>
                                                    <span className="detail-value">{item.customer}</span>
                                                </div>
                                                <div className="detail-row">
                                                    <span className="detail-label">Item:</span>
                                                    <span className="detail-value">{item.items}</span>
                                                </div>
                                                <div className="detail-row">
                                                    <span className="detail-label">Teknisi:</span>
                                                    <span className="detail-value">{item.technician}</span>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className="qc-item-actions">
                                    <Button variant="primary" onClick={() => handleStartQC(item)}>
                                        🔍 Mulai QC
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Card>

            {/* QC Inspection Modal */}
            <Modal
                isOpen={showQCModal}
                onClose={() => setShowQCModal(false)}
                title={`🔍 QC Inspection - ${selectedItem?.id}`}
                size="md"
            >
                {selectedItem && (
                    <div className="qc-modal-content">
                        {/* Item Info */}
                        <div className="qc-item-info">
                            <h4>{selectedItem.items}</h4>
                            <p>
                                {selectedItem.type === 'inbound'
                                    ? `Vendor: ${selectedItem.vendor}`
                                    : `Customer: ${selectedItem.customer}`}
                            </p>
                        </div>

                        {/* Checklist */}
                        <div className="qc-checklist">
                            <h4>PEMERIKSAAN FISIK:</h4>
                            {getChecklist().map((item, index) => (
                                <div key={item.id} className="checklist-item">
                                    <span className="checklist-number">{index + 1}.</span>
                                    <span className={`checklist-label ${item.critical ? 'critical' : ''}`}>
                                        {item.label}
                                        {item.critical && <span className="critical-badge">*</span>}
                                    </span>
                                    <div className="checklist-buttons">
                                        <button
                                            className={`check-btn pass ${qcChecklist[item.id] === true ? 'active' : ''}`}
                                            onClick={() => handleChecklistChange(item.id, true)}
                                        >
                                            ✓ PASS
                                        </button>
                                        <button
                                            className={`check-btn fail ${qcChecklist[item.id] === false ? 'active' : ''}`}
                                            onClick={() => handleChecklistChange(item.id, false)}
                                        >
                                            ✗ FAIL
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Notes */}
                        <div className="qc-notes">
                            <label>Catatan (Opsional):</label>
                            <textarea
                                value={qcNotes}
                                onChange={(e) => setQcNotes(e.target.value)}
                                placeholder="Tambahkan catatan jika ada..."
                                rows={3}
                            />
                        </div>

                        {/* Warning if critical failed */}
                        {hasFailedCritical() && (
                            <div className="qc-warning">
                                ⚠️ Ada item CRITICAL yang FAIL. Barang akan masuk ke <strong>Gudang Karantina</strong>.
                            </div>
                        )}

                        {/* Actions */}
                        <div className="qc-final-actions">
                            <button
                                className="final-btn pass"
                                onClick={() => handleQCSubmit('pass')}
                                disabled={!isAllChecked() || hasFailedCritical()}
                            >
                                <span className="btn-icon">✅</span>
                                <span className="btn-text">QC PASSED</span>
                            </button>
                            <button
                                className="final-btn reject"
                                onClick={() => handleQCSubmit('fail')}
                                disabled={!isAllChecked()}
                            >
                                <span className="btn-icon">❌</span>
                                <span className="btn-text">REJECT / RMA</span>
                            </button>
                        </div>

                        <div className="qc-inspector">
                            Diperiksa Oleh: <strong>{user?.name || 'QC Officer'}</strong>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
