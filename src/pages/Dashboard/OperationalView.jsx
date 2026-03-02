import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Card from '../../components/common/Card/Card';
import Button from '../../components/common/Button/Button';
import StatusBadge from '../../components/common/Badge/StatusBadge';
import MachineStatusWidget from '../../components/features/Machine/MachineStatusWidget';
import { getActiveJobs, getLowStockAlerts } from '../../services/analyticsApi';
import { useAnalytics } from '../../contexts/AnalyticsContext';

export default function OperationalView() {
    const {
        summaryStats,
        productionStats,
        loading,
        loading: analyticsLoading // Alias if needed
    } = useAnalytics();

    const [activeJobs, setActiveJobs] = useState([]);
    const [lowStockAlerts, setLowStockAlerts] = useState([]);
    const [localLoading, setLocalLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        setLocalLoading(true);
        setError(null);
        try {
            const [jobsRes, alertsRes] = await Promise.all([
                getActiveJobs(),
                getLowStockAlerts()
            ]);

            if (jobsRes?.status === 'success' && Array.isArray(jobsRes.data)) {
                setActiveJobs(jobsRes.data);
            }

            if (alertsRes?.status === 'success' && Array.isArray(alertsRes.data)) {
                setLowStockAlerts(alertsRes.data);
            }

        } catch (error) {
            console.error('Failed to load dashboard:', error);
            setError('Gagal memuat data dashboard.');
        } finally {
            setLocalLoading(false);
        }
    };

    if (loading || analyticsLoading) return <div className="p-8 text-center">Loading Dashboard...</div>;
    if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

    return (
        <div className="dashboard-grid dashboard-grid-3">
            {/* Active Job Orders */}
            <Card
                title="Job Order Aktif"
                headerAction={
                    <Link to="/production" className="view-all-link">Lihat Semua →</Link>
                }
            >
                {(!activeJobs || activeJobs.length === 0) ? (
                    <div className="empty-state">Tidak ada Job Order aktif.</div>
                ) : (
                    <div className="job-list">
                        {activeJobs.map((job) => (
                            job ? (
                                <div key={job.id || Math.random()} className="job-item">
                                    <div className="job-info">
                                        <span className="job-id">{job.id || '-'}</span>
                                        <span className="job-client">{job.client || 'Unknown'}</span>
                                    </div>
                                    <div className="job-progress-wrapper">
                                        <div className="job-progress-bar">
                                            <div
                                                className="job-progress-fill"
                                                style={{ width: `${Math.max(0, Math.min(100, job.progress || 0))}%` }}
                                            />
                                        </div>
                                        <span className="job-progress-text">{job.progress || 0}%</span>
                                    </div>
                                    <StatusBadge status={job.status || 'unknown'} size="sm" />
                                </div>
                            ) : null
                        ))}
                    </div>
                )}
                <div className="card-action">
                    <Link to="/production/new">
                        <Button variant="primary" size="md" fullWidth>
                            + Buat Job Order Baru
                        </Button>
                    </Link>
                </div>
            </Card>

            {/* Summary Card */}
            <Card title="Ringkasan Hari Ini">
                <div className="summary-cards">
                    <div className="summary-card">
                        <div className="summary-icon transaction">🛒</div>
                        <div className="summary-content">
                            <span className="summary-value">{summaryStats.totalTransactions}</span>
                            <span className="summary-label">Transaksi</span>
                        </div>
                    </div>
                    <div className="summary-card">
                        <div className="summary-icon revenue">💰</div>
                        <div className="summary-content">
                            <span className="summary-value">Rp {(summaryStats.totalOmzet || 0).toLocaleString()}</span>
                            <span className="summary-label">Omzet</span>
                        </div>
                    </div>
                    <div className="summary-card">
                        <div className="summary-icon hose">📏</div>
                        <div className="summary-content">
                            <span className="summary-value">{summaryStats.hoseUsed} m</span>
                            <span className="summary-label">Hose Terpakai</span>
                        </div>
                    </div>
                    <div className="summary-card">
                        <div className="summary-icon fitting">🔧</div>
                        <div className="summary-content">
                            <span className="summary-value">{summaryStats.fittingsUsed} pcs</span>
                            <span className="summary-label">Fitting Terpakai</span>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Low Stock Alerts */}
            <Card
                title="Peringatan Stok Rendah"
                variant="warning"
                headerAction={
                    <Link to="/inventory" className="view-all-link">Lihat Semua →</Link>
                }
            >
                {(!lowStockAlerts || lowStockAlerts.length === 0) ? (
                    <div className="empty-state">Stok aman. Tidak ada peringatan.</div>
                ) : (
                    <div className="alert-list">
                        {lowStockAlerts.map((item, idx) => (
                            item ? (
                                <div key={idx} className="stock-alert-item">
                                    <div className="stock-info">
                                        <span className="stock-name">{item.name || 'Unknown Item'}</span>
                                        <span className="stock-detail">
                                            Sisa: <strong>{item.current || 0} {item.unit || 'pcs'}</strong> (Min: {item.minimum || 0})
                                        </span>
                                    </div>
                                    <div className="stock-indicator">
                                        <div
                                            className="stock-bar"
                                            style={{
                                                width: `${Math.min(((item.current || 0) / (item.minimum || 1)) * 100, 100)}%`,
                                                backgroundColor: 'var(--color-danger)'
                                            }}
                                        />
                                    </div>
                                </div>
                            ) : null
                        ))}
                    </div>
                )}
            </Card>

            {/* Machine Status Widgets */}
            {productionStats?.byMachine?.length > 0 ? (
                productionStats.byMachine.map((machine, idx) => (
                    <MachineStatusWidget
                        key={idx}
                        machineName={machine.machine || `Machine #${idx + 1}`}
                        totalCrimps={machine.produced || 0}
                        serviceInterval={machine.target || 15000}
                        lastService={machine.lastMaintenance || "N/A"}
                        status={machine.utilization > 80 ? 'operational' : (machine.utilization > 0 ? 'maintenance' : 'offline')}
                    />
                ))
            ) : (
                <MachineStatusWidget
                    machineName="Crimper Hydraulic #1"
                    totalCrimps={summaryStats.totalTransactions || 0}
                    serviceInterval={5000}
                    lastService="2024-01-01"
                    status="operational"
                />
            )}

            {/* Quick Actions */}
            <div className="col-span-full">
                <Card title="Aksi Cepat">
                    <div className="quick-actions">
                        <Link to="/inbound">
                            <Button variant="secondary" size="lg" icon={
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M12 3v12m0 0l-4-4m4 4l4-4" />
                                    <path d="M3 15v4a2 2 0 002 2h14a2 2 0 002-2v-4" />
                                </svg>
                            }>
                                Barang Masuk
                            </Button>
                        </Link>
                        <Link to="/production">
                            <Button variant="secondary" size="lg" icon={
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="3" />
                                    <path d="M12 1v4m0 14v4M4.22 4.22l2.83 2.83m9.9 9.9l2.83 2.83M1 12h4m14 0h4" />
                                </svg>
                            }>
                                Produksi
                            </Button>
                        </Link>
                        <Link to="/qc">
                            <Button variant="secondary" size="lg" icon={
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M9 12l2 2 4-4" />
                                    <circle cx="12" cy="12" r="10" />
                                </svg>
                            }>
                                Quality Control
                            </Button>
                        </Link>
                        <Link to="/dispatch">
                            <Button variant="secondary" size="lg" icon={
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="1" y="3" width="15" height="13" rx="2" />
                                    <path d="M16 8h4l3 3v5a2 2 0 01-2 2h-1" />
                                    <circle cx="5.5" cy="18.5" r="2.5" />
                                    <circle cx="18.5" cy="18.5" r="2.5" />
                                </svg>
                            }>
                                Pengiriman
                            </Button>
                        </Link>
                        <Link to="/production/kiosk-login">
                            <Button variant="primary" size="lg" icon={
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="2" y="3" width="20" height="14" rx="2" />
                                    <path d="M8 21h8M12 17v4" />
                                </svg>
                            }>
                                Mode Kiosk
                            </Button>
                        </Link>
                    </div>
                </Card>
            </div>
        </div>
    );
}
