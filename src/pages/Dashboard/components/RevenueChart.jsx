import React from 'react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';

/**
 * A beautiful HashMicro-style area chart showing revenue trends.
 */
export default function RevenueChart({ data, title = "Tren Pendapatan 7 Hari Terakhir" }) {

    // Default mock data if none provided, to show the UI capability
    const chartData = data && data.length > 0 ? data : [
        { date: 'Senin', revenue: 12000000 },
        { date: 'Selasa', revenue: 19000000 },
        { date: 'Rabu', revenue: 15000000 },
        { date: 'Kamis', revenue: 22000000 },
        { date: 'Jumat', revenue: 28000000 },
        { date: 'Sabtu', revenue: 18000000 },
        { date: 'Minggu', revenue: 24000000 }
    ];

    const formatRupiah = (value) => {
        if (value >= 1000000) {
            return `Rp ${(value / 1000000).toFixed(1)}M`;
        }
        return `Rp ${value.toLocaleString('id-ID')}`;
    };

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div style={{
                    background: '#fff',
                    padding: '12px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                }}>
                    <p style={{ margin: '0 0 5px 0', fontWeight: 'bold', color: '#475569' }}>{label}</p>
                    <p style={{ margin: '0', color: '#10b981', fontWeight: 'bold' }}>
                        Rp {payload[0].value.toLocaleString('id-ID')}
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1e293b', marginBottom: '16px' }}>
                {title}
            </h3>

            <div style={{ flexGrow: 1, minHeight: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                        data={chartData}
                        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                    >
                        <defs>
                            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <XAxis
                            dataKey="date"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#94a3b8', fontSize: 12 }}
                            dy={10}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#94a3b8', fontSize: 12 }}
                            tickFormatter={formatRupiah}
                        />
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <Tooltip content={<CustomTooltip />} />
                        <Area
                            type="monotone"
                            dataKey="revenue"
                            stroke="#10b981"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#colorRevenue)"
                            activeDot={{ r: 6, strokeWidth: 0, fill: '#059669' }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
