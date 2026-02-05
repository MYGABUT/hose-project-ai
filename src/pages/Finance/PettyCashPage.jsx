/**
 * Petty Cash (Kas Kecil) Page
 */
import { useState, useEffect } from 'react';
import Card from '../../components/common/Card/Card';
import Button from '../../components/common/Button/Button';
import StatusBadge from '../../components/common/Badge/StatusBadge';
import Modal from '../../components/common/Modal/Modal';
import '../Admin/Admin.css';

const API_BASE_URL = import.meta.env.VITE_AI_API_URL || 'http://localhost:8000';

const CATEGORIES = [
    { value: 'TRANSPORT', label: '🚗 Transport', icon: '🚗' },
    { value: 'SUPPLIES', label: '📦 Supplies', icon: '📦' },
    { value: 'LABOR', label: '👷 Kuli', icon: '👷' },
    { value: 'SECURITY', label: '🔒 Keamanan', icon: '🔒' },
    { value: 'MEALS', label: '🍽️ Makan', icon: '🍽️' },
    { value: 'OTHER', label: '📝 Lainnya', icon: '📝' },
];

export default function PettyCashPage() {
    const [loading, setLoading] = useState(true);
    const [balance, setBalance] = useState(0);
    const [transactions, setTransactions] = useState([]);
    const [summary, setSummary] = useState(null);
    const [showExpenseModal, setShowExpenseModal] = useState(false);
    const [showTopupModal, setShowTopupModal] = useState(false);
    const [expense, setExpense] = useState({ category: 'TRANSPORT', amount: 0, description: '', recipient: '' });
    const [topupAmount, setTopupAmount] = useState(0);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [txRes, sumRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/v1/petty-cash`),
                fetch(`${API_BASE_URL}/api/v1/petty-cash/summary`)
            ]);
            const txData = await txRes.json();
            const sumData = await sumRes.json();
            if (txData.status === 'success') {
                setTransactions(txData.data || []);
                setBalance(txData.current_balance || 0);
            }
            if (sumData.status === 'success') setSummary(sumData);
        } catch (err) {
            console.error('Error loading petty cash:', err);
        }
        setLoading(false);
    };

    const recordExpense = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/petty-cash/expense`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(expense)
            });
            const data = await res.json();
            if (data.status === 'success') {
                setShowExpenseModal(false);
                setExpense({ category: 'TRANSPORT', amount: 0, description: '', recipient: '' });
                loadData();
            } else {
                alert(data.detail || 'Error');
            }
        } catch (err) {
            console.error('Error recording expense:', err);
        }
    };

    const topUp = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/petty-cash/topup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: topupAmount, description: 'Top-up kas kecil' })
            });
            if (res.ok) {
                setShowTopupModal(false);
                setTopupAmount(0);
                loadData();
            }
        } catch (err) {
            console.error('Error top-up:', err);
        }
    };

    const formatCurrency = (amount) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount || 0);

    const getCategoryIcon = (cat) => CATEGORIES.find(c => c.value === cat)?.icon || '📝';

    return (
        <div className="admin-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">💵 Kas Kecil</h1>
                    <p className="page-subtitle">Pengeluaran operasional harian</p>
                </div>
                <div className="header-actions">
                    <Button variant="secondary" onClick={() => setShowTopupModal(true)}>💰 Top-up</Button>
                    <Button variant="primary" onClick={() => setShowExpenseModal(true)}>💸 Catat Pengeluaran</Button>
                </div>
            </div>

            {/* Balance Card */}
            <div className="summary-grid">
                <Card className="summary-card success" style={{ gridColumn: 'span 2' }}>
                    <div className="summary-content">
                        <span className="summary-label">Saldo Saat Ini</span>
                        <span className="summary-value" style={{ fontSize: '36px' }}>{formatCurrency(balance)}</span>
                    </div>
                </Card>
                <Card className="summary-card warning">
                    <div className="summary-content">
                        <span className="summary-value">{formatCurrency(summary?.total_expenses || 0)}</span>
                        <span className="summary-label">Pengeluaran Bulan Ini</span>
                    </div>
                </Card>
            </div>

            {/* Category Summary */}
            {summary?.by_category && (
                <Card style={{ marginBottom: '20px' }}>
                    <h3 style={{ marginBottom: '12px' }}>📊 Per Kategori</h3>
                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                        {Object.entries(summary.by_category).map(([cat, data]) => (
                            <div key={cat} style={{ background: 'var(--color-surface)', padding: '12px 16px', borderRadius: '8px', minWidth: '120px' }}>
                                <div style={{ fontSize: '20px' }}>{getCategoryIcon(cat)}</div>
                                <div style={{ fontWeight: 600 }}>{formatCurrency(data.total)}</div>
                                <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>{cat}</div>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {/* Transaction List */}
            <div className="log-list">
                {loading ? (
                    <div className="loading-state">Memuat transaksi...</div>
                ) : transactions.length === 0 ? (
                    <Card className="empty-state"><p>Belum ada transaksi</p></Card>
                ) : (
                    transactions.map(tx => (
                        <Card key={tx.id} className="log-card">
                            <div className="log-header">
                                <span className="log-time">{tx.transaction_date}</span>
                                <StatusBadge status={tx.transaction_type === 'IN' ? 'success' : 'warning'}>
                                    {tx.transaction_type === 'IN' ? 'MASUK' : 'KELUAR'}
                                </StatusBadge>
                                <span className="log-entity">{getCategoryIcon(tx.category)} {tx.category}</span>
                            </div>
                            <div className="log-body" style={{ paddingLeft: 0 }}>
                                <div className="log-detail">
                                    <span>{tx.description}</span>
                                    <span className={`asset-value-amount ${tx.transaction_type === 'IN' ? 'book-value' : ''}`} style={{ color: tx.transaction_type === 'OUT' ? '#ef4444' : undefined }}>
                                        {tx.transaction_type === 'OUT' ? '-' : '+'}{formatCurrency(tx.amount)}
                                    </span>
                                </div>
                                {tx.recipient && <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>→ {tx.recipient}</div>}
                            </div>
                        </Card>
                    ))
                )}
            </div>

            {/* Expense Modal */}
            {showExpenseModal && (
                <Modal isOpen={showExpenseModal} onClose={() => setShowExpenseModal(false)} title="Catat Pengeluaran" size="medium">
                    <div className="form-grid">
                        <div className="form-group">
                            <label>Kategori</label>
                            <select value={expense.category} onChange={(e) => setExpense({ ...expense, category: e.target.value })}>
                                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Jumlah (Rp)</label>
                            <input type="number" value={expense.amount} onChange={(e) => setExpense({ ...expense, amount: parseFloat(e.target.value) })} />
                        </div>
                        <div className="form-group" style={{ gridColumn: 'span 2' }}>
                            <label>Keterangan</label>
                            <input type="text" value={expense.description} onChange={(e) => setExpense({ ...expense, description: e.target.value })} placeholder="Bensin mobil operasional" />
                        </div>
                        <div className="form-group">
                            <label>Penerima (opsional)</label>
                            <input type="text" value={expense.recipient} onChange={(e) => setExpense({ ...expense, recipient: e.target.value })} placeholder="Nama sopir/kuli" />
                        </div>
                    </div>
                    <div className="modal-actions">
                        <Button variant="secondary" onClick={() => setShowExpenseModal(false)}>Batal</Button>
                        <Button variant="primary" onClick={recordExpense}>💾 Simpan</Button>
                    </div>
                </Modal>
            )}

            {/* Top-up Modal */}
            {showTopupModal && (
                <Modal isOpen={showTopupModal} onClose={() => setShowTopupModal(false)} title="Top-up Kas Kecil" size="small">
                    <div className="form-group">
                        <label>Jumlah Top-up (Rp)</label>
                        <input type="number" value={topupAmount} onChange={(e) => setTopupAmount(parseFloat(e.target.value))} />
                    </div>
                    <div className="modal-actions">
                        <Button variant="secondary" onClick={() => setShowTopupModal(false)}>Batal</Button>
                        <Button variant="primary" onClick={topUp}>💰 Top-up</Button>
                    </div>
                </Modal>
            )}
        </div>
    );
}
