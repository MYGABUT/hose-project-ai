import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/common/Card/Card';
import Button from '../../components/common/Button/Button';
import Input from '../../components/common/Input/Input';
import AlertBox from '../../components/common/Alert/AlertBox';
import Modal from '../../components/common/Modal/Modal';
import MarginIndicator from '../../components/features/Pricing/MarginIndicator';
import './CreateQuotation.css';

const API_BASE_URL = import.meta.env.VITE_AI_API_URL || "";

const tierLabels = {
    gold: { label: 'Gold Client', color: 'gold' },
    silver: { label: 'Silver Client', color: 'silver' },
    regular: { label: 'Regular Client', color: 'regular' },
    new: { label: 'Klien Baru', color: 'new' }
};

export default function CreateQuotation() {
    const navigate = useNavigate();
    const [clients, setClients] = useState([]);
    const [products, setProducts] = useState([]);
    const [selectedClient, setSelectedClient] = useState('');
    const [items, setItems] = useState([
        { productId: '', qty: 1, sellingPrice: '' }
    ]);
    const [showApprovalModal, setShowApprovalModal] = useState(false);
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(true);

    // Load Data
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            // Load Customers
            const custRes = await fetch(`${API_BASE_URL}/api/v1/so/customers/list`);
            const custData = await custRes.json();
            if (custData.status === 'success') {
                // Map API data to UI structure
                const formattedClients = (custData.data || []).map((c, idx) => ({
                    id: c.customer_name, // Use name as ID for simple matching
                    name: c.customer_name,
                    tier: 'regular', // Default to regular, backend doesn't have tier yet
                    discount: 0
                }));
                setClients(formattedClients);
            }

            // Load Products
            let allProducts = [];
            let skip = 0;
            const batchSize = 100;
            while (true) {
                const prodRes = await fetch(`${API_BASE_URL}/api/v1/products?limit=${batchSize}&skip=${skip}`);
                const prodData = await prodRes.json();
                if (prodData.status === 'success' && prodData.data?.length > 0) {
                    allProducts.push(...prodData.data);
                    if (prodData.data.length < batchSize) break;
                    skip += batchSize;
                } else {
                    break;
                }
            }

            // Map products to simpler structure if needed, or use directly
            // Ensure cost_price is treated as hpp
            const formattedProducts = allProducts.map(p => ({
                id: p.id,
                name: p.name,
                hpp: p.cost_price || 0,
                unit: p.unit || 'Pcs'
            }));
            setProducts(formattedProducts);

        } catch (err) {
            console.error("Error loading data:", err);
            alert("Gagal memuat data dari server");
        }
        setLoading(false);
    };

    const client = clients.find(c => c.id === selectedClient);

    // Calculate totals
    const calculations = useMemo(() => {
        let totalHpp = 0;
        let totalSelling = 0;
        let needsApproval = false;

        items.forEach(item => {
            const product = products.find(p => p.id === item.productId);
            if (product) {
                const hpp = product.hpp * item.qty;
                const selling = (parseFloat(item.sellingPrice) || 0) * item.qty;
                totalHpp += hpp;
                totalSelling += selling;

                // Check if discount > 20%
                const itemMargin = hpp > 0 ? ((selling - hpp) / hpp) * 100 : 0;
                if (itemMargin < -20) {
                    needsApproval = true;
                }
            }
        });

        return { totalHpp, totalSelling, needsApproval };
    }, [items, products]);

    const handleClientChange = (e) => {
        setSelectedClient(e.target.value);
    };

    const handleItemChange = (index, field, value) => {
        setItems(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            return updated;
        });
    };

    const handleAddItem = () => {
        setItems(prev => [...prev, { productId: '', qty: 1, sellingPrice: '' }]);
    };

    const handleRemoveItem = (index) => {
        if (items.length > 1) {
            setItems(prev => prev.filter((_, i) => i !== index));
        }
    };

    const handleSaveDraft = () => {
        alert('Draft penawaran tersimpan!');
    };

    const handleSubmit = () => {
        if (calculations.needsApproval) {
            setShowApprovalModal(true);
        } else {
            handleConvertToJO();
        }
    };

    const handleConvertToJO = async () => {
        setShowApprovalModal(false);
        setLoading(true);

        try {
            // Unpack client info (in real app, fetched from DB by ID)
            const clientInfo = clients.find(c => c.id === selectedClient);

            const payload = {
                customer_name: clientInfo ? clientInfo.name : 'Unknown',
                notes: notes,
                required_date: new Date().toISOString(), // Default to today for now
                lines: items.map(item => {
                    const product = products.find(p => p.id === item.productId);
                    return {
                        product_id: item.productId,
                        description: product ? product.name : 'Unknown Item',
                        qty: item.qty,
                        unit_price: parseFloat(item.sellingPrice) || 0
                    };
                })
            };

            const { createSalesOrder } = await import('../../services/productionApi');
            const res = await createSalesOrder(payload);

            if (res.status === 'success') {
                alert(`Quotation berhasil dibuat! No: ${res.data.so_number}`);
                navigate('/production/sales-orders'); // Go to list
            } else {
                alert('Gagal membuat quotation: ' + (res.message || 'Unknown error'));
            }
        } catch (err) {
            console.error('Error creating SO:', err);
            alert('Terjadi kesalahan saat menyimpan data.');
        }
        setLoading(false);
    };

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(value);
    };

    if (loading) {
        return <div className="p-4">Memuat data...</div>;
    }

    return (
        <div className="create-quotation-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Buat Penawaran Baru</h1>
                    <p className="page-subtitle">Sales Mode - Tentukan harga dengan margin aman</p>
                </div>
                <div className="header-actions">
                    <Button variant="secondary" onClick={handleSaveDraft}>
                        Simpan Draft
                    </Button>
                    <Button variant="primary" onClick={handleSubmit}>
                        Kirim ke Produksi
                    </Button>
                </div>
            </div>

            {/* Client Selection */}
            <Card title="Pilih Klien">
                <div className="client-selection">
                    <select
                        className="client-select"
                        value={selectedClient || ''}
                        onChange={handleClientChange}
                    >
                        <option value="">-- Pilih Klien --</option>
                        {clients.map(c => (
                            <option key={c.id} value={c.id}>
                                {c.name}
                            </option>
                        ))}
                    </select>

                    {client && (
                        <div className={`client-tier tier-${client.tier}`}>
                            <span className="tier-badge">
                                {tierLabels[client.tier].label}
                            </span>
                            {client.discount > 0 && (
                                <span className="tier-discount">
                                    Diskon Standar: {client.discount}%
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </Card>

            {/* Items */}
            <Card title="Item Penawaran">
                <div className="quotation-items">
                    {items.map((item, index) => {
                        const product = products.find(p => p.id === item.productId);
                        const hpp = product?.hpp || 0;

                        return (
                            <div key={index} className="quotation-item">
                                <div className="item-header">
                                    <span className="item-number">Item {index + 1}</span>
                                    {items.length > 1 && (
                                        <button
                                            className="item-remove"
                                            onClick={() => handleRemoveItem(index)}
                                        >
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <line x1="18" y1="6" x2="6" y2="18" />
                                                <line x1="6" y1="6" x2="18" y2="18" />
                                            </svg>
                                        </button>
                                    )}
                                </div>

                                <div className="item-content">
                                    <div className="item-product">
                                        <label className="field-label">Produk</label>
                                        <select
                                            value={item.productId}
                                            onChange={(e) => handleItemChange(index, 'productId', parseInt(e.target.value))}
                                        >
                                            <option value="">-- Pilih Produk --</option>
                                            {products.map(p => (
                                                <option key={p.id} value={p.id}>{p.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="item-qty">
                                        <label className="field-label">Qty</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={item.qty}
                                            onChange={(e) => handleItemChange(index, 'qty', parseInt(e.target.value) || 1)}
                                        />
                                    </div>

                                    <div className="item-hpp">
                                        <label className="field-label">Modal (HPP)</label>
                                        <div className="hpp-value">
                                            {formatCurrency(hpp)}
                                            <span className="hpp-note">Hanya terlihat oleh Sales</span>
                                        </div>
                                    </div>

                                    <div className="item-price">
                                        <label className="field-label">Harga Jual (per Unit)</label>
                                        <div className="price-input-wrapper">
                                            <span className="currency-prefix">Rp</span>
                                            <input
                                                type="number"
                                                placeholder="0"
                                                value={item.sellingPrice}
                                                onChange={(e) => handleItemChange(index, 'sellingPrice', e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className="item-margin">
                                        <MarginIndicator
                                            costPrice={hpp}
                                            sellingPrice={item.sellingPrice || 0}
                                            showBreakdown={false}
                                        />
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    <Button variant="secondary" onClick={handleAddItem} fullWidth>
                        + Tambah Item
                    </Button>
                </div>
            </Card>

            {/* Summary */}
            <Card title="Ringkasan Penawaran">
                <div className="quotation-summary">
                    <div className="summary-row">
                        <span>Total Modal (HPP)</span>
                        <span className="summary-value muted">{formatCurrency(calculations.totalHpp)}</span>
                    </div>
                    <div className="summary-row">
                        <span>Total Harga Jual</span>
                        <span className="summary-value">{formatCurrency(calculations.totalSelling)}</span>
                    </div>
                    <div className="summary-divider" />
                    <div className="summary-row profit">
                        <span>Estimasi Profit</span>
                        <span className={`summary-value ${calculations.totalSelling - calculations.totalHpp >= 0 ? 'positive' : 'negative'}`}>
                            {formatCurrency(calculations.totalSelling - calculations.totalHpp)}
                        </span>
                    </div>

                    <MarginIndicator
                        costPrice={calculations.totalHpp}
                        sellingPrice={calculations.totalSelling}
                        showBreakdown={true}
                    />
                </div>

                {calculations.needsApproval && (
                    <AlertBox variant="warning" title="Perlu Persetujuan Manager">
                        Diskon melebihi 20% dari harga modal. Penawaran ini akan dikirim ke Manager untuk approval sebelum dikonversi ke Job Order.
                    </AlertBox>
                )}

                <div className="summary-notes">
                    <label className="field-label">Catatan (Opsional)</label>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Catatan untuk tim produksi..."
                        rows={3}
                    />
                </div>
            </Card>

            {/* Approval Modal */}
            <Modal
                isOpen={showApprovalModal}
                onClose={() => setShowApprovalModal(false)}
                title="Konfirmasi Approval"
            >
                <div className="approval-modal-content">
                    <AlertBox variant="warning">
                        Penawaran ini memiliki margin sangat rendah atau negatif. Apakah Anda yakin ingin melanjutkan?
                    </AlertBox>

                    <p>Penawaran akan dikirim ke Manager untuk review dan persetujuan.</p>

                    <div className="approval-actions">
                        <Button variant="secondary" onClick={() => setShowApprovalModal(false)}>
                            Batal, Revisi Harga
                        </Button>
                        <Button variant="warning" onClick={handleConvertToJO}>
                            Kirim untuk Approval
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
