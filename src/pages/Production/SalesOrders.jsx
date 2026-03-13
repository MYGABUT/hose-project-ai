import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/common/Card/Card';
import Button from '../../components/common/Button/Button';
import { getSalesOrders, confirmSalesOrder, createJobFromSO } from '../../services/productionApi';
import RelationshipMap from '../../components/features/RelationshipMap/RelationshipMap';
import PrintableDocument from '../../components/common/PrintableDocument/PrintableDocument';
import api from '../../services/api';
import './Production.css';

const API_BASE_URL = import.meta.env.VITE_AI_API_URL || "";

const STATUS_BADGES = {
    DRAFT: { label: 'Draft', color: 'gray' },
    CONFIRMED: { label: 'Confirmed', color: 'blue' },
    PARTIAL_JO: { label: 'Partial JO', color: 'orange' },
    FULL_JO: { label: 'In Production', color: 'purple' },
    PARTIAL_DELIVERED: { label: 'Partial Shipped', color: 'teal' },
    COMPLETED: { label: 'Completed', color: 'green' },
    CANCELLED: { label: 'Cancelled', color: 'red' },
};

const PAYMENT_BADGES = {
    UNPAID: { label: 'Belum Bayar', color: 'red' },
    PARTIAL: { label: 'Bayar Sebagian', color: 'orange' },
    PAID: { label: 'Lunas', color: 'green' },
};

