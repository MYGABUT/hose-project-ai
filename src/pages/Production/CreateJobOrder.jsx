/**
 * Create Job Order / Sales Order - Connected to Backend API
 * Fetches products from database, creates SO which can be converted to JO
 * Optimized with ComboInput for better UX
 */
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/common/Card/Card';
import Button from '../../components/common/Button/Button';
import { createSalesOrder } from '../../services/productionApi';
import './CreateJobOrder.css';

const API_BASE_URL = import.meta.env.VITE_AI_API_URL || 'http://localhost:8000';

// Reusable ComboInput Component
function ComboInput({ items, value, onChange, onAddNew, placeholder, displayField = 'name', idField = 'id' }) {
    const [search, setSearch] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [highlighted, setHighlighted] = useState(-1);
    const inputRef = useRef(null);
    const dropdownRef = useRef(null);

    const selectedItem = items.find(i => i[idField] === value);
    const displayValue = selectedItem ? selectedItem[displayField] : '';

    const filtered = items.filter(item =>
        item[displayField]?.toLowerCase().includes(search.toLowerCase()) ||
        item.sku?.toLowerCase().includes(search.toLowerCase())
    );

    const handleSelect = (item) => {
        onChange(item[idField]);
        setSearch('');
        setIsOpen(false);
        setHighlighted(-1);
    };

    const handleKeyDown = (e) => {
        if (!isOpen) {
            if (e.key === 'ArrowDown' || e.key === 'Enter') {
                setIsOpen(true);
                e.preventDefault();
            }
            return;
        }

        switch (e.key) {
            case 'ArrowDown':
                setHighlighted(h => Math.min(h + 1, filtered.length - 1));
                e.preventDefault();
                break;
            case 'ArrowUp':
                setHighlighted(h => Math.max(h - 1, 0));
                e.preventDefault();
                break;
            case 'Enter':
                if (highlighted >= 0 && filtered[highlighted]) {
                    handleSelect(filtered[highlighted]);
                } else if (search.trim() && onAddNew) {
                    onAddNew(search.trim());
                    setSearch('');
                    setIsOpen(false);
                }
                e.preventDefault();
                break;
            case 'Escape':
                setIsOpen(false);
                setHighlighted(-1);
                break;
        }
    };

    useEffect(() => {
        if (highlighted >= 0 && dropdownRef.current) {
            const items = dropdownRef.current.querySelectorAll('.combo-item');
            items[highlighted]?.scrollIntoView({ block: 'nearest' });
        }
    }, [highlighted]);

    return (
        <div className="combo-input-container">
            <input
                ref={inputRef}
                type="text"
                className="combo-input"
                placeholder={value ? displayValue : placeholder}
                value={isOpen ? search : displayValue}
                onFocus={() => { setIsOpen(true); setSearch(''); }}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={() => setTimeout(() => setIsOpen(false), 200)}
            />
            {value && (
                <button
                    type="button"
                    className="combo-clear"
                    onClick={() => { onChange(null); setSearch(''); }}
                >
                    ✕
                </button>
            )}
            {isOpen && (
                <div className="combo-dropdown" ref={dropdownRef}>
                    {filtered.length === 0 ? (
                        <div className="combo-empty">
                            {onAddNew ? (
                                <button
                                    type="button"
                                    className="combo-add-new"
                                    onClick={() => { onAddNew(search.trim()); setSearch(''); setIsOpen(false); }}
                                >
                                    ➕ Tambah "{search}"
                                </button>
                            ) : (
                                <span>Tidak ditemukan</span>
                            )}
                        </div>
                    ) : (
                        filtered.slice(0, 15).map((item, idx) => (
                            <div
                                key={item[idField]}
                                className={`combo-item ${highlighted === idx ? 'highlighted' : ''}`}
                                onMouseDown={() => handleSelect(item)}
                                onMouseEnter={() => setHighlighted(idx)}
                            >
                                <span className="combo-item-name">{item[displayField]}</span>
                                {item.sku && <span className="combo-item-sku">{item.sku}</span>}
                            </div>
                        ))
                    )}
                    {filtered.length > 15 && (
                        <div className="combo-more">+{filtered.length - 15} lainnya...</div>
                    )}
                </div>
            )}
        </div>
    );
}

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
    const [showAddItem, setShowAddItem] = useState(false);
    const [newItem, setNewItem] = useState({
        hoseProductId: null,
        fittingAId: null,
        fittingBId: null,
        cutLength: '',
        qty: 1,
        description: '',
        unitPrice: 0
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState(null);
    const [stockWarnings, setStockWarnings] = useState([]);
    const [creditInfo, setCreditInfo] = useState(null);  // Credit limit info

    // Load products and customers from API
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            // Load products (backend max limit is 100)
            const allProducts = [];
            let skip = 0;
            const batchSize = 100;

            // Fetch products in batches
            while (true) {
                const prodRes = await fetch(`${API_BASE_URL}/api/v1/products?limit=${batchSize}&skip=${skip}`);
                const prodData = await prodRes.json();
                if (prodData.status === 'success' && prodData.data?.length > 0) {
                    allProducts.push(...prodData.data);
                    if (prodData.data.length < batchSize) break; // Last batch
                    skip += batchSize;
                } else {
                    break;
                }
            }
            setProducts(allProducts);

            // Load customers from SO history (correct endpoint)
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

    const hoseProducts = products.filter(p => p.category?.toUpperCase() === 'HOSE');
    const fittingProducts = products.filter(p =>
        ['FITTING', 'CONNECTOR', 'ADAPTER', 'ACCESSORY'].includes(p.category?.toUpperCase())
    );

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

        // Check credit limit for customer
        if (customerName) {
            await checkCreditLimit(customerName);
        } else {
            setCreditInfo(null);
        }
    };

    // Check credit limit for customer
    const checkCreditLimit = async (customerName) => {
        try {
            const res = await fetch(
                `${API_BASE_URL}/api/v1/customers/check-credit/${encodeURIComponent(customerName)}?order_amount=0`
            );
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

    // Check stock availability for an item
    const checkStockAvailability = async (productId, qtyNeeded) => {
        try {
            const res = await fetch(
                `${API_BASE_URL}/api/v1/jo/preview-allocation?product_id=${productId}&length=${qtyNeeded}`
            );
            const data = await res.json();
            if (data.status === 'success') {
                return {
                    available: data.data.total_available >= qtyNeeded,
                    totalAvailable: data.data.total_available,
                    rolls: data.data.recommended_rolls || []
                };
            }
        } catch (err) {
            console.error('Stock check error:', err);
        }
        return { available: true, totalAvailable: 0, rolls: [] }; // Default to available
    };

    const [isPendingItem, setIsPendingItem] = useState(false);

    const handleAddItem = async () => {
        // PEMBARUAN: Logika untuk Pending Item (Barang Manual)
        if (isPendingItem) {
            if (!newItem.description.trim()) {
                setMessage({ type: 'error', text: 'Deskripsi item wajib diisi untuk barang pending!' });
                setTimeout(() => setMessage(null), 3000);
                return;
            }

            const item = {
                id: Date.now(),
                hose_product_id: null,
                hose_name: 'Manual / Pending Item',
                hose_sku: 'PENDING',
                fitting_a_id: null,
                fitting_a_name: '-',
                fitting_b_id: null,
                fitting_b_name: '-',
                cut_length: parseFloat(newItem.cutLength) || null,
                qty: parseInt(newItem.qty) || 1,
                unit_price: parseFloat(newItem.unitPrice) || 0,
                description: newItem.description,
                is_assembly: false,
                stock_available: true, // Bypass stock check
                stock_qty: 0,
                is_pending: true
            };

            setItems(prev => [...prev, item]);

            // Reset form
            setNewItem({
                hoseProductId: null,
                fittingAId: null,
                fittingBId: null,
                cutLength: '',
                qty: 1,
                description: '',
                unitPrice: 0
            });
            setIsPendingItem(false);
            setShowAddItem(false);
            return;
        }

        // Logika Standard (Barang Inventory)
        if (!newItem.hoseProductId) {
            setMessage({ type: 'error', text: 'Pilih produk hose!' });
            setTimeout(() => setMessage(null), 3000);
            return;
        }

        const hose = products.find(p => p.id === newItem.hoseProductId);
        const fittingA = products.find(p => p.id === newItem.fittingAId);
        const fittingB = products.find(p => p.id === newItem.fittingBId);

        // Check stock availability
        const totalLength = (parseFloat(newItem.cutLength) || 0) * (parseInt(newItem.qty) || 1);
        let stockCheck = { available: true, totalAvailable: 0 };

        if (totalLength > 0 && hose) {
            stockCheck = await checkStockAvailability(hose.id, totalLength);
        }

        const item = {
            id: Date.now(),
            hose_product_id: hose?.id,
            hose_name: hose?.name || 'Unknown',
            hose_sku: hose?.sku,
            fitting_a_id: fittingA?.id || null,
            fitting_a_name: fittingA?.name || '-',
            fitting_b_id: fittingB?.id || null,
            fitting_b_name: fittingB?.name || '-',
            cut_length: parseFloat(newItem.cutLength) || null,
            qty: parseInt(newItem.qty) || 1,
            unit_price: parseFloat(newItem.unitPrice) || 0,
            description: newItem.description || `${hose?.name} ${newItem.cutLength ? newItem.cutLength + 'm' : ''} x ${newItem.qty}`,
            is_assembly: !!(fittingA || fittingB),
            stock_available: stockCheck.available,
            stock_qty: stockCheck.totalAvailable,
            is_pending: false
        };

        // Add warning if stock insufficient
        if (!stockCheck.available && totalLength > 0) {
            setStockWarnings(prev => [...prev, {
                itemId: item.id,
                product: hose?.name,
                needed: totalLength,
                available: stockCheck.totalAvailable
            }]);
        }

        setItems(prev => [...prev, item]);

        // Reset form for next item
        setNewItem({
            hoseProductId: null,
            fittingAId: null,
            fittingBId: null,
            cutLength: '',
            qty: 1,
            description: '',
            unitPrice: 0
        });
        setIsPendingItem(false);
        setShowAddItem(false);
    };

    const handleRemoveItem = (itemId) => {
        setItems(prev => prev.filter(i => i.id !== itemId));
        setStockWarnings(prev => prev.filter(w => w.itemId !== itemId));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.customerName.trim() || items.length === 0) {
            setMessage({ type: 'error', text: 'Isi nama customer dan tambahkan minimal 1 item!' });
            setTimeout(() => setMessage(null), 3000);
            return;
        }

        // Check if any stock warnings exist
        if (stockWarnings.length > 0) {
            const proceed = confirm(
                `⚠️ PERINGATAN STOK KURANG:\n\n` +
                stockWarnings.map(w => `• ${w.product}: Butuh ${w.needed}m, Tersedia ${w.available}m`).join('\n') +
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
                lines: items.map(item => ({
                    description: item.description,
                    hose_product_id: item.hose_product_id,
                    fitting_a_id: item.fitting_a_id,
                    fitting_b_id: item.fitting_b_id,
                    cut_length: item.cut_length,
                    qty: item.qty,
                    unit_price: item.unit_price,
                    is_assembly: item.is_assembly
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

    const calculateTotal = () => {
        return items.reduce((sum, item) => sum + (item.unit_price * item.qty), 0);
    };

    if (loading) {
        return (
            <div className="create-job-order">
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Memuat data produk...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="create-job-order">
            {/* Toast Message */}
            {message && (
                <div className={`toast-message ${message.type}`}>
                    {message.text}
                </div>
            )}

            <div className="page-header">
                <div className="header-back">
                    <Button variant="ghost" onClick={() => navigate('/production/sales-orders')}>
                        ← Kembali
                    </Button>
                </div>
                <div>
                    <h1 className="page-title">➕ Buat Sales Order Baru</h1>
                    <p className="page-subtitle">Buat pesanan customer baru</p>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                <div className="form-grid">
                    {/* Customer & Info Section */}
                    <Card title="📋 Informasi Customer" className="info-card">
                        <div className="form-section">
                            <div className="form-group">
                                <label htmlFor="customerName">Nama Customer *</label>
                                <input
                                    id="customerName"
                                    name="customerName"
                                    type="text"
                                    list="customer-list"
                                    value={formData.customerName}
                                    onChange={(e) => handleCustomerSelect(e.target.value)}
                                    placeholder="Ketik atau pilih customer..."
                                    required
                                />
                                <datalist id="customer-list">
                                    {customers.map((c, idx) => (
                                        <option key={idx} value={c.customer_name} />
                                    ))}
                                </datalist>
                                <span className="input-hint">💡 Customer baru akan otomatis tersimpan</span>

                                {/* Credit Limit Warning */}
                                {creditInfo && (
                                    <div className={`credit-info-card ${creditInfo.is_over_limit ? 'danger' : creditInfo.total_outstanding > 0 ? 'warning' : 'success'}`}>
                                        <div className="credit-header">
                                            {creditInfo.is_over_limit ? '⛔' : creditInfo.total_outstanding > 0 ? '⚠️' : '✅'}
                                            &nbsp;Status Kredit: {creditInfo.customer_name}
                                        </div>
                                        <div className="credit-details">
                                            <div className="credit-item">
                                                <span>Limit</span>
                                                <strong>Rp {creditInfo.credit_limit?.toLocaleString('id-ID')}</strong>
                                            </div>
                                            <div className="credit-item">
                                                <span>Piutang</span>
                                                <strong className="outstanding">Rp {creditInfo.total_outstanding?.toLocaleString('id-ID')}</strong>
                                            </div>
                                            <div className="credit-item">
                                                <span>Sisa</span>
                                                <strong className="available">Rp {creditInfo.available_credit?.toLocaleString('id-ID')}</strong>
                                            </div>
                                        </div>
                                        {creditInfo.is_over_limit && (
                                            <div className="credit-warning-text">
                                                ⚠️ Customer sudah melebihi limit kredit!
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="customerPhone">Telepon</label>
                                    <input
                                        id="customerPhone"
                                        name="customerPhone"
                                        type="tel"
                                        value={formData.customerPhone}
                                        onChange={handleChange}
                                        placeholder="08xx-xxxx-xxxx"
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="requiredDate">Tanggal Dibutuhkan</label>
                                    <input
                                        id="requiredDate"
                                        name="requiredDate"
                                        type="date"
                                        value={formData.requiredDate}
                                        onChange={handleChange}
                                        min={getTodayDate()}
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label htmlFor="customerAddress">Alamat Pengiriman</label>
                                <textarea
                                    id="customerAddress"
                                    name="customerAddress"
                                    value={formData.customerAddress}
                                    onChange={handleChange}
                                    placeholder="Alamat lengkap untuk pengiriman..."
                                    rows={2}
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="notes">Catatan (Opsional)</label>
                                <textarea
                                    id="notes"
                                    name="notes"
                                    value={formData.notes}
                                    onChange={handleChange}
                                    placeholder="Catatan tambahan..."
                                    rows={2}
                                />
                            </div>
                        </div>
                    </Card>

                    {/* Items Section */}
                    <Card title="🔧 Item Pesanan" className="items-card">
                        <div className="items-header">
                            <span>{items.length} item</span>
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => setShowAddItem(true)}
                            >
                                + Tambah Item
                            </Button>
                        </div>

                        {/* Stock Warnings */}
                        {stockWarnings.length > 0 && (
                            <div className="stock-warning-banner">
                                ⚠️ <strong>Peringatan Stok:</strong>
                                <ul>
                                    {stockWarnings.map(w => (
                                        <li key={w.itemId}>
                                            {w.product}: Butuh {w.needed}m, Tersedia {w.available}m
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {items.length === 0 ? (
                            <div className="empty-items">
                                <span className="empty-icon">📦</span>
                                <p>Belum ada item</p>
                                <p className="text-muted">Klik "Tambah Item" untuk menambahkan</p>
                            </div>
                        ) : (
                            <div className="items-list">
                                {items.map((item, idx) => (
                                    <div key={item.id} className={`item-row ${!item.stock_available ? 'stock-warning' : ''}`}>
                                        <span className="item-number">{idx + 1}</span>
                                        <div className="item-info">
                                            <span className="item-name">
                                                {item.hose_name}
                                                {!item.stock_available && <span className="warning-badge">⚠️ Stok Kurang</span>}
                                            </span>
                                            <span className="item-details">
                                                Qty: {item.qty} pcs
                                                {item.cut_length && ` • Panjang: ${item.cut_length}m`}
                                            </span>
                                            <span className="item-fittings">
                                                Fitting: {item.fitting_a_name} ↔ {item.fitting_b_name}
                                            </span>
                                            {item.unit_price > 0 && (
                                                <span className="item-price">
                                                    Rp {(item.unit_price * item.qty).toLocaleString('id-ID')}
                                                </span>
                                            )}
                                        </div>
                                        <button
                                            type="button"
                                            className="remove-item"
                                            onClick={() => handleRemoveItem(item.id)}
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                ))}

                                {calculateTotal() > 0 && (
                                    <div className="items-total">
                                        <strong>Total: Rp {calculateTotal().toLocaleString('id-ID')}</strong>
                                    </div>
                                )}
                            </div>
                        )}
                    </Card>
                </div>

                {/* Submit */}
                <div className="form-actions">
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={() => navigate('/production/sales-orders')}
                    >
                        Batal
                    </Button>
                    <Button
                        type="submit"
                        variant="primary"
                        disabled={isSubmitting || items.length === 0}
                    >
                        {isSubmitting ? 'Menyimpan...' : '✅ Simpan Sales Order'}
                    </Button>
                </div>
            </form>

            {/* Add Item Modal - Optimized */}
            {showAddItem && (
                <div className="modal-overlay" onClick={() => setShowAddItem(false)}>
                    <div className="modal-content modal-large" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Tambah Item Pesanan</h3>
                            <button onClick={() => setShowAddItem(false)}>✕</button>
                        </div>
                        <div className="modal-body">
                            {/* Toggle Pending */}
                            <div className="form-group" style={{ marginBottom: '15px' }}>
                                <label className="checkbox-frame">
                                    <input
                                        type="checkbox"
                                        checked={isPendingItem}
                                        onChange={(e) => setIsPendingItem(e.target.checked)}
                                    />
                                    <span style={{ fontWeight: 600, color: isPendingItem ? '#f59e0b' : '#64748b' }}>
                                        📦 Barang Kosong / Pending Inventory
                                    </span>
                                </label>
                                {isPendingItem && (
                                    <p className="input-hint" style={{ color: '#f59e0b', marginTop: '4px' }}>
                                        Item ini akan ditambahkan sebagai "Pending" dan tidak mengurangi stok saat ini.
                                    </p>
                                )}
                            </div>

                            {/* Hose Selection with ComboInput */}
                            {!isPendingItem && (
                                <div className="form-group">
                                    <label>Produk Hose * <span className="label-hint">({hoseProducts.length} produk)</span></label>
                                    <ComboInput
                                        items={hoseProducts}
                                        value={newItem.hoseProductId}
                                        onChange={(id) => setNewItem(prev => ({ ...prev, hoseProductId: id }))}
                                        placeholder="Ketik untuk cari hose..."
                                        displayField="name"
                                        idField="id"
                                    />
                                </div>
                            )}

                            {isPendingItem && (
                                <div className="form-group">
                                    <label>Nama Barang / Deskripsi Manual *</label>
                                    <input
                                        type="text"
                                        value={newItem.description}
                                        onChange={e => setNewItem(prev => ({ ...prev, description: e.target.value }))}
                                        placeholder="Contoh: Hose R2 3/4 (Stok Kosong / Pesan ke Vendor)"
                                        autoFocus
                                    />
                                </div>
                            )}

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Jumlah (pcs) *</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={newItem.qty}
                                        onChange={e => setNewItem(prev => ({ ...prev, qty: e.target.value }))}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Panjang Potong (meter)</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        placeholder="contoh: 2.5"
                                        value={newItem.cutLength}
                                        onChange={e => setNewItem(prev => ({ ...prev, cutLength: e.target.value }))}
                                    />
                                </div>
                            </div>

                            {/* Fitting Selection - Only Show if NOT pending (or optional for pending) */}
                            {!isPendingItem && (
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Fitting Ujung 1 <span className="label-hint">(opsional)</span></label>
                                        <ComboInput
                                            items={fittingProducts}
                                            value={newItem.fittingAId}
                                            onChange={(id) => setNewItem(prev => ({ ...prev, fittingAId: id }))}
                                            placeholder="Cari fitting..."
                                            displayField="name"
                                            idField="id"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Fitting Ujung 2 <span className="label-hint">(opsional)</span></label>
                                        <ComboInput
                                            items={fittingProducts}
                                            value={newItem.fittingBId}
                                            onChange={(id) => setNewItem(prev => ({ ...prev, fittingBId: id }))}
                                            placeholder="Cari fitting..."
                                            displayField="name"
                                            idField="id"
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Harga Satuan (Rp)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={newItem.unitPrice}
                                        onChange={e => setNewItem(prev => ({ ...prev, unitPrice: e.target.value }))}
                                        placeholder="0"
                                    />
                                </div>
                                {!isPendingItem && (
                                    <div className="form-group">
                                        <label>Deskripsi</label>
                                        <input
                                            type="text"
                                            value={newItem.description}
                                            onChange={e => setNewItem(prev => ({ ...prev, description: e.target.value }))}
                                            placeholder="Deskripsi item (opsional)"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="modal-footer">
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => setShowAddItem(false)}
                            >
                                Batal
                            </Button>
                            <Button
                                type="button"
                                variant="primary"
                                onClick={handleAddItem}
                                disabled={(!isPendingItem && !newItem.hoseProductId) || (isPendingItem && !newItem.description)}
                            >
                                + Tambahkan
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
