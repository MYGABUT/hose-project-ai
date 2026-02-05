import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/common/Card/Card';
import Button from '../../components/common/Button/Button';
import {
    getDeliveryOrders,
    getReadyToShip,
    confirmDeliveryOrder,
    dispatchDeliveryOrder,
    completeDeliveryOrder
} from '../../services/outboundApi';
import './Outbound.css';

const STATUS_BADGES = {
    DRAFT: { label: 'Draft', color: 'gray' },
    CONFIRMED: { label: 'Ready', color: 'blue' },
    IN_TRANSIT: { label: 'Dikirim', color: 'orange' },
    DELIVERED: { label: 'Selesai', color: 'green' },
    CANCELLED: { label: 'Batal', color: 'red' },
};

export default function DeliveryOrders() {
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [readyItems, setReadyItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [actionLoading, setActionLoading] = useState(null);
    const [showReadyPanel, setShowReadyPanel] = useState(false);

    useEffect(() => {
        loadData();
    }, [filter]);

    const loadData = async () => {
        setLoading(true);

        // Load DOs
        const params = {};
        if (filter !== 'all') params.status = filter;
        const doResult = await getDeliveryOrders(params);
        if (doResult.status === 'success') {
            setOrders(doResult.data);
        }

        // Load ready to ship
        const readyResult = await getReadyToShip();
        if (readyResult.status === 'success') {
            setReadyItems(readyResult.data);
        }

        setLoading(false);
    };

    const handleConfirm = async (doId) => {
        setActionLoading(doId);
        const result = await confirmDeliveryOrder(doId);
        if (result.status === 'success') {
            loadData();
        } else {
            alert(result.message);
        }
        setActionLoading(null);
    };

    const handleDispatch = async (doId) => {
        setActionLoading(doId);
        const result = await dispatchDeliveryOrder(doId);
        if (result.status === 'success') {
            loadData();
        } else {
            alert(result.message);
        }
        setActionLoading(null);
    };

    const handleComplete = async (doId) => {
        if (!confirm('Konfirmasi barang sudah diterima customer?')) return;

        setActionLoading(doId);
        const result = await completeDeliveryOrder(doId);
        if (result.status === 'success') {
            loadData();
        } else {
            alert(result.message);
        }
        setActionLoading(null);
    };

    const getStatusBadge = (status) => {
        const badge = STATUS_BADGES[status] || { label: status, color: 'gray' };
        return <span className={`status-badge ${badge.color}`}>{badge.label}</span>;
    };

    return (
        <div className="outbound-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">🚚 Delivery Orders</h1>
                    <p className="page-subtitle">Kelola pengiriman ke customer</p>
                </div>
                <div className="header-actions">
                    {readyItems.length > 0 && (
                        <Button
                            variant="secondary"
                            onClick={() => setShowReadyPanel(!showReadyPanel)}
                        >
                            📦 {readyItems.length} Siap Kirim
                        </Button>
                    )}
                    <Button
                        variant="primary"
                        onClick={() => navigate('/outbound/create')}
                        icon={<span>➕</span>}
                    >
                        Buat Surat Jalan
                    </Button>
                </div>
            </div>

            {/* Ready to Ship Panel */}
            {showReadyPanel && readyItems.length > 0 && (
                <Card className="ready-panel">
                    <h3>📦 Barang Siap Kirim</h3>
                    <div className="ready-list">
                        {readyItems.map((item, idx) => (
                            <div key={idx} className="ready-item">
                                <div className="ready-info">
                                    <span className="ready-so">{item.so_number}</span>
                                    <span className="ready-customer">{item.customer_name}</span>
                                </div>
                                <div className="ready-desc">{item.description}</div>
                                <div className="ready-qty">
                                    <strong>{item.qty_ready}</strong> pcs siap
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {/* Filter Tabs */}
            <div className="filter-tabs">
                {[
                    { key: 'all', label: 'Semua' },
                    { key: 'DRAFT', label: 'Draft' },
                    { key: 'CONFIRMED', label: 'Ready' },
                    { key: 'IN_TRANSIT', label: 'Dikirim' },
                    { key: 'DELIVERED', label: 'Selesai' },
                ].map(tab => (
                    <button
                        key={tab.key}
                        className={`filter-tab ${filter === tab.key ? 'active' : ''}`}
                        onClick={() => setFilter(tab.key)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Orders Table */}
            <Card>
                {loading ? (
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <p>Memuat data...</p>
                    </div>
                ) : orders.length === 0 ? (
                    <div className="empty-state">
                        <span className="empty-icon">📭</span>
                        <h3>Belum ada Delivery Order</h3>
                        <p>Klik "Buat Surat Jalan" untuk memulai</p>
                    </div>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>DO Number</th>
                                <th>SO</th>
                                <th>Customer</th>
                                <th>Driver</th>
                                <th>Qty</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.map(order => (
                                <tr key={order.id}>
                                    <td className="do-number">{order.do_number}</td>
                                    <td>{order.so_number || '-'}</td>
                                    <td>{order.customer_name}</td>
                                    <td>{order.driver_name || '-'}</td>
                                    <td>{order.total_qty} pcs</td>
                                    <td>{getStatusBadge(order.status)}</td>
                                    <td className="actions-cell">
                                        {order.status === 'DRAFT' && (
                                            <Button
                                                variant="success"
                                                size="sm"
                                                onClick={() => handleConfirm(order.id)}
                                                loading={actionLoading === order.id}
                                            >
                                                ✓ Confirm
                                            </Button>
                                        )}
                                        {order.status === 'CONFIRMED' && (
                                            <Button
                                                variant="primary"
                                                size="sm"
                                                onClick={() => handleDispatch(order.id)}
                                                loading={actionLoading === order.id}
                                            >
                                                🚚 Kirim
                                            </Button>
                                        )}
                                        {order.status === 'IN_TRANSIT' && (
                                            <Button
                                                variant="success"
                                                size="sm"
                                                onClick={() => handleComplete(order.id)}
                                                loading={actionLoading === order.id}
                                            >
                                                ✅ Selesai
                                            </Button>
                                        )}
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => navigate(`/outbound/${order.id}`)}
                                        >
                                            📄
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </Card>
        </div>
    );
}
