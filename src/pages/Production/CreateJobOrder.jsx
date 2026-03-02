/**
 * Create Job Order / Sales Order - Connected to Backend API
 * Features Enterprise Inline Data Grid for rapid entry
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/common/Card/Card';
import Button from '../../components/common/Button/Button';
import { createSalesOrder } from '../../services/productionApi';
import InlineDataGrid from './InlineDataGrid';
import './CreateJobOrder.css';

const API_BASE_URL = import.meta.env.VITE_AI_API_URL || "";

export default function CreateJobOrder() {
    const navigate = useNavigate();

    // Data from API
    const [products, setProducts] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);

    // Form state
    const [formData, setFormData] = useState({
        customerName: '',
        customerPhone: '',
        customerAddress: '',
        requiredDate: '',
        notes: ''
    });

    const [items, setItems] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState(null);
    const [stockWarnings, setStockWarnings] = useState([]);
    const [creditInfo, setCreditInfo] = useState(null);

    // Load products and customers
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            // Load products
            const allProducts = [];
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
            // Sort products by name for better dropdown UX
            const sorted = allProducts.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
            setProducts(sorted);

            // Load customers
            const custRes = await fetch(`${API_BASE_URL}/api/v1/so/customers/list`);
            const custData = await custRes.json();
            if (custData.status === 'success') {
                setCustomers(custData.data || []);
            }
        } catch (err) {
            console.error('Error loading data:', err);
        }
        setLoading(false);
    };

    // Derived product lists for grid autocomplete
    const hoseProducts = products.filter(p => p.category?.toUpperCase() === 'HOSE' || ['TUBE', 'PIPE'].includes(p.category?.toUpperCase()));
    const fittingProducts = products.filter(p => ['FITTING', 'CONNECTOR', 'ADAPTER', 'ACCESSORY', 'VALVE', 'CLAMP'].includes(p.category?.toUpperCase()));

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleCustomerSelect = async (customerName) => {
        const customer = customers.find(c => c.customer_name === customerName);
        if (customer) {
            setFormData(prev => ({
                ...prev,
                customerName: customer.customer_name,
                customerPhone: customer.customer_phone || '',
                customerAddress: customer.customer_address || ''
            }));
        } else {
            setFormData(prev => ({ ...prev, customerName }));
        }

        if (customerName) {
            await checkCreditLimit(customerName);
        } else {
            setCreditInfo(null);
        }
    };

    const checkCreditLimit = async (customerName) => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/customers/check-credit/${encodeURIComponent(customerName)}?order_amount=0`);
            const data = await res.json();
            if (data.status === 'success' && data.customer_found) {
                setCreditInfo(data.data);
            } else {
                setCreditInfo(null);
            }
        } catch (err) {
            console.error('Credit check error:', err);
        }
    };

    const handleStockCheck = async (rowIdx, productId, qtyNeeded) => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/jo/preview-allocation?product_id=${productId}&length=${qtyNeeded}`);
            const data = await res.json();
            if (data.status === 'success') {
                const isAvailable = data.data.total_available >= qtyNeeded;
                setItems(prevItems => {
                    const newItems = [...prevItems];
                    const currentItem = newItems[rowIdx];
                    if (currentItem) {
                        currentItem.stock_available = isAvailable;
                        currentItem.stock_qty = data.data.total_available;

                        if (!isAvailable) {
                            setStockWarnings(prevWarnings => [...prevWarnings.filter(w => w.itemId !== currentItem.id), {
                                itemId: currentItem.id,
                                product: currentItem.product_name,
                                needed: qtyNeeded,
                                available: data.data.total_available
                            }]);
                        } else {
                            setStockWarnings(prevWarnings => prevWarnings.filter(w => w.itemId !== currentItem.id));
                        }
                    }
                    return newItems;
                });
            }
        } catch (err) {
            console.error('Stock check error:', err);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Valid rows are rows with an actual product selected or manual description
        const validItems = items.filter(item => item.product_id || item.description);

        if (!formData.customerName.trim() || validItems.length === 0) {
            setMessage({ type: 'error', text: 'Isi nama customer dan tambahkan minimal 1 item baris yang valid!' });
            setTimeout(() => setMessage(null), 3000);
            return;
        }

        if (stockWarnings.length > 0) {
            const proceed = confirm(
                `⚠️ PERINGATAN STOK KURANG:\n\n` +
                stockWarnings.map(w => `• ${w.product}: Butuh ${w.needed}, Tersedia ${w.available}`).join('\n') +
                `\n\nLanjutkan membuat SO?`
            );
            if (!proceed) return;
        }

        setIsSubmitting(true);

        try {
            const soPayload = {
                customer_name: formData.customerName.trim(),
                customer_phone: formData.customerPhone || null,
                customer_address: formData.customerAddress || null,
                required_date: formData.requiredDate || null,
                notes: formData.notes || null,
                lines: validItems.map(item => ({
                    description: item.description,
                    hose_product_id: item.product_id, // Backward compatibility with API
                    fitting_a_id: item.type === 'ASSEMBLY' ? item.fitting_a_id : null,
                    fitting_b_id: item.type === 'ASSEMBLY' ? item.fitting_b_id : null,
                    cut_length: item.type === 'ASSEMBLY' ? (parseFloat(item.cut_length) || null) : null,
                    qty: parseInt(item.qty) || 1,
                    unit_price: parseFloat(item.unit_price) || 0,
                    is_assembly: item.type === 'ASSEMBLY'
                }))
            };

            const result = await createSalesOrder(soPayload);

            if (result.status === 'success') {
                setMessage({ type: 'success', text: `✅ SO ${result.data.so_number} berhasil dibuat!` });
                setTimeout(() => navigate('/production/sales-orders'), 1500);
            } else {
                setMessage({ type: 'error', text: result.message || 'Gagal membuat SO' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: err.message });
        }

        setIsSubmitting(false);
    };

    const getTodayDate = () => new Date().toISOString().split('T')[0];

    if (loading) {
        return (
            <div className="create-job-order">
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Memuat data katalog...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="create-job-order">
            {message && (
                <div className={`toast-message ${message.type}`}>
                    {message.text}
                </div>
            )}

            <div className="page-header compact-header">
                <div className="header-title-group">
                    <Button variant="ghost" className="btn-back" onClick={() => navigate('/production/sales-orders')}>
                        ←
                    </Button>
                    <div>
                        <h1 className="page-title">Sales Order Baru</h1>
                        <p className="page-subtitle">Entry data super cepat via keyboard</p>
                    </div>
                </div>
                <div className="header-actions">
                    <Button
                        variant="primary"
                        onClick={handleSubmit}
                        disabled={isSubmitting || items.filter(i => i.product_id).length === 0}
                    >
                        {isSubmitting ? 'Menyimpan...' : '💾 Simpan SO (F9)'}
                    </Button>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="enterprise-form">
                {/* Header Information (Compact Layout) */}
                <Card className="info-card compact-card">
                    <div className="compact-grid">
                        <div className="col-span-2">
                            <label htmlFor="customerName">Pelanggan *</label>
                            <input
                                id="customerName"
                                name="customerName"
                                type="text"
                                list="customer-list"
                                className="dense-input"
                                value={formData.customerName}
                                onChange={(e) => handleCustomerSelect(e.target.value)}
                                placeholder="Cari Pelanggan..."
                                required
                                autoFocus
                            />
                            <datalist id="customer-list">
                                {customers.map((c, idx) => (
                                    <option key={idx} value={c.customer_name} />
                                ))}
                            </datalist>
                        </div>

                        <div>
                            <label htmlFor="customerPhone">Telepon</label>
                            <input
                                id="customerPhone"
                                name="customerPhone"
                                type="tel"
                                className="dense-input"
                                value={formData.customerPhone}
                                onChange={handleChange}
                            />
                        </div>

                        <div>
                            <label htmlFor="requiredDate">Tgl Butuh</label>
                            <input
                                id="requiredDate"
                                name="requiredDate"
                                type="date"
                                className="dense-input"
                                value={formData.requiredDate}
                                onChange={handleChange}
                                min={getTodayDate()}
                            />
                        </div>

                        <div className="col-span-4">
                            <label htmlFor="notes">Catatan & Alamat Pengiriman</label>
                            <input
                                id="notes"
                                name="notes"
                                type="text"
                                className="dense-input"
                                value={formData.notes}
                                onChange={handleChange}
                                placeholder="Catatan SO atau alamat pengiriman detail..."
                            />
                        </div>
                    </div>

                    {/* Credit Limit Warning */}
                    {creditInfo && (
                        <div className={`credit-info-compact ${creditInfo.is_over_limit ? 'danger' : creditInfo.total_outstanding > 0 ? 'warning' : 'success'}`}>
                            <span className="credit-icon">{creditInfo.is_over_limit ? '⛔' : creditInfo.total_outstanding > 0 ? '⚠️' : '✅'}</span>
                            <span className="credit-text">Limit: <strong>Rp {creditInfo.credit_limit?.toLocaleString('id-ID')}</strong></span>
                            <span className="credit-text">Piutang: <strong>Rp {creditInfo.total_outstanding?.toLocaleString('id-ID')}</strong></span>
                            <span className="credit-text">Sisa: <strong className="available">Rp {creditInfo.available_credit?.toLocaleString('id-ID')}</strong></span>
                            {creditInfo.is_over_limit && <span className="credit-alert">⛔ Overlimit!</span>}
                        </div>
                    )}
                </Card>

                {/* Inline Data Grid Section */}
                <div className="grid-section">
                    <InlineDataGrid
                        items={items}
                        setItems={setItems}
                        hoseProducts={products} // Pass all products to hose/main column
                        fittingProducts={fittingProducts}
                        onStockCheck={handleStockCheck}
                    />
                </div>

                {stockWarnings.length > 0 && (
                    <div className="stock-warning-banner">
                        ⚠️ <strong>Peringatan Stok Kurang: </strong>
                        {stockWarnings.map(w => `${w.product} (Butuh ${w.needed}, Ada ${w.available})`).join(', ')}
                    </div>
                )}
            </form>
        </div>
    );
}
