/**
 * Hutang Dashboard - Account Payable Management
 * Shows AP summary, payment schedule, and overdue tracking
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/common/Card/Card';
import Button from '../../components/common/Button/Button';
import StatusBadge from '../../components/common/Badge/StatusBadge';
import './Finance.css';

const API_BASE_URL = import.meta.env.VITE_AI_API_URL || "";

export default function HutangDashboard() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState(null);
    const [schedule, setSchedule] = useState(null);
    const [suppliers, setSuppliers] = useState([]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            // Load AP summary
            const summaryRes = await fetch(`${API_BASE_URL}/api/v1/suppliers/ap/summary`);
            const summaryData = await summaryRes.json();
            if (summaryData.status === 'success') {
                setSummary(summaryData.summary);
                setSuppliers(summaryData.by_supplier || []);
            }

            // Load payment schedule
            const scheduleRes = await fetch(`${API_BASE_URL}/api/v1/suppliers/ap/schedule?days_ahead=30`);
            const scheduleData = await scheduleRes.json();
            if (scheduleData.status === 'success') {
                setSchedule(scheduleData.data);
            }
        } catch (err) {
            console.error('Error loading AP data:', err);
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
        return <div className="loading-state">Memuat data hutang...</div>;
    }

    return (
        <div className="finance-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">💳 Hutang (Account Payable)</h1>
                    <p className="page-subtitle">Kelola pembayaran ke supplier</p>
                </div>
                <div className="header-actions">
                    <Button variant="secondary" onClick={loadData}>🔄 Refresh</Button>
                    <Button variant="primary" onClick={() => navigate('/purchasing/suppliers')}>
                        📋 Master Supplier
                    </Button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="summary-grid">
                <Card className="summary-card total">
                    <div className="summary-icon">💰</div>
                    <div className="summary-content">
                        <span className="summary-value">{formatCurrency(summary?.total_hutang)}</span>
                        <span className="summary-label">Total Hutang</span>
                    </div>
                </Card>

                <Card className="summary-card warning">
                    <div className="summary-icon">⚠️</div>
                    <div className="summary-content">
                        <span className="summary-value">{schedule?.overdue?.count || 0}</span>
                        <span className="summary-label">Jatuh Tempo Lewat</span>
                        <span className="summary-amount">{formatCurrency(schedule?.overdue?.total)}</span>
                    </div>
                </Card>

                <Card className="summary-card alert">
                    <div className="summary-icon">🔔</div>
                    <div className="summary-content">
                        <span className="summary-value">{schedule?.due_soon?.count || 0}</span>
                        <span className="summary-label">Jatuh Tempo 7 Hari</span>
                        <span className="summary-amount">{formatCurrency(schedule?.due_soon?.total)}</span>
                    </div>
                </Card>

                <Card className="summary-card info">
                    <div className="summary-icon">📅</div>
                    <div className="summary-content">
                        <span className="summary-value">{schedule?.upcoming?.count || 0}</span>
                        <span className="summary-label">Akan Datang</span>
                        <span className="summary-amount">{formatCurrency(schedule?.upcoming?.total)}</span>
                    </div>
                </Card>
            </div>

            {/* Payment Schedule */}
            <div className="schedule-section">
                <h2 className="section-title">📅 Jadwal Pembayaran</h2>

                {/* Overdue */}
                {schedule?.overdue?.items?.length > 0 && (
                    <Card className="schedule-group overdue">
                        <h3 className="group-title">🚨 Jatuh Tempo Lewat</h3>
                        <div className="schedule-list">
                            {schedule.overdue.items.map((item, idx) => (
                                <div key={idx} className="schedule-item">
                                    <div className="item-info">
                                        <span className="item-po">{item.po_number}</span>
                                        <span className="item-supplier">{item.supplier_name}</span>
                                    </div>
                                    <div className="item-due">
                                        <StatusBadge status="danger" size="sm" />
                                        <span>{item.days_overdue} hari lewat</span>
                                    </div>
                                    <div className="item-amount">{formatCurrency(item.amount_due)}</div>
                                    <Button size="sm" variant="danger">Bayar</Button>
                                </div>
                            ))}
                        </div>
                    </Card>
                )}

                {/* Due Soon */}
                {schedule?.due_soon?.items?.length > 0 && (
                    <Card className="schedule-group due-soon">
                        <h3 className="group-title">⏰ Jatuh Tempo 7 Hari</h3>
                        <div className="schedule-list">
                            {schedule.due_soon.items.map((item, idx) => (
                                <div key={idx} className="schedule-item">
                                    <div className="item-info">
                                        <span className="item-po">{item.po_number}</span>
                                        <span className="item-supplier">{item.supplier_name}</span>
                                    </div>
                                    <div className="item-due">
                                        <StatusBadge status="warning" size="sm" />
                                        <span>{item.due_date}</span>
                                    </div>
                                    <div className="item-amount">{formatCurrency(item.amount_due)}</div>
                                    <Button size="sm" variant="secondary">Bayar</Button>
                                </div>
                            ))}
                        </div>
                    </Card>
                )}

                {/* No data */}
                {!schedule?.overdue?.items?.length && !schedule?.due_soon?.items?.length && (
                    <Card className="empty-state">
                        <p>✅ Tidak ada hutang yang jatuh tempo dalam 7 hari ke depan</p>
                    </Card>
                )}
            </div>

            {/* Hutang per Supplier */}
            <div className="supplier-section">
                <h2 className="section-title">🏢 Hutang per Supplier</h2>
                <Card>
                    <div className="supplier-list">
                        {suppliers.length === 0 ? (
                            <p className="empty-text">Belum ada data hutang</p>
                        ) : (
                            suppliers.map((supplier, idx) => (
                                <div key={idx} className="supplier-row">
                                    <span className="supplier-name">{supplier.name}</span>
                                    <span className="supplier-count">{supplier.count} PO</span>
                                    <span className="supplier-total">{formatCurrency(supplier.total)}</span>
                                </div>
                            ))
                        )}
                    </div>
                </Card>
            </div>
        </div>
    );
}
