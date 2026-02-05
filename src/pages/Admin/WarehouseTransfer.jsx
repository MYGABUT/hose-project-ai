/**
 * Warehouse Transfer Page - Inter-warehouse stock movement
 */
import { useState, useEffect } from 'react';
import Card from '../../components/common/Card/Card';
import Button from '../../components/common/Button/Button';
import StatusBadge from '../../components/common/Badge/StatusBadge';
import './Admin.css';

const API_BASE_URL = import.meta.env.VITE_AI_API_URL || 'http://localhost:8000';

export default function WarehouseTransfer() {
    const [loading, setLoading] = useState(true);
    const [transfers, setTransfers] = useState([]);
    const [filter, setFilter] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filter) params.append('status', filter);

            const res = await fetch(`${API_BASE_URL}/api/v1/transfers?${params}`);
            const data = await res.json();
            if (data.status === 'success') setTransfers(data.data || []);
        } catch (err) {
            console.error('Error loading transfers:', err);
        }
        setLoading(false);
    };

    const performAction = async (id, action) => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/transfers/${id}/${action}`, {
                method: 'POST'
            });
            const data = await res.json();
            if (data.status === 'success') {
                loadData();
            }
        } catch (err) {
            console.error(`Error ${action}:`, err);
        }
    };

    const getStatusBadge = (status) => {
        const map = {
            'DRAFT': 'default',
            'APPROVED': 'info',
            'IN_TRANSIT': 'warning',
            'RECEIVED': 'success',
            'CANCELLED': 'danger'
        };
        return <StatusBadge status={map[status] || 'default'}>{status}</StatusBadge>;
    };

    return (
        <div className="admin-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">🚚 Mutasi Gudang</h1>
                    <p className="page-subtitle">Transfer stok antar lokasi</p>
                </div>
                <div className="header-actions">
                    <Button variant="secondary" onClick={loadData}>🔄 Refresh</Button>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="filter-tabs">
                {['', 'DRAFT', 'APPROVED', 'IN_TRANSIT', 'RECEIVED'].map(status => (
                    <button
                        key={status}
                        className={`filter-tab ${filter === status ? 'active' : ''}`}
                        onClick={() => { setFilter(status); loadData(); }}
                    >
                        {status || 'Semua'}
                    </button>
                ))}
            </div>

            {/* Transfer List */}
            <div className="transfer-list">
                {loading ? (
                    <div className="loading-state">Memuat transfer...</div>
                ) : transfers.length === 0 ? (
                    <Card className="empty-state">
                        <p>Belum ada transfer</p>
                    </Card>
                ) : (
                    transfers.map(t => (
                        <Card key={t.id} className="transfer-card">
                            <div className="transfer-header">
                                <span className="transfer-number">{t.transfer_number}</span>
                                {getStatusBadge(t.status)}
                                <span className="log-time">{t.request_date}</span>
                            </div>
                            <div className="transfer-route">
                                <span className="transfer-location">📍 {t.from_location}</span>
                                <span className="transfer-arrow">→</span>
                                <span className="transfer-location">📍 {t.to_location}</span>
                            </div>
                            <div className="transfer-actions">
                                {t.status === 'DRAFT' && (
                                    <Button size="sm" variant="primary" onClick={() => performAction(t.id, 'approve')}>
                                        ✅ Approve
                                    </Button>
                                )}
                                {t.status === 'APPROVED' && (
                                    <Button size="sm" variant="warning" onClick={() => performAction(t.id, 'ship')}>
                                        📦 Kirim
                                    </Button>
                                )}
                                {t.status === 'IN_TRANSIT' && (
                                    <Button size="sm" variant="success" onClick={() => performAction(t.id, 'receive')}>
                                        📥 Terima
                                    </Button>
                                )}
                            </div>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
