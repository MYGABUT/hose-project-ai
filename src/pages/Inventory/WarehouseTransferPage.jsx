import { useState, useEffect } from 'react';
import Card from '../../components/common/Card/Card';
import Button from '../../components/common/Button/Button';
import Input from '../../components/common/Input/Input';
import StatusBadge from '../../components/common/Badge/StatusBadge';
import {
    requestTransfer,
    approveTransfer,
    shipTransfer,
    receiveTransfer,
    getTransfers
} from '../../services/warehouseTransferApi';
import './WarehouseTransfer.css'; // Assume minimal CSS or reuse existing

export default function WarehouseTransferPage() {
    const [activeTab, setActiveTab] = useState('DRAFT'); // DRAFT, APPROVED, IN_TRANSIT, RECEIVED
    const [transfers, setTransfers] = useState([]);
    const [loading, setLoading] = useState(false);

    // Request Form State
    const [showRequestForm, setShowRequestForm] = useState(false);
    const [formData, setFormData] = useState({
        from_loc: '',
        to_loc: '',
        item_sku: '', // Simplified: Input SKU manually for now if no product picker
        qty: 1,
        notes: ''
    });

    useEffect(() => {
        fetchTransfers();
    }, [activeTab]);

    const fetchTransfers = async () => {
        setLoading(true);
        const res = await getTransfers(activeTab);
        if (res.status === 'success') {
            setTransfers(res.data);
        }
        setLoading(false);
    };

    const handleAction = async (action, id, extra = null) => {
        if (!confirm(`Are you sure you want to ${action} this transfer?`)) return;

        let res;
        if (action === 'approve') res = await approveTransfer(id);
        else if (action === 'ship') res = await shipTransfer(id, extra); // extra = tracking
        else if (action === 'receive') res = await receiveTransfer(id);

        if (res && res.status === 'success') {
            alert(res.message);
            fetchTransfers();
        } else {
            alert('Action failed: ' + (res?.message || 'Unknown error'));
        }
    };

    // Simplified Request Handler (Usually needs complex product picker)
    // Here we just show a placeholder/alert because full creation UI is complex
    const handleCreateRequest = () => {
        alert("Fitur Request Baru akan diimplementasikan dengan Product Picker lengkap di tahap selanjutnya.");
    };

    const renderTransferCard = (t) => (
        <Card key={t.id} className="transfer-card">
            <div className="card-header">
                <div>
                    <h4>{t.transfer_number}</h4>
                    <span className="date">{t.request_date}</span>
                </div>
                <StatusBadge status={t.status === 'RECEIVED' ? 'pass' : (t.status === 'APPROVED' ? 'active' : 'neutral')} />
            </div>
            <div className="card-body">
                <div className="route">
                    <strong>{t.from_location_name}</strong> ➔ <strong>{t.to_location_name}</strong>
                </div>
                <div className="requester">
                    Req by: {t.requested_by}
                </div>
                {t.notes && <div className="notes">"{t.notes}"</div>}
            </div>
            <div className="card-actions">
                {activeTab === 'DRAFT' && (
                    <Button size="sm" onClick={() => handleAction('approve', t.id)}>Approve</Button>
                )}
                {activeTab === 'APPROVED' && (
                    <Button size="sm" onClick={() => handleAction('ship', t.id, 'MANUAL-TRACKING')}>Ship</Button>
                )}
                {activeTab === 'IN_TRANSIT' && (
                    <Button size="sm" onClick={() => handleAction('receive', t.id)}>Receive</Button>
                )}
            </div>
        </Card>
    );

    return (
        <div className="warehouse-transfer-page">
            <div className="page-header">
                <h1>Mutasi Antar Gudang</h1>
                <Button onClick={handleCreateRequest}>+ Request Transfer</Button>
            </div>

            <div className="tabs">
                {['DRAFT', 'APPROVED', 'IN_TRANSIT', 'RECEIVED'].map(tab => (
                    <button
                        key={tab}
                        className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab)}
                    >
                        {tab.replace('_', ' ')}
                    </button>
                ))}
            </div>

            <div className="transfer-list">
                {loading ? <div>Loading...</div> : (
                    transfers.length > 0 ? transfers.map(renderTransferCard) : <div className="empty">Tidak ada data</div>
                )}
            </div>
        </div>
    );
}
