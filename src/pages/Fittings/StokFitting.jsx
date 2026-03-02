/**
 * Stok Fitting & Aksesoris - Terintegrasi dengan Backend API
 * With Excel-Style Combo Inputs like Inventory Page
 */
import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/common/Button/Button';
import Modal from '../../components/common/Modal/Modal';
import './StokFitting.css';

const API_BASE_URL = import.meta.env.VITE_AI_API_URL || "";

// ============ Excel-Style Combo Input Component ============
function ComboInput({
    value,
    onChange,
    options,
    placeholder,
    displayKey = 'name',
    valueKey = 'id',
    onAddNew,
    addNewLabel = 'Tambah Baru'
}) {
    const [inputValue, setInputValue] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    const [filteredOptions, setFilteredOptions] = useState(options);
    const inputRef = useRef(null);
    const dropdownRef = useRef(null);

    useEffect(() => {
        if (value) {
            const selected = options.find(o => String(o[valueKey]) === String(value));
            if (selected) {
                setInputValue(typeof displayKey === 'function' ? displayKey(selected) : selected[displayKey]);
            }
        } else {
            setInputValue('');
        }
    }, [value, options]);

    useEffect(() => {
        const filtered = options.filter(o => {
            const display = typeof displayKey === 'function' ? displayKey(o) : o[displayKey];
            return display?.toLowerCase().includes(inputValue.toLowerCase());
        });
        setFilteredOptions(filtered);
    }, [inputValue, options]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target) &&
                inputRef.current && !inputRef.current.contains(e.target)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (option) => {
        onChange(option[valueKey]);
        setInputValue(typeof displayKey === 'function' ? displayKey(option) : option[displayKey]);
        setShowDropdown(false);
    };

    const handleAddNew = () => {
        if (onAddNew && inputValue.trim()) {
            onAddNew(inputValue.trim());
            setShowDropdown(false);
        }
    };

    const showAddNewOption = inputValue.trim() &&
        !filteredOptions.some(o => {
            const display = typeof displayKey === 'function' ? displayKey(o) : o[displayKey];
            return display?.toLowerCase() === inputValue.toLowerCase();
        });

    return (
        <div className="combo-input-wrapper">
            <input
                ref={inputRef}
                type="text"
                className="combo-input"
                value={inputValue}
                onChange={(e) => {
                    setInputValue(e.target.value);
                    setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                placeholder={placeholder}
            />
            {showDropdown && (
                <div ref={dropdownRef} className="combo-dropdown">
                    {filteredOptions.length > 0 ? (
                        filteredOptions.slice(0, 10).map(option => (
                            <div
                                key={option[valueKey]}
                                className="combo-dropdown-item"
                                onClick={() => handleSelect(option)}
                            >
                                {typeof displayKey === 'function' ? displayKey(option) : option[displayKey]}
                            </div>
                        ))
                    ) : (
                        <div className="combo-dropdown-empty">Tidak ditemukan</div>
                    )}
                    {showAddNewOption && onAddNew && (
                        <div
                            className="combo-dropdown-item combo-add-new"
                            onClick={handleAddNew}
                        >
                            ➕ {addNewLabel}: <strong>{inputValue}</strong>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default function StokFitting() {
    const navigate = useNavigate();

    // State for data from API
    const [fittingsData, setFittingsData] = useState([]);
    const [products, setProducts] = useState([]);
    const [locations, setLocations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState(null);

    // Filters
    const [filterAngle, setFilterAngle] = useState('all');
    const [filterRack, setFilterRack] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

    // Add Modal
    const [showAddModal, setShowAddModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [newFitting, setNewFitting] = useState({
        product_id: '',
        initial_qty: '',
        location_id: '',
        batch_number: ''
    });

    // Load data from API
    useEffect(() => {
        loadData();
        loadProducts();
        loadLocations();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            // Fetch batches from API
            const res = await fetch(`${API_BASE_URL}/api/v1/batches?limit=200`);
            const data = await res.json();
            if (data.status === 'success') {
                // Filter ONLY fittings - exclude HOSE category
                const fittings = data.data.filter(b => {
                    const category = b.product_category?.toUpperCase();
                    // Only include FITTING, CONNECTOR, ADAPTER, ACCESSORY categories
                    return category === 'FITTING' ||
                        category === 'CONNECTOR' ||
                        category === 'ADAPTER' ||
                        category === 'ACCESSORY' ||
                        // Also include by SKU/name pattern if category not set
                        (b.product_sku?.toUpperCase().startsWith('FIT-') ||
                            b.product_sku?.toUpperCase().includes('-FT-') ||
                            b.product_name?.toLowerCase().includes('elbow') ||
                            b.product_name?.toLowerCase().includes('nipple') ||
                            b.product_name?.toLowerCase().includes('adapter') ||
                            b.product_name?.toLowerCase().includes('coupler'));
                });
                setFittingsData(fittings);
            }
        } catch (err) {
            console.error('Error loading fittings:', err);
            setMessage({ type: 'error', text: 'Gagal memuat data fitting' });
        }
        setLoading(false);
    };

    const loadProducts = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/products?limit=200`);
            const data = await res.json();
            if (data.status === 'success') {
                // Filter only FITTING, CONNECTOR, ADAPTER, ACCESSORY products
                const fittingProducts = (data.data || []).filter(p => {
                    const cat = p.category?.toUpperCase();
                    return cat === 'FITTING' || cat === 'CONNECTOR' || cat === 'ADAPTER' || cat === 'ACCESSORY';
                });
                setProducts(fittingProducts);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const loadLocations = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/locations?limit=200`);
            const data = await res.json();
            if (data.status === 'success') {
                setLocations(data.data || []);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const generateBatchNumber = () => {
        const date = new Date();
        const y = date.getFullYear().toString().slice(-2);
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        const r = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        return `FIT-${y}${m}${d}-${r}`;
    };

    // ============ Add New Product (Excel-style) ============
    const handleAddNewProduct = async (productName) => {
        try {
            const words = productName.split(' ');
            const brand = words[0]?.toUpperCase() || 'FIT';
            const res = await fetch(`${API_BASE_URL}/api/v1/products`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: productName,
                    brand: brand,
                    category: 'FITTING',
                    unit: 'PCS'
                })
            });
            const data = await res.json();
            if (res.ok && data.status === 'success') {
                const newProduct = data.data;
                setProducts(prev => [...prev, newProduct]);
                setNewFitting(prev => ({ ...prev, product_id: newProduct.id }));
                setMessage({ type: 'success', text: `✅ Produk "${productName}" ditambahkan dengan kode ${newProduct.sku}` });
            } else {
                setMessage({ type: 'error', text: data.detail || 'Gagal menambah produk' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: err.message });
        }
    };

    // ============ Add New Location (Excel-style) ============
    const handleAddNewLocation = async (locationCode) => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/locations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    code: locationCode.toUpperCase(),
                    warehouse: 'MAIN',
                    zone: 'FITTING',
                    type: 'FITTING_BIN',
                    capacity: 500
                })
            });
            const data = await res.json();
            if (res.ok && data.status === 'success') {
                const newLocation = data.data;
                setLocations(prev => [...prev, newLocation]);
                setNewFitting(prev => ({ ...prev, location_id: newLocation.id }));
                setMessage({ type: 'success', text: `✅ Lokasi "${locationCode}" ditambahkan` });
            } else {
                setMessage({ type: 'error', text: data.detail || 'Gagal menambah lokasi' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: err.message });
        }
    };

    // ============ Add Fitting ============
    const handleAddFitting = async () => {
        if (!newFitting.product_id || !newFitting.initial_qty || !newFitting.location_id) {
            setMessage({ type: 'error', text: 'Produk, qty, dan lokasi harus diisi' });
            return;
        }

        setSaving(true);
        try {
            const selectedLocation = locations.find(l => String(l.id) === String(newFitting.location_id));
            const locationCode = selectedLocation?.code || '';

            const payload = {
                product_id: parseInt(newFitting.product_id),
                batch_number: newFitting.batch_number || generateBatchNumber(),
                location_code: locationCode,
                quantity: parseFloat(newFitting.initial_qty),
                source_type: 'MANUAL',
                received_by: 'system'
            };

            const res = await fetch(`${API_BASE_URL}/api/v1/batches/inbound`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();

            if (res.ok) {
                setMessage({ type: 'success', text: `✅ ${data.message || 'Fitting berhasil ditambahkan'}` });
                setShowAddModal(false);
                setNewFitting({ product_id: '', batch_number: '', location_id: '', initial_qty: '' });
                loadData();
            } else {
                setMessage({ type: 'error', text: data.detail || 'Gagal menambah fitting' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: err.message });
        }
        setSaving(false);
    };

    // Get unique racks from batches
    const racks = useMemo(() => {
        const uniqueRacks = [...new Set(fittingsData.map(f => f.location_zone || f.location_code?.split('-')[0]))];
        return uniqueRacks.filter(Boolean).sort();
    }, [fittingsData]);

    // Filter fittings
    const filteredFittings = useMemo(() => {
        return fittingsData.filter(f => {
            const matchesSearch =
                f.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                f.product_sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                f.barcode?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesRack = filterRack === 'all' ||
                f.location_code?.startsWith(filterRack) ||
                f.location_zone === filterRack;
            return matchesSearch && matchesRack;
        });
    }, [fittingsData, searchTerm, filterRack]);

    // Stats
    const stats = useMemo(() => ({
        total: fittingsData.length,
        lowStock: fittingsData.filter(f => f.current_qty <= 10).length,
        totalPcs: fittingsData.reduce((sum, f) => sum + (f.current_qty || 0), 0),
        totalRacks: racks.length
    }), [fittingsData, racks]);

    // Auto-clear message
    useEffect(() => {
        if (message) {
            const timer = setTimeout(() => setMessage(null), 4000);
            return () => clearTimeout(timer);
        }
    }, [message]);

    return (
        <div className="stok-fitting-page">
            {/* Toast */}
            {message && (
                <div className={`action-toast ${message.type}`}>
                    {message.text}
                </div>
            )}

            {/* Page Header */}
            <div className="page-header">
                <div className="header-content">
                    <h1>⚙️ Gudang Fitting & Aksesoris</h1>
                    <p>Stok fitting dengan lokasi rak untuk memudahkan pencarian</p>
                </div>
                <div className="header-actions">
                    <Button variant="secondary" onClick={loadData}>
                        🔄 Refresh
                    </Button>
                    <Button variant="secondary" onClick={() => navigate('/inventory/map')}>
                        🗺️ Peta Rak
                    </Button>
                    <Button variant="secondary" onClick={() => navigate('/inventory/racks')}>
                        📊 Kelola Rak
                    </Button>
                    <Button variant="primary" onClick={() => setShowAddModal(true)}>
                        ➕ Tambah Fitting
                    </Button>
                </div>
            </div>

            {/* Stats Row */}
            <div className="stats-row">
                <div className="stat-card">
                    <span className="stat-icon">📦</span>
                    <div className="stat-content">
                        <span className="stat-value">{stats.total}</span>
                        <span className="stat-label">Total Batches</span>
                    </div>
                </div>
                <div className="stat-card">
                    <span className="stat-icon">🔢</span>
                    <div className="stat-content">
                        <span className="stat-value">{stats.totalPcs.toLocaleString()}</span>
                        <span className="stat-label">Total Pcs</span>
                    </div>
                </div>
                <div className="stat-card warning">
                    <span className="stat-icon">⚠️</span>
                    <div className="stat-content">
                        <span className="stat-value">{stats.lowStock}</span>
                        <span className="stat-label">Low Stock</span>
                    </div>
                </div>
                <div className="stat-card info">
                    <span className="stat-icon">🗄️</span>
                    <div className="stat-content">
                        <span className="stat-value">{stats.totalRacks}</span>
                        <span className="stat-label">Jumlah Zone</span>
                    </div>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="filter-bar">
                <div className="search-box">
                    <span className="search-icon">🔍</span>
                    <input
                        type="text"
                        placeholder="Cari nama, SKU, atau barcode..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Rack Filter */}
            {racks.length > 0 && (
                <div className="rack-filters">
                    <span className="rack-label">Lokasi:</span>
                    <button
                        className={`rack-btn ${filterRack === 'all' ? 'active' : ''}`}
                        onClick={() => setFilterRack('all')}
                    >
                        Semua
                    </button>
                    {racks.map(rack => (
                        <button
                            key={rack}
                            className={`rack-btn ${filterRack === rack ? 'active' : ''}`}
                            onClick={() => setFilterRack(rack)}
                        >
                            {rack}
                        </button>
                    ))}
                </div>
            )}

            {/* Fitting Grid */}
            <div className="fitting-grid">
                {loading ? (
                    <div className="empty-state">
                        <span className="empty-icon">⏳</span>
                        <p>Memuat data...</p>
                    </div>
                ) : filteredFittings.length === 0 ? (
                    <div className="empty-state">
                        <span className="empty-icon">📭</span>
                        <p>Tidak ada fitting ditemukan</p>
                    </div>
                ) : (
                    filteredFittings.map(fitting => {
                        const isLowStock = fitting.current_qty <= 10;
                        const isOutOfStock = fitting.current_qty === 0;

                        return (
                            <div
                                key={fitting.id}
                                className={`fitting-card ${isLowStock ? 'low-stock' : ''} ${isOutOfStock ? 'out-of-stock' : ''}`}
                            >
                                {/* Batch Info */}
                                <div className="fitting-header">
                                    <span className="batch-code">{fitting.batch_number || fitting.barcode}</span>
                                    <span className={`status-badge ${fitting.status?.toLowerCase()}`}>
                                        {fitting.status === 'AVAILABLE' ? '✓ OK' : fitting.status}
                                    </span>
                                </div>

                                {/* Product Info */}
                                <div className="fitting-info">
                                    <h3 className="fitting-name">{fitting.product_name || 'Unknown'}</h3>
                                    <span className="fitting-sku">{fitting.product_sku}</span>
                                </div>

                                {/* Stock & Location */}
                                <div className="fitting-stock">
                                    <div className={`stock-display ${isLowStock ? 'low' : ''}`}>
                                        <span className="stock-value">
                                            {isOutOfStock ? (
                                                <span className="out-badge">HABIS</span>
                                            ) : (
                                                <>Sisa: <strong>{fitting.current_qty}</strong> {fitting.unit || 'pcs'}</>
                                            )}
                                        </span>
                                        {isLowStock && !isOutOfStock && (
                                            <span className="order-alert">⚠️ LOW</span>
                                        )}
                                    </div>
                                    <div className="location-display">
                                        <span className="location-icon">📍</span>
                                        <span className="location-value">
                                            {fitting.location_code || 'Belum Set'}
                                        </span>
                                    </div>
                                </div>

                                {/* Initial/Current Bar */}
                                <div className="qty-progress">
                                    <div className="progress-bar">
                                        <div
                                            className="progress-fill"
                                            style={{ width: `${Math.min(100, (fitting.current_qty / (fitting.initial_qty || 1)) * 100)}%` }}
                                        ></div>
                                    </div>
                                    <span className="qty-text">{fitting.current_qty} / {fitting.initial_qty} {fitting.unit || 'pcs'}</span>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Add Modal */}
            <Modal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                title="➕ Tambah Fitting Baru"
                size="md"
            >
                <div className="add-fitting-modal">
                    <div className="form-group">
                        <label>Produk *</label>
                        <ComboInput
                            value={newFitting.product_id}
                            onChange={(id) => setNewFitting(prev => ({ ...prev, product_id: id }))}
                            options={products}
                            displayKey={(p) => `${p.sku} - ${p.name}`}
                            valueKey="id"
                            placeholder="Ketik untuk cari atau tambah produk baru..."
                            onAddNew={handleAddNewProduct}
                            addNewLabel="Tambah Produk"
                        />
                        <small className="hint">Ketik nama produk, pilih dari list atau klik "Tambah Produk" untuk baru</small>
                    </div>

                    <div className="form-group">
                        <label>Jumlah (Pcs) *</label>
                        <input
                            type="number"
                            value={newFitting.initial_qty}
                            onChange={(e) => setNewFitting(prev => ({ ...prev, initial_qty: e.target.value }))}
                            placeholder="Contoh: 100"
                            min="1"
                        />
                    </div>

                    <div className="form-group">
                        <label>Lokasi Penyimpanan *</label>
                        <ComboInput
                            value={newFitting.location_id}
                            onChange={(id) => setNewFitting(prev => ({ ...prev, location_id: id }))}
                            options={locations}
                            displayKey={(l) => `${l.code} - ${l.zone || l.warehouse}`}
                            valueKey="id"
                            placeholder="Ketik untuk cari atau tambah lokasi baru..."
                            onAddNew={handleAddNewLocation}
                            addNewLabel="Tambah Lokasi"
                        />
                        <small className="hint">Ketik kode lokasi, pilih dari list atau klik "Tambah Lokasi" untuk baru</small>
                    </div>

                    <div className="form-group">
                        <label>No. Batch (Optional)</label>
                        <input
                            type="text"
                            value={newFitting.batch_number}
                            onChange={(e) => setNewFitting(prev => ({ ...prev, batch_number: e.target.value }))}
                            placeholder="Auto-generate jika kosong"
                        />
                    </div>

                    <div className="modal-actions">
                        <Button variant="secondary" onClick={() => setShowAddModal(false)}>
                            Batal
                        </Button>
                        <Button variant="primary" onClick={handleAddFitting} disabled={saving}>
                            {saving ? 'Menyimpan...' : '✅ Simpan'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
