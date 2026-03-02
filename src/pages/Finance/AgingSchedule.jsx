/**
 * Aging Schedule Report - Piutang grouped by age
 * Shows Current, 1-30, 31-60, 61-90, >90 days buckets
 */
import { useState, useEffect } from 'react';
import Card from '../../components/common/Card/Card';
import Button from '../../components/common/Button/Button';
import './Finance.css';

const API_BASE_URL = import.meta.env.VITE_AI_API_URL || "";

export default function AgingSchedule() {
    const [loading, setLoading] = useState(true);
    const [agingData, setAgingData] = useState(null);
    const [summary, setSummary] = useState(null);
    const [expandedBucket, setExpandedBucket] = useState(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/so/piutang/aging`);
            const data = await res.json();
            if (data.status === 'success') {
                setAgingData(data.aging);
                setSummary(data.summary);
            }
        } catch (err) {
            console.error('Error loading aging data:', err);
        }
        setLoading(false);
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(amount || 0);
    };

    const bucketConfig = {
        current: { label: 'Belum Jatuh Tempo', color: '#10b981', emoji: '✅' },
        '1_30': { label: '1-30 Hari', color: '#f59e0b', emoji: '⏰' },
        '31_60': { label: '31-60 Hari', color: '#f97316', emoji: '⚠️' },
        '61_90': { label: '61-90 Hari', color: '#ef4444', emoji: '🚨' },
        'over_90': { label: '>90 Hari (Macet)', color: '#991b1b', emoji: '💀' }
    };

    if (loading) {
        return <div className="loading-state">Memuat laporan aging...</div>;
    }

    return (
        <div className="finance-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">📊 Aging Schedule (Umur Piutang)</h1>
                    <p className="page-subtitle">Analisis piutang berdasarkan keterlambatan pembayaran</p>
                </div>
                <div className="header-actions">
                    <Button variant="secondary" onClick={loadData}>🔄 Refresh</Button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="summary-grid">
                <Card className="summary-card total">
                    <div className="summary-icon">💰</div>
                    <div className="summary-content">
                        <span className="summary-value">{formatCurrency(summary?.total_piutang)}</span>
                        <span className="summary-label">Total Piutang</span>
                    </div>
                </Card>

                <Card className="summary-card warning">
                    <div className="summary-icon">⚠️</div>
                    <div className="summary-content">
                        <span className="summary-value">{formatCurrency(summary?.overdue_amount)}</span>
                        <span className="summary-label">Total Telat Bayar</span>
                    </div>
                </Card>

                <Card className="summary-card alert" style={{ background: 'linear-gradient(135deg, #991b1b 0%, #7f1d1d 100%)' }}>
                    <div className="summary-icon">💀</div>
                    <div className="summary-content">
                        <span className="summary-value">{formatCurrency(summary?.macet_amount)}</span>
                        <span className="summary-label">Piutang Macet (&gt;90d)</span>
                    </div>
                </Card>

                <Card className="summary-card info">
                    <div className="summary-icon">📋</div>
                    <div className="summary-content">
                        <span className="summary-value">{summary?.total_orders || 0}</span>
                        <span className="summary-label">Total Invoice</span>
                    </div>
                </Card>
            </div>

            {/* Aging Buckets */}
            <div className="aging-buckets">
                <h2 className="section-title">📈 Breakdown Umur Piutang</h2>

                {agingData && Object.entries(bucketConfig).map(([key, config]) => {
                    const bucket = agingData[key];
                    if (!bucket) return null;

                    const isExpanded = expandedBucket === key;

                    return (
                        <Card
                            key={key}
                            className={`aging-bucket ${bucket.count > 0 ? 'has-data' : ''}`}
                            style={{ borderLeftColor: config.color }}
                        >
                            <div
                                className="bucket-header"
                                onClick={() => setExpandedBucket(isExpanded ? null : key)}
                            >
                                <div className="bucket-info">
                                    <span className="bucket-emoji">{config.emoji}</span>
                                    <span className="bucket-label">{config.label}</span>
                                </div>
                                <div className="bucket-stats">
                                    <span className="bucket-count" style={{ color: config.color }}>
                                        {bucket.count} invoice
                                    </span>
                                    <span className="bucket-total">{formatCurrency(bucket.total)}</span>
                                    <span className="bucket-percent">{bucket.percentage}%</span>
                                    {bucket.count > 0 && (
                                        <span className="bucket-expand">{isExpanded ? '▼' : '▶'}</span>
                                    )}
                                </div>
                            </div>

                            {/* Progress bar */}
                            <div className="bucket-progress">
                                <div
                                    className="progress-fill"
                                    style={{
                                        width: `${bucket.percentage}%`,
                                        backgroundColor: config.color
                                    }}
                                />
                            </div>

                            {/* Expanded order list */}
                            {isExpanded && bucket.orders?.length > 0 && (
                                <div className="bucket-orders">
                                    {bucket.orders.map((order, idx) => (
                                        <div key={idx} className="order-row">
                                            <span className="order-number">{order.so_number}</span>
                                            <span className="order-customer">{order.customer_name}</span>
                                            <span className="order-overdue">
                                                {order.days_overdue > 0 ? `${order.days_overdue} hari telat` : 'On time'}
                                            </span>
                                            <span className="order-amount">{formatCurrency(order.amount_due)}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