export default function SalesOrders() {
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [actionLoading, setActionLoading] = useState(null);

    // Payment Modal
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentLoading, setPaymentLoading] = useState(false);

    // Relationship Map Modal
    const [showMapModal, setShowMapModal] = useState(false);
    const [mapEntity, setMapEntity] = useState({ type: null, id: null });

    useEffect(() => {
        loadOrders();
    }, [filter]);

    const loadOrders = async () => {
        setLoading(true);
        const params = {};
        if (filter !== 'all') params.status = filter;

        const result = await getSalesOrders(params);
        if (result.status === 'success') {
            setOrders(result.data);
        }
        setLoading(false);
    };

    const handleConfirm = async (soId) => {
        setActionLoading(soId);
        const result = await confirmSalesOrder(soId);
        if (result.status === 'success') {
            loadOrders();
        } else {
            alert(result.message);
        }
        setActionLoading(null);
    };

    const handleCreateJO = async (soId) => {
        setActionLoading(soId);
        const result = await createJobFromSO(soId);
        if (result.status === 'success') {
            alert(`JO ${result.data.jo_number} berhasil dibuat!`);
            navigate('/production/job-orders');
        } else {
            alert(result.message);
        }
        setActionLoading(null);
    };

    const handleOpenPayment = (order) => {
        setSelectedOrder(order);
        setPaymentAmount('');
        setShowPaymentModal(true);
    };

    const handleOpenMap = (order) => {
        setMapEntity({ type: 'so', id: order.id });
        setShowMapModal(true);
    };

    const handleCancelOrder = async (order) => {
        if (!window.confirm(`Batalkan SO ${order.so_number}? Semua JO terkait juga akan dibatalkan.`)) return;
        setActionLoading(order.id);
        try {
            await api.post(`/so/${order.id}/cancel?reason_lost=Dibatalkan+manual&cancelled_by=Admin`);
            loadOrders();
        } catch (err) {
            alert('Gagal membatalkan SO: ' + (err?.response?.data?.detail || err.message));
        }
        setActionLoading(null);
    };

    const handlePrintSO = (order) => {
        setSelectedOrder(order);
        setTimeout(() => window.print(), 300);
    };

    const handleRecordPayment = async () => {
        if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
            alert('Masukkan jumlah pembayaran yang valid');
            return;
        }

        setPaymentLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/so/${selectedOrder.id}/payment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: parseFloat(paymentAmount) })
            });
            const data = await res.json();

            if (data.status === 'success') {
                alert(`✅ ${data.message}`);
                setShowPaymentModal(false);
                loadOrders();
            } else {
                alert(data.detail || data.message || 'Gagal mencatat pembayaran');
            }
        } catch (err) {
            alert('Error: ' + err.message);
        }
        setPaymentLoading(false);
    };

    const getStatusBadge = (status) => {
        const badge = STATUS_BADGES[status] || { label: status, color: 'gray' };
        return <span className={`status-badge ${badge.color}`}>{badge.label}</span>;
    };

    const getPaymentBadge = (status) => {
        const badge = PAYMENT_BADGES[status] || { label: status || 'UNPAID', color: 'gray' };
        return <span className={`payment-badge ${badge.color}`}>{badge.label}</span>;
    };

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value || 0);
    };

    const getProgressBar = (produced, ordered) => {
        const percent = ordered > 0 ? Math.round((produced / ordered) * 100) : 0;
        return (
            <div className="progress-bar-container">
                <div className="progress-bar" style={{ width: `${percent}%` }}></div>
                <span className="progress-text">{produced}/{ordered}</span>
            </div>
        );
    };

    return (
        <div className="production-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">📋 Sales Orders</h1>
                    <p className="page-subtitle">Daftar pesanan customer</p>
                </div>
                <div className="header-actions">
                    <Button
                        variant="secondary"
                        onClick={() => navigate('/finance/aging')}
                    >
                        💳 Piutang
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={() => navigate('/production/blanket-orders')}
                    >
                        📋 Blanket Order
                    </Button>
                    <Button
                        variant="primary"
                        onClick={() => navigate('/production/new-order')}
                        icon={<span>➕</span>}
                    >
                        Buat SO Baru
                    </Button>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="filter-tabs">
                {[
                    { key: 'all', label: 'Semua' },
                    { key: 'DRAFT', label: 'Draft' },
                    { key: 'CONFIRMED', label: 'Confirmed' },
                    { key: 'PARTIAL_JO', label: 'In Progress' },
                    { key: 'COMPLETED', label: 'Completed' },
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
                        <h3>Belum ada Sales Order</h3>
                        <p>Klik "Buat SO Baru" untuk memulai</p>
                    </div>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>SO Number</th>
                                <th>Customer</th>
                                <th>Tanggal</th>
                                <th>Total</th>
                                <th>Pembayaran</th>
                                <th>Progress</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.map(order => (
                                <tr key={order.id}>
                                    <td className="so-number">{order.so_number}</td>
                                    <td>{order.customer_name}</td>
                                    <td>{order.order_date ? new Date(order.order_date).toLocaleDateString('id-ID') : '-'}</td>
                                    <td className="amount-cell">{formatCurrency(order.total)}</td>
                                    <td>
                                        <div className="payment-cell">
                                            {getPaymentBadge(order.payment_status)}
                                            {order.payment_status !== 'PAID' && order.total > 0 && (
                                                <button
                                                    className="payment-btn"
                                                    onClick={() => handleOpenPayment(order)}
                                                    title="Catat pembayaran"
                                                >
                                                    💳
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                    <td>{getProgressBar(order.qty_produced, order.qty_ordered)}</td>
                                    <td>{getStatusBadge(order.status)}</td>
                                    <td className="actions-cell">
                                        {order.status === 'DRAFT' && (
                                            <Button
                                                variant="success"
                                                size="sm"
                                                onClick={() => handleConfirm(order.id)}
                                                loading={actionLoading === order.id}
                                            >
                                                ✓ Confirm
                                            </Button>
                                        )}
                                        {order.status === 'CONFIRMED' && (
                                            <Button
                                                variant="primary"
                                                size="sm"
                                                onClick={() => handleCreateJO(order.id)}
                                                loading={actionLoading === order.id}
                                            >
                                                🔧 Create JO
                                            </Button>
                                        )}
                                        {['PARTIAL_JO', 'FULL_JO'].includes(order.status) && (
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                onClick={() => navigate(`/production/job-orders?so=${order.id}`)}
                                            >
                                                👁️ View JO
                                            </Button>
                                        )}
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => handleOpenMap(order)}
                                        >
                                            🌐 Trace
                                        </Button>
                                        {!['CANCELLED', 'COMPLETED'].includes(order.status) && (
                                            <Button
                                                variant="danger"
                                                size="sm"
                                                onClick={() => handleCancelOrder(order)}
                                                loading={actionLoading === order.id}
                                            >
                                                ❌ Cancel
                                            </Button>
                                        )}
                                        <button
                                            className="print-btn"
                                            style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                                            onClick={() => handlePrintSO(order)}
                                        >
                                            🖨️ Print
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </Card>

            {/* Payment Modal */}
            {showPaymentModal && selectedOrder && (
                <div className="modal-overlay" onClick={() => setShowPaymentModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>💳 Catat Pembayaran</h3>
                            <button onClick={() => setShowPaymentModal(false)}>✕</button>
                        </div>
                        <div className="modal-body">
                            <div className="payment-info">
                                <div className="info-row">
                                    <span className="label">SO Number</span>
                                    <span className="value">{selectedOrder.so_number}</span>
                                </div>
                                <div className="info-row">
                                    <span className="label">Customer</span>
                                    <span className="value">{selectedOrder.customer_name}</span>
                                </div>
                                <div className="info-row">
                                    <span className="label">Total Tagihan</span>
                                    <span className="value amount">{formatCurrency(selectedOrder.total)}</span>
                                </div>
                                <div className="info-row">
                                    <span className="label">Sudah Dibayar</span>
                                    <span className="value">{formatCurrency(selectedOrder.amount_paid || 0)}</span>
                                </div>
                                <div className="info-row highlight">
                                    <span className="label">Sisa Tagihan</span>
                                    <span className="value amount-due">
                                        {formatCurrency((selectedOrder.total || 0) - (selectedOrder.amount_paid || 0))}
                                    </span>
                                </div>
                            </div>

                            {/* DP Button Section */}
                            {selectedOrder.amount_paid == 0 && !selectedOrder.dp_amount && (
                                <div style={{ marginBottom: '16px', padding: '12px', background: '#e0f2fe', borderRadius: '8px', border: '1px solid #bae6fd' }}>
                                    <strong>🌟 Project - Uang Muka (DP)</strong>
                                    <p style={{ fontSize: '12px', color: '#0369a1', margin: '4px 0 8px' }}>
                                        Buat Invoice DP khusus untuk order ini. Invoice akan terbit otomatis.
                                    </p>
                                    <Button
                                        size="sm"
                                        variant="primary"
                                        onClick={async () => {
                                            if (!paymentAmount) return alert('Isi jumlah DP dulu');
                                            if (!window.confirm('Buat Invoice Uang Muka (DP)?')) return;

                                            setPaymentLoading(true);
                                            try {
                                                const res = await fetch(`${API_BASE_URL}/api/v1/so/${selectedOrder.id}/create-dp?amount=${paymentAmount}`, { method: 'POST' });
                                                const d = await res.json();
                                                if (d.status === 'success') {
                                                    alert('✅ Invoice DP Berhasil Dibuat!');
                                                    setShowPaymentModal(false);
                                                    loadOrders();
                                                } else {
                                                    alert(d.detail);
                                                }
                                            } catch (e) { alert(e.message); }
                                            setPaymentLoading(false);
                                        }}
                                    >
                                        💰 Buat Faktur DP
                                    </Button>
                                    <hr style={{ margin: '12px 0', border: 'none', borderTop: '1px dashed #93c5fd' }} />
                                </div>
                            )}

                            <div className="form-group">
                                <label>Jumlah Pembayaran (Rp)</label>
                                <input
                                    type="number"
                                    min="0"
                                    max={(selectedOrder.total || 0) - (selectedOrder.amount_paid || 0)}
                                    value={paymentAmount}
                                    onChange={(e) => setPaymentAmount(e.target.value)}
                                    placeholder="Masukkan jumlah..."
                                    autoFocus
                                />
                            </div>

                            <div className="quick-amounts">
                                <button
                                    type="button"
                                    onClick={() => setPaymentAmount(((selectedOrder.total || 0) - (selectedOrder.amount_paid || 0)).toString())}
                                >
                                    Bayar Lunas
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPaymentAmount((((selectedOrder.total || 0) - (selectedOrder.amount_paid || 0)) / 2).toString())}
                                >
                                    Bayar 50%
                                </button>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <Button variant="secondary" onClick={() => setShowPaymentModal(false)}>
                                Batal
                            </Button>
                            <Button
                                variant="success"
                                onClick={handleRecordPayment}
                                disabled={paymentLoading || !paymentAmount}
                            >
                                {paymentLoading ? 'Menyimpan...' : '✓ Simpan Pembayaran'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Relationship Map Modal */}
            {showMapModal && (
                <div className="modal-overlay" onClick={() => setShowMapModal(false)}>
                    <div className="modal-content" style={{ maxWidth: '900px', width: '90vw' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>🌐 Traceability: Document Relationship Map</h3>
                            <button onClick={() => setShowMapModal(false)}>✕</button>
                        </div>
                        <div className="modal-body" style={{ padding: '0' }}>
                            <RelationshipMap entityType={mapEntity.type} entityId={mapEntity.id} />
                        </div>
                    </div>
                </div>
            )}
            {/* Printable Document (hidden on screen, shown on print) */}
            {selectedOrder && (
                <PrintableDocument
                    docType="SALES ORDER"
                    docNumber={selectedOrder.so_number}
                    docDate={selectedOrder.order_date ? new Date(selectedOrder.order_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : '-'}
                    customerName={selectedOrder.customer_name}
                    customerInfo={{ phone: selectedOrder.customer_phone, address: selectedOrder.customer_address }}
                    lines={selectedOrder.lines || []}
                    subtotal={selectedOrder.subtotal || selectedOrder.total || 0}
                    tax={selectedOrder.tax || 0}
                    total={selectedOrder.total || 0}
                    notes={selectedOrder.notes || ''}
                />
            )}
        </div>
    );
}
