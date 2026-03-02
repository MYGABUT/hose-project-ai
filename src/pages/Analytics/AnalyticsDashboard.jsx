import { useState, useRef } from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import { useAnalytics } from '../../contexts/AnalyticsContext';
import Card from '../../components/common/Card/Card';
import Button from '../../components/common/Button/Button';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import './AnalyticsDashboard.css';

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

export default function AnalyticsDashboard() {
    const {
        dateRange,
        setDateRange,
        summaryStats,
        salesByCategory,
        topSellingItems,
        deadStockItems,
        salesLeaderboard,
        qcStats,
        productionStats,
        restockItems,
        getSalesChartData,
        getCategoryChartData,
        getLeaderboardChartData,
        getQCRejectChartData
    } = useAnalytics();

    const [activeTab, setActiveTab] = useState('overview');
    const dashboardRef = useRef(null);

    // Format currency
    const formatCurrency = (value) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(value);
    };

    // Chart options
    const lineChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    label: (ctx) => `Rp ${ctx.raw.toFixed(1)} Juta`
                }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: {
                    callback: (value) => `${value} Jt`
                }
            }
        }
    };

    const doughnutOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'bottom' }
        },
        cutout: '60%'
    };

    const barChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: {
            legend: { display: false }
        },
        scales: {
            x: {
                ticks: {
                    callback: (value) => `${value} Jt`
                }
            }
        }
    };

    // Export to PDF
    const exportToPDF = () => {
        try {
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();
            const today = new Date().toLocaleDateString('id-ID');

            // Header
            doc.setFillColor(26, 35, 126);
            doc.rect(0, 0, pageWidth, 30, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(20);
            doc.text('HOSE PRO', 14, 15);
            doc.setFontSize(10);
            doc.text(`Laporan Analitik - ${today}`, 14, 23);

            // Reset color
            doc.setTextColor(0, 0, 0);

            // Summary
            const stats = summaryStats || {};
            doc.setFontSize(14);
            doc.text('Ringkasan Eksekutif', 14, 45);
            doc.setFontSize(10);
            doc.text(`Total Omzet: ${formatCurrency(stats.totalOmzet || 0)}`, 14, 55);
            doc.text(`Total Transaksi: ${stats.totalTransactions || 0} Invoice`, 14, 62);
            doc.text(`Hose Terpakai: ${(stats.hoseUsed || 0).toLocaleString()} Meter`, 14, 69);
            doc.text(`Fitting Terpakai: ${(stats.fittingsUsed || 0).toLocaleString()} Pcs`, 14, 76);

            // Top Selling Items Table
            doc.setFontSize(14);
            doc.text('Top 10 Produk Terlaris', 14, 92);

            autoTable(doc, {
                startY: 98,
                head: [['#', 'SKU', 'Nama Produk', 'Qty', 'Revenue']],
                body: (topSellingItems || []).map(item => [
                    item.rank,
                    item.sku,
                    item.name,
                    `${item.qty} ${item.unit}`,
                    formatCurrency(item.revenue)
                ]),
                headStyles: { fillColor: [26, 35, 126] },
                styles: { fontSize: 8 }
            });

            // Sales Leaderboard
            const finalY = doc.lastAutoTable.finalY + 15;
            doc.setFontSize(14);
            doc.text('Leaderboard Sales', 14, finalY);

            autoTable(doc, {
                startY: finalY + 6,
                head: [['Ranking', 'Nama Sales', 'Total Pendapatan', 'Transaksi']],
                body: (salesLeaderboard || []).map(s => [
                    `#${s.rank}`,
                    s.name,
                    formatCurrency(s.totalRevenue),
                    s.transactions
                ]),
                headStyles: { fillColor: [16, 185, 129] },
                styles: { fontSize: 8 }
            });

            // Footer
            const pageHeight = doc.internal.pageSize.getHeight();
            doc.setFontSize(8);
            doc.setTextColor(128);
            doc.text(`Generated: ${new Date().toLocaleString('id-ID')}`, 14, pageHeight - 10);
            doc.text('HOSE PRO - Hydraulic Hose Inventory System', pageWidth - 70, pageHeight - 10);

            doc.save(`Laporan_Analytics_${new Date().toISOString().split('T')[0]}.pdf`);
        } catch (err) {
            console.error("Export PDF failed:", err);
            alert("Gagal mencetak PDF due to data error");
        }
    };

    // Export to Image (PNG)
    const exportToImage = async () => {
        if (!dashboardRef.current) return;

        try {
            const canvas = await html2canvas(dashboardRef.current, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#f8fafc'
            });

            canvas.toBlob((blob) => {
                if (!blob) {
                    alert('Gagal membuat gambar dashboard.');
                    return;
                }
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `Dashboard_Analytics_${new Date().toISOString().split('T')[0]}.png`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            }, 'image/png');
        } catch (err) {
            console.error("Export image failed:", err);
            alert("Gagal melakukan export gambar.");
        }
    };

    // Export to Excel (CSV)
    const exportToExcel = () => {
        try {
            const csvRows = [];
            const separator = ';';

            const q = (str) => `"${String(str || '').replace(/"/g, '""')}"`;
            const row = (arr) => arr.join(separator);

            // Header
            csvRows.push(row(['HOSE PRO - Laporan Analitik']));
            csvRows.push(row([`Periode: ${dateRange}`]));
            csvRows.push(row([`Generated: ${new Date().toLocaleString('id-ID')}`]));
            csvRows.push('');

            // Summary
            const stats = summaryStats || {};
            csvRows.push('=== RINGKASAN EKSEKUTIF ===');
            csvRows.push(row(['Total Omzet', stats.totalOmzet || 0]));
            csvRows.push(row(['Total Transaksi', stats.totalTransactions || 0]));
            csvRows.push(row(['Hose Terpakai', `${stats.hoseUsed || 0} Meter`]));
            csvRows.push(row(['Fitting Terpakai', `${stats.fittingsUsed || 0} Pcs`]));
            csvRows.push('');

            // Top Selling
            csvRows.push('=== TOP 10 PRODUK TERLARIS ===');
            csvRows.push(row(['Rank', 'SKU', 'Nama', 'Qty', 'Unit', 'Revenue']));
            (topSellingItems || []).forEach(item => {
                csvRows.push(row([
                    item.rank,
                    item.sku,
                    q(item.name),
                    item.qty,
                    item.unit,
                    item.revenue
                ]));
            });
            csvRows.push('');

            // Dead Stock
            csvRows.push('=== DEAD STOCK (>90 HARI) ===');
            csvRows.push(row(['SKU', 'Nama', 'Stock', 'Days Idle', 'Value']));
            (deadStockItems || []).forEach(item => {
                csvRows.push(row([
                    item.sku,
                    q(item.name),
                    `${item.stock} ${item.unit}`,
                    item.daysIdle,
                    item.value
                ]));
            });
            csvRows.push('');

            // Leaderboard
            csvRows.push('=== LEADERBOARD SALES ===');
            csvRows.push(row(['Rank', 'Nama', 'Total Revenue', 'Transaksi', 'Avg Ticket']));
            (salesLeaderboard || []).forEach(s => {
                csvRows.push(row([
                    s.rank,
                    q(s.name),
                    s.totalRevenue,
                    s.transactions,
                    s.avgTicket
                ]));
            });

            const csvContent = "\uFEFF" + csvRows.join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `Laporan_Analytics_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err) {
            console.error("Export Excel failed:", err);
            alert("Gagal export Excel");
        }
    };

    return (
        <div className="analytics-dashboard" ref={dashboardRef}>
            {/* Header */}
            <div className="page-header">
                <div className="header-content">
                    <h1>📊 Laporan & Analitik</h1>
                    <p>Executive Dashboard - Pantau kesehatan bisnis Anda</p>
                </div>
                <div className="header-actions">
                    <select
                        value={dateRange}
                        onChange={(e) => setDateRange(e.target.value)}
                        className="date-filter"
                    >
                        <option value="week">Minggu Ini</option>
                        <option value="month">Bulan Ini</option>
                        <option value="quarter">Kuartal Ini</option>
                        <option value="year">Tahun Ini</option>
                    </select>
                    <Button variant="secondary" onClick={exportToExcel}>
                        📊 Export Excel (CSV)
                    </Button>
                    <Button variant="secondary" onClick={exportToImage}>
                        📸 Export Gambar
                    </Button>
                    <Button variant="primary" onClick={exportToPDF}>
                        🖨️ Cetak PDF
                    </Button>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="tab-navigation">
                <button
                    className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
                    onClick={() => setActiveTab('overview')}
                >
                    📈 Overview
                </button>
                <button
                    className={`tab-btn ${activeTab === 'inventory' ? 'active' : ''}`}
                    onClick={() => setActiveTab('inventory')}
                >
                    📦 Inventory Health
                </button>
                <button
                    className={`tab-btn ${activeTab === 'sales' ? 'active' : ''}`}
                    onClick={() => setActiveTab('sales')}
                >
                    🏆 Leaderboard Sales
                </button>
                <button
                    className={`tab-btn ${activeTab === 'qc' ? 'active' : ''}`}
                    onClick={() => setActiveTab('qc')}
                >
                    ✅ QC & Produksi
                </button>
                <button
                    className={`tab-btn ${activeTab === 'predictive' ? 'active' : ''}`}
                    onClick={() => setActiveTab('predictive')}
                >
                    🔮 AI Prediction
                </button>
            </div>

            {/* Overview Tab */}
            {activeTab === 'overview' && (
                <>
                    {/* KPI Cards */}
                    <div className="kpi-cards">
                        <div className="kpi-card revenue">
                            <div className="kpi-icon">💰</div>
                            <div className="kpi-content">
                                <span className="kpi-value">{formatCurrency(summaryStats.totalOmzet)}</span>
                                <span className="kpi-label">Total Omzet</span>
                                <span className={`kpi-trend ${summaryStats.omzetTrend >= 0 ? 'up' : 'down'}`}>
                                    {summaryStats.omzetTrend >= 0 ? '🔼' : '🔽'} {Math.abs(summaryStats.omzetTrend)}%
                                </span>
                            </div>
                        </div>
                        <div className="kpi-card transactions">
                            <div className="kpi-icon">📄</div>
                            <div className="kpi-content">
                                <span className="kpi-value">{summaryStats.totalTransactions}</span>
                                <span className="kpi-label">Total Transaksi</span>
                                <span className="kpi-trend up">🔼 {summaryStats.transactionTrend}%</span>
                            </div>
                        </div>
                        <div className="kpi-card hose">
                            <div className="kpi-icon">🔧</div>
                            <div className="kpi-content">
                                <span className="kpi-value">{summaryStats.hoseUsed.toLocaleString()}</span>
                                <span className="kpi-label">Hose Terpakai (M)</span>
                            </div>
                        </div>
                        <div className="kpi-card fitting">
                            <div className="kpi-icon">⚙️</div>
                            <div className="kpi-content">
                                <span className="kpi-value">{summaryStats.fittingsUsed.toLocaleString()}</span>
                                <span className="kpi-label">Fitting Terpakai (Pcs)</span>
                            </div>
                        </div>
                    </div>

                    {/* Charts Row */}
                    <div className="charts-row">
                        <Card title="📈 Tren Penjualan Harian" className="chart-card line-chart">
                            <div className="chart-container">
                                <Line data={getSalesChartData()} options={lineChartOptions} />
                            </div>
                        </Card>
                        <Card title="🥧 Komposisi Penjualan" className="chart-card donut-chart">
                            <div className="chart-container">
                                <Doughnut data={getCategoryChartData()} options={doughnutOptions} />
                            </div>
                        </Card>
                    </div>

                    {/* Category Breakdown */}
                    <Card title="📊 Detail Penjualan per Kategori">
                        <div className="category-breakdown">
                            {salesByCategory.map((cat, idx) => (
                                <div key={idx} className="category-item">
                                    <div className="category-info">
                                        <span className="category-name">{cat.category}</span>
                                        <span className="category-value">{formatCurrency(cat.value)}</span>
                                    </div>
                                    <div className="progress-bar">
                                        <div
                                            className="progress-fill"
                                            style={{ width: `${cat.percentage}%` }}
                                        />
                                    </div>
                                    <span className="category-percentage">{cat.percentage}%</span>
                                </div>
                            ))}
                        </div>
                    </Card>
                </>
            )}

            {/* Inventory Health Tab */}
            {activeTab === 'inventory' && (
                <>
                    <div className="inventory-grid">
                        {/* Top Selling */}
                        <Card title="🔥 Top 10 Laris Manis" subtitle="Produk paling diminati">
                            <div className="top-selling-table">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            <th>Produk</th>
                                            <th>Qty</th>
                                            <th>Revenue</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {topSellingItems.map(item => (
                                            <tr key={item.rank}>
                                                <td className="rank">
                                                    {item.rank <= 3 ? ['🥇', '🥈', '🥉'][item.rank - 1] : item.rank}
                                                </td>
                                                <td>
                                                    <div className="product-info">
                                                        <span className="product-sku">{item.sku}</span>
                                                        <span className="product-name">{item.name}</span>
                                                    </div>
                                                </td>
                                                <td className="qty">{item.qty} {item.unit}</td>
                                                <td className="revenue">{formatCurrency(item.revenue)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Card>

                        {/* Dead Stock */}
                        <Card title="💀 Dead Stock" subtitle="Barang tidur >90 hari" className="dead-stock-card">
                            <div className="dead-stock-alert">
                                ⚠️ Total nilai barang tidur: <strong>{formatCurrency(deadStockItems.reduce((sum, i) => sum + i.value, 0))}</strong>
                            </div>
                            <div className="dead-stock-list">
                                {deadStockItems.map((item, idx) => (
                                    <div key={idx} className="dead-stock-item">
                                        <div className="item-info">
                                            <span className="item-sku">{item.sku}</span>
                                            <span className="item-name">{item.name}</span>
                                            <span className="item-stock">Stok: {item.stock} {item.unit}</span>
                                        </div>
                                        <div className="item-status">
                                            <span className="days-idle">🛏️ {item.daysIdle} hari</span>
                                            <span className="suggestion">💡 Diskon!</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>
                </>
            )}

            {/* Sales Leaderboard Tab */}
            {activeTab === 'sales' && (
                <>
                    <div className="leaderboard-section">
                        <Card title="🏆 Sales Leaderboard" subtitle="Ranking berdasarkan total penjualan">
                            <div className="leaderboard-chart">
                                <Bar data={getLeaderboardChartData()} options={barChartOptions} />
                            </div>
                        </Card>

                        <div className="leaderboard-cards">
                            {salesLeaderboard.map(sales => (
                                <div key={sales.id} className={`leaderboard-card rank-${sales.rank}`}>
                                    <div className="rank-badge">
                                        {sales.rank <= 3 ? ['🥇', '🥈', '🥉'][sales.rank - 1] : `#${sales.rank}`}
                                    </div>
                                    <div className="sales-avatar">
                                        {sales.name.charAt(0)}
                                    </div>
                                    <div className="sales-info">
                                        <span className="sales-name">{sales.name}</span>
                                        <span className="sales-revenue">{formatCurrency(sales.totalRevenue)}</span>
                                    </div>
                                    <div className="sales-stats">
                                        <div className="stat">
                                            <span className="stat-value">{sales.transactions}</span>
                                            <span className="stat-label">Transaksi</span>
                                        </div>
                                        <div className="stat">
                                            <span className={`stat-trend ${sales.trend >= 0 ? 'up' : 'down'}`}>
                                                {sales.trend >= 0 ? '↑' : '↓'} {Math.abs(sales.trend)}%
                                            </span>
                                            <span className="stat-label">vs Bulan Lalu</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}

            {/* QC & Production Tab */}
            {activeTab === 'qc' && (
                <>
                    <div className="qc-stats-row">
                        <div className="qc-stat-card pass">
                            <span className="stat-icon">✅</span>
                            <span className="stat-value">{qcStats.passRate}%</span>
                            <span className="stat-label">Pass Rate</span>
                            <span className="stat-detail">{qcStats.passed}/{qcStats.totalInspected} unit</span>
                        </div>
                        <div className="qc-stat-card reject">
                            <span className="stat-icon">❌</span>
                            <span className="stat-value">{qcStats.rejectRate}%</span>
                            <span className="stat-label">Reject Rate</span>
                            <span className="stat-detail">{qcStats.rejected} unit ditolak</span>
                        </div>
                        <div className="qc-stat-card production">
                            <span className="stat-icon">🔧</span>
                            <span className="stat-value">{productionStats.totalProduced}</span>
                            <span className="stat-label">Unit Diproduksi</span>
                        </div>
                        <div className="qc-stat-card utilization">
                            <span className="stat-icon">⚡</span>
                            <span className="stat-value">{productionStats.utilizationRate}%</span>
                            <span className="stat-label">Utilisasi Mesin</span>
                        </div>
                    </div>

                    <div className="qc-charts-row">
                        <Card title="⚠️ Alasan Reject" className="reject-chart">
                            <div className="chart-container small">
                                <Doughnut data={getQCRejectChartData()} options={doughnutOptions} />
                            </div>
                        </Card>

                        <Card title="🏭 Kualitas per Vendor" className="vendor-quality">
                            <table className="vendor-table">
                                <thead>
                                    <tr>
                                        <th>Vendor</th>
                                        <th>Inspected</th>
                                        <th>Rejected</th>
                                        <th>Rate</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {qcStats.vendorQuality.map((v, idx) => (
                                        <tr key={idx} className={v.rejectRate > 5 ? 'warning' : ''}>
                                            <td>{v.vendor}</td>
                                            <td>{v.inspected}</td>
                                            <td>{v.rejected}</td>
                                            <td className={v.rejectRate > 5 ? 'bad' : 'good'}>
                                                {v.rejectRate}%
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </Card>
                    </div>
                </>
            )}
            {/* Prediction Tab */}
            {activeTab === 'predictive' && (
                <>
                    <div className="prediction-grid">
                        <Card title="🔮 Restock Forecast (AI)" subtitle="Prediksi stok habis berdasarkan pemakaian 30 hari terakhir">
                            <div className="restock-list">
                                {restockItems.length === 0 && <div className="empty-state">Semua stok aman terkendali.</div>}
                                {restockItems.map((item, idx) => (
                                    <div key={idx} className={`restock-item ${item.days_left < 7 ? 'critical' : 'warning'}`}>
                                        <div className="item-details">
                                            <span className="sku">{item.sku}</span>
                                            <span className="name">{item.name}</span>
                                            <div className="metrics">
                                                <span>Stok: {item.current_stock}</span>
                                                <span>•</span>
                                                <span>Pakai/Hari: {item.adu}</span>
                                            </div>
                                        </div>
                                        <div className="item-action">
                                            <div className="days-left">
                                                <span className="value">{item.days_left}</span>
                                                <span className="label">Hari Lagi</span>
                                            </div>
                                            <div className="suggestion">
                                                {item.suggestion}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>
                </>
            )}
        </div>
    );
}
