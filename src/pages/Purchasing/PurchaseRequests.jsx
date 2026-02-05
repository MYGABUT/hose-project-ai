/**
 * Purchase Request Page - Create PR and view approval status
 * Flow: Create -> Submit -> Wait for Approval -> Convert to PO
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/common/Card/Card';
import Button from '../../components/common/Button/Button';
import StatusBadge from '../../components/common/Badge/StatusBadge';
import Modal from '../../components/common/Modal/Modal';
import './Purchasing.css';

const API_BASE_URL = import.meta.env.VITE_AI_API_URL || 'http://localhost:8000';

export default function PurchaseRequests() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [prs, setPRs] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [selectedPR, setSelectedPR] = useState(null);
    const [filter, setFilter] = useState('ALL');

    // Form state
    const [formData, setFormData] = useState({
        supplier_name: '',
        required_date: '',
        priority: 'NORMAL',
        requested_by: 'Gudang',
        notes: '',
        lines: [{ product_name: '', qty_requested: 1, unit: 'PCS', estimated_price: 0 }]
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/pr`);
            const data = await res.json();
            if (data.status === 'success') {
                setPRs(data.data || []);
            }
        } catch (err) {
            console.error('Error loading PRs:', err);
        }
        setLoading(false);
    };

    const handleSubmit = async () => {
        if (!formData.lines.some(l => l.product_name && l.qty_requested > 0)) {
            alert('Minimal 1 item dengan nama dan qty');
            return;
        }

        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/pr`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const data = await res.json();
            if (data.status === 'success') {
                setShowModal(false);
                loadData();
                // Reset form
                setFormData({
                    supplier_name: '',
                    required_date: '',
                    priority: 'NORMAL',
                    requested_by: 'Gudang',
                    notes: '',
                    lines: [{ product_name: '', qty_requested: 1, unit: 'PCS', estimated_price: 0 }]
                });
            }
        } catch (err) {
            console.error('Error creating PR:', err);
        }
    };

    const submitForApproval = async (prId) => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/pr/${prId}/submit`, {
                method: 'POST'
            });
            const data = await res.json();
            if (data.status === 'success') {
                loadData();
            }
        } catch (err) {
            console.error('Error submitting PR:', err);
        }
    };

    const addLine = () => {
        setFormData(prev => ({
            ...prev,
            lines: [...prev.lines, { product_name: '', qty_requested: 1, unit: 'PCS', estimated_price: 0 }]
        }));
    };

    const updateLine = (idx, field, value) => {
        setFormData(prev => {
            const newLines = [...prev.lines];
            newLines[idx] = { ...newLines[idx], [field]: value };
            return { ...prev, lines: newLines };
        });
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(amount || 0);
    };

    const getStatusBadge = (status) => {
        const statusMap = {
            'DRAFT': 'default',
            'PENDING': 'warning',
            'APPROVED': 'success',
            'REJECTED': 'danger',
            'ORDERED': 'info'
        };
        return <StatusBadge status={statusMap[status] || 'default'}>{status}</StatusBadge>;
    };

    const getPriorityColor = (priority) => {
        const colors = {
            'LOW': '#22c55e',
            'NORMAL': '#3b82f6',
            'HIGH': '#f59e0b',
            'URGENT': '#ef4444'
        };
        return colors[priority] || colors.NORMAL;
    };

    const filteredPRs = filter === 'ALL'
        ? prs
        : prs.filter(pr => pr.status === filter);

    return (
        <div className="purchasing-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">📝 Purchase Request</h1>
                    <p className="page-subtitle">Buat permintaan barang untuk di-approve</p>
                </div>
                <div className="header-actions">
                    <Button variant="secondary" onClick={loadData}>🔄 Refresh</Button>
                    <Button variant="primary" onClick={() => setShowModal(true)}>
                        ➕ Buat PR Baru
                    </Button>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="filter-tabs">
                {['ALL', 'DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'ORDERED'].map(status => (
                    <button
                        key={status}
                        className={`filter-tab ${filter === status ? 'active' : ''}`}
                        onClick={() => setFilter(status)}
                    >
                        {status === 'ALL' ? 'Semua' : status}
                        <span className="tab-count">
                            {status === 'ALL' ? prs.length : prs.filter(p => p.status === status).length}
                        </span>
                    </button>
                ))}
            </div>

            {/* PR List */}
            <div className="pr-list">
                {loading ? (
                    <div className="loading-state">Memuat data...</div>
                ) : filteredPRs.length === 0 ? (
                    <Card className="empty-state">
                        <p>Belum ada Purchase Request</p>
                        <Button onClick={() => setShowModal(true)}>➕ Buat PR Pertama</Button>
                    </Card>
                ) : (
                    filteredPRs.map(pr => (
                        <Card key={pr.id} className="pr-card">
                            <div className="pr-header">
                                <div className="pr-number">{pr.pr_number}</div>
                                {getStatusBadge(pr.status)}
                                <div
                                    className="pr-priority"
                                    style={{ backgroundColor: getPriorityColor(pr.priority) }}
                                >
                                    {pr.priority}
                                </div>
                            </div>
                            <div className="pr-body">
                                <div className="pr-info">
                                    <span className="info-label">Supplier:</span>
                                    <span className="info-value">{pr.supplier_name || '-'}</span>
                                </div>
                                <div className="pr-info">
                                    <span className="info-label">Dibutuhkan:</span>
                                    <span className="info-value">{pr.required_date || '-'}</span>
                                </div>
                                <div className="pr-info">
                                    <span className="info-label">Est. Total:</span>
                                    <span className="info-value">{formatCurrency(pr.estimated_total)}</span>
                                </div>
                                <div className="pr-info">
                                    <span className="info-label">Items:</span>
                                    <span className="info-value">{pr.line_count} item</span>
                                </div>
                            </div>
                            <div className="pr-footer">
                                <span className="pr-date">
                                    Dibuat: {new Date(pr.created_at).toLocaleDateString('id-ID')}
                                </span>
                                <div className="pr-actions">
                                    {pr.status === 'DRAFT' && (
                                        <Button
                                            size="sm"
                                            variant="primary"
                                            onClick={() => submitForApproval(pr.id)}
                                        >
                                            📤 Submit
                                        </Button>
                                    )}
                                    {pr.status === 'APPROVED' && !pr.po_id && (
                                        <Button
                                            size="sm"
                                            variant="success"
                                            onClick={() => navigate(`/purchasing/convert-po/${pr.id}`)}
                                        >
                                            🔄 Buat PO
                                        </Button>
                                    )}
                                    {pr.po_number && (
                                        <span className="po-link">→ {pr.po_number}</span>
                                    )}
                                </div>
                            </div>
                        </Card>
                    ))
                )}
            </div>

            {/* Create PR Modal */}
            {showModal && (
                <Modal
                    isOpen={showModal}
                    onClose={() => setShowModal(false)}
                    title="Buat Purchase Request Baru"
                    size="large"
                >
                    <div className="pr-form">
                        <div className="form-row">
                            <div className="form-group">
                                <label>Supplier</label>
                                <input
                                    type="text"
                                    value={formData.supplier_name}
                                    onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
                                    placeholder="Nama supplier (opsional)"
                                />
                            </div>
                            <div className="form-group">
                                <label>Dibutuhkan Tanggal</label>
                                <input
                                    type="date"
                                    value={formData.required_date}
                                    onChange={(e) => setFormData({ ...formData, required_date: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Prioritas</label>
                                <select
                                    value={formData.priority}
                                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                                >
                                    <option value="LOW">Low</option>
                                    <option value="NORMAL">Normal</option>
                                    <option value="HIGH">High</option>
                                    <option value="URGENT">Urgent</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Diminta Oleh</label>
                                <input
                                    type="text"
                                    value={formData.requested_by}
                                    onChange={(e) => setFormData({ ...formData, requested_by: e.target.value })}
                                />
                            </div>
                        </div>

                        <h4>📦 Item yang Diminta</h4>
                        <div className="pr-lines">
                            {formData.lines.map((line, idx) => (
                                <div key={idx} className="pr-line">
                                    <input
                                        type="text"
                                        placeholder="Nama barang"
                                        value={line.product_name}
                                        onChange={(e) => updateLine(idx, 'product_name', e.target.value)}
                                    />
                                    <input
                                        type="number"
                                        placeholder="Qty"
                                        value={line.qty_requested}
                                        onChange={(e) => updateLine(idx, 'qty_requested', parseFloat(e.target.value) || 0)}
                                        style={{ width: '80px' }}
                                    />
                                    <input
                                        type="text"
                                        placeholder="Unit"
                                        value={line.unit}
                                        onChange={(e) => updateLine(idx, 'unit', e.target.value)}
                                        style={{ width: '60px' }}
                                    />
                                    <input
                                        type="number"
                                        placeholder="Est. Harga"
                                        value={line.estimated_price}
                                        onChange={(e) => updateLine(idx, 'estimated_price', parseFloat(e.target.value) || 0)}
                                        style={{ width: '120px' }}
                                    />
                                </div>
                            ))}
                            <Button size="sm" variant="secondary" onClick={addLine}>
                                ➕ Tambah Item
                            </Button>
                        </div>

                        <div className="form-group">
                            <label>Catatan</label>
                            <textarea
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                placeholder="Catatan tambahan..."
                                rows={2}
                            />
                        </div>

                        <div className="modal-actions">
                            <Button variant="secondary" onClick={() => setShowModal(false)}>
                                Batal
                            </Button>
                            <Button variant="primary" onClick={handleSubmit}>
                                💾 Buat PR
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}
