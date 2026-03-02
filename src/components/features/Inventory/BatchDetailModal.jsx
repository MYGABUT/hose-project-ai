import { useState, useEffect } from 'react';
import './BatchDetailModal.css';

const API_BASE_URL = import.meta.env.VITE_AI_API_URL || "";

export default function BatchDetailModal({ isOpen, onClose, productInfo }) {
    const [batches, setBatches] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isOpen && productInfo?.id) {
            loadBatches();
        }
    }, [isOpen, productInfo]);

    const loadBatches = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/batches?product_id=${productInfo.id}`);
            const data = await res.json();
            if (data.status === 'success') {
                setBatches(data.data || []);
            } else {
                setError(data.message || 'Gagal memuat detail batch');
            }
        } catch (err) {
            console.error(err);
            setError('Terjadi kesalahan jaringan.');
        }
        setLoading(false);
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        return d.toLocaleDateString('id-ID', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    if (!isOpen) return null;

    return (
        <div className="batch-modal-overlay">
            <div className="batch-modal-content">
                <div className="batch-modal-header">
                    <h2>Detail Isi Batch / Roll</h2>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>

                <div className="batch-modal-info">
                    <strong>{productInfo?.sku}</strong> - {productInfo?.name}
                </div>

                <div className="batch-modal-body">
                    {loading ? (
                        <div className="loading-state">Memuat data histori batch...</div>
                    ) : error ? (
                        <div className="error-state">{error}</div>
                    ) : batches.length === 0 ? (
                        <div className="empty-state">Tidak ada data batch untuk produk ini.</div>
                    ) : (
                        <table className="batch-table">
                            <thead>
                                <tr>
                                    <th>Waktu Input</th>
                                    <th>Barcode / Item ID</th>
                                    <th>Supplier Batch</th>
                                    <th>Status Gudang</th>
                                    <th>Status Opname</th>
                                    <th>Lokasi</th>
                                    <th className="num">Sisa Qty</th>
                                </tr>
                            </thead>
                            <tbody>
                                {batches.map(b => (
                                    <tr key={b.id}>
                                        <td>{formatDate(b.received_date)}</td>
                                        <td><strong>{b.barcode}</strong></td>
                                        <td>{b.batch_number || '-'}</td>
                                        <td>
                                            <span className={`status-badge ${b.status?.toLowerCase()}`}>
                                                {b.status}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'center', fontSize: '1.2rem' }}>
                                            {b.is_opnamed ? '✅' : '❌'}
                                        </td>
                                        <td>{b.location?.code || '-'}</td>
                                        <td className="num"><strong>{b.current_qty}</strong></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}
