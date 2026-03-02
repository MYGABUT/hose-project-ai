import React, { useState, useEffect } from 'react';
import Card from '../../components/common/Card/Card';
import KPIWidget from './components/KPIWidget';
import RevenueChart from './components/RevenueChart';
import TopProductsChart from './components/TopProductsChart';
import { getActiveJobs, getLowStockAlerts } from '../../services/analyticsApi';
import { useAnalytics } from '../../contexts/AnalyticsContext';

export default function ExecutiveView() {
    const { summaryStats, loading: analyticsLoading } = useAnalytics();
    const [jobs, setJobs] = useState([]);
    const [alerts, setAlerts] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [jobsRes, alertsRes] = await Promise.all([
                    getActiveJobs(),
                    getLowStockAlerts()
                ]);
                if (jobsRes?.status === 'success') setJobs(jobsRes.data || []);
                if (alertsRes?.status === 'success') setAlerts(alertsRes.data || []);
            } catch (err) {
                console.error("Failed fetching executive data", err);
            }
        };
        fetchData();
    }, []);

    if (analyticsLoading) {
        return <div className="p-8 text-center text-slate-500">Memuat data eksekutif...</div>;
    }

    // Determine completion rate for active jobs mock
    const completedJobs = jobs.filter(j => j.status?.toLowerCase() === 'completed').length;
    const completionRate = jobs.length > 0 ? Math.round((completedJobs / jobs.length) * 100) : 100;

    return (
        <div className="executive-view">

            {/* KPI Row (HashMicro Style) */}
            <div className="dashboard-grid-4 mb-6">
                <KPIWidget
                    title="Total Omzet (Bulan Ini)"
                    value={`Rp ${(summaryStats.totalOmzet || 0).toLocaleString('id-ID')}`}
                    icon="💰"
                    colorTheme="green"
                    trendDirection="up"
                    trendPrefix="Naik"
                    trendValue="12.5%"
                    trendSuffix="vs bulan lalu"
                />

                <KPIWidget
                    title="Transaksi SO Baru"
                    value={summaryStats.totalTransactions || 0}
                    icon="🛒"
                    colorTheme="blue"
                    trendDirection="up"
                    trendPrefix="Naik"
                    trendValue="8.2%"
                    trendSuffix="vs bulan lalu"
                />

                <KPIWidget
                    title="Efisiensi Produksi"
                    value={`${completionRate}%`}
                    icon="⚙️"
                    colorTheme="indigo"
                    trendDirection={completionRate >= 80 ? 'up' : 'down'}
                    trendPrefix="JO Selesai tepat waktu"
                />

                <KPIWidget
                    title="Peringatan Stok Obat"
                    value={alerts.length}
                    icon="⚠️"
                    colorTheme={alerts.length > 5 ? 'red' : 'orange'}
                    trendDirection={alerts.length > 0 ? 'down' : 'neutral'}
                    trendPrefix={alerts.length > 0 ? 'Perlu re-stock segera!' : 'Stok aman terkendali'}
                />
            </div>

            {/* Charts Row */}
            <div className="dashboard-chart-row mb-6">
                <div className="chart-col-8">
                    <Card>
                        <RevenueChart />
                    </Card>
                </div>

                <div className="chart-col-4">
                    <Card>
                        <TopProductsChart />
                    </Card>
                </div>
            </div>

            {/* Bottom Row: Additional insights optional */}
            <div className="dashboard-chart-row">
                <div className="chart-col-12">
                    <Card title="Ringkasan Aktivitas Terkini (Executive Feed)">
                        <div className="text-sm text-slate-500 py-4">
                            Sistem sedang merekam performa harian Anda. Laporan operasional otomatis akan muncul di sini.
                        </div>
                    </Card>
                </div>
            </div>

        </div>
    );
}
