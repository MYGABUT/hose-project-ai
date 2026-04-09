import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/common/Card/Card';
import Button from '../../components/common/Button/Button';
import blanketOrderApi from '../../services/blanketOrderApi';
import api from '../../services/api';
import './Production.css';

const STATUS_COLORS = {
    BLANKET: 'purple', DRAFT: 'gray', CONFIRMED: 'blue',
    PARTIAL_DELIVERED: 'orange', COMPLETED: 'green', CANCELLED: 'red',
};
const RELEASE_COLORS = {
    PLANNED: 'gray', READY: 'blue', RELEASED: 'orange', DELIVERED: 'green', CANCELLED: 'red',
};

const formatCurrency = (v) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v || 0);
const formatDate = (d) => d ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

export default function BlanketOrderPage() {
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState('list');             // 'list' or 'detail' or 'create'
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'releases', 'invoices'

    // Create form
    const [form, setForm] = useState({ customer_name: '', customer_phone: '', customer_address: '', valid_from: '', valid_until: '', notes: '', lines: [{ description: '', qty: 1, unit_price: 0, product_id: null }] });
    const [products, setProducts] = useState([]);
    const [actionLoading, setActionLoading] = useState(null);

    // Release form
    const [showReleaseForm, setShowReleaseForm] = useState(false);
    const [releaseForm, setReleaseForm] = useState({ requested_date: '', notes: '', lines: [] });

    useEffect(() => { loadOrders(); }, []);

    const loadOrders = async () => {
        setLoading(true);
        const res = await blanketOrderApi.getAll();
        if (res.status === 'success') setOrders(res.data);
        setLoading(false);
    };

    const loadDetail = async (id) => {
        setLoading(true);
        const res = await blanketOrderApi.getById(id);
        if (res.status === 'success') {
            setSelectedOrder(res.data);
            setView('detail');
        } else { alert(res.message); }
        setLoading(false);
    };

    const openCreate = async () => {
        try {
            const res = await api.get('/products');
            if (res.data?.status === 'success') setProducts(res.data.data);
            else if (Array.isArray(res.data)) setProducts(res.data);
        } catch (e) { console.error('Failed to load products', e); }
        setView('create');
    };

    const handleCreateSO = async () => {
        if (!form.customer_name) return alert('Nama customer wajib diisi');
        if (form.lines.length === 0 || !form.lines[0].description) return alert('Tambahkan minimal 1 item');

        setActionLoading('create');
        const res = await blanketOrderApi.create(form);
        if (res.status === 'success') {
            alert(`✅ ${res.message}`);
            setView('list');
            setForm({ customer_name: '', customer_phone: '', customer_address: '', valid_from: '', valid_until: '', notes: '', lines: [{ description: '', qty: 1, unit_price: 0, product_id: null }] });
            loadOrders();
        } else { alert(res.message); }
        setActionLoading(null);
    };

    const handleAddLine = () => setForm(f => ({ ...f, lines: [...f.lines, { description: '', qty: 1, unit_price: 0, product_id: null }] }));
    const handleRemoveLine = (i) => setForm(f => ({ ...f, lines: f.lines.filter((_, idx) => idx !== i) }));
    const handleLineChange = (i, field, value) => {
        setForm(f => {
            const lines = [...f.lines];
            lines[i] = { ...lines[i], [field]: value };
            return { ...f, lines };
        });
    };

    // ──── Release Actions ────
    const openReleaseForm = () => {
        const lines = (selectedOrder?.lines || []).map(l => ({
            so_line_id: l.id,
            description: l.description,
            max_qty: l.qty - (l.qty_released || 0),
            qty: 0,
        })).filter(l => l.max_qty > 0);
        setReleaseForm({ requested_date: '', notes: '', lines });
        setShowReleaseForm(true);
    };

    const handleCreateRelease = async () => {
        const linesToSubmit = releaseForm.lines.filter(l => l.qty > 0);
        if (linesToSubmit.length === 0) return alert('Pilih minimal 1 item dengan qty > 0');
        setActionLoading('release');
        const res = await blanketOrderApi.createRelease(selectedOrder.id, {
            requested_date: releaseForm.requested_date || null,
            notes: releaseForm.notes,
            lines: linesToSubmit.map(l => ({ so_line_id: l.so_line_id, qty: l.qty })),
        });
        if (res.status === 'success') {
            alert(`✅ ${res.message}`);
            setShowReleaseForm(false);
            loadDetail(selectedOrder.id);
        } else { alert(res.message); }
        setActionLoading(null);
    };

    const handleConfirmRelease = async (releaseId) => {
        if (!window.confirm('Konfirmasi release ini? DO akan otomatis dibuat.')) return;
        setActionLoading(releaseId);
        const res = await blanketOrderApi.confirmRelease(selectedOrder.id, releaseId);
        if (res.status === 'success') { alert(`✅ ${res.message}`); loadDetail(selectedOrder.id); }
        else { alert(res.message); }
        setActionLoading(null);
    };

    const handleDeliverRelease = async (releaseId) => {
        if (!window.confirm('Tandai sebagai terkirim? Invoice akan otomatis dibuat.')) return;
        setActionLoading(releaseId);
        const res = await blanketOrderApi.deliverRelease(selectedOrder.id, releaseId);
        if (res.status === 'success') { alert(`✅ ${res.message}`); loadDetail(selectedOrder.id); }
        else { alert(res.message); }
        setActionLoading(null);
    };

    const handleCancelRelease = async (releaseId) => {
        if (!window.confirm('Batalkan release ini?')) return;
        setActionLoading(releaseId);
        const res = await blanketOrderApi.cancelRelease(selectedOrder.id, releaseId);
        if (res.status === 'success') { alert(`✅ ${res.message}`); loadDetail(selectedOrder.id); }
        else { alert(res.message); }
        setActionLoading(null);
    };

    const handleSummaryInvoice = async () => {
        if (!window.confirm('Buat Invoice Akumulasi dari semua release?')) return;
        setActionLoading('summary');
        const res = await blanketOrderApi.generateSummaryInvoice(selectedOrder.id);
        if (res.status === 'success') { alert(`✅ ${res.message}`); loadDetail(selectedOrder.id); }
        else { alert(res.message); }
        setActionLoading(null);
    };

    // ──── Progress Bar ────
    const ProgressBar = ({ released, total, label }) => {
        const pct = total > 0 ? Math.round((released / total) * 100) : 0;
        return (
            <div style={{ marginBottom: '8px' }}>
                {label && <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>{label}</div>}
                <div style={{ background: '#e2e8f0', borderRadius: '999px', height: '10px', overflow: 'hidden' }}>
                    <div style={{
                        background: pct >= 100 ? '#10b981' : pct > 50 ? '#3b82f6' : '#f59e0b',
                        width: `${pct}%`, height: '100%', borderRadius: '999px', transition: 'width 0.3s'
                    }} />
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>{released}/{total} ({pct}%)</div>
            </div>
        );
    };

    // ──────── LIST VIEW ────────
    if (view === 'list') return (
        <div className="production-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">📋 Blanket Orders</h1>
                    <p className="page-subtitle">Pengiriman bertahap sesuai kebutuhan customer</p>
                </div>
                <div className="header-actions">
                    <Button variant="secondary" onClick={() => navigate('/production/sales-orders')}>← Sales Orders</Button>
                    <Button variant="primary" onClick={openCreate} icon={<span>➕</span>}>Buat Blanket Order</Button>
                </div>
            </div>

            <Card>
                {loading ? (
                    <div className="loading-state"><div className="spinner"></div><p>Memuat data...</p></div>
                ) : orders.length === 0 ? (
                    <div className="empty-state"><span className="empty-icon">📭</span><h3>Belum ada Blanket Order</h3></div>
                ) : (
                    <table className="data-table">
                        <thead><tr><th>SO Number</th><th>Customer</th><th>Berlaku</th><th>Total</th><th>Progress</th><th>Releases</th><th>Actions</th></tr></thead>
                        <tbody>
                            {orders.map(o => (
                                <tr key={o.id}>
                                    <td className="so-number">{o.so_number}</td>
                                    <td>{o.customer_name}</td>
                                    <td style={{ fontSize: '12px' }}>
                                        {formatDate(o.blanket_valid_from)} — {formatDate(o.blanket_valid_until)}
                                    </td>
                                    <td className="amount-cell">{formatCurrency(o.total)}</td>
                                    <td>
                                        <ProgressBar released={o.qty_released || 0} total={o.qty_total || 0} />
                                    </td>
                                    <td><span style={{ background: '#ede9fe', color: '#7c3aed', padding: '2px 8px', borderRadius: '999px', fontSize: '12px', fontWeight: '600' }}>{o.release_count} release</span></td>
                                    <td>
                                        <Button variant="primary" size="sm" onClick={() => loadDetail(o.id)}>👁️ Detail</Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </Card>
        </div>
    );

    // ──────── CREATE VIEW ────────
    if (view === 'create') return (
        <div className="production-page">
            <div className="page-header">
                <div><h1 className="page-title">➕ Buat Blanket Order</h1><p className="page-subtitle">Atur pengiriman bertahap untuk customer</p></div>
                <Button variant="secondary" onClick={() => setView('list')}>← Kembali</Button>
            </div>
            <Card>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                    <div className="form-group">
                        <label>Customer *</label>
                        <input value={form.customer_name} onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))} placeholder="Nama customer..." />
                    </div>
                    <div className="form-group">
                        <label>Telepon</label>
                        <input value={form.customer_phone} onChange={e => setForm(f => ({ ...f, customer_phone: e.target.value }))} placeholder="08xxx..." />
                    </div>
                    <div className="form-group">
                        <label>Berlaku Dari</label>
                        <input type="date" value={form.valid_from} onChange={e => setForm(f => ({ ...f, valid_from: e.target.value }))} />
                    </div>
                    <div className="form-group">
                        <label>Berlaku Sampai</label>
                        <input type="date" value={form.valid_until} onChange={e => setForm(f => ({ ...f, valid_until: e.target.value }))} />
                    </div>
                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                        <label>Alamat</label>
                        <textarea value={form.customer_address} onChange={e => setForm(f => ({ ...f, customer_address: e.target.value }))} rows={2} />
                    </div>
                </div>

                <h3 style={{ marginBottom: '12px' }}>📦 Items</h3>
                <table className="data-table" style={{ marginBottom: '12px' }}>
                    <thead><tr><th>Produk</th><th>Deskripsi</th><th>Qty</th><th>Harga Satuan</th><th>Subtotal</th><th></th></tr></thead>
                    <tbody>
                        {form.lines.map((line, i) => (
                            <tr key={i}>
                                <td>
                                    <select value={line.product_id || ''} onChange={e => {
                                        const p = products.find(p => p.id === parseInt(e.target.value));
                                        if (p) handleLineChange(i, 'product_id', p.id);
                                        if (p) handleLineChange(i, 'description', p.name || p.sku);
                                    }} style={{ minWidth: '150px' }}>
                                        <option value="">Pilih produk...</option>
                                        {products.map(p => <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>)}
                                    </select>
                                </td>
                                <td><input value={line.description} onChange={e => handleLineChange(i, 'description', e.target.value)} placeholder="Deskripsi..." /></td>
                                <td><input type="number" value={line.qty} min={1} onChange={e => handleLineChange(i, 'qty', parseInt(e.target.value) || 1)} style={{ width: '70px' }} /></td>
                                <td><input type="number" value={line.unit_price} min={0} onChange={e => handleLineChange(i, 'unit_price', parseFloat(e.target.value) || 0)} style={{ width: '120px' }} /></td>
                                <td>{formatCurrency(line.qty * line.unit_price)}</td>
                                <td><button onClick={() => handleRemoveLine(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }}>🗑️</button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <Button variant="secondary" size="sm" onClick={handleAddLine}>+ Tambah Item</Button>

                <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '2px solid #e2e8f0', paddingTop: '16px' }}>
                    <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
                        Total: {formatCurrency(form.lines.reduce((s, l) => s + l.qty * l.unit_price, 0))}
                        <span style={{ display: 'block', fontSize: '12px', color: '#64748b', fontWeight: 'normal' }}>
                            {form.lines.reduce((s, l) => s + (parseInt(l.qty) || 0), 0)} pcs total
                        </span>
                    </div>
                    <Button variant="primary" onClick={handleCreateSO} loading={actionLoading === 'create'}>✓ Simpan Blanket Order</Button>
                </div>
            </Card>
        </div>
    );

    // ──────── DETAIL VIEW ────────
    if (view === 'detail' && selectedOrder) {
        const so = selectedOrder;
        const releases = so.releases || [];
        const qtyTotal = so.qty_total || so.lines?.reduce((s, l) => s + l.qty, 0) || 0;
        const qtyReleased = so.qty_released || so.lines?.reduce((s, l) => s + (l.qty_released || 0), 0) || 0;
        const qtyShipped = so.lines?.reduce((s, l) => s + (l.qty_shipped || 0), 0) || 0;

        return (
            <div className="production-page">
                <div className="page-header">
                    <div>
                        <h1 className="page-title">📋 {so.so_number}</h1>
                        <p className="page-subtitle">{so.customer_name} — Blanket Order</p>
                    </div>
                    <div className="header-actions">
                        <Button variant="secondary" onClick={() => { setView('list'); setSelectedOrder(null); }}>← Kembali</Button>
                        <Button variant="primary" onClick={openReleaseForm}>📦 Buat Release/Call-off</Button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="filter-tabs">
                    {[{ key: 'overview', label: '📊 Overview' }, { key: 'releases', label: `📦 Releases (${releases.length})` }, { key: 'invoices', label: '🧾 Invoices' }]
                        .map(t => (
                            <button key={t.key} className={`filter-tab ${activeTab === t.key ? 'active' : ''}`} onClick={() => setActiveTab(t.key)}>{t.label}</button>
                        ))}
                </div>

                {/* ── TAB: OVERVIEW ── */}
                {activeTab === 'overview' && (
                    <Card>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                            <div style={{ background: '#f1f5f9', padding: '16px', borderRadius: '12px' }}>
                                <div style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Masa Berlaku</div>
                                <div style={{ fontSize: '16px', fontWeight: '600', marginTop: '4px' }}>
                                    {formatDate(so.blanket_valid_from)} — {formatDate(so.blanket_valid_until)}
                                </div>
                            </div>
                            <div style={{ background: '#f1f5f9', padding: '16px', borderRadius: '12px' }}>
                                <div style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Nilai</div>
                                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e293b', marginTop: '4px' }}>{formatCurrency(so.total)}</div>
                            </div>
                            <div style={{ background: '#f1f5f9', padding: '16px', borderRadius: '12px' }}>
                                <div style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Soft-Reserved</div>
                                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#7c3aed', marginTop: '4px' }}>{so.qty_reserved || qtyTotal} pcs</div>
                            </div>
                        </div>

                        <ProgressBar released={qtyReleased} total={qtyTotal} label="Released (Call-off)" />
                        <ProgressBar released={qtyShipped} total={qtyTotal} label="Shipped (Terkirim)" />

                        <h3 style={{ marginTop: '24px', marginBottom: '12px' }}>📦 Detail Items</h3>
                        <table className="data-table">
                            <thead><tr><th>Item</th><th>Qty Total</th><th>Released</th><th>Shipped</th><th>Sisa</th><th>Harga</th></tr></thead>
                            <tbody>
                                {(so.lines || []).map(l => (
                                    <tr key={l.id}>
                                        <td>{l.description}</td>
                                        <td><strong>{l.qty}</strong></td>
                                        <td><span style={{ color: '#3b82f6' }}>{l.qty_released || 0}</span></td>
                                        <td><span style={{ color: '#10b981' }}>{l.qty_shipped || 0}</span></td>
                                        <td><span style={{ color: '#f59e0b', fontWeight: '600' }}>{l.qty - (l.qty_released || 0)}</span></td>
                                        <td>{formatCurrency(l.unit_price)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </Card>
                )}

                {/* ── TAB: RELEASES ── */}
                {activeTab === 'releases' && (
                    <Card>
                        {releases.length === 0 ? (
                            <div className="empty-state"><span className="empty-icon">📦</span><h3>Belum ada release</h3><p>Klik "Buat Release" untuk membuat call-off baru</p></div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {releases.map(r => (
                                    <div key={r.id} style={{
                                        border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px',
                                        borderLeft: `4px solid ${r.status === 'DELIVERED' ? '#10b981' : r.status === 'RELEASED' ? '#f59e0b' : r.status === 'CANCELLED' ? '#ef4444' : '#94a3b8'}`,
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                            <div>
                                                <strong style={{ fontSize: '15px' }}>{r.release_number}</strong>
                                                <span className={`status-badge ${RELEASE_COLORS[r.status] || 'gray'}`} style={{ marginLeft: '8px' }}>{r.status}</span>
                                            </div>
                                            <div style={{ fontSize: '13px', color: '#64748b' }}>
                                                {r.requested_date ? `📅 ${formatDate(r.requested_date)}` : 'Tanggal belum ditentukan'}
                                            </div>
                                        </div>
                                        <div style={{ fontSize: '13px', color: '#475569', marginBottom: '8px' }}>
                                            {(r.lines || []).map(l => `${l.description} × ${l.qty}`).join(' • ')}
                                            <span style={{ fontWeight: '600', marginLeft: '8px' }}>({r.total_qty} pcs)</span>
                                        </div>
                                        {r.notes && <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>📝 {r.notes}</div>}
                                        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                                            {r.status === 'PLANNED' && (
                                                <>
                                                    <Button size="sm" variant="primary" onClick={() => handleConfirmRelease(r.id)} loading={actionLoading === r.id}>✓ Konfirmasi → DO</Button>
                                                    <Button size="sm" variant="danger" onClick={() => handleCancelRelease(r.id)} loading={actionLoading === r.id}>✕ Cancel</Button>
                                                </>
                                            )}
                                            {r.status === 'RELEASED' && (
                                                <Button size="sm" variant="success" onClick={() => handleDeliverRelease(r.id)} loading={actionLoading === r.id}>✓ Delivered → Invoice</Button>
                                            )}
                                            {r.status === 'DELIVERED' && r.invoice_id && (
                                                <span style={{ fontSize: '12px', color: '#10b981' }}>✅ Invoice dibuat</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>
                )}

                {/* ── TAB: INVOICES ── */}
                {activeTab === 'invoices' && (
                    <Card>
                        <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                            <Button variant="primary" onClick={handleSummaryInvoice} loading={actionLoading === 'summary'}>📊 Buat Invoice Akumulasi</Button>
                        </div>
                        <table className="data-table">
                            <thead><tr><th>Release</th><th>Invoice</th><th>Tanggal</th><th>Status</th><th>Total</th></tr></thead>
                            <tbody>
                                {releases.filter(r => r.invoice_id).map(r => (
                                    <tr key={r.id}>
                                        <td>{r.release_number}</td>
                                        <td>Invoice #{r.invoice_id}</td>
                                        <td>{formatDate(r.actual_date)}</td>
                                        <td><span className="status-badge green">DELIVERED</span></td>
                                        <td>{formatCurrency((r.lines || []).reduce((s, l) => {
                                            const soLine = (so.lines || []).find(sl => sl.id === l.so_line_id);
                                            return s + (l.qty * (soLine?.unit_price || 0));
                                        }, 0))}</td>
                                    </tr>
                                ))}
                                {releases.filter(r => r.invoice_id).length === 0 && (
                                    <tr><td colSpan={5} style={{ textAlign: 'center', color: '#94a3b8', padding: '24px' }}>Belum ada invoice</td></tr>
                                )}
                            </tbody>
                        </table>
                    </Card>
                )}

                {/* ── Release Form Modal ── */}
                {showReleaseForm && (
                    <div className="modal-overlay" onClick={() => setShowReleaseForm(false)}>
                        <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '700px' }}>
                            <div className="modal-header">
                                <h3>📦 Buat Release / Call-off Baru</h3>
                                <button onClick={() => setShowReleaseForm(false)}>✕</button>
                            </div>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label>Tanggal Kirim</label>
                                    <input type="date" value={releaseForm.requested_date} onChange={e => setReleaseForm(f => ({ ...f, requested_date: e.target.value }))} />
                                </div>
                                <h4 style={{ margin: '16px 0 8px' }}>Pilih Item & Qty</h4>
                                <table className="data-table">
                                    <thead><tr><th>Item</th><th>Sisa</th><th>Qty Release</th></tr></thead>
                                    <tbody>
                                        {releaseForm.lines.map((l, i) => (
                                            <tr key={l.so_line_id}>
                                                <td>{l.description}</td>
                                                <td>{l.max_qty}</td>
                                                <td>
                                                    <input type="number" min={0} max={l.max_qty} value={l.qty}
                                                        onChange={e => {
                                                            const val = Math.min(parseInt(e.target.value) || 0, l.max_qty);
                                                            setReleaseForm(f => {
                                                                const lines = [...f.lines];
                                                                lines[i] = { ...lines[i], qty: val };
                                                                return { ...f, lines };
                                                            });
                                                        }}
                                                        style={{ width: '80px' }}
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <div className="form-group" style={{ marginTop: '12px' }}>
                                    <label>Catatan</label>
                                    <textarea value={releaseForm.notes} onChange={e => setReleaseForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <Button variant="secondary" onClick={() => setShowReleaseForm(false)}>Batal</Button>
                                <Button variant="primary" onClick={handleCreateRelease} loading={actionLoading === 'release'}>✓ Buat Release</Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return null;
}
