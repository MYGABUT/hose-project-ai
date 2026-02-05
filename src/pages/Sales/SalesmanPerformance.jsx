/**
 * Salesman Performance Page
 */
import { useState, useEffect } from 'react';
import Card from '../../components/common/Card/Card';
import Button from '../../components/common/Button/Button';
import StatusBadge from '../../components/common/Badge/StatusBadge';
import '../Admin/Admin.css';

const API_BASE_URL = import.meta.env.VITE_AI_API_URL || 'http://localhost:8000';

export default function SalesmanPerformance() {
    const [loading, setLoading] = useState(true);
    const [salesmen, setSalesmen] = useState([]);
    const [performance, setPerformance] = useState([]);
    const [selectedPeriod, setSelectedPeriod] = useState({ year: new Date().getFullYear(), month: new Date().getMonth() + 1 });

    useEffect(() => {
        loadData();
    }, [selectedPeriod]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [listRes, perfRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/v1/salesmen`),
                fetch(`${API_BASE_URL}/api/v1/salesmen/performance?year=${selectedPeriod.year}&month=${selectedPeriod.month}`)
            ]);
            const listData = await listRes.json();
            const perfData = await perfRes.json();
            if (listData.status === 'success') setSalesmen(listData.data || []);
            if (perfData.status === 'success') setPerformance(perfData.data || []);
        } catch (err) {
            console.error('Error loading salesmen:', err);
        }
        setLoading(false);
    };

    const formatCurrency = (amount) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount || 0);

    const getAchievementColor = (pct) => {
        if (pct >= 100) return 'success';
        if (pct >= 70) return 'warning';
        return 'danger';
    };

    return (
        <div className="admin-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">📊 Performa Sales</h1>
                    <p className="page-subtitle">Target, omset, dan komisi per salesman</p>
                </div>
                <div className="header-actions">
                    <select
                        value={selectedPeriod.month}
                        onChange={(e) => setSelectedPeriod({ ...selectedPeriod, month: parseInt(e.target.value) })}
                        style={{ padding: '8px', borderRadius: '6px', marginRight: '8px' }}
                    >
                        {Array.from({ length: 12 }, (_, i) => (
                            <option key={i + 1} value={i + 1}>{new Date(2000, i).toLocaleString('id-ID', { month: 'long' })}</option>
                        ))}
                    </select>
                    <select
                        value={selectedPeriod.year}
                        onChange={(e) => setSelectedPeriod({ ...selectedPeriod, year: parseInt(e.target.value) })}
                        style={{ padding: '8px', borderRadius: '6px' }}
                    >
                        {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="summary-grid">
                <Card className="summary-card">
                    <div className="summary-content">
                        <span className="summary-value">{salesmen.length}</span>
                        <span className="summary-label">Total Salesman</span>
                    </div>
                </Card>
                <Card className="summary-card success">
                    <div className="summary-content">
                        <span className="summary-value">{performance.filter(p => p.is_top_performer).length}</span>
                        <span className="summary-label">🏆 Capai Target</span>
                    </div>
                </Card>
                <Card className="summary-card">
                    <div className="summary-content">
                        <span className="summary-value">{formatCurrency(performance.reduce((sum, p) => sum + p.total_sales, 0))}</span>
                        <span className="summary-label">Total Omset</span>
                    </div>
                </Card>
                <Card className="summary-card warning">
                    <div className="summary-content">
                        <span className="summary-value">{formatCurrency(performance.reduce((sum, p) => sum + p.total_commission, 0))}</span>
                        <span className="summary-label">Total Komisi</span>
                    </div>
                </Card>
            </div>

            {/* Performance List */}
            <div className="asset-list">
                {loading ? (
                    <div className="loading-state">Memuat data...</div>
                ) : performance.length === 0 ? (
                    <Card className="empty-state"><p>Belum ada data performa</p></Card>
                ) : (
                    performance.map((p, idx) => (
                        <Card key={p.salesman_id} className={`asset-card ${p.is_top_performer ? 'machine' : ''}`}>
                            <div className="asset-header">
                                <div>
                                    <div className="asset-name">
                                        {idx === 0 && '🥇'} {idx === 1 && '🥈'} {idx === 2 && '🥉'} {p.salesman_name}
                                    </div>
                                    <div className="asset-number">{p.code}</div>
                                </div>
                                <StatusBadge status={getAchievementColor(p.achievement_percent)}>
                                    {p.achievement_percent.toFixed(0)}%
                                </StatusBadge>
                            </div>

                            {/* Progress Bar */}
                            <div style={{ background: '#e5e7eb', borderRadius: '4px', height: '8px', margin: '12px 0' }}>
                                <div style={{
                                    width: `${Math.min(p.achievement_percent, 100)}%`,
                                    height: '100%',
                                    background: p.is_top_performer ? '#10b981' : '#f59e0b',
                                    borderRadius: '4px',
                                    transition: 'width 0.5s'
                                }} />
                            </div>

                            <dl className="asset-info">
                                <dt>Target</dt>
                                <dd>{formatCurrency(p.monthly_target)}</dd>
                                <dt>Omset</dt>
                                <dd style={{ color: '#10b981' }}>{formatCurrency(p.total_sales)}</dd>
                            </dl>

                            <div className="asset-values">
                                <div className="asset-value">
                                    <span className="asset-value-label">Rate Komisi</span>
                                    <span className="asset-value-amount">{p.commission_rate}%</span>
                                </div>
                                <div className="asset-value">
                                    <span className="asset-value-label">Komisi</span>
                                    <span className="asset-value-amount book-value">{formatCurrency(p.total_commission)}</span>
                                </div>
                            </div>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
