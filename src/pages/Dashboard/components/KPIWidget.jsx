import React from 'react';
import './KPIWidget.css';

/**
 * Modern KPI Widget for Executive Dashboards
 */
export default function KPIWidget({
    title,
    value,
    icon,
    trendPrefix = '',
    trendValue = '',
    trendSuffix = '',
    trendDirection = 'neutral', // 'up', 'down', 'neutral'
    colorTheme = 'blue' // 'blue', 'green', 'indigo', 'orange'
}) {

    // Icon mappings if text emoji is used, or pass SVG
    const renderIcon = () => {
        if (typeof icon === 'string') return <span>{icon}</span>;
        return icon;
    };

    return (
        <div className={`kpi-widget theme-${colorTheme}`}>
            <div className="kpi-header">
                <h3 className="kpi-title">{title}</h3>
                <div className={`kpi-icon-wrapper`}>
                    {renderIcon()}
                </div>
            </div>

            <div className="kpi-body">
                <div className="kpi-value">{value}</div>

                {trendValue && (
                    <div className={`kpi-trend trend-${trendDirection}`}>
                        {trendDirection === 'up' && <span className="trend-arrow">↑</span>}
                        {trendDirection === 'down' && <span className="trend-arrow">↓</span>}
                        <span className="trend-text">
                            {trendPrefix} <strong>{trendValue}</strong> {trendSuffix}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}
