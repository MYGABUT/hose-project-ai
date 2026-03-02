import React from 'react';
import './DashboardComponents.css';
import { FaUser, FaBox, FaFileInvoice, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';

const getIcon = (type) => {
    switch (type) {
        case 'USER_LOGIN': return <FaUser className="text-primary" />;
        case 'STOCK_UPDATE': return <FaBox className="text-warning" />;
        case 'INVOICE_CREATE': return <FaFileInvoice className="text-success" />;
        case 'APPROVAL': return <FaCheckCircle className="text-info" />;
        default: return <FaExclamationCircle className="text-gray" />;
    }
};

const formatTime = (timestamp) => {
    // Simple mock time formatter, replace with date-fns if needed
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export default function ActivityFeed({ activities = [], title = "Recent Activity" }) {
    // Fallback if empty
    const displayActivities = activities.length > 0 ? activities : [
        { id: 1, type: 'USER_LOGIN', message: 'Budi (Sales) logged in', timestamp: Date.now() - 300000 },
        { id: 2, type: 'INVOICE_CREATE', message: 'Invoice #INV-001 created', timestamp: Date.now() - 3600000 },
        { id: 3, type: 'STOCK_UPDATE', message: 'Stock update: Hydraulic Hose x50', timestamp: Date.now() - 7200000 },
        { id: 4, type: 'APPROVAL', message: 'Manager approved QT-2024-002', timestamp: Date.now() - 18000000 }
    ];

    return (
        <div className="activity-feed">
            <div className="chart-header">
                <h3 className="chart-title">{title}</h3>
            </div>
            <div className="feed-list">
                {displayActivities.map(item => (
                    <div key={item.id} className="feed-item">
                        <div className="feed-icon">
                            {getIcon(item.type)}
                        </div>
                        <div className="feed-content">
                            <p>{item.message}</p>
                            <span className="feed-meta">{item.timestamp ? formatTime(item.timestamp) : 'Just now'}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
