/**
 * JO Profitability Dashboard - Track profit/loss per Job Order
 * Shows revenue vs HPP, margin analysis, and top performers
 */
import { useState, useEffect } from 'react';
import Card from '../../components/common/Card/Card';
import Button from '../../components/common/Button/Button';
import StatusBadge from '../../components/common/Badge/StatusBadge';
import './Production.css';

const API_BASE_URL = import.meta.env.VITE_AI_API_URL || 'http://localhost:8000';

export default function JOProfitability() {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [days, setDays] = useState(30);

    useEffect(() => {
        loadData();
    }, [days]);

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/jo/reports/profitability?days=${days}`);
            const json = await res.json();
            if (json.status === 'success') {
                setData(json);
            }
        } catch (err) {
            console.error('Error loading profitability:', err);
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

    const getMarginColor = (margin) => {
        if (margin >= 30) return '#10b981';
        if (margin >= 15) return '#22c55e';
        if (margin >= 5) return '#f59e0b';
        if (margin >= 0) return '#f97316';
        return '#ef4444';
    };

    if (loading) {
        return <div className="loading-state">Memuat laporan profitabilitas...</div>;
    }

    const { summary, top_unprofitable, top_profitable } = data || {};

    return (
        <div className="production-page profitability-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">📈 Laporan Laba/Rugi per Job Order</h1>
                    <p className="page-subtitle">Analisis profitabilitas berdasarkan HPP vs Revenue</p>
                </div>
                <div className="header-actions">
                    <select
                        className="period-select"
                        value={days}
                        onChange={(e) => setDays(parseInt(e.target.value))}
                    >
                        <option value={7}>7 Hari Terakhir</option>
                        <option value={30}>30 Hari Terakhir</option>
                        <option value={90}>90 Hari Terakhir</option>
                        <option value={365}>1 Tahun</option>
                    </select>
                    <Button variant="secondary" onClick={loadData}>🔄 Refresh</Button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="profit-summary">
                <Card className={`profit-card ${summary?.total_profit >= 0 ? 'positive' : 'negative'}`}>
                    <div className="profit-header">
                        <span className="profit-icon">{summary?.total_profit >= 0 ? '📈' : '📉'}</span>
                        <span className="profit-label">Total Profit</span>
                    </div>
                    <div className="profit-value" style={{ color: summary?.total_profit >= 0 ? '#10b981' : '#ef4444' }}>
                        {formatCurrency(summary?.total_profit)}
                    </div>
                    <div className="profit-meta">
                        Margin: {summary?.overall_margin_percent || 0}%
                    </div>
                </Card>

                <Card className="metric-card">
                    <div className="metric-row">
                        <span className="metric-label">Total Revenue</span>
                        <span className="metric-value">{formatCurrency(summary?.total_revenue)}</span>
                    </div>
                    <div className="metric-row">
                        <span className="metric-label">Total HPP</span>
                        <span className="metric-value">{formatCurrency(summary?.total_hpp)}</span>
                    </div>
                </Card>

                <Card className="metric-card">
                    <div className="metric-row highlight">
                        <span className="metric-label">Total JO</span>
                        <span className="metric-value">{summary?.total_jobs || 0}</span>
                    </div>
                    <div className="metric-row">
                        <span className="metric-label success">✅ Untung</span>
                        <span className="metric-value">{summary?.profitable_jobs || 0}</span>
                    </div>
                    <div className="metric-row">
                        <span className="metric-label danger">❌ Rugi</span>
                        <span className="metric-value">{summary?.unprofitable_jobs || 0}</span>
                    </div>
                </Card>
            </div>

            {/* Top Lists */}
            <div className="profit-lists">
                {/* Unprofitable Jobs */}
                <div className="profit-section danger">
                    <h3 className="section-title">🚨 JO Paling Rugi</h3>
                    {top_unprofitable?.length > 0 ? (
                        <div className="job-list">
                            {top_unprofitable.map((job, idx) => (
                                <Card key={idx} className="job-card unprofitable">
                                    <div className="job-header">
                                        <span className="job-number">{job.jo_number}</span>
                                        <span
                                            className="job-margin"
                                            style={{ backgroundColor: getMarginColor(job.margin_percent) }}
                                        >
                                            {job.margin_percent}%
                                        </span>
                                    </div>
                                    <div className="job-customer">{job.customer}</div>
                                    <div className="job-stats">
                                        <div className="stat">
                                            <span className="stat-label">Revenue</span>
                                            <span className="stat-value">{formatCurrency(job.revenue)}</span>
                                        </div>
                                        <div className="stat">
                                            <span className="stat-label">HPP</span>
                                            <span className="stat-value">{formatCurrency(job.hpp)}</span>
                                        </div>
                                        <div className="stat loss">
                                            <span className="stat-label">Rugi</span>
                                            <span className="stat-value">{formatCurrency(job.profit)}</span>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <p className="no-data">✅ Tidak ada JO rugi dalam periode ini</p>
                    )}
                </div>

                {/* Profitable Jobs */}
                <div className="profit-section success">
                    <h3 className="section-title">💰 JO Paling Untung</h3>
                    {top_profitable?.length > 0 ? (
                        <div className="job-list">
                            {top_profitable.map((job, idx) => (
                                <Card key={idx} className="job-card profitable">
                                    <div className="job-header">
                                        <span className="job-number">{job.jo_number}</span>
                                        <span
                                            className="job-margin"
                                            style={{ backgroundColor: getMarginColor(job.margin_percent) }}
                                        >
                                            {job.margin_percent}%
                                        </span>
                                    </div>
                                    <div className="job-customer">{job.customer}</div>
                                    <div className="job-stats">
                                        <div className="stat">
                                            <span className="stat-label">Revenue</span>
                                            <span className="stat-value">{formatCurrency(job.revenue)}</span>
                                        </div>
                                        <div className="stat">
                                            <span className="stat-label">HPP</span>
                                            <span className="stat-value">{formatCurrency(job.hpp)}</span>
                                        </div>
                                        <div className="stat profit">
                                            <span className="stat-label">Profit</span>
                                            <span className="stat-value">{formatCurrency(job.profit)}</span>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <p className="no-data">Belum ada data JO dalam periode ini</p>
                    )}
                </div>
            </div>
        </div>
    );
}
