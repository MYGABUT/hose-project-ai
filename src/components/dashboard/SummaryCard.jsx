import React from 'react';
import './DashboardComponents.css';
import { FaArrowUp, FaArrowDown, FaMinus } from 'react-icons/fa';

export default function SummaryCard({ title, value, icon, trend, trendLabel, color = 'primary' }) {
    const trendIcon = trend > 0 ? <FaArrowUp /> : trend < 0 ? <FaArrowDown /> : <FaMinus />;
    const trendClass = trend > 0 ? 'trend-up' : trend < 0 ? 'trend-down' : 'trend-neutral';

    return (
        <div className={`summary-card border-${color}`}>
            <div className="card-icon-wrapper" style={{ backgroundColor: `var(--${color}-light)`, color: `var(--${color})` }}>
                {icon}
            </div>
            <div className="card-content">
                <h3 className="card-title">{title}</h3>
                <div className="card-value">{value}</div>
                {trend !== undefined && (
                    <div className={`card-trend ${trendClass}`}>
                        {trendIcon}
                        <span>{Math.abs(trend)}% {trendLabel}</span>
                    </div>
                )}
            </div>
        </div>
    );
}
