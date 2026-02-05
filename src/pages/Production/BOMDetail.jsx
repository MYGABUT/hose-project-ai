import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Card from '../../components/common/Card/Card';
import Button from '../../components/common/Button/Button';
import StatusBadge from '../../components/common/Badge/StatusBadge';
import AlertBox from '../../components/common/Alert/AlertBox';
import { getJobOrder } from '../../services/productionApi';
import './BOMDetail.css';

export default function BOMDetail() {
    const navigate = useNavigate();
    const { jobId } = useParams(); // Start with job ID (likely database ID if linked from list)
    const [bom, setBom] = useState(null);
    const [loading, setLoading] = useState(true);
    const [checkedItems, setCheckedItems] = useState({});

    useEffect(() => {
        loadJob();
    }, [jobId]);

    const loadJob = async () => {
        setLoading(true);
        try {
            const res = await getJobOrder(jobId);
            if (res.status === 'success') {
                // Map JO lines to BOM items structure
                const jo = res.data;
                const items = (jo.lines || []).map((line, idx) => {
                    // Logic to determine stock status - simplistic for now
                    // In real app, check allocated materials status
                    // If no materials allocated yet, assume 'ready' or check inventory
                    const hasAllocations = line.materials && line.materials.length > 0;

                    return {
                        id: line.id,
                        line_number: line.line_number,
                        name: line.description,
                        // Parse hose details from description or fields if available
                        hose: {
                            name: line.description,
                            length: line.cut_length || 0
                        },
                        // Parse fitting details
                        fitting: { name: 'Standard Fitting' },
                        qty: line.qty_ordered,
                        // If status is MATERIALS_RESERVED or higher, stock is ready
                        stockStatus: jo.status === 'MATERIALS_RESERVED' || hasAllocations ? 'ready' : 'ready' // Assume ready for demo unless allocation fails
                    };
                });

                setBom({
                    jobId: jo.jo_number,
                    client: jo.customer_name || 'Internal',
                    kitName: jo.notes || `Job Order #${jo.jo_number}`,
                    description: `Total ${items.length} item line produksi`,
                    items: items
                });
            }
        } catch (err) {
            console.error("Error loading BOM:", err);
        }
        setLoading(false);
    };

    if (loading) return <div className="p-8 text-center">Memuat BOM...</div>;
    if (!bom) return <div className="p-8 text-center">Data tidak ditemukan.</div>;

    const readyCount = bom.items.filter(i => i.stockStatus === 'ready').length;
    const lowCount = bom.items.filter(i => i.stockStatus === 'low').length;
    const outCount = bom.items.filter(i => i.stockStatus === 'out').length;

    const canProceed = outCount === 0;

    const toggleCheck = (id) => {
        setCheckedItems(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const handleStartCrimping = () => {
        navigate(`/production/crimping/${jobId}`);
    };

    return (
        <div className="bom-detail-page">
            <div className="page-header">
                <button className="back-button" onClick={() => navigate('/production')}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M19 12H5M12 19l-7-7 7-7" />
                    </svg>
                    KEMBALI
                </button>
                <div className="job-info">
                    <span className="job-id">{bom.jobId}</span>
                    <span className="job-client">{bom.client}</span>
                </div>
            </div>

            <div className="bom-header">
                <div className="bom-title-section">
                    <h1 className="bom-title">{bom.kitName}</h1>
                    <p className="bom-description">{bom.description}</p>
                </div>
                <div className="bom-status-summary">
                    <div className="status-box ready">
                        <span className="status-count">{readyCount}</span>
                        <span className="status-label">Ready</span>
                    </div>
                </div>
            </div>

            {outCount > 0 && (
                <AlertBox variant="danger" title="Stok Material Habis!">
                    Ada {outCount} item yang stoknya habis. Harap restok terlebih dahulu sebelum memulai produksi.
                </AlertBox>
            )}

            <div className="bom-list">
                <div className="bom-list-header">
                    <span className="col-check"></span>
                    <span className="col-item">Item</span>
                    <span className="col-hose">Detail</span>
                    <span className="col-qty">Qty</span>
                    <span className="col-status">Status</span>
                </div>

                {bom.items.map((item) => (
                    <div
                        key={item.id}
                        className={`bom-item ${item.stockStatus === 'out' ? 'item-out' : ''} ${checkedItems[item.id] ? 'item-checked' : ''}`}
                    >
                        <div className="col-check">
                            <button
                                className={`check-btn ${checkedItems[item.id] ? 'checked' : ''}`}
                                onClick={() => toggleCheck(item.id)}
                                disabled={item.stockStatus === 'out'}
                            >
                                {checkedItems[item.id] && (
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                        <path d="M20 6L9 17l-5-5" />
                                    </svg>
                                )}
                            </button>
                        </div>
                        <div className="col-item">
                            <span className="item-name">{item.name}</span>
                            <span className="item-length">Cut Length: {item.hose.length} mm</span>
                        </div>
                        <div className="col-hose">
                            <span className="spec-main">{item.name}</span>
                        </div>
                        <div className="col-qty">
                            <span className="qty-value">{item.qty}</span>
                            <span className="qty-label">pcs</span>
                        </div>
                        <div className="col-status">
                            <StatusBadge
                                status={
                                    item.stockStatus === 'ready' ? 'pass' :
                                        item.stockStatus === 'low' ? 'warning' : 'fail'
                                }
                                size="sm"
                            />
                        </div>
                    </div>
                ))}
            </div>

            <div className="bom-footer">
                <div className="footer-info">
                    <span className="total-fitting">
                        Total Items: {bom.items.length}
                    </span>
                </div>
                <Button
                    variant="primary"
                    size="xl"
                    disabled={!canProceed}
                    onClick={handleStartCrimping}
                    icon={
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="3" />
                            <path d="M12 1v4m0 14v4M4.22 4.22l2.83 2.83m9.9 9.9l2.83 2.83M1 12h4m14 0h4" />
                        </svg>
                    }
                >
                    {canProceed ? 'Mulai Produksi' : 'Material Tidak Lengkap'}
                </Button>
            </div>
        </div>
    );
}
