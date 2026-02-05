
import { useState, useEffect } from 'react';
import { useAuth, ROLES } from '../../contexts/AuthContext';
import Card from '../../components/common/Card/Card';
import Button from '../../components/common/Button/Button';
import Modal from '../../components/common/Modal/Modal';
import AlertBox from '../../components/common/Alert/AlertBox';
import StatusBadge from '../../components/common/Badge/StatusBadge';
import './ManagerDashboard.css';

// Roles yang diizinkan mengakses Manager Dashboard
const ALLOWED_ROLES = [ROLES.SUPER_ADMIN, ROLES.MANAGER, ROLES.SALES_MANAGER];

// Mock pending approvals
const initialApprovals = [
    {
        id: 'QT-2024-002',
        type: 'quotation',
        client: 'PT. PAMA PERSADA',
        sales: 'Budi',
        total: 4200000,
        margin: -8,
        discount: 25,
        reason: 'Klien minta diskon tambahan karena order besar 50 unit',
        createdAt: '2024-01-14 09:15',
        items: 5
    },
    {
        id: 'QT-2024-006',
        type: 'quotation',
        client: 'PT. BERAU COAL',
        sales: 'Ahmad',
        total: 1200000,
        margin: 5,
        discount: 22,
        reason: 'Repeat order, minta harga sama seperti bulan lalu',
        createdAt: '2024-01-14 11:30',
        items: 2
    },
    {
        id: 'PRICE-001',
        type: 'price_change',
        category: 'Hydraulic Hose',
        brand: 'EATON',
        itemCount: 45,
        adjustment: '+5%',
        admin: 'Siti',
        reason: 'Penyesuaian kurs dolar per 15 Jan',
        createdAt: '2024-01-14 08:00'
    }
];

// Mock price alerts
const priceAlerts = [
    {
        id: 'ALERT-001',
        message: 'Harga dasar EATON naik 5%',
        affectedQuotes: 3,
        timestamp: '2024-01-14 08:30'
    },
    {
        id: 'ALERT-002',
        message: 'Harga dasar GATES turun 2%',
        affectedQuotes: 1,
        timestamp: '2024-01-13 14:00'
    }
];

