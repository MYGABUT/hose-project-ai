/**
 * Invoice List Page - View and manage invoices
 * Create from SO, view details, record payments
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/common/Card/Card';
import Button from '../../components/common/Button/Button';
import StatusBadge from '../../components/common/Badge/StatusBadge';
import Modal from '../../components/common/Modal/Modal';
import './Finance.css';

const API_BASE_URL = import.meta.env.VITE_AI_API_URL || "";

export default function InvoiceList() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [invoices, setInvoices] = useState([]);
    const [summary, setSummary] = useState(null);
    const [filter, setFilter] = useState('ALL');
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [paymentAmount, setPaymentAmount] = useState(0);
    // DO Modal State
    const [showDOModal, setShowDOModal] = useState(false);
    const [pendingDOs, setPendingDOs] = useState([]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [invRes, sumRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/v1/invoices`),
                fetch(`${API_BASE_URL}/api/v1/invoices/summary`)
            ]);
            const invData = await invRes.json();
            const sumData = await sumRes.json();

            if (invData.status === 'success') setInvoices(invData.data || []);
            if (sumData.status === 'success') setSummary(sumData.data);
        } catch (err) {
            console.error('Error loading invoices:', err);
        }
        setLoading(false);
    };

    const openPaymentModal = (inv) => {
        setSelectedInvoice(inv);
        setPaymentAmount(inv.amount_due);
        setShowPaymentModal(true);
    };

    const recordPayment = async () => {
        if (paymentAmount <= 0) return;

        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/invoices/${selectedInvoice.id}/payment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: paymentAmount })
            });
            const data = await res.json();
            if (data.status === 'success') {
                setShowPaymentModal(false);
                loadData();
            }
        } catch (err) {
            console.error('Error recording payment:', err);
        }
    };

    const openDOModal = async () => {
        setLoading(true);
        try {
            // Fetch DELIVERED DOs
            const res = await fetch(`${API_BASE_URL}/api/v1/do?status=DELIVERED`);
            const data = await res.json();
            if (data.status === 'success') {
                setPendingDOs(data.data || []);
                setShowDOModal(true);
            }
        } catch (err) {
            console.error('Error fetching DOs:', err);
            alert('Gagal mengambil data Surat Jalan');
        }
        setLoading(false);
    };

    const handleCreateFromDO = async (doId) => {
        if (!confirm('Buat Invoice untuk Surat Jalan ini?')) return;

        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/invoices/from-do/${doId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ due_days: 30, include_tax: true })
            });
            const data = await res.json();

            if (res.ok) {
                alert('Invoice berhasil dibuat!');
                setShowDOModal(false);
                loadData(); // Refresh list
            } else {
                alert(`Gagal: ${data.detail || 'Terjadi kesalahan'}`);
            }
        } catch (err) {
            console.error('Error creating invoice:', err);
            alert('Terjadi kesalahan koneksi');
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(amount || 0);
    };

    const getStatusBadge = (status) => {
        const map = {
            'DRAFT': 'default',
            'SENT': 'info',
            'PAID': 'success',
            'CANCELLED': 'danger'
        };
        return <StatusBadge status={map[status] || 'default'}>{status}</StatusBadge>;
    };

    const getPaymentBadge = (status) => {
        const map = {
            'UNPAID': 'danger',
            'PARTIAL': 'warning',
            'PAID': 'success'
        };
        return <StatusBadge status={map[status] || 'default'}>{status}</StatusBadge>;
    };

    const filteredInvoices = filter === 'ALL'
        ? invoices
        : invoices.filter(inv => inv.payment_status === filter);

    return (
        <div className="finance-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">🧾 Invoice</h1>
                    <p className="page-subtitle">Faktur penjualan ke customer</p>
                </div>
                <div className="header-actions">
                    <Button variant="secondary" onClick={loadData}>🔄 Refresh</Button>
                    <Button variant="secondary" onClick={() => navigate('/production/sales-orders')}>
                        ➕ Buat dari SO
                    </Button>
                    <Button variant="primary" onClick={openDOModal}>
                        🚚 Buat dari Surat Jalan
                    </Button>
                </div>
            </div>

            {/* ... Summary Cards ... */}

            {summary && (
                <div className="summary-grid">
                    {/* ... existing summary cards ... */}
                    <Card className="summary-card total">
                        <div className="summary-icon">🧾</div>
                        <div className="summary-content">
                            <span className="summary-value">{summary.total_invoices}</span>
                            <span className="summary-label">Total Invoice</span>
                        </div>
                    </Card>
                    <Card className="summary-card warning">
                        <div className="summary-icon">💰</div>
                        <div className="summary-content">
                            <span className="summary-value">{formatCurrency(summary.total_outstanding)}</span>
                            <span className="summary-label">Total Outstanding</span>
                        </div>
                    </Card>
                    <Card className="summary-card alert">
                        <div className="summary-icon">⚠️</div>
                        <div className="summary-content">
                            <span className="summary-value">{formatCurrency(summary.overdue_amount)}</span>
                            <span className="summary-label">Overdue ({summary.overdue_count})</span>
                        </div>
                    </Card>
                    <Card className="summary-card success">
                        <div className="summary-icon">✅</div>
                        <div className="summary-content">
                            <span className="summary-value">{formatCurrency(summary.total_paid)}</span>
                            <span className="summary-label">Total Dibayar</span>
                        </div>
                    </Card>
                </div>
            )}

            {/* Filter Tabs */}
            <div className="filter-tabs">
                {['ALL', 'UNPAID', 'PARTIAL', 'PAID'].map(status => (
                    <button
                        key={status}
                        className={`filter-tab ${filter === status ? 'active' : ''}`}
                        onClick={() => setFilter(status)}
                    >
                        {status === 'ALL' ? 'Semua' : status}
                    </button>
                ))}
            </div>

            {/* Invoice List */}
            <div className="invoice-list">
                {loading && !showDOModal ? (
                    <div className="loading-state">Memuat invoice...</div>
                ) : filteredInvoices.length === 0 ? (
                    <Card className="empty-state">
                        <p>Belum ada invoice</p>
                    </Card>
                ) : (
                    filteredInvoices.map(inv => (
                        <Card key={inv.id} className={`invoice-card ${inv.is_overdue ? 'overdue' : ''}`}>
                            <div className="invoice-header">
                                <div className="invoice-number">{inv.invoice_number}</div>
                                {getStatusBadge(inv.status)}
                                {getPaymentBadge(inv.payment_status)}
                            </div>
                            <div className="invoice-body">
                                <div className="invoice-info">
                                    <span className="info-label">Customer</span>
                                    <span className="info-value">{inv.customer_name}</span>
                                </div>
                                <div className="invoice-info">
                                    <span className="info-label">Tgl Invoice</span>
                                    <span className="info-value">{inv.invoice_date}</span>
                                </div>
                                <div className="invoice-info">
                                    <span className="info-label">Jatuh Tempo</span>
                                    <span className={`info-value ${inv.is_overdue ? 'overdue-text' : ''}`}>
                                        {inv.due_date} {inv.is_overdue && '⚠️'}
                                    </span>
                                </div>
                                <div className="invoice-info">
                                    <span className="info-label">Total</span>
                                    <span className="info-value amount">{formatCurrency(inv.total)}</span>
                                </div>
                            </div>
                            <div className="invoice-footer">
                                <div className="payment-info">
                                    <span>Dibayar: {formatCurrency(inv.amount_paid)}</span>
                                    <span className="amount-due">Sisa: {formatCurrency(inv.amount_due)}</span>
                                </div>
                                {inv.payment_status !== 'PAID' && (
                                    <Button
                                        size="sm"
                                        variant="success"
                                        onClick={() => openPaymentModal(inv)}
                                    >
                                        💰 Bayar
                                    </Button>
                                )}
                            </div>
                        </Card>
                    ))
                )}
            </div>

            {/* Payment Modal */}
            {showPaymentModal && selectedInvoice && (
                <Modal
                    isOpen={showPaymentModal}
                    onClose={() => setShowPaymentModal(false)}
                    title={`Pembayaran ${selectedInvoice.invoice_number}`}
                    size="small"
                >
                    <div className="payment-form">
                        <div className="payment-summary">
                            <p>Total Invoice: <strong>{formatCurrency(selectedInvoice.total)}</strong></p>
                            <p>Sudah Dibayar: <strong>{formatCurrency(selectedInvoice.amount_paid)}</strong></p>
                            <p>Sisa Tagihan: <strong className="amount-due">{formatCurrency(selectedInvoice.amount_due)}</strong></p>
                        </div>
                        <div className="form-group">
                            <label>Jumlah Pembayaran</label>
                            <input
                                type="number"
                                value={paymentAmount}
                                onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                            />
                        </div>
                        <div className="quick-amounts">
                            <Button size="sm" variant="secondary" onClick={() => setPaymentAmount(selectedInvoice.amount_due)}>
                                Lunas
                            </Button>
                            <Button size="sm" variant="secondary" onClick={() => setPaymentAmount(selectedInvoice.amount_due / 2)}>
                                50%
                            </Button>
                        </div>
                        <div className="modal-actions">
                            <Button variant="secondary" onClick={() => setShowPaymentModal(false)}>Batal</Button>
                            <Button variant="success" onClick={recordPayment}>💰 Konfirmasi Bayar</Button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Create from DO Modal */}
            <Modal
                isOpen={showDOModal}
                onClose={() => setShowDOModal(false)}
                title="Pilih Surat Jalan (Delivery Order)"
                size="lg"
            >
                <div className="do-selection-list">
                    {pendingDOs.length === 0 ? (
                        <p className="no-data">Tidak ada Surat Jalan status DELIVERED yang belum diproses.</p>
                    ) : (
                        pendingDOs.map(doItem => (
                            <div key={doItem.id} className="do-item-card">
                                <div className="do-info">
                                    <strong>{doItem.do_number}</strong>
                                    <span>Customer: {doItem.customer_name}</span>
                                    <span>Tgl: {new Date(doItem.created_at).toLocaleDateString()}</span>
                                </div>
                                <Button size="sm" variant="primary" onClick={() => handleCreateFromDO(doItem.id)}>
                                    🧾 Buat Invoice
                                </Button>
                            </div>
                        ))
                    )}
                </div>
            </Modal>
        </div>
    );
}
