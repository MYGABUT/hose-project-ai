import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
    getSummaryStats,
    getSalesTrend,
    getSalesByCategory,
    getTopSelling,
    getDeadStock,
    getQCStats,
    getProductionStats,
    getRestockPrediction
} from '../services/analyticsApi';

const AnalyticsContext = createContext(null);

export function AnalyticsProvider({ children }) {
    const [dateRange, setDateRange] = useState('month'); // 'week', 'month', 'quarter', 'year', 'custom'
    const [customDateRange, setCustomDateRange] = useState({ start: null, end: null });
    const [loading, setLoading] = useState(true);

    // Data States
    const [summaryStats, setSummaryStats] = useState({
        totalOmzet: 0,
        totalTransactions: 0,
        hoseUsed: 0,
        fittingsUsed: 0,
        omzetTrend: 0,
        transactionTrend: 0
    });
    const [dailySales, setDailySales] = useState([]);
    const [salesByCategory, setSalesByCategory] = useState([]);
    const [topSellingItems, setTopSellingItems] = useState([]);
    const [deadStockItems, setDeadStockItems] = useState([]);
    const [qcStats, setQcStats] = useState({
        totalInspected: 0, passed: 0, rejected: 0, passRate: 0, rejectRate: 0,
        rejectByCategory: [], vendorQuality: []
    });
    const [productionStats, setProductionStats] = useState({
        totalProduced: 0, totalMeters: 0, utilizationRate: 0, byMachine: []
    });
    const [restockItems, setRestockItems] = useState([]);

    // Sales Leaderboard (Still Mock for now as we don't have full user sales tracking yet)
    // Or we could implement it in backend if we tracked salesman_id in SO
    const [salesLeaderboard] = useState([
        { rank: 1, id: 'U003', name: 'Siti Salesku', totalRevenue: 185000000, transactions: 42, avgTicket: 4404761, trend: 12 },
        { rank: 2, id: 'U010', name: 'Bambang Sales', totalRevenue: 142000000, transactions: 35, avgTicket: 4057142, trend: 8 },
    ]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [summary, trend, category, top, dead, qc, prod, restock] = await Promise.all([
                getSummaryStats(dateRange),
                getSalesTrend(),
                getSalesByCategory(),
                getTopSelling(),
                getDeadStock(),
                getQCStats(),
                getProductionStats(),
                getRestockPrediction()
            ]);

            if (summary?.status === 'success' && summary.data) setSummaryStats(summary.data);
            if (trend?.status === 'success' && Array.isArray(trend.data)) setDailySales(trend.data);
            if (category?.status === 'success' && Array.isArray(category.data)) setSalesByCategory(category.data);
            if (top?.status === 'success' && Array.isArray(top.data)) setTopSellingItems(top.data);
            if (dead?.status === 'success' && Array.isArray(dead.data)) setDeadStockItems(dead.data);
            if (qc?.status === 'success' && qc.data && Array.isArray(qc.data.rejectByCategory)) setQcStats(qc.data);
            if (prod?.status === 'success' && prod.data && Array.isArray(prod.data.byMachine)) setProductionStats(prod.data);
            if (restock?.status === 'success' && Array.isArray(restock.data)) setRestockItems(restock.data);

        } catch (error) {
            console.error("Failed to load analytics:", error);
        }
        setLoading(false);
    }, [dateRange]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Get chart data for line chart
    const getSalesChartData = () => ({
        labels: dailySales.map(d => {
            const date = new Date(d.date);
            return `${date.getDate()}/${date.getMonth() + 1}`;
        }),
        datasets: [{
            label: 'Penjualan Harian (Juta)',
            data: dailySales.map(d => d.sales / 1000000),
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            fill: true,
            tension: 0.4
        }]
    });

    // Get chart data for donut chart
    const getCategoryChartData = () => ({
        labels: salesByCategory.map(c => c.category),
        datasets: [{
            data: salesByCategory.map(c => c.percentage),
            backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#6366f1'],
            borderWidth: 0
        }]
    });

    // Get leaderboard chart data
    const getLeaderboardChartData = () => ({
        labels: salesLeaderboard.map(s => s.name),
        datasets: [{
            label: 'Total Penjualan (Juta)',
            data: salesLeaderboard.map(s => s.totalRevenue / 1000000),
            backgroundColor: ['#fbbf24', '#9ca3af', '#b45309', '#60a5fa', '#a78bfa'],
            borderRadius: 8
        }]
    });

    // Get QC reject chart data
    const getQCRejectChartData = () => ({
        labels: (qcStats.rejectByCategory || []).map(r => r.category),
        datasets: [{
            data: (qcStats.rejectByCategory || []).map(r => r.count),
            backgroundColor: ['#ef4444', '#f97316', '#eab308', '#6b7280'],
            borderWidth: 0
        }]
    });

    // Get production by machine chart
    const getProductionChartData = () => ({
        labels: (productionStats.byMachine || []).map(m => m.machine.replace('Crimper ', '')),
        datasets: [{
            label: 'Unit Diproduksi',
            data: (productionStats.byMachine || []).map(m => m.produced),
            backgroundColor: '#3b82f6'
        }, {
            label: 'Utilisasi (%)',
            data: (productionStats.byMachine || []).map(m => m.utilization),
            backgroundColor: '#10b981'
        }]
    });

    return (
        <AnalyticsContext.Provider value={{
            // State
            dateRange,
            setDateRange,
            customDateRange,
            setCustomDateRange,
            loading,
            refresh: fetchData,

            // Data
            summaryStats,
            dailySales,
            salesByCategory,
            topSellingItems,
            deadStockItems,
            salesLeaderboard,
            qcStats,
            productionStats,
            restockItems,

            // Chart Data Functions
            getSalesChartData,
            getCategoryChartData,
            getLeaderboardChartData,
            getQCRejectChartData,
            getProductionChartData
        }}>
            {children}
        </AnalyticsContext.Provider>
    );
}

export function useAnalytics() {
    const context = useContext(AnalyticsContext);
    if (!context) {
        throw new Error('useAnalytics must be used within an AnalyticsProvider');
    }
    return context;
}
