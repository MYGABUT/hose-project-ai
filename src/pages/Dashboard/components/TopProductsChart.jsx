import React from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell
} from 'recharts';

/**
 * A horizontal bar chart showing top performing products.
 */
export default function TopProductsChart({ data, title = "Top 5 Produk Terlaris (Bulan Ini)" }) {

    // Default mock data to demonstrate UI capabilities
    const chartData = data && data.length > 0 ? data : [
        { name: 'Hose R2AT 1/2"', qty: 450, color: '#3b82f6' },
        { name: 'Hose 4SP 3/4"', qty: 380, color: '#6366f1' },
        { name: 'Fitting JIC Female 1/2"', qty: 310, color: '#8b5cf6' },
        { name: 'Adaptor BSP 1"', qty: 250, color: '#a855f7' },
        { name: 'Hose R1AT 1/4"', qty: 190, color: '#d946ef' }
    ];

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            return (
                <div style={{
                    background: '#fff',
                    padding: '12px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                }}>
                    <p style={{ margin: '0 0 5px 0', fontWeight: 'bold', color: '#475569' }}>
                        {payload[0].payload.name}
                    </p>
                    <p style={{ margin: '0', color: payload[0].payload.color || '#3b82f6', fontWeight: 'bold' }}>
                        {payload[0].value} Terjual
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
                    <BarChart
                        data={chartData}
                        layout="vertical"
                        margin={{ top: 0, right: 30, left: 0, bottom: 0 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={true} stroke="#e2e8f0" />
                        <XAxis
                            type="number"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#94a3b8', fontSize: 12 }}
                        />
                        <YAxis
                            dataKey="name"
                            type="category"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#475569', fontSize: 12, fontWeight: 500 }}
                            width={140}
                        />
                        <Tooltip cursor={{ fill: '#f8fafc' }} content={<CustomTooltip />} />
                        <Bar
                            dataKey="qty"
                            radius={[0, 4, 4, 0]}
                            barSize={32}
                        >
                            {
                                chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color || '#3b82f6'} />
                                ))
                            }
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
