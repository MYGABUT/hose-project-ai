/**
 * Cash Flow Dashboard - Track money in/out
 */
import { useState, useEffect } from 'react';
import Card from '../../components/common/Card/Card';
import Button from '../../components/common/Button/Button';
import './Finance.css';

const API_BASE_URL = import.meta.env.VITE_AI_API_URL || "";

export default function CashFlowDashboard() {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [period, setPeriod] = useState('month');

    useEffect(() => {
        loadData();
    }, [period]);

    const loadData = async () => {
        setLoading(true);
        try {
            // Calculate dates based on period
            const today = new Date();
            let startDate;

            if (period === 'week') {
                startDate = new Date(today);
                startDate.setDate(today.getDate() - 7);
            } else if (period === 'month') {
                startDate = new Date(today.getFullYear(), today.getMonth(), 1);
            } else if (period === 'quarter') {
                startDate = new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1);
            } else {
                startDate = new Date(today.getFullYear(), 0, 1);
            }

            const params = new URLSearchParams({
                start_date: startDate.toISOString().split('T')[0],
                end_date: today.toISOString().split('T')[0]
            });

            const res = await fetch(`${API_BASE_URL}/api/v1/reports/cash-flow?${params}`);
            const json = await res.json();
            if (json.status === 'success') {
                setData(json);
            }
        } catch (err) {
            console.error('Error loading cash flow:', err);
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

    if (loading) {
        return <div className="loading-state">Memuat laporan arus kas...</div>;
    }

    const { summary, details } = data || {};

    return (
        <div className="finance-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">💵 Arus Kas (Cash Flow)</h1>
                    <p className="page-subtitle">
                        Periode: {data?.period?.start} s/d {data?.period?.end}
                    </p>
                </div>
                <div className="header-actions">
                    <select
                        className="period-select"
                        value={period}
                        onChange={(e) => setPeriod(e.target.value)}
                    >
                        <option value="week">7 Hari</option>
                        <option value="month">Bulan Ini</option>
                        <option value="quarter">Kuartal</option>
                        <option value="year">Tahun Ini</option>
                    </select>
                    <Button variant="secondary" onClick={loadData}>🔄 Refresh</Button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="cash-flow-summary">
                <Card className="flow-card cash-in">
                    <div className="flow-header">
                        <span className="flow-icon">📥</span>
                        <span className="flow-label">Kas Masuk</span>
                    </div>
                    <div className="flow-value positive">
                        {formatCurrency(summary?.cash_in)}
                    </div>
                    <div className="flow-meta">
                        {details?.cash_in_count || 0} transaksi
                    </div>
                </Card>

                <Card className="flow-card cash-out">
                    <div className="flow-header">
                        <span className="flow-icon">📤</span>
                        <span className="flow-label">Kas Keluar</span>
                    </div>
                    <div className="flow-value negative">
                        {formatCurrency(summary?.cash_out)}
                    </div>
                    <div className="flow-meta">
                        {details?.cash_out_count || 0} transaksi
                    </div>
                </Card>

                <Card className={`flow-card net-flow ${summary?.flow_direction}`}>
                    <div className="flow-header">
                        <span className="flow-icon">{summary?.net_cash_flow >= 0 ? '📈' : '📉'}</span>
                        <span className="flow-label">Arus Kas Bersih</span>
                    </div>
                    <div className={`flow-value ${summary?.net_cash_flow >= 0 ? 'positive' : 'negative'}`}>
                        {formatCurrency(summary?.net_cash_flow)}
                    </div>
                    <div className="flow-meta">
                        {summary?.flow_direction === 'positive' ? 'Surplus' : 'Defisit'}
                    </div>
                </Card>
            </div>

            {/* Transaction Details */}
            <div className="cash-flow-details">
                <div className="flow-section">
                    <h3 className="section-title">📥 Kas Masuk (Pembayaran Customer)</h3>
                    {details?.cash_in_items?.length > 0 ? (
                        <div className="transaction-list">
                            {details.cash_in_items.map((item, idx) => (
                                <div key={idx} className="transaction-row">
                                    <span className="tx-date">{item.date?.split('T')[0]}</span>
                                    <span className="tx-number">{item.number}</span>
                                    <span className="tx-name">{item.customer}</span>
                                    <span className="tx-amount positive">+{formatCurrency(item.amount)}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="no-data">Belum ada kas masuk dalam periode ini</p>
                    )}
                </div>

                <div className="flow-section">
                    <h3 className="section-title">📤 Kas Keluar (Pembayaran Supplier)</h3>
                    {details?.cash_out_items?.length > 0 ? (
                        <div className="transaction-list">
                            {details.cash_out_items.map((item, idx) => (
                                <div key={idx} className="transaction-row">
                                    <span className="tx-date">{item.date?.split('T')[0]}</span>
                                    <span className="tx-number">{item.number}</span>
                                    <span className="tx-name">{item.supplier}</span>
                                    <span className="tx-amount negative">-{formatCurrency(item.amount)}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="no-data">Belum ada kas keluar dalam periode ini</p>
                    )}
                </div>
            </div>
        </div>
    );
}
