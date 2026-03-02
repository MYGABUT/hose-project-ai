/**
 * Job Orders List Page - Connected to Backend API
 * Shows all JOs with material allocation and status management
 */
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Card from '../../components/common/Card/Card';
import Button from '../../components/common/Button/Button';
import {
    getJobOrders,
    getJobOrder,
    startJobOrder,
    completeJobOrder,
    substituteMaterial,
    addJobMaterial
} from '../../services/productionApi';
import { getAvailableBatches } from '../../services/wmsApi';
import './Production.css';

const STATUS_BADGES = {
    DRAFT: { label: 'Draft', color: 'gray', icon: '📝' },
    MATERIALS_RESERVED: { label: 'Reserved', color: 'blue', icon: '📦' },
    IN_PROGRESS: { label: 'Produksi', color: 'orange', icon: '🔧' },
    QC_PENDING: { label: 'QC Pending', color: 'yellow', icon: '🔍' },
    QC_PASSED: { label: 'QC Passed', color: 'teal', icon: '✅' },
    QC_FAILED: { label: 'QC Failed', color: 'red', icon: '❌' },
    COMPLETED: { label: 'Selesai', color: 'green', icon: '🎉' },
    CANCELLED: { label: 'Batal', color: 'red', icon: '🚫' },
};

const PRIORITY_LABELS = {
    1: { label: 'URGENT', color: 'red', icon: '🔴' },
    2: { label: 'High', color: 'orange', icon: '🟠' },
    3: { label: 'Medium', color: 'yellow', icon: '🟡' },
    4: { label: 'Low', color: 'green', icon: '🟢' },
    5: { label: 'Low', color: 'gray', icon: '⚪' },
};

