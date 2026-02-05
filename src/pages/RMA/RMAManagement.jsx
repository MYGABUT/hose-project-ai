import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Card from '../../components/common/Card/Card';
import Button from '../../components/common/Button/Button';
import Modal from '../../components/common/Modal/Modal';
import StatusBadge from '../../components/common/Badge/StatusBadge';
import { getRMATickets, createRMATicket, updateRMAStatus } from '../../services/rmaApi';
import './RMAManagement.css';

const statusConfig = {
    new: { label: 'Tiket Baru', color: 'info', step: 1 },
    received: { label: 'Barang Diterima', color: 'warning', step: 2 },
    inspection: { label: 'Inspeksi QC', color: 'warning', step: 3 },
    decided: { label: 'Keputusan', color: 'success', step: 4 },
    closed: { label: 'Selesai', color: 'success', step: 5 }
};

const rootCauseOptions = [
    { id: 'assembly_error', label: 'Assembly Error (Salah Crimping/Kupas)', icon: '🔧', type: 'internal' },
    { id: 'material_defect', label: 'Material Defect (Karet Getas/Fitting Retak)', icon: '⚠️', type: 'vendor' },
    { id: 'customer_misuse', label: 'Customer Misuse (Kena Lindas/Salah Tekanan)', icon: '❌', type: 'rejected' }
];

const solutionOptions = [
    { id: 'replace', label: 'Ganti Baru', icon: '🔄' },
    { id: 'refund', label: 'Refund', icon: '💰' },
    { id: 'restock', label: 'Restock (Kembali ke Gudang)', icon: '🏭' },
    { id: 'rejected', label: 'Tolak Klaim', icon: '❌' }
];

