import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Card from '../../components/common/Card/Card';
import Button from '../../components/common/Button/Button';
import StatusBadge from '../../components/common/Badge/StatusBadge';
import { getSalesOrders, confirmSalesOrder } from '../../services/productionApi';
import './QuotationList.css';

const statusConfig = {
    DRAFT: { label: 'Draft', variant: 'warning' },
    CONFIRMED: { label: 'Confirmed', variant: 'success' },
    CANCELLED: { label: 'Cancelled', variant: 'fail' },
    FULL_JO: { label: 'Processed', variant: 'success' },
    PARTIAL_JO: { label: 'Partial', variant: 'info' }
};

export default function QuotationList() {
    const [quotations, setQuotations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        loadQuotations();
    }, []);

    const loadQuotations = async () => {
        setLoading(true);
        try {
            const res = await getSalesOrders({ limit: 50 });
            if (res.status === 'success') {
                setQuotations(res.data);
            }
        } catch (err) {
            console.error('Error loading quotations:', err);
        }
        setLoading(false);
    };

    const handleConfirm = async (id) => {
        if (!window.confirm('Confirm this order? It will be ready for Production.')) return;
        try {
            const res = await confirmSalesOrder(id);
            if (res.status === 'success') {
                loadQuotations(); // Reload
            } else {
                alert(res.message);
            }
        } catch (err) {
            alert('Error confirming order');
        }
    };

    const filteredQuotations = filter === 'all'
        ? quotations
        : quotations.filter(q => q.status === filter);

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(value);
    };

    return (
        <div className="quotation-list-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Daftar Penawaran</h1>
                    <p className="page-subtitle">Kelola quotation dan konversi ke Job Order</p>
                </div>
                <Link to="/sales/quotation/new">
                    <Button variant="primary" size="lg" icon={
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                    }>
                        Buat Penawaran Baru
                    </Button>
                </Link>
            </div>

            {/* Stats */}
            <div className="quotation-stats">
                <div className="stat-card">
                    <span className="stat-value">{quotations.length}</span>
                    <span className="stat-label">Total Penawaran</span>
                </div>
                <div className="stat-card">
                    <span className="stat-value">{quotations.filter(q => q.status === 'DRAFT').length}</span>
                    <span className="stat-label">Draft / Menunggu</span>
                </div>
                <div className="stat-card">
                    <span className="stat-value">{quotations.filter(q => ['CONFIRMED', 'FULL_JO'].includes(q.status)).length}</span>
                    <span className="stat-label">Confirmed / Processed</span>
                </div>
                <div className="stat-card">
                    <span className="stat-value">
                        {formatCurrency(quotations.reduce((sum, q) => sum + (q.total || 0), 0))}
                    </span>
                    <span className="stat-label">Total Nilai</span>
                </div>
            </div>

            {/* Filter tabs */}
            <div className="filter-tabs">
                <button
                    className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
                    onClick={() => setFilter('all')}
                >
                    Semua
                </button>
                <button
                    className={`filter-tab ${filter === 'DRAFT' ? 'active' : ''}`}
                    onClick={() => setFilter('DRAFT')}
                >
                    Draft
                </button>
                <button
                    className={`filter-tab ${filter === 'CONFIRMED' ? 'active' : ''}`}
                    onClick={() => setFilter('CONFIRMED')}
                >
                    Confirmed
                </button>
            </div>

            {/* Quotation Table */}
            <Card>
                <div className="quotation-table">
                    <div className="table-header">
                        <span>No. Quotation</span>
                        <span>Klien</span>
                        <span>Items</span>
                        <span>Total</span>
                        <span>Status</span>
                        <span>Aksi</span>
                    </div>

                    {loading ? <div className="p-4">Loading...</div> : filteredQuotations.map((quote) => (
                        <div key={quote.id} className="table-row">
                            <span className="quote-id">{quote.so_number}</span>
                            <span className="quote-client">{quote.customer_name}</span>
                            <span className="quote-items">{quote.line_count || 0} item</span>
                            <span className="quote-total">{formatCurrency(quote.total || 0)}</span>
                            <span className="quote-status">
                                <StatusBadge
                                    status={statusConfig[quote.status]?.variant || 'default'}
                                    size="sm"
                                />
                                <span className="status-text">{statusConfig[quote.status]?.label || quote.status}</span>
                            </span>
                            <span className="quote-actions">
                                {quote.status === 'DRAFT' && (
                                    <Button variant="success" size="sm" onClick={() => handleConfirm(quote.id)}>Confirm</Button>
                                )}
                            </span>
                        </div>
                    ))}
                </div>
            </Card>
        </div>
    );
}