export default function JobOrders() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const soFilter = searchParams.get('so');

    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [actionLoading, setActionLoading] = useState(null);
    const [selectedJO, setSelectedJO] = useState(null);
    const [showDetail, setShowDetail] = useState(false);
    const [message, setMessage] = useState(null);

    // Substitution State
    const [substModal, setSubstModal] = useState({ open: false, mode: 'swap', joId: null, lineId: null, materialId: null, productSku: null });
    const [availableBatches, setAvailableBatches] = useState([]);
    const [filteredBatches, setFilteredBatches] = useState([]); // For search
    const [searchQuery, setSearchQuery] = useState('');
    const [substLoading, setSubstLoading] = useState(false);
    const [substForm, setSubstForm] = useState({ newBatchId: '', quantity: '' });

    // Update filtered list when search changes
    useEffect(() => {
        if (!searchQuery) {
            setFilteredBatches(availableBatches);
        } else {
            const lower = searchQuery.toLowerCase();
            setFilteredBatches(availableBatches.filter(b =>
                (b.barcode || '').toLowerCase().includes(lower) ||
                (b.product_sku || '').toLowerCase().includes(lower) ||
                (b.location || '').toLowerCase().includes(lower)
            ));
        }
    }, [searchQuery, availableBatches]);

    const openSubstitution = async (jo, line, material) => {
        setSubstModal({
            open: true,
            mode: 'swap',
            joId: jo.id,
            lineId: line.id,
            materialId: material.id,
            productSku: material.batch_barcode
        });
        loadBatches(line.product_id);
        setSubstForm({ newBatchId: '', quantity: material.allocated_qty });
    };

    const openAddMaterial = async (jo, line) => {
        setSubstModal({
            open: true,
            mode: 'add',
            joId: jo.id,
            lineId: line.id,
            materialId: null,
            productSku: line.description // title fallback
        });
        loadBatches(line.product_id); // Now we have product_id from backend
        setSubstForm({ newBatchId: '', quantity: '' });
    };

    const loadBatches = async (productId) => {
        setSubstLoading(true);
        // If productId is available, filter by it. Otherwise fetch all (or maybe danger?)
        // The backend `getAvailableBatches` supports `product_id`.
        const params = { min_qty: 0 };
        if (productId) params.product_id = productId;

        console.log("Loading batches with params:", params); // DEBUG LOG

        try {
            const result = await getAvailableBatches(params);
            if (result.status === 'success') {
                setAvailableBatches(result.data);
            } else {
                console.error("Failed to load batches:", result.message);
                setAvailableBatches([]); // Clear on error
            }
        } catch (err) {
            console.error("Network error loading batches:", err);
            // alert("Network error: Cannot fetch inventory."); // Optional
        }
        setSubstLoading(false);
    };

    const handleSubstitute = async (keepOpen = false) => {
        if (!substForm.newBatchId || !substForm.quantity) return alert("Pilih batch dan input quantity");

        setSubstLoading(true);
        let result;

        if (substModal.mode === 'swap') {
            result = await substituteMaterial(substModal.joId, substModal.lineId, {
                original_material_id: substModal.materialId,
                new_batch_id: parseInt(substForm.newBatchId),
                quantity: parseFloat(substForm.quantity)
            });
        } else {
            // Mode Add
            result = await addJobMaterial(substModal.joId, substModal.lineId, {
                batch_id: parseInt(substForm.newBatchId),
                quantity: parseFloat(substForm.quantity)
            });
        }

        if (result.status === 'success') {
            setMessage({ type: 'success', text: substModal.mode === 'swap' ? '✅ Material diganti!' : '✅ Material ditambahkan!' });

            // Refresh detail to show new allocation
            await handleViewDetail(substModal.joId); // Await to ensure UI updates under the modal

            if (keepOpen) {
                // Reset form for next entry
                setSubstForm(prev => ({ ...prev, newBatchId: '', quantity: '' }));
                // Reuse the same modal state, just clear selection
            } else {
                // Close modal
                setSubstModal({ open: false, mode: 'swap', joId: null, lineId: null, materialId: null });
            }
        } else {
            alert("Gagal: " + result.message);
        }
        setSubstLoading(false);
    };

    useEffect(() => {
        loadOrders();
    }, [filter]);

    const loadOrders = async () => {
        setLoading(true);
        const params = { limit: 50 };
        if (filter !== 'all') params.status = filter;
        if (soFilter) params.so_id = soFilter; // Add filter by SO

        const result = await getJobOrders(params);
        if (result.status === 'success') {
            setOrders(result.data || []);
        }
        setLoading(false);
    };

    const handleViewDetail = async (joId) => {
        setActionLoading(joId);
        const result = await getJobOrder(joId);
        if (result.status === 'success') {
            setSelectedJO(result.data);
            setShowDetail(true);
        }
        setActionLoading(null);
    };

    const handleStart = async (joId) => {
        if (!confirm('Mulai produksi JO ini? Material akan di-pick dari inventori.')) return;

        setActionLoading(joId);
        const result = await startJobOrder(joId);
        if (result.status === 'success') {
            setMessage({ type: 'success', text: '✅ JO dimulai! Material telah di-pick.' });
            loadOrders();
        } else {
            setMessage({ type: 'error', text: result.message || 'Gagal memulai JO' });
        }
        setActionLoading(null);
    };

    const handleComplete = async (joId) => {
        if (!confirm('Selesaikan JO ini? Stok akan dikurangi dari inventori.')) return;

        setActionLoading(joId);
        const result = await completeJobOrder(joId);
        if (result.status === 'success') {
            setMessage({ type: 'success', text: '✅ JO selesai! Stok telah dikurangi dari inventori.' });
            loadOrders();
            setShowDetail(false);
        } else {
            setMessage({ type: 'error', text: result.message || 'Gagal menyelesaikan JO' });
        }
        setActionLoading(null);
    };

    const getStatusBadge = (status) => {
        const badge = STATUS_BADGES[status] || { label: status, color: 'gray', icon: '❓' };
        return (
            <span className={`status-badge ${badge.color}`}>
                {badge.icon} {badge.label}
            </span>
        );
    };

    const getPriorityBadge = (priority) => {
        const p = PRIORITY_LABELS[priority] || PRIORITY_LABELS[3];
        return (
            <span className={`priority-badge ${p.color}`}>
                {p.icon} {p.label}
            </span>
        );
    };

    const getProgressBar = (status) => {
        const steps = ['DRAFT', 'MATERIALS_RESERVED', 'IN_PROGRESS', 'QC_PENDING', 'COMPLETED'];
        const currentIndex = steps.indexOf(status);
        const percent = currentIndex >= 0 ? Math.round(((currentIndex + 1) / steps.length) * 100) : 0;

        return (
            <div className="progress-bar-container">
                <div className="progress-bar" style={{ width: `${percent}%` }}></div>
                <span className="progress-text">{percent}%</span>
            </div>
        );
    };

    return (
        <div className="production-page">
            {/* Toast */}
            {message && (
                <div className={`toast-message ${message.type}`}>
                    {message.text}
                </div>
            )}

            <div className="page-header">
                <div>
                    <h1 className="page-title">🔧 Job Orders</h1>
                    <p className="page-subtitle">Daftar order produksi</p>
                </div>
                <div className="header-actions">
                    <Button
                        variant="secondary"
                        onClick={() => navigate('/production/sales-orders')}
                    >
                        📋 Sales Orders
                    </Button>
                    <Button
                        variant="primary"
                        onClick={loadOrders}
                    >
                        🔄 Refresh
                    </Button>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="filter-tabs">
                {[
                    { key: 'all', label: 'Semua' },
                    { key: 'MATERIALS_RESERVED', label: 'Reserved' },
                    { key: 'IN_PROGRESS', label: 'Produksi' },
                    { key: 'QC_PENDING', label: 'QC' },
                    { key: 'COMPLETED', label: 'Selesai' },
                ].map(tab => (
                    <button
                        key={tab.key}
                        className={`filter-tab ${filter === tab.key ? 'active' : ''}`}
                        onClick={() => setFilter(tab.key)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Orders Table */}
            <Card>
                {loading ? (
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <p>Memuat data...</p>
                    </div>
                ) : orders.length === 0 ? (
                    <div className="empty-state">
                        <span className="empty-icon">📭</span>
                        <h3>Belum ada Job Order</h3>
                        <p>Buat JO dari Sales Order</p>
                        <Button onClick={() => navigate('/production/sales-orders')}>
                            Lihat Sales Orders
                        </Button>
                    </div>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>JO Number</th>
                                <th>SO Reference</th>
                                <th>Customer</th>
                                <th>Items</th>
                                <th>Priority</th>
                                <th>Progress</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.map(order => (
                                <tr key={order.id}>
                                    <td className="jo-number">
                                        <strong>{order.jo_number}</strong>
                                    </td>
                                    <td>{order.so_number || '-'}</td>
                                    <td>{order.customer_name || '-'}</td>
                                    <td>{order.line_count || 0} item</td>
                                    <td>{getPriorityBadge(order.priority)}</td>
                                    <td>{getProgressBar(order.status)}</td>
                                    <td>{getStatusBadge(order.status)}</td>
                                    <td className="actions-cell">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleViewDetail(order.id)}
                                            loading={actionLoading === order.id}
                                        >
                                            👁️
                                        </Button>

                                        {(order.status === 'MATERIALS_RESERVED' || order.status === 'DRAFT') && (
                                            <Button
                                                variant="primary"
                                                size="sm"
                                                onClick={() => handleStart(order.id)}
                                                loading={actionLoading === order.id}
                                            >
                                                ▶️ Start
                                            </Button>
                                        )}

                                        {order.status === 'IN_PROGRESS' && (
                                            <Button
                                                variant="success"
                                                size="sm"
                                                onClick={() => handleComplete(order.id)}
                                                loading={actionLoading === order.id}
                                            >
                                                ✅ Complete
                                            </Button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </Card>

            {/* JO Detail Modal */}
            {showDetail && selectedJO && (
                <div className="modal-overlay" onClick={() => setShowDetail(false)}>
                    <div className="modal-content modal-large" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>📋 Detail JO: {selectedJO.jo_number}</h3>
                            <button onClick={() => setShowDetail(false)}>✕</button>
                        </div>
                        <div className="modal-body">
                            {/* JO Info */}
                            <div className="jo-info-grid">
                                <div className="info-item">
                                    <label>Status</label>
                                    <span>{getStatusBadge(selectedJO.status)}</span>
                                </div>
                                <div className="info-item">
                                    <label>SO Reference</label>
                                    <span>{selectedJO.so_number || '-'}</span>
                                </div>
                                <div className="info-item">
                                    <label>Customer</label>
                                    <span>{selectedJO.customer_name || '-'}</span>
                                </div>
                                <div className="info-item">
                                    <label>Priority</label>
                                    <span>{getPriorityBadge(selectedJO.priority)}</span>
                                </div>
                                <div className="info-item">
                                    <label>Due Date</label>
                                    <span>
                                        {selectedJO.due_date
                                            ? new Date(selectedJO.due_date).toLocaleDateString('id-ID')
                                            : '-'
                                        }
                                    </span>
                                </div>
                                <div className="info-item">
                                    <label>Assigned To</label>
                                    <span>{selectedJO.assigned_to || '-'}</span>
                                </div>
                            </div>

                            {/* Lines */}
                            <h4>📦 Item Lines</h4>
                            <table className="data-table compact">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Description</th>
                                        <th>Qty</th>
                                        <th>Cut Length</th>
                                        <th>Materials</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(selectedJO.lines || []).map((line, idx) => (
                                        <tr key={line.id}>
                                            <td>{idx + 1}</td>
                                            <td>{line.description}</td>
                                            <td>{line.qty}</td>
                                            <td>{line.cut_length ? `${line.cut_length}m` : '-'}</td>
                                            <td>
                                                {(line.materials || []).length > 0 ? (
                                                    <span className="material-count">
                                                        {line.materials.length} roll allocated
                                                    </span>
                                                ) : (
                                                    <span className="text-muted">No materials</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {/* Materials Detail */}
                            {selectedJO.lines?.length > 0 && (
                                <>
                                    <h4>
                                        🎯 Material Allocation
                                        {/* Optional global add button if needed, but per-line is better */}
                                    </h4>
                                    <div className="materials-list">
                                        {selectedJO.lines?.map(line => (
                                            <div key={line.id} className="line-material-group" style={{ marginBottom: '15px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                                                <div style={{ fontWeight: 'bold', marginBottom: '5px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span>Line #{line.line_number}: {line.description}</span>
                                                    {(selectedJO.status === 'DRAFT' || selectedJO.status === 'MATERIALS_RESERVED') && (
                                                        <Button size="sm" variant="outline" onClick={() => openAddMaterial(selectedJO, line)}>
                                                            ➕ Add Material
                                                        </Button>
                                                    )}
                                                </div>

                                                {(line.materials && line.materials.length > 0) ? (
                                                    line.materials.map(mat => (
                                                        <div key={mat.id} className="material-item">
                                                            <span className="material-barcode">{mat.batch_barcode}</span>
                                                            <span className="material-qty">
                                                                Take: {mat.qty_allocated}m
                                                            </span>
                                                            <span className={`material-status ${mat.status?.toLowerCase()}`}>
                                                                {mat.status}
                                                            </span>
                                                            {(selectedJO.status === 'DRAFT' || selectedJO.status === 'MATERIALS_RESERVED') && (
                                                                <button
                                                                    className="btn-icon-small"
                                                                    onClick={() => openSubstitution(selectedJO, line, mat)}
                                                                    title="Ganti Material"
                                                                    style={{ marginLeft: '10px', cursor: 'pointer', background: 'none', border: 'none' }}
                                                                >
                                                                    🔄
                                                                </button>
                                                            )}
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="text-muted" style={{ fontStyle: 'italic', paddingLeft: '10px' }}>
                                                        Belum ada material. Klik "+ Add Material" untuk alokasi manual.
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}

                            {/* Substitution/Add Modal Overlay */}
                            {substModal.open && (
                                <div className="modal-overlay" style={{ zIndex: 1100 }}> {/* Higher z-index */}
                                    <div className="modal-content" style={{ maxWidth: '800px', width: '90%' }}>
                                        <h3>{substModal.mode === 'swap' ? '🔄 Ganti Material' : '➕ Tambah Material'}</h3>

                                        <div className="form-group" style={{ marginBottom: '1rem' }}>
                                            <label>Cari Batch (Filter):</label>
                                            <input
                                                type="text"
                                                placeholder="Ketik batch ID, SKU, atau Lokasi..."
                                                style={{ width: '100%', padding: '8px', marginBottom: '8px' }}
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                            />

                                            {/* Batch Table Selection */}
                                            <div className="batch-selection-table" style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #ddd', borderRadius: '4px' }}>
                                                <table className="data-table" style={{ margin: 0, fontSize: '0.9rem' }}>
                                                    <thead style={{ position: 'sticky', top: 0, background: '#f8f9fa' }}>
                                                        <tr>
                                                            <th>Barcode</th>
                                                            <th>SKU / Product</th>
                                                            <th>Location</th>
                                                            <th style={{ textAlign: 'right' }}>Stock (m)</th>
                                                            <th style={{ width: '80px' }}>Action</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {filteredBatches.length > 0 ? (
                                                            filteredBatches.map(b => (
                                                                <tr
                                                                    key={b.id}
                                                                    className={parseInt(substForm.newBatchId) === b.id ? 'selected-row' : ''}
                                                                    style={{
                                                                        cursor: 'pointer',
                                                                        backgroundColor: parseInt(substForm.newBatchId) === b.id ? '#e3f2fd' : 'inherit'
                                                                    }}
                                                                    onClick={() => setSubstForm({ ...substForm, newBatchId: b.id })}
                                                                >
                                                                    <td style={{ fontWeight: 'bold' }}>{b.barcode}</td>
                                                                    <td>{b.product_sku || '-'}</td>
                                                                    <td>{b.location || '-'}</td>
                                                                    <td style={{ textAlign: 'right' }}>{b.available_qty}</td>
                                                                    <td>
                                                                        {parseInt(substForm.newBatchId) === b.id ? (
                                                                            <span style={{ color: 'green' }}>✔ Selected</span>
                                                                        ) : (
                                                                            <button className="btn-icon-small">Select</button>
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            ))
                                                        ) : (
                                                            <tr>
                                                                <td colSpan="5" className="text-center" style={{ padding: '20px' }}>
                                                                    Tidak ada batch yang cocok.
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                            <small className="text-muted">Menampilkan {filteredBatches.length} dari {availableBatches.length} batch.</small>
                                        </div>

                                        <div className="form-group" style={{ marginBottom: '1rem' }}>
                                            <label>Quantity yang diambil:</label>
                                            <input
                                                type="number"
                                                style={{ width: '100%', padding: '8px' }}
                                                value={substForm.quantity}
                                                onChange={e => setSubstForm({ ...substForm, quantity: e.target.value })}
                                                placeholder="Contoh: 50.5"
                                            />
                                        </div>

                                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                                            <Button variant="ghost" onClick={() => setSubstModal({ ...substModal, open: false })}>Batal</Button>
                                            {substModal.mode === 'add' && (
                                                <Button
                                                    variant="secondary"
                                                    onClick={() => handleSubstitute(true)} // Pass true to keep open
                                                    loading={substLoading}
                                                    disabled={!substForm.newBatchId || !substForm.quantity}
                                                >
                                                    💾 Simpan & Tambah Lagi
                                                </Button>
                                            )}
                                            <Button
                                                variant="primary"
                                                onClick={() => handleSubstitute(false)}
                                                loading={substLoading}
                                                disabled={!substForm.newBatchId || !substForm.quantity}
                                            >
                                                Simpan Selesai
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* HPP Display - Only for Completed JOs */}
                            {selectedJO.status === 'COMPLETED' && selectedJO.total_hpp > 0 && (
                                <div className="hpp-card">
                                    <h4>💰 Harga Pokok Produksi (HPP)</h4>
                                    {selectedJO.lines?.map((line, idx) => (
                                        <div key={line.id} style={{ marginBottom: '1rem' }}>
                                            <strong>Line {idx + 1}: {line.description}</strong>
                                            <div className="hpp-breakdown">
                                                <div className="hpp-item">
                                                    <span className="hpp-label">Hose</span>
                                                    <span className="hpp-value">Rp {(line.hose_cost || 0).toLocaleString('id-ID')}</span>
                                                </div>
                                                <div className="hpp-item">
                                                    <span className="hpp-label">Fitting A</span>
                                                    <span className="hpp-value">Rp {(line.fitting_a_cost || 0).toLocaleString('id-ID')}</span>
                                                </div>
                                                <div className="hpp-item">
                                                    <span className="hpp-label">Fitting B</span>
                                                    <span className="hpp-value">Rp {(line.fitting_b_cost || 0).toLocaleString('id-ID')}</span>
                                                </div>
                                                <div className="hpp-item">
                                                    <span className="hpp-label">Labor</span>
                                                    <span className="hpp-value">Rp {(line.labor_cost || 0).toLocaleString('id-ID')}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    <div className="hpp-total">
                                        <span className="hpp-label">Total HPP</span>
                                        <span className="hpp-value">Rp {(selectedJO.total_hpp || 0).toLocaleString('id-ID')}</span>
                                    </div>
                                </div>
                            )}

                            {/* Notes */}
                            {selectedJO.notes && (
                                <div className="jo-notes">
                                    <h4>📝 Notes</h4>
                                    <p>{selectedJO.notes}</p>
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <Button variant="ghost" onClick={() => setShowDetail(false)}>
                                Tutup
                            </Button>

                            {(selectedJO.status === 'MATERIALS_RESERVED' || selectedJO.status === 'DRAFT') && (
                                <Button
                                    variant="primary"
                                    onClick={() => handleStart(selectedJO.id)}
                                    loading={actionLoading === selectedJO.id}
                                >
                                    ▶️ Mulai Produksi
                                </Button>
                            )}

                            {selectedJO.status === 'IN_PROGRESS' && (
                                <Button
                                    variant="success"
                                    onClick={() => handleComplete(selectedJO.id)}
                                    loading={actionLoading === selectedJO.id}
                                >
                                    ✅ Selesaikan JO
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