export default function RMAManagement() {
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [filterStatus, setFilterStatus] = useState('all');

    // Create ticket form state
    const [newTicket, setNewTicket] = useState({
        client: '',
        invoice: '',
        item: '',
        qty: 1,
        rootCause: '',
        supplier: '',
        solution: '',
        photos: []
    });

    const location = useLocation();

    useEffect(() => {
        loadTickets();

        // Check if redirected from Delivery (Failed/Return)
        if (location.state?.createFromDO) {
            const doData = location.state.createFromDO;
            setNewTicket(prev => ({
                ...prev,
                client: doData.customer_name,
                invoice: doData.do_number, // Use DO Number as reference
                item: doData.description || "Barang Retur", // Or map from DO items
                rootCause: 'customer_misuse', // Default assumption for delivery failure? Or maybe just empty
                qty: doData.total_qty || 1
            }));
            setShowCreateModal(true);

            // Clean state history so it doesn't reopen on refresh (optional, but good practice)
            window.history.replaceState({}, document.title);
        }
    }, [filterStatus]);

    const loadTickets = async () => {
        setLoading(true);
        const res = await getRMATickets(filterStatus);
        if (res.status === 'success') {
            setTickets(res.data);
        }
        setLoading(false);
    };

    const handleViewDetail = (ticket) => {
        setSelectedTicket(ticket);
        setShowDetailModal(true);
    };

    const handleCreateTicket = async () => {
        if (!newTicket.client || !newTicket.invoice || !newTicket.item) {
            alert('Mohon lengkapi data klien dan barang!');
            return;
        }

        const res = await createRMATicket(newTicket);
        if (res.status === 'success') {
            alert(`✅ Tiket ${res.data.id} berhasil dibuat!`);
            setShowCreateModal(false);
            setNewTicket({ client: '', invoice: '', item: '', qty: 1, rootCause: '', supplier: '', solution: '', photos: [] });
            loadTickets(); // Refresh
        } else {
            alert('Gagal membuat tiket: ' + res.message);
        }
    };

    const handleUpdateStatus = async (ticketId, updateData) => {
        // updateData could be string (status) or object
        let payload = {};
        if (typeof updateData === 'string') {
            payload = { status: updateData };
        } else {
            payload = updateData;
        }

        const res = await updateRMAStatus(ticketId, payload);
        if (res.status === 'success') {
            if (payload.status === 'closed') {
                alert('✅ RMA ditutup. Stok telah diperbarui.');
            }
            setShowDetailModal(false);
            loadTickets();
        } else {
            alert('Gagal update status: ' + res.message);
        }
    };

    const stats = {
        total: tickets.length,
        pending: tickets.filter(t => ['new', 'received', 'inspection'].includes(t.status)).length,
        materialDefect: tickets.filter(t => t.rootCause === 'material_defect').length
    };

    return (
        <div className="rma-management">
            <div className="page-header">
                <div>
                    <h1 className="page-title">📋 RMA Management</h1>
                    <p className="page-subtitle">Manajemen Retur & Komplain Pelanggan</p>
                </div>
                <div className="header-actions">
                    <Button variant="secondary" onClick={loadTickets}>🔄 Refresh</Button>
                    <Button variant="primary" onClick={() => setShowCreateModal(true)}>
                        + Buat Tiket RMA
                    </Button>
                </div>
            </div>

            {/* Stats */}
            <div className="rma-stats">
                <div className="stat-card">
                    <span className="stat-value">{loading ? '...' : stats.total}</span>
                    <span className="stat-label">Total RMA</span>
                </div>
                <div className="stat-card warning">
                    <span className="stat-value">{loading ? '...' : stats.pending}</span>
                    <span className="stat-label">Pending</span>
                </div>
                <div className="stat-card danger">
                    <span className="stat-value">{loading ? '...' : stats.materialDefect}</span>
                    <span className="stat-label">Material Defect</span>
                </div>
                <Link to="/vendor-scorecard" className="stat-card link">
                    <span className="stat-icon">📊</span>
                    <span className="stat-label">Lihat Vendor Scorecard →</span>
                </Link>
            </div>

            {/* Filter */}
            <div className="filter-bar">
                <span className="filter-label">Status:</span>
                {['all', 'new', 'received', 'inspection', 'decided', 'closed'].map(status => (
                    <button
                        key={status}
                        className={`filter-btn ${filterStatus === status ? 'active' : ''}`}
                        onClick={() => setFilterStatus(status)}
                    >
                        {status === 'all' ? 'Semua' : statusConfig[status]?.label}
                    </button>
                ))}
            </div>

            {/* Ticket List */}
            <Card title="Daftar Tiket RMA">
                {loading ? (
                    <div className="loading-state">Mengambil data tiket...</div>
                ) : tickets.length === 0 ? (
                    <div className="empty-state">Belum ada tiket RMA.</div>
                ) : (
                    <div className="ticket-list">
                        {tickets.map(ticket => (
                            <div key={ticket.id} className="ticket-item" onClick={() => handleViewDetail(ticket)}>
                                <div className="ticket-header">
                                    <span className="ticket-id">{ticket.id}</span>
                                    <StatusBadge
                                        status={statusConfig[ticket.status]?.color}
                                        size="sm"
                                    />
                                </div>
                                <div className="ticket-body">
                                    <div className="ticket-info">
                                        <span className="info-client">{ticket.client}</span>
                                        <span className="info-item">{ticket.item} × {ticket.qty}</span>
                                        <span className="info-date">{ticket.createdAt}</span>
                                    </div>
                                    {ticket.rootCause && (
                                        <div className={`root-cause-badge ${ticket.rootCause}`}>
                                            {rootCauseOptions.find(r => r.id === ticket.rootCause)?.icon}{' '}
                                            {rootCauseOptions.find(r => r.id === ticket.rootCause)?.label.split('(')[0]}
                                        </div>
                                    )}
                                </div>
                                {ticket.rootCause === 'material_defect' && (
                                    <div className="vendor-alert">
                                        ⚠️ Vendor: {ticket.supplier} (-5 poin)
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </Card>

            {/* Create RMA Modal */}
            <Modal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                title="Buat Tiket RMA Baru"
                size="lg"
            >
                <div className="create-rma-form">
                    {/* Step 1: Client & Item */}
                    <div className="form-section">
                        <h4>1. Info Klien & Barang</h4>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Klien</label>
                                <select
                                    value={newTicket.client}
                                    onChange={(e) => setNewTicket(prev => ({ ...prev, client: e.target.value }))}
                                >
                                    <option value="">Pilih Klien</option>
                                    <option value="PT. PAMA PERSADA">PT. PAMA PERSADA</option>
                                    <option value="PT. ADARO ENERGY">PT. ADARO ENERGY</option>
                                    <option value="Bengkel Jaya Motor">Bengkel Jaya Motor</option>
                                    <option value="CUSTOMER LAIN">Lainnya (Tulis Manual)</option>
                                </select>
                                {newTicket.client === 'CUSTOMER LAIN' && (
                                    <input
                                        type="text"
                                        placeholder="Nama Klien"
                                        onChange={(e) => setNewTicket(prev => ({ ...prev, client: e.target.value }))}
                                        style={{ marginTop: 5 }}
                                    />
                                )}
                            </div>
                            <div className="form-group">
                                <label>No. Invoice</label>
                                <input
                                    type="text"
                                    placeholder="INV-2024-XXX"
                                    value={newTicket.invoice}
                                    onChange={(e) => setNewTicket(prev => ({ ...prev, invoice: e.target.value }))}
                                />
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group flex-2">
                                <label>Barang</label>
                                <input
                                    type="text"
                                    placeholder="Nama produk yang diretur"
                                    value={newTicket.item}
                                    onChange={(e) => setNewTicket(prev => ({ ...prev, item: e.target.value }))}
                                />
                            </div>
                            <div className="form-group">
                                <label>Qty</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={newTicket.qty}
                                    onChange={(e) => setNewTicket(prev => ({ ...prev, qty: parseInt(e.target.value) }))}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Step 2: Photo (placeholder) */}
                    <div className="form-section">
                        <h4>2. Bukti Fisik (Foto)</h4>
                        <div className="photo-upload-zone">
                            <span className="upload-icon">📷</span>
                            <span>Klik untuk upload foto barang rusak</span>
                        </div>
                    </div>

                    {/* Step 3: Root Cause */}
                    <div className="form-section">
                        <h4>3. Root Cause Analysis</h4>
                        <p className="section-desc">Kenapa rusak?</p>
                        <div className="root-cause-options">
                            {rootCauseOptions.map(option => (
                                <label
                                    key={option.id}
                                    className={`cause-option ${newTicket.rootCause === option.id ? 'selected' : ''} ${option.type}`}
                                >
                                    <input
                                        type="radio"
                                        name="rootCause"
                                        value={option.id}
                                        checked={newTicket.rootCause === option.id}
                                        onChange={() => setNewTicket(prev => ({ ...prev, rootCause: option.id }))}
                                    />
                                    <span className="cause-icon">{option.icon}</span>
                                    <span className="cause-label">{option.label}</span>
                                </label>
                            ))}
                        </div>

                        {newTicket.rootCause === 'material_defect' && (
                            <div className="supplier-auto">
                                <label>Supplier Asal (Otomatis dari Batch):</label>
                                <select
                                    value={newTicket.supplier}
                                    onChange={(e) => setNewTicket(prev => ({ ...prev, supplier: e.target.value }))}
                                >
                                    <option value="">Pilih Supplier</option>
                                    <option value="GATES">GATES</option>
                                    <option value="EATON">EATON</option>
                                    <option value="PARKER">PARKER</option>
                                    <option value="SUPPLIER MURAH JAYA">SUPPLIER MURAH JAYA</option>
                                </select>
                                <span className="vendor-warning">⚠️ Skor vendor akan dikurangi -5 poin</span>
                            </div>
                        )}
                    </div>

                    {/* Step 4: Solution */}
                    <div className="form-section">
                        <h4>4. Solusi yang Diajukan</h4>
                        <div className="solution-options">
                            {solutionOptions.map(option => (
                                <button
                                    key={option.id}
                                    className={`solution-btn ${newTicket.solution === option.id ? 'selected' : ''}`}
                                    onClick={() => setNewTicket(prev => ({ ...prev, solution: option.id }))}
                                >
                                    <span>{option.icon}</span>
                                    <span>{option.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="form-actions">
                        <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
                            Batal
                        </Button>
                        <Button variant="primary" onClick={handleCreateTicket}>
                            Submit Tiket & Update Stok
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Detail Modal */}
            <Modal
                isOpen={showDetailModal}
                onClose={() => setShowDetailModal(false)}
                title={`Detail ${selectedTicket?.id}`}
                size="md"
            >
                {selectedTicket && (
                    <div className="ticket-detail">
                        {/* Progress Steps */}
                        <div className="progress-tracker">
                            {Object.entries(statusConfig).map(([key, config], index) => (
                                <div
                                    key={key}
                                    className={`progress-step ${config.step <= statusConfig[selectedTicket.status].step ? 'completed' : ''}`}
                                >
                                    <span className="step-dot">{config.step}</span>
                                    <span className="step-label">{config.label}</span>
                                </div>
                            ))}
                        </div>

                        <div className="detail-section">
                            <h4>Info Klien</h4>
                            <p><strong>Klien:</strong> {selectedTicket.client}</p>
                            <p><strong>Invoice:</strong> {selectedTicket.invoice}</p>
                            <p><strong>Barang:</strong> {selectedTicket.item} × {selectedTicket.qty}</p>
                        </div>

                        {selectedTicket.rootCause && (
                            <div className="detail-section">
                                <h4>Root Cause</h4>
                                <div className={`root-cause-display ${selectedTicket.rootCause}`}>
                                    {rootCauseOptions.find(r => r.id === selectedTicket.rootCause)?.icon}{' '}
                                    {rootCauseOptions.find(r => r.id === selectedTicket.rootCause)?.label}
                                </div>
                                {selectedTicket.rootCause === 'material_defect' && (
                                    <p className="vendor-impact">⚠️ Supplier {selectedTicket.supplier} dikurangi -5 poin</p>
                                )}
                            </div>
                        )}

                        {selectedTicket.solution && (
                            <div className="detail-section">
                                <h4>Solusi</h4>
                                <p>{solutionOptions.find(s => s.id === selectedTicket.solution)?.icon} {solutionOptions.find(s => s.id === selectedTicket.solution)?.label}</p>
                            </div>
                        )}

                        <div className="detail-actions">
                            {selectedTicket.status === 'new' && (
                                <Button variant="warning" onClick={() => handleUpdateStatus(selectedTicket.id, 'received')}>
                                    ✅ Barang Diterima
                                </Button>
                            )}
                            {selectedTicket.status === 'received' && (
                                <Button variant="warning" onClick={() => handleUpdateStatus(selectedTicket.id, 'inspection')}>
                                    🔍 Mulai Inspeksi
                                </Button>
                            )}
                            {selectedTicket.status === 'inspection' && (
                                <Button variant="success" onClick={() => handleUpdateStatus(selectedTicket.id, 'decided')}>
                                    ✅ Approve Solusi
                                </Button>
                            )}
                            {selectedTicket.status === 'decided' && (
                                <Button variant="success" onClick={() => handleUpdateStatus(selectedTicket.id, 'closed')}>
                                    📦 Eksekusi & Tutup
                                </Button>
                            )}
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
