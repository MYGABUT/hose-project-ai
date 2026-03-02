import { useState, useEffect } from 'react';
import Card from '../../components/common/Card/Card';
import Button from '../../components/common/Button/Button';
import StatusBadge from '../../components/common/Badge/StatusBadge';
import CreateInterCompanyLoanModal from '../../components/features/Loans/CreateInterCompanyLoanModal';
import interCompanyLoanApi from '../../services/intercompanyLoanApi';
import { useNotification } from '../../contexts/NotificationContext';
import '../Admin/Admin.css'; // Re-use styling

export default function InterCompanyLoanPage() {
    const { addNotification } = useNotification();
    const [loading, setLoading] = useState(true);

    // Default current company ID is 1 (HQ), in real app this is derived from Context/Auth
    const currentCompanyId = 1;

    const [loans, setLoans] = useState([]);
    const [mode, setMode] = useState('outbound'); // 'outbound' or 'inbound'

    // Modals
    const [showCreateModal, setShowCreateModal] = useState(false);

    useEffect(() => {
        loadData();
    }, [mode]);

    const loadData = async () => {
        setLoading(true);
        try {
            const response = await interCompanyLoanApi.getAll({ company_id: currentCompanyId, mode });
            if (response.status === 'success') {
                setLoans(response.data || []);
            } else {
                setLoans([]); // Fail safe
            }
        } catch (err) {
            console.error('Error loading inter-company loans:', err);
            setLoans([]);
            addNotification("Error", "Gagal fetch data: " + err.message, "error");
        }
        setLoading(false);
    };

    const handleCreateLoan = async (data) => {
        await interCompanyLoanApi.create(data);
        addNotification("Sukses", "Konsinyasi/Pinjaman B2B berhasil dikirim!", "success");
        if (mode !== 'outbound') setMode('outbound'); // Switch to outbound view
        else loadData();
    };

    const handleApprove = async (id) => {
        if (!window.confirm("Terima barang ini ke gudang Anda?")) return;
        try {
            await interCompanyLoanApi.approve(id);
            addNotification("Sukses", "Barang titipan berhasil diterima di gudang!", "success");
            loadData();
        } catch (err) {
            addNotification("Gagal", err.message, "error");
        }
    };

    const handleReturn = async (loan) => {
        // Simple auto-return all remaining items for demo
        const itemsToReturn = loan.items
            .filter(i => (i.qty_loaned - i.qty_returned - i.qty_sold) > 0)
            .map(i => ({ item_id: i.id, qty: (i.qty_loaned - i.qty_returned - i.qty_sold) }));

        if (itemsToReturn.length === 0) return addNotification("Info", "Tidak ada barang sisa untuk dikembalikan", "info");

        if (!window.confirm(`Kembalikan ${itemsToReturn.length} jenis barang sisa ke perusahaan asalnya?`)) return;
        try {
            await interCompanyLoanApi.returnItems(loan.id, itemsToReturn);
            addNotification("Sukses", "Barang sisa berhasil diretur!", "success");
            loadData();
        } catch (err) {
            addNotification("Gagal", err.message, "error");
        }
    };

    const handleInvoice = async (loan) => {
        if (!window.confirm("Terbitkan Invoice penagihan untuk semua barang Konsinyasi yang sudah laku terjual di pihak mereka?")) return;
        try {
            const res = await interCompanyLoanApi.convertToInvoice(loan.id);
            addNotification("Sukses", res.message || "Invoice terbit!", "success");
            loadData();
        } catch (err) {
            addNotification("Gagal", err.message, "error");
        }
    };

    const getStatusBadge = (status) => {
        const map = {
            'PENDING_APPROVAL': 'warning',
            'APPROVED': 'info',
            'PARTIAL': 'primary',
            'RETURNED': 'success',
            'INVOICED': 'success',
            'CLOSED': 'default'
        };
        return <StatusBadge status={map[status] || 'default'}>{status.replace('_', ' ')}</StatusBadge>;
    };

    return (
        <div className="admin-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">🏢 B2B Consignment / Loan Sync</h1>
                    <p className="page-subtitle">Peminjaman dan titip barang antar Perusahaan / Cabang</p>
                </div>
                <div className="header-actions">
                    <Button variant="secondary" onClick={loadData}>🔄 Refresh</Button>
                    <Button variant="primary" onClick={() => setShowCreateModal(true)}>➕ Titip (Kirim) Barang Baru</Button>
                </div>
            </div>

            {/* Smart Tabs */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
                <Button
                    variant={mode === 'outbound' ? 'primary' : 'secondary'}
                    onClick={() => setMode('outbound')}
                    style={{ borderRadius: '20px', padding: '6px 16px' }}
                >
                    📤 Dipinjamkan/Titip ke Perusahaan Lain
                </Button>
                <Button
                    variant={mode === 'inbound' ? 'primary' : 'secondary'}
                    onClick={() => setMode('inbound')}
                    style={{ borderRadius: '20px', padding: '6px 16px' }}
                >
                    📥 Daftar Titipan dari Perusahaan Lain
                </Button>
            </div>

            <div className="log-list">
                {loading ? <div className="loading-state">Memuat sinkronisasi B2B...</div> : loans.length === 0 ? (
                    <div className="empty-state">
                        <h3>Belum ada transaksi B2B</h3>
                        <p>{mode === 'outbound' ? "Anda belum menitipkan barang ke rekaman." : "Tidak ada titipan masuk untuk Anda."}</p>
                    </div>
                ) : (
                    loans.map(loan => (
                        <Card key={loan.id} className="log-card">
                            <div className="log-header" style={{ background: mode === 'inbound' ? '#f0fdf4' : '#f8fafc', padding: '16px', borderRadius: '8px 8px 0 0', borderBottom: '1px solid #e2e8f0' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <span className="transfer-number" style={{ fontSize: '16px', fontWeight: 'bold', color: '#0f172a' }}>{loan.loan_number}</span>
                                    {getStatusBadge(loan.status)}
                                    {mode === 'inbound' && loan.status === 'PENDING_APPROVAL' && (
                                        <span style={{ fontSize: '12px', background: '#fef08a', color: '#854d0e', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold' }}>Menunggu ACC Anda</span>
                                    )}
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div className="log-entity" style={{ fontWeight: 600, color: '#334155' }}>
                                        {mode === 'outbound' ? `👤 Dikirim ke: ${loan.to_company_name}` : `🏢 Pengirim: ${loan.from_company_name}`}
                                    </div>
                                    <div className="log-time" style={{ fontSize: '13px', color: '#64748b' }}>Batas Waktu: {loan.due_date}</div>
                                </div>
                            </div>
                            <div className="log-body" style={{ marginTop: '0', padding: '16px' }}>
                                {loan.notes && <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '12px', fontStyle: 'italic' }}>Catatan: "{loan.notes}"</div>}

                                <table className="data-table" style={{ width: '100%', fontSize: '14px', marginBottom: '12px' }}>
                                    <thead>
                                        <tr style={{ background: '#f8fafc', color: '#475569', textAlign: 'left' }}>
                                            <th style={{ padding: '8px' }}>Asset</th>
                                            <th style={{ padding: '8px', textAlign: 'center' }}>Total (Dikirim)</th>
                                            <th style={{ padding: '8px', textAlign: 'center' }}>Diretur</th>
                                            <th style={{ padding: '8px', textAlign: 'center', background: '#eff6ff', color: '#1d4ed8' }}>Laku/Terjual (Sync)</th>
                                            <th style={{ padding: '8px', textAlign: 'center' }}>Sisa (Gudang)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loan.items.map(item => {
                                            const outstanding = item.qty_loaned - item.qty_returned - item.qty_sold;
                                            return (
                                                <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                    <td style={{ padding: '8px' }}>
                                                        <div style={{ fontWeight: 500, color: '#0f172a' }}>{item.product_name}</div>
                                                        <div style={{ fontSize: '12px', color: '#94a3b8' }}>{item.product_sku}</div>
                                                    </td>
                                                    <td style={{ padding: '8px', textAlign: 'center' }}>{item.qty_loaned}</td>
                                                    <td style={{ padding: '8px', textAlign: 'center', color: '#16a34a' }}>{item.qty_returned > 0 ? item.qty_returned : '-'}</td>
                                                    <td style={{ padding: '8px', textAlign: 'center', background: '#eff6ff', color: '#1d4ed8', fontWeight: item.qty_sold > 0 ? 'bold' : 'normal' }}>
                                                        {item.qty_sold > 0 ? `+${item.qty_sold}` : '-'}
                                                    </td>
                                                    <td style={{ padding: '8px', textAlign: 'center', fontWeight: 'bold', color: outstanding > 0 ? '#f59e0b' : '#cbd5e1' }}>
                                                        {outstanding}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>

                                {/* Action Buttons */}
                                <div className="transfer-actions" style={{ justifyContent: 'flex-end', borderTop: '1px dashed #e2e8f0', paddingTop: '12px', gap: '8px' }}>
                                    {/* Actions for INBOUND (Borrower) */}
                                    {mode === 'inbound' && loan.status === 'PENDING_APPROVAL' && (
                                        <Button size="sm" variant="success" onClick={() => handleApprove(loan.id)}>
                                            ✅ Terima & Setujui
                                        </Button>
                                    )}

                                    {mode === 'inbound' && ['APPROVED', 'PARTIAL'].includes(loan.status) && (
                                        <Button size="sm" variant="secondary" onClick={() => handleReturn(loan)}>
                                            🔙 Kembalikan Sisa Barang (Retur)
                                        </Button>
                                    )}

                                    {/* Actions for OUTBOUND (Lender) */}
                                    {mode === 'outbound' && ['APPROVED', 'PARTIAL'].includes(loan.status) && (
                                        <Button size="sm" variant="success" onClick={() => handleInvoice(loan)} style={{ background: '#3b82f6' }}>
                                            💰 Tagih Barang Terjual (Invoice)
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </Card>
                    ))
                )}
            </div>

            <CreateInterCompanyLoanModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSubmit={handleCreateLoan}
                currentCompanyId={currentCompanyId}
            />
        </div>
    );
}
