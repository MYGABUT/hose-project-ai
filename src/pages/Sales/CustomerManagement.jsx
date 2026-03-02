/**
 * Customer Management Page - Excel-style Grid View
 * Supports: Bulk Add, Inline Edit, History Modal
 */
import { useState, useEffect, useRef } from 'react';
import Card from '../../components/common/Card/Card';
import Button from '../../components/common/Button/Button';
import StatusBadge from '../../components/common/Badge/StatusBadge';
import Modal from '../../components/common/Modal/Modal';
import { useNotification } from '../../contexts/NotificationContext';
import customerApi from '../../services/customerApi';
import '../Admin/Admin.css';

const EMPTY_ROW = { name: '', phone: '', email: '', address: '', customer_type: 'RETAIL', credit_limit: 0, credit_term: 30 };

export default function CustomerManagement() {
    const { addNotification } = useNotification();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [customers, setCustomers] = useState([]);
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState('');

    // Bulk Add State
    const [showBulkAdd, setShowBulkAdd] = useState(false);
    const [newRows, setNewRows] = useState([{ ...EMPTY_ROW }, { ...EMPTY_ROW }, { ...EMPTY_ROW }]);
    const gridRef = useRef(null);

    // History Modal State
    const [showHistory, setShowHistory] = useState(false);
    const [historyData, setHistoryData] = useState(null);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [selectedCustomerName, setSelectedCustomerName] = useState('');

    useEffect(() => {
        loadCustomers();
    }, []);

    const loadCustomers = async () => {
        setLoading(true);
        try {
            const params = { limit: 100 };
            if (search) params.search = search;
            if (filterType) params.customer_type = filterType;
            const res = await customerApi.getAll(params);
            setCustomers(res.data || []);
        } catch (err) {
            console.error('Error loading customers:', err);
            setCustomers([]);
        }
        setLoading(false);
    };

    // --- Bulk Add Logic ---
    const handleAddRow = () => {
        setNewRows([...newRows, { ...EMPTY_ROW }]);
    };

    const handleRemoveRow = (idx) => {
        if (newRows.length <= 1) return;
        const updated = [...newRows];
        updated.splice(idx, 1);
        setNewRows(updated);
    };

    const handleRowChange = (idx, field, value) => {
        const updated = [...newRows];
        updated[idx] = { ...updated[idx], [field]: value };
        setNewRows(updated);
    };

    const handleKeyDown = (e, rowIdx, colIdx) => {
        if (e.key === 'Tab' && !e.shiftKey) {
            // Auto-add new row when Tab on last cell of last row
            const cols = 6; // name, phone, email, address, type, credit_limit
            if (rowIdx === newRows.length - 1 && colIdx === cols - 1) {
                e.preventDefault();
                handleAddRow();
                // Focus first cell of new row after render
                setTimeout(() => {
                    const inputs = gridRef.current?.querySelectorAll('input, select');
                    if (inputs) {
                        const targetIdx = (rowIdx + 1) * cols;
                        inputs[targetIdx]?.focus();
                    }
                }, 50);
            }
        }
    };

    const handleBulkSave = async () => {
        const validRows = newRows.filter(r => r.name.trim() !== '');
        if (validRows.length === 0) {
            addNotification('Validasi', 'Masukkan minimal 1 nama customer.', 'warning');
            return;
        }

        setSaving(true);
        try {
            const res = await customerApi.batchCreate(validRows);
            addNotification('Sukses', `${res.created || validRows.length} customer berhasil ditambahkan!`, 'success');
            setShowBulkAdd(false);
            setNewRows([{ ...EMPTY_ROW }, { ...EMPTY_ROW }, { ...EMPTY_ROW }]);
            loadCustomers();
        } catch (err) {
            addNotification('Gagal', err.message || 'Gagal menyimpan customer.', 'error');
        }
        setSaving(false);
    };

    // --- History Modal ---
    const handleViewHistory = async (customerName) => {
        setSelectedCustomerName(customerName);
        setShowHistory(true);
        setHistoryLoading(true);
        try {
            const res = await customerApi.getHistory(customerName, { limit: 50 });
            setHistoryData(res);
        } catch (err) {
            console.error('Failed to load history', err);
            setHistoryData(null);
        }
        setHistoryLoading(false);
    };

    const formatCurrency = (val) => {
        if (!val && val !== 0) return '-';
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
    };

    return (
        <div className="admin-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Data Customer</h1>
                    <p className="page-subtitle">Kelola data pelanggan, credit limit, dan histori transaksi</p>
                </div>
                <div className="header-actions">
                    <Button variant="secondary" onClick={loadCustomers}>Refresh</Button>
                    <Button variant="primary" onClick={() => setShowBulkAdd(true)}>+ Tambah Customer</Button>
                </div>
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'center' }}>
                <input
                    type="text"
                    className="form-input"
                    placeholder="Cari nama customer..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && loadCustomers()}
                    style={{ maxWidth: '300px' }}
                />
                <select
                    className="form-input"
                    value={filterType}
                    onChange={(e) => { setFilterType(e.target.value); }}
                    style={{ maxWidth: '180px' }}
                >
                    <option value="">Semua Tipe</option>
                    <option value="RETAIL">Retail</option>
                    <option value="WHOLESALE">Wholesale</option>
                    <option value="PROJECT">Project</option>
                    <option value="VIP">VIP</option>
                </select>
                <Button size="sm" variant="secondary" onClick={loadCustomers}>Cari</Button>
            </div>

            {/* Customer Table */}
            <Card>
                <div style={{ overflowX: 'auto' }}>
                    <table className="data-table" style={{ width: '100%', fontSize: '14px' }}>
                        <thead>
                            <tr style={{ background: '#f1f5f9', color: '#475569', textAlign: 'left' }}>
                                <th style={{ padding: '10px 12px' }}>Nama</th>
                                <th style={{ padding: '10px 12px' }}>Telepon</th>
                                <th style={{ padding: '10px 12px' }}>Tipe</th>
                                <th style={{ padding: '10px 12px', textAlign: 'right' }}>Credit Limit</th>
                                <th style={{ padding: '10px 12px', textAlign: 'right' }}>Outstanding</th>
                                <th style={{ padding: '10px 12px', textAlign: 'right' }}>Sisa Kredit</th>
                                <th style={{ padding: '10px 12px', textAlign: 'center' }}>Status</th>
                                <th style={{ padding: '10px 12px', textAlign: 'center' }}>Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="8" style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>Memuat data...</td></tr>
                            ) : customers.length === 0 ? (
                                <tr><td colSpan="8" style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>Belum ada data customer</td></tr>
                            ) : customers.map(c => (
                                <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>{c.name}</td>
                                    <td style={{ padding: '10px 12px', color: '#64748b' }}>{c.phone || '-'}</td>
                                    <td style={{ padding: '10px 12px' }}>
                                        <StatusBadge status={c.is_over_limit ? 'error' : 'default'}>{c.customer_type || 'RETAIL'}</StatusBadge>
                                    </td>
                                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>{formatCurrency(c.credit_limit)}</td>
                                    <td style={{ padding: '10px 12px', textAlign: 'right', color: c.total_outstanding > 0 ? '#ef4444' : '#22c55e' }}>
                                        {formatCurrency(c.total_outstanding)}
                                    </td>
                                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>
                                        {formatCurrency(c.available_credit)}
                                    </td>
                                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                        {c.is_over_limit ? (
                                            <StatusBadge status="error">Over Limit</StatusBadge>
                                        ) : (
                                            <StatusBadge status="success">OK</StatusBadge>
                                        )}
                                    </td>
                                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                        <button
                                            onClick={() => handleViewHistory(c.name)}
                                            style={{ background: 'none', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontSize: '12px', color: '#3b82f6' }}
                                            title="Lihat Histori Pembelian"
                                        >
                                            Histori
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Bulk Add Modal - Excel Style */}
            <Modal isOpen={showBulkAdd} onClose={() => setShowBulkAdd(false)} title="Tambah Customer (Bulk / Excel Style)" size="large">
                <p style={{ marginBottom: '12px', color: '#64748b', fontSize: '13px' }}>
                    Isi data di bawah seperti mengisi Excel. Tekan <strong>Tab</strong> untuk pindah kolom, baris baru otomatis ditambahkan.
                </p>
                <div ref={gridRef} style={{ overflowX: 'auto', maxHeight: '400px', overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <thead>
                            <tr style={{ background: '#f8fafc', position: 'sticky', top: 0, zIndex: 1 }}>
                                <th style={{ padding: '8px', border: '1px solid #e2e8f0', minWidth: '60px' }}>#</th>
                                <th style={{ padding: '8px', border: '1px solid #e2e8f0', minWidth: '180px' }}>Nama *</th>
                                <th style={{ padding: '8px', border: '1px solid #e2e8f0', minWidth: '130px' }}>Telepon</th>
                                <th style={{ padding: '8px', border: '1px solid #e2e8f0', minWidth: '160px' }}>Email</th>
                                <th style={{ padding: '8px', border: '1px solid #e2e8f0', minWidth: '180px' }}>Alamat</th>
                                <th style={{ padding: '8px', border: '1px solid #e2e8f0', minWidth: '110px' }}>Tipe</th>
                                <th style={{ padding: '8px', border: '1px solid #e2e8f0', minWidth: '120px' }}>Credit Limit</th>
                                <th style={{ padding: '8px', border: '1px solid #e2e8f0', width: '40px' }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {newRows.map((row, idx) => (
                                <tr key={idx} style={{ background: idx % 2 === 0 ? '#fff' : '#fafbfc' }}>
                                    <td style={{ padding: '4px 8px', border: '1px solid #e2e8f0', textAlign: 'center', color: '#94a3b8' }}>{idx + 1}</td>
                                    <td style={{ padding: '2px', border: '1px solid #e2e8f0' }}>
                                        <input
                                            type="text"
                                            value={row.name}
                                            onChange={(e) => handleRowChange(idx, 'name', e.target.value)}
                                            onKeyDown={(e) => handleKeyDown(e, idx, 0)}
                                            style={{ width: '100%', border: 'none', padding: '6px 8px', outline: 'none', background: 'transparent', fontSize: '13px' }}
                                            placeholder="PT. Contoh..."
                                        />
                                    </td>
                                    <td style={{ padding: '2px', border: '1px solid #e2e8f0' }}>
                                        <input
                                            type="text"
                                            value={row.phone}
                                            onChange={(e) => handleRowChange(idx, 'phone', e.target.value)}
                                            onKeyDown={(e) => handleKeyDown(e, idx, 1)}
                                            style={{ width: '100%', border: 'none', padding: '6px 8px', outline: 'none', background: 'transparent', fontSize: '13px' }}
                                            placeholder="08xxx"
                                        />
                                    </td>
                                    <td style={{ padding: '2px', border: '1px solid #e2e8f0' }}>
                                        <input
                                            type="email"
                                            value={row.email}
                                            onChange={(e) => handleRowChange(idx, 'email', e.target.value)}
                                            onKeyDown={(e) => handleKeyDown(e, idx, 2)}
                                            style={{ width: '100%', border: 'none', padding: '6px 8px', outline: 'none', background: 'transparent', fontSize: '13px' }}
                                            placeholder="email@..."
                                        />
                                    </td>
                                    <td style={{ padding: '2px', border: '1px solid #e2e8f0' }}>
                                        <input
                                            type="text"
                                            value={row.address}
                                            onChange={(e) => handleRowChange(idx, 'address', e.target.value)}
                                            onKeyDown={(e) => handleKeyDown(e, idx, 3)}
                                            style={{ width: '100%', border: 'none', padding: '6px 8px', outline: 'none', background: 'transparent', fontSize: '13px' }}
                                            placeholder="Jl. ..."
                                        />
                                    </td>
                                    <td style={{ padding: '2px', border: '1px solid #e2e8f0' }}>
                                        <select
                                            value={row.customer_type}
                                            onChange={(e) => handleRowChange(idx, 'customer_type', e.target.value)}
                                            onKeyDown={(e) => handleKeyDown(e, idx, 4)}
                                            style={{ width: '100%', border: 'none', padding: '6px 4px', outline: 'none', background: 'transparent', fontSize: '13px' }}
                                        >
                                            <option value="RETAIL">Retail</option>
                                            <option value="WHOLESALE">Wholesale</option>
                                            <option value="PROJECT">Project</option>
                                            <option value="VIP">VIP</option>
                                        </select>
                                    </td>
                                    <td style={{ padding: '2px', border: '1px solid #e2e8f0' }}>
                                        <input
                                            type="number"
                                            value={row.credit_limit || ''}
                                            onChange={(e) => handleRowChange(idx, 'credit_limit', parseFloat(e.target.value) || 0)}
                                            onKeyDown={(e) => handleKeyDown(e, idx, 5)}
                                            style={{ width: '100%', border: 'none', padding: '6px 8px', outline: 'none', background: 'transparent', fontSize: '13px', textAlign: 'right' }}
                                            placeholder="0"
                                        />
                                    </td>
                                    <td style={{ padding: '2px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                                        <button
                                            onClick={() => handleRemoveRow(idx)}
                                            style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }}
                                            title="Hapus baris"
                                        >
                                            x
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Button size="sm" variant="secondary" onClick={handleAddRow}>+ Tambah Baris</Button>
                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>{newRows.filter(r => r.name.trim()).length} customer siap disimpan</span>
                </div>
                <div className="modal-actions" style={{ marginTop: '16px' }}>
                    <Button variant="secondary" onClick={() => setShowBulkAdd(false)}>Batal</Button>
                    <Button variant="primary" onClick={handleBulkSave} loading={saving}>Simpan Semua</Button>
                </div>
            </Modal>

            {/* History Modal */}
            <Modal isOpen={showHistory} onClose={() => setShowHistory(false)} title={`Histori Transaksi: ${selectedCustomerName}`} size="large">
                {historyLoading ? (
                    <div style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>Memuat histori...</div>
                ) : !historyData ? (
                    <div style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>Tidak ada data histori.</div>
                ) : (
                    <>
                        {/* Summary Cards */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
                            <div style={{ background: '#f0f9ff', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                                <div style={{ fontSize: '12px', color: '#0369a1' }}>Total Transaksi</div>
                                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#0c4a6e' }}>{historyData.summary?.total_transactions || 0}</div>
                            </div>
                            <div style={{ background: '#f0fdf4', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                                <div style={{ fontSize: '12px', color: '#15803d' }}>Total Qty</div>
                                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#14532d' }}>{historyData.summary?.total_qty_ordered || 0}</div>
                            </div>
                            <div style={{ background: '#fff7ed', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                                <div style={{ fontSize: '12px', color: '#c2410c' }}>Total Nilai</div>
                                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#7c2d12' }}>{formatCurrency(historyData.summary?.total_value)}</div>
                            </div>
                        </div>

                        {/* History Table */}
                        <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                            <table className="data-table" style={{ width: '100%', fontSize: '13px' }}>
                                <thead>
                                    <tr style={{ background: '#f1f5f9', position: 'sticky', top: 0 }}>
                                        <th style={{ padding: '8px' }}>Tanggal</th>
                                        <th style={{ padding: '8px' }}>No. SO</th>
                                        <th style={{ padding: '8px' }}>Produk</th>
                                        <th style={{ padding: '8px', textAlign: 'center' }}>Qty</th>
                                        <th style={{ padding: '8px', textAlign: 'right' }}>Harga</th>
                                        <th style={{ padding: '8px', textAlign: 'right' }}>Total</th>
                                        <th style={{ padding: '8px', textAlign: 'center' }}>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(historyData.data || []).length === 0 ? (
                                        <tr><td colSpan="7" style={{ textAlign: 'center', padding: '16px', color: '#94a3b8' }}>Belum ada transaksi</td></tr>
                                    ) : (historyData.data || []).map((h, idx) => (
                                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '8px', color: '#64748b' }}>{h.tanggal?.split('T')[0] || '-'}</td>
                                            <td style={{ padding: '8px', fontWeight: 500 }}>{h.so_number}</td>
                                            <td style={{ padding: '8px' }}>{h.product_name}</td>
                                            <td style={{ padding: '8px', textAlign: 'center' }}>{h.qty_ordered}</td>
                                            <td style={{ padding: '8px', textAlign: 'right' }}>{formatCurrency(h.unit_price)}</td>
                                            <td style={{ padding: '8px', textAlign: 'right', fontWeight: 600 }}>{formatCurrency(h.line_total)}</td>
                                            <td style={{ padding: '8px', textAlign: 'center' }}>
                                                <StatusBadge status={h.status === 'COMPLETED' || h.status === 'DELIVERED' ? 'success' : 'info'}>{h.status}</StatusBadge>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </Modal>
        </div>
    );
}
