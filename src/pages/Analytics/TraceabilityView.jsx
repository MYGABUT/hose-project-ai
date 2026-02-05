
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Card from '../../components/common/Card/Card';
import Input from '../../components/common/Input/Input';
import Button from '../../components/common/Button/Button';
import './TraceabilityView.css';

const API_BASE_URL = import.meta.env.VITE_AI_API_URL || 'http://localhost:8000';

export default function TraceabilityView() {
    const { soId } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [searchId, setSearchId] = useState(soId || '');
    const [searchType, setSearchType] = useState('SO'); // 'SO' or 'BATCH'

    useEffect(() => {
        if (soId) fetchTraceability(soId, 'SO');
    }, [soId]);

    const fetchTraceability = async (id, type) => {
        setLoading(true);
        try {
            const endpoint = type === 'SO'
                ? `${API_BASE_URL}/api/v1/traceability/so/${id}`
                : `${API_BASE_URL}/api/v1/traceability/batch/${id}`;

            const res = await fetch(endpoint);
            const resData = await res.json();

            if (resData.status === 'success') {
                setData({ type, content: resData.data });
            } else {
                alert("Data traceability tidak ditemukan");
                setData(null);
            }
        } catch (err) {
            console.error(err);
            alert("Error fetching data");
        }
        setLoading(false);
    };

    const handleSearch = () => {
        if (searchId) fetchTraceability(searchId, searchType);
    };

    // Recursive Tree Renderer for SO
    const renderTree = (node) => {
        const getStatusColor = (status, type) => {
            if (type === 'SO') return status === 'DONE' ? 'green' : 'blue';
            if (type === 'JO') return status === 'COMPLETED' ? 'green' : (status === 'IN_PROGRESS' ? 'orange' : 'gray');
            if (type === 'PR') return status === 'ORDERED' ? 'green' : (status === 'APPROVED' ? 'blue' : 'gray');
            if (type === 'PO') return 'purple';
            return 'gray';
        }

        return (
            <div className="tree-node-wrapper" key={node.id}>
                <div className={`tree-node ${node.type} border-${getStatusColor(node.status, node.type)}`}>
                    <div className="node-header">
                        <span className="node-type">{node.type}</span>
                        <span className={`node-status bg-${getStatusColor(node.status, node.type)}`}>{node.status}</span>
                    </div>
                    <div className="node-body">
                        <div className="node-label">{node.label}</div>
                        <div className="node-details">{node.details}</div>
                    </div>
                </div>

                {node.children && node.children.length > 0 && (
                    <div className="tree-children">
                        {node.children.map(child => renderTree(child))}
                    </div>
                )}
            </div>
        );
    };

    // Timeline Renderer for Batch
    const renderBatchTimeline = (batchData) => {
        const { batch_info, origin, history, current_status } = batchData;

        return (
            <div className="batch-view">
                <Card className="batch-header-card">
                    <h2>📦 Batch: {batch_info.barcode}</h2>
                    <div className="batch-meta">
                        <span>Product: <strong>{batch_info.product}</strong> ({batch_info.sku})</span>
                        <span>Current Qty: <strong>{current_status.current_qty}</strong></span>
                        <span>Location: <strong>{current_status.location}</strong></span>
                        <span>Status: <strong className={`status-${current_status.status.toLowerCase()}`}>{current_status.status}</strong></span>
                    </div>
                </Card>

                <div className="batch-timeline">
                    {/* Origin Point */}
                    <div className="timeline-item origin">
                        <div className="time-marker">START</div>
                        <div className="time-content">
                            <h3>🐣 Origin / Receipt</h3>
                            <p>Source: {origin.source} ({origin.reference})</p>
                            <p>Date: {origin.date ? new Date(origin.date).toLocaleString() : 'N/A'}</p>
                            <p>Initial Qty: {origin.initial_qty}</p>
                        </div>
                    </div>

                    {/* History Points */}
                    {history.map((evt, idx) => (
                        <div className="timeline-item" key={idx}>
                            <div className="time-marker">{evt.date ? new Date(evt.date).toLocaleDateString() : '?'}</div>
                            <div className="time-content">
                                <h3>{evt.type}</h3>
                                <p className="move-detail">
                                    {evt.from} ➔ {evt.to}
                                </p>
                                <p className="qty-detail {evt.qty < 0 ? 'neg' : 'pos'}">
                                    qty: {evt.qty}
                                </p>
                                <p className="meta">Valid by: {evt.performed_by}</p>
                            </div>
                        </div>
                    ))}

                    {/* Current End */}
                    <div className="timeline-item current">
                        <div className="time-marker">NOW</div>
                        <div className="time-content">
                            <h3>📍 Current State</h3>
                            <p>Location: {current_status.location}</p>
                            <p>Age: {current_status.age_days} days</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="trace-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">🔗 End-to-End Traceability</h1>
                    <p className="page-subtitle">Lacak pesanan (SO) atau sejarah barang (Batch)</p>
                </div>
                <div className="search-bar-wrapper">
                    <div className="search-type-toggle">
                        <button
                            className={searchType === 'SO' ? 'active' : ''}
                            onClick={() => setSearchType('SO')}
                        >
                            Sales Order
                        </button>
                        <button
                            className={searchType === 'BATCH' ? 'active' : ''}
                            onClick={() => setSearchType('BATCH')}
                        >
                            Batch ID
                        </button>
                    </div>
                    <div className="search-bar">
                        <Input
                            placeholder={`Masukkan ${searchType} ID...`}
                            value={searchId}
                            onChange={e => setSearchId(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSearch()}
                        />
                        <Button onClick={handleSearch}>Cari</Button>
                    </div>
                </div>
            </div>

            <div className="trace-container">
                {loading && <div className="loading">Memuat Data...</div>}

                {!loading && data && (
                    <div className="trace-canvas">
                        {data.type === 'SO' ? renderTree(data.content) : renderBatchTimeline(data.content)}
                    </div>
                )}

                {!loading && !data && (
                    <div className="empty-state">
                        Silakan cari ID untuk melihat jejak data.
                    </div>
                )}
            </div>
        </div>
    );
}