export default function ManagerDashboard() {
    const { user } = useAuth();
    const [approvals, setApprovals] = useState(initialApprovals);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [rejectReason, setRejectReason] = useState('');

    // Check if user has permission
    const hasAccess = user && ALLOWED_ROLES.includes(user.role);

    const [loading, setLoading] = useState(true);
    const [pendingQuotations, setPendingQuotations] = useState([]);
    const [pendingPriceChanges, setPendingPriceChanges] = useState([]);

    useEffect(() => {
        if (hasAccess) {
            loadApprovals();
        }
    }, [hasAccess]);

    const loadApprovals = async () => {
        setLoading(true);
        try {
            const { getSalesOrders } = await import('../../services/productionApi');
            // Fetch all draft orders
            const res = await getSalesOrders({ status: 'DRAFT' });
            if (res.status === 'success') {
                // Filter for orders that actually need approval (Low Margin)
                // In a real backend, this would be a specific query param like ?needs_approval=true
                // For now, we simulate by checking margin < 20% locally
                // Or just show ALL drafts for Manager to review? 
                const drafts = res.data || [];

                const needsApproval = drafts.map(so => ({
                    id: so.so_number || 'UNKNOWN',
                    dbId: so.id, // Keep database ID for API calls
                    type: 'quotation',
                    client: so.customer_name || 'Unknown Client',
                    sales: so.created_by || 'Sales', // API returns created_by
                    total: so.total || 0,
                    margin: 15, // Mock value as backend doesn't return margin yet
                    discount: 0, // Mock value as backend doesn't return discount yet
                    reason: so.notes || 'No notes',
                    createdAt: so.created_at ? new Date(so.created_at).toLocaleString() : '-',
                    // IMPORTANT: to_dict_simple returns 'line_count', not 'lines' array
                    items: so.line_count || 0
                }));

                setPendingQuotations(needsApproval);
            }
        } catch (err) {
            console.error('Error loading approvals:', err);
        }
        setLoading(false);
    };

    const handleApprove = async (item) => {
        try {
            const { confirmSalesOrder } = await import('../../services/productionApi');
            await confirmSalesOrder(item.dbId);

            setPendingQuotations(prev => prev.filter(a => a.id !== item.id));
            setShowDetailModal(false);
            alert(`✅ ${item.id} telah di-APPROVE!`);
        } catch (err) {
            alert('Gagal approve: ' + err.message);
        }
    };

    const handleRejectConfirm = async () => {
        if (!rejectReason.trim()) {
            alert('Mohon isi alasan penolakan!');
            return;
        }

        try {
            const { cancelSalesOrder } = await import('../../services/productionApi');
            await cancelSalesOrder(selectedItem.dbId, rejectReason);

            setPendingQuotations(prev => prev.filter(a => a.id !== selectedItem.id));
            setShowRejectModal(false);
            setShowDetailModal(false);
            setRejectReason('');
            alert(`❌ ${selectedItem.id} telah di-REJECT!`);
        } catch (err) {
            alert('Gagal reject: ' + err.message);
        }
    };

    // If no access, show access denied page
    if (!hasAccess) {
        return (
            <div className="manager-dashboard">
                <div className="access-denied">
                    <div className="denied-icon">🔒</div>
                    <h2>Akses Ditolak</h2>
                    <p>Halaman <strong>Manager Approval</strong> hanya dapat diakses oleh:</p>
                    <ul>
                        <li>👑 Super Admin</li>
                        <li>🎯 Manager</li>
                        <li>💼 Sales Manager</li>
                    </ul>
                    <p className="current-role">
                        Role Anda saat ini: <span className="role-badge-inline">{user?.roleConfig?.icon} {user?.roleConfig?.label}</span>
                    </p>
                    <p className="hint">Hubungi Manager atau Super Admin jika Anda memerlukan akses ke halaman ini.</p>
                </div>
            </div>
        );
    }

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(value || 0);
    };

    const handleViewDetail = (item) => {
        setSelectedItem(item);
        setShowDetailModal(true);
    };

    const handleRejectClick = (item) => {
        setSelectedItem(item);
        setShowRejectModal(true);
    };

    return (
        <div className="manager-dashboard">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Manager Dashboard</h1>
                    <p className="page-subtitle">Approval Center & Price Alerts</p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="approval-stats">
                <div className="stat-card urgent">
                    <div className="stat-icon">⏳</div>
                    <div className="stat-info">
                        <span className="stat-value">{pendingQuotations.length}</span>
                        <span className="stat-label">Quotation Pending</span>
                    </div>
                </div>
                <div className="stat-card warning">
                    <div className="stat-icon">💰</div>
                    <div className="stat-info">
                        <span className="stat-value">{pendingPriceChanges.length}</span>
                        <span className="stat-label">Price Change Pending</span>
                    </div>
                </div>
                <div className="stat-card info">
                    <div className="stat-icon">🔔</div>
                    <div className="stat-info">
                        <span className="stat-value">{priceAlerts.length}</span>
                        <span className="stat-label">Price Alerts</span>
                    </div>
                </div>
            </div>

            {/* Price Alerts */}
            {priceAlerts.length > 0 && (
                <Card title="🔔 Price Alerts" subtitle="Perubahan harga yang mempengaruhi penawaran aktif">
                    <div className="price-alerts">
                        {priceAlerts.map(alert => (
                            <div key={alert.id} className="alert-item">
                                <div className="alert-icon">📊</div>
                                <div className="alert-content">
                                    <span className="alert-message">{alert.message}</span>
                                    <span className="alert-meta">
                                        {alert.affectedQuotes} draft penawaran terpengaruh • {alert.timestamp}
                                    </span>
                                </div>
                                <Button variant="secondary" size="sm">
                                    Lihat Draft
                                </Button>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {/* Pending Quotation Approvals */}
            <Card
                title="📋 Request Approval Quotation"
                subtitle={`${pendingQuotations.length} menunggu keputusan`}
                variant={pendingQuotations.length > 0 ? 'warning' : 'default'}
            >
                {loading ? (
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <p>Memuat data...</p>
                    </div>
                ) : pendingQuotations.length === 0 ? (
                    <div className="empty-state">
                        <span>✅ Tidak ada quotation yang perlu di-approve</span>
                    </div>
                ) : (
                    <div className="approval-list">
                        {pendingQuotations.map(item => (
                            <div key={item.id} className="approval-item">
                                <div className="approval-header">
                                    <span className="approval-id">{item.id}</span>
                                    <StatusBadge status="warning" size="sm" />
                                </div>

                                <div className="approval-body">
                                    <div className="approval-info">
                                        <div className="info-row">
                                            <span className="info-label">Klien:</span>
                                            <span className="info-value">{item.client}</span>
                                        </div>
                                        <div className="info-row">
                                            <span className="info-label">Sales:</span>
                                            <span className="info-value">{item.sales}</span>
                                        </div>
                                        <div className="info-row">
                                            <span className="info-label">Total:</span>
                                            <span className="info-value">{formatCurrency(item.total)}</span>
                                        </div>
                                    </div>

                                    <div className="approval-metrics">
                                        <div className={`metric margin-${item.margin < 0 ? 'danger' : item.margin < 15 ? 'warning' : 'ok'}`}>
                                            <span className="metric-value">{item.margin}%</span>
                                            <span className="metric-label">Margin</span>
                                        </div>
                                        <div className="metric discount">
                                            <span className="metric-value">-{item.discount}%</span>
                                            <span className="metric-label">Diskon</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="approval-reason">
                                    <span className="reason-label">Alasan Sales:</span>
                                    <span className="reason-text">"{item.reason}"</span>
                                </div>

                                <div className="approval-actions">
                                    <Button variant="secondary" size="sm" onClick={() => handleViewDetail(item)}>
                                        Detail
                                    </Button>
                                    <Button variant="danger" size="sm" onClick={() => handleRejectClick(item)}>
                                        Reject
                                    </Button>
                                    <Button variant="success" size="sm" onClick={() => handleApprove(item)}>
                                        Approve
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Card>

            {/* Pending Price Changes */}
            <Card
                title="💰 Request Approval Perubahan Harga"
                subtitle={`${pendingPriceChanges.length} menunggu keputusan`}
            >
                {pendingPriceChanges.length === 0 ? (
                    <div className="empty-state">
                        <span>✅ Tidak ada perubahan harga yang perlu di-approve</span>
                    </div>
                ) : (
                    <div className="approval-list">
                        {pendingPriceChanges.map(item => (
                            <div key={item.id} className="approval-item price-change">
                                <div className="approval-header">
                                    <span className="approval-id">{item.id}</span>
                                    <span className="change-badge">{item.adjustment}</span>
                                </div>

                                <div className="approval-body">
                                    <div className="approval-info">
                                        <div className="info-row">
                                            <span className="info-label">Kategori:</span>
                                            <span className="info-value">{item.category}</span>
                                        </div>
                                        <div className="info-row">
                                            <span className="info-label">Brand:</span>
                                            <span className="info-value">{item.brand}</span>
                                        </div>
                                        <div className="info-row">
                                            <span className="info-label">Jumlah Item:</span>
                                            <span className="info-value">{item.itemCount} produk</span>
                                        </div>
                                        <div className="info-row">
                                            <span className="info-label">Admin:</span>
                                            <span className="info-value">{item.admin}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="approval-reason">
                                    <span className="reason-label">Alasan:</span>
                                    <span className="reason-text">"{item.reason}"</span>
                                </div>

                                <div className="approval-actions">
                                    <Button variant="danger" size="sm" onClick={() => handleRejectClick(item)}>
                                        Reject
                                    </Button>
                                    <Button variant="success" size="sm" onClick={() => handleApprove(item)}>
                                        Approve
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Card>

            {/* Detail Modal */}
            <Modal
                isOpen={showDetailModal}
                onClose={() => setShowDetailModal(false)}
                title={`Detail ${selectedItem?.id}`}
                size="md"
            >
                {selectedItem && selectedItem.type === 'quotation' && (
                    <div className="detail-modal-content">
                        <div className="detail-section">
                            <h4>Informasi Klien</h4>
                            <p><strong>Klien:</strong> {selectedItem.client}</p>
                            <p><strong>Sales:</strong> {selectedItem.sales}</p>
                            <p><strong>Tanggal:</strong> {selectedItem.createdAt}</p>
                        </div>

                        <div className="detail-section">
                            <h4>Rincian Penawaran</h4>
                            <p><strong>Jumlah Item:</strong> {selectedItem.items} item</p>
                            <p><strong>Total Nilai:</strong> {formatCurrency(selectedItem.total)}</p>
                            <p><strong>Diskon:</strong> {selectedItem.discount}%</p>
                            <p><strong>Margin:</strong> <span className={selectedItem.margin < 0 ? 'text-danger' : 'text-success'}>{selectedItem.margin}%</span></p>
                        </div>

                        <AlertBox variant={selectedItem.margin < 0 ? 'danger' : 'warning'}>
                            <strong>Perhatian:</strong> {selectedItem.margin < 0
                                ? 'Penawaran ini RUGI! Margin negatif.'
                                : 'Diskon melebihi batas standar 20%.'}
                        </AlertBox>

                        <div className="detail-section">
                            <h4>Alasan Sales</h4>
                            <div className="reason-box">{selectedItem.reason}</div>
                        </div>

                        <div className="modal-actions">
                            <Button variant="danger" onClick={() => handleRejectClick(selectedItem)}>
                                Reject
                            </Button>
                            <Button variant="success" onClick={() => handleApprove(selectedItem)}>
                                Approve
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Reject Modal */}
            <Modal
                isOpen={showRejectModal}
                onClose={() => { setShowRejectModal(false); setRejectReason(''); }}
                title="Konfirmasi Penolakan"
                size="sm"
            >
                <div className="reject-modal-content">
                    <p>Anda akan menolak <strong>{selectedItem?.id}</strong></p>

                    <div className="reject-reason-input">
                        <label>Alasan Penolakan (Wajib):</label>
                        <textarea
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Contoh: Margin terlalu rendah, minta revisi harga..."
                            rows={3}
                        />
                    </div>

                    <div className="modal-actions">
                        <Button variant="secondary" onClick={() => { setShowRejectModal(false); setRejectReason(''); }}>
                            Batal
                        </Button>
                        <Button variant="danger" onClick={handleRejectConfirm}>
                            Konfirmasi Reject
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
