/**
 * Giro Dashboard - Post-dated cheque management
 */
import { useState, useEffect } from 'react';
import Card from '../../components/common/Card/Card';
import Button from '../../components/common/Button/Button';
import StatusBadge from '../../components/common/Badge/StatusBadge';
import Modal from '../../components/common/Modal/Modal';
import '../Admin/Admin.css';

const API_BASE_URL = import.meta.env.VITE_AI_API_URL || 'http://localhost:8000';

export default function GiroDashboard() {
    const [loading, setLoading] = useState(true);
    const [dashboard, setDashboard] = useState(null);
    const [giros, setGiros] = useState([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newGiro, setNewGiro] = useState({
        giro_number: '', bank_name: '', amount: 0, due_date: '',
        customer_name: '', invoice_number: ''
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [dashRes, listRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/v1/giro/dashboard`),
                fetch(`${API_BASE_URL}/api/v1/giro`)
            ]);
            const dashData = await dashRes.json();
            const listData = await listRes.json();
            if (dashData.status === 'success') setDashboard(dashData.data);
            if (listData.status === 'success') setGiros(listData.data || []);
        } catch (err) {
            console.error('Error loading giro data:', err);
        }
        setLoading(false);
    };

    const createGiro = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/giro`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newGiro)
            });
            if (res.ok) {
                setShowAddModal(false);
                setNewGiro({ giro_number: '', bank_name: '', amount: 0, due_date: '', customer_name: '', invoice_number: '' });
                loadData();
            }
        } catch (err) {
            console.error('Error creating giro:', err);
        }
    };

    const performAction = async (id, action, body = {}) => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/giro/${id}/${action}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            if (res.ok) loadData();
        } catch (err) {
            console.error(`Error ${action}:`, err);
        }
    };

    const getStatusBadge = (status) => {
        const map = { 'RECEIVED': 'info', 'DEPOSITED': 'warning', 'CLEARED': 'success', 'BOUNCED': 'danger' };
        return <StatusBadge status={map[status] || 'default'}>{status}</StatusBadge>;
    };

    const formatCurrency = (amount) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount || 0);

    return (
        <div className="admin-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">💳 Giro Mundur</h1>
                    <p className="page-subtitle">Manajemen bilyet giro jatuh tempo</p>
                </div>
                <div className="header-actions">
                    <Button variant="secondary" onClick={loadData}>🔄 Refresh</Button>
                    <Button variant="primary" onClick={() => setShowAddModal(true)}>➕ Tambah Giro</Button>
                </div>
            </div>

            {/* Reminder Cards */}
            {dashboard && (
                <div className="summary-grid">
                    <Card className="summary-card danger">
                        <div className="summary-content">
                            <span className="summary-value">{dashboard.reminders?.overdue?.count || 0}</span>
                            <span className="summary-label">⚠️ Overdue</span>
                            <span className="summary-amount">{formatCurrency(dashboard.reminders?.overdue?.amount)}</span>
                        </div>
                    </Card>
                    <Card className="summary-card warning">
                        <div className="summary-content">
                            <span className="summary-value">{dashboard.reminders?.due_today?.count || 0}</span>
                            <span className="summary-label">📅 Jatuh Tempo Hari Ini</span>
                            <span className="summary-amount">{formatCurrency(dashboard.reminders?.due_today?.amount)}</span>
                        </div>
                    </Card>
                    <Card className="summary-card">
                        <div className="summary-content">
                            <span className="summary-value">{dashboard.reminders?.due_this_week?.count || 0}</span>
                            <span className="summary-label">📆 Minggu Ini</span>
                            <span className="summary-amount">{formatCurrency(dashboard.reminders?.due_this_week?.amount)}</span>
                        </div>
                    </Card>
                    <Card className="summary-card success">
                        <div className="summary-content">
                            <span className="summary-value">{formatCurrency(dashboard.pending_total)}</span>
                            <span className="summary-label">Total Pending</span>
                        </div>
                    </Card>
                </div>
            )}

            {/* Giro List */}
            <div className="log-list">
                {loading ? (
                    <div className="loading-state">Memuat giro...</div>
                ) : giros.length === 0 ? (
                    <Card className="empty-state"><p>Belum ada giro</p></Card>
                ) : (
                    giros.map(g => (
                        <Card key={g.id} className="log-card">
                            <div className="log-header">
                                <span className="transfer-number">{g.giro_number}</span>
                                {getStatusBadge(g.status)}
                                <span className="log-entity">{g.bank_name}</span>
                                <span className="log-time">JT: {g.due_date}</span>
                            </div>
                            <div className="log-body" style={{ paddingLeft: 0 }}>
                                <div className="log-detail">
                                    <span className="log-user">👤 {g.customer_name}</span>
                                    <span className="asset-value-amount book-value">{formatCurrency(g.amount)}</span>
                                </div>
                                <div className="transfer-actions">
                                    {g.status === 'RECEIVED' && (
                                        <Button size="sm" variant="warning" onClick={() => performAction(g.id, 'deposit')}>📥 Setor ke Bank</Button>
                                    )}
                                    {['RECEIVED', 'DEPOSITED'].includes(g.status) && (
                                        <>
                                            <Button size="sm" variant="success" onClick={() => performAction(g.id, 'clear')}>✅ Cair</Button>
                                            <Button size="sm" variant="danger" onClick={() => {
                                                const reason = prompt('Alasan tolak:');
                                                if (reason) performAction(g.id, 'bounce', { reason, fee: 0 });
                                            }}>❌ Tolak</Button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </Card>
                    ))
                )}
            </div>

            {/* Add Modal */}
            {showAddModal && (
                <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Tambah Giro Baru" size="medium">
                    <div className="form-grid">
                        <div className="form-group">
                            <label>Nomor Giro</label>
                            <input type="text" value={newGiro.giro_number} onChange={(e) => setNewGiro({ ...newGiro, giro_number: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label>Bank</label>
                            <input type="text" value={newGiro.bank_name} onChange={(e) => setNewGiro({ ...newGiro, bank_name: e.target.value })} placeholder="BCA, Mandiri, dll" />
                        </div>
                        <div className="form-group">
                            <label>Customer</label>
                            <input type="text" value={newGiro.customer_name} onChange={(e) => setNewGiro({ ...newGiro, customer_name: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label>Jumlah (Rp)</label>
                            <input type="number" value={newGiro.amount} onChange={(e) => setNewGiro({ ...newGiro, amount: parseFloat(e.target.value) })} />
                        </div>
                        <div className="form-group">
                            <label>Tanggal Jatuh Tempo</label>
                            <input type="date" value={newGiro.due_date} onChange={(e) => setNewGiro({ ...newGiro, due_date: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label>No. Invoice (opsional)</label>
                            <input type="text" value={newGiro.invoice_number} onChange={(e) => setNewGiro({ ...newGiro, invoice_number: e.target.value })} />
                        </div>
                    </div>
                    <div className="modal-actions">
                        <Button variant="secondary" onClick={() => setShowAddModal(false)}>Batal</Button>
                        <Button variant="primary" onClick={createGiro}>💾 Simpan</Button>
                    </div>
                </Modal>
            )}
        </div>
    );
}
