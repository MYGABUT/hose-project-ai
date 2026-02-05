/**
 * Product Loan Page - Pinjam Barang Management
 * Enterprise Grade Implementation
 */
import { useState, useEffect } from 'react';
import Card from '../../components/common/Card/Card';
import Button from '../../components/common/Button/Button';
import StatusBadge from '../../components/common/Badge/StatusBadge';
import Modal from '../../components/common/Modal/Modal';
import CreateLoanModal from '../../components/features/Loans/CreateLoanModal';
import loanApi from '../../services/loanApi';
import { useNotification } from '../../contexts/NotificationContext';
import '../Admin/Admin.css';

export default function ProductLoanPage() {
    const { addNotification } = useNotification();
    const [loading, setLoading] = useState(true);
    const [loans, setLoans] = useState([]);

    // Modals
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showReturnModal, setShowReturnModal] = useState(false);
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);

    // Selection state
    const [selectedLoan, setSelectedLoan] = useState(null);
    const [returnItems, setReturnItems] = useState({}); // {itemId: qty}
    const [invoiceItems, setInvoiceItems] = useState({}); // {itemId: {qty, price}}

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await loanApi.getAll();
            if (data) setLoans(data || []);
        } catch (err) {
            console.error('Error loading loans:', err);
        }
        setLoading(false);
    };

    const handleCreateLoan = async (data) => {
        await loanApi.create(data);
        loadData();
        addNotification("Sukses", "Pinjaman berhasil dibuat!", "success");
    };

    // --- Return Logic ---
    const handleReturnClick = (loan) => {
        setSelectedLoan(loan);
        setReturnItems({});
        setShowReturnModal(true);
    };

    const handleReturnSubmit = async () => {
        const items = Object.entries(returnItems)
            .filter(([_, qty]) => qty > 0)
            .map(([id, qty]) => ({ item_id: parseInt(id), qty: parseFloat(qty) }));

        if (items.length === 0) return;

        try {
            await loanApi.returnItems(selectedLoan.id, items);
            setShowReturnModal(false);
            setReturnItems({});
            loadData();
            addNotification("Sukses", "Barang berhasil dikembalikan", "success");
        } catch (err) {
            console.error('Error returning items:', err);
            addNotification("Gagal", err.message, "error");
        }
    };

    // --- Invoice Logic ---
    const handleInvoiceClick = (loan) => {
        setSelectedLoan(loan);
        // Initialize state with default values
        const initial = {};
        loan.items.forEach(i => {
            const outstanding = i.qty_loaned - i.qty_returned - i.qty_invoiced;
            if (outstanding > 0) {
                initial[i.id] = { qty: outstanding, price: 0 };
            }
        });
        setInvoiceItems(initial);
        setShowInvoiceModal(true);
    };

    const handleInvoiceSubmit = async () => {
        const items = Object.entries(invoiceItems)
            .filter(([_, val]) => val.qty > 0 && val.price > 0)
            .map(([id, val]) => ({
                item_id: parseInt(id),
                qty: parseFloat(val.qty),
                price: parseFloat(val.price)
            }));

        if (items.length === 0) {
            addNotification("Info", "Mohon isi Qty dan Harga untuk minimal 1 barang", "warning");
            return;
        }

        try {
            await loanApi.convertToInvoice(selectedLoan.id, items);
            addNotification("Sukses", "Invoice berhasil diterbitkan", "success");
            setShowInvoiceModal(false);
            loadData();
        } catch (err) {
            console.error('Error converting to invoice:', err);
            addNotification("Gagal", err.message, "error");
        }
    };

    const getStatusBadge = (status) => {
        const map = { 'OPEN': 'info', 'PARTIAL': 'warning', 'RETURNED': 'success', 'INVOICED': 'success', 'CLOSED': 'default' };
        return <StatusBadge status={map[status] || 'default'}>{status}</StatusBadge>;
    };

    return (
        <div className="admin-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">🤝 Pinjam Barang (Loan)</h1>
                    <p className="page-subtitle">Peminjaman barang customer (Tes unit, Konsinyasi, dll)</p>
                </div>
                <div className="header-actions">
                    <Button variant="secondary" onClick={loadData}>🔄 Refresh</Button>
                    <Button variant="primary" onClick={() => setShowCreateModal(true)}>➕ Buat Pinjaman Baru</Button>
                </div>
            </div>

            <div className="log-list">
                {loading ? <div className="loading-state">Memuat data...</div> : loans.length === 0 ? (
                    <div className="empty-state">
                        <h3>Belum ada pinjaman</h3>
                        <p>Klik tombol diatas untuk membuat pinjaman baru</p>
                    </div>
                ) : (
                    loans.map(loan => (
                        <Card key={loan.id} className="log-card">
                            <div className="log-header">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <span className="transfer-number" style={{ fontSize: '16px', fontWeight: 'bold' }}>{loan.loan_number}</span>
                                    {getStatusBadge(loan.status)}
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div className="log-entity" style={{ fontWeight: 600 }}>👤 {loan.customer_name}</div>
                                    <div className="log-time" style={{ fontSize: '13px', color: '#64748b' }}>Due: {loan.due_date}</div>
                                </div>
                            </div>
                            <div className="log-body" style={{ marginTop: '12px' }}>
                                <table className="data-table" style={{ width: '100%', fontSize: '14px', marginBottom: '12px' }}>
                                    <thead>
                                        <tr style={{ background: '#f8fafc', color: '#475569', textAlign: 'left' }}>
                                            <th style={{ padding: '8px' }}>Barang</th>
                                            <th style={{ padding: '8px', textAlign: 'center' }}>Dipinjam</th>
                                            <th style={{ padding: '8px', textAlign: 'center' }}>Kembali</th>
                                            <th style={{ padding: '8px', textAlign: 'center' }}>Invoiced</th>
                                            <th style={{ padding: '8px', textAlign: 'center' }}>Sisa (Outstanding)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loan.items.map(item => {
                                            const outstanding = item.qty_loaned - item.qty_returned - item.qty_invoiced;
                                            return (
                                                <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                    <td style={{ padding: '8px' }}>
                                                        <div style={{ fontWeight: 500 }}>{item.product_name}</div>
                                                        <div style={{ fontSize: '12px', color: '#94a3b8' }}>{item.product_sku}</div>
                                                    </td>
                                                    <td style={{ padding: '8px', textAlign: 'center' }}>{item.qty_loaned}</td>
                                                    <td style={{ padding: '8px', textAlign: 'center', color: 'green' }}>{item.qty_returned > 0 ? item.qty_returned : '-'}</td>
                                                    <td style={{ padding: '8px', textAlign: 'center', color: 'blue' }}>{item.qty_invoiced > 0 ? item.qty_invoiced : '-'}</td>
                                                    <td style={{ padding: '8px', textAlign: 'center', fontWeight: 'bold', color: outstanding > 0 ? '#ef4444' : '#cbd5e1' }}>
                                                        {outstanding}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>

                                <div className="transfer-actions" style={{ justifyContent: 'flex-end', borderTop: '1px dashed #e2e8f0', paddingTop: '12px' }}>
                                    {['OPEN', 'PARTIAL'].includes(loan.status) && (
                                        <>
                                            <Button size="sm" variant="secondary" onClick={() => handleReturnClick(loan)}>
                                                🔙 Kembalikan Barang
                                            </Button>
                                            <Button size="sm" variant="success" onClick={() => handleInvoiceClick(loan)}>
                                                💰 Jadikan Invoice
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </Card>
                    ))
                )}
            </div>

            <CreateLoanModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSubmit={handleCreateLoan}
            />

            {/* Return Modal */}
            {showReturnModal && selectedLoan && (
                <Modal isOpen={showReturnModal} onClose={() => setShowReturnModal(false)} title="Kembalikan Barang" size="medium">
                    <p style={{ marginBottom: '16px', color: '#64748b' }}>Input jumlah barang yang fisik-nya dikembalikan ke gudang:</p>
                    <div className="form-grid">
                        {selectedLoan.items.filter(i => (i.qty_loaned - i.qty_returned - i.qty_invoiced) > 0).map(item => {
                            const outstanding = item.qty_loaned - item.qty_returned - item.qty_invoiced;
                            return (
                                <div key={item.id} className="form-group" style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', background: '#f8fafc', borderRadius: '6px' }}>
                                    <div>
                                        <div style={{ fontWeight: 600 }}>{item.product_name}</div>
                                        <div style={{ fontSize: '12px', color: '#64748b' }}>Sisa dipinjam: <span style={{ fontWeight: 'bold', color: '#0f172a' }}>{outstanding}</span></div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <label style={{ fontSize: '12px' }}>Return Qty:</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            style={{ width: '80px', textAlign: 'center' }}
                                            max={outstanding}
                                            min={0}
                                            value={returnItems[item.id] || ''}
                                            onChange={(e) => setReturnItems({ ...returnItems, [item.id]: e.target.value })}
                                            placeholder="0"
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="modal-actions">
                        <Button variant="secondary" onClick={() => setShowReturnModal(false)}>Batal</Button>
                        <Button variant="primary" onClick={handleReturnSubmit}>🔙 Konfirmasi Return</Button>
                    </div>
                </Modal>
            )}

            {/* Invoice Modal */}
            {showInvoiceModal && selectedLoan && (
                <Modal isOpen={showInvoiceModal} onClose={() => setShowInvoiceModal(false)} title="Konversi ke Invoice" size="medium">
                    <p style={{ marginBottom: '16px', color: '#64748b' }}>Barang yang tidak kembali akan ditagihkan (Invoice):</p>
                    <div className="form-grid">
                        {selectedLoan.items.filter(i => (i.qty_loaned - i.qty_returned - i.qty_invoiced) > 0).map(item => {
                            const outstanding = item.qty_loaned - item.qty_returned - item.qty_invoiced;
                            return (
                                <div key={item.id} className="form-group" style={{ gridColumn: 'span 2', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px', marginBottom: '12px' }}>
                                    <div style={{ fontWeight: 600, marginBottom: '8px', color: '#334155' }}>{item.product_name}</div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '12px' }}>
                                        <div>
                                            <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>Qty Tagihan (Max: {outstanding})</label>
                                            <input
                                                type="number"
                                                className="form-input"
                                                value={invoiceItems[item.id]?.qty ?? outstanding}
                                                onChange={(e) => setInvoiceItems({
                                                    ...invoiceItems,
                                                    [item.id]: { ...invoiceItems[item.id], qty: e.target.value }
                                                })}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>Harga Satuan (Rp)</label>
                                            <input
                                                type="number"
                                                className="form-input"
                                                placeholder="Input Harga..."
                                                value={invoiceItems[item.id]?.price || ''}
                                                onChange={(e) => setInvoiceItems({
                                                    ...invoiceItems,
                                                    [item.id]: { ...invoiceItems[item.id], price: e.target.value }
                                                })}
                                            />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="modal-actions">
                        <Button variant="secondary" onClick={() => setShowInvoiceModal(false)}>Batal</Button>
                        <Button variant="success" onClick={handleInvoiceSubmit}>💰 Terbitkan Invoice</Button>
                    </div>
                </Modal>
            )}
        </div>
    );
}
