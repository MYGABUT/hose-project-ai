/**
 * Audit Trail Page - View user activity logs
 */
import { useState, useEffect } from 'react';
import Card from '../../components/common/Card/Card';
import Button from '../../components/common/Button/Button';
import StatusBadge from '../../components/common/Badge/StatusBadge';
import './Admin.css';

const API_BASE_URL = import.meta.env.VITE_AI_API_URL || "";

export default function AuditTrail() {
    const [loading, setLoading] = useState(true);
    const [logs, setLogs] = useState([]);
    const [summary, setSummary] = useState(null);
    const [filter, setFilter] = useState({ action: '', entity_type: '', user_name: '' });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filter.action) params.append('action', filter.action);
            if (filter.entity_type) params.append('entity_type', filter.entity_type);
            if (filter.user_name) params.append('user_name', filter.user_name);

            const [logsRes, summaryRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/v1/audit/logs?${params}`),
                fetch(`${API_BASE_URL}/api/v1/audit/logs/summary?days=7`)
            ]);

            const logsData = await logsRes.json();
            const summaryData = await summaryRes.json();

            if (logsData.status === 'success') setLogs(logsData.data || []);
            if (summaryData.status === 'success') setSummary(summaryData);
        } catch (err) {
            console.error('Error loading audit logs:', err);
        }
        setLoading(false);
    };

    const getActionBadge = (action) => {
        const map = {
            'CREATE': 'success',
            'UPDATE': 'warning',
            'DELETE': 'danger',
            'LOCK': 'info',
            'UNLOCK': 'warning'
        };
        return <StatusBadge status={map[action] || 'default'}>{action}</StatusBadge>;
    };

    const formatTime = (timestamp) => {
        if (!timestamp) return '-';
        const date = new Date(timestamp);
        return date.toLocaleString('id-ID');
    };

    return (
        <div className="admin-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">📋 Audit Trail</h1>
                    <p className="page-subtitle">Log aktivitas user untuk pengawasan</p>
                </div>
                <div className="header-actions">
                    <Button variant="secondary" onClick={loadData}>🔄 Refresh</Button>
                </div>
            </div>

            {/* Summary Cards */}
            {summary && (
                <div className="summary-grid">
                    <Card className="summary-card">
                        <div className="summary-content">
                            <span className="summary-value">{summary.total_activities}</span>
                            <span className="summary-label">Total Aktivitas (7 hari)</span>
                        </div>
                    </Card>
                    <Card className="summary-card success">
                        <div className="summary-content">
                            <span className="summary-value">{summary.by_action?.CREATE || 0}</span>
                            <span className="summary-label">CREATE</span>
                        </div>
                    </Card>
                    <Card className="summary-card warning">
                        <div className="summary-content">
                            <span className="summary-value">{summary.by_action?.UPDATE || 0}</span>
                            <span className="summary-label">UPDATE</span>
                        </div>
                    </Card>
                    <Card className="summary-card danger">
                        <div className="summary-content">
                            <span className="summary-value">{summary.by_action?.DELETE || 0}</span>
                            <span className="summary-label">DELETE</span>
                        </div>
                    </Card>
                </div>
            )}

            {/* Filters */}
            <Card className="filter-card">
                <div className="filter-row">
                    <select
                        value={filter.action}
                        onChange={(e) => setFilter({ ...filter, action: e.target.value })}
                    >
                        <option value="">Semua Action</option>
                        <option value="CREATE">CREATE</option>
                        <option value="UPDATE">UPDATE</option>
                        <option value="DELETE">DELETE</option>
                    </select>
                    <select
                        value={filter.entity_type}
                        onChange={(e) => setFilter({ ...filter, entity_type: e.target.value })}
                    >
                        <option value="">Semua Entity</option>
                        <option value="Invoice">Invoice</option>
                        <option value="JO">Job Order</option>
                        <option value="Product">Product</option>
                        <option value="Customer">Customer</option>
                        <option value="Period">Period</option>
                    </select>
                    <input
                        type="text"
                        placeholder="Nama User..."
                        value={filter.user_name}
                        onChange={(e) => setFilter({ ...filter, user_name: e.target.value })}
                    />
                    <Button variant="primary" onClick={loadData}>🔍 Filter</Button>
                </div>
            </Card>

            {/* Log List */}
            <div className="log-list">
                {loading ? (
                    <div className="loading-state">Memuat audit logs...</div>
                ) : logs.length === 0 ? (
                    <Card className="empty-state">
                        <p>Belum ada aktivitas tercatat</p>
                    </Card>
                ) : (
                    logs.map(log => (
                        <Card key={log.id} className="log-card">
                            <div className="log-header">
                                <span className="log-time">{formatTime(log.timestamp)}</span>
                                {getActionBadge(log.action)}
                                <span className="log-entity">{log.entity_type}</span>
                            </div>
                            <div className="log-body">
                                <div className="log-detail">
                                    <span className="log-user">👤 {log.user_name}</span>
                                    <span className="log-number">{log.entity_number}</span>
                                </div>
                                {log.changes_summary && (
                                    <div className="log-changes">{log.changes_summary}</div>
                                )}
                            </div>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
